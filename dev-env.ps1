# Run this script once in any new terminal before working on the app:
#   . .\dev-env.ps1
#
# It sets ANDROID_HOME, JAVA_HOME (JDK 17 Temurin — required by RN 0.73),
# and adds adb + emulator to PATH for the current PowerShell session.
#
# NOTE: Android Studio bundles JDK 21 (JBR) which breaks the Gradle
# jlink transform. Always use JDK 17 for this project.

$env:ANDROID_HOME     = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = "$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME        = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.18.8-hotspot'
$env:PATH             = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:PATH"

Write-Host "Dev environment loaded:" -ForegroundColor Green
Write-Host "  JAVA_HOME     = $env:JAVA_HOME"
Write-Host "  ANDROID_HOME  = $env:ANDROID_HOME"
Write-Host "  java          = $(& java -version 2>&1 | Select-Object -First 1)"
Write-Host "  adb           = $(& adb version 2>&1 | Select-Object -First 1)"
