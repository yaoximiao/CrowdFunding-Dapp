/* --- START OF FILE pages/MyProjects.js --- */

import React from 'react';
import { useContract } from '../hooks/useContract';
import { useWeb3 } from '../hooks/useWeb3';
import ProjectList from '../components/ProjectList';
import CreateProject from '../components/CreateProject';
import { checkDeadlineAndFinalize, claimFunds } from '../utils/contractUtils';
import './PageStyles.css';

const MyProjects = () => {
  const { contract, myProjects, loading, error, refreshData } = useContract();
  const { account, isConnected } = useWeb3();

  const handleAction = async (action, successMessage) => {
    try {
      await action();
      alert(successMessage);
      refreshData();
    } catch (err) {
      console.error("操作失败:", err);
      alert(`操作失败: ${err.reason || err.message}`);
    }
  };

  const handleFinalize = (projectId) => handleAction(
    () => checkDeadlineAndFinalize(contract, projectId),
    "项目结算成功！"
  );
  const handleClaimFunds = (projectId) => handleAction(
    () => claimFunds(contract, projectId),
    "资金提取成功！"
  );
  
  const sortedProjects = [...myProjects].sort((a, b) => b.id - a.id);

  if (!isConnected) {
    return (
        <div className="page-container">
            <div className="list-message">
                <h3>请先连接钱包</h3>
                <p>连接钱包后才能查看您创建的项目。</p>
            </div>
        </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>我的项目</h1>
        <p>在这里管理您发起的众筹项目。</p>
      </div>

      <CreateProject onProjectCreated={refreshData} />

      <div className="section-container">
        <h2 className="section-title">我发起的项目列表</h2>
        <ProjectList
          projects={sortedProjects}
          loading={loading}
          error={error}
          emptyMessage={<h3>您还没有创建任何项目。</h3>}
          onFinalize={handleFinalize}
          onClaimFunds={handleClaimFunds}
          userAddress={account}
        />
      </div>
    </div>
  );
};

export default MyProjects;

/* --- END OF FILE pages/MyProjects.js --- */