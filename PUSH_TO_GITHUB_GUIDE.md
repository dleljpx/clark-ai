# 🚀 Getting Your CLARK AI Project to GitHub - Step by Step

## ⚠️ URGENT - Security Issue!

Your **API key was pushed to GitHub**! You need to:

1. **Delete the old API key immediately:**
   - Go to: https://aistudio.google.com/apikey
   - Delete: `AIzaSyCITpIrc1HyhLt3dRNIY0OmV8i0oa9aOFY`

2. **Create a NEW API key:**
   - Go to: https://aistudio.google.com/apikey
   - Click "Create API Key"
   - Copy the new key
   - Update your `.env` file: `GEMINI_API_KEY=your_new_key_here`

3. **Delete the old GitHub repository:**
   - Go to: https://github.com/dleljpx/clark-ai/settings
   - Scroll to "Danger Zone"
   - Click "Delete this repository"

---

## 🎯 Easy Push Method (Automated)

We created a script that does everything automatically!

**Run this in PowerShell:**

```powershell
cd "c:\Users\among\Downloads\CLARK (1)\CLARK"
powershell -ExecutionPolicy Bypass -File push-to-github.ps1
```

The script will:
- ✅ Check git is installed
- ✅ Verify `.env` is protected
- ✅ Initialize git
- ✅ Stage files
- ✅ Commit everything
- ✅ Ask for your GitHub info
- ✅ Push to GitHub

---

## 📖 Manual Method (If script doesn't work)

**Step 1: Create new repository on GitHub**
1. Go to: https://github.com/new
2. Name: `clark-ai`
3. Description: "CLARK AI - Chat with Gemini"
4. Keep everything else default
5. Click "Create repository"

**Step 2: Push your code**

```powershell
cd "c:\Users\among\Downloads\CLARK (1)\CLARK"

# Clean up old git
Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue

# Start fresh
git init
git add .
git commit -m "Initial commit - CLARK AI"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/clark-ai.git
git push -u origin main
```

**Replace `YOUR_USERNAME` with your GitHub username!**

**Step 3: GitHub Authentication**

When it asks for password, use a Personal Access Token:

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name it: `clark-ai`
4. Check the `repo` scope
5. Click "Generate token"
6. Copy and paste when git asks for password

---

## ✅ After Pushing

Your GitHub repo will have:
- ✅ All source code
- ✅ Configuration files
- ✅ `package.json` with dependencies
- ✅ `.env.example` (template for others)
- ✅ `README.md` with setup instructions

**NOT included (safe):**
- ❌ `.env` (your actual API key - protected by .gitignore)
- ❌ `node_modules/` (too large)
- ❌ `dist/` (build output)

---

## 🔗 Share Your Project!

Once pushed, your repo will be at:
```
https://github.com/YOUR_USERNAME/clark-ai
```

Share this link with others so they can:
- View your code
- Clone it
- Contribute

---

## 🆘 Troubleshooting

**"Git is not recognized"**
- Close VS Code and PowerShell completely
- Reopen VS Code
- Try again

**"Authentication failed"**
- Use GitHub CLI instead: https://cli.github.com/
- Run: `gh auth login` first

**"Repository not found"**
- Make sure you created it at https://github.com/new
- Check your username is correct

**"403 Forbidden"**
- You might not have push permission
- Check repository settings: https://github.com/YOUR_USERNAME/clark-ai/settings

---

## 📝 Next Steps

1. ✅ Delete old API key
2. ✅ Create new API key
3. ✅ Delete old GitHub repo
4. ✅ Create new GitHub repo
5. ✅ Run the push script or follow manual steps
6. ✅ Celebrate! 🎉

---

**Need help? Let me know at any step!**
