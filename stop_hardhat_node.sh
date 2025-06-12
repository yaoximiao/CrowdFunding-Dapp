#!/bin/bash

# stop_hardhat_node.sh
# 脚本功能: 查找并停止在指定端口上运行的 Hardhat Node 进程

PORT_TO_KILL=8545
PROCESS_NAME_HINT="hardhat" # 用于更精确地识别进程，可选

echo "正在查找在端口 $PORT_TO_KILL 上监听的进程..."

# 使用 lsof 查找进程 PID
# -i :$PORT_TO_KILL  查找使用此端口的进程
# -sTCP:LISTEN       只查找处于 TCP LISTEN 状态的进程
# -t                 只输出 PID
PID=$(lsof -i :$PORT_TO_KILL -sTCP:LISTEN -t)

if [ -z "$PID" ]; then
  echo "在端口 $PORT_TO_KILL 上没有找到正在监听的进程。"
  exit 0
fi

echo "找到以下 PID 在端口 $PORT_TO_KILL 上监听: $PID"

# （可选）进一步确认是否是 Hardhat 进程
# 遍历所有找到的 PID (lsof 可能返回多个，尽管对于特定端口的 LISTEN 通常只有一个)
for p in $PID; do
  PROCESS_INFO=$(ps -p "$p" -o comm=) # 获取进程名
  echo "PID $p 的进程名是: $PROCESS_INFO"

  # 如果提供了进程名提示，进行匹配
  if [ -n "$PROCESS_NAME_HINT" ]; then
    if [[ "$PROCESS_INFO" == *"$PROCESS_NAME_HINT"* || "$PROCESS_INFO" == "node" ]]; then # "node" 是因为 npx hardhat node 本质是node进程
      echo "进程 $p (名称: $PROCESS_INFO) 看起来是一个目标进程。正在尝试停止它..."
      kill "$p"
      # 等待一段时间让进程退出
      sleep 2
      if kill -0 "$p" > /dev/null 2>&1; then
        echo "PID $p 未能通过 kill 正常停止。尝试强制停止 (kill -9)..."
        kill -9 "$p"
        sleep 1
        if kill -0 "$p" > /dev/null 2>&1; then
          echo "错误：未能停止 PID $p。"
        else
          echo "PID $p 已被强制停止。"
        fi
      else
        echo "PID $p 已成功停止。"
      fi
    else
      echo "进程 $p (名称: $PROCESS_INFO) 与提示 '$PROCESS_NAME_HINT' 不符，跳过。"
    fi
  else
    # 如果没有进程名提示，直接杀死所有找到的 PID (谨慎)
    echo "没有提供进程名提示，将尝试停止 PID $p..."
    kill "$p"
    sleep 2
    if kill -0 "$p" > /dev/null 2>&1; then
        echo "PID $p 未能通过 kill 正常停止。尝试强制停止 (kill -9)..."
        kill -9 "$p"
        sleep 1
         if kill -0 "$p" > /dev/null 2>&1; then
          echo "错误：未能停止 PID $p。"
        else
          echo "PID $p 已被强制停止。"
        fi
    else
        echo "PID $p 已成功停止。"
    fi
  fi
done

echo "脚本执行完毕。"