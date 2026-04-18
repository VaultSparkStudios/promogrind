[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectPath,

    [Parameter(Mandatory = $true)]
    [string]$ProjectName,

    [Parameter(Mandatory = $true)]
    [string]$ProjectType,

    [ValidateSet("generic", "game", "app", "dashboard", "novel", "film", "music")]
    [string]$Medium = "generic",

    [string]$Owner = "VaultSpark Studios",

    [string]$Slug
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-Slug {
    param([string]$Value)

    $slugValue = $Value.ToLowerInvariant()
    $slugValue = [regex]::Replace($slugValue, "[^a-z0-9]+", "-")
    $slugValue = $slugValue.Trim("-")
    return $slugValue
}

function Ensure-Directory {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
        return "created"
    }

    return "existing"
}

function Set-FileIfMissing {
    param(
        [string]$Path,
        [string]$Content
    )

    if (Test-Path -LiteralPath $Path) {
        return "skipped"
    }

    $parent = Split-Path -Parent $Path
    if ($parent) {
        Ensure-Directory -Path $parent | Out-Null
    }

    Set-Content -LiteralPath $Path -Value $Content -Encoding utf8NoBOM
    return "created"
}

if (-not $Slug) {
    $Slug = Get-Slug -Value $ProjectName
}

$root = [System.IO.Path]::GetFullPath($ProjectPath)
$created = New-Object System.Collections.Generic.List[string]
$skipped = New-Object System.Collections.Generic.List[string]

$directories = @(
    $root,
    (Join-Path $root "context"),
    (Join-Path $root "docs"),
    (Join-Path $root "logs"),
    (Join-Path $root "handoffs"),
    (Join-Path $root "prompts"),
    (Join-Path $root "plans")
)

foreach ($directory in $directories) {
    $state = Ensure-Directory -Path $directory
    if ($state -eq "created") {
        $created.Add($directory)
    }
}

$readme = @'
# __PROJECT_NAME__

This local folder is a VaultSpark pre-Git project bootstrap.

## Start here

1. Read `AGENTS.md`
2. If the user says `start`, follow `prompts/start.md`
3. Use `context/LATEST_HANDOFF.md` as the authoritative active handoff
4. Use `docs/PROJECT_SYSTEM_INDEX.md` to understand the project operating system

## Current project identity

- Name: __PROJECT_NAME__
- Slug: __SLUG__
- Type: __PROJECT_TYPE__
- Owner: __OWNER__
- Medium: __MEDIUM__

## Notes

- This package is meant to work before GitHub exists
- Existing outline docs should be preserved and merged additively
- Initialize Git only after the local operating layer is correct
'@
$readme = $readme.Replace("__PROJECT_NAME__", $ProjectName).Replace("__SLUG__", $Slug).Replace("__PROJECT_TYPE__", $ProjectType).Replace("__OWNER__", $Owner).Replace("__MEDIUM__", $Medium)

$agents = @'
# Agent Instructions — __PROJECT_NAME__

## Project identity

- Name: `__PROJECT_NAME__`
- Slug: `__SLUG__`
- Type: __PROJECT_TYPE__
- Owner: __OWNER__
- Medium: __MEDIUM__
- Local status: pre-Git local project bootstrap

## Core rule

Treat repository files as source of truth, not prior chat memory.

## Session aliases

If the user says only `start`, follow `prompts/start.md`.

If the user says only `closeout`, follow `prompts/closeout.md`.

## Read order

1. `prompts/start.md`
2. `context/PROJECT_BRIEF.md`
3. `context/SOUL.md`
4. `context/BRAIN.md`
5. `context/CURRENT_STATE.md`
6. `context/DECISIONS.md`
7. `context/TRUTH_MAP.md`
8. `context/TASK_BOARD.md`
9. `context/LATEST_HANDOFF.md`
10. then task-specific product, technical, brand, or planning docs

## Required behavior

- preserve project identity
- merge additively with existing local files
- use `context/LATEST_HANDOFF.md` as the authoritative active handoff
- update memory files after meaningful work
- append to historical records instead of replacing them

## Mandatory closeout write-back

After meaningful work, update:

- `context/CURRENT_STATE.md`
- `context/TASK_BOARD.md`
- `context/LATEST_HANDOFF.md`
- `logs/WORK_LOG.md`
- `context/DECISIONS.md` when reasoning changed
- `context/OPEN_QUESTIONS.md` when ambiguities changed
- `context/ASSUMPTIONS_REGISTER.md` when assumptions changed
- `context/RISK_REGISTER.md` when risks changed
- `docs/CREATIVE_DIRECTION_RECORD.md` when human direction changed
- `docs/RIGHTS_PROVENANCE.md` when IP-sensitive naming or sourcing changed
- `docs/INNOVATION_PIPELINE.md` when strong ideas emerged
- any repo-specific docs whose truth changed
'@
$agents = $agents.Replace("__PROJECT_NAME__", $ProjectName).Replace("__SLUG__", $Slug).Replace("__PROJECT_TYPE__", $ProjectType).Replace("__OWNER__", $Owner).Replace("__MEDIUM__", $Medium)

$projectBrief = @"
# Project Brief

## Identity

- Name: $ProjectName
- Slug: $Slug
- Type: $ProjectType
- Status: Pre-Git local project bootstrap
- Owner: $Owner

## Why this exists

- Problem or opportunity:
- Audience:
- Studio importance:

## Success

- What success looks like:
- What this project is not:

## Scope

- In scope:
- Out of scope:
"@

$portfolioCard = @"
# Portfolio Card

## Snapshot

- Name: $ProjectName
- Slug: $Slug
- Medium: $Medium
- Status: Pre-Git bootstrap
- Stage: Concept / setup
- Priority: High
- Owner: $Owner
- Health: Yellow
- Last updated: $(Get-Date -Format yyyy-MM-dd)

## Quick overview

- One-line summary: $ProjectType
- Current focus: establish project identity, scope, and operating clarity
- Next milestone: confirm the first real milestone and Git-ready structure
- Launch window: Unknown

## Top blockers

- project scope still needs to be locked

## Links

- Repo: Not created yet
- Runtime: Not deployed
- Key docs:
  - `context/PROJECT_BRIEF.md`
  - `context/LATEST_HANDOFF.md`

## Cross-studio value

- Franchise or strategic value: fill this in
- Downstream content value: fill this in
- Shared systems or dependencies: fill this in
"@

$projectStatus = @"
{
  "schemaVersion": "1.0",
  "name": "$ProjectName",
  "slug": "$Slug",
  "medium": "$Medium",
  "status": "incubating",
  "stage": "concept",
  "priority": "high",
  "owner": "$Owner",
  "health": "yellow",
  "summary": "$ProjectType",
  "currentFocus": "Establish project identity, scope, and operating clarity.",
  "nextMilestone": "Confirm the first real milestone and Git-ready structure.",
  "launchWindow": "Unknown",
  "repo": "",
  "runtimeUrl": "",
  "lastUpdated": "$(Get-Date -Format yyyy-MM-dd)",
  "lastHandoffDate": "$(Get-Date -Format yyyy-MM-dd)",
  "riskLevel": "medium",
  "consumerReady": false,
  "innovationScore": 0,
  "franchiseValue": "unknown",
  "topBlockers": [
    "Project scope still needs to be locked"
  ],
  "readFirst": [
    "context/PROJECT_BRIEF.md",
    "context/PORTFOLIO_CARD.md",
    "context/LATEST_HANDOFF.md"
  ]
}
"@
$brain = @"
# Brain

## Mental model

How should this project think?

## Working heuristics

- Preserve clarity over noise
- Prefer additive evolution over random reinvention
- Protect the highest-leverage user value

## Current strategic beliefs

- Fill this with the best current understanding of how the project should make decisions
"@

$soul = @"
# Soul

## Core promise

What should this project feel like at its best?

## Non-negotiables

- Protect identity
- Protect trust
- Protect what makes the project emotionally distinct

## Anti-goals

- What should this project never become?

## Decision filter

When unsure, choose the option that best protects:

1. identity
2. clarity
3. user value
"@

$currentState = @"
# Current State

## Snapshot

- Project: $ProjectName
- Stage: Pre-Git local project bootstrap
- Git status: Not initialized yet
- Implementation status: No guaranteed code scaffold yet

## What is true right now

- This project has the VaultSpark control layer
- The next step is to fill the core memory files and confirm scope

## Immediate focus

1. Finalize project identity and constraints
2. Confirm startup and closeout behavior
3. Prepare for Git initialization only after the local structure is correct
"@

$decisions = @"
# Decisions

## $(Get-Date -Format yyyy-MM-dd)

### Decision

Bootstrapped $ProjectName with the VaultSpark local project operating system.

### Why

This gives the project structured memory, handoff continuity, and startup or closeout protocols before GitHub exists.

### Consequence

Future sessions should use the control layer and append to history instead of relying on chat memory.
"@

$taskBoard = @'
# Task Board

## Now

- [ ] Fill `context/PROJECT_BRIEF.md`
- [ ] Fill `context/BRAIN.md`
- [ ] Fill `context/SOUL.md`
- [ ] Review `prompts/start.md` and `prompts/closeout.md`

## Next

- [ ] Confirm project scope and milestone shape
- [ ] Initialize Git when the local operating package is ready
- [ ] Create the GitHub repo after the project identity is stable

## Later

- [ ] Add medium-specific docs
- [ ] Add deeper product and technical specs
'@

$openQuestions = @"
# Open Questions

- What is the core user or audience for ${ProjectName}?
- What is the smallest high-value first release?
- What medium-specific docs should be added next?
"@

$assumptions = @"
# Assumptions Register

| ID | Assumption | Why it matters | Confidence | Validation path |
| --- | --- | --- | --- | --- |
| A-001 | $ProjectName should use the VaultSpark control layer from day one | This reduces drift and improves continuity | High | Validate in first work sessions |
"@

$riskRegister = @"
# Risk Register

| ID | Risk | Severity | Current mitigation | Owner |
| --- | --- | --- | --- | --- |
| R-001 | Project identity stays vague for too long | High | Fill the core memory files before implementation | Active project agent |
"@

$truthMap = @'
# Truth Map

## Source authority

1. `context/SOUL.md`
2. `context/BRAIN.md`
3. `context/PROJECT_BRIEF.md`
4. medium-specific product and technical docs
5. `context/CURRENT_STATE.md`
6. `context/LATEST_HANDOFF.md`

## Rules

- If identity conflicts with convenience, `SOUL.md` wins
- If strategic logic conflicts with a stale handoff, update the handoff
- If deeper docs exist, map them here and in `docs/PROJECT_SYSTEM_INDEX.md`
'@

$handoff = @'
# Latest Handoff

## Status

__PROJECT_NAME__ is in the pre-Git bootstrap phase.

## What was done

- Created the VaultSpark control layer
- Added startup and closeout entrypoints
- Standardized this file as the authoritative active handoff

## What remains next

1. Fill the core memory files
2. Add medium-specific docs as needed
3. Initialize Git only after the local package is clean

## Next-session read order

1. `AGENTS.md`
2. `prompts/start.md`
3. `context/PROJECT_BRIEF.md`
4. `context/SOUL.md`
5. `context/BRAIN.md`
6. `context/CURRENT_STATE.md`
7. `context/DECISIONS.md`
8. `context/TRUTH_MAP.md`
9. `context/TASK_BOARD.md`
10. `context/LATEST_HANDOFF.md`
'@
$handoff = $handoff.Replace("__PROJECT_NAME__", $ProjectName)

$workLog = @"
# Work Log

## $(Get-Date -Format yyyy-MM-dd)

- Bootstrapped $ProjectName with the VaultSpark local project system
"@

$startPrompt = @'
# Start Protocol

Use this when the user says only `start`.

## Read order

1. `AGENTS.md`
2. `context/PROJECT_BRIEF.md`
3. `context/SOUL.md`
4. `context/BRAIN.md`
5. `context/CURRENT_STATE.md`
6. `context/DECISIONS.md`
7. `context/TRUTH_MAP.md`
8. `context/TASK_BOARD.md`
9. `context/LATEST_HANDOFF.md`
10. only then task-specific files

## Startup rules

- treat repo files as source of truth, not prior chat memory
- preserve existing local files and merge additively
- use `context/LATEST_HANDOFF.md` as the active handoff source
- note assumptions clearly

## Required startup output

Reply with a concise `Startup Brief` containing:

1. project identity
2. current state
3. active priorities
4. important constraints
5. likely next best move
6. blockers or ambiguities
'@

$closeoutPrompt = @'
# Closeout Protocol

Use this when the user says only `closeout`.

## Required write-back

If meaningful work happened, update in this order:

1. `context/CURRENT_STATE.md`
2. `context/TASK_BOARD.md`
3. `context/LATEST_HANDOFF.md`
4. `logs/WORK_LOG.md`
5. `context/DECISIONS.md` when reasoning changed
6. `context/OPEN_QUESTIONS.md` when new uncertainties appeared
7. `context/ASSUMPTIONS_REGISTER.md` when assumptions changed
8. `context/RISK_REGISTER.md` when risk changed
9. `docs/CREATIVE_DIRECTION_RECORD.md` when human direction changed
10. `docs/RIGHTS_PROVENANCE.md` when naming or source provenance changed
11. `docs/INNOVATION_PIPELINE.md` when a strong new idea emerged
12. any project-specific files whose truth changed

## Required closeout output

Reply with a concise `Session Closeout` containing:

1. what was completed
2. files changed
3. validation status
4. open problems
5. recommended next action
6. exact files the next AI should read first
'@

$bootstrapPrompt = @'
# Bootstrap Prompt

If the user says only `start`, follow `prompts/start.md`.

Treat this project as a VaultSpark gold-standard pre-Git bootstrap. Read the
startup stack, trust repository files over chat memory, and preserve existing
local files additively.
'@

$projectSystemIndex = @'
# Project System Index

## Control layer

- `AGENTS.md`
- `prompts/start.md`
- `prompts/closeout.md`
- `context/PROJECT_BRIEF.md`
- `context/SOUL.md`
- `context/BRAIN.md`
- `context/CURRENT_STATE.md`
- `context/DECISIONS.md`
- `context/TASK_BOARD.md`
- `context/TRUTH_MAP.md`
- `context/LATEST_HANDOFF.md`
- `logs/WORK_LOG.md`

## Deep-spec layer

Add medium-specific product, technical, story, brand, or planning docs here as
the project matures. If they already exist, map them here rather than renaming
them reflexively.

## Handoff rule

`context/LATEST_HANDOFF.md` is the authoritative active handoff file.
'@

$creativeDirection = @"
# Creative Direction Record

This is the additive record of human-guided creative direction for $ProjectName.
"@

$rights = @"
# Rights and Provenance

## Current record

- Asset or concept: $ProjectName
- Type: Project name
- Source: Internal studio project bootstrap
- Rights status: Pending formal review as needed
"@

$brand = @"
# Brand System

## Brand thesis

What should $ProjectName feel like to the audience?

## Desired attributes

- Fill this in

## Attributes to avoid

- Fill this in
"@

$innovation = @'
# Innovation Pipeline

## Scoring rubric

Score each idea from 1 to 10 on:

- Audience impact
- Strategic leverage
- Brand fit
- Originality
- Feasibility
- Speed to value
- Franchise potential

## Active ideas

| Idea | Summary | Audience impact | Strategic leverage | Brand fit | Originality | Feasibility | Speed to value | Franchise potential | Weighted score | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
'@

$handoffsReadme = @'
# Handoffs

This folder is for archived or specialized handoff artifacts only.

`context/LATEST_HANDOFF.md` is the authoritative active handoff file.
'@

$gitignore = @'
node_modules/
.env
.env.*
.next/
dist/
coverage/
*.log
.DS_Store
Thumbs.db
'@

$decisionHeatmap = @'
# Decision Heatmap

## Fast reversible

- Fill this in

## Expensive to reverse

- Fill this in

## Requires explicit human approval

- brand or naming changes
- rights or provenance changes
- public promises
- canon-sensitive changes
'@

$learningLoop = @'
# Learning Loop

## What we learned

- Fill this in

## What changed

- Fill this in

## What still needs validation

- Fill this in
'@

$fileMap = @(
    @{ Path = (Join-Path $root "README.md"); Content = $readme },
    @{ Path = (Join-Path $root ".gitignore"); Content = $gitignore },
    @{ Path = (Join-Path $root "AGENTS.md"); Content = $agents },
    @{ Path = (Join-Path $root "context\PROJECT_BRIEF.md"); Content = $projectBrief },
    @{ Path = (Join-Path $root "context\BRAIN.md"); Content = $brain },
    @{ Path = (Join-Path $root "context\SOUL.md"); Content = $soul },
    @{ Path = (Join-Path $root "context\CURRENT_STATE.md"); Content = $currentState },
    @{ Path = (Join-Path $root "context\DECISIONS.md"); Content = $decisions },
    @{ Path = (Join-Path $root "context\TASK_BOARD.md"); Content = $taskBoard },
    @{ Path = (Join-Path $root "context\OPEN_QUESTIONS.md"); Content = $openQuestions },
    @{ Path = (Join-Path $root "context\ASSUMPTIONS_REGISTER.md"); Content = $assumptions },
    @{ Path = (Join-Path $root "context\RISK_REGISTER.md"); Content = $riskRegister },
    @{ Path = (Join-Path $root "context\TRUTH_MAP.md"); Content = $truthMap },
    @{ Path = (Join-Path $root "context\LATEST_HANDOFF.md"); Content = $handoff },
    @{ Path = (Join-Path $root "logs\WORK_LOG.md"); Content = $workLog },
    @{ Path = (Join-Path $root "prompts\start.md"); Content = $startPrompt },
    @{ Path = (Join-Path $root "prompts\closeout.md"); Content = $closeoutPrompt },
    @{ Path = (Join-Path $root "prompts\bootstrap_prompt.md"); Content = $bootstrapPrompt },
    @{ Path = (Join-Path $root "docs\PROJECT_SYSTEM_INDEX.md"); Content = $projectSystemIndex },
    @{ Path = (Join-Path $root "docs\CREATIVE_DIRECTION_RECORD.md"); Content = $creativeDirection },
    @{ Path = (Join-Path $root "docs\RIGHTS_PROVENANCE.md"); Content = $rights },
    @{ Path = (Join-Path $root "docs\BRAND_SYSTEM.md"); Content = $brand },
    @{ Path = (Join-Path $root "docs\INNOVATION_PIPELINE.md"); Content = $innovation },
    @{ Path = (Join-Path $root "handoffs\README.md"); Content = $handoffsReadme },
    @{ Path = (Join-Path $root "plans\DECISION_HEATMAP.md"); Content = $decisionHeatmap },
    @{ Path = (Join-Path $root "plans\LEARNING_LOOP.md"); Content = $learningLoop }
)

switch ($Medium) {
    "game" {
        $fileMap += @{ Path = (Join-Path $root "docs\GAME_LOOP.md"); Content = "# Game Loop`r`n`r`nDescribe the core player loop here.`r`n" }
    }
    "app" {
        $fileMap += @{ Path = (Join-Path $root "docs\PRODUCT_REQUIREMENTS.md"); Content = "# Product Requirements`r`n`r`nDocument user flows, requirements, and scope here.`r`n" }
    }
    "dashboard" {
        $fileMap += @{ Path = (Join-Path $root "docs\PRODUCT_REQUIREMENTS.md"); Content = "# Product Requirements`r`n`r`nDocument user flows, requirements, and scope here.`r`n" }
        $fileMap += @{ Path = (Join-Path $root "docs\METRIC_DICTIONARY.md"); Content = "# Metric Dictionary`r`n`r`nDocument metrics, definitions, owners, and caveats here.`r`n" }
    }
}

foreach ($entry in $fileMap) {
    $state = Set-FileIfMissing -Path $entry.Path -Content $entry.Content
    if ($state -eq "created") {
        $created.Add($entry.Path)
    }
    else {
        $skipped.Add($entry.Path)
    }
}

$extraPortfolioFiles = @(
    @{ Path = (Join-Path $root "context\PORTFOLIO_CARD.md"); Content = $portfolioCard },
    @{ Path = (Join-Path $root "context\PROJECT_STATUS.json"); Content = $projectStatus }
)

foreach ($entry in $extraPortfolioFiles) {
    $state = Set-FileIfMissing -Path $entry.Path -Content $entry.Content
    if ($state -eq "created") {
        $created.Add($entry.Path)
    }
    else {
        $skipped.Add($entry.Path)
    }
}
Write-Host ""
Write-Host "VaultSpark local project bootstrap complete."
Write-Host "Project path: $root"
Write-Host "Project name: $ProjectName"
Write-Host "Project slug: $Slug"
Write-Host "Project medium: $Medium"
$extraPortfolioFiles = @(
    @{ Path = (Join-Path $root "context\PORTFOLIO_CARD.md"); Content = $portfolioCard },
    @{ Path = (Join-Path $root "context\PROJECT_STATUS.json"); Content = $projectStatus }
)

foreach ($entry in $extraPortfolioFiles) {
    $state = Set-FileIfMissing -Path $entry.Path -Content $entry.Content
    if ($state -eq "created") {
        $created.Add($entry.Path)
    }
    else {
        $skipped.Add($entry.Path)
    }
}
Write-Host ""
Write-Host "Created:"
$created | ForEach-Object { Write-Host "  - $_" }
$extraPortfolioFiles = @(
    @{ Path = (Join-Path $root "context\PORTFOLIO_CARD.md"); Content = $portfolioCard },
    @{ Path = (Join-Path $root "context\PROJECT_STATUS.json"); Content = $projectStatus }
)

foreach ($entry in $extraPortfolioFiles) {
    $state = Set-FileIfMissing -Path $entry.Path -Content $entry.Content
    if ($state -eq "created") {
        $created.Add($entry.Path)
    }
    else {
        $skipped.Add($entry.Path)
    }
}
Write-Host ""
Write-Host "Skipped existing:"
$skipped | ForEach-Object { Write-Host "  - $_" }

