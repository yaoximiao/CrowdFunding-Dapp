import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../hooks/useWeb3';
import { formatAddress } from '../utils/web3Utils';
import './Navigation.css';

const Navigation = () => {
  const { account, isConnected, connect, disconnect, isLoading } = useWeb3();
  const location = useLocation();

  const handleConnectWallet = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('连接钱包失败:', error);
    }
  };

  const isActive = (path) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link';
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          🚀 CrowdFund
        </Link>
        
        <div className="nav-menu">
          <Link to="/" className={isActive('/')}>
            首页
          </Link>
          <Link to="/all-projects" className={isActive('/all-projects')}>
            所有项目
          </Link>
          
          {isConnected && (
            <>
              <Link to="/my-projects" className={isActive('/my-projects')}>
                我的项目
              </Link>
              <Link to="/my-contributions" className={isActive('/my-contributions')}>
                我的捐款
              </Link>
            </>
          )}
        </div>

        <div className="nav-wallet">
          {isConnected ? (
            <div className="wallet-info">
              <span className="wallet-address">
                {formatAddress(account)}
              </span>
              <button className="btn-disconnect" onClick={disconnect}>
                断开连接
              </button>
            </div>
          ) : (
            <button 
              className="btn-connect" 
              onClick={handleConnectWallet}
              disabled={isLoading}
            >
              {isLoading ? '连接中...' : '连接钱包'}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;