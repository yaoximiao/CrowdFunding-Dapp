/* --- START OF FILE pages/MyContributions.js (修复版) --- */

import React from 'react';
import { useContract } from '../hooks/useContract';
import { useWeb3 } from '../hooks/useWeb3';
import ProjectList from '../components/ProjectList';
// 确保导入了所有需要的函数
import { getRefund, checkDeadlineAndFinalize } from '../utils/contractUtils';
import './PageStyles.css';

const MyContributions = () => {
  const { contract, myContributions, loading, error, refreshData } = useContract();
  const { account, isConnected } = useWeb3();

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

  const handleGetRefund = (projectId) => handleAction(
    () => getRefund(contract, projectId),
    "退款申请成功！"
  );

  const handleFinalize = (projectId) => handleAction(
    () => checkDeadlineAndFinalize(contract, projectId),
    "项目结算成功！"
  );
  // ==================================================================

  const sortedProjects = [...myContributions].sort((a, b) => b.id - a.id);

  if (!isConnected) {
    // ...
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>我的捐款</h1>
        <p>查看您支持过的所有项目，并参与里程碑投票。</p>
      </div>

      <ProjectList
        projects={sortedProjects}
        loading={loading}
        error={error}
        emptyMessage={<h3>您还没有为任何项目捐款。</h3>}
        onFinalize={handleFinalize}   // <--- 添加 onFinalize prop
        onGetRefund={handleGetRefund} // <--- 添加 onGetRefund prop
        userAddress={account}
        myContributions={myContributions} 
      />
    </div>
  );
};

export default MyContributions;
/* --- END OF FILE pages/MyContributions.js --- */