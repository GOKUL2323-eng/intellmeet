@echo off
title Stop IntellMeet Services
color 0C
cls

echo ================================================================
echo               Stopping IntellMeet Platform Services
echo ================================================================
echo.

echo Stopping processes listening on Port 5000 (API Server)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Stopping processes listening on Port 5173 (Web Client)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo All IntellMeet services have been terminated safely.
echo.
pause
