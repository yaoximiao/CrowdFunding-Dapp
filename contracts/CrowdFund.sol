// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9; // 使用一个较新的稳定版本

contract CrowdFund {

    // --- 结构体 ---

    // 项目状态
    enum ProjectState {
        Fundraising, // 筹款中
        Successful,  // 成功
        Failed,      // 失败
        PaidOut,     // 资金已支付给发起人
        Refunded     // (部分或全部)资金已退还给捐赠者
    }

    // 项目详情
    struct Project {
        uint id;                    // 项目唯一ID
        address payable creator;    // 项目发起人地址 (payable因为他们需要接收资金)
        string name;                // 项目名称
        string description;         // 项目描述
        uint goalAmount;            // 目标筹款金额 (以wei为单位)
        uint deadline;              // 筹款截止时间 (Unix时间戳)
        uint raisedAmount;          // 当前已筹集金额
        ProjectState state;         // 项目当前状态
        // mapping(address => uint) contributions; // 不直接在struct里用mapping，放外面
    }

    // --- 状态变量 ---

    uint public projectCounter; // 用于生成唯一的项目ID，从1开始

    // 存储所有项目，通过项目ID索引
    // mapping(项目ID => 项目结构体)
    mapping(uint => Project) public projects;

    // 存储每个项目的捐款详情
    // mapping(项目ID => mapping(捐赠者地址 => 捐赠金额))
    mapping(uint => mapping(address => uint)) public contributions;

    // --- 事件 ---
    // 当一个新项目被创建时触发
    event ProjectCreated(
        uint indexed projectId,
        address indexed creator,
        string name,
        uint goalAmount,
        uint deadline
    );

    // 当一笔捐款成功时触发
    event ContributionMade(
        uint indexed projectId,
        address indexed contributor,
        uint amount
    );

    // 当一个项目成功达到目标时触发 (在检查截止日期后)
    event ProjectSucceeded(uint indexed projectId);

    // 当一个项目未能达到目标时触发 (在检查截止日期后)
    event ProjectFailed(uint indexed projectId);

    // 当项目发起人成功提取资金时触发
    event FundsClaimed(
        uint indexed projectId,
        address indexed creator,
        uint amount
    );

    // 当捐赠者成功取回他们的捐款时触发 (项目失败后)
    event RefundIssued(
        uint indexed projectId,
        address indexed contributor,
        uint amount
    );

    // --- 自定义错误 (Solidity 0.8.4+) ---
    // 这样比使用 require(..., "string message") 更节省 gas
    error DeadlineInPast();
    error GoalIsZero();
    error ProjectNotFound();
    error NotProjectCreator();
    error ProjectNotActive(); // 项目不是 Fundraising 状态
    error ProjectNotSuccessful();
    error ProjectNotFailed();
    error DeadlineNotReached();
    error DeadlineReached();
    error NothingToContribute();
    error NothingToWithdraw();
    error AlreadyClaimedOrFailed();
    error TransferFailed();
    error AlreadyRefunded();


    // --- 构造函数 ---
    constructor() {
        projectCounter = 0; // ID 从 1 开始，所以创建第一个项目时会先+1
    }

    /**
     * @notice 创建一个新的众筹项目
     * @param _name 项目名称
     * @param _description 项目描述
     * @param _goalAmount 目标筹款金额 (以wei为单位)
     * @param _deadline 筹款截止时间 (Unix时间戳)
     */
    function createProject(
        string memory _name,
        string memory _description,
        uint _goalAmount,
        uint _deadline
    ) public {
        // 截至日期必须在未来
        if(_deadline <= block.timestamp) {
            revert DeadlineInPast();
        }       

        // 目标金额必须大于0
        if(_goalAmount == 0) {
            revert GoalIsZero();
        }

        // 项目ID应该确保唯一性
        projectCounter++;
        uint currentProjectId = projectCounter;

        projects[currentProjectId] = Project({
            id: currentProjectId,
            creator: payable(msg.sender),   // 项目发起人是调用此函数的人
            name: _name,
            description: _description,
            goalAmount: _goalAmount,
            deadline: _deadline,
            raisedAmount: 0,    // 初始已筹集金额为0
            state: ProjectState.Fundraising // 初始状态为筹款中
        });

        emit ProjectCreated(
            currentProjectId,
            msg.sender,
            _name,
            _goalAmount,
            _deadline
        );
    }

    /**
     * @notice 向指定的项目ID捐款
     * @param _projectId 要捐款的项目ID
     * payable 关键字表示此函数可以接收以太币
     */
    function contribute(uint _projectId) public payable {
        // 捐款金额必须大于0
        if(msg.value == 0) {
            revert NothingToContribute();
        }

        // 获取项目引用，方便修改关键属性
        Project storage projectToContribute = projects[_projectId];

        // 检查项目ID是否有效，进而保证项目存在
        if(projectToContribute.creator == address(0)) {
            revert ProjectNotFound();
        }

        // 项目必须处于Fundraising正在筹款状态
        if(projectToContribute.state != ProjectState.Fundraising) {
            revert ProjectNotActive();
        }

        // 确保项目还未超时
        if(block.timestamp >= projectToContribute.deadline) {
            revert DeadlineReached();
        }

        projectToContribute.raisedAmount += msg.value;

        contributions[_projectId][msg.sender] += msg.value;

        emit ContributionMade(_projectId, msg.sender, msg.value);
    }

    /**
     * @notice 检查指定项目的截止日期和筹款状态，并相应地更新项目状态。
     *         任何人可以在项目截止日期之后调用此函数。
     * @param _projectId 要检查的项目ID
     */
    // 在真实的 DApp 中，这个函数可能由一个受信任的后端服务、一个 Keeper 网络 (如 Chainlink Keepers) 自动调用，或者简单地依赖用户（如项目方或捐款人）在截止日期后手动调用。
    function checkDeadlineAndFinalize(uint _projectId) public {
        Project storage project = projects[_projectId];

        // 确保项目存在
        if(project.creator == address(0)) {
            revert ProjectNotFound();
        }

        // 若项目处于Fundraising状态，进行之后的逻辑；假如已经成功或结束，就此终止
        if(project.state != ProjectState.Fundraising) {
            revert ProjectNotActive();
        }

        // 必须在截止日之后才能调用此函数
        if(block.timestamp < project.deadline) {
            revert DeadlineNotReached();
        }

        // 判断项目成功与否
        if(project.raisedAmount >= project.goalAmount) {
            project.state = ProjectState.Successful;
            emit ProjectSucceeded(_projectId);
        } else {
            project.state = ProjectState.Failed;
            emit ProjectFailed(_projectId);
        }


    }
    
    /**
     * @notice 项目发起人在项目成功后提取筹集到的资金
     * @param _projectId 要提取资金的项目ID
     */
    function claimFunds(uint _projectId) public {
        Project storage project = projects[_projectId];

        // 项目存在性检查
        if(project.creator == address(0)) {
            revert ProjectNotFound();
        }

        // 仅项目发起者可以提取资金
        if(msg.sender != project.creator) {
            revert NotProjectCreator();
        }

        // 项目必须处于Successful状态
        if(project.state != ProjectState.Successful) {
            revert ProjectNotSuccessful();
        }

        uint amountToClaim = project.raisedAmount;

        // 先更新状态，防止出现重入攻击
        project.state = ProjectState.PaidOut;
        // 将已筹集的资金金额清零（虽然最后转账还是从资金池中提取的）
        project.raisedAmount = 0;

        (bool sent, ) = project.creator.call{value: amountToClaim}("");
        if(!sent) {
            // 转账失败会导致资金锁死
            // 但是先转账再修改状态会有重入攻击的风险
            // 这里的逻辑可能需要进一步完善, 目前想到的解决方法是
            // 如果转账失败，有一种机制让用户可以重试，或者合约有管理员可以介入。
            revert TransferFailed();
        }

        emit FundsClaimed(_projectId, project.creator, amountToClaim);
    }

    /**
     * @notice 捐赠者在项目失败后取回他们的捐款
     * @param _projectId 要取回捐款的项目ID
     */
    function getRefund(uint _projectId) public {
        Project storage project = projects[_projectId];
        uint amountToRefund = contributions[_projectId][msg.sender];

        // 项目存在性检查
        if (project.creator == address(0)) {
            revert ProjectNotFound();
        }

        // 项目必须处于Failed状态 
        if (project.state != ProjectState.Failed) {
            revert ProjectNotFailed();
        }

        // 调用者必须有捐款
        if (amountToRefund == 0){
            revert NothingToWithdraw();
        }

        // 清除捐赠者的捐款记录，防止重复退款
        contributions[_projectId][msg.sender] = 0;

        // 执行转账
        (bool sent, ) = payable(msg.sender).call{value: amountToRefund}("");
        if(!sent) {
            // 转账失败，先回滚捐款记录的清除，允许用户重试
            contributions[_projectId][msg.sender] = amountToRefund;
            revert TransferFailed();
        }

        emit RefundIssued(_projectId, msg.sender, amountToRefund);
    }

    // 辅助函数，查看某个用户对某个项目的捐款额度
    function getContributionAmount(uint _projectId, address _contributor) public view returns (uint) {
        return contributions[_projectId][_contributor];
    }

}