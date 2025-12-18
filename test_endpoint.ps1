$uri = 'https://sneha-pugqtr4ooq-uc.a.run.app/api/v1/schedules/timetable'
$sessionId = 'd1754695-c3be-417e-a19d-8510a7240dce'
$headers = @{
    'Authorization' = "Bearer $sessionId"
    'Content-Type' = 'application/json'
}

try {
    $response = Invoke-WebRequest -Uri $uri -Headers $headers -UseBasicParsing
    $json = $response.Content | ConvertFrom-Json
    
    # Show the structure
    Write-Host "Raw response keys:" -ForegroundColor Yellow
    $json | Get-Member -MemberType NoteProperty | Select-Object Name
    
    Write-Host "`nFirst schedule structure:" -ForegroundColor Yellow
    if ($json.schedules -and $json.schedules.Monday) {
        $firstSchedule = $json.schedules.Monday[0]
        $firstSchedule | Get-Member -MemberType NoteProperty | Select-Object Name
        
        Write-Host "`nFirst schedule data:" -ForegroundColor Cyan
        $firstSchedule | ConvertTo-Json
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
