<script setup>
import { ref, onMounted, computed } from 'vue';
import { ethers } from 'ethers';
// 确保 CrowdFund.json 位于 ./contracts/ 目录下，或调整路径
import CrowdFundABISource from './contracts/CrowdFund.json';

// --- 0. 配置 ---
const CROWDFUND_CONTRACT_ABI = ref(CrowdFundABISource.abi);
// !!! 部署合约后，必须用实际地址替换 !!!
const CROWDFUND_CONTRACT_ADDRESS = ref("0x5FbDB2315678afecb367f032d93F642f64180aa3");


// --- 1. 全局响应式状态 ---
let provider = null; // 不是响应式的，因为它是 Ethers 实例
let signer = null;   // 不是响应式的
let crowdFundContract = null; // 不是响应式的

const currentAccount = ref(null);
const networkDisplay = ref('未知');
const chainIdDisplay = ref('N/A');
const projects = ref([]);
const isLoadingProjects = ref(false);
const statusMessage = ref('等待操作...');

const newProject = ref({
  name: '',
  description: '',
  goal: '', 
  deadline: '' // datetime-local input
});

const contributionAmounts = ref({}); // { [projectIdString]: ethStringAmount }
const userContributions = ref({});   // { [projectIdString]: BigIntAmountInWei }

// --- 2. 计算属性 ---
const walletButtonText = computed(() => currentAccount.value ? "切换账户" : "连接钱包");
const accountAddressDisplay = computed(() => currentAccount.value ? `${currentAccount.value.substring(0, 6)}...${currentAccount.value.substring(currentAccount.value.length - 4)}` : '未连接');


// --- 3. 方法 ---

// 连接/切换钱包账户
async function connectWallet() {
  if (!window.ethereum) {
    showStatus('请安装MetaMask!', 'error');
    return;
  }
  if (!provider) { // 确保 provider 已初始化
    provider = new ethers.BrowserProvider(window.ethereum);
  }
  try {
    // 请求账户，即使已连接，也会让用户确认或切换
    await ethereum.request({ method: 'eth_requestAccounts' });
    // accountsChanged 事件将处理后续逻辑
  } catch (error) {
    console.error("连接钱包失败:", error);
    if (error.code === 4001) {
      showStatus('用户拒绝了连接请求。', 'error');
    } else {
      showStatus(`连接钱包失败: ${error.message || '未知错误'}`, 'error');
    }
  }
}

// 处理账户变化
async function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    currentAccount.value = null;
    signer = null;
    crowdFundContract = null;
    projects.value = [];
    userContributions.value = {};
    showStatus('钱包已断开连接。请重新连接。', 'info');
  } else {
    const newAccount = accounts[0];
    if (newAccount !== currentAccount.value) {
      currentAccount.value = newAccount;
      showStatus(`账户已切换至: ${accountAddressDisplay.value}`, 'info');
    } else {
      showStatus(`账户已连接: ${accountAddressDisplay.value}`, 'info');
    }

    if (provider) {
      signer = await provider.getSigner();
      if (CROWDFUND_CONTRACT_ADDRESS.value && CROWDFUND_CONTRACT_ADDRESS.value !== "YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE" && CROWDFUND_CONTRACT_ABI.value) {
        crowdFundContract = new ethers.Contract(
          CROWDFUND_CONTRACT_ADDRESS.value,
          CROWDFUND_CONTRACT_ABI.value,
          signer
        );
        console.log("CrowdFund contract instance created/updated.");
        await loadProjects();
      } else {
        showStatus("合约地址未配置或无效，无法与合约交互。", "error");
        projects.value = [];
      }
    }
  }
}

// 处理网络变化
async function handleChainChanged(_chainId) {
  const chainId = parseInt(_chainId, 16);
  chainIdDisplay.value = chainId.toString();
  let networkName = `Chain ID: ${chainId}`;

  if (chainId === 31337) {
    networkName = "本地 Hardhat 网络";
  } else if (chainId === 1) {
    networkName = "以太坊主网 (警告!)";
  } else {
    networkName = `未知网络 (${chainId})`;
  }
  networkDisplay.value = networkName;
  showStatus(`网络已切换至: ${networkName}`, 'info');

  // 网络变化后，provider 会自动更新，重新获取 signer 和合约实例
  if (currentAccount.value && provider) { // 需要确保 provider 已被初始化
    signer = await provider.getSigner();
    if (CROWDFUND_CONTRACT_ADDRESS.value && CROWDFUND_CONTRACT_ADDRESS.value !== "YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE" && CROWDFUND_CONTRACT_ABI.value) {
      crowdFundContract = new ethers.Contract(
        CROWDFUND_CONTRACT_ADDRESS.value,
        CROWDFUND_CONTRACT_ABI.value,
        signer
      );
      await loadProjects();
    }
  } else if (!currentAccount.value) {
      projects.value = []; // 清空项目，提示连接钱包
      crowdFundContract = null;
  }
}

// 创建项目
async function handleCreateProject() {
  if (!crowdFundContract || !currentAccount.value) {
    showStatus('请先连接钱包并确保网络正确。', 'error');
    return;
  }

  const { name, description, goal, deadline } = newProject.value;
  if (!name || !description || !goal || !deadline) {
    showStatus('所有项目字段都必须填写。', 'error');
    return;
  }
  if (parseFloat(goal) <= 0) {
    showStatus('目标金额必须大于0。', 'error');
    return;
  }

  try {
    const goalWei = ethers.parseEther(goal.toString());
    const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);

    if (deadlineTimestamp <= Math.floor(Date.now() / 1000)) {
      showStatus('截止日期必须在未来。', 'error');
      return;
    }

    showStatus(`正在创建项目 "${name}"... 请在MetaMask中确认交易。`, 'info');
    const createButton = document.getElementById('createProjectSubmitBtn'); // 临时获取按钮以禁用
    if(createButton) createButton.disabled = true;

    const tx = await crowdFundContract.createProject(name, description, goalWei, deadlineTimestamp);
    await tx.wait();

    showStatus(`项目 "${name}" 创建成功!`, 'success');
    newProject.value = { name: '', description: '', goal: '', deadline: '' }; // 清空表单
    await loadProjects();
  } catch (error) {
    console.error("创建项目失败:", error);
    showStatus(`创建项目失败: ${error.data?.message || error.reason || error.message || '未知错误'}`, 'error');
  } finally {
    const createButton = document.getElementById('createProjectSubmitBtn');
    if(createButton) createButton.disabled = false;
  }
}

// 加载所有项目
async function loadProjects() {
  if (!crowdFundContract) {
    projects.value = [];
    if (currentAccount.value) showStatus('合约实例未初始化，无法加载项目。', 'warn');
    return;
  }
  if (!currentAccount.value) {
    projects.value = [];
    // statusMessage.value = '请连接钱包以加载项目。'; // initApp 中已处理
    return;
  }

  isLoadingProjects.value = true;
  showStatus('正在加载项目...', 'info');
  try {
    const projectCounterBigInt = await crowdFundContract.projectCounter();
    const count = Number(projectCounterBigInt);
    console.log(`项目总数 (来自计数器): ${count}`);

    const loadedProjects = [];
    const loadedUserContributions = { ...userContributions.value }; // 保留旧的，更新新的

    if (count === 0) {
      showStatus('还没有任何项目。', 'info');
    }

    for (let i = 1; i <= count; i++) {
      try {
        const projectTuple = await crowdFundContract.projects(i);

        console.log(`Raw projectData for ID ${i}:`, JSON.parse(JSON.stringify(projectTuple, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value // 处理 BigInt 以便 stringify
        ))); 

        if (projectTuple.creator !== ethers.ZeroAddress) {

          const projectObject = {
            id: projectTuple[0], // id 是 BigInt
            creator: projectTuple[1],
            name: projectTuple[2],
            description: projectTuple[3],
            goalAmount: projectTuple[4], // BigInt
            deadline: projectTuple[5],   // BigInt (timestamp)
            raisedAmount: projectTuple[6], // BigInt
            state: projectTuple[7]       // uint8, 会被 Vue 转换为 Number
          };
          
          console.log(`Mapped projectObject for ID ${i}:`, projectObject);
          loadedProjects.push(projectObject);

          contributionAmounts.value[projectObject.id.toString()] = contributionAmounts.value[projectObject.id.toString()] || '';
          if (currentAccount.value) {
            const contrib = await crowdFundContract.getContributionAmount(projectObject.id, currentAccount.value);
            loadedUserContributions[projectObject.id.toString()] = contrib;
          }
        }
      } catch (projError) {
        console.warn(`加载项目 ID ${i} 失败:`, projError);
      }
    }
    projects.value = loadedProjects;
    userContributions.value = loadedUserContributions;
    if (isLoadingProjects.value && loadedProjects.length > 0) { // 只有在仍在加载时才更新此消息
        showStatus('项目加载完毕。', 'success');
    } else if (isLoadingProjects.value && count > 0 && loadedProjects.length === 0) {
        showStatus('未能加载到有效项目。', 'warn');
    }

  } catch (error) {
    console.error("加载项目列表失败:", error);
    showStatus(`加载项目列表失败: ${error.message || '未知错误'}`, 'error');
  } finally {
    isLoadingProjects.value = false;
  }
}

// 处理捐款
async function handleContribute(projectIdBigInt) {
  const projectIdStr = projectIdBigInt.toString();
  if (!crowdFundContract || !currentAccount.value) {
    showStatus('请先连接钱包。', 'error');
    return;
  }
  const amountEth = contributionAmounts.value[projectIdStr];
  if (!amountEth || parseFloat(amountEth) <= 0) {
    showStatus('请输入有效的捐款金额。', 'error');
    return;
  }

  showStatus(`正在向项目 ${projectIdStr} 捐款 ${amountEth} ETH...`, 'info');
  try {
    const amountWei = ethers.parseEther(amountEth.toString());
    const tx = await crowdFundContract.contribute(projectIdBigInt, { value: amountWei });
    await tx.wait();
    showStatus(`成功向项目 ${projectIdStr} 捐款!`, 'success');
    contributionAmounts.value[projectIdStr] = '';
    await loadProjects(); // 重新加载以更新筹集金额和用户贡献
  } catch (error) {
    console.error(`项目 ${projectIdStr} 捐款失败:`, error);
    showStatus(`捐款失败: ${error.data?.message || error.reason || error.message || '未知错误'}`, 'error');
  }
}

// 处理结束项目
async function handleFinalize(projectIdBigInt) {
  if (!crowdFundContract) return showStatus('合约未初始化。', 'error');
  showStatus(`正在检查并结束项目 ${projectIdBigInt.toString()} ...`, 'info');
  try {
    const tx = await crowdFundContract.checkDeadlineAndFinalize(projectIdBigInt);
    await tx.wait();
    showStatus(`项目 ${projectIdBigInt.toString()} 状态已更新!`, 'success');
    await loadProjects();
  } catch (error) {
    console.error(`结束项目 ${projectIdBigInt.toString()} 失败:`, error);
    showStatus(`结束项目失败: ${error.data?.message || error.reason || error.message || '未知错误'}`, 'error');
  }
}

// 处理项目方提取资金
async function handleClaim(projectIdBigInt) {
  if (!crowdFundContract || !currentAccount.value) return showStatus('请先连接钱包。', 'error');
  showStatus(`项目 ${projectIdBigInt.toString()} 发起人正在提取资金...`, 'info');
  try {
    const tx = await crowdFundContract.claimFunds(projectIdBigInt);
    await tx.wait();
    showStatus(`项目 ${projectIdBigInt.toString()} 资金提取成功!`, 'success');
    await loadProjects();
  } catch (error) {
    console.error(`提取资金 ${projectIdBigInt.toString()} 失败:`, error);
    showStatus(`提取资金失败: ${error.data?.message || error.reason || error.message || '未知错误'}`, 'error');
  }
}

// 处理捐款人退款
async function handleRefund(projectIdBigInt) {
  if (!crowdFundContract || !currentAccount.value) return showStatus('请先连接钱包。', 'error');
  showStatus(`正在为项目 ${projectIdBigInt.toString()} 的捐款申请退款...`, 'info');
  try {
    const tx = await crowdFundContract.getRefund(projectIdBigInt);
    await tx.wait();
    showStatus(`项目 ${projectIdBigInt.toString()} 退款成功!`, 'success');
    await loadProjects(); // 重新加载以更新用户贡献
  } catch (error) {
    console.error(`退款 ${projectIdBigInt.toString()} 失败:`, error);
    showStatus(`退款失败: ${error.data?.message || error.reason || error.message || '未知错误'}`, 'error');
  }
}

// --- 4. 辅助函数 ---
function showStatus(message, type = 'info') {
  console.log(`Status (${type}): ${message}`);
  statusMessage.value = message; // 直接更新 ref
  // 你可以在模板中根据 type 给 p 标签添加不同的 class 来改变颜色
}

function formatEther(weiValue) {
  if (weiValue === undefined || weiValue === null || typeof weiValue.toString !== 'function') return '0';
  try {
    return ethers.formatEther(weiValue);
  } catch (e) {
    return 'N/A'; // 处理无效的 BigInt 值
  }
}
function formatDate(timestampBigInt) {
  if (!timestampBigInt || Number(timestampBigInt) === 0) return 'N/A';
  return new Date(Number(timestampBigInt) * 1000).toLocaleString();
}
function getProjectStateName(stateEnumLike) { // stateEnumLike could be number or BigInt
  const names = ["筹款中", "成功", "失败", "已付款", "已退款"];
  const stateNumber = Number(stateEnumLike);
  return names[stateNumber] !== undefined ? names[stateNumber] : "未知状态";
}
function isDeadlinePassed(deadlineBigInt) {
  if (!deadlineBigInt) return true;
  return (new Date().getTime() / 1000) > Number(deadlineBigInt);
}

// --- 5. 生命周期钩子 ---
onMounted(async () => {
  console.log("App component mounted.");
  // 动态加载合约地址 (如果需要，确保你的服务器能提供这个文件)
  // 为了简单，先假设 CROWDFUND_CONTRACT_ADDRESS.value 已被正确设置或硬编码
  if (CROWDFUND_CONTRACT_ADDRESS.value === "YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE" || !CROWDFUND_CONTRACT_ADDRESS.value) {
      showStatus("错误：合约地址未配置！请在 App.vue 中设置正确的已部署合约地址。", "error");
      console.error("CROWDFUND_CONTRACT_ADDRESS is not set!");
      // return; // 可以选择在这里返回，阻止后续初始化
  }


  if (window.ethereum) {
    provider = new ethers.BrowserProvider(window.ethereum);
    try {
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        await handleAccountsChanged(accounts);
      } else {
        showStatus('请点击按钮连接您的MetaMask钱包。', 'info');
      }
    } catch (err) {
      console.error("初始化获取账户失败:", err);
      showStatus('连接钱包时发生错误，请检查控制台。', 'error');
    }

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    try {
        const initialChainId = await ethereum.request({ method: 'eth_chainId' });
        await handleChainChanged(initialChainId);
    } catch (error) {
        console.error("获取初始链ID失败:", error);
    }

  } else {
    showStatus("请安装MetaMask以使用此DApp。", 'error');
  }
});

</script>

<template>
  <div id="app-container">
    <header>
        <h1>众筹 DApp</h1>
        <div class="wallet-info">
            <button id="connectWalletBtn" @click="connectWallet">{{ walletButtonText }}</button>
            <p>当前账户: <span id="accountAddress">{{ accountAddressDisplay }}</span></p>
            <p>网络: <span id="networkName">{{ networkDisplay }}</span> (ChainID: <span id="chainId">{{ chainIdDisplay }}</span>)</p>
        </div>
    </header>

    <main>
        <section id="create-project-section" class="card" v-if="currentAccount">
            <h2>创建新项目</h2>
            <form id="createProjectForm" @submit.prevent="handleCreateProject">
                <div>
                    <label for="projectNameVue">项目名称:</label>
                    <input type="text" id="projectNameVue" v-model="newProject.name" required>
                </div>
                <div>
                    <label for="projectDescriptionVue">项目描述:</label>
                    <textarea id="projectDescriptionVue" rows="3" v-model="newProject.description" required></textarea>
                </div>
                <div>
                    <label for="projectGoalVue">目标金额 (ETH):</label>
                    <input type="number" id="projectGoalVue" step="0.01" min="0.01" v-model="newProject.goal" required>
                </div>
                <div>
                    <label for="projectDeadlineVue">截止日期和时间:</label>
                    <input type="datetime-local" id="projectDeadlineVue" v-model="newProject.deadline" required>
                </div>
                <button type="submit" id="createProjectSubmitBtn">创建项目</button>
            </form>
        </section>
        <section v-else class="card">
            <p>请先连接钱包以创建或查看项目。</p>
        </section>

        <hr>

        <section id="projects-section">
            <h2>现有项目</h2>
            <div id="projectsListContainer">
                <p v-if="isLoadingProjects">正在加载项目...</p>
                <p v-else-if="!currentAccount && CROWDFUND_CONTRACT_ADDRESS !== 'YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE' && CROWDFUND_CONTRACT_ADDRESS">请连接钱包以查看项目。</p>
                <p v-else-if="projects.length === 0 && currentAccount">当前没有项目，您可以创建一个！</p>
                <div v-else-if="projects.length > 0">
                    <div v-for="project in projects" :key="project.id.toString()" class="project-card">
                        <h3>{{ project.name }} (ID: {{ project.id.toString() }})</h3>
                        <p><strong>发起人:</strong> {{ project.creator }}</p>
                        <p><strong>描述:</strong> {{ project.description }}</p>
                        <p><strong>目标:</strong> {{ formatEther(project.goalAmount) }} ETH</p>
                        <p><strong>已筹集:</strong> {{ formatEther(project.raisedAmount) }} ETH</p>
                        <p><strong>截止日期:</strong> {{ formatDate(project.deadline) }}</p>
                        <p><strong>状态:</strong> {{ getProjectStateName(project.state) }}</p>
                        <!-- 操作按钮 -->
                        <div class="actions" v-if="currentAccount">
                            <div v-if="Number(project.state) === 0 && !isDeadlinePassed(project.deadline)">
                                <input type="number" :id="`contribAmount-${project.id.toString()}`" v-model="contributionAmounts[project.id.toString()]" placeholder="ETH" step="0.01" min="0.001">
                                <button @click="handleContribute(project.id)">捐款</button>
                            </div>
                            <button v-if="Number(project.state) === 0" @click="handleFinalize(project.id)">检查/结束项目</button>
                            <button v-if="Number(project.state) === 1 && project.creator.toLowerCase() === currentAccount?.toLowerCase()" @click="handleClaim(project.id)">提取资金</button>
                            <button v-if="Number(project.state) === 2 && userContributions[project.id.toString()] && userContributions[project.id.toString()] > BigInt(0)" @click="handleRefund(project.id)">
                                获取退款 ({{ formatEther(userContributions[project.id.toString()]) }} ETH)
                            </button>
                        </div>
                    </div>
                </div>
                 <p v-else-if="CROWDFUND_CONTRACT_ADDRESS === 'YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE' || !CROWDFUND_CONTRACT_ADDRESS">合约地址未配置。</p>
            </div>
        </section>

        <hr>
        <section id="status-section" class="card">
            <h2>状态/日志</h2>
            <div id="statusMessages">
                <p :class="statusType">{{ statusMessage }}</p> <!-- 可以根据statusType动态添加class -->
            </div>
        </section>
    </main>

    <footer>
        <p>© {{ new Date().getFullYear() }} 众筹DApp</p>
    </footer>
  </div>
</template>