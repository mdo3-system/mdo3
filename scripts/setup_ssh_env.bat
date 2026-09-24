@echo off
chcp 65001 > nul
echo ========================================================
echo  mdo3 SSH & Git Environment Setup (Windows)
echo ========================================================
powershell -ExecutionPolicy Bypass -File "%~dp0setup_ssh_env.ps1"
pause
