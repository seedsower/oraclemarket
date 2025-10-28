#!/bin/bash

# Migration script to set up Neon database

echo "🚀 Starting Neon Database Migration..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set"
  echo "Please set your Neon connection string:"
  echo "export DATABASE_URL='postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require'"
  exit 1
fi

echo "✅ DATABASE_URL is set"

# Run Drizzle push to create tables
echo "📦 Creating database schema..."
npx drizzle-kit push

if [ $? -eq 0 ]; then
  echo "✅ Database schema created successfully!"
  echo ""
  echo "🎉 Migration complete!"
  echo ""
  echo "Next steps:"
  echo "1. Update your Netlify environment variables with this DATABASE_URL"
  echo "2. Deploy your application to Netlify"
else
  echo "❌ Migration failed. Please check the error above."
  exit 1
fi
