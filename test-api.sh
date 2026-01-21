#!/bin/bash

# Owl Octave API Testing Script
# This script tests the SoundCloud OAuth2 integration

set -e

echo "🦉 Owl Octave API Testing Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning:${NC} jq is not installed. Install with: brew install jq"
    USE_JQ=false
else
    USE_JQ=true
fi

# Get worker URL from user
echo "Enter your Cloudflare Worker URL:"
echo "(e.g., https://owl-octave-token.YOUR-SUBDOMAIN.workers.dev)"
read -r WORKER_URL

if [ -z "$WORKER_URL" ]; then
    echo -e "${RED}Error:${NC} Worker URL is required"
    exit 1
fi

echo ""
echo "Step 1: Testing Worker Token Endpoint"
echo "--------------------------------------"

RESPONSE=$(curl -s -w "\n%{http_code}" "$WORKER_URL")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    print_status 0 "Worker responded with HTTP 200"

    if [ "$USE_JQ" = true ]; then
        TOKEN=$(echo "$BODY" | jq -r '.access_token')
        if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
            print_status 0 "Access token received"
            echo "   Token: ${TOKEN:0:20}..."
        else
            print_status 1 "No access token in response"
            echo "$BODY"
            exit 1
        fi
    else
        if echo "$BODY" | grep -q "access_token"; then
            print_status 0 "Access token received"
            TOKEN=$(echo "$BODY" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
            echo "   Token: ${TOKEN:0:20}..."
        else
            print_status 1 "No access token in response"
            echo "$BODY"
            exit 1
        fi
    fi
else
    print_status 1 "Worker returned HTTP $HTTP_CODE"
    echo "$BODY"
    exit 1
fi

echo ""
echo "Step 2: Testing SoundCloud Playlist API"
echo "----------------------------------------"

PLAYLIST_RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: OAuth $TOKEN" \
    "https://api.soundcloud.com/playlists/1362578")

PLAYLIST_HTTP_CODE=$(echo "$PLAYLIST_RESPONSE" | tail -n1)
PLAYLIST_BODY=$(echo "$PLAYLIST_RESPONSE" | sed '$d')

if [ "$PLAYLIST_HTTP_CODE" -eq 200 ]; then
    print_status 0 "Playlist API responded with HTTP 200"

    if [ "$USE_JQ" = true ]; then
        TRACK_COUNT=$(echo "$PLAYLIST_BODY" | jq '.tracks | length')
        print_status 0 "Found $TRACK_COUNT tracks in playlist"

        echo ""
        echo "Sample tracks:"
        echo "$PLAYLIST_BODY" | jq -r '.tracks[0:3][] | "  - \(.title)"'

        # Check for HLS transcodings
        HLS_FOUND=$(echo "$PLAYLIST_BODY" | jq -r '.tracks[0].media.transcodings[] | select(.format.protocol == "hls") | .url' | head -n1)

        if [ -n "$HLS_FOUND" ]; then
            print_status 0 "HLS streaming URLs found"
            echo "   Sample HLS URL: ${HLS_FOUND:0:60}..."
        else
            print_status 1 "No HLS streaming URLs found"
            echo "   This might cause playback issues"
        fi
    else
        if echo "$PLAYLIST_BODY" | grep -q "tracks"; then
            print_status 0 "Playlist data received"
        else
            print_status 1 "No tracks in playlist response"
        fi
    fi
else
    print_status 1 "Playlist API returned HTTP $PLAYLIST_HTTP_CODE"
    echo "$PLAYLIST_BODY"
    exit 1
fi

echo ""
echo "Step 3: Testing CORS Headers"
echo "-----------------------------"

CORS_RESPONSE=$(curl -s -I "$WORKER_URL" | grep -i "access-control-allow-origin")

if [ -n "$CORS_RESPONSE" ]; then
    print_status 0 "CORS headers present"
    echo "   $CORS_RESPONSE"
else
    print_status 1 "CORS headers missing"
    echo "   This will cause issues with browser requests"
fi

echo ""
echo "Step 4: Checking Local Configuration"
echo "-------------------------------------"

if [ -f "js/script.js" ]; then
    print_status 0 "script.js found"

    SCRIPT_ENDPOINT=$(grep "tokenEndpoint" js/script.js | head -n1)
    echo "   Current endpoint: $SCRIPT_ENDPOINT"

    if echo "$SCRIPT_ENDPOINT" | grep -q "YOUR-SUBDOMAIN"; then
        print_status 1 "Worker URL not updated in script.js"
        echo "   Please update line 17 in js/script.js with your worker URL"
    else
        print_status 0 "Worker URL configured in script.js"
    fi
else
    print_status 1 "script.js not found - are you in the correct directory?"
fi

if [ -f "index.html" ]; then
    print_status 0 "index.html found"

    if grep -q "hls.js" index.html; then
        print_status 0 "hls.js library included in HTML"
    else
        print_status 1 "hls.js library not found in HTML"
    fi
else
    print_status 1 "index.html not found - are you in the correct directory?"
fi

echo ""
echo "=================================="
echo "Testing Complete!"
echo ""
echo "Next steps:"
echo "1. If all tests passed, update js/script.js with your worker URL"
echo "2. Test locally: python3 -m http.server 8000"
echo "3. Open http://localhost:8000 in your browser"
echo "4. Commit and push to deploy to GitHub Pages"
echo ""
echo "If tests failed, check the DEPLOYMENT.md guide for troubleshooting"
