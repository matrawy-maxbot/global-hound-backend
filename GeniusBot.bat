@echo off
title Starting Dev Environment with Docker check

:: =============================================
:: تعريف مسارات المشاريع
:: =============================================
set "LAWLaw_PATH=C:\Users\moham\OneDrive\Desktop\lawlaw"
set "DISCORD_API_PATH=C:\Users\moham\OneDrive\Desktop\DiscordBotAPI"
set "DASHBOARD_NEXT_PATH=D:\workshop\genius-next\dashboard-next"
set "OWNERS_DASHBOARD_PATH=C:\Users\moham\OneDrive\Desktop\geniusBot_ownersDashboard"

:: =============================================
:: التحقق من Docker وتشغيله إذا لزم الأمر
:: =============================================
echo Checking Docker...

docker version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Docker is already running ✓
    goto :docker_ok
)

echo Docker not running. Starting Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

echo Waiting for Docker to be fully ready (may take 30-120 seconds)...
set "RETRIES=0"
set "MAX_RETRIES=80"   :: ~8 دقايق كحد أقصى

:wait_loop
timeout /t 6 >nul

docker version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Docker is now fully ready ✓
    goto :docker_ok
)

set /a RETRIES+=1
if %RETRIES% LSS %MAX_RETRIES% (
    echo Still waiting... attempt %RETRIES%/%MAX_RETRIES%
    goto :wait_loop
)

echo.
echo [ERROR] Docker did NOT start after ~8 minutes!
echo Please start Docker Desktop manually and check for errors.
echo (Common reasons: WSL2 issues, antivirus, low resources, old version)
pause
exit /b 1

:docker_ok
:: =============================================
:: باقي الكود (فتح المجلدات + VS Code + Terminal)
:: =============================================
echo.
start explorer "%LAWLaw_PATH%"
start explorer "%DISCORD_API_PATH%"
start explorer "%DASHBOARD_NEXT_PATH%"
start explorer "%OWNERS_DASHBOARD_PATH%"

cmd /c start "" "%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe" "%LAWLaw_PATH%"
cmd /c start "" "%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe" "%DISCORD_API_PATH%"
cmd /c start "" "%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe" "%DASHBOARD_NEXT_PATH%"
cmd /c start "" "%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe" "%OWNERS_DASHBOARD_PATH%"

echo.
echo =============================================
echo Starting development tabs...
echo.

wt ^
  --title "lawlaw"         -d "%LAWLaw_PATH%"         powershell -NoExit -Command "npm start" ; ^
  new-tab --title "DiscordBotAPI" -d "%DISCORD_API_PATH%"    powershell -NoExit -Command "npm start" ; ^
  new-tab --title "dashboard-next" -d "%DASHBOARD_NEXT_PATH%" powershell -NoExit -Command "npm run dev" ; ^
  new-tab --title "ownersDashboard" -d "%OWNERS_DASHBOARD_PATH%" powershell -NoExit -Command "npm run dev"

echo.
echo Development environment is READY 🚀
echo.

exit