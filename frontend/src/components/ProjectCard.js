import React, { useState, useEffect } from 'react';
import { formatEther, getRemainingTime, isProjectExpired, formatAddress } from '../utils/web3Utils';
import { ProjectStateText, getProjectMilestones, startMilestoneVote, voteOnMilestone, executeMilestone, checkDeadlineAndFinalize, getRefund, getEarlyBirds } from '../utils/contractUtils';
import { useContract } from '../hooks/useContract';
import ContributeModal from './ContributeModal';
import './ProjectCard.css';

const ProjectCard = ({ project, onContribute, userAddress, myContribution }) => {
  const { contract, refreshData } = useContract();
  const [milestones, setMilestones] = useState([]);
  const [earlyBirds, setEarlyBirds] = useState([]);
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
    setEarlyBirds([]);
    if (contract && projectId) {
      // 获取早期支持者 (无论项目状态如何)
      getEarlyBirds(contract, projectId).then(setEarlyBirds);
      
      // 仅当项目成功时获取里程碑
      if (projectState === 1) {
        getProjectMilestones(contract, projectId).then(setMilestones);
      }
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

  // ==================== 处理发起投票点击事件的函数 ====================
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

  //渲染早期支持者列表的函数
  const renderEarlyBirds = () => {
    // 在访问 .length 之前，先检查 earlyBirds 是否是一个有效的数组
    if (!earlyBirds || earlyBirds.length === 0) {
      return null;
    }

    return (
      <div className="early-bird-list">
        <h5>🚀 早期支持者</h5>
        <ul>
          {earlyBirds.map((birdAddress, index) => (
            <li key={index}>
              🥇 {formatAddress(birdAddress)}
              {userAddress && birdAddress.toLowerCase() === userAddress.toLowerCase() && <strong> (是你!)</strong>}
            </li>
          ))}
        </ul>
      </div>
    );
  };

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
              
              
              {showStartVoteButton && <button onClick={() => handleStartVoteClick(index)} disabled={loadingAction}>发起投票</button>}

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
      {renderEarlyBirds()}
      {renderMilestones()}
      {showContributeModal && <ContributeModal project={project} onContribute={(amount) => onContribute(projectId, amount)} onClose={() => setShowContributeModal(false)} />}
    </div>
  );
};

export default ProjectCard;
/* --- END OF FILE components/ProjectCard.js --- */