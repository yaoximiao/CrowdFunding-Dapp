// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/**
 * @title CrowdFund with Votable Milestones and Early Bird Rewards
 * @notice A decentralized crowdfunding contract that supports milestone-based fund releases,
 * contributor voting, and rewards for early supporters.
 */
contract CrowdFund {
    // --- 常量 ---
    uint256 public constant EARLY_BIRD_COUNT = 3; // 前3位独立捐赠者为早期支持者

    // --- 结构体 ---

    // 项目状态
    enum ProjectState {
        Fundraising, // 0: 筹款中
        Successful,  // 1: 成功
        Failed,      // 2: 失败
        PaidOut,     // 3: 资金已全部支付
        Refunded     // 4: 资金已退还
    }

    // 里程碑内部存储结构 (包含 mapping，不能直接返回)
    struct Milestone {
        string description;
        uint256 releaseAmount;
        uint256 voteDeadline;
        uint256 yesVotes;
        uint256 noVotes;
        bool executed;
        mapping(address => bool) voters;
    }
    
    // 用于公开返回的里程碑信息结构体 (不包含 mapping)
    struct MilestoneInfo {
        string description;
        uint256 releaseAmount;
        uint256 voteDeadline;
        uint256 yesVotes;
        uint256 noVotes;
        bool executed;
    }

    // 项目详情
    struct Project {
        uint id;
        address payable creator;
        string name;
        string description;
        uint goalAmount;
        uint deadline;
        uint raisedAmount;
        ProjectState state;
        Milestone[] milestones;
        uint256 totalClaimedAmount;
    }

    // --- 状态变量 ---
    uint public projectCounter;
    mapping(uint => Project) public projects;
    mapping(uint => mapping(address => uint)) public contributions;
    // mapping(uint => address[]) public earlyBirds;
    mapping(uint => address[]) internal earlyBirds;
    mapping(uint => uint) public uniqueContributorCount;

    // --- 事件 ---
    event ProjectCreated(uint indexed projectId, address indexed creator, string name, uint goalAmount, uint deadline);
    event ContributionMade(uint indexed projectId, address indexed contributor, uint amount, bool isEarlyBird);
    event ProjectSucceeded(uint indexed projectId);
    event ProjectFailed(uint indexed projectId);
    event RefundIssued(uint indexed projectId, address indexed contributor, uint amount);
    event MilestoneVoteStarted(uint indexed projectId, uint indexed milestoneIndex, uint voteDeadline);
    event VotedOnMilestone(uint indexed projectId, uint indexed milestoneIndex, address indexed voter, bool vote, uint weight);
    event MilestoneFundsReleased(uint indexed projectId, uint indexed milestoneIndex, uint amount);
    event MilestoneVoteFailed(uint indexed projectId, uint indexed milestoneIndex);

    // --- 自定义错误 ---
    error DeadlineInPast();
    error GoalIsZero();
    error ProjectNotFound();
    error NotProjectCreator();
    error ProjectNotActive();
    error ProjectNotSuccessful();
    error ProjectNotFailed();
    error DeadlineNotReached();
    error DeadlineReached();
    error NothingToContribute();
    error NothingToWithdraw();
    error TransferFailed();
    error AlreadyRefunded();
    error NoMilestonesDefined();
    error InvalidReleaseAmount();
    error MilestoneNotFound();
    error MilestoneAlreadyExecuted();
    error MilestoneVoteNotActive();
    error MilestoneVoteHasNotEnded();
    error NotAContributor();
    error AlreadyVoted();

    constructor() {
        projectCounter = 0;
    }

    function createProject(
        string memory _name,
        string memory _description,
        uint _goalAmount,
        uint _deadline,
        string[] memory _milestoneDescriptions,
        uint[] memory _milestoneReleaseAmounts
    ) public {
        if (_deadline <= block.timestamp) revert DeadlineInPast();
        if (_goalAmount == 0) revert GoalIsZero();
        if (_milestoneDescriptions.length == 0) revert NoMilestonesDefined();
        if (_milestoneDescriptions.length != _milestoneReleaseAmounts.length) revert("Mismatched milestone data");

        uint totalReleaseAmount;
        for (uint i = 0; i < _milestoneReleaseAmounts.length; i++) {
            totalReleaseAmount += _milestoneReleaseAmounts[i];
        }
        if (totalReleaseAmount > _goalAmount) revert InvalidReleaseAmount();

        projectCounter++;
        uint currentProjectId = projectCounter;
        Project storage newProject = projects[currentProjectId];
        newProject.id = currentProjectId;
        newProject.creator = payable(msg.sender);
        newProject.name = _name;
        newProject.description = _description;
        newProject.goalAmount = _goalAmount;
        newProject.deadline = _deadline;
        newProject.state = ProjectState.Fundraising;

        for (uint i = 0; i < _milestoneDescriptions.length; i++) {
            // 1. 在 storage 数组中创建一个空的新元素
            newProject.milestones.push();
            
            // 2. 获取指向这个新 storage 元素的指针
            Milestone storage newMilestone = newProject.milestones[i];
            
            // 3. 通过指针为字段赋值
            newMilestone.description = _milestoneDescriptions[i];
            newMilestone.releaseAmount = _milestoneReleaseAmounts[i];
            // 其他字段 (voteDeadline, yesVotes, noVotes, executed) 默认为 0 或 false，无需显式设置
        }


        emit ProjectCreated(currentProjectId, msg.sender, _name, _goalAmount, _deadline);
    }

    function contribute(uint _projectId) public payable {
        if (msg.value == 0) revert NothingToContribute();
        Project storage project = projects[_projectId];
        if (project.creator == address(0)) revert ProjectNotFound();
        if (project.state != ProjectState.Fundraising) revert ProjectNotActive();
        if (block.timestamp >= project.deadline) revert DeadlineReached();
        
        bool isNewContributor = contributions[_projectId][msg.sender] == 0;
        bool isEarlyBird = false;

        if (isNewContributor && uniqueContributorCount[_projectId] < EARLY_BIRD_COUNT) {
            uniqueContributorCount[_projectId]++;
            earlyBirds[_projectId].push(msg.sender);
            isEarlyBird = true;
        }

        project.raisedAmount += msg.value;
        contributions[_projectId][msg.sender] += msg.value;
        emit ContributionMade(_projectId, msg.sender, msg.value, isEarlyBird);
    }

    function checkDeadlineAndFinalize(uint _projectId) public {
        Project storage project = projects[_projectId];
        if (project.creator == address(0)) revert ProjectNotFound();
        if (project.state != ProjectState.Fundraising) revert ProjectNotActive();
        if (block.timestamp < project.deadline) revert DeadlineNotReached();

        if (project.raisedAmount >= project.goalAmount) {
            project.state = ProjectState.Successful;
            emit ProjectSucceeded(_projectId);
        } else {
            project.state = ProjectState.Failed;
            emit ProjectFailed(_projectId);
        }
    }
    
    /**
     * @notice 项目方发起一个里程碑的资金释放投票
     * @param _projectId 项目ID
     * @param _milestoneIndex 里程碑索引
     * @param _voteDurationSeconds 投票持续时间 (秒)
     */
    function startMilestoneVote(uint _projectId, uint _milestoneIndex, uint _voteDurationSeconds) public {
        Project storage project = projects[_projectId];
        if (msg.sender != project.creator) revert NotProjectCreator();
        if (project.state != ProjectState.Successful) revert ProjectNotSuccessful();
        if (_milestoneIndex >= project.milestones.length) revert MilestoneNotFound();
        
        Milestone storage milestone = project.milestones[_milestoneIndex];
        if (milestone.executed) revert MilestoneAlreadyExecuted();
        
        milestone.voteDeadline = block.timestamp + _voteDurationSeconds;
        emit MilestoneVoteStarted(_projectId, _milestoneIndex, milestone.voteDeadline);
    }

    function voteOnMilestone(uint _projectId, uint _milestoneIndex, bool _vote) public {
        uint contributionAmount = contributions[_projectId][msg.sender];
        if (contributionAmount == 0) revert NotAContributor();

        Project storage project = projects[_projectId];
        if (_milestoneIndex >= project.milestones.length) revert MilestoneNotFound();

        Milestone storage milestone = project.milestones[_milestoneIndex];
        if (block.timestamp > milestone.voteDeadline || milestone.voteDeadline == 0) revert MilestoneVoteNotActive();
        if (milestone.voters[msg.sender]) revert AlreadyVoted();

        milestone.voters[msg.sender] = true;
        if (_vote) {
            milestone.yesVotes += contributionAmount;
        } else {
            milestone.noVotes += contributionAmount;
        }
        emit VotedOnMilestone(_projectId, _milestoneIndex, msg.sender, _vote, contributionAmount);
    }

    function executeMilestone(uint _projectId, uint _milestoneIndex) public {
        Project storage project = projects[_projectId];
        if (_milestoneIndex >= project.milestones.length) revert MilestoneNotFound();

        Milestone storage milestone = project.milestones[_milestoneIndex];
        if (milestone.executed) revert MilestoneAlreadyExecuted();
        if (block.timestamp <= milestone.voteDeadline) revert MilestoneVoteHasNotEnded();

        milestone.executed = true;

        if (milestone.yesVotes > project.raisedAmount / 2) {
            uint amountToRelease = milestone.releaseAmount;
            project.totalClaimedAmount += amountToRelease;

            if (project.totalClaimedAmount >= project.raisedAmount) {
                project.state = ProjectState.PaidOut;
            }

            (bool sent, ) = project.creator.call{value: amountToRelease}("");
            if (!sent) {
                project.totalClaimedAmount -= amountToRelease;
                milestone.executed = false;
                if (project.state == ProjectState.PaidOut) {
                    project.state = ProjectState.Successful;
                }
                revert TransferFailed();
            }
            emit MilestoneFundsReleased(_projectId, _milestoneIndex, amountToRelease);
        } else {
            emit MilestoneVoteFailed(_projectId, _milestoneIndex);
        }
    }

    function getRefund(uint _projectId) public {
        Project storage project = projects[_projectId];
        uint amountToRefund = contributions[_projectId][msg.sender];

        if (project.creator == address(0)) revert ProjectNotFound();
        if (project.state != ProjectState.Failed) revert ProjectNotFailed();
        if (amountToRefund == 0) revert NothingToWithdraw();

        contributions[_projectId][msg.sender] = 0;
        (bool sent, ) = payable(msg.sender).call{value: amountToRefund}("");
        if(!sent) {
            contributions[_projectId][msg.sender] = amountToRefund;
            revert TransferFailed();
        }

        emit RefundIssued(_projectId, msg.sender, amountToRefund);
    }

    // --- View Functions ---

    function getContributionAmount(uint _projectId, address _contributor) public view returns (uint) {
        return contributions[_projectId][_contributor];
    }

    function getProjectMilestones(uint _projectId) public view returns (MilestoneInfo[] memory) {
        Project storage project = projects[_projectId];
        MilestoneInfo[] memory milestonesInfo = new MilestoneInfo[](project.milestones.length);

        for (uint i = 0; i < project.milestones.length; i++) {
            Milestone storage m = project.milestones[i];
            milestonesInfo[i] = MilestoneInfo(
                m.description,
                m.releaseAmount,
                m.voteDeadline,
                m.yesVotes,
                m.noVotes,
                m.executed
            );
        }
        return milestonesInfo;
    }

    /**
     * @notice 获取指定项目的所有早期支持者地址
     * @param _projectId 项目ID
     * @return An array of addresses
     */
    function getEarlyBirds(uint _projectId) public view returns (address[] memory) {
        return earlyBirds[_projectId];
    }
}