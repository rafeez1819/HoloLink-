@echo off
title sharing.ai — Build Windows EXE
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 ( echo [ERROR] npm install failed & pause & exit /b %errorlevel% )
echo Building Windows installer...
call npm run dist
if %errorlevel% neq 0 ( echo [ERROR] Build failed & pause & exit /b %errorlevel% )
echo [OK] Build complete. Check the 'dist' folder for the installer.
pause
