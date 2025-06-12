/* --- START OF FILE pages/AllProjects.js --- */

import React from 'react';
import { useContract } from '../hooks/useContract';
import { useWeb3 } from '../hooks/useWeb3';
import ProjectList from '../components/ProjectList';
import { contributeToProject, checkDeadlineAndFinalize, claimFunds, getRefund } from '../utils/contractUtils';
import './PageStyles.css';

const AllProjects = () => {
  const { contract, projects, loading, error, refreshData, myContributions } = useContract();
  const { account } = useWeb3();

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

  const handleContribute = (projectId, amount) => handleAction(
    () => contributeToProject(contract, projectId, amount),
    "捐款成功！感谢您的支持！"
  );
  const handleFinalize = (projectId) => handleAction(
    () => checkDeadlineAndFinalize(contract, projectId),
    "项目结算成功！"
  );
  const handleClaimFunds = (projectId) => handleAction(
    () => claimFunds(contract, projectId),
    "资金提取成功！"
  );
  const handleGetRefund = (projectId) => handleAction(
    () => getRefund(contract, projectId),
    "退款申请成功！"
  );
  
  // 按ID倒序排列，最新的项目在前面
  const sortedProjects = [...projects].sort((a, b) => b.id - a.id);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>所有项目</h1>
        <p>浏览平台上的所有众筹项目，包括正在进行、已成功和已失败的项目。</p>
      </div>

      <ProjectList
        projects={sortedProjects}
        loading={loading}
        error={error}
        emptyMessage={<h3>没有找到任何项目。</h3>}
        onContribute={handleContribute}
        onFinalize={handleFinalize}
        onClaimFunds={handleClaimFunds}
        onGetRefund={handleGetRefund}
        userAddress={account}
        myContributions={myContributions}
      />
    </div>
  );
};

export default AllProjects;

/* --- END OF FILE pages/AllProjects.js --- */