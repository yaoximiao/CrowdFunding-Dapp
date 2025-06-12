// frontend/src/stores/contract.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ethers } from 'ethers';
import CrowdFundABISource from '../contracts/CrowdFund.json';
import { useWalletStore } from './wallet'; // 依赖 wallet store

const CROWDFUND_CONTRACT_ABI = CrowdFundABISource.abi;
const CROWDFUND_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // 你的合约地址

export const useContractStore = defineStore('contract', () => {
    const wallet = useWalletStore();
    const instance = ref(null); // 合约实例

    function initContract() {
        if (wallet.signer && CROWDFUND_CONTRACT_ADDRESS && CROWDFUND_CONTRACT_ABI) {
            try {
                instance.value = new ethers.Contract(
                    CROWDFUND_CONTRACT_ADDRESS,
                    CROWDFUND_CONTRACT_ABI,
                    wallet.signer
                );
                console.log("CrowdFund contract instance (re)initialized in store.");
                wallet.showStatus("合约已准备就绪", "success", 1500);
            } catch (e) {
                console.error("Error initializing contract in store:", e);
                instance.value = null;
                wallet.showStatus("初始化合约实例失败", "error");
            }
        } else {
            instance.value = null;
             if (!wallet.signer) console.log("Cannot init contract, signer not available.");
        }
    }

    function clearContractInstance() {
        instance.value = null;
        console.log("Contract instance cleared.");
    }
    
    // --- 合约交互方法 (示例) ---
    // 注意：所有与合约交互的方法现在都应该通过 this.instance (或 instance.value)
    // 并且应该处理合约实例不存在的情况

    async function projectCounter() {
        if (!instance.value) throw new Error("合约未初始化");
        return await instance.value.projectCounter();
    }

    async function getProjectDetails(projectId) {
        if (!instance.value) throw new Error("合约未初始化");
        const projectTuple = await instance.value.projects(projectId);
        if (projectTuple.creator === ethers.ZeroAddress) return null; // Or throw error
        return { // Map to object
            id: projectTuple[0], creator: projectTuple[1], name: projectTuple[2],
            description: projectTuple[3], goalAmount: projectTuple[4],
            deadline: projectTuple[5], raisedAmount: projectTuple[6], state: projectTuple[7]
        };
    }
    
    async function getUserContribution(projectId, userAddress) {
        if (!instance.value || !userAddress) return BigInt(0);
        return await instance.value.getContributionAmount(projectId, userAddress);
    }


    async function createProject(name, description, goalWei, deadlineTimestamp) {
        if (!instance.value) throw new Error("合约未初始化");
        wallet.showStatus(`正在创建项目 "${name}"...`, 'info');
        const tx = await instance.value.createProject(name, description, goalWei, deadlineTimestamp);
        await tx.wait();
        wallet.showStatus(`项目 "${name}" 创建成功!`, 'success');
        return tx;
    }

    async function contribute(projectId, amountWei) {
        if (!instance.value) throw new Error("合约未初始化");
        wallet.showStatus(`正在捐款...`, 'info');
        const tx = await instance.value.contribute(projectId, { value: amountWei });
        await tx.wait();
        wallet.showStatus(`捐款成功!`, 'success');
        return tx;
    }
    
    // ... 实现 handleFinalize, handleClaim, handleRefund 对应的合约调用 ...
    async function finalizeProject(projectId) {
        if (!instance.value) throw new Error("合约未初始化");
        wallet.showStatus(`正在结束项目 ${projectId}...`, 'info');
        const tx = await instance.value.checkDeadlineAndFinalize(projectId);
        await tx.wait();
        wallet.showStatus(`项目 ${projectId} 状态已更新!`, 'success');
        return tx;
    }

    async function claimProjectFunds(projectId) {
        if (!instance.value) throw new Error("合约未初始化");
        wallet.showStatus(`正在提取项目 ${projectId} 资金...`, 'info');
        const tx = await instance.value.claimFunds(projectId);
        await tx.wait();
        wallet.showStatus(`项目 ${projectId} 资金提取成功!`, 'success');
        return tx;
    }

    async function refundContribution(projectId) {
        if (!instance.value) throw new Error("合约未初始化");
        wallet.showStatus(`正在申请项目 ${projectId} 退款...`, 'info');
        const tx = await instance.value.getRefund(projectId);
        await tx.wait();
        wallet.showStatus(`项目 ${projectId} 退款成功!`, 'success');
        return tx;
    }


    return {
        instance,
        initContract,
        clearContractInstance,
        projectCounter,
        getProjectDetails,
        getUserContribution,
        createProject,
        contribute,
        finalizeProject,
        claimProjectFunds,
        refundContribution
    };
});