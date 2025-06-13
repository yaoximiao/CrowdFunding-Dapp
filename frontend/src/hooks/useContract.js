/* --- START OF FILE hooks/useContract.js (最终更新版) --- */

import { useState, useEffect, useCallback } from 'react';
import { getContract, getAllProjects, getUserCreatedProjects, getUserContributedProjects } from '../utils/contractUtils';
import { useWeb3 } from './useWeb3';

export const useContract = () => {
  const { provider, signer, account } = useWeb3(); // 移除了 isConnected，因为没用到
  const [contract, setContract] = useState(null);
  const [projects, setProjects] = useState([]);
  const [myProjects, setMyProjects] = useState([]);
  const [myContributions, setMyContributions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 初始化合约
  useEffect(() => {
    if (provider) {
      try {
        const contractInstance = getContract(provider, signer);
        setContract(contractInstance);
      } catch (err) {
        console.error('初始化合约失败:', err);
        setError('合约初始化失败');
      }
    }
  }, [provider, signer]);

  // 获取所有项目
  const fetchAllProjects = useCallback(async () => {
    if (!contract) return;
    setLoading(true);
    setError('');
    try {
      const allProjects = await getAllProjects(contract);
      setProjects(allProjects);
    } catch (err) {
      console.error('获取项目失败:', err);
      setError('获取项目列表失败');
    } finally {
      setLoading(false);
    }
  }, [contract]);

  // 获取我创建的项目
  const fetchMyProjects = useCallback(async () => {
    if (!contract || !account) return;
    setLoading(true);
    setError('');
    try {
      const userProjects = await getUserCreatedProjects(contract, account);
      setMyProjects(userProjects);
    } catch (err) {
      console.error('获取我的项目失败:', err);
      setError('获取我的项目失败');
    } finally {
      setLoading(false);
    }
  }, [contract, account]);

  // 获取我参与的项目
  const fetchMyContributions = useCallback(async () => {
    if (!contract || !account) return;
    setLoading(true);
    setError('');
    try {
      const contributedProjects = await getUserContributedProjects(contract, account);
      setMyContributions(contributedProjects);
    } catch (err) {
      console.error('获取我的捐款失败:', err);
      setError('获取我的捐款记录失败');
    } finally {
      setLoading(false);
    }
  }, [contract, account]);

  // 刷新所有数据
  const refreshData = useCallback(async () => {
    if (!contract) return;
    
    await Promise.all([
      fetchAllProjects(),
      account ? fetchMyProjects() : Promise.resolve(),
      account ? fetchMyContributions() : Promise.resolve()
    ]);
  }, [contract, account, fetchAllProjects, fetchMyProjects, fetchMyContributions]);

  // 初始加载数据
  useEffect(() => {
    if (contract) {
      refreshData();
    }
  }, [contract, refreshData]);

  // ==========================================================
  // === 事件监听器 (已更新以匹配新合约) ===
  // ==========================================================
  useEffect(() => {
    if (!contract) return;

    // 定义所有事件处理器
    const handleProjectCreated = (projectId) => {
      console.log('✅ 事件: 新项目创建', { projectId: Number(projectId) });
      refreshData();
    };
    const handleContributionMade = (projectId) => {
      console.log('✅ 事件: 新捐款', { projectId: Number(projectId) });
      refreshData();
    };
    const handleProjectStateChange = (projectId) => {
      console.log('✅ 事件: 项目状态变更', { projectId: Number(projectId) });
      refreshData();
    };
    const handleRefundIssued = (projectId) => {
      console.log('✅ 事件: 退款发放', { projectId: Number(projectId) });
      refreshData();
    };
    // 新增里程碑事件处理器
    const handleMilestoneEvent = (projectId) => {
        console.log('✅ 事件: 里程碑相关活动', { projectId: Number(projectId) });
        refreshData();
    }

    // 注册事件监听器
    contract.on('ProjectCreated', handleProjectCreated);
    contract.on('ContributionMade', handleContributionMade);
    contract.on('ProjectSucceeded', handleProjectStateChange);
    contract.on('ProjectFailed', handleProjectStateChange);
    contract.on('RefundIssued', handleRefundIssued);
    // 新的里程碑事件
    contract.on('MilestoneVoteStarted', handleMilestoneEvent);
    contract.on('VotedOnMilestone', handleMilestoneEvent);
    contract.on('MilestoneFundsReleased', handleMilestoneEvent);
    contract.on('MilestoneVoteFailed', handleMilestoneEvent);


    // 清理事件监听器
    return () => {
      contract.removeAllListeners('ProjectCreated');
      contract.removeAllListeners('ContributionMade');
      contract.removeAllListeners('ProjectSucceeded');
      contract.removeAllListeners('ProjectFailed');
      contract.removeAllListeners('RefundIssued');
      // 清理新的里程碑事件
      contract.removeAllListeners('MilestoneVoteStarted');
      contract.removeAllListeners('VotedOnMilestone');
      contract.removeAllListeners('MilestoneFundsReleased');
      contract.removeAllListeners('MilestoneVoteFailed');
    };
  }, [contract, refreshData]);

  return {
    contract,
    projects,
    myProjects,
    myContributions,
    loading,
    error,
    refreshData,
  };
};

/* --- END OF FILE hooks/useContract.js --- */