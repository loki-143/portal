# Kill processes using ports 3001, 3002, 3003
# Run this script when you get "EADDRINUSE" errors

Write-Host "Checking for processes using ports 3000, 3001, 3002, 8000..." -ForegroundColor Cyan

$ports = @(3000, 3001, 3002, 8000)

foreach ($port in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | 
                 Select-Object -ExpandProperty OwningProcess | 
                 Where-Object { $_ -ne 0 } | 
                 Select-Object -Unique
    
    if ($processes) {
        foreach ($pid in $processes) {
            try {
                $processName = (Get-Process -Id $pid -ErrorAction SilentlyContinue).ProcessName
                Write-Host "Killing process $processName (PID: $pid) on port $port" -ForegroundColor Yellow
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "✓ Killed PID $pid" -ForegroundColor Green
            } catch {
                Write-Host "✗ Could not kill PID $pid" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "✓ Port $port is free" -ForegroundColor Green
    }
}

Write-Host "`nDone! You can now start your servers." -ForegroundColor Cyan
