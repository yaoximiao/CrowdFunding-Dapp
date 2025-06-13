/* --- START OF FILE utils/contractUtils.js (修复版本) --- */

import { ethers, Contract } from 'ethers';
// 导入合约ABI
import CrowdFundABI from '../abis/CrowdFund.json';

// 合约ABI和地址配置
export const CONTRACT_ABI = CrowdFundABI.abi;
export const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

// 项目状态枚举
export const ProjectState = {
  Fundraising: 0,
  Successful: 1,
  Failed: 2,
  PaidOut: 3,
  Refunded: 4
};

// 项目状态中文映射
export const ProjectStateText = {
  0: '筹款中',
  1: '成功',
  2: '失败',
  3: '已支付',
  4: '已退款'
};

/**
 * 获取合约实例
 * @param {ethers.Provider} provider - Ethers provider
 * @param {ethers.Signer} [signer=null] - Ethers signer, for write operations
 * @returns {ethers.Contract} The contract instance
 */
export const getContract = (provider, signer = null) => {
  const contractProvider = signer || provider;
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, contractProvider);
};

// ===================================================================
// === 项目创建与基本信息获取 ===
// ===================================================================

/**
 * 创建一个带里程碑的新项目
 */
export const createProjectWithMilestones = async (contract, name, description, goalAmount, deadline, milestoneDescriptions, milestoneReleaseAmounts) => {
  try {
    const goalInWei = ethers.parseEther(goalAmount.toString());
    const deadlineTimestamp = Math.floor(deadline.getTime() / 1000);
    const amountsInWei = milestoneReleaseAmounts.map(amount => ethers.parseEther(amount.toString()));
    
    console.log('创建项目参数:', {
      name,
      description,
      goalInWei: goalInWei.toString(),
      deadlineTimestamp,
      milestoneDescriptions,
      amountsInWei: amountsInWei.map(a => a.toString())
    });
    
    const tx = await contract.createProject(name, description, goalInWei, deadlineTimestamp, milestoneDescriptions, amountsInWei);
    await tx.wait();
    
    return tx;
  } catch (error) {
    console.error('创建带里程碑的项目失败:', error);
    throw error;
  }
};

/**
 * 获取单个项目详情
 */
export const getProject = async (contract, projectId) => {
  try {
    const project = await contract.projects(projectId);
    return {
      id: Number(project.id || 0),
      creator: project.creator || ethers.ZeroAddress,
      name: project.name || '无标题',
      description: project.description || '无描述',
      goalAmount: project.goalAmount || 0n, // <--- 关键修复
      deadline: Number(project.deadline || 0),
      raisedAmount: project.raisedAmount || 0n, // <--- 关键修复
      state: Number(project.state || 0)
    };
  } catch (error) {
    console.error(`获取项目详情失败 (ID: ${projectId}):`, error);
    throw error;
  }
};

/**
 * 获取所有项目
 */
export const getAllProjects = async (contract) => {
  try {
    const projectCounter = await contract.projectCounter();
    const projects = [];
    
    for (let i = 1; i <= Number(projectCounter); i++) {
      try {
        const project = await getProject(contract, i);
        projects.push(project);
      } catch (error) {
        console.error(`获取项目 ${i} 失败，已跳过:`, error);
      }
    }
    
    return projects;
  } catch (error) {
    console.error('获取所有项目失败:', error);
    throw error;
  }
};


// ===================================================================
// === 捐款与资金处理 ===
// ===================================================================

/**
 * 向项目捐款
 */
export const contributeToProject = async (contract, projectId, amount) => {
  try {
    const amountInWei = ethers.parseEther(amount.toString());
    console.log(`向项目 ${projectId} 捐款 ${amount} ETH (${amountInWei.toString()} Wei)`);
    
    const tx = await contract.contribute(projectId, { value: amountInWei });
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('捐款失败:', error);
    throw error;
  }
};

/**
 * 检查项目截止日期并更新状态
 */
export const checkDeadlineAndFinalize = async (contract, projectId) => {
  try {
    console.log(`完成项目 ${projectId}`);
    const tx = await contract.checkDeadlineAndFinalize(projectId);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('完成项目失败:', error);
    throw error;
  }
};

/**
 * 申请退款 (项目失败后)
 */
export const getRefund = async (contract, projectId) => {
  try {
    console.log(`申请项目 ${projectId} 的退款`);
    const tx = await contract.getRefund(projectId);
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('申请退款失败:', error);
    throw error;
  }
};


// ===================================================================
// === 里程碑与投票功能 ===
// ===================================================================

/**
 * 检查合约是否支持里程碑功能
 */
export const checkMilestoneSupport = async (contract) => {
  try {
    // 检查合约是否有 getProjectMilestones 函数
    const contractInterface = contract.interface;
    const hasGetMilestones = contractInterface.hasFunction('getProjectMilestones');
    const hasStartVote = contractInterface.hasFunction('startMilestoneVote');
    const hasVoteOn = contractInterface.hasFunction('voteOnMilestone');
    const hasExecute = contractInterface.hasFunction('executeMilestone');
    
    console.log('里程碑功能支持检查:', {
      hasGetMilestones,
      hasStartVote,
      hasVoteOn,
      hasExecute
    });
    
    return {
      supported: hasGetMilestones && hasStartVote && hasVoteOn && hasExecute,
      functions: { hasGetMilestones, hasStartVote, hasVoteOn, hasExecute }
    };
  } catch (error) {
    console.error('检查里程碑支持失败:', error);
    return { supported: false, functions: {} };
  }
};

/**
 * 获取项目的里程碑详情 (改进版本)
 */
export const getProjectMilestones = async (contract, projectId) => {
  try {
    console.log(`开始获取项目 ${projectId} 的里程碑`);
    
    // 首先检查合约是否支持里程碑功能
    const support = await checkMilestoneSupport(contract);
    if (!support.supported) {
      console.warn('合约不支持里程碑功能');
      return [];
    }
    
    // 检查项目是否存在
    try {
      const project = await contract.projects(projectId);
      console.log(`项目 ${projectId} 信息:`, {
        id: Number(project.id),
        state: Number(project.state),
        creator: project.creator,
        name: project.name
      });
      
      // 只有成功的项目才有里程碑
      if (Number(project.state) !== 1) {
        console.log(`项目 ${projectId} 状态不是成功状态 (${Number(project.state)})`);
        return [];
      }
    } catch (error) {
      console.error(`项目 ${projectId} 不存在或无法访问:`, error);
      return [];
    }
    
    // 尝试不同的方法获取里程碑
    let milestones;
    
    try {
      // 方法1: 直接调用 getProjectMilestones
      console.log(`尝试调用 getProjectMilestones(${projectId})`);
      milestones = await contract.getProjectMilestones(projectId);
      console.log('原始里程碑数据:', milestones);
    } catch (error1) {
      console.error('方法1失败:', error1);
      
      try {
        // 方法2: 使用 callStatic (只读调用)
        console.log(`尝试使用 callStatic 调用 getProjectMilestones(${projectId})`);
        milestones = await contract.getProjectMilestones.staticCall(projectId);
        console.log('staticCall 里程碑数据:', milestones);
      } catch (error2) {
        console.error('方法2失败:', error2);
        
        try {
          // 方法3: 检查是否有项目计数器来验证项目ID有效性
          const projectCounter = await contract.projectCounter();
          if (projectId > Number(projectCounter)) {
            console.error(`项目ID ${projectId} 超出范围 (最大: ${projectCounter})`);
            return [];
          }
          
          // 方法4: 尝试估算 gas 来检查函数是否会成功
          console.log('尝试估算gas...');
          await contract.getProjectMilestones.estimateGas(projectId);
          
          // 如果估算成功，再次尝试调用
          milestones = await contract.getProjectMilestones(projectId);
          console.log('重试成功，里程碑数据:', milestones);
        } catch (error3) {
          console.error('所有方法都失败了:', error3);
          
          // 最后的尝试：检查事件日志
          try {
            console.log('尝试从事件日志获取里程碑信息...');
            const filter = contract.filters.ProjectCreated(projectId);
            const events = await contract.queryFilter(filter);
            console.log('项目创建事件:', events);
            
            if (events.length === 0) {
              console.log('未找到项目创建事件，可能项目不存在或没有里程碑');
              return [];
            }
          } catch (eventError) {
            console.error('获取事件也失败了:', eventError);
          }
          
          return [];
        }
      }
    }
    
    // 处理里程碑数据
    if (!milestones || milestones.length === 0) {
      console.log(`项目 ${projectId} 没有里程碑`);
      return [];
    }
    
    const processedMilestones = milestones.map((m, index) => {
      console.log(`处理里程碑 ${index}:`, m);
      return {
        description: m.description || `里程碑 ${index + 1}`,
        releaseAmount: m.releaseAmount || 0n,
        voteDeadline: Number(m.voteDeadline || 0),
        yesVotes: m.yesVotes || 0n,
        noVotes: m.noVotes || 0n,
        executed: Boolean(m.executed),
      };
    });
    
    console.log(`项目 ${projectId} 处理后的里程碑:`, processedMilestones);
    return processedMilestones;
    
  } catch (error) {
    console.error(`获取项目 ${projectId} 的里程碑失败:`, error);
    
    // 提供更详细的错误信息
    if (error.message && error.message.includes('missing revert data')) {
      console.error('这通常意味着：');
      console.error('1. 合约中没有实现 getProjectMilestones 函数');
      console.error('2. 项目ID不存在');
      console.error('3. 项目没有里程碑数据');
      console.error('4. 合约状态不正确');
    }
    
    return [];
  }
};

/**
 * 发起里程碑投票
 */
export const startMilestoneVote = async (contract, projectId, milestoneIndex, durationSeconds) => {
  try {
    console.log(`发起里程碑投票: 项目${projectId}, 里程碑${milestoneIndex}, 持续${durationSeconds}秒`);
    
    // 首先检查是否为项目创建者
    const project = await contract.projects(projectId);
    const signer = await contract.runner.getAddress();
    
    if (project.creator.toLowerCase() !== signer.toLowerCase()) {
      throw new Error('只有项目创建者可以发起里程碑投票');
    }
    
    // 检查项目状态
    if (Number(project.state) !== 1) {
      throw new Error('只有成功的项目才能发起里程碑投票');
    }
    
    const tx = await contract.startMilestoneVote(projectId, milestoneIndex, durationSeconds);
    const receipt = await tx.wait();
    
    console.log('里程碑投票发起成功:', receipt);
    return tx;
  } catch (error) {
    console.error('发起里程碑投票失败:', error);
    throw error;
  }
};

/**
 * 对里程碑进行投票
 */
export const voteOnMilestone = async (contract, projectId, milestoneIndex, vote) => {
  try {
    console.log(`里程碑投票: 项目${projectId}, 里程碑${milestoneIndex}, 投票${vote ? '同意' : '反对'}`);
    
    // 检查用户是否有捐款
    const signer = await contract.runner.getAddress();
    const contribution = await contract.getContributionAmount(projectId, signer);
    
    if (contribution === 0n) {
      throw new Error('只有捐款人才能参与投票');
    }
    
    console.log(`用户捐款金额: ${ethers.formatEther(contribution)} ETH`);
    
    const tx = await contract.voteOnMilestone(projectId, milestoneIndex, vote);
    const receipt = await tx.wait();
    
    console.log('投票成功:', receipt);
    return tx;
  } catch (error) {
    console.error('里程碑投票失败:', error);
    throw error;
  }
};

/**
 * 执行里程碑投票结果
 */
export const executeMilestone = async (contract, projectId, milestoneIndex) => {
  try {
    console.log(`执行里程碑: 项目${projectId}, 里程碑${milestoneIndex}`);
    
    const tx = await contract.executeMilestone(projectId, milestoneIndex);
    const receipt = await tx.wait();
    
    console.log('里程碑执行成功:', receipt);
    return tx;
  } catch (error) {
    console.error('执行里程碑失败:', error);
    throw error;
  }
};


// ===================================================================
// === 用户相关数据获取 ===
// ===================================================================

/**
 * 获取用户对某个项目的捐款金额
 */
export const getContributionAmount = async (contract, projectId, address) => {
  try {
    const amount = await contract.getContributionAmount(projectId, address);
    console.log(`用户 ${address} 对项目 ${projectId} 的捐款: ${ethers.formatEther(amount)} ETH`);
    return amount;
  } catch (error) {
    console.error('获取捐款金额失败:', error);
    throw error;
  }
};

/**
 * 获取用户创建的所有项目
 */
export const getUserCreatedProjects = async (contract, userAddress) => {
  try {
    const allProjects = await getAllProjects(contract);
    const createdProjects = allProjects.filter(p => 
      p.creator.toLowerCase() === userAddress.toLowerCase()
    );
    console.log(`用户 ${userAddress} 创建的项目:`, createdProjects);
    return createdProjects;
  } catch (error) {
    console.error('获取用户创建的项目失败:', error);
    throw error;
  }
};

/**
 * 获取用户参与捐款的所有项目
 */
export const getUserContributedProjects = async (contract, userAddress) => {
  try {
    const allProjects = await getAllProjects(contract);
    const contributedProjects = [];
    
    for (const project of allProjects) {
      try {
        const contribution = await getContributionAmount(contract, project.id, userAddress);
        if (contribution > 0n) {
          contributedProjects.push({
            ...project,
            myContribution: contribution
          });
        }
      } catch (error) {
        console.error(`检查项目 ${project.id} 的捐款失败:`, error);
      }
    }
    
    console.log(`用户 ${userAddress} 参与的项目:`, contributedProjects);
    return contributedProjects;
  } catch (error) {
    console.error('获取用户参与的项目失败:', error);
    throw error;
  }
};

// ===================================================================
// === 调试工具函数 ===
// ===================================================================

/**
 * 调试函数：打印合约信息
 */
export const debugContractInfo = async (contract) => {
  try {
    console.log('=== 合约调试信息 ===');
    console.log('合约地址:', contract.target);
    console.log('合约ABI函数:');
    
    const functions = contract.interface.fragments.filter(f => f.type === 'function');
    functions.forEach(func => {
      console.log(`- ${func.name}(${func.inputs.map(i => i.type).join(', ')})`);
    });
    
    try {
      const projectCounter = await contract.projectCounter();
      console.log('项目计数器:', Number(projectCounter));
    } catch (error) {
      console.log('无法获取项目计数器:', error.message);
    }
    
    console.log('=== 调试信息结束 ===');
  } catch (error) {
    console.error('获取合约调试信息失败:', error);
  }
};

/**
 * 调试函数：测试里程碑功能
 */
export const debugMilestoneFunction = async (contract, projectId) => {
  try {
    console.log(`=== 调试项目 ${projectId} 的里程碑功能 ===`);
    
    // 检查项目基本信息
    try {
      const project = await contract.projects(projectId);
      console.log('项目基本信息:', {
        id: Number(project.id),
        creator: project.creator,
        name: project.name,
        state: Number(project.state),
        goalAmount: ethers.formatEther(project.goalAmount),
        raisedAmount: ethers.formatEther(project.raisedAmount)
      });
    } catch (error) {
      console.error('无法获取项目基本信息:', error);
      return;
    }
    
    // 检查里程碑功能支持
    const support = await checkMilestoneSupport(contract);
    console.log('里程碑功能支持:', support);
    
    if (!support.supported) {
      console.error('合约不支持里程碑功能');
      return;
    }
    
    // 尝试调用里程碑函数
    try {
      console.log('尝试调用 getProjectMilestones...');
      const milestones = await contract.getProjectMilestones(projectId);
      console.log('里程碑数据:', milestones);
    } catch (error) {
      console.error('调用 getProjectMilestones 失败:', error);
      
      // 更详细的错误分析
      if (error.code === 'CALL_EXCEPTION') {
        console.error('这是一个合约调用异常，可能的原因：');
        console.error('1. 函数不存在或签名不匹配');
        console.error('2. 函数执行时发生了 revert');
        console.error('3. 项目ID无效');
        console.error('4. 合约状态不正确');
      }
    }
    
    console.log('=== 调试结束 ===');
  } catch (error) {
    console.error('调试里程碑功能失败:', error);
  }
};

/* --- END OF FILE utils/contractUtils.js --- */