$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$env:DISABLE_SQLALCHEMY_CEXT = "1"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Starting CivicLens Platform Services... " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Start Backend
Write-Host "-> Launching FastAPI Backend on port 8000..." -ForegroundColor Yellow
$backendProcess = Start-Process -FilePath "python" -ArgumentList "-m uvicorn app.main:app --host 127.0.0.1 --port 8000" -WorkingDirectory "d:\CLAUDE\backend" -PassThru -WindowStyle Hidden

# 2. Start Frontend
Write-Host "-> Launching Vite React Frontend on port 5173..." -ForegroundColor Yellow
$frontendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev -- --host 0.0.0.0 --port 5173" -WorkingDirectory "d:\CLAUDE\frontend" -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 3

# 3. Launch Default Browser
Write-Host "-> Opening CivicLens in your browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host "`nCivicLens is live!" -ForegroundColor Green
Write-Host "Web App: http://localhost:5173" -ForegroundColor White
Write-Host "Backend API: http://127.0.0.1:8000" -ForegroundColor White
Write-Host "API Docs: http://127.0.0.1:8000/docs" -ForegroundColor White
