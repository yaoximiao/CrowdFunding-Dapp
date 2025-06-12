/* --- START OF FILE pages/MyContributions.js --- */

import React from 'react';
import { useContract } from '../hooks/useContract';
import { useWeb3 } from '../hooks/useWeb3';
import ProjectList from '../components/ProjectList';
import { getRefund } from '../utils/contractUtils';
import './PageStyles.css';

const MyContributions = () => {
  const { contract, myContributions, loading, error, refreshData } = useContract();
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

  const handleGetRefund = (projectId) => handleAction(
    () => getRefund(contract, projectId),
    "退款申请成功！"
  );
  
  const sortedProjects = [...myContributions].sort((a, b) => b.id - a.id);

  if (!isConnected) {
    return (
        <div className="page-container">
            <div className="list-message">
                <h3>请先连接钱包</h3>
                <p>连接钱包后才能查看您的捐款记录。</p>
            </div>
        </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>我的捐款</h1>
        <p>查看您支持过的所有项目及其当前状态。</p>
      </div>

      <ProjectList
        projects={sortedProjects}
        loading={loading}
        error={error}
        emptyMessage={<h3>您还没有为任何项目捐款。</h3>}
        onGetRefund={handleGetRefund}
        userAddress={account}
      />
    </div>
  );
};

export default MyContributions;

/* --- END OF FILE pages/MyContributions.js --- */