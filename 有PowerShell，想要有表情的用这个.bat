@echo off
chcp 65001 >nul
title 表情终端版
color 0A

echo ========================================
echo    🎨 硬件检测服务器 - 表情终端版
echo ========================================
echo.
echo 📢 注意：需要 Windows Terminal
echo 📢 才能显示表情和颜色
echo.

:: 检查Windows Terminal
where wt >nul 2>nul
if errorlevel 1 (
    echo ❌ 错误：Windows Terminal 未安装
    echo.
    echo 💡 请从 Microsoft Store 安装
    echo.
    echo 📝 或使用 CMD版本：双击 cmd_version.bat
    echo.
    pause
    exit /b 1
)

echo ✅ 检测到 Windows Terminal
echo 🚀 正在创建表情版脚本...
echo.

:: 方法：使用单独文件创建，避免转义
(
echo # 硬件检测服务器 - 表情版
echo `$host.UI.RawUI.WindowTitle = "🎨 硬件检测"
echo Clear-Host
echo Write-Host "硬件检测服务器 - 表情终端版" -ForegroundColor Cyan
echo Write-Host "==============================" -ForegroundColor Cyan
echo Write-Host ""
echo Write-Host "📁 目录: `$PWD" -ForegroundColor Gray
echo Write-Host ""
echo Write-Host "🔍 检查文件中..." -ForegroundColor Yellow
echo if (-not (Test-Path "server_windows.js")) {
echo     Write-Host "❌ 错误：找不到 server_windows.js" -ForegroundColor Red
echo     Write-Host "📁 当前JS文件：" -ForegroundColor Yellow
echo     dir *.js
echo     pause
echo     exit
echo }
echo Write-Host "✅ 文件检查通过" -ForegroundColor Green
echo ""
echo Write-Host "🔍 检查Node.js..." -ForegroundColor Yellow
echo try {
echo     `$ver = node --version
echo     Write-Host "✅ Node.js: `$ver" -ForegroundColor Green
echo } catch {
echo     Write-Host "❌ Node.js 未安装" -ForegroundColor Red
echo     Write-Host "🌐 请访问: https://nodejs.org" -ForegroundColor Yellow
echo     pause
echo     exit
echo }
echo ""
echo Write-Host "🚀 启动服务器..." -ForegroundColor Green
echo Write-Host "📡 端口: 29275" -ForegroundColor Cyan
echo Write-Host "🌐 地址: http://127.0.0.1:29275" -ForegroundColor Cyan
echo Write-Host "🎮 Scratch扩展: scratch_extension.js" -ForegroundColor Cyan
echo Write-Host "────────────────────────────────" -ForegroundColor DarkGray
echo Write-Host ""
echo node server_windows.js
echo ""
echo Write-Host "🛑 服务器已停止" -ForegroundColor Yellow
echo pause
) > temp_script.ps1

:: 重命名文件，避免特殊字符
ren temp_script.ps1 emoji_launcher.ps1

echo ✅ 脚本创建成功: emoji_launcher.ps1
echo.

:: 启动Windows Terminal
echo 🚀 正在启动 Windows Terminal...
start "" wt.exe new-tab --title "🎨 硬件检测" powershell.exe -NoExit -File "emoji_launcher.ps1"

echo 📝 启动中... 请稍候
timeout /t 5 >nul

echo ✅ 完成！
echo.
echo 💡 提示：以后可以直接运行 emoji_launcher.ps1
echo 💡 右键 → 使用Windows Terminal运行
echo.
pause
exit