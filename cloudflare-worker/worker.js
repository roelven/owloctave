/**
 * Owl Octave - SoundCloud OAuth2 Token Exchange Worker
 *
 * This Cloudflare Worker securely exchanges SoundCloud client credentials
 * for an OAuth2 access token without exposing the client secret to the frontend.
 *
 * Tokens are cached for 23 hours to minimize API calls.
 */

export default {
  async fetch(request, env) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      // Check cache first
      const cache = caches.default;
      const cacheKey = new Request('https://token-cache.owloctave.internal/token', {
        method: 'GET',
      });

      let response = await cache.match(cacheKey);

      if (response) {
        console.log('Returning cached token');
        // Add CORS headers to cached response
        response = new Response(response.body, response);
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('X-Cache-Status', 'HIT');
        return response;
      }

      console.log('Fetching new token from SoundCloud');

      // Exchange credentials for token
      const tokenResponse = await fetch('https://api.soundcloud.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: env.SOUNDCLOUD_CLIENT_ID,
          client_secret: env.SOUNDCLOUD_CLIENT_SECRET,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('SoundCloud API error:', errorText);
        return new Response(
          JSON.stringify({
            error: 'Failed to obtain access token',
            details: errorText
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      const data = await tokenResponse.json();

      // Create response with only the access token
      response = new Response(
        JSON.stringify({
          access_token: data.access_token,
          expires_in: data.expires_in || 86400,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=82800', // 23 hours
            'X-Cache-Status': 'MISS',
          },
        }
      );

      // Cache for 23 hours (83800 seconds)
      await cache.put(cacheKey, response.clone());

      return response;

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error.message
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};
