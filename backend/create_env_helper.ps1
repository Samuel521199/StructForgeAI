# Helper script to create/update .env file
param(
    [Parameter(Mandatory=$true)]
    [string]$EnvFile,
    [Parameter(Mandatory=$true)]
    [string]$EnvExample,
    [Parameter(Mandatory=$true)]
    [string]$AiProvider,
    [Parameter(Mandatory=$true)]
    [string]$AiModel,
    [Parameter(Mandatory=$true)]
    [string]$AiUrl,
    [Parameter(Mandatory=$false)]
    [string]$OpenAiKey
)

try {
    # Copy template if .env doesn't exist
    if (-not (Test-Path $EnvFile)) {
        if (-not (Test-Path $EnvExample)) {
            Write-Error "Template file not found: $EnvExample" -ErrorAction Stop
        }
        Copy-Item $EnvExample $EnvFile -Force
    }
    
    # Read content
    $content = Get-Content $EnvFile -Raw -ErrorAction Stop
    
    # Update configuration
    $content = $content -replace 'AI_MODEL_PROVIDER=.*', "AI_MODEL_PROVIDER=$AiProvider"
    $content = $content -replace 'AI_MODEL_NAME=.*', "AI_MODEL_NAME=$AiModel"
    $content = $content -replace 'AI_BASE_URL=.*', "AI_BASE_URL=$AiUrl"
    
    # Handle OpenAI API key (only if provided and not empty)
    if ($AiProvider -eq 'openai' -and $PSBoundParameters.ContainsKey('OpenAiKey') -and $OpenAiKey -ne '' -and $null -ne $OpenAiKey) {
        $content = $content -replace '(?m)^# OPENAI_API_KEY=.*', "OPENAI_API_KEY=$OpenAiKey"
        if ($content -notmatch 'OPENAI_API_KEY=') {
            $content += "`r`nOPENAI_API_KEY=$OpenAiKey"
        }
    }
    
    # Write back
    Set-Content -Path $EnvFile -Value $content -NoNewline -Encoding UTF8
    
    # Verify the file was written correctly
    if (Test-Path $EnvFile) {
        $verifyContent = Get-Content $EnvFile -Raw
        if ($verifyContent -match "AI_MODEL_PROVIDER=$AiProvider") {
            # Success - exit with code 0 (no output to avoid confusion)
            exit 0
        } else {
            # Verification failed
            exit 1
        }
    } else {
        # File not created
        exit 1
    }
} catch {
    # Error occurred - exit with code 1 (no output to avoid confusion)
    exit 1
}

