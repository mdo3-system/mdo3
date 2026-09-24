@echo off
chcp 65001 > nul
echo ========================================================
echo  Deploying mdo3.com Core Portal to XServer
echo  Target: /home/mdo3/mdo3.com/public_html/
echo ========================================================

scp -o BatchMode=yes -P 10022 -r "%~dp0..\public\*" mdo3@mdo3.xsrv.jp:/home/mdo3/mdo3.com/public_html/

if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Deploy to mdo3.com completed successfully!
) else (
    echo [ERROR] Deploy failed with error level %ERRORLEVEL%.
)
pause
