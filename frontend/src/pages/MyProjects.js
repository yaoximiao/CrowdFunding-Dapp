/* --- START OF FILE pages/MyProjects.js (修复版) --- */

import React from 'react';
import { useContract } from '../hooks/useContract';
import { useWeb3 } from '../hooks/useWeb3';
import ProjectList from '../components/ProjectList';
import CreateProject from '../components/CreateProject';
// 确保导入了 checkDeadlineAndFinalize
import { checkDeadlineAndFinalize } from '../utils/contractUtils';
import './PageStyles.css';

const MyProjects = () => {
  const { contract, myProjects, loading, error, refreshData } = useContract();
  const { account, isConnected } = useWeb3();

  // ==================== 添加 handleAction 和 handleFinalize ====================
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
  // =======================================================================
  
  const sortedProjects = [...myProjects].sort((a, b) => b.id - a.id);

  if (!isConnected) {
    // ...
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>我的项目</h1>
        <p>在这里管理您发起的众筹项目，并发起里程碑投票。</p>
      </div>

      <CreateProject onProjectCreated={refreshData} />

      <div className="section-container">
        <h2 className="section-title">我发起的项目列表</h2>
        <ProjectList
          projects={sortedProjects}
          loading={loading}
          error={error}
          emptyMessage={<h3>您还没有创建任何项目。</h3>}
          onFinalize={handleFinalize} // <--- 添加 onFinalize prop
          userAddress={account}
        />
      </div>
    </div>
  );
};

export default MyProjects;
/* --- END OF FILE pages/MyProjects.js --- */