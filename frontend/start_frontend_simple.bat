@echo off
REM Simple frontend starter without complex logic

cd /d "%~dp0"

echo Starting Frontend Service...
echo.

REM Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js not found!
    echo Please install Node.js 18+
    pause
    exit /b 1
)

REM Check dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    echo This may take a few minutes...
    npm install
    if errorlevel 1 (
        echo Installation failed!
        pause
        exit /b 1
    )
)

echo.
echo Starting development server...
echo Frontend will be available at http://localhost:3000
echo.

npm run dev

pause

