#!/bin/bash

NGROK_URL="$1"

if [ -z "$NGROK_URL" ]; then
    echo "❌ Error: Please provide ngrok URL"
    echo "Usage: bash update_vercel.sh https://your-ngrok-url.ngrok-free.dev"
    exit 1
fi

NGROK_URL="${NGROK_URL%/}"

echo "🚀 StreamFlow Vercel Update"
echo "=========================="
echo "API URL: $NGROK_URL/api"
echo ""

cd ~/streamflow/frontend
vercel env add VITE_API_URL "$NGROK_URL/api" production --yes

if [ $? -eq 0 ]; then
    echo "✅ Environment variable set!"
    vercel deploy --prod
    echo ""
    echo "✅ SUCCESS!"
    echo "🌐 https://streamflow-frontend.vercel.app"
else
    echo "❌ Failed"
    exit 1
fi
