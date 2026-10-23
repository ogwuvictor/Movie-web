$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$sessionDirectory = Join-Path $env:TEMP 'cinehub-movie-web-php-sessions'
New-Item -ItemType Directory -Path $sessionDirectory -Force | Out-Null
& php -d "session.save_path=$sessionDirectory" -d session.use_strict_mode=1 -d session.cookie_httponly=1 -d session.cookie_samesite=Lax -d display_errors=0 -S 127.0.0.1:8000 -t (Join-Path $projectRoot 'backend') (Join-Path $projectRoot 'backend/router.php')
