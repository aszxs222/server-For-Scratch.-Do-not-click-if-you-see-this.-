@echo off
chcp 65001 >nul
title 🪟 Windows硬件检测服务器
color 0F

echo ========================================
echo   Windows硬件检测服务器
echo   优化显示：win32 → Windows 10/11
echo ========================================
echo.

:: 检查Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ 未找到Node.js
    echo 请安装Node.js: https://nodejs.org
    pause
    exit /b 1
)

:: 显示系统信息
echo 系统信息：
echo 操作系统: Windows 10
echo 架构: 64位
echo.

:: 检查文件
if not exist "server_windows.js" (
    echo ❌ 错误：找不到server_windows.js
    echo 请确保文件在当前目录
    dir *.js
    pause
    exit /b 1
)

echo ✅ 准备就绪
echo 🚀 启动Windows优化服务器...
echo ========================================
echo.

:: 运行服务器
node server_windows.js

echo.
echo ========================================
echo 服务器已停止
echo ========================================
pause