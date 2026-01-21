# Owl Octave - Deployment Guide

This guide will walk you through deploying the updated Owl Octave application with OAuth2 and HLS streaming support.

## Prerequisites

- SoundCloud account with API credentials
- Cloudflare account (free tier is sufficient)
- Node.js and npm installed locally
- Git configured

## Step 1: Deploy Cloudflare Worker

### 1.1 Install Wrangler CLI

```bash
npm install -g wrangler
```

### 1.2 Login to Cloudflare

```bash
wrangler login
```

This will open a browser window to authenticate with your Cloudflare account.

### 1.3 Navigate to Worker Directory

```bash
cd cloudflare-worker
```

### 1.4 Set Environment Secrets

You'll need to add your SoundCloud credentials as secrets. These are stored securely by Cloudflare and never exposed in your code.

```bash
# Add your SoundCloud Client ID
wrangler secret put SOUNDCLOUD_CLIENT_ID
# When prompted, paste your Client ID and press Enter

# Add your SoundCloud Client Secret
wrangler secret put SOUNDCLOUD_CLIENT_SECRET
# When prompted, paste your Client Secret and press Enter
```

**IMPORTANT**: Your Client Secret should NEVER be committed to git or exposed in frontend code.

### 1.5 Deploy Worker

```bash
wrangler deploy
```

After deployment, you'll see output like:

```
Published owl-octave-token (2.3 sec)
  https://owl-octave-token.YOUR-SUBDOMAIN.workers.dev
```

**Copy this URL** - you'll need it in the next step.

### 1.6 Test Worker

Verify the worker is functioning:

```bash
curl https://owl-octave-token.YOUR-SUBDOMAIN.workers.dev
```

Expected response:

```json
{
  "access_token": "2-xxxxx-xxxxxx-xxxxxxxxxx",
  "expires_in": 86400
}
```

If you see an error, check your secrets are set correctly:

```bash
wrangler secret list
```

## Step 2: Update Frontend Configuration

### 2.1 Update Token Endpoint

Edit `js/script.js` and replace the placeholder URL on line 17:

**Before:**
```javascript
var tokenEndpoint = 'https://owl-octave-token.YOUR-SUBDOMAIN.workers.dev';
```

**After:**
```javascript
var tokenEndpoint = 'https://owl-octave-token.YOUR-ACTUAL-SUBDOMAIN.workers.dev';
```

Replace `YOUR-ACTUAL-SUBDOMAIN` with the subdomain from your worker URL.

### 2.2 Commit Changes

```bash
git add js/script.js cloudflare-worker/
git commit -m "Update to OAuth2 with HLS streaming

- Implement OAuth2 client credentials flow
- Add HLS streaming support with hls.js
- Fix jQuery .live() deprecation
- Add error handling and loading states
- Deploy Cloudflare Worker for token exchange

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### 2.3 Push to GitHub

```bash
git push origin master
```

GitHub Pages will automatically rebuild and deploy your site.

## Step 3: Verify Deployment

### 3.1 Wait for GitHub Pages Build

GitHub Pages typically takes 1-2 minutes to rebuild after a push. You can check the status at:

```
https://github.com/YOUR-USERNAME/owloctave/actions
```

### 3.2 Test the Live Site

Once deployed, visit your site:

```
https://owloctave.com
```

**What to check:**

1. **Loading State**: You should see "Loading owl sounds..." briefly
2. **Owls Render**: All 13 owls should appear in the grid
3. **Click Test**: Click any owl - it should play the corresponding sound
4. **Title Update**: The title should update with the owl species name
5. **Console**: Open browser DevTools (F12) - there should be no errors
6. **HTTPS**: Check the address bar - no mixed content warnings

### 3.3 Browser Testing

Test in multiple browsers:

- **Chrome/Edge**: Uses hls.js for streaming
- **Firefox**: Uses hls.js for streaming
- **Safari**: Native HLS support
- **Mobile Safari**: Native HLS support
- **Chrome Mobile**: Uses hls.js for streaming

## Step 4: Monitoring and Debugging

### 4.1 View Worker Logs

To monitor real-time worker activity:

```bash
cd cloudflare-worker
wrangler tail
```

This shows:
- Incoming requests
- Cache hits/misses
- Token refreshes
- Errors

### 4.2 Check Browser Console

If owls don't load, open DevTools Console (F12) and look for:

- **Token fetch errors**: Check worker URL is correct
- **Playlist errors**: Check SoundCloud API response
- **HLS errors**: Check transcoding URLs are available
- **CORS errors**: Ensure worker returns proper headers

### 4.3 Common Issues

#### "Authentication failed"

**Cause**: Worker can't fetch token from SoundCloud

**Solutions**:
- Verify secrets are set: `wrangler secret list`
- Check credentials are valid on SoundCloud
- Test worker directly: `curl https://your-worker-url`

#### "Failed to load owl sounds"

**Cause**: Can't fetch playlist from SoundCloud API

**Solutions**:
- Check playlist ID (1362578) is still valid
- Test API directly:
  ```bash
  TOKEN=$(curl -s https://your-worker-url | jq -r .access_token)
  curl -H "Authorization: OAuth $TOKEN" https://api.soundcloud.com/playlists/1362578
  ```
- Verify token has proper permissions

#### "No sound plays when clicking owls"

**Cause**: HLS streaming issues

**Solutions**:
- Check browser supports HLS (all modern browsers do)
- Verify hls.js loaded: Open console and type `Hls` - should show constructor
- Check network tab for 404s on audio streams
- Verify transcodings array has HLS format

#### "Mixed content warning"

**Cause**: HTTP resources on HTTPS page

**Solutions**:
- Check all script tags use `https://`
- Verify worker URL uses `https://`
- Check SoundCloud API returns HTTPS URLs

## Step 5: Optional Custom Domain

To use a custom domain for your worker (e.g., `token.owloctave.com`):

### 5.1 Add DNS Record

In your DNS provider (likely Cloudflare if you're using their nameservers):

```
Type: CNAME
Name: token
Target: owl-octave-token.YOUR-SUBDOMAIN.workers.dev
Proxy: Yes (orange cloud)
```

### 5.2 Add Custom Domain in Cloudflare Dashboard

1. Go to Workers & Pages
2. Select your `owl-octave-token` worker
3. Go to Settings → Domains & Routes
4. Click "Add Custom Domain"
5. Enter `token.owloctave.com`
6. Click "Add Domain"

### 5.3 Update Frontend

Edit `js/script.js`:

```javascript
var tokenEndpoint = 'https://token.owloctave.com';
```

Commit and push:

```bash
git add js/script.js
git commit -m "Use custom domain for token endpoint"
git push origin master
```

## Step 6: Performance Optimization

### 6.1 Worker Caching

The worker automatically caches tokens for 23 hours. Check cache performance:

```bash
wrangler tail
```

Look for `X-Cache-Status: HIT` in responses (after the first request).

### 6.2 GitHub Pages Caching

GitHub Pages automatically sets cache headers for static assets (CSS, JS, images).

### 6.3 Expected Load Times

- **First visit**: 2-3 seconds (token fetch + playlist fetch)
- **Subsequent visits**: 1-2 seconds (cached token)
- **Audio playback start**: < 1 second after click

## Step 7: Maintenance

### 7.1 Token Expiry

SoundCloud tokens typically expire after 24 hours. The worker automatically:
- Caches tokens for 23 hours
- Fetches new tokens after expiry
- Users never see expired tokens

### 7.2 Updating Secrets

If you need to rotate credentials:

```bash
cd cloudflare-worker
wrangler secret put SOUNDCLOUD_CLIENT_ID
wrangler secret put SOUNDCLOUD_CLIENT_SECRET
wrangler deploy
```

### 7.3 Worker Updates

To update worker code:

```bash
cd cloudflare-worker
# Edit worker.js
wrangler deploy
```

No need to clear cache - Cloudflare updates instantly.

## Troubleshooting Checklist

If something isn't working, check these in order:

- [ ] Worker is deployed: `wrangler deployments list`
- [ ] Secrets are set: `wrangler secret list`
- [ ] Worker responds: `curl https://your-worker-url`
- [ ] Token is valid: Test with SoundCloud API
- [ ] Frontend URL is correct in `js/script.js`
- [ ] GitHub Pages deployed latest: Check Actions tab
- [ ] Browser console has no errors: Press F12
- [ ] Network tab shows successful requests: Check DevTools
- [ ] hls.js is loaded: Type `Hls` in console
- [ ] CORS headers present: Check network response headers

## Security Notes

✅ **Secure:**
- Client Secret stored in Cloudflare (never exposed)
- Tokens cached server-side only
- CORS configured for owloctave.com only (can be restricted)
- HTTPS enforced everywhere

❌ **Not exposed:**
- Client Secret (never in git or frontend)
- Token exchange logic (in worker only)
- Raw API responses (filtered by worker)

## Support

If you encounter issues:

1. Check worker logs: `wrangler tail`
2. Check browser console: Press F12
3. Test worker directly: `curl https://your-worker-url`
4. Verify API access: Test SoundCloud API with token

## Success Criteria

The deployment is successful when:

✅ All 13 owls display in original layout
✅ Clicking any owl plays its corresponding hoot sound
✅ Only one owl can play at a time
✅ Title displays correct owl species and note
✅ CSS animations work smoothly
✅ No browser console errors
✅ Works on Chrome, Firefox, Safari, Edge
✅ HTTPS site has no mixed content warnings
✅ Error handling provides user feedback
✅ Page loads in under 5 seconds

## Next Steps

After successful deployment:

1. Test on mobile devices
2. Monitor worker logs for errors
3. Check analytics for user engagement
4. Consider adding keyboard controls (original feature)
5. Add social sharing with proper OG tags
6. Consider Progressive Web App features

---

**Congratulations!** Your Owl Octave application is now running with modern OAuth2 authentication and HLS streaming.
