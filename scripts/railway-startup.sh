#!/bin/bash

# Railway startup script - runs database setup then starts the app
echo "🚀 Starting Railway deployment..."

# Run database migrations
echo "📦 Setting up database schema..."
npm run db:push

# Check if database setup was successful
if [ $? -eq 0 ]; then
    echo "✅ Database schema setup complete"
    
    # Run database seeding
    echo "🌱 Seeding database..."
    npm run db:seed-improved
    
    if [ $? -eq 0 ]; then
        echo "✅ Database seeded successfully"
    else
        echo "⚠️  Database seeding failed, but continuing..."
    fi
else
    echo "❌ Database setup failed"
    exit 1
fi

# Start the Next.js application
echo "🚀 Starting Next.js application..."
exec npm start