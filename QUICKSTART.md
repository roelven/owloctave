# Quick Start Guide

Get your Owl Octave app running in 15 minutes!

## Prerequisites

- [ ] SoundCloud Client ID and Secret (from https://soundcloud.com/you/apps)
- [ ] Cloudflare account (free tier: https://dash.cloudflare.com/sign-up)
- [ ] Node.js installed (`node --version`)

## Step-by-Step Deployment

### 1. Deploy Worker (5 minutes)

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Go to worker directory
cd cloudflare-worker

# Set your credentials
wrangler secret put SOUNDCLOUD_CLIENT_ID
# Paste your Client ID when prompted

wrangler secret put SOUNDCLOUD_CLIENT_SECRET
# Paste your Client Secret when prompted

# Deploy!
wrangler deploy
```

**Copy the worker URL** from the output (looks like `https://owl-octave-token.xxx.workers.dev`)

### 2. Update Frontend (2 minutes)

```bash
# Go back to project root
cd ..

# Edit js/script.js line 17
# Replace: var tokenEndpoint = 'https://owl-octave-token.YOUR-SUBDOMAIN.workers.dev';
# With your actual worker URL

# Use your favorite editor
code js/script.js  # VS Code
nano js/script.js  # Terminal editor
```

### 3. Test Locally (3 minutes)

```bash
# Run the test script
./test-api.sh

# When prompted, enter your worker URL
# All tests should pass ✓

# Start local server
python3 -m http.server 8000

# Open in browser
open http://localhost:8000
```

**Expected result**: All 13 owls appear and play sounds when clicked!

### 4. Deploy to Production (5 minutes)

```bash
# Stage all changes
git add .

# Commit
git commit -m "Implement OAuth2 with HLS streaming

- Add Cloudflare Worker for secure token exchange
- Update to HLS streaming format
- Fix jQuery .live() deprecation
- Add error handling and loading states

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to GitHub
git push origin master
```

**Wait 2 minutes** for GitHub Pages to rebuild, then visit your site!

## Troubleshooting

### "Authentication failed"
- Check secrets are set: `wrangler secret list`
- Test worker: `curl https://your-worker-url`

### "Failed to load owl sounds"
- Verify token works with SoundCloud API
- Check browser console for errors

### "No sound plays"
- Check network tab in DevTools
- Verify hls.js loaded (type `Hls` in console)

## Need More Help?

- **Full guide**: See `DEPLOYMENT.md`
- **API testing**: Run `./test-api.sh`
- **Worker logs**: Run `wrangler tail` in `cloudflare-worker/` directory
- **Implementation details**: See `IMPLEMENTATION_SUMMARY.md`

## Success Checklist

- [ ] Worker deployed and returning token
- [ ] Frontend updated with worker URL
- [ ] Local testing passes
- [ ] All owls display on page
- [ ] Clicking owls plays sounds
- [ ] No console errors
- [ ] Deployed to GitHub Pages
- [ ] Live site works

**Once all checked, you're done! 🦉🎵**
