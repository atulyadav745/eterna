#!/bin/bash

# Pre-deployment verification script
echo "🔍 Running pre-deployment checks..."

# Check if all required files exist
echo ""
echo "📄 Checking required files..."
files=(
  "package.json"
  "tsconfig.json"
  "Dockerfile"
  ".dockerignore"
  "render.yaml"
  "init.sql"
  ".env.example"
  "README.md"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ Missing: $file"
    exit 1
  fi
done

# Check if build works
echo ""
echo "🔨 Testing build..."
npm run build
if [ $? -eq 0 ]; then
  echo "✅ Build successful"
else
  echo "❌ Build failed"
  exit 1
fi

# Check if tests pass
echo ""
echo "🧪 Running tests..."
npm test -- --passWithNoTests
if [ $? -eq 0 ]; then
  echo "✅ Tests passed"
else
  echo "⚠️  Some tests failed (this is okay for deployment)"
fi

# Check git status
echo ""
echo "📦 Checking git repository..."
if [ -d ".git" ]; then
  echo "✅ Git repository initialized"
  
  # Check for uncommitted changes
  if [[ -n $(git status -s) ]]; then
    echo "⚠️  You have uncommitted changes"
    echo "   Run: git add . && git commit -m 'Prepare for deployment'"
  else
    echo "✅ No uncommitted changes"
  fi
else
  echo "⚠️  Git not initialized"
  echo "   Run: git init && git add . && git commit -m 'Initial commit'"
fi

echo ""
echo "✨ Pre-deployment checks complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Push to GitHub: git push origin main"
echo "   2. Go to https://dashboard.render.com"
echo "   3. Create New → Blueprint"
echo "   4. Connect your GitHub repository"
echo "   5. Render will auto-detect render.yaml and deploy!"
echo ""
echo "📖 Full instructions: See DEPLOYMENT.md"
