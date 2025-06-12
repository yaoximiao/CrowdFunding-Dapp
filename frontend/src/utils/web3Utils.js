import { ethers, BrowserProvider, formatEther as formatEtherV6, parseEther as parseEtherV6 } from 'ethers';

// Web3 连接相关工具函数
export const connectWallet = async () => {
  if (typeof window.ethereum !== 'undefined') {
    try {
      // 请求用户连接钱包
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      // Ethers v6 使用 BrowserProvider
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner(); // getSigner() 现在是异步的
      const address = await signer.getAddress();
      
      return {
        provider,
        signer,
        address
      };
    } catch (error) {
      console.error('连接钱包失败:', error);
      throw error;
    }
  } else {
    alert('请安装MetaMask钱包');
    throw new Error('MetaMask not found');
  }
};

// 检查是否已连接钱包
export const checkWalletConnection = async () => {
  if (typeof window.ethereum !== 'undefined') {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        return {
          provider,
          signer,
          address: accounts[0]
        };
      }
    } catch (error) {
      console.error('检查钱包连接失败:', error);
    }
  }
  return null;
};

// 格式化ETH金额显示
export const formatEther = (wei) => {
  if (!wei) return '0';
  return formatEtherV6(wei); // 使用导入的 v6 版本函数
};

// 将ETH转换为Wei
export const parseEther = (eth) => {
  return parseEtherV6(eth.toString()); // 使用导入的 v6 版本函数
};

// ... (省略 formatAddress, formatTimestamp, isProjectExpired, getRemainingTime，它们不变) ...
export const formatAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('zh-CN');
};
export const isProjectExpired = (deadline) => {
  const now = Math.floor(Date.now() / 1000);
  return now >= deadline;
};
export const getRemainingTime = (deadline) => {
  const now = Math.floor(Date.now() / 1000);
  const remaining = deadline - now;
  
  if (remaining <= 0) {
    return '已结束';
  }
  
  const days = Math.floor(remaining / (24 * 60 * 60));
  const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((remaining % (60 * 60)) / 60);
  
  if (days > 0) {
    return `${days}天 ${hours}小时`;
  } else if (hours > 0) {
    return `${hours}小时 ${minutes}分钟`;
  } else {
    return `${minutes}分钟`;
  }
};