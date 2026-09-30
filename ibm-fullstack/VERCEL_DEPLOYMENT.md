# 🚀 Quick Vercel Deployment Guide (Hobby Plan)

## Step 1: Deploy to Vercel

### Option A: GitHub Integration (Recommended)
1. Push your code to GitHub if not already done
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Next.js settings

### Option B: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Step 2: Set Environment Variables

1. Go to your Vercel Dashboard
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Add these variables:

```
MONGODB_URI = mongodb+srv://khanwalkark:clVYhnXWWlSQAniL@cluster0.vr30irk.mongodb.net/watsonxaagent
NEXTAUTH_SECRET = kndsd
NEXTAUTH_URL = https://your-app-name.vercel.app
WATSONX_PROJECT_ID = 47e536aa-5c0f-4059-bf86-2652fa6ef599
WATSONX_API_URL = https://eu-de.ml.cloud.ibm.com
WATSONX_API_KEY = AMQ9pE7NvN1HWRzqVLInJx-A9L8AZKJ5L-VjMARamhj7
WATSONX_MODEL_ID = ibm/granite-3-3-8b-instruct
WATSONX_TEMPERATURE = 0.3
WATSONX_MAX_TOKENS = 800
WATSON_STT_API_KEY = dkZMI7qOnSk_BTKNjGyDpYgBPtGxoQaambWZnb3yVlBx
WATSON_STT_URL = https://api.eu-de.speech-to-text.watson.cloud.ibm.com/instances/906d29c8-0599-43be-99b3-8319214e1b74
WATSON_TTS_API_KEY = GQ-WbOWgANxhPwV1KDEZeyADWW7TMv5-MhKDUhtv8F-E
WATSON_TTS_URL = https://api.eu-de.text-to-speech.watson.cloud.ibm.com/instances/c35fae13-cc86-423c-a36a-026f0ab04b71
CLOUDINARY_CLOUD_NAME = dxchl0xji
CLOUDINARY_API_KEY = 925124754372515
CLOUDINARY_API_SECRET = oPFuvbMSDhAcnxxpYOrQKCJT5hs
```

**⚠️ IMPORTANT:** Replace `your-app-name.vercel.app` with your actual Vercel URL

## Step 3: Update NEXTAUTH_URL

After deployment:
1. Copy your Vercel app URL (e.g., `https://novexa-xyz123.vercel.app`)
2. Update the `NEXTAUTH_URL` environment variable in Vercel
3. Redeploy the application

## Hobby Plan Limitations & Workarounds

### ✅ What Works on Hobby Plan:
- Unlimited deployments
- Custom domains (1 per project)
- Serverless functions
- Edge Network (CDN)
- Analytics
- All your app features work perfectly!

### ❌ What's Limited:
- Cron jobs (removed from config)
- Team features
- Password protection
- Advanced monitoring

### 💡 Workarounds for Missing Features:

#### Health Monitoring (Instead of Cron Jobs):
```javascript
// Add to any page that gets regular traffic
useEffect(() => {
  // Simple health check on app load
  fetch('/api/health').catch(console.error);
}, []);
```

#### External Cron Alternative:
Use free services like:
- **Uptime Robot** (free monitoring)
- **cron-job.org** (free cron jobs)
- **GitHub Actions** (free cron workflows)

## Step 4: Test Your Deployment

1. Visit your Vercel URL
2. Test user registration/login
3. Create a meeting and test video
4. Try AI transcription
5. Test check-in system

## Step 5: Custom Domain (Optional)

1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your domain
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` to your custom domain

## 🎉 You're Live!

Your Novexa app is now running on Vercel's global edge network with:
- ⚡ Lightning-fast performance
- 🌍 Global CDN distribution
- 🔒 HTTPS enabled by default
- 📱 Mobile-optimized
- 🚀 All features working perfectly

## Quick Links:
- **Vercel Dashboard**: [vercel.com/dashboard](https://vercel.com/dashboard)
- **Domain Settings**: Project → Settings → Domains
- **Environment Variables**: Project → Settings → Environment Variables
- **Function Logs**: Project → Functions tab

**Need help?** Check the deployment logs in your Vercel dashboard or refer to the main DEPLOYMENT.md guide.
