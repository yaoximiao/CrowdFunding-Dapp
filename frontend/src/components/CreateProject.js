/* --- START OF FILE components/CreateProject.js --- */

import React, { useState } from 'react';
import { useContract } from '../hooks/useContract';
import { createProjectWithMilestones } from '../utils/contractUtils'; 
import './CreateProject.css';

const CreateProject = ({ onProjectCreated }) => {
  const { contract, refreshData } = useContract();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  // 新增: 里程碑状态
  const [milestones, setMilestones] = useState([{ description: '', releaseAmount: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getMinDeadline = () => {
    const today = new Date();
    today.setTime(today.getTime() + 1 * 60 * 1000);
    return today.toISOString().slice(0, 16);
  };

  // 里程碑表单处理
  const handleMilestoneChange = (index, event) => {
    const values = [...milestones];
    values[index][event.target.name] = event.target.value;
    setMilestones(values);
  };

  const handleAddMilestone = () => {
    setMilestones([...milestones, { description: '', releaseAmount: '' }]);
  };

  const handleRemoveMilestone = (index) => {
    const values = [...milestones];
    values.splice(index, 1);
    setMilestones(values);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 客户端校验
    const totalMilestoneAmount = milestones.reduce((acc, ms) => acc + (parseFloat(ms.releaseAmount) || 0), 0);
    if (totalMilestoneAmount > parseFloat(goalAmount)) {
      setError('所有里程碑的总金额不能超过筹款目标！');
      return;
    }
    if (milestones.some(ms => !ms.description || !ms.releaseAmount)) {
        setError('所有里程碑都必须填写描述和金额。');
        return;
    }

    setLoading(true);
    try {
      const milestoneDescriptions = milestones.map(ms => ms.description);
      const milestoneReleaseAmounts = milestones.map(ms => ms.releaseAmount);
      
      await createProjectWithMilestones(
        contract, name, description, goalAmount, new Date(deadline), 
        milestoneDescriptions, milestoneReleaseAmounts
      );
      
      alert('项目创建成功！');
      if (onProjectCreated) onProjectCreated();
      setTimeout(() => refreshData(), 1000);
      
      // 清空表单
      setName('');
      setDescription('');
      setGoalAmount('');
      setDeadline('');
      setMilestones([{ description: '', releaseAmount: '' }]);

    } catch (err) {
      console.error('创建项目失败:', err);
      setError(`创建失败: ${err.reason || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-project-container">
      <h2>🚀 发起一个带里程碑的项目</h2>
      <form onSubmit={handleSubmit} className="create-project-form">
        {/* 基本信息表单 (name, description, etc.) */}
        <div className="form-group">
          <label htmlFor="name">项目名称</label>
          <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={loading} />
        </div>
        <div className="form-group">
          <label htmlFor="description">项目描述</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required disabled={loading} />
        </div>
        <div className="form-group">
          <label htmlFor="goal">筹款目标 (ETH)</label>
          <input type="number" id="goal" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} step="0.01" min="0" required disabled={loading} />
        </div>
        <div className="form-group">
          <label htmlFor="deadline">截止日期</label>
          <input type="datetime-local" id="deadline" value={deadline} onChange={(e) => setDeadline(e.target.value)} min={getMinDeadline()} required disabled={loading} />
        </div>

        {/* 里程碑动态表单 */}
        <div className="form-group">
            <label>里程碑规划</label>
            {milestones.map((milestone, index) => (
                <div key={index} className="milestone-entry">
                    <input
                        type="text"
                        name="description"
                        placeholder={`里程碑 #${index + 1} 描述`}
                        value={milestone.description}
                        onChange={event => handleMilestoneChange(index, event)}
                        required
                        disabled={loading}
                    />
                    <input
                        type="number"
                        name="releaseAmount"
                        placeholder="释放金额 (ETH)"
                        value={milestone.releaseAmount}
                        onChange={event => handleMilestoneChange(index, event)}
                        step="0.01"
                        min="0"
                        required
                        disabled={loading}
                    />
                    {milestones.length > 1 && (
                        <button type="button" className="btn-remove" onClick={() => handleRemoveMilestone(index)} disabled={loading}>-</button>
                    )}
                </div>
            ))}
            <button type="button" className="btn-add" onClick={handleAddMilestone} disabled={loading}>+ 添加里程碑</button>
        </div>

        {error && <div className="form-error-message">{error}</div>}

        <div className="form-actions">
          <button type="submit" className="btn-create-project" disabled={loading || !contract}>
            {loading ? '创建中...' : '确认创建'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateProject;
/* --- END OF FILE components/CreateProject.js --- */