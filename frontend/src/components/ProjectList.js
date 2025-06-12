/* --- START OF FILE components/ProjectList.js --- */

import React from 'react';
import ProjectCard from './ProjectCard';
import './ProjectList.css';

const ProjectList = ({
  projects,
  loading,
  error,
  emptyMessage,
  onContribute,
  onClaimFunds,
  onGetRefund,
  onFinalize,
  userAddress,
  myContributions = [] // 默认空数组，防止undefined
}) => {
  if (loading) {
    return <div className="list-message"><h3>加载中...</h3><p>正在从区块链获取项目数据。</p></div>;
  }

  if (error) {
    return <div className="list-message"><h3>出错了</h3><p>{error}</p></div>;
  }

  if (!projects || projects.length === 0) {
    return <div className="list-message">{emptyMessage}</div>;
  }

  // 创建一个contribution的map方便快速查找
  const contributionMap = new Map();
  myContributions.forEach(p => {
    contributionMap.set(p.id, p.myContribution);
  });

  return (
    <div className="project-list-container">
      <div className="project-list-grid">
        {projects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            onContribute={onContribute}
            onClaimFunds={onClaimFunds}
            onGetRefund={onGetRefund}
            onFinalize={onFinalize}
            userAddress={userAddress}
            // 查找并传递该项目的个人捐款额
            myContribution={project.myContribution || contributionMap.get(project.id)}
            showActions={true}
          />
        ))}
      </div>
    </div>
  );
};

export default ProjectList;

/* --- END OF FILE components/ProjectList.js --- */