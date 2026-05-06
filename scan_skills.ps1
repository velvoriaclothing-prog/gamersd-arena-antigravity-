$skills = @()
$targetDir = "antigravity-skills"

if (!(Test-Path $targetDir)) {
    Write-Host "Target directory $targetDir not found."
    exit
}

$repos = Get-ChildItem -Path $targetDir -Directory

foreach ($repo in $repos) {
    $repoPath = $repo.FullName
    $repoName = $repo.Name
    
    # Check for SKILL.md or skill.json
    $skillFiles = Get-ChildItem -Path $repoPath -Filter "SKILL.md" -File
    if ($skillFiles.Count -eq 0) {
        $skillFiles = Get-ChildItem -Path $repoPath -Filter "skill.json" -File
    }
    
    if ($skillFiles.Count -gt 0) {
        $skillFile = $skillFiles[0]
        $content = Get-Content -Path $skillFile.FullName -Raw
        
        $skillInfo = @{
            repoName = $repoName
            path = $repoPath
            configFile = $skillFile.Name
            content = $content
        }
        
        # Simple parsing for JSON if it's a json file
        if ($skillFile.Extension -eq ".json") {
            try {
                $json = $content | ConvertFrom-Json
                $skillInfo.data = $json
            } catch {
                Write-Host "Error parsing JSON in $($skillFile.FullName)"
            }
        }
        
        $skills += $skillInfo
        Write-Host "Found skill in $repoName"
    } else {
        # Fallback: just record the repo as a potential skill
        $skills += @{
            repoName = $repoName
            path = $repoPath
            configFile = $null
            content = $null
        }
        Write-Host "No explicit skill config found in $repoName, adding as generic repo."
    }
}

$skills | ConvertTo-Json -Depth 10 | Out-File -FilePath "skill-registry.json"
Write-Host "Skill registry created with $($skills.Count) entries."
