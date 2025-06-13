// /* --- START OF FILE components/ProjectCard.js (修复版本) --- */

// import React, { useState, useEffect } from 'react';
// import { formatEther, getRemainingTime, isProjectExpired } from '../utils/web3Utils';
// import { ProjectStateText, getProjectMilestones, startMilestoneVote, voteOnMilestone, executeMilestone, debugContractInfo, debugMilestoneFunction } from '../utils/contractUtils';
// import { useContract } from '../hooks/useContract';
// import ContributeModal from './ContributeModal';
// import './ProjectCard.css';

// const ProjectCard = ({
//   project,
//   onContribute,
//   onFinalize,
//   onGetRefund,
//   userAddress,
//   myContribution
// }) => {
//   const [showContributeModal, setShowContributeModal] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [milestones, setMilestones] = useState([]);
//   const [milestonesLoading, setMilestonesLoading] = useState(false);
//   const [milestonesError, setMilestonesError] = useState(null);
//   const { contract, refreshData } = useContract(); // 获取合约实例和刷新函数

//   const isCreator = userAddress ? project.creator.toLowerCase() === userAddress.toLowerCase() : false;
//   const projectState = Number(project.state);
//   const isExpired = isProjectExpired(project.deadline);

//   // 当项目成功时，获取里程碑数据
//   useEffect(() => {
//     const fetchMilestones = async () => {
//       // 重置状态
//       setMilestones([]);
//       setMilestonesError(null);
      
//       // 只有在项目成功且有合约实例时才获取里程碑
//       if (!contract || !project.id || projectState !== 1) {
//         console.log('跳过里程碑获取:', { 
//           hasContract: !!contract, 
//           projectId: project.id, 
//           projectState,
//           isSuccessful: projectState === 1 
//         });
//         return;
//       }

//       setMilestonesLoading(true);
//       console.log(`项目 ${project.id} 成功，正在获取里程碑...`);
      
//       try {
//         // 在开发环境中运行调试
//         if (process.env.NODE_ENV === 'development') {
//           await debugContractInfo(contract);
//           await debugMilestoneFunction(contract, project.id);
//         }
        
//         // 添加延迟以确保合约状态已更新
//         await new Promise(resolve => setTimeout(resolve, 500));
        
//         const data = await getProjectMilestones(contract, project.id);
//         console.log(`获取到里程碑数据:`, data);
//         setMilestones(data || []);
//       } catch (err) {
//         console.error("获取里程碑时发生错误:", err);
//         setMilestonesError(err.message || '获取里程碑失败');
        
//         // 如果是合约调用错误，可能是里程碑功能未初始化
//         if (err.message && err.message.includes('missing revert data')) {
//           setMilestonesError('里程碑功能可能未在此项目中初始化');
//         }
//       } finally {
//         setMilestonesLoading(false);
//       }
//     };

//     fetchMilestones();
//   }, [contract, project.id, projectState, refreshData]);

//   // 统一的 action handler
//   const handleMilestoneAction = async (action, actionName) => {
//     if (!contract) {
//       alert('合约未连接');
//       return;
//     }

//     setLoading(true);
//     try {
//       console.log(`执行操作: ${actionName}`);
//       await action();
//       alert('操作成功！');
//       // 刷新数据
//       await refreshData();
//       // 重新获取里程碑数据
//       setTimeout(() => {
//         getProjectMilestones(contract, project.id)
//           .then(data => setMilestones(data || []))
//           .catch(err => console.error('刷新里程碑失败:', err));
//       }, 1000);
//     } catch (error) {
//       console.error(`${actionName} 失败:`, error);
//       const errorMessage = error.reason || error.message || '操作失败';
//       alert(`操作失败: ${errorMessage}`);
//     } finally {
//       setLoading(false);
//     }
//   };
  
//   const progressPercentage = project.goalAmount > 0n
//     ? Math.min((parseFloat(formatEther(project.raisedAmount)) / parseFloat(formatEther(project.goalAmount))) * 100, 100)
//     : 0;

//   // 里程碑渲染逻辑
//   const renderMilestones = () => {
//     if (milestonesLoading) {
//       return (
//         <div className="milestone-list">
//           <h4>里程碑投票</h4>
//           <p>正在加载里程碑信息...</p>
//         </div>
//       );
//     }

//     if (milestonesError) {
//       return (
//         <div className="milestone-list">
//           <h4>里程碑投票</h4>
//           <p className="error-message">加载失败: {milestonesError}</p>
//           <button 
//             onClick={() => window.location.reload()} 
//             className="btn-retry"
//           >
//             重试
//           </button>
//         </div>
//       );
//     }

//     if (milestones.length === 0) {
//       return (
//         <div className="milestone-list">
//           <h4>里程碑投票</h4>
//           <p>暂无里程碑数据</p>
//         </div>
//       );
//     }

//     return (
//       <div className="milestone-list">
//         <h4>里程碑投票</h4>
//         {milestones.map((ms, index) => {
//           const voteActive = ms.voteDeadline > 0 && ms.voteDeadline * 1000 > Date.now();
//           const voteEnded = ms.voteDeadline > 0 && ms.voteDeadline * 1000 <= Date.now();
//           const canStartVote = !voteActive && !voteEnded && isCreator;
          
//           console.log(`里程碑 ${index}:`, {
//             voteActive,
//             voteEnded,
//             canStartVote,
//             isCreator,
//             myContribution: myContribution.toString(),
//             voteDeadline: ms.voteDeadline
//           });

//           return (
//             <div key={index} className="milestone-item">
//               <p>{ms.description} - <strong>{formatEther(ms.releaseAmount)} ETH</strong></p>
//               {ms.executed ? (
//                 <span className="status-executed">已执行</span>
//               ) : (
//                 <div>
//                   {/* 捐款人的投票按钮 */}
//                   {voteActive && myContribution > 0n && (
//                     <div className="vote-actions">
//                       <button 
//                         onClick={() => handleMilestoneAction(
//                           () => voteOnMilestone(contract, project.id, index, true),
//                           '投票同意'
//                         )} 
//                         disabled={loading}
//                         className="btn-vote-yes"
//                       >
//                         👍 同意
//                       </button>
//                       <button 
//                         onClick={() => handleMilestoneAction(
//                           () => voteOnMilestone(contract, project.id, index, false),
//                           '投票反对'
//                         )} 
//                         disabled={loading}
//                         className="btn-vote-no"
//                       >
//                         👎 反对
//                       </button>
//                     </div>
//                   )}
                  
//                   {/* 任何人的执行按钮 */}
//                   {voteEnded && !ms.executed && (
//                     <button 
//                       onClick={() => handleMilestoneAction(
//                         () => executeMilestone(contract, project.id, index),
//                         '执行投票结果'
//                       )} 
//                       disabled={loading}
//                       className="btn-execute"
//                     >
//                       执行投票结果
//                     </button>
//                   )}
                  
//                   {/* 创建者的发起投票按钮 */}
//                   {canStartVote && (
//                     <button 
//                       onClick={() => handleMilestoneAction(
//                         () => startMilestoneVote(contract, project.id, index, 7 * 24 * 60 * 60),
//                         '发起投票'
//                       )} 
//                       disabled={loading}
//                       className="btn-start-vote"
//                     >
//                       发起投票 (7天)
//                     </button>
//                   )}
                  
//                   {/* 投票中的提示 */}
//                   {voteActive && <p className="status-voting">投票进行中...</p>}
                  
//                   {/* 调试信息 (生产环境中应删除) */}
//                   {process.env.NODE_ENV === 'development' && (
//                     <div className="debug-info" style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
//                       Debug: voteActive={voteActive.toString()}, voteEnded={voteEnded.toString()}, 
//                       canStartVote={canStartVote.toString()}, myContribution={myContribution.toString()}
//                     </div>
//                   )}
//                 </div>
//               )}
//               <div className="vote-stats">
//                 <span>同意: {formatEther(ms.yesVotes)} ETH</span>
//                 <span>反对: {formatEther(ms.noVotes)} ETH</span>
//                 {ms.voteDeadline > 0 && (
//                   <span>截止: {new Date(ms.voteDeadline * 1000).toLocaleString()}</span>
//                 )}
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     );
//   };

//   return (
//     <div className="project-card">
//       <div className="project-header">
//         <h3 className="project-title">{project.name}</h3>
//         <span className="project-status">{ProjectStateText[projectState]}</span>
//       </div>
//       <p className="project-description">{project.description}</p>
      
//       <div className="project-stats">
//         <div className="stat-item">
//           <span className="stat-label">筹款目标:</span>
//           <span className="stat-value">{formatEther(project.goalAmount)} ETH</span>
//         </div>
//         <div className="stat-item">
//           <span className="stat-label">已筹集:</span>
//           <span className="stat-value">{formatEther(project.raisedAmount)} ETH</span>
//         </div>
//         <div className="stat-item">
//           <span className="stat-label">截止时间:</span>
//           <span className="stat-value">{getRemainingTime(project.deadline)}</span>
//         </div>
//         {myContribution > 0n && (
//           <div className="stat-item">
//             <span className="stat-label">我的捐款:</span>
//             <span className="stat-value contribution">{formatEther(myContribution)} ETH</span>
//           </div>
//         )}
//       </div>

//       <div className="progress-container">
//         <div className="progress-bar">
//           <div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div>
//         </div>
//         <span className="progress-text">{progressPercentage.toFixed(1)}%</span>
//       </div>

//       {/* 基本操作按钮区域 */}
//       <div className="project-actions">
//         {projectState === 0 && !isExpired && !isCreator && (
//           <button 
//             className="btn-contribute" 
//             onClick={() => setShowContributeModal(true)}
//           >
//             支持项目
//           </button>
//         )}
//         {projectState === 0 && isExpired && (
//           <button 
//             className="btn-finalize" 
//             onClick={() => onFinalize(project.id)}
//           >
//             结算项目
//           </button>
//         )}
//         {projectState === 2 && myContribution > 0n && (
//           <button 
//             className="btn-refund" 
//             onClick={() => onGetRefund(project.id)}
//           >
//             申请退款
//           </button>
//         )}
//       </div>

//       {/* 里程碑区域，只在项目成功后显示 */}
//       {projectState === 1 && renderMilestones()}

//       {showContributeModal && (
//         <ContributeModal 
//           project={project} 
//           onContribute={(amount) => onContribute(project.id, amount)} 
//           onClose={() => setShowContributeModal(false)} 
//         />
//       )}
//     </div>
//   );
// };

// export default ProjectCard;
// /* --- END OF FILE components/ProjectCard.js --- */
/* --- START OF FILE components/ProjectCard.js (最终防御性渲染版) --- */

/* --- START OF FILE components/ProjectCard.js (带自定义投票时长功能) --- */

import React, { useState, useEffect } from 'react';
import { formatEther, getRemainingTime, isProjectExpired } from '../utils/web3Utils';
import { ProjectStateText, getProjectMilestones, startMilestoneVote, voteOnMilestone, executeMilestone, checkDeadlineAndFinalize, getRefund } from '../utils/contractUtils';
import { useContract } from '../hooks/useContract';
import ContributeModal from './ContributeModal';
import './ProjectCard.css';

const ProjectCard = ({ project, onContribute, userAddress, myContribution }) => {
  const { contract, refreshData } = useContract();
  const [milestones, setMilestones] = useState([]);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);

  const {
    id: projectId,
    creator,
    name,
    description,
    goalAmount = 0n,
    deadline = 0,
    raisedAmount = 0n,
    state = 0
  } = project || {};

  const isCreator = userAddress && creator ? creator.toLowerCase() === userAddress.toLowerCase() : false;
  const projectState = Number(state);
  const isExpired = isProjectExpired(deadline);
  const hasContributed = myContribution && myContribution > 0n;

  useEffect(() => {
    setMilestones([]);
    if (contract && projectId && projectState === 1) {
      getProjectMilestones(contract, projectId).then(setMilestones);
    }
  }, [contract, projectId, projectState, refreshData]);

  const handleAction = async (action) => {
    setLoadingAction(true);
    try {
      await action();
      alert('操作成功！');
      refreshData();
    } catch (error) {
      alert(`操作失败: ${error.reason || error.message || '未知错误'}`);
    } finally {
      setLoadingAction(false);
    }
  };

  // ==================== 新增: 处理发起投票点击事件的函数 ====================
  const handleStartVoteClick = (milestoneIndex) => {
    const durationDaysStr = window.prompt("请输入投票持续天数 (方便测试，可输入小数，如 0.01):", "7");

    if (durationDaysStr === null) { // 用户点击了取消
      return;
    }

    const durationDays = parseFloat(durationDaysStr);

    if (isNaN(durationDays) || durationDays <= 0) {
      alert("请输入一个有效的正数作为天数。");
      return;
    }

    // 将天数（可以是小数）转换为秒
    const durationSeconds = Math.round(durationDays * 24 * 60 * 60);

    if (durationSeconds === 0) {
        alert("持续时间过短，请输入更长的时间。");
        return;
    }

    handleAction(() => startMilestoneVote(contract, projectId, milestoneIndex, durationSeconds));
  };
  // =======================================================================


  const progressPercentage = goalAmount > 0n
    ? Math.min((parseFloat(formatEther(raisedAmount)) / parseFloat(formatEther(goalAmount))) * 100, 100)
    : 0;

  const renderMainActions = () => {
    switch (projectState) {
      case 0:
        if (isExpired) return <button className="btn-finalize" onClick={() => handleAction(() => checkDeadlineAndFinalize(contract, projectId))} disabled={loadingAction}>结算项目</button>;
        if (!isCreator) return <button className="btn-contribute" onClick={() => setShowContributeModal(true)}>支持项目</button>;
        return null;
      case 2:
        if (hasContributed) return <button className="btn-refund" onClick={() => handleAction(() => getRefund(contract, projectId))} disabled={loadingAction}>申请退款</button>;
        return null;
      default: return null;
    }
  };

  const renderMilestones = () => {
    if (projectState !== 1) return null;
    return (
      <div className="milestone-list">
        <h4>里程碑投票</h4>
        {milestones.length === 0 ? <p>正在加载或没有里程碑...</p> : milestones.map((ms, index) => {
          const now = Date.now() / 1000;
          const voteActive = ms.voteDeadline > 0 && now < ms.voteDeadline;
          const voteEnded = ms.voteDeadline > 0 && now >= ms.voteDeadline;
          const showStartVoteButton = isCreator && !ms.executed && !voteActive && !voteEnded;
          const showVoteButtons = hasContributed && !isCreator && voteActive;
          const showExecuteButton = !ms.executed && voteEnded;

          return (
            <div key={index} className="milestone-item">
              <p>{ms.description} - <strong>{formatEther(ms.releaseAmount)} ETH</strong></p>
              
              {/* ==================== 修改: 调用新的 handleStartVoteClick 函数 ==================== */}
              {showStartVoteButton && <button onClick={() => handleStartVoteClick(index)} disabled={loadingAction}>发起投票</button>}
              {/* =============================================================================== */}

              {showVoteButtons && <div className="vote-actions"><button onClick={() => handleAction(() => voteOnMilestone(contract, projectId, index, true))} disabled={loadingAction}>👍 同意</button><button onClick={() => handleAction(() => voteOnMilestone(contract, projectId, index, false))} disabled={loadingAction}>👎 反对</button></div>}
              {showExecuteButton && <button onClick={() => handleAction(() => executeMilestone(contract, projectId, index))} disabled={loadingAction}>执行投票结果</button>}
              {ms.executed && <span className="status-executed">已执行</span>}
              {voteActive && <p className="status-voting">投票进行中... 截止于: {new Date(ms.voteDeadline * 1000).toLocaleString()}</p>}
              <div className="vote-stats"><span>同意: {formatEther(ms.yesVotes)}</span><span>反对: {formatEther(ms.noVotes)}</span></div>
            </div>
          );
        })}
      </div>
    );
  };

  if (!projectId) {
    return null;
  }

  return (
    <div className="project-card">
      <div className="project-header">
        <h3 className="project-title">{name}</h3>
        <span className="project-status">{ProjectStateText[projectState]}</span>
      </div>
      <p className="project-description">{description}</p>
      <div className="project-stats">
        <div className="stat-item"><span className="stat-label">筹款目标:</span><span className="stat-value">{formatEther(goalAmount)} ETH</span></div>
        <div className="stat-item"><span className="stat-label">已筹集:</span><span className="stat-value">{formatEther(raisedAmount)} ETH</span></div>
        <div className="stat-item"><span className="stat-label">截止时间:</span><span className="stat-value">{getRemainingTime(deadline)}</span></div>
        {hasContributed && (<div className="stat-item"><span className="stat-label">我的捐款:</span><span className="stat-value contribution">{formatEther(myContribution)} ETH</span></div>)}
      </div>
      <div className="progress-container">
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div></div>
        <span className="progress-text">{progressPercentage.toFixed(1)}%</span>
      </div>
      <div className="project-actions">{renderMainActions()}</div>
      {renderMilestones()}
      {showContributeModal && <ContributeModal project={project} onContribute={(amount) => onContribute(projectId, amount)} onClose={() => setShowContributeModal(false)} />}
    </div>
  );
};

export default ProjectCard;
/* --- END OF FILE components/ProjectCard.js --- */