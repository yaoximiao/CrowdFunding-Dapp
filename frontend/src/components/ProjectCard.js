// import React, { useState } from 'react';
// import { formatEther, getRemainingTime, isProjectExpired } from '../utils/web3Utils';
// import { ProjectStateText } from '../utils/contractUtils';
// import ContributeModal from './ContributeModal';
// import './ProjectCard.css';

// const ProjectCard = ({ 
//   project, 
//   showActions = true, 
//   onContribute, 
//   onClaimFunds, 
//   onGetRefund, 
//   onFinalize,
//   userAddress,
//   myContribution 
// }) => {
//   const [showContributeModal, setShowContributeModal] = useState(false);
//   const [loading, setLoading] = useState(false);

//   const isCreator = project.creator.toLowerCase() === userAddress?.toLowerCase();
//   const isExpired = isProjectExpired(project.deadline);


//   // ==================== 添加日志开始 ====================
//   // 为了方便调试，我们只在开发环境中打印日志
//   if (process.env.NODE_ENV === 'development') {
//     console.log(`--- 调试日志: ProjectCard (ID: ${project.id}, Name: "${project.name}") ---`);
//     console.log(`项目创建者 (Creator):   `, project.creator);
//     console.log(`当前用户地址 (userAddress):`, userAddress);
//     console.log(`是否为创建者 (isCreator):  `, isCreator);
//     console.log(`项目状态 (state):         `, project.state, `(${ProjectStateText[project.state]})`);
//     console.log(`是否已过期 (isExpired):   `, isExpired);
//     console.log(`是否显示操作 (showActions):`, showActions);
//     console.log('----------------------------------------------------');
//   }
//   // ===================== 添加日志结束 =====================


//   const progressPercentage = project.goalAmount > 0n 
//     ? Math.min((parseFloat(formatEther(project.raisedAmount)) / parseFloat(formatEther(project.goalAmount))) * 100, 100)
//     : 0;

//   const handleContribute = async (amount) => {
//     setLoading(true);
//     try {
//       await onContribute(project.id, amount);
//       setShowContributeModal(false);
//     } catch (error) {
//       console.error('捐款失败:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleClaimFunds = async () => {
//     setLoading(true);
//     try {
//       await onClaimFunds(project.id);
//     } catch (error) {
//       console.error('提取资金失败:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleGetRefund = async () => {
//     setLoading(true);
//     try {
//       await onGetRefund(project.id);
//     } catch (error) {
//       console.error('申请退款失败:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleFinalize = async () => {
//     setLoading(true);
//     try {
//       await onFinalize(project.id);
//     } catch (error) {
//       console.error('完成项目失败:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getStatusColor = (state) => {
//     switch (state) {
//       case 0: return '#2196F3'; // 筹款中 - 蓝色
//       case 1: return '#4CAF50'; // 成功 - 绿色
//       case 2: return '#f44336'; // 失败 - 红色
//       case 3: return '#FF9800'; // 已支付 - 橙色
//       case 4: return '#9C27B0'; // 已退款 - 紫色
//       default: return '#757575'; // 默认 - 灰色
//     }
//   };

//   return (
//     <div className="project-card">
//       <div className="project-header">
//         <h3 className="project-title">{project.name}</h3>
//         <span 
//           className="project-status"
//           style={{ backgroundColor: getStatusColor(project.state) }}
//         >
//           {ProjectStateText[project.state]}
//         </span>
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
//         {myContribution && (
//           <div className="stat-item">
//             <span className="stat-label">我的捐款:</span>
//             <span className="stat-value contribution">{formatEther(myContribution)} ETH</span>
//           </div>
//         )}
//       </div>

//       <div className="progress-container">
//         <div className="progress-bar">
//           <div 
//             className="progress-fill"
//             style={{ width: `${progressPercentage}%` }}
//           ></div>
//         </div>
//         <span className="progress-text">{progressPercentage.toFixed(1)}%</span>
//       </div>

//       {showActions && (
//       <div className="project-actions">
//           {/* 筹款中 & 未过期 & 非创建者 -> 显示 "支持项目" 按钮 */}
//           {project.state === 0 && !isExpired && !isCreator && (
//           <button 
//               className="btn-contribute"
//               onClick={() => setShowContributeModal(true)}
//               disabled={loading}
//           >
//               支持项目
//           </button>
//           )}

//           {/* 筹款中 & 已过期 -> 显示 "结算项目" 按钮 */}
//           {project.state === 0 && isExpired && (
//           <button 
//               className="btn-finalize"
//               onClick={handleFinalize}
//               disabled={loading}
//           >
//               {loading ? '处理中...' : '结算项目'}
//           </button>
//           )}

//           {/* 项目成功 & 是创建者 -> 显示 "提取资金" 按钮 */}
//           {project.state === 1 && isCreator && (
//           <button 
//               className="btn-claim"
//               onClick={handleClaimFunds}
//               disabled={loading}
//           >
//               {loading ? '提取中...' : '提取资金'}
//           </button>
//           )}

//           {/* 项目失败 & 非创建者 & 有捐款 -> 显示 "申请退款" 按钮 */}
//           {project.state === 2 && !isCreator && myContribution && myContribution > 0n && (
//           <button 
//               className="btn-refund"
//               onClick={handleGetRefund}
//               disabled={loading}
//           >
//               {loading ? '退款中...' : '申请退款'}
//           </button>
//           )}
//       </div>
//       )}

//       {/* 捐款模态框 */}
//       {showContributeModal && (
//         <ContributeModal
//           project={project}
//           onContribute={handleContribute}
//           onClose={() => setShowContributeModal(false)}
//           loading={loading}
//         />
//       )}
//     </div>
//   );
// };

// export default ProjectCard;




// frontend/src/components/ProjectCard.js (最终修复版)

import React, { useState } from 'react';
import { formatEther, getRemainingTime, isProjectExpired } from '../utils/web3Utils';
import { ProjectStateText } from '../utils/contractUtils';
import ContributeModal from './ContributeModal';
import './ProjectCard.css';

const ProjectCard = ({
  project,
  showActions = true,
  onContribute,
  onClaimFunds,
  onGetRefund,
  onFinalize,
  userAddress,
  myContribution
}) => {
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // ==================== 1. 计算所有状态 ====================
  const isCreator = userAddress ? project.creator.toLowerCase() === userAddress.toLowerCase() : false;
  const isExpired = isProjectExpired(project.deadline);
  const hasContributed = myContribution && myContribution > 0n;

  // 计算每个按钮是否应该显示
  const canContribute = showActions && Number(project.state) === 0 && !isExpired && !isCreator;
  const canFinalize = showActions && Number(project.state) === 0 && isExpired;
  const canClaim = showActions && Number(project.state) === 1 && isCreator;
  const canRefund = showActions && Number(project.state) === 2 && !isCreator && hasContributed;
  
  // ==================== 2. 添加最终调试日志 ====================
  if (process.env.NODE_ENV === 'development') {
    console.log(`--- 最终调试: ProjectCard (ID: ${project.id}) ---`);
    console.log({
      userAddress,
      creator: project.creator,
      isCreator,
      projectState: project.state,
      isExpired,
      hasContributed,
      canContribute,
      canFinalize,
      canClaim,
      canRefund,
    });
    console.log('------------------------------------------');
  }

  // ==================== 3. 简化进度条计算 ====================
  const progressPercentage = project.goalAmount > 0n
    ? Math.min((parseFloat(formatEther(project.raisedAmount)) / parseFloat(formatEther(project.goalAmount))) * 100, 100)
    : 0;
  
  // ... (省略所有 handle 函数，它们不变)
  const handleContribute = async (amount) => { setLoading(true); try { await onContribute(project.id, amount); setShowContributeModal(false); } catch (error) { console.error('捐款失败:', error); } finally { setLoading(false); } };
  const handleClaimFunds = async () => { setLoading(true); try { await onClaimFunds(project.id); } catch (error) { console.error('提取资金失败:', error); } finally { setLoading(false); } };
  const handleGetRefund = async () => { setLoading(true); try { await onGetRefund(project.id); } catch (error) { console.error('申请退款失败:', error); } finally { setLoading(false); } };
  const handleFinalize = async () => { setLoading(true); try { await onFinalize(project.id); } catch (error) { console.error('完成项目失败:', error); } finally { setLoading(false); } };
  const getStatusColor = (state) => { switch (state) { case 0: return '#2196F3'; case 1: return '#4CAF50'; case 2: return '#f44336'; case 3: return '#FF9800'; case 4: return '#9C27B0'; default: return '#757575'; } };

  return (
    <div className="project-card">
      {/* 项目头部 */}
      <div className="project-header">
        <h3 className="project-title">{project.name}</h3>
        <span className="project-status" style={{ backgroundColor: getStatusColor(project.state) }}>
          {ProjectStateText[project.state]}
        </span>
      </div>

      <p className="project-description">{project.description}</p>

      {/* 项目统计 */}
      <div className="project-stats">
        <div className="stat-item"><span className="stat-label">筹款目标:</span><span className="stat-value">{formatEther(project.goalAmount)} ETH</span></div>
        <div className="stat-item"><span className="stat-label">已筹集:</span><span className="stat-value">{formatEther(project.raisedAmount)} ETH</span></div>
        <div className="stat-item"><span className="stat-label">截止时间:</span><span className="stat-value">{getRemainingTime(project.deadline)}</span></div>
        {hasContributed && (
          <div className="stat-item"><span className="stat-label">我的捐款:</span><span className="stat-value contribution">{formatEther(myContribution)} ETH</span></div>
        )}
      </div>

      {/* 进度条 */}
      <div className="progress-container">
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${progressPercentage}%` }}></div></div>
        <span className="progress-text">{progressPercentage.toFixed(1)}%</span>
      </div>

      {/* ==================== 4. 使用简化的JSX渲染按钮 ==================== */}
      <div className="project-actions">
        {canContribute && (
          <button className="btn-contribute" onClick={() => setShowContributeModal(true)} disabled={loading}>
            支持项目
          </button>
        )}

        {canFinalize && (
          <button className="btn-finalize" onClick={handleFinalize} disabled={loading}>
            {loading ? '处理中...' : '结算项目'}
          </button>
        )}

        {canClaim && (
          <button className="btn-claim" onClick={handleClaimFunds} disabled={loading}>
            {loading ? '提取中...' : '提取资金'}
          </button>
        )}

        {canRefund && (
          <button className="btn-refund" onClick={handleGetRefund} disabled={loading}>
            {loading ? '退款中...' : '申请退款'}
          </button>
        )}
      </div>

      {/* 捐款模态框 */}
      {showContributeModal && (
        <ContributeModal project={project} onContribute={handleContribute} onClose={() => setShowContributeModal(false)} loading={loading} />
      )}
    </div>
  );
};

export default ProjectCard;