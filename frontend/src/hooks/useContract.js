import { useState, useEffect, useCallback } from 'react';
import { getContract, getAllProjects, getUserCreatedProjects, getUserContributedProjects } from '../utils/contractUtils';
import { useWeb3 } from './useWeb3';

export const useContract = () => {
  const { provider, signer, account } = useWeb3();
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

  // 监听合约事件
  useEffect(() => {
    if (!contract) return;

    const handleProjectCreated = (projectId, creator, name, goalAmount, deadline) => {
      console.log('新项目创建:', { projectId: projectId.toNumber(), creator, name });
      refreshData();
    };

    const handleContributionMade = (projectId, contributor, amount) => {
      console.log('新捐款:', { projectId: projectId.toNumber(), contributor, amount: amount.toString() });
      refreshData();
    };

    const handleProjectSucceeded = (projectId) => {
      console.log('项目成功:', { projectId: projectId.toNumber() });
      refreshData();
    };

    const handleProjectFailed = (projectId) => {
      console.log('项目失败:', { projectId: projectId.toNumber() });
      refreshData();
    };

    const handleFundsClaimed = (projectId, creator, amount) => {
      console.log('资金提取:', { projectId: projectId.toNumber(), creator, amount: amount.toString() });
      refreshData();
    };

    const handleRefundIssued = (projectId, contributor, amount) => {
      console.log('退款发放:', { projectId: projectId.toNumber(), contributor, amount: amount.toString() });
      refreshData();
    };

    // 注册事件监听器
    contract.on('ProjectCreated', handleProjectCreated);
    contract.on('ContributionMade', handleContributionMade);
    contract.on('ProjectSucceeded', handleProjectSucceeded);
    contract.on('ProjectFailed', handleProjectFailed);
    contract.on('FundsClaimed', handleFundsClaimed);
    contract.on('RefundIssued', handleRefundIssued);

    // 清理事件监听器
    return () => {
      contract.removeAllListeners('ProjectCreated');
      contract.removeAllListeners('ContributionMade');
      contract.removeAllListeners('ProjectSucceeded');
      contract.removeAllListeners('ProjectFailed');
      contract.removeAllListeners('FundsClaimed');
      contract.removeAllListeners('RefundIssued');
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
    fetchAllProjects,
    fetchMyProjects,
    fetchMyContributions
  };
};