#!/bin/bash

# Railway startup script - runs database setup then starts the app
echo "🚀 Starting Railway deployment..."

# Start the Next.js application immediately
# (Database schema is already applied from the logs)
echo "🚀 Starting Next.js application..."
exec npm start