#!/bin/bash

# start_dev_environment.sh
# 这个脚本会：
# 1. (可选) 清理 Hardhat 缓存
# 2. 编译合约
# 3. 在前台启动 Hardhat 节点 (你需要手动 Ctrl+C 来停止它)
# 4. 在节点启动后，脚本会尝试在同一进程的"后台"（通过并发）部署合约
#    但这对于需要节点持续运行的场景不理想。

# --- 配置 ---
USE_CLEAN=true # 设置为 false 则跳过 npx hardhat clean
IGNITION_MODULE_PATH="./ignition/modules/DeployCrowdFund.js"
NETWORK_NAME="localhost"
EXPECTED_CONTRACT_NAME_IN_OUTPUT="CrowdFundModule#CrowdFund" # 用于从部署日志中提取地址

# --- 函数定义 ---
cleanup_node() {
  echo ""
  echo "正在尝试停止 Hardhat 节点 (PID: $NODE_PID)..."
  if kill -0 "$NODE_PID" > /dev/null 2>&1; then # 检查进程是否存在
    kill "$NODE_PID"
    wait "$NODE_PID" 2>/dev/null # 等待进程完全停止
    echo "Hardhat 节点已停止。"
  else
    echo "Hardhat 节点 (PID: $NODE_PID) 未找到或已停止。"
  fi
  exit
}

# 捕获 Ctrl+C 信号并执行清理函数
trap cleanup_node INT

# --- 主逻辑 ---
echo "============================================="
echo "=== 启动众筹 DApp 开发环境 ==="
echo "============================================="

# 1. 清理 (可选)
if [ "$USE_CLEAN" = true ]; then
  echo ""
  echo "--- 步骤 1: 清理 Hardhat 缓存 ---"
  npx hardhat clean
  if [ $? -ne 0 ]; then
    echo "清理失败！"
    # exit 1 # 可以选择在这里退出，或者继续
  else
    echo "清理完成。"
  fi
fi

# 2. 编译合约
echo ""
echo "--- 步骤 2: 编译智能合约 ---"
npx hardhat compile
if [ $? -ne 0 ]; then
    echo "合约编译失败，请检查错误！"
    exit 1
fi
echo "合约编译成功。"

# 3. 启动 Hardhat 节点并在后台运行，以便后续可以部署
echo ""
echo "--- 步骤 3: 启动 Hardhat 本地节点 (在后台)... ---"
npx hardhat node > hardhat_node.log 2>&1 &
NODE_PID=$!
echo "Hardhat 节点已在后台启动 (PID: $NODE_PID)。日志输出到 hardhat_node.log"
echo "等待节点初始化..."
sleep 8 # 给节点足够的时间启动，对于较慢的机器可能需要更长

# 检查节点是否真的启动了 (简易检查)
if ! kill -0 "$NODE_PID" > /dev/null 2>&1; then
  echo "错误：Hardhat 节点未能成功启动。请检查 hardhat_node.log。"
  exit 1
fi
echo "Hardhat 节点似乎已成功启动。"

# 4. 部署合约
echo ""
echo "--- 步骤 4: 部署智能合约到本地节点 ---"
DEPLOY_OUTPUT_FILE="deploy_output.log"
echo "部署输出将保存到 $DEPLOY_OUTPUT_FILE"

npx hardhat ignition deploy "$IGNITION_MODULE_PATH" --network "$NETWORK_NAME" > "$DEPLOY_OUTPUT_FILE" 2>&1

if [ $? -ne 0 ]; then
    echo "合约部署失败！详情请查看 $DEPLOY_OUTPUT_FILE。"
    cleanup_node # 部署失败时也尝试停止节点
    exit 1
fi
echo "合约部署成功！"

# 5. 提取并显示合约地址
CONTRACT_ADDRESS_LINE=$(grep "$EXPECTED_CONTRACT_NAME_IN_OUTPUT - " "$DEPLOY_OUTPUT_FILE")
CONTRACT_ADDRESS=$(echo "$CONTRACT_ADDRESS_LINE" | awk '{print $NF}')
echo ""
echo "--- 部署结果 ---"
if [ -z "$CONTRACT_ADDRESS" ] || [ "$CONTRACT_ADDRESS" = "to:" ]; then # 添加检查 "to:" 以防 grep 匹配不精确
    echo "错误：未能从部署输出中提取到 '$EXPECTED_CONTRACT_NAME_IN_OUTPUT' 的合约地址。"
    echo "请手动检查 $DEPLOY_OUTPUT_FILE 文件。"
else
    echo "合约 '$EXPECTED_CONTRACT_NAME_IN_OUTPUT' 已部署到地址: $CONTRACT_ADDRESS"
    echo "请将此地址更新到你的前端配置 (frontend/src/App.vue) 中。"
    # (可选) 自动将地址写入前端配置文件
    # FRONTEND_APP_VUE_PATH="./frontend/src/App.vue"
    # if [ -f "$FRONTEND_APP_VUE_PATH" ]; then
    #    sed -i.bak "s/const CROWDFUND_CONTRACT_ADDRESS = ref(\"[0-9a-zA-Zx]*\");/const CROWDFUND_CONTRACT_ADDRESS = ref(\"$CONTRACT_ADDRESS\");/" "$FRONTEND_APP_VUE_PATH"
    #    sed -i.bak "s/CROWDFUND_CONTRACT_ADDRESS\.value = \"[0-9a-zA-Zx]*\";/CROWDFUND_CONTRACT_ADDRESS.value = \"$CONTRACT_ADDRESS\";/" "$FRONTEND_APP_VUE_PATH"
    #    echo "尝试自动更新 $FRONTEND_APP_VUE_PATH 中的合约地址... (请验证更改)"
    # else
    #    echo "未找到 $FRONTEND_APP_VUE_PATH，无法自动更新地址。"
    # fi
fi

echo ""
echo "============================================="
echo "Hardhat 节点 (PID: $NODE_PID) 仍在后台运行。"
echo "你可以通过 'tail -f hardhat_node.log' 实时查看节点日志。"
echo "要停止 Hardhat 节点, 请运行: kill $NODE_PID"
echo "现在你可以在另一个终端启动前端开发服务器 (cd frontend && npm run dev)。"
echo "============================================="

# 脚本在这里结束，但后台的 Hardhat 节点会继续运行
# 用户需要手动 kill $NODE_PID 来停止它
# 或者，你可以让脚本在这里等待用户输入来决定是否停止节点：
# read -p "按 Enter 键停止 Hardhat 节点并退出脚本..."
# cleanup_node