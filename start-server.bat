@echo off
title IntellMeet - Enterprise Meeting & AI Collaboration Platform
color 0B
cls

echo ================================================================
echo      INTELLMEET - AI Enterprise Meeting Platform Launcher
echo ================================================================
echo.

cd /d "%~dp0"

:: 1. Launch Backend API & WebSockets (Port 5000)
echo [1/3] Launching IntellMeet API & WebRTC Signaling Server (Port 5000)...
start "IntellMeet API (Port 5000)" cmd /k "color 0D && echo IntellMeet API running on http://localhost:5000 && npm.cmd run dev:api"

:: 2. Launch Vite Frontend SPA (Port 5173)
echo [2/3] Launching IntellMeet Web Frontend (Port 5173)...
start "IntellMeet Web (Port 5173)" cmd /k "color 0A && echo IntellMeet Web running on http://localhost:5173 && npm.cmd run dev:web"

:: 3. Wait for Vite server and open browser
echo [3/3] Waiting for servers to initialize and launching browser...
powershell -NoProfile -Command "for ($i=0; $i -lt 30; $i++) { $t = Test-NetConnection -Port 5173 -ComputerName 127.0.0.1 -WarningAction SilentlyContinue; if ($t.TcpTestSucceeded) { break }; Start-Sleep -Milliseconds 500 }"
start http://localhost:5173

echo.
echo ================================================================
echo   SUCCESS! IntellMeet is online.
echo.
echo   Frontend URL:   http://localhost:5173
echo   Backend API:    http://localhost:5000
echo   Health Check:   http://localhost:5000/api/v1/health
echo.
echo   Demo Credentials:
echo   - Email:     alex.chen@intellmeet.com
echo   - Password:  Password123!
echo   (Or click '1-Click Demo' on the Sign-In page)
echo.
echo   To stop the platform, run stop-server.bat
echo ================================================================
echo.
pause
