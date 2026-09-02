# verify-all.ps1 — Khidmat Project Verification Script
# Runs dependency checks, typechecks, builds, and endpoint tests.
# Exit code 0 = all PASS, 1 = at least one FAIL.

param(
    [switch]$SkipBuild,
    [switch]$SkipServer
)

$ErrorActionPreference = "Continue"
$script:results = @()
$script:allPassed = $true

function Write-Check {
    param([string]$Name, [bool]$Passed, [string]$Detail = "")
    $status = if ($Passed) { "PASS" } else { "FAIL" }
    $icon = if ($Passed) { "[OK]" } else { "[!!]" }
    $script:results += [PSCustomObject]@{ Name = $Name; Status = $status; Detail = $Detail }
    if (-not $Passed) { $script:allPassed = $false }
    if ($Passed) {
        Write-Host "  $icon  $Name  $status" -ForegroundColor Green
    } else {
        Write-Host "  $icon  $Name  $status" -ForegroundColor Red
    }
    if ($Detail) { Write-Host "       $Detail" -ForegroundColor DarkGray }
}

function Test-PathAny {
    # Test if ANY of the given paths exists
    foreach ($p in $args) {
        if (Test-Path $p) { return $true }
    }
    return $false
}

$root = Split-Path -Parent $PSScriptRoot
$webDir = $root
$mobileDir = Join-Path $root "mobile"
$agentDir = Join-Path (Join-Path $root "mobile") "agent-server"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Khidmat Project Verification" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# -------------------------------------------------------
# 1. PREREQUISITES
# -------------------------------------------------------
Write-Host "--- Prerequisites ---" -ForegroundColor Yellow

$nodeVersion = & node --version 2>&1
$nodeOk = $LASTEXITCODE -eq 0
Write-Check "Node.js installed" $nodeOk "$nodeVersion"

if ($nodeOk) {
    $v = ($nodeVersion -replace '^v', '') -split '\.'
    $major = [int]$v[0]
    $nodeGte20 = $major -ge 20
    Write-Check "Node.js >= 20" $nodeGte20 "Detected: $nodeVersion"
}

$npmVersion = & npm --version 2>&1
$npmOk = $LASTEXITCODE -eq 0
Write-Check "npm installed" $npmOk "$npmVersion"

Write-Host ""

# -------------------------------------------------------
# 2. CONFIGURATION FILES EXIST
# -------------------------------------------------------
Write-Host "--- Configuration Files ---" -ForegroundColor Yellow

$rootPkgExists = Test-Path (Join-Path $root "package.json")
Write-Check "Root package.json" $rootPkgExists

$viteConfigExists = Test-PathAny (Join-Path $root "vite.config.ts") (Join-Path $root "vite.config.js") (Join-Path $root "vite.config.mts")
Write-Check "vite.config.*" $viteConfigExists

$tsconfigExists = Test-PathAny (Join-Path $root "tsconfig.json") (Join-Path $root "tsconfig.app.json")
Write-Check "tsconfig.json" $tsconfigExists

$indexHtmlExists = Test-Path (Join-Path $root "index.html")
Write-Check "Root index.html" $indexHtmlExists

$tailwindConfigExists = Test-Path (Join-Path $root "tailwind.config.js")
Write-Check "tailwind.config.js" $tailwindConfigExists

$mobilePkgExists = Test-Path (Join-Path $mobileDir "package.json")
Write-Check "mobile/package.json" $mobilePkgExists

$appJsonExists = Test-PathAny (Join-Path $mobileDir "app.json") (Join-Path $mobileDir "app.config.js") (Join-Path $mobileDir "app.config.ts")
Write-Check "mobile/app.json or app.config.*" $appJsonExists

$metroConfigExists = Test-PathAny (Join-Path $mobileDir "metro.config.js") (Join-Path $mobileDir "metro.config.ts")
Write-Check "mobile/metro.config.*" $metroConfigExists

$babelConfigExists = Test-Path (Join-Path $mobileDir "babel.config.js")
Write-Check "mobile/babel.config.js" $babelConfigExists

$agentPkgExists = Test-Path (Join-Path $agentDir "package.json")
Write-Check "mobile/agent-server/package.json" $agentPkgExists

Write-Host ""

# -------------------------------------------------------
# 3. DEPENDENCY INSTALLATION
# -------------------------------------------------------
Write-Host "--- Dependency Installation ---" -ForegroundColor Yellow

if ($rootPkgExists) {
    $rootNodeModules = Test-Path (Join-Path $root "node_modules")
    Write-Check "Web node_modules exist" $rootNodeModules

    if (-not $rootNodeModules) {
        Write-Host "       Installing web dependencies..." -ForegroundColor DarkYellow
        Push-Location $root
        & npm install 2>&1 | Out-Null
        $webInstallOk = $LASTEXITCODE -eq 0
        Pop-Location
        Write-Check "Web npm install" $webInstallOk
    }
} else {
    Write-Check "Web dependencies" $false "Skipped — root package.json missing (Agent 1 scope)"
}

if ($mobilePkgExists) {
    $mobileNodeModules = Test-Path (Join-Path $mobileDir "node_modules")
    Write-Check "Mobile node_modules exist" $mobileNodeModules

    if (-not $mobileNodeModules) {
        Write-Host "       Installing mobile dependencies..." -ForegroundColor DarkYellow
        Push-Location $mobileDir
        & npm install 2>&1 | Out-Null
        $mobileInstallOk = $LASTEXITCODE -eq 0
        Pop-Location
        Write-Check "Mobile npm install" $mobileInstallOk
    }
} else {
    Write-Check "Mobile dependencies" $false "Skipped — mobile/package.json missing (Agent 2 scope)"
}

if ($agentPkgExists) {
    $agentNodeModules = Test-Path (Join-Path $agentDir "node_modules")
    Write-Check "Agent-server node_modules exist" $agentNodeModules

    if (-not $agentNodeModules) {
        Write-Host "       Installing agent-server dependencies..." -ForegroundColor DarkYellow
        Push-Location $agentDir
        & npm install 2>&1 | Out-Null
        $agentInstallOk = $LASTEXITCODE -eq 0
        Pop-Location
        Write-Check "Agent-server npm install" $agentInstallOk
    }
} else {
    Write-Check "Agent-server dependencies" $false "Skipped — agent-server/package.json missing (Agent 2 scope)"
}

Write-Host ""

# -------------------------------------------------------
# 4. WEB: TYPECHECK + BUILD
# -------------------------------------------------------
if (-not $SkipBuild -and $rootPkgExists) {
    Write-Host "--- Web: Typecheck + Build ---" -ForegroundColor Yellow

    Push-Location $root
    $tscOutput = & npx --no-install tsc --version 2>&1
    $tscAvailable = $LASTEXITCODE -eq 0

    if ($tscAvailable) {
        Write-Host "       Running TypeScript check..." -ForegroundColor DarkYellow
        & npx tsc --noEmit 2>&1 | Out-Null
        $tscOk = $LASTEXITCODE -eq 0
        Write-Check "Web TypeScript check" $tscOk
    } else {
        Write-Check "Web TypeScript check" $false "tsc not found"
    }

    $viteOutput = & npx --no-install vite --version 2>&1
    $viteAvailable = $LASTEXITCODE -eq 0

    if ($viteAvailable) {
        Write-Host "       Running Vite build..." -ForegroundColor DarkYellow
        & npx vite build 2>&1 | Out-Null
        $viteBuildOk = $LASTEXITCODE -eq 0
        Write-Check "Web Vite build" $viteBuildOk
    } else {
        Write-Check "Web Vite build" $false "vite not found"
    }

    Pop-Location
    Write-Host ""
}

# -------------------------------------------------------
# 5. MOBILE: TYPECHECK
# -------------------------------------------------------
if (-not $SkipBuild -and $mobilePkgExists) {
    Write-Host "--- Mobile: Typecheck ---" -ForegroundColor Yellow
    Push-Location $mobileDir

    $mobileTsc = & npx --no-install tsc --version 2>&1
    $mobileTscAvailable = $LASTEXITCODE -eq 0

    if ($mobileTscAvailable) {
        Write-Host "       Running mobile TypeScript check..." -ForegroundColor DarkYellow
        & npx tsc --noEmit 2>&1 | Out-Null
        $mobileTscOk = $LASTEXITCODE -eq 0
        Write-Check "Mobile TypeScript check" $mobileTscOk
    } else {
        Write-Check "Mobile TypeScript check" $false "tsc not available in mobile/"
    }

    Pop-Location
    Write-Host ""
}

# -------------------------------------------------------
# 6. AGENT-SERVER: START + ENDPOINT TEST
# -------------------------------------------------------
if (-not $SkipServer -and $agentPkgExists) {
    Write-Host "--- Agent-Server: Endpoint Tests ---" -ForegroundColor Yellow

    $agentPort = 8787
    $agentUrl = "http://localhost:$agentPort"
    $serverProcess = $null

    Push-Location $agentDir
    Write-Host "       Starting agent-server on port $agentPort..." -ForegroundColor DarkYellow

    try {
        $serverProcess = Start-Process -FilePath "npx" -ArgumentList "tsx", "src/index.ts" `
            -WorkingDirectory $agentDir -PassThru -NoNewWindow `
            -RedirectStandardOutput "$env:TEMP\agent-stdout.log" `
            -RedirectStandardError "$env:TEMP\agent-stderr.log"
    } catch {
        Write-Host "       Failed to start agent-server: $_" -ForegroundColor DarkRed
    }

    # Wait for server to be ready
    $ready = $false
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 1
        try {
            $resp = Invoke-WebRequest -Uri "$agentUrl/api/health" -TimeoutSec 2 -ErrorAction Stop
            $ready = $true
            break
        } catch {
            # Not ready yet
        }
    }

    if ($ready) {
        # Test GET /api/health
        try {
            $healthResp = Invoke-WebRequest -Uri "$agentUrl/api/health" -TimeoutSec 5 -ErrorAction Stop
            $healthBody = $healthResp.Content | ConvertFrom-Json
            Write-Check "GET /api/health" ($healthResp.StatusCode -eq 200) "status=$($healthBody.status)"
        } catch {
            Write-Check "GET /api/health" $false $_.Exception.Message
        }

        # Test POST /api/heal with valid payload
        try {
            $healPayload = @{
                message = "Test crash: Cannot read property 'map' of undefined"
                stack = "at Home.render (src/pages/Home.tsx:42:15)"
                platform = "react-native"
            } | ConvertTo-Json

            $healResp = Invoke-WebRequest -Uri "$agentUrl/api/heal" -Method POST `
                -ContentType "application/json" -Body $healPayload -TimeoutSec 30 -ErrorAction Stop
            $healBody = $healResp.Content | ConvertFrom-Json
            $hasDiagnosis = -not [string]::IsNullOrEmpty($healBody.diagnosis)
            Write-Check "POST /api/heal" ($healResp.StatusCode -eq 200 -and $hasDiagnosis) `
                "model=$($healBody.model) confidence=$($healBody.confidence)"
        } catch {
            Write-Check "POST /api/heal" $false $_.Exception.Message
        }

        # Test POST /api/heal with missing message (should return 400)
        try {
            $badPayload = @{ data = "bad" } | ConvertTo-Json
            $badResp = Invoke-WebRequest -Uri "$agentUrl/api/heal" -Method POST `
                -ContentType "application/json" -Body $badPayload -TimeoutSec 5 -ErrorAction Stop
            Write-Check "POST /api/heal (400 on bad payload)" $false "Expected 400, got $($badResp.StatusCode)"
        } catch {
            $statusCode = 0
            if ($_.Exception.Response) {
                $statusCode = [int]$_.Exception.Response.StatusCode
            }
            Write-Check "POST /api/heal (400 on bad payload)" ($statusCode -eq 400) "Got $statusCode"
        }
    } else {
        Write-Check "Agent-server startup" $false "Did not respond within 15s"
    }

    # Cleanup
    if ($serverProcess -and -not $serverProcess.HasExited) {
        Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
        Write-Host "       Agent-server stopped." -ForegroundColor DarkGray
    }

    Pop-Location
    Write-Host ""
}

# -------------------------------------------------------
# 7. ENV FILE CHECKS
# -------------------------------------------------------
Write-Host "--- Environment Files ---" -ForegroundColor Yellow

$webEnvExample = Test-Path (Join-Path $root ".env.example")
Write-Check "Web .env.example" $webEnvExample

$mobileEnvExample = Test-Path (Join-Path $mobileDir ".env.example")
Write-Check "Mobile .env.example" $mobileEnvExample

$agentEnvExample = Test-Path (Join-Path $agentDir ".env.example")
Write-Check "Agent-server .env.example" $agentEnvExample

Write-Host ""

# -------------------------------------------------------
# 8. SUMMARY
# -------------------------------------------------------
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  PASS / FAIL Matrix" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$total = $script:results.Count
$passedCount = 0
$failedCount = 0
foreach ($r in $script:results) {
    if ($r.Status -eq "PASS") { $passedCount++ } else { $failedCount++ }
}

foreach ($r in $script:results) {
    if ($r.Status -eq "PASS") {
        Write-Host ("  {0}  {1}" -f $r.Status, $r.Name) -ForegroundColor Green
    } else {
        Write-Host ("  {0}  {1}" -f $r.Status, $r.Name) -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "  Total: $total  |  Passed: $passedCount  |  Failed: $failedCount" -ForegroundColor $(if ($script:allPassed) { "Green" } else { "Red" })
Write-Host ""

if ($script:allPassed) {
    Write-Host "  ALL CHECKS PASSED" -ForegroundColor Green
} else {
    Write-Host "  SOME CHECKS FAILED" -ForegroundColor Red
}
Write-Host ""

if ($script:allPassed) { exit 0 } else { exit 1 }
