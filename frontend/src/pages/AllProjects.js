/* --- START OF FILE pages/AllProjects.js (修复版) --- */

import React from 'react';
import { useContract } from '../hooks/useContract';
import { useWeb3 } from '../hooks/useWeb3';
import ProjectList from '../components/ProjectList';
// 确保导入了所有需要的函数
import { contributeToProject, checkDeadlineAndFinalize, getRefund } from '../utils/contractUtils';
import './PageStyles.css';

const AllProjects = () => {
  const { contract, projects, loading, error, refreshData, myContributions } = useContract();
  const { account } = useWeb3();

  // ==================== 添加 handleAction 和相关函数 ====================
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

  const handleGetRefund = (projectId) => handleAction(
      () => getRefund(contract, projectId),
      "退款申请成功！"
  );
  // ==================================================================

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
        onFinalize={handleFinalize}     // <--- 添加 onFinalize prop
        onGetRefund={handleGetRefund}   // <--- 添加 onGetRefund prop
        userAddress={account}
        myContributions={myContributions}
      />
    </div>
  );
};

export default AllProjects;
/* --- END OF FILE pages/AllProjects.js --- */