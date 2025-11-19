#!/bin/bash

# Render Deployment Setup Script
# This script initializes the database schema on Render PostgreSQL

set -e

echo "🚀 Setting up Eterna Order Execution Engine on Render..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building application..."
npm run build

echo "🗄️  Running database migrations..."
# Run the init.sql file
if command -v psql &> /dev/null; then
  psql $DATABASE_URL -f init.sql
  echo "✅ Database schema created successfully"
else
  echo "⚠️  psql not found. Please run init.sql manually on your database."
  echo "   You can do this from the Render dashboard or using a PostgreSQL client."
fi

echo "✨ Setup complete! Application is ready to start."
echo "   Run 'npm start' to launch the server."
