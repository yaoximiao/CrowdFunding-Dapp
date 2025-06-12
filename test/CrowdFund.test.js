// test/CrowdFund.test.js

const { expect } = require("chai");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CrowdFund Contract", function() {
    let CrowdFundFactory;
    let crowdFundInstance;
    let owner;
    let addr1;
    let addr2;
    let addrs;
    let projectGoal; // This will be a BigInt after parseEther in top-level beforeEach
    let projectDeadline; // This is a JS number (timestamp) from top-level beforeEach
    let local_ethers; // Declared here, assigned in top-level beforeEach

    const projectName = "CrowdFunding-Dapp";
    const projectDesc = "基于区块链的众筹系统";

    beforeEach(async function () {
        const hre = require("hardhat");
        local_ethers = hre.ethers; // Assign to the higher-scoped variable

        CrowdFundFactory = await local_ethers.getContractFactory("CrowdFund");
        [owner, addr1, addr2, ...addrs] = await local_ethers.getSigners();
        crowdFundInstance = await CrowdFundFactory.deploy();

        projectGoal = local_ethers.parseEther("10");

        const ONE_DAY_IN_SECS = 24 * 60 * 60;
        const currentTimestamp = await time.latest();
        projectDeadline = currentTimestamp + ONE_DAY_IN_SECS;
    });

    // 测试1：项目创建 (这部分看起来已正确使用 local_ethers)
    describe("Project Creation", function() {
        it("Should allow a user to create a new project", async function() {
            const tx = await crowdFundInstance.connect(owner).createProject(
                projectName,
                projectDesc,
                projectGoal, // Uses projectGoal from outer beforeEach
                projectDeadline
            );
            await tx.wait();
            const projectData = await crowdFundInstance.projects(1);
            expect(projectData.id).to.equal(1);
            expect(projectData.creator).to.equal(owner.address);
            expect(projectData.name).to.equal(projectName);
            expect(projectData.goalAmount).to.equal(projectGoal);
            expect(projectData.deadline).to.equal(projectDeadline);
            expect(projectData.state).to.equal(0);
        });

        it("Should emit a ProjectCreated event upon creation", async function() {
            await expect(crowdFundInstance.connect(owner).createProject(
                projectName,
                projectDesc,
                projectGoal,
                projectDeadline
            )).to.emit(crowdFundInstance, "ProjectCreated").withArgs(1, owner.address, projectName, projectGoal, projectDeadline);
        });

        it("Should revert if deadline is in the past", async function(){
            const pastDeadline = (await time.latest()) - 3600;
            // Uses local_ethers from the higher scope
            await expect(crowdFundInstance.createProject(
                "Past Project", "Desc", local_ethers.parseEther("1"), pastDeadline
            )).to.be.revertedWithCustomError(crowdFundInstance, "DeadlineInPast");
        });

        it("Should revert if goal amount is zero", async function(){
            await expect(crowdFundInstance.createProject(
                "Zero Goal", "Desc", 0, projectDeadline
            )).to.be.revertedWithCustomError(crowdFundInstance, "GoalIsZero");
        });
    });

    // 测试2：捐款 (这部分看起来已正确使用 local_ethers)
    describe("Contribution", function(){
        beforeEach(async function(){
            await crowdFundInstance.connect(owner).createProject(
                projectName,
                projectDesc,
                projectGoal,
                projectDeadline
            );
        });

        it("Should allow a user to contribute to an active project", async function(){
            const contributionAmount = local_ethers.parseEther("1");
            const projectId = 1;
            // ... (rest of the test)
            const tx = await crowdFundInstance.connect(addr1).contribute(projectId, {value: contributionAmount});
            await tx.wait();
            const project = await crowdFundInstance.projects(projectId);
            expect(project.raisedAmount).to.equal(contributionAmount);
            const contributorBalance = await crowdFundInstance.contributions(projectId, addr1.address);
            expect(contributorBalance).to.equal(contributionAmount);
        });
        // ... (other tests in Contribution use local_ethers.parseEther correctly)
        it("Should emit a ContributionMade event", async function(){
            const contributionAmount = local_ethers.parseEther("0.5");
            const projectId = 1;
            await expect(crowdFundInstance.connect(addr1).contribute(projectId, {value:contributionAmount}))
                .to.emit(crowdFundInstance, "ContributionMade")
                .withArgs(projectId, addr1.address, contributionAmount);
        });
        it("Should revert if project does not exist", async function(){
            await expect(crowdFundInstance.connect(addr1).contribute(99, {value: local_ethers.parseEther("1")})) 
                .to.be.revertedWithCustomError(crowdFundInstance, "ProjectNotFound");
        });
        it("Should revert if project is not in Fundraising state", async function(){
            const projectId = 1;
            const targetTime = projectDeadline + 1;
            const currentTime = await time.latest();
            if(targetTime > currentTime) await time.increaseTo(targetTime);
            await crowdFundInstance.connect(owner).checkDeadlineAndFinalize(projectId);

            await expect(crowdFundInstance.connect(addr1).contribute(projectId, {value: local_ethers.parseEther("1")}))
                .to.be.revertedWithCustomError(crowdFundInstance, "ProjectNotActive");
        });
        it("Should revert if deadline has reached", async function () {
            const projectId = 1;
            const targetTime = projectDeadline + 1;
            const currentTime = await time.latest();
            if(targetTime > currentTime) await time.increaseTo(targetTime);

            await expect(crowdFundInstance.connect(addr1).contribute(projectId, { value: local_ethers.parseEther("1")})) 
                .to.be.revertedWithCustomError(crowdFundInstance, "DeadlineReached");
        });
    });

    // 测试3: 截止日期检查与最终确定
    describe("Deadline Check and Finalization", function(){
        beforeEach(async function() {
            await crowdFundInstance.connect(owner).createProject(
                projectName,
                projectDesc,
                projectGoal,
                projectDeadline
            );
        });

        it("Should mark project as Successful if goal is met", async function () {
            const projectId = 1;
            await crowdFundInstance.connect(addr1).contribute(projectId, { value: local_ethers.parseEther("5") });
            await crowdFundInstance.connect(addr2).contribute(projectId, { value: local_ethers.parseEther("5") });

            const targetTime = projectDeadline + 1;
            const currentTime = await time.latest();
            if(targetTime > currentTime) await time.increaseTo(targetTime);
            await crowdFundInstance.connect(owner).checkDeadlineAndFinalize(projectId);
            // ... (断言不变)
            const project = await crowdFundInstance.projects(projectId);
            expect(project.state).to.equal(1);
            await expect(crowdFundInstance.checkDeadlineAndFinalize(projectId))
                .to.be.revertedWithCustomError(crowdFundInstance, "ProjectNotActive");
        });

        // 第一个 "Should emit ProjectFailed event" - 这个是正确的逻辑
        it("Should emit ProjectFailed event when finalized and goal not met", async function(){ // 更明确的描述
            const projectId = 1;
            const targetDeadlinePlusOne = projectDeadline + 1;
            const currentBlockTimestamp = await time.latest();

            if (targetDeadlinePlusOne > currentBlockTimestamp) {
                await time.increaseTo(targetDeadlinePlusOne);
            }
            await expect(crowdFundInstance.connect(owner).checkDeadlineAndFinalize(projectId))
                .to.emit(crowdFundInstance, "ProjectFailed")
                .withArgs(projectId);
        });

        it("Should mark project as Failed if goal is not met", async function () {
            const projectId = 1;
            await crowdFundInstance.connect(addr1).contribute(projectId, { value: local_ethers.parseEther("1") });
            const targetTime = projectDeadline + 1;
            const currentTime = await time.latest();
            if(targetTime > currentTime) await time.increaseTo(targetTime);
            await crowdFundInstance.connect(owner).checkDeadlineAndFinalize(projectId);
             // ... (断言不变)
            const project = await crowdFundInstance.projects(projectId);
            expect(project.state).to.equal(2);
        });

        // 删除了重复的、逻辑不正确的 "Should emit ProjectFailed event" 测试用例

        it("Should revert if trying to finalize before deadline", async function () {
            await expect(crowdFundInstance.checkDeadlineAndFinalize(1))
                .to.be.revertedWithCustomError(crowdFundInstance, "DeadlineNotReached");
        });
    });

    // 测试4：资金提取
    describe("Claiming Funds", function () {
        beforeEach(async function() {
            // 这个 beforeEach 块应该能够访问外部作用域的 local_ethers
            await crowdFundInstance.connect(owner).createProject(
                projectName,
                projectDesc,
                projectGoal, // projectGoal (BigInt) from outer beforeEach
                projectDeadline // projectDeadline (number) from outer beforeEach
            );
            const projectId = 1;
            await crowdFundInstance.connect(addr1).contribute(projectId, { value: local_ethers.parseEther("6") }); // 使用 local_ethers
            await crowdFundInstance.connect(addr2).contribute(projectId, { value: local_ethers.parseEther("4") }); // 使用 local_ethers
            
            const currentBlockTimestamp = await time.latest();
            const targetTime = projectDeadline + 1;
            if (targetTime > currentBlockTimestamp) {
                await time.increaseTo(targetTime);
            }
            await crowdFundInstance.connect(owner).checkDeadlineAndFinalize(projectId);
        });

        it("Should allow project creator to claim funds if project is successful", async function () {
            const projectId = 1;
            const project = await crowdFundInstance.projects(projectId);
            expect(project.state).to.equal(1);

            // 使用 local_ethers
            const initialOwnerBalance = await local_ethers.provider.getBalance(owner.address);
            const raisedAmount = project.raisedAmount;

            const tx = await crowdFundInstance.connect(owner).claimFunds(projectId);
            const receipt = await tx.wait();

            let gasCost = BigInt(0);
            if (receipt && receipt.gasUsed && receipt.effectiveGasPrice) {
                gasCost = receipt.gasUsed * receipt.effectiveGasPrice;
            } else if (receipt && receipt.gasUsed && tx.gasPrice) {
                gasCost = receipt.gasUsed * tx.gasPrice;
            }

            // 使用 local_ethers
            const finalOwnerBalance = await local_ethers.provider.getBalance(owner.address);
            expect(finalOwnerBalance).to.equal(initialOwnerBalance + raisedAmount - gasCost);

            const projectAfterClaim = await crowdFundInstance.projects(projectId);
            expect(projectAfterClaim.state).to.equal(3);
            expect(projectAfterClaim.raisedAmount).to.equal(BigInt(0));
        });

        it("Should emit FundsClaimed event", async function(){
            const projectId = 1;
            const project = await crowdFundInstance.projects(projectId);
            await expect(crowdFundInstance.connect(owner).claimFunds(projectId))
                .to.emit(crowdFundInstance, "FundsClaimed")
                .withArgs(projectId, owner.address, project.raisedAmount);
        });

        it("Should revert if non-creator tries to claim funds", async function () {
            await expect(crowdFundInstance.connect(addr1).claimFunds(1))
                .to.be.revertedWithCustomError( crowdFundInstance,"NotProjectCreator");
        });

        it("Should revert if project is not successful", async function () {
            const currentTimestamp = await time.latest();
            const newDeadline = currentTimestamp + 3600;
            // 使用 local_ethers
            await crowdFundInstance.connect(owner).createProject("Failed Project", "D", local_ethers.parseEther("1"), newDeadline);
            const failedProjectId = 2;
            
            const targetTime = newDeadline + 1;
            const currentBlockTimestamp2 = await time.latest();
            if (targetTime > currentBlockTimestamp2) {
                await time.increaseTo(targetTime);
            }
            await crowdFundInstance.checkDeadlineAndFinalize(failedProjectId);

            await expect(crowdFundInstance.connect(owner).claimFunds(failedProjectId))
                .to.be.revertedWithCustomError(crowdFundInstance, "ProjectNotSuccessful");
        });
    });

    // 测试5：退款
    describe("Refunding", function () {
        let failedProjectId;
        let contributionAddr1Wei;
        // contributionAddr2Wei is not used outside beforeEach, so can be local to it

        beforeEach(async function() {
            // 这个 beforeEach 块应该能够访问外部作用域的 local_ethers
            contributionAddr1Wei = local_ethers.parseEther("2"); // 使用 local_ethers
            const contributionAddr2Wei = local_ethers.parseEther("3"); // 使用 local_ethers

            await crowdFundInstance.connect(owner).createProject(
                "Failed Project for Refund",
                "Desc for Refund",
                projectGoal, // projectGoal (BigInt) from outer beforeEach
                projectDeadline // projectDeadline (number) from outer beforeEach
            );
            failedProjectId = 1;
            await crowdFundInstance.connect(addr1).contribute(failedProjectId, { value: contributionAddr1Wei });
            await crowdFundInstance.connect(addr2).contribute(failedProjectId, { value: contributionAddr2Wei });

            const currentBlockTimestamp = await time.latest();
            const targetTime = projectDeadline + 1;
            if (targetTime > currentBlockTimestamp) {
                await time.increaseTo(targetTime);
            }
            await crowdFundInstance.connect(owner).checkDeadlineAndFinalize(failedProjectId);

            const project = await crowdFundInstance.projects(failedProjectId);
            expect(project.state).to.equal(2, "Project should be in Failed state after beforeEach setup for Refunding");
        });

        it("Should allow a contributor to get a refund if project failed", async function () {
            const project = await crowdFundInstance.projects(failedProjectId);
            expect(project.state).to.equal(2);

            // 使用 local_ethers
            const initialAddr1Balance = await local_ethers.provider.getBalance(addr1.address);
            const tx = await crowdFundInstance.connect(addr1).getRefund(failedProjectId);
            const receipt = await tx.wait();
            
            let gasCost = BigInt(0);
            if (receipt && receipt.gasUsed && receipt.effectiveGasPrice) {
                gasCost = receipt.gasUsed * receipt.effectiveGasPrice;
            } else if (receipt && receipt.gasUsed && tx.gasPrice) {
                gasCost = receipt.gasUsed * tx.gasPrice;
            }

            // 使用 local_ethers
            const finalAddr1Balance = await local_ethers.provider.getBalance(addr1.address);
            expect(finalAddr1Balance).to.equal(initialAddr1Balance + contributionAddr1Wei - gasCost);

            const addr1ContributionAfterRefund = await crowdFundInstance.contributions(failedProjectId, addr1.address);
            expect(addr1ContributionAfterRefund).to.equal(BigInt(0));
        });

        it("Should emit RefundIssued event", async function(){
            await expect(crowdFundInstance.connect(addr1).getRefund(failedProjectId))
                .to.emit(crowdFundInstance, "RefundIssued")
                .withArgs(failedProjectId, addr1.address, contributionAddr1Wei);
        });

        it("Should revert if trying to refund from a successful project", async function () {
            const currentTimestamp = await time.latest();
            const newDeadline = currentTimestamp + 3600;
            const successfulProjectId = 2;
            // 使用 local_ethers
            await crowdFundInstance.connect(owner).createProject("Successful Project", "D", local_ethers.parseEther("1"), newDeadline);
            await crowdFundInstance.connect(addr1).contribute(successfulProjectId, { value: local_ethers.parseEther("1")});
            
            const targetTime = newDeadline + 1;
            const currentBlockTimestamp2 = await time.latest();
            if (targetTime > currentBlockTimestamp2) {
                await time.increaseTo(targetTime);
            }
            await crowdFundInstance.checkDeadlineAndFinalize(successfulProjectId);

            await expect(crowdFundInstance.connect(addr1).getRefund(successfulProjectId))
                .to.be.revertedWithCustomError(crowdFundInstance, "ProjectNotFailed");
        });
        
        it("Should revert if non-contributor tries to get refund", async function () {
            await expect(crowdFundInstance.connect(owner).getRefund(failedProjectId))
                .to.be.revertedWithCustomError(crowdFundInstance, "NothingToWithdraw");
        });

        it("Should revert if trying to refund twice", async function () {
            await crowdFundInstance.connect(addr1).getRefund(failedProjectId);
            await expect(crowdFundInstance.connect(addr1).getRefund(failedProjectId))
                .to.be.revertedWithCustomError(crowdFundInstance, "NothingToWithdraw");
        });
    });
});