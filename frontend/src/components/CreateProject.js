/* --- START OF FILE components/CreateProject.js --- */

import React, { useState } from 'react';
import { useContract } from '../hooks/useContract';
import { createProject } from '../utils/contractUtils';
import './CreateProject.css';

const CreateProject = ({ onProjectCreated }) => {
  const { contract, refreshData } = useContract();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getMinDeadline = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // Deadline must be at least 1 day in the future
    return today.toISOString().slice(0, 16);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!name || !description || !goalAmount || !deadline) {
      setError('所有字段均为必填项');
      return;
    }
    if (parseFloat(goalAmount) <= 0) {
      setError('目标金额必须大于0');
      return;
    }

    setLoading(true);
    try {
      await createProject(contract, name, description, goalAmount, new Date(deadline));
      // Reset form
      setName('');
      setDescription('');
      setGoalAmount('');
      setDeadline('');
      alert('项目创建成功！数据将在区块链确认后更新。');
      // Callback to potentially trigger parent component actions
      if(onProjectCreated) {
        onProjectCreated();
      }
      // Refresh data after a short delay to allow for block confirmation
      setTimeout(() => {
        refreshData();
      }, 1000);

    } catch (err) {
      console.error('创建项目失败:', err);
      const message = err.reason || err.message || '发生未知错误';
      setError(`创建失败: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-project-container">
      <h2>🚀 发起一个新项目</h2>
      <form onSubmit={handleSubmit} className="create-project-form">
        <div className="form-group">
          <label htmlFor="name">项目名称</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：我的第一个DApp"
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">项目描述</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="详细描述你的项目和资金用途"
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="goal">筹款目标 (ETH)</label>
          <input
            type="number"
            id="goal"
            value={goalAmount}
            onChange={(e) => setGoalAmount(e.target.value)}
            placeholder="例如：10"
            step="0.01"
            min="0"
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="deadline">截止日期</label>
          <input
            type="datetime-local"
            id="deadline"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            min={getMinDeadline()}
            disabled={loading}
          />
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