# Complete Heroku Deployment Steps - NoWaiting Dashboard

## Your Project Configuration:
- **Frontend App Name:** my-login-app (React Dashboard)
- **Backend API URL:** https://nowaiting-076a4d0af321.herokuapp.com
- **Working Directory:** `d:\noWaitingDashboard\my-login-app`

---

## Complete Deployment Steps

### Step 1: Navigate to Project Directory
```bash
cd d:\noWaitingDashboard\my-login-app
```

### Step 2: Login to Heroku
```bash
heroku login
```
(This will open a browser for authentication)

### Step 3: Create Heroku App
```bash
heroku create your-frontend-app-name
```
**Replace `your-frontend-app-name` with your desired name (must be unique).**

Example:
```bash
heroku create nowaiting-dashboard
```

Or let Heroku generate a name:
```bash
heroku create
```

### Step 4: Set Static Buildpack
```bash
heroku buildpacks:set https://github.com/heroku/heroku-buildpack-static
```

### Step 5: Set Environment Variables

**Set the backend API URL:**
```bash
heroku config:set REACT_APP_API_BASE_URL=https://nowaiting-076a4d0af321.herokuapp.com
```

**Verify the configuration:**
```bash
heroku config
```

You should see:
- `REACT_APP_API_BASE_URL`: `https://nowaiting-076a4d0af321.herokuapp.com`

### Step 6: Initialize Git (if not already done)

**Check if git is initialized:**
```bash
git status
```

**If not initialized, run:**
```bash
git init
git add .
git commit -m "Initial commit - Prepare for Heroku deployment"
```

### Step 7: Deploy to Heroku

**If your default branch is `main`:**
```bash
git push heroku main
```

**If your default branch is `master`:**
```bash
git push heroku master
```

### Step 8: Open Your App
```bash
heroku open
```

---

## Complete Command Sequence (Copy-Paste Ready)

```bash
# Navigate to project
cd d:\noWaitingDashboard\my-login-app

# Login to Heroku
heroku login

# Create app (replace 'nowaiting-dashboard' with your preferred name)
heroku create nowaiting-dashboard

# Set buildpack
heroku buildpacks:set https://github.com/heroku/heroku-buildpack-static

# Set backend API URL
heroku config:set REACT_APP_API_BASE_URL=https://nowaiting-076a4d0af321.herokuapp.com

# Verify config
heroku config

# Initialize git if needed
git init
git add .
git commit -m "Prepare for Heroku deployment"

# Deploy
git push heroku main
# OR if using master branch:
# git push heroku master

# Open app
heroku open
```

---

## After Deployment

### View Logs
```bash
heroku logs --tail
```

### Update Environment Variables
```bash
heroku config:set REACT_APP_API_BASE_URL=https://new-backend-url.com
```

### View Your App Info
```bash
heroku info
```

### Get Your App URL
```bash
heroku apps:info
```

---

## Troubleshooting

### If build fails:
```bash
heroku logs --tail
```

### If you need to rebuild:
```bash
heroku builds:create
```

### If you need to restart:
```bash
heroku restart
```

### To check your app is running:
```bash
heroku ps
```

---

## Important Notes

1. **Backend API URL**: Your backend is already deployed at `https://nowaiting-076a4d0af321.herokuapp.com`
2. **Environment Variable**: The `REACT_APP_API_BASE_URL` will override the default in `api.js`
3. **Static Buildpack**: This buildpack will automatically run `npm run build` and serve the `build` folder
4. **Client-Side Routing**: The `static.json` file handles React Router routing correctly

---

## Your App Configuration Summary

- **Frontend:** React Dashboard (my-login-app)
- **Backend API:** https://nowaiting-076a4d0af321.herokuapp.com
- **Buildpack:** heroku-buildpack-static
- **Environment Variable:** REACT_APP_API_BASE_URL=https://nowaiting-076a4d0af321.herokuapp.com

