import { ethers, Contract } from 'ethers';
// 导入合约ABI - 从我们新的abis目录导入
import CrowdFundABI from '../abis/CrowdFund.json';

// 合约ABI和地址配置
export const CONTRACT_ABI = CrowdFundABI.abi;
export const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// ... (省略 ProjectState 和 ProjectStateText，它们不变) ...
export const ProjectState = {
  Fundraising: 0,
  Successful: 1,
  Failed: 2,
  PaidOut: 3,
  Refunded: 4
};
export const ProjectStateText = {
  0: '筹款中',
  1: '成功',
  2: '失败',
  3: '已支付',
  4: '已退款'
};


// 获取合约实例 (Ethers v6 语法)
export const getContract = (provider, signer = null) => {
  const contractProvider = signer || provider;
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, contractProvider);
};

// 创建项目 (Ethers v6 语法)
export const createProject = async (contract, name, description, goalAmount, deadline) => {
  try {
    const goalInWei = ethers.parseEther(goalAmount.toString()); // 使用 ethers.parseEther
    const deadlineTimestamp = Math.floor(deadline.getTime() / 1000);
    
    const tx = await contract.createProject(name, description, goalInWei, deadlineTimestamp);
    await tx.wait();
    
    return tx;
  } catch (error) {
    console.error('创建项目失败:', error);
    throw error;
  }
};

// 获取项目详情
export const getProject = async (contract, projectId) => {
  try {
    const project = await contract.projects(projectId);
    // BigInt to Number conversion for id and deadline
    return {
      id: Number(project.id),
      creator: project.creator,
      name: project.name,
      description: project.description,
      goalAmount: project.goalAmount,
      deadline: Number(project.deadline),
      raisedAmount: project.raisedAmount,
      state: project.state
    };
  } catch (error) {
    console.error(`获取项目详情失败 (ID: ${projectId}):`, error);
    throw error;
  }
};

// 获取所有项目
export const getAllProjects = async (contract) => {
  try {
    const projectCounter = await contract.projectCounter();
    const projects = [];
    
    for (let i = 1; i <= Number(projectCounter); i++) {
      try {
        const project = await getProject(contract, i);
        projects.push(project);
      } catch (error) {
        // 如果某个项目获取失败，打印错误但继续
        console.error(`获取项目 ${i} 失败，已跳过:`, error);
      }
    }
    
    return projects;
  } catch (error) {
    console.error('获取所有项目失败:', error);
    throw error;
  }
};


// 向项目捐款 (Ethers v6 语法)
export const contributeToProject = async (contract, projectId, amount) => {
  try {
    const amountInWei = ethers.parseEther(amount.toString()); // 使用 ethers.parseEther
    const tx = await contract.contribute(projectId, { value: amountInWei });
    await tx.wait();
    
    return tx;
  } catch (error) {
    console.error('捐款失败:', error);
    throw error;
  }
};

// ... (省略 checkDeadlineAndFinalize, claimFunds, getRefund，它们不变) ...
export const checkDeadlineAndFinalize = async (contract, projectId) => {
  try {
    const tx = await contract.checkDeadlineAndFinalize(projectId);
    await tx.wait();
    
    return tx;
  } catch (error) {
    console.error('完成项目失败:', error);
    throw error;
  }
};

export const claimFunds = async (contract, projectId) => {
  try {
    const tx = await contract.claimFunds(projectId);
    await tx.wait();
    
    return tx;
  } catch (error) {
    console.error('提取资金失败:', error);
    throw error;
  }
};

export const getRefund = async (contract, projectId) => {
  try {
    const tx = await contract.getRefund(projectId);
    await tx.wait();
    
    return tx;
  } catch (error) {
    console.error('申请退款失败:', error);
    throw error;
  }
};


// 获取用户对某个项目的捐款金额
export const getContributionAmount = async (contract, projectId, address) => {
  try {
    const amount = await contract.getContributionAmount(projectId, address);
    return amount;
  } catch (error) {
    console.error('获取捐款金额失败:', error);
    throw error;
  }
};

// ... (省略 getUserCreatedProjects, getUserContributedProjects，它们不变) ...
export const getUserCreatedProjects = async (contract, userAddress) => {
  try {
    const allProjects = await getAllProjects(contract);
    return allProjects.filter(project => 
      project.creator.toLowerCase() === userAddress.toLowerCase()
    );
  } catch (error) {
    console.error('获取用户创建的项目失败:', error);
    throw error;
  }
};

export const getUserContributedProjects = async (contract, userAddress) => {
  try {
    const allProjects = await getAllProjects(contract);
    const contributedProjects = [];
    
    for (const project of allProjects) {
      try {
        const contribution = await getContributionAmount(contract, project.id, userAddress);
        if (contribution > 0n) { // BigInt comparison
          contributedProjects.push({
            ...project,
            myContribution: contribution
          });
        }
      } catch (error) {
        console.error(`检查项目 ${project.id} 的捐款失败:`, error);
      }
    }
    
    return contributedProjects;
  } catch (error) {
    console.error('获取用户参与的项目失败:', error);
    throw error;
  }
};