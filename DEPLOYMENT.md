# Deployment Guide

This project is set up for split deployment:
- Frontend: Vercel
- Backend: Render

## 1) Deploy Backend on Render

Use the existing Blueprint file at root:
- render.yaml

### Option A: Blueprint deploy (recommended)
1. Push your repo to GitHub.
2. In Render, click New + and choose Blueprint.
3. Select this repository.
4. Render reads render.yaml and creates the web service.

### Option B: Manual web service
Use these settings:
- Environment: Python
- Root Directory: backend
- Build Command: pip install -r requirements.txt
- Start Command: gunicorn -k eventlet -w 1 run:app

### Required Render environment variables
Set these in the Render service settings:
- MONGO_URI
- JWT_SECRET
- FLASK_SECRET_KEY
- GOOGLE_GEMINI_API_KEY
- GOOGLE_MAPS_API_KEY (if map/routing features are used)

Optional mail variables:
- MAIL_SERVER
- MAIL_PORT
- MAIL_USERNAME
- MAIL_PASSWORD

After deploy, copy your Render backend URL, for example:
- https://annadaan-backend.onrender.com

Your API base URL will be:
- https://annadaan-backend.onrender.com/api

## 2) Deploy Frontend on Vercel

1. In Vercel, click Add New... then Project.
2. Import this same repository.
3. Set Root Directory to frontend.
4. Framework preset: Vite (auto-detected).
5. Build command: npm run build
6. Output directory: dist

### Required Vercel environment variable
Set this in Vercel Project Settings -> Environment Variables:
- Name: VITE_API_BASE_URL
- Value: https://YOUR-RENDER-SERVICE.onrender.com/api

Example:
- VITE_API_BASE_URL=https://annadaan-backend.onrender.com/api

Then redeploy frontend.

## 3) Verify integration

After both deployments are live:
1. Open frontend URL from Vercel.
2. Try login or register.
3. Confirm requests in browser network tab go to the Render URL.
4. If you use real-time features, verify socket requests are not blocked by browser CORS.

## 4) Common issues

- 401 errors on all routes:
  - Check JWT_SECRET is set in Render and not JWT_SECRET_KEY.

- Frontend still calling localhost:
  - Confirm VITE_API_BASE_URL exists in Vercel env vars and redeploy.

- Render cold starts on free plan:
  - First request may be slow after inactivity.

- CORS errors:
  - Ensure frontend uses the exact https backend URL in VITE_API_BASE_URL.

## 5) Local development reminder

Frontend local API fallback is:
- http://localhost:5000/api

So local behavior remains unchanged.
