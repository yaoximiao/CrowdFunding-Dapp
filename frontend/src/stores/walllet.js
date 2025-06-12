// frontend/src/stores/wallet.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ethers } from 'ethers';

export const useWalletStore = defineStore('wallet', () => {
    const provider = ref(null);
    const signer = ref(null);
    const currentAccount = ref(null);
    const networkDisplay = ref('未知');
    const chainIdDisplay = ref('N/A');
    const statusMessage = ref('等待操作...');
    const statusType = ref('info'); // 'info', 'success', 'error', 'warn'

    const isConnected = computed(() => !!currentAccount.value);
    const accountShort = computed(() => currentAccount.value ? `${currentAccount.value.substring(0, 6)}...${currentAccount.value.substring(currentAccount.value.length - 4)}` : '未连接');

    function showStatus(message, type = 'info', duration = 3000) {
        console.log(`Status (${type}): ${message}`);
        statusMessage.value = message;
        statusType.value = type;
        if (duration > 0) {
            setTimeout(() => {
                statusMessage.value = '';
            }, duration);
        }
    }

    async function initProvider() {
        if (window.ethereum) {
            provider.value = new ethers.BrowserProvider(window.ethereum);
            console.log("Provider initialized");

            // 监听事件
            window.ethereum.on('accountsChanged', handleAccountsChangedInStore);
            window.ethereum.on('chainChanged', handleChainChangedInStore);

            // 尝试获取初始账户和网络
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    await handleAccountsChangedInStore(accounts);
                } else {
                    showStatus('请点击按钮连接您的MetaMask钱包。', 'info');
                }
                const initialChainId = await window.ethereum.request({ method: 'eth_chainId' });
                await handleChainChangedInStore(initialChainId);
            } catch (err) {
                console.error("初始化获取账户或链ID失败:", err);
                showStatus('连接钱包时发生错误，请检查控制台。', 'error');
            }

        } else {
            showStatus("请安装MetaMask以使用此DApp。", 'error', 0);
        }
    }

    async function connectWallet() {
        if (!window.ethereum) return showStatus('请安装MetaMask!', 'error');
        if (!provider.value) provider.value = new ethers.BrowserProvider(window.ethereum);

        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            // accountsChanged event will handle the rest
        } catch (error) {
            console.error("连接钱包失败:", error);
            if (error.code === 4001) showStatus('用户拒绝了连接请求。', 'error');
            else showStatus(`连接钱包失败: ${error.message || '未知错误'}`, 'error');
        }
    }

    async function handleAccountsChangedInStore(accounts) {
        const contractStore = useContractStore(); // 获取合约 store
        if (accounts.length === 0) {
            currentAccount.value = null;
            signer.value = null;
            contractStore.clearContractInstance(); // 清除合约实例
            showStatus('钱包已断开连接。', 'info');
        } else {
            const newAccount = accounts[0];
            if (newAccount !== currentAccount.value) {
                currentAccount.value = newAccount;
                showStatus(`账户已切换至: ${accountShort.value}`, 'info');
            } else {
                // showStatus(`账户已连接: ${accountShort.value}`, 'info');
            }
            if (provider.value) {
                signer.value = await provider.value.getSigner();
                contractStore.initContract(); // 尝试初始化/更新合约实例
            }
        }
    }

    async function handleChainChangedInStore(_chainId) {
        const contractStore = useContractStore();
        const chainId = parseInt(_chainId, 16);
        chainIdDisplay.value = chainId.toString();
        let networkName = `Chain ID: ${chainId}`;

        if (chainId === 31337) networkName = "本地 Hardhat 网络";
        else if (chainId === 1) networkName = "以太坊主网 (警告!)";
        else networkName = `未知网络 (${chainId})`;

        networkDisplay.value = networkName;
        showStatus(`网络已切换至: ${networkName}`, 'info');

        if (currentAccount.value && provider.value) {
            signer.value = await provider.value.getSigner();
            contractStore.initContract(); // 尝试初始化/更新合约实例
        } else {
            contractStore.clearContractInstance();
        }
    }

    return {
        provider, // provider 自身不需要是 ref，但引用它的变量可以是
        signer,   // signer 自身不需要是 ref
        currentAccount,
        networkDisplay,
        chainIdDisplay,
        statusMessage,
        statusType,
        isConnected,
        accountShort,
        showStatus,
        initProvider,
        connectWallet
    };
});

// 你需要在其他 store 中 import 这个 store 来访问它
// 例如在 contractStore.js 中： import { useWalletStore } from './wallet';
// 为了避免循环依赖，contractStore 的初始化可以放在 walletStore 的 action 之后
// 或者 walletStore 提供必要的响应式数据 (signer, provider) 给 contractStore
// 这里我们让 contractStore 依赖 walletStore
import { useContractStore } from './contract'; // 引入 contract store