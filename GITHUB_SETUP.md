# GitHub Setup Guide for CLARK AI

## Step 1: Rotate Your API Key (IMPORTANT - Your old key is exposed!)

1. Go to: https://aistudio.google.com/apikey
2. Click the **trash icon** to delete the old key (AIzaSyCITpIrc1HyhLt3dRNIY0OmV8i0oa9aOFY)
3. Click **"Create API Key"** to generate a new one
4. Copy the new key
5. Update your `.env` file:
   ```
   GEMINI_API_KEY=your_new_key_here
   ```

## Step 2: Delete the Repository on GitHub

1. Go to: https://github.com/dleljpx/clark-ai/settings
2. Scroll down to **"Danger Zone"**
3. Click **"Delete this repository"**
4. Type the repository name to confirm
5. Click **"I understand the consequences, delete this repository"**

## Step 3: Clean Up Local Git

Run these commands:

```powershell
cd "c:\Users\among\Downloads\CLARK (1)\CLARK"

# Remove git tracking
Remove-Item -Recurse -Force .git

# Verify .env is NOT in git
git status
```

## Step 4: Create Fresh Repository

1. Go to: https://github.com/new
2. Fill in:
   - **Repository name**: `clark-ai`
   - **Description**: CLARK AI - Chat application with Google Gemini API
   - **Public** (so others can use it)
   - **DO NOT** check "Initialize this repository with"
3. Click **"Create repository"**

## Step 5: Push Code to GitHub

Run these commands in PowerShell:

```powershell
cd "c:\Users\among\Downloads\CLARK (1)\CLARK"

# Initialize git fresh
git init

# Add all files (but .env will be ignored)
git add .

# Verify .env is NOT being added
git status
# You should NOT see .env in the list

# Create first commit
git commit -m "Initial commit - CLARK AI chat application with Gemini integration"

# Set main branch
git branch -M main

# Add remote
git remote add origin https://github.com/dleljpx/clark-ai.git

# Push to GitHub
git push -u origin main
```

## Step 6: GitHub Authentication

When you run `git push`, GitHub will ask for authentication:

**Option A - Personal Access Token (Recommended):**
1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Name: `clark-ai`
4. Select scopes: Check `repo` (full control)
5. Click **"Generate token"**
6. Copy the token
7. Paste when asked for password in terminal

**Option B - GitHub CLI (Easier):**
1. Install: https://cli.github.com/
2. Run: `gh auth login`
3. Follow the prompts
4. Then run git push again

---

## Security Checklist

- ✅ `.gitignore` includes `.env`
- ✅ `.env.example` has placeholder values (no real API key)
- ✅ Old API key is deleted from Gemini
- ✅ Old repository is deleted from GitHub
- ✅ New API key is in local `.env` only
- ✅ Ready to push fresh code!

---

## Files That SHOULD Go to GitHub

✅ Source code (.tsx, .ts files)
✅ Config files (tsconfig.json, vite.config.ts, etc.)
✅ package.json, package-lock.json
✅ `.env.example` (template only, no secrets)
✅ README.md, documentation
✅ `.gitignore` (to protect secrets)

## Files That Should NOT Go to GitHub

❌ `.env` (contains real API key)
❌ `node_modules/` (too large)
❌ `dist/` (build output)
❌ `.DS_Store`, `Thumbs.db` (system files)

---

Ready? Start with Step 1! Let me know if you need help with any step! 🚀
