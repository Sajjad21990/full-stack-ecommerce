#!/bin/bash

# Railway's public database URL
echo "Connecting to Railway database..."
RAILWAY_PUBLIC_DB="postgresql://postgres:hNEFyBwxxxxhFrZzxIzLsIKq@gondola.proxy.rlwy.net:21853/railway"

echo "Setting temporary database URL..."
export DATABASE_URL="$RAILWAY_PUBLIC_DB"

echo "Running database push..."
npm run db:push

if [ $? -eq 0 ]; then
    echo "✅ Database schema updated successfully"
    echo "Running database seed..."
    npm run db:seed-improved
    
    if [ $? -eq 0 ]; then
        echo "✅ Database seeded successfully"
    else
        echo "❌ Database seeding failed"
    fi
else
    echo "❌ Database schema update failed"
fi