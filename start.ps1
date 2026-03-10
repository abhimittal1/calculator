# =============================================================================
# start.ps1  --  Single-command app launcher for Calculator App
# =============================================================================
# Usage:  .\start.ps1
# =============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Info  { param($m) Write-Host "  [INFO]  $m" -ForegroundColor Cyan }
function OK    { param($m) Write-Host "  [ OK ]  $m" -ForegroundColor Green }
function Warn  { param($m) Write-Host "  [WARN]  $m" -ForegroundColor Yellow }
function Fatal { param($m) Write-Host "  [FAIL]  $m" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "==========================================" -ForegroundColor Magenta
Write-Host "   Calculator App -- Dev Launcher" -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Magenta
Write-Host ""

# --- 1. Environment ---
Info "Setting up environment variables..."

$JDK17 = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot'
if (-not (Test-Path "$JDK17\bin\java.exe")) {
    Fatal "JDK 17 not found at '$JDK17'. Run: winget install EclipseAdoptium.Temurin.17.JDK"
}

$env:JAVA_HOME        = $JDK17
$env:ANDROID_HOME     = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:PATH             = $env:JAVA_HOME + '\bin;' + $env:ANDROID_HOME + '\platform-tools;' + $env:ANDROID_HOME + '\emulator;' + $env:PATH

OK "JAVA_HOME    = $env:JAVA_HOME"
OK "ANDROID_HOME = $env:ANDROID_HOME"

# --- 2. Tool checks ---
Info "Checking required tools..."

foreach ($tool in @('java','adb','node','npx')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Fatal "'$tool' not found on PATH. Install it and re-run."
    }
    OK "'$tool' found."
}

$javaVer = (cmd /c "java -version 2>&1") | Select-Object -First 1
if ($javaVer -notmatch '17\.') {
    Fatal "Wrong Java version: '$javaVer'. Expected JDK 17."
}
OK "Java version OK: $javaVer"

# --- 3. Node modules ---
if (-not (Test-Path 'node_modules')) {
    Info "node_modules not found. Running npm install..."
    npm install
    if ($LASTEXITCODE -ne 0) { Fatal "npm install failed." }
    OK "Dependencies installed."
} else {
    OK "node_modules present."
}

# --- 4. Emulator check ---
Info "Checking for a running Android emulator / device..."

$devices = @(adb devices 2>&1 | Select-String -Pattern 'device$')
if ($devices.Count -eq 0) {
    Warn "No running device found. Attempting to start an emulator..."

    $emulatorExe = "$env:ANDROID_HOME\emulator\emulator.exe"
    if (-not (Test-Path $emulatorExe)) {
        Fatal "Android emulator not found at '$emulatorExe'. Open Android Studio > Device Manager."
    }

    $avds = @(& $emulatorExe -list-avds 2>&1 | Where-Object { $_ -match '\S' })
    if ($avds.Count -eq 0) {
        Fatal "No AVDs found. Create one in Android Studio > Device Manager."
    }

    Write-Host ""
    Write-Host "  Available AVDs:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $avds.Count; $i++) {
        Write-Host "    [$i] $($avds[$i])"
    }
    Write-Host ""
    $choice = Read-Host "  Enter number (default 0)"
    if ([string]::IsNullOrWhiteSpace($choice)) { $choice = '0' }
    $avdName = $avds[[int]$choice]

    Info "Starting emulator '$avdName'..."
    Start-Process $emulatorExe -ArgumentList '-avd', $avdName -WindowStyle Minimized

    Info "Waiting for emulator to boot (up to 90s)..."
    $waited = 0
    do {
        Start-Sleep -Seconds 5
        $waited += 5
        $online = @(adb devices 2>&1 | Select-String -Pattern 'device$')
    } while ($online.Count -eq 0 -and $waited -lt 90)

    if ($online.Count -eq 0) {
        Fatal "Emulator did not come online after ${waited}s. Start it manually and re-run."
    }

    Info "Waiting for Android to finish booting..."
    Start-Sleep -Seconds 10
    OK "Emulator is online."
} else {
    OK "Device detected: $($devices -join ', ')"
}

# --- 5. Kill stale Metro on port 8081 ---
Info "Checking port 8081..."
try {
    $pids8081 = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue |
                Select-Object -ExpandProperty OwningProcess
    if ($pids8081) {
        $pids8081 | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
        Warn "Killed stale Metro process(es) on port 8081."
        Start-Sleep -Seconds 2
    } else {
        OK "Port 8081 is free."
    }
} catch {
    OK "Port 8081 is free."
}

# --- 6. Start Metro in a new window ---
Info "Starting Metro bundler in a new window..."

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$jh  = $env:JAVA_HOME
$ah  = $env:ANDROID_HOME

$metroCmd = "Set-Location '$projectRoot'; " +
            "`$env:JAVA_HOME='$jh'; " +
            "`$env:ANDROID_HOME='$ah'; " +
            "Write-Host 'Metro Bundler - Calculator App' -ForegroundColor Magenta; " +
            "npx react-native start --reset-cache"

Start-Process powershell -ArgumentList '-NoExit', '-Command', $metroCmd -WindowStyle Normal

Info "Waiting 8s for Metro to initialise..."
Start-Sleep -Seconds 8

# --- 7. Build and install ---
Info "Building and installing the app (first run may take a few minutes)..."
Write-Host ""

Set-Location $projectRoot
npx react-native run-android

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Fatal "Build failed. Check the output above for errors."
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   App launched successfully!" -ForegroundColor Green
Write-Host "   Keep the Metro window open during dev" -ForegroundColor Green
Write-Host "   Fast Refresh: edit any src/ file" -ForegroundColor Green
Write-Host "   Full reload:  press R in Metro window" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""