import { useState, useEffect } from 'react';
import { connectWallet, checkWalletConnection } from '../utils/web3Utils';

export const useWeb3 = () => {
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化时检查钱包连接状态
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const walletInfo = await checkWalletConnection();
        if (walletInfo) {
          setProvider(walletInfo.provider);
          setSigner(walletInfo.signer);
          setAccount(walletInfo.address);
          setIsConnected(true);
        }
      } catch (error) {
        console.error('初始化钱包连接失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // 监听账户变化
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          // 用户断开连接
          setAccount('');
          setProvider(null);
          setSigner(null);
          setIsConnected(false);
        } else {
          // 账户切换
          setAccount(accounts[0]);
          // 重新初始化provider和signer
          const initAfterAccountChange = async () => {
            try {
              const walletInfo = await checkWalletConnection();
              if (walletInfo) {
                setProvider(walletInfo.provider);
                setSigner(walletInfo.signer);
                setIsConnected(true);
              }
            } catch (error) {
              console.error('账户切换后初始化失败:', error);
            }
          };
          initAfterAccountChange();
        }
      };

      const handleChainChanged = () => {
        // 网络切换时重新加载页面
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // 清理事件监听器
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  // 连接钱包
  const connect = async () => {
    try {
      setIsLoading(true);
      const walletInfo = await connectWallet();
      setProvider(walletInfo.provider);
      setSigner(walletInfo.signer);
      setAccount(walletInfo.address);
      setIsConnected(true);
    } catch (error) {
      console.error('连接钱包失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 断开连接
  const disconnect = () => {
    setAccount('');
    setProvider(null);
    setSigner(null);
    setIsConnected(false);
  };

  return {
    account,
    provider,
    signer,
    isConnected,
    isLoading,
    connect,
    disconnect
  };
};