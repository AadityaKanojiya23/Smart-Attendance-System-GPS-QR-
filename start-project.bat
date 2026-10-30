@echo off
title Smart Attendance App Launcher
color 0A
echo ============================================================
echo        Smart Attendance System - Starting Servers
echo ============================================================
echo.

cd /d "%~dp0"

echo 1. Starting Backend API Server (Port 5000)...
start "Backend API Server (Port 5000)" cmd /k "cd /d "%~dp0artifacts\api-server" && title Backend API Server && set PORT=5000 && node dist/index.mjs"

echo 2. Starting Expo Mobile Dev Server (Port 8081)...
start "Expo Dev Server (Port 8081)" cmd /k "cd /d "%~dp0artifacts\mobile" && title Expo Dev Server && npx expo start -c"

echo.
echo ============================================================
echo Both servers have been launched in separate terminal windows!
echo - Scan the QR code shown in the Expo window with Expo Go.
echo - Web version is available at: http://localhost:8081
echo ============================================================
echo.
pause
