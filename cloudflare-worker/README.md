# Owl Octave - Cloudflare Worker for SoundCloud OAuth2

This worker handles secure token exchange for the Owl Octave application.

## Setup

1. **Install Wrangler CLI** (if not already installed):
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Set Environment Variables**:
   ```bash
   wrangler secret put SOUNDCLOUD_CLIENT_ID
   # When prompted, paste your SoundCloud Client ID

   wrangler secret put SOUNDCLOUD_CLIENT_SECRET
   # When prompted, paste your SoundCloud Client Secret
   ```

4. **Deploy the Worker**:
   ```bash
   wrangler deploy
   ```

5. **Get Worker URL**:
   After deployment, you'll receive a URL like:
   ```
   https://owl-octave-token.YOUR-SUBDOMAIN.workers.dev
   ```

   Copy this URL and use it in `/js/script.js` as the `tokenEndpoint` variable.

## Testing

Test the worker after deployment:

```bash
curl https://owl-octave-token.YOUR-SUBDOMAIN.workers.dev
```

Expected response:
```json
{
  "access_token": "xxxxx",
  "expires_in": 86400
}
```

## Custom Domain (Optional)

To use a custom domain like `token.owloctave.com`:

1. Add a CNAME record in your DNS:
   ```
   token.owloctave.com -> owl-octave-token.YOUR-SUBDOMAIN.workers.dev
   ```

2. In Cloudflare dashboard, add the custom domain to your worker

3. Update the routes in `wrangler.toml` and redeploy

## Caching

The worker caches tokens for 23 hours to minimize SoundCloud API calls:
- First request: Fetches from SoundCloud (cache MISS)
- Subsequent requests: Returns cached token (cache HIT)
- After 23 hours: Fetches new token automatically

## Security

- Client secret is stored as an environment variable (not in code)
- CORS is enabled for browser access
- Only GET requests are allowed
- Errors are logged but don't expose sensitive information

## Monitoring

Check worker logs:
```bash
wrangler tail
```

This shows real-time logs including cache hits/misses and any errors.
