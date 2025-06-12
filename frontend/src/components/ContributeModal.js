import React, { useState } from 'react';
import { formatEther } from '../utils/web3Utils';
import './ContributeModal.css';

const ContributeModal = ({ project, onContribute, onClose, loading }) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // 验证输入
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setError('请输入有效的捐款金额');
      return;
    }

    if (parseFloat(amount) > 10) {
      setError('单次捐款金额不能超过10 ETH');
      return;
    }

    onContribute(amount);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const remainingAmount = parseFloat(formatEther(project.goalAmount)) - parseFloat(formatEther(project.raisedAmount));

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>支持项目</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="project-info">
            <h4>{project.name}</h4>
            <div className="funding-info">
              <div className="info-row">
                <span>筹款目标:</span>
                <span>{formatEther(project.goalAmount)} ETH</span>
              </div>
              <div className="info-row">
                <span>已筹集:</span>
                <span>{formatEther(project.raisedAmount)} ETH</span>
              </div>
              <div className="info-row">
                <span>还需筹集:</span>
                <span className="remaining">{remainingAmount.toFixed(4)} ETH</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="amount">捐款金额 (ETH)</label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="请输入捐款金额"
                step="0.001"
                min="0"
                max="10"
                disabled={loading}
              />
              <div className="quick-amounts">
                <button
                  type="button"
                  className="quick-amount-btn"
                  onClick={() => setAmount('0.1')}
                  disabled={loading}
                >
                  0.1 ETH
                </button>
                <button
                  type="button"
                  className="quick-amount-btn"
                  onClick={() => setAmount('0.5')}
                  disabled={loading}
                >
                  0.5 ETH
                </button>
                <button
                  type="button"
                  className="quick-amount-btn"
                  onClick={() => setAmount('1')}
                  disabled={loading}
                >
                  1 ETH
                </button>
                <button
                  type="button"
                  className="quick-amount-btn"
                  onClick={() => setAmount(remainingAmount.toFixed(4))}
                  disabled={loading || remainingAmount <= 0}
                >
                  全部
                </button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={onClose}
                disabled={loading}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn-contribute"
                disabled={loading || !amount}
              >
                {loading ? '处理中...' : '确认捐款'}
              </button>
            </div>
          </form>

          <div className="contribution-note">
            <p>💡 温馨提示：</p>
            <ul>
              <li>捐款后无法撤回，除非项目失败</li>
              <li>项目成功后，资金将转给项目创建者</li>
              <li>项目失败后，您可以申请退款</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContributeModal;