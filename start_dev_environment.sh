#!/bin/bash

# start_dev_environment.sh
# 自动化启动众筹DApp开发环境的脚本：
# 1. 清理并编译合约。
# 2. 在后台启动一个Hardhat节点。
# 3. 部署合约到该节点。
# 4. 提取合约地址并自动更新前端的.env文件。
# 5. 提供清晰的指令，并处理清理工作。

# --- 配置 ---
USE_CLEAN=true # 设置为 false 则跳过 npx hardhat clean
IGNITION_MODULE_PATH="./ignition/modules/DeployCrowdFund.js" # 你的 Ignition 部署模块路径
NETWORK_NAME="localhost"
EXPECTED_CONTRACT_NAME_IN_OUTPUT="CrowdFundModule#CrowdFund" # 用于从部署日志中提取地址
FRONTEND_ENV_PATH="./frontend/.env" # 前端 .env 文件路径

# --- 全局变量 ---
NODE_PID=""

# --- 函数定义 ---
cleanup_node() {
  echo ""
  echo "收到退出信号... 正在清理..."
  if [ -n "$NODE_PID" ] && kill -0 "$NODE_PID" > /dev/null 2>&1; then
    echo "正在停止 Hardhat 节点 (PID: $NODE_PID)..."
    kill "$NODE_PID"
    wait "$NODE_PID" 2>/dev/null # 等待进程完全停止
    echo "Hardhat 节点已停止。"
  else
    echo "Hardhat 节点 (PID: $NODE_PID) 未找到或已停止。"
  fi
  exit 0
}

# 捕获 Ctrl+C (INT) 和脚本终止 (TERM) 信号，并执行清理函数
trap cleanup_node INT TERM

# --- 主逻辑 ---
echo "============================================="
echo "=== 启动众筹 DApp 开发环境 ==="
echo "============================================="

# 确保在项目根目录运行
if [ ! -f "hardhat.config.js" ]; then
    echo "错误：请在项目根目录下运行此脚本。"
    exit 1
fi

# 1. 清理 (可选)
if [ "$USE_CLEAN" = true ]; then
  echo ""
  echo "--- 步骤 1: 清理 Hardhat 缓存 ---"
  npx hardhat clean
  if [ $? -ne 0 ]; then
    echo "警告：清理失败，但将继续执行。"
  else
    echo "清理完成。"
  fi
fi

# 2. 编译合约
echo ""
echo "--- 步骤 2: 编译智能合约 ---"
npx hardhat compile
if [ $? -ne 0 ]; then
    echo "错误：合约编译失败，请检查错误！"
    exit 1
fi
echo "合约编译成功。"

# 3. 启动 Hardhat 节点并在后台运行
echo ""
echo "--- 步骤 3: 启动 Hardhat 本地节点 (在后台)... ---"
npx hardhat node > hardhat_node.log 2>&1 &
NODE_PID=$!
echo "Hardhat 节点已在后台启动 (PID: $NODE_PID)。日志输出到 hardhat_node.log"
echo "正在等待节点初始化..."
sleep 5 # 给节点足够的时间启动，对于现代计算机通常5秒足够

# 检查节点是否真的启动了
if ! kill -0 "$NODE_PID" > /dev/null 2>&1; then
  echo "错误：Hardhat 节点未能成功启动。请检查 hardhat_node.log。"
  exit 1
fi
echo "Hardhat 节点已成功启动。"

# 4. 部署合约
echo ""
echo "--- 步骤 4: 部署智能合约到本地节点 ---"
DEPLOY_OUTPUT_FILE="deploy_output.log"
# 部署时重定向标准输出到日志文件，标准错误也重定向到标准输出
npx hardhat run scripts/deploy.js --network "$NETWORK_NAME" > "$DEPLOY_OUTPUT_FILE" 2>&1

# 检查部署命令的退出状态
if [ $? -ne 0 ]; then
    echo "错误：合约部署失败！详情请查看 $DEPLOY_OUTPUT_FILE。"
    cleanup_node # 部署失败时也停止节点
    exit 1
fi
echo "合约部署命令执行成功！"

# 5. 提取并显示合约地址 (适配 'npx hardhat run' 的输出)
# 'npx hardhat run' 的输出通常是简单的 console.log，我们假设它包含 "CrowdFund contract deployed to:"
CONTRACT_ADDRESS_LINE=$(grep "CrowdFund contract deployed to:" "$DEPLOY_OUTPUT_FILE")
CONTRACT_ADDRESS=$(echo "$CONTRACT_ADDRESS_LINE" | awk '{print $NF}')

echo ""
echo "--- 步骤 5: 更新前端配置 ---"
if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "错误：未能从部署输出中提取到合约地址。"
    echo "请手动检查 $DEPLOY_OUTPUT_FILE 文件，并更新 $FRONTEND_ENV_PATH。"
    # 脚本将继续运行，但前端可能无法工作
else
    echo "成功提取到合约地址: $CONTRACT_ADDRESS"
    
    # 创建或更新前端的 .env 文件
    if [ -f "$FRONTEND_ENV_PATH" ]; then
        # 如果文件存在，使用sed替换已有的地址行，或追加新行
        # -i.bak 会创建一个备份文件
        sed -i.bak '/^REACT_APP_CONTRACT_ADDRESS=/d' "$FRONTEND_ENV_PATH"
    fi
    echo "REACT_APP_CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> "$FRONTEND_ENV_PATH"
    echo "已自动更新 $FRONTEND_ENV_PATH 文件。"
fi

echo ""
echo "============================================================"
echo "✅ 开发环境已准备就绪！"
echo ""
echo "  - Hardhat 节点正在后台运行 (PID: $NODE_PID)。"
echo "  - 合约已部署，地址已更新到前端配置。"
echo ""
echo "下一步操作:"
echo "1. 打开一个新的终端。"
echo "2. 进入前端目录: cd frontend"
echo "3. 启动前端服务: npm start"
echo ""
echo "你可以通过 'tail -f hardhat_node.log' 实时查看节点日志。"
echo "============================================================"
echo ""
echo "脚本将保持运行以维持Hardhat节点。按 Ctrl+C 即可安全停止节点并退出。"

# 让脚本保持活动状态，等待用户按下 Ctrl+C
# 'wait' 命令会等待后台进程（我们的节点）结束
# 因为我们捕获了 INT 信号，Ctrl+C 会触发 cleanup_node 函数，
# 该函数会 kill 节点，然后 wait 就会结束。
wait $NODE_PID