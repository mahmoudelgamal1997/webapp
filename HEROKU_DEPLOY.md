# Deploying React App to Heroku

This guide explains how to deploy your React application to Heroku using the static buildpack.

## Prerequisites

1. Heroku account (sign up at https://heroku.com)
2. Heroku CLI installed (download from https://devcenter.heroku.com/articles/heroku-cli)
3. Git installed

## Deployment Steps

### Option 1: Using Heroku CLI (Recommended)

1. **Navigate to your app directory:**
   ```bash
   cd my-login-app
   ```

2. **Login to Heroku:**
   ```bash
   heroku login
   ```

3. **Create a new Heroku app:**
   ```bash
   heroku create your-app-name
   ```
   (Replace `your-app-name` with your desired app name, or leave it blank to auto-generate)

4. **Set the buildpack to static:**
   ```bash
   heroku buildpacks:set https://github.com/heroku/heroku-buildpack-static
   ```

5. **Set environment variables (if needed):**
   ```bash
   heroku config:set REACT_APP_API_BASE_URL=https://your-backend-url.herokuapp.com
   ```
   
   (Update with your actual backend API URL)

6. **Deploy:**
   ```bash
   git init  # If not already a git repo
   git add .
   git commit -m "Initial commit"
   git push heroku main
   ```
   
   If your default branch is `master`:
   ```bash
   git push heroku master
   ```

7. **Open your app:**
   ```bash
   heroku open
   ```

### Option 2: Using Heroku Dashboard

1. Go to https://dashboard.heroku.com/new-app
2. Create a new app
3. Go to Settings → Buildpacks
4. Add buildpack: `https://github.com/heroku/heroku-buildpack-static`
5. Connect your GitHub repository
6. Enable automatic deploys or deploy manually

## Important Notes

### Environment Variables

Make sure to set any required environment variables in Heroku:
- `REACT_APP_API_BASE_URL` - Your backend API URL

To view current config:
```bash
heroku config
```

To set a variable:
```bash
heroku config:set REACT_APP_API_BASE_URL=https://your-api-url.com
```

### Build Process

The static buildpack will:
1. Run `npm install`
2. Run `npm run build` (builds your React app)
3. Serve the `build` directory as static files

### Client-Side Routing

The `static.json` file is configured to handle React Router's client-side routing by redirecting all routes to `index.html`.

### Troubleshooting

**Build fails:**
- Check that `package.json` has a `build` script
- Check Heroku logs: `heroku logs --tail`

**App shows blank page:**
- Check browser console for errors
- Verify environment variables are set correctly
- Check that API URLs are correct

**Routes not working:**
- Ensure `static.json` exists with the correct configuration
- Verify the buildpack is set to `heroku-buildpack-static`

## Alternative: Using Node.js Buildpack (if you need server-side rendering)

If you prefer to use a Node.js server, you can use the Node.js buildpack instead:

1. Create a simple Express server in `server.js`
2. Set buildpack: `heroku/nodejs`
3. Update `package.json` to include Express and a start script

## Additional Resources

- [Heroku Static Buildpack](https://elements.heroku.com/buildpacks/heroku/heroku-buildpack-static)
- [React Deployment Guide](https://create-react-app.dev/docs/deployment/)
- [Heroku Node.js Support](https://devcenter.heroku.com/articles/nodejs-support)

