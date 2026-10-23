#!/usr/bin/env pwsh
# GitHub Push Script for CLARK AI
# This script sets up git and pushes to GitHub

Write-Host "🚀 CLARK AI - GitHub Setup Script" -ForegroundColor Cyan
Write-Host ""

# Check if git is installed
try {
    $gitVersion = git --version
    Write-Host "✅ Git is installed: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git is not installed! Please install from https://git-scm.com/" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Pre-flight Checks:" -ForegroundColor Yellow

# Check if .env file exists
if (Test-Path ".env") {
    Write-Host "✅ .env file found (local - will not push)" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found - you'll need to create it" -ForegroundColor Yellow
}

# Check if .gitignore has .env
$gitignoreContent = Get-Content ".gitignore" -Raw
if ($gitignoreContent -match "\.env") {
    Write-Host "✅ .env is in .gitignore (protected)" -ForegroundColor Green
} else {
    Write-Host "❌ .env is NOT in .gitignore!" -ForegroundColor Red
    Write-Host "Adding .env to .gitignore..." -ForegroundColor Yellow
    ".env`n" | Add-Content ".gitignore"
    Write-Host "✅ Added!" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔧 Setting up Git..." -ForegroundColor Cyan

# Initialize git if not already initialized
if (-not (Test-Path ".git")) {
    Write-Host "Initializing git repository..."
    git init
    git config user.email "your-email@example.com"
    git config user.name "Your Name"
    Write-Host "✅ Git initialized" -ForegroundColor Green
} else {
    Write-Host "✅ Git repository already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "📦 Staging files..." -ForegroundColor Cyan
git add .

# Check what will be committed
Write-Host ""
Write-Host "📝 Files to be committed:" -ForegroundColor Yellow
git diff --cached --name-only

# Check if .env will be committed (it shouldn't be)
$stagedFiles = git diff --cached --name-only
if ($stagedFiles -match "\.env$" -and -not ($stagedFiles -match "\.env\.example")) {
    Write-Host ""
    Write-Host "⚠️  WARNING: .env file is being committed!" -ForegroundColor Red
    Write-Host "This is a security risk! Add .env to .gitignore" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "💾 Creating commit..." -ForegroundColor Cyan

if ((git diff --cached --name-only | Measure-Object).Count -eq 0) {
    Write-Host "⚠️  No files to commit!" -ForegroundColor Yellow
    exit 0
}

git commit -m "Initial commit - CLARK AI chat application with Gemini integration"
Write-Host "✅ Commit created" -ForegroundColor Green

Write-Host ""
Write-Host "🌿 Setting up main branch..." -ForegroundColor Cyan
git branch -M main
Write-Host "✅ Main branch set" -ForegroundColor Green

Write-Host ""
Write-Host "⚠️  IMPORTANT SECURITY REMINDER:" -ForegroundColor Yellow
Write-Host "1. Delete your old API key from: https://aistudio.google.com/apikey" -ForegroundColor Yellow
Write-Host "2. Create a new API key and update your .env file" -ForegroundColor Yellow
Write-Host "3. Delete the old GitHub repo: https://github.com/dleljpx/clark-ai/settings" -ForegroundColor Yellow
Write-Host ""

$username = Read-Host "Enter your GitHub username"
$repoName = Read-Host "Enter your repository name (or press Enter for 'clark-ai')"

if ([string]::IsNullOrWhiteSpace($repoName)) {
    $repoName = "clark-ai"
}

Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
Write-Host "Remote URL: https://github.com/$username/$repoName.git" -ForegroundColor Cyan

git remote remove origin 2>$null
git remote add origin "https://github.com/$username/$repoName.git"

try {
    git push -u origin main
    Write-Host ""
    Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "Repository: https://github.com/$username/$repoName" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ Push failed!" -ForegroundColor Red
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. Repository exists at https://github.com/$username/$repoName" -ForegroundColor Yellow
    Write-Host "  2. You have proper GitHub authentication" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "GitHub auth troubleshooting:" -ForegroundColor Cyan
    Write-Host "  - Use GitHub CLI: https://cli.github.com/" -ForegroundColor Cyan
    Write-Host "  - Or use Personal Access Token: https://github.com/settings/tokens" -ForegroundColor Cyan
}
