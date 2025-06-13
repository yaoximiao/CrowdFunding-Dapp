/* --- START OF FILE pages/Home.js (修复版) --- */

import React from 'react';
import { Link } from 'react-router-dom';
import { useContract } from '../hooks/useContract';
import { useWeb3 } from '../hooks/useWeb3';
import ProjectList from '../components/ProjectList';
// 确保导入了 checkDeadlineAndFinalize
import { contributeToProject, checkDeadlineAndFinalize } from '../utils/contractUtils'; 
import './PageStyles.css';

const Home = () => {
  const { contract, projects, loading, error, refreshData, myContributions } = useContract();
  const { account, isConnected, connect } = useWeb3();

  const fundraisingProjects = projects
    .filter(p => Number(p.state) === 0)
    .sort((a, b) => b.id - a.id)
    .slice(0, 3);

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

  const handleContribute = (projectId, amount) => handleAction(
    () => contributeToProject(contract, projectId, amount),
    "捐款成功！感谢您的支持！"
  );
  
  const handleFinalize = (projectId) => handleAction(
    () => checkDeadlineAndFinalize(contract, projectId),
    "项目结算成功！"
  );
  // =======================================================================

  return (
    <div className="page-container">
      <div className="hero-section">
        <h1>去中心化众筹平台</h1>
        <p>支持你相信的创意，或者发起你自己的项目。透明、安全、无中间商。</p>
        <div className="hero-actions">
          <Link to="/all-projects" className="hero-btn primary">探索项目</Link>
          <Link to="/my-projects" className="hero-btn secondary">发起项目</Link>
        </div>
        {!isConnected && (
            <button onClick={connect} className="hero-btn connect-wallet">连接钱包以开始</button>
        )}
      </div>

      <div className="section-container">
        <h2 className="section-title">热门项目</h2>
        <ProjectList
          projects={fundraisingProjects}
          loading={loading}
          error={error}
          emptyMessage={<h3>当前没有正在筹款的项目。</h3>}
          onContribute={handleContribute}
          onFinalize={handleFinalize} // <--- 添加 onFinalize prop
          userAddress={account}
          myContributions={myContributions}
        />
      </div>
    </div>
  );
};

export default Home;
/* --- END OF FILE pages/Home.js --- */