# 🚀 CLARK AI - Setup & Troubleshooting Guide

## ✅ What We Fixed

Your project is now fully set up and running! Here are the issues we resolved:

1. ✅ **Node.js Installation** - Installed v25.1.0
2. ✅ **TypeScript Errors** - Fixed array iteration and API type issues
3. ✅ **Windows Compatibility** - Removed unsupported socket options
4. ✅ **API Key Validation** - Added proper error messages for missing API key
5. ✅ **Better Error Handling** - Clear messages about what went wrong

---

## 🔑 Setting Up Your Gemini API Key (IMPORTANT!)

The app keeps showing error 500 because **your Gemini API key is not configured**. Follow these steps:

### Step 1: Get Your Free API Key
1. Visit: **https://aistudio.google.com/apikey**
2. Click **"Create API Key"**
3. Choose the project (or create a new one)
4. Copy your API key

### Step 2: Add the Key to Your `.env` File
Open `.env` file in the root directory and uncomment and fill in your key:

```env
# Uncomment and add your actual API key:
GEMINI_API_KEY=your_api_key_here_paste_the_key_from_step_1
```

Example (with a fake key):
```env
GEMINI_API_KEY=AIzaSyD_4b5k7p9q2m8n1l3o5r7s9t1u3v5w7x
```

### Step 3: Restart the Dev Server

Close the terminal and run:
```powershell
npm run dev
```

The app should now work at **http://localhost:5000**

---

## 🐛 Troubleshooting

### "Error: Gemini API key is not configured"
- **Solution**: Follow the "Setting Up Your Gemini API Key" steps above

### "Invalid or expired API key"
- **Solution**: Your API key might be wrong or expired. Get a new one from: https://aistudio.google.com/apikey

### "Rate limit exceeded"
- **Solution**: You're making too many requests. Wait a moment and try again. Free tier has limits.

### "Gemini service is temporarily unavailable"
- **Solution**: The Gemini API is having issues. Try again in a few moments.

### "Network error"
- **Solution**: Check your internet connection

---

## 📝 What Each Error Means

| Error | Cause | Solution |
|-------|-------|----------|
| 500 - API key not configured | `.env` file not set up | Add your API key to `.env` |
| 500 - Invalid API key | Wrong/expired key | Get a new key from aistudio.google.com/apikey |
| 503 - Rate limit | Too many requests | Wait and try again |
| 500 - Service unavailable | Gemini API down | Wait a moment and retry |

---

## 🚀 Running Your App

**Development Mode:**
```powershell
npm run dev
```
Then open: **http://localhost:5000**

**Build for Production:**
```powershell
npm run build
```

**Start Production Build:**
```powershell
npm start
```

**Check TypeScript:**
```powershell
npm run check
```

---

## 📚 Features

- ✅ Real-time chat with AI
- ✅ Conversation history
- ✅ System instruction customization
- ✅ Dark/Light theme
- ✅ Image support in messages
- ✅ Auto-generated conversation titles

---

## 🔧 Environment Variables

You can set these in the `.env` file:

```env
# Required: Your Gemini API key
GEMINI_API_KEY=your_key_here

# Optional: Alternative to GEMINI_API_KEY
GOOGLE_API_KEY=your_key_here

# Optional: Server port (default: 5000)
PORT=5000

# Optional: Environment (development or production)
NODE_ENV=development
```

---

## ❓ Still Having Issues?

1. **Check that `.env` file exists** in the root directory
2. **Verify your API key** is correct at: https://aistudio.google.com/apikey
3. **Restart the dev server** after changing `.env`
4. **Check the terminal** for detailed error messages
5. **Clear browser cache** if needed (Ctrl+Shift+Delete)

---

**Your CLARK AI app is ready to go! 🎉 Just add your API key and you're all set!**
