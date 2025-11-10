@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
cls
echo ================================================
echo StructForge AI - Stop All Services (Conda)
echo ================================================
echo.

echo [Info] Stopping services...
echo.

REM Stop Backend Service
echo [Stop] Backend Service...
set "BACKEND_KILLED=0"

REM Find and kill cmd.exe processes with main.py in command line
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq cmd.exe" /FO LIST 2^>nul ^| findstr /I "PID:"') do (
    set "PID=%%a"
    set "PID=!PID:PID:=!"
    set "PID=!PID: =!"
    if defined PID (
        for /f "skip=1 delims=" %%b in ('wmic process where "ProcessId=!PID!" get CommandLine 2^>nul') do (
            set "CMD=%%b"
            if defined CMD (
                echo !CMD! | findstr /I /C:"main.py" >nul
                if !errorlevel! equ 0 (
                    echo   Closing Backend window (PID: !PID!)...
                    taskkill /PID !PID! /T /F >nul 2>&1
                    set "BACKEND_KILLED=1"
                )
            )
        )
    )
)

REM Kill Python processes running main.py
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq python.exe" /FO LIST 2^>nul ^| findstr /I "PID:"') do (
    set "PID=%%a"
    set "PID=!PID:PID:=!"
    set "PID=!PID: =!"
    if defined PID (
        for /f "skip=1 delims=" %%b in ('wmic process where "ProcessId=!PID!" get CommandLine 2^>nul') do (
            set "CMD=%%b"
            if defined CMD (
                echo !CMD! | findstr /I /C:"main.py" >nul
                if !errorlevel! equ 0 (
                    echo   Killing Python process (PID: !PID!)...
                    taskkill /PID !PID! /T /F >nul 2>&1
                    set "BACKEND_KILLED=1"
                )
            )
        )
    )
)

if !BACKEND_KILLED! equ 0 (
    echo   No Backend process found.
) else (
    echo   Backend service stopped.
)

echo.

REM Stop Frontend Service
echo [Stop] Frontend Service...
set "FRONTEND_KILLED=0"

REM Find and kill cmd.exe processes with npm run dev in command line
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq cmd.exe" /FO LIST 2^>nul ^| findstr /I "PID:"') do (
    set "PID=%%a"
    set "PID=!PID:PID:=!"
    set "PID=!PID: =!"
    if defined PID (
        for /f "skip=1 delims=" %%b in ('wmic process where "ProcessId=!PID!" get CommandLine 2^>nul') do (
            set "CMD=%%b"
            if defined CMD (
                echo !CMD! | findstr /I /C:"npm run dev" /C:"npm.cmd run dev" >nul
                if !errorlevel! equ 0 (
                    echo   Closing Frontend window (PID: !PID!)...
                    taskkill /PID !PID! /T /F >nul 2>&1
                    set "FRONTEND_KILLED=1"
                )
            )
        )
    )
)

REM Kill Node processes running vite
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq node.exe" /FO LIST 2^>nul ^| findstr /I "PID:"') do (
    set "PID=%%a"
    set "PID=!PID:PID:=!"
    set "PID=!PID: =!"
    if defined PID (
        for /f "skip=1 delims=" %%b in ('wmic process where "ProcessId=!PID!" get CommandLine 2^>nul') do (
            set "CMD=%%b"
            if defined CMD (
                echo !CMD! | findstr /I /C:"vite" /C:"node_modules" >nul
                if !errorlevel! equ 0 (
                    echo   Killing Node.js process (PID: !PID!)...
                    taskkill /PID !PID! /T /F >nul 2>&1
                    set "FRONTEND_KILLED=1"
                )
            )
        )
    )
)

if !FRONTEND_KILLED! equ 0 (
    echo   No Frontend process found.
) else (
    echo   Frontend service stopped.
)

echo.

REM Wait a moment for processes to terminate
timeout /t 1 /nobreak >nul

echo ================================================
echo Service Status
echo ================================================
echo.

REM Check if services are still running
set "PYTHON_RUNNING=0"
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq python.exe" /FO LIST 2^>nul ^| findstr /I "PID:"') do (
    set "PID=%%a"
    set "PID=!PID:PID:=!"
    set "PID=!PID: =!"
    if defined PID (
        for /f "skip=1 delims=" %%b in ('wmic process where "ProcessId=!PID!" get CommandLine 2^>nul') do (
            set "CMD=%%b"
            if defined CMD (
                echo !CMD! | findstr /I /C:"main.py" >nul
                if !errorlevel! equ 0 (
                    set "PYTHON_RUNNING=1"
                )
            )
        )
    )
)

set "NODE_RUNNING=0"
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq node.exe" /FO LIST 2^>nul ^| findstr /I "PID:"') do (
    set "PID=%%a"
    set "PID=!PID:PID:=!"
    set "PID=!PID: =!"
    if defined PID (
        for /f "skip=1 delims=" %%b in ('wmic process where "ProcessId=!PID!" get CommandLine 2^>nul') do (
            set "CMD=%%b"
            if defined CMD (
                echo !CMD! | findstr /I /C:"vite" >nul
                if !errorlevel! equ 0 (
                    set "NODE_RUNNING=1"
                )
            )
        )
    )
)

if !PYTHON_RUNNING! equ 1 (
    echo [Warning] Backend Python process may still be running.
    echo   Please close the window manually or use Task Manager.
) else (
    echo [OK] Backend service stopped.
)

if !NODE_RUNNING! equ 1 (
    echo [Warning] Frontend Node.js process may still be running.
    echo   Please close the window manually or use Task Manager.
) else (
    echo [OK] Frontend service stopped.
)

echo.
echo ================================================
echo All services stopped!
echo ================================================
echo.
echo If windows are still open:
echo   1. Close them manually (click X button)
echo   2. Or use Task Manager to end processes
echo.
pause
