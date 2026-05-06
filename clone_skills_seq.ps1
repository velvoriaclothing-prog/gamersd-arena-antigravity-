$repos = @(
"https://github.com/sickn33/antigravity-awesome-skills",
"https://github.com/VoltAgent/awesome-agent-skills",
"https://github.com/Lum1104/Understand-Anything",
"https://github.com/Bhanunamikaze/Agentic-SEO-Skill",
"https://github.com/testdino-hq/playwright-skill",
"https://github.com/harikrishna8121999/antigravity-workflows",
"https://github.com/tranhieutt/software_development_department",
"https://github.com/omergocmen/vibe-coder-kit",
"https://github.com/tody-agent/codymaster",
"https://github.com/akseolabs-seo/cinematic-ui",
"https://github.com/Shelpuk-AI-Technology-Consulting/agent-skill-tdd",
"https://github.com/PolyXGO/HeraSpec",
"https://github.com/agentskill-sh/ags",
"https://github.com/Sn4kyGit/antigravity-project-starter",
"https://github.com/dturkuler/GSD-Antigravity",
"https://github.com/plushyta/Awesome-Marketing-Skills",
"https://github.com/VidyFoo/antigravity-skill-engine",
"https://github.com/Bhanunamikaze/AI-Dataset-Generator",
"https://github.com/cashfree/agent-skills",
"https://github.com/frankzch/ai-news-skill",
"https://github.com/Jakedismo/visual-explainer-extension",
"https://github.com/Ruinius/financial-analyst-skills",
"https://github.com/smartbrainactivity/smartbrain-skill-auditor",
"https://github.com/mayurrathi/awesome-agent-skills",
"https://github.com/abdulsamed1/AI-skills-bank",
"https://github.com/isgudtek/mycrab-tunnel-skill",
"https://github.com/subhashdasyam/security-antipatterns-python",
"https://github.com/smartbrainactivity/visual-diagramming-export",
"https://github.com/mrsknetwork/supernova",
"https://github.com/mykaro/ai-skills",
"https://github.com/max-rogue/Stackmoss",
"https://github.com/cxshoutghost/claude-code-skillforge",
"https://github.com/k1lgor/mega-mind-skills",
"https://github.com/adamreger/ecc-antigravity",
"https://github.com/subhashdasyam/security-antipatterns-javascript",
"https://github.com/scaleto/Antigravity-Super-Skill-Architecture",
"https://github.com/smartbrainactivity/electron-desktop-builds",
"https://github.com/kaal22/antigravity-skills-list",
"https://github.com/AchiraStudio/achira-workflow-os",
"https://github.com/lijinnair/claude-code-skillforge",
"https://github.com/IamCatoBot/text-is-code",
"https://github.com/xedyx123/LUME",
"https://github.com/smartbrainactivity/electron-desktop-builder",
"https://github.com/mrsahilbeniwal/social-campaigns",
"https://github.com/tuliosousapro/SaaS-blueprint",
"https://github.com/Ruinius/offboarding-sme-clone",
"https://github.com/NoaiRox/specialist-agent",
"https://github.com/Taison472/codex-skills",
"https://github.com/ZEONS/EASYSAFE-v2.0",
"https://github.com/lindytextual955/Anti-Detect-C-Sharp",
"https://github.com/s1dd4rth/babok-skill",
"https://github.com/n3owise/brand-launchpad",
"https://github.com/MirazulHasan/PERSONAL_PORTFOLIO",
"https://github.com/agykit/agykit",
"https://github.com/jornalistainclusivo/jinc-skills",
"https://github.com/saccerwin/antigravity-flow",
"https://github.com/jegly/SECURITY-PRIVACY-AGENT-CHECKLIST.md",
"https://github.com/Unladylike-gatekeeper954/claude-workflow-library",
"https://github.com/iammuhammadasimofficial/senior-architect-expert",
"https://github.com/aliciajia399-ops/skillbook",
"https://github.com/Okufox/agent-skills",
"https://github.com/c-ardinal/claudecode-bridge-for-antigravity",
"https://github.com/berkaybuharali/cv-builder",
"https://github.com/Chit-ai/g-trace-skill",
"https://github.com/marysatasselshaped667/skills-collection-1",
"https://github.com/RudyB3N8/antigravity-skills",
"https://github.com/wallisillative921/team-brain",
"https://github.com/round-comfortfood117/codex-workflows"
)

$targetDir = "antigravity-skills"
if (!(Test-Path $targetDir)) { New-Item -ItemType Directory $targetDir }
cd $targetDir

$env:GIT_TERMINAL_PROMPT = 0

foreach ($repo in $repos) {
    $repoName = ($repo -split "/")[-1]
    if ($repoName.EndsWith(".md")) { $repoName = $repoName.Replace(".md", "") }
    
    if (!(Test-Path $repoName)) {
        Write-Host "Cloning $repoName..."
        git clone --depth 1 $repo $repoName 2>&1 | Out-Null
    } else {
        Write-Host "Skipping $repoName (already exists)"
    }
}
Write-Host "Done cloning all."
