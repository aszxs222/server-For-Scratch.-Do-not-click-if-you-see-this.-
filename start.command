#!/bin/bash
# start.command - macOS 启动脚本

# 设置中文字符集
export LANG="zh_CN.UTF-8"
export LC_ALL="zh_CN.UTF-8"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 清屏
clear

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}   硬件检测服务器 - macOS 版本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 未找到 Node.js${NC}"
    echo "请安装 Node.js: https://nodejs.org"
    echo "或使用 Homebrew: brew install node"
    open "https://nodejs.org"
    exit 1
fi

# 显示 Node.js 版本
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js 版本: $NODE_VERSION${NC}"

# 检查系统
echo ""
echo -e "${YELLOW}🖥️  系统信息:${NC}"
echo "操作系统: $(sw_vers -productName) $(sw_vers -productVersion)"
echo "架构: $(uname -m)"
echo ""

# 检查文件
if [ ! -f "server_unix.js" ]; then
    echo -e "${RED}❌ 错误: 找不到 server_unix.js${NC}"
    echo "请确保文件在当前目录: $(pwd)"
    echo ""
    ls -la *.js
    echo ""
    read -p "按回车键退出..."
    exit 1
fi

echo -e "${GREEN}✅ 服务器文件就绪${NC}"
echo ""
echo -e "${YELLOW}🚀 启动服务器...${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 设置环境变量
export NODE_ENV=production

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 检测到首次运行，正在检查依赖...${NC}"
    
    # 检查是否安装了 systeminformation
    if npm list systeminformation 2>&1 | grep -q "systeminformation"; then
        echo -e "${GREEN}✅ 依赖已安装${NC}"
    else
        echo -e "${YELLOW}🔧 安装依赖 (可能需要几分钟)...${NC}"
        npm install systeminformation --silent
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ 依赖安装成功${NC}"
        else
            echo -e "${YELLOW}⚠️  依赖安装失败，使用基础模式${NC}"
        fi
    fi
fi

# 启动服务器
echo ""
echo -e "${GREEN}✅ 启动服务器进程...${NC}"
echo ""

# 检查端口是否被占用
if lsof -Pi :29275 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  端口 29275 已被占用${NC}"
    echo -e "${YELLOW}正在查找可用端口...${NC}"
    
    # 寻找可用端口
    for port in {29276..29300}; do
        if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
            echo -e "${GREEN}✅ 使用端口: $port${NC}"
            # 修改服务器端口
            sed -i '' "s/const PORT = 29275;/const PORT = $port;/" server_unix.js
            break
        fi
    done
fi

# 运行服务器
node server_unix.js

# 服务器停止后的处理
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${YELLOW}服务器已停止${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
read -p "按回车键退出..."