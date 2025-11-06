@echo off
chcp 65001 >nul
REM ============================================
REM StructForge AI - AI Configuration Quick Setup
REM ============================================
echo.
echo ============================================
echo StructForge AI - AI Configuration Quick Setup
echo ============================================
echo.

REM Find project root directory dynamically
REM Method 1: Use script's own directory (if script is in project root)
set SCRIPT_DIR=%~dp0
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

REM Method 2: Check current directory
set PROJECT_ROOT=
set CURRENT_DIR=%CD%

REM Check if script's directory is project root
if exist "%SCRIPT_DIR%\backend" (
    set PROJECT_ROOT=%SCRIPT_DIR%
    goto :found_root
)

REM Check if current directory is project root
if exist "backend" (
    set PROJECT_ROOT=%CD%
    goto :found_root
)

REM Method 3: Search upward from current directory
set SEARCH_DIR=%CD%
:search_up
if exist "%SEARCH_DIR%\backend" (
    set PROJECT_ROOT=%SEARCH_DIR%
    goto :found_root
)
if "%SEARCH_DIR%"=="%SEARCH_DIR:~0,3%" goto :not_found
cd ..
set SEARCH_DIR=%CD%
cd "%CURRENT_DIR%"
goto :search_up

:not_found
REM If not found, ask user for path
echo [WARNING] Cannot find project root directory automatically
echo.
echo Current directory: %CURRENT_DIR%
echo Script directory: %SCRIPT_DIR%
echo.
echo Please enter the project root directory path:
echo (The directory should contain a "backend" folder)
set /p USER_PROJECT_ROOT="Project path: "

if "%USER_PROJECT_ROOT%"=="" (
    echo [ERROR] No path provided
    echo.
    pause
    exit /b 1
)

REM Remove trailing backslash if present
if "%USER_PROJECT_ROOT:~-1%"=="\" set USER_PROJECT_ROOT=%USER_PROJECT_ROOT:~0,-1%

if exist "%USER_PROJECT_ROOT%\backend" (
    set PROJECT_ROOT=%USER_PROJECT_ROOT%
    goto :found_root
) else (
    echo [ERROR] Invalid project path: %USER_PROJECT_ROOT%
    echo.
    echo Please ensure the path contains a "backend" directory.
    echo.
    pause
    exit /b 1
)

:found_root
REM Always use absolute paths to avoid directory change issues
if not "%PROJECT_ROOT%"=="" (
    echo [INFO] Found project root: %PROJECT_ROOT%
    echo [INFO] Using absolute paths for file operations
    echo.
    
    REM Set absolute paths
    set ENV_FILE=%PROJECT_ROOT%\backend\.env
    set ENV_EXAMPLE=%PROJECT_ROOT%\backend\.env.example
    
    REM Try to change directory (optional, for relative path operations)
    if not "%PROJECT_ROOT%"=="%CD%" (
        cd /d "%PROJECT_ROOT%" 2>nul
        if errorlevel 1 (
            echo [INFO] Staying in current directory, using absolute paths
        ) else (
            echo [OK] Changed to project root: %CD%
        )
        echo.
    )
) else (
    REM Fallback to relative paths if project root not found
    set ENV_FILE=backend\.env
    set ENV_EXAMPLE=backend\.env.example
    echo [WARNING] Using relative paths (project root not found)
    echo.
)

REM Check if .env.example exists, if not create it
if not exist "%ENV_EXAMPLE%" (
    echo [INFO] Configuration template not found, creating one...
    echo.
    
    REM Create .env.example file using PowerShell for better encoding
    powershell -NoProfile -Command "$content = @'`n# StructForge AI - Environment Configuration Template`n# Copy this file to .env and modify the values as needed`n`n# AI Model Configuration`nAI_MODEL_PROVIDER=ollama`nAI_MODEL_NAME=qwen2.5:7b-q4_0`nAI_BASE_URL=http://localhost:11434`nAI_TEMPERATURE=0.7`nAI_MAX_TOKENS=2048`n`n# OpenAI API Key (if using OpenAI)`n# OPENAI_API_KEY=your_api_key_here`n`n# Vector Database`nVECTOR_DB_TYPE=chromadb`n`n# Workflow`nWORKFLOW_ENGINE=prefect`nWORKFLOW_STORAGE_TYPE=json`n`n# Logging`nLOG_LEVEL=INFO`nDEBUG=True`n'@; Set-Content -Path '%ENV_EXAMPLE%' -Value $content -Encoding UTF8"
    
    if exist "%ENV_EXAMPLE%" (
        echo [OK] Created configuration template: %ENV_EXAMPLE%
        echo.
    ) else (
        echo [ERROR] Failed to create configuration template
        echo.
        echo Please manually create backend\.env.example file
        echo.
        pause
        exit /b 1
    )
)

REM Check if .env already exists
if exist "%ENV_FILE%" (
    echo [WARNING] .env file already exists
    echo.
    echo The file %ENV_FILE% already exists.
    echo.
    choice /C YN /N /M "Do you want to overwrite it? (Y/N)"
    if errorlevel 2 (
        echo.
        echo Operation cancelled
        pause
        exit /b 0
    )
    echo.
)

echo.
echo ============================================
echo Select AI Provider
echo ============================================
echo.
echo   1. Ollama
echo      - Recommended for local execution
echo      - Requires Ollama installed and running
echo      - Default port: 11434
echo.
echo   2. LM Studio
echo      - Graphical interface, easy to use
echo      - Requires LM Studio installed and server running
echo      - Default port: 1234
echo.
echo   3. OpenAI
echo      - Online service, no local installation needed
echo      - Requires OpenAI API key
echo      - Paid service
echo.
echo ============================================
echo.
echo Please type 1, 2, or 3 and press Enter:
choice /C 123 /N /M "Your choice"

if errorlevel 3 goto :openai
if errorlevel 2 goto :lmstudio
if errorlevel 1 goto :ollama

:ollama
echo.
echo Configuring Ollama...
set AI_PROVIDER=ollama
set AI_MODEL=qwen2.5:7b-q4_0
set AI_URL=http://localhost:11434
set OPENAI_KEY=
goto :create_env

:lmstudio
echo.
echo Configuring LM Studio...
set AI_PROVIDER=lmstudio
set AI_MODEL=qwen2.5-7b-instruct
set AI_URL=http://localhost:1234
set OPENAI_KEY=
goto :create_env

:openai
echo.
echo Configuring OpenAI...
set AI_PROVIDER=openai
set AI_MODEL=gpt-3.5-turbo
set AI_URL=https://api.openai.com/v1
echo.
set /p OPENAI_KEY="Please enter your OpenAI API Key: "
goto :create_env

:create_env
echo.
echo Creating .env file...

REM Use PowerShell helper script to create/update .env file
if "%PROJECT_ROOT%"=="" (
    set HELPER_SCRIPT=backend\create_env_helper.ps1
) else (
    set HELPER_SCRIPT=%PROJECT_ROOT%\backend\create_env_helper.ps1
)

REM Call PowerShell helper script (script should already exist)
if exist "%HELPER_SCRIPT%" (
    REM Suppress PowerShell output but capture exit code
    REM Note: PowerShell exit code is captured via %errorlevel% immediately after call
    REM Build base command
    set "PS_BASE=powershell -NoProfile -ExecutionPolicy Bypass -File \"%HELPER_SCRIPT%\" -EnvFile \"%ENV_FILE%\" -EnvExample \"%ENV_EXAMPLE%\" -AiProvider \"%AI_PROVIDER%\" -AiModel \"%AI_MODEL%\" -AiUrl \"%AI_URL%\""
    
    REM Add OpenAiKey only if AI_PROVIDER is openai and OPENAI_KEY is not empty
    REM Use string comparison to avoid variable expansion issues
    set "PS_CMD=%PS_BASE%"
    if "%AI_PROVIDER%"=="openai" (
        if not "%OPENAI_KEY%"=="" (
            set "PS_CMD=%PS_BASE% -OpenAiKey \"%OPENAI_KEY%\""
        )
    )
    
    REM Execute command
    %PS_CMD% >nul 2>&1
    
    REM Capture exit code immediately
    set PS_RESULT=%errorlevel%
    
    REM Verify file was created/updated successfully
    if %PS_RESULT% == 0 (
        if exist "%ENV_FILE%" (
            REM Check if file contains expected content
            findstr /C:"AI_MODEL_PROVIDER=%AI_PROVIDER%" "%ENV_FILE%" >nul 2>&1
            if errorlevel 1 (
                set PS_RESULT=1
            )
        ) else (
            set PS_RESULT=1
        )
    )
) else (
    echo [ERROR] PowerShell helper script not found: %HELPER_SCRIPT%
    echo [INFO] Please ensure the helper script exists
    echo.
    set PS_RESULT=1
)

if %PS_RESULT% == 0 (
    echo [OK] .env file created successfully
    echo.
    echo Configuration:
    echo   AI Provider: %AI_PROVIDER%
    echo   Model Name: %AI_MODEL%
    echo   Service URL: %AI_URL%
    if "%AI_PROVIDER%"=="openai" (
        echo   API Key: Set
    )
    echo.
    echo File location: %ENV_FILE%
    echo.
) else (
    echo [ERROR] Failed to create .env file
    echo.
    echo Please manually copy %ENV_EXAMPLE% to %ENV_FILE% and modify configuration
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo Configuration Complete!
echo ============================================
echo.
echo Next steps:
echo   1. Ensure AI service is running
echo   2. Run test_ai_service.bat to verify connection
echo   3. Start backend service
echo.
pause

