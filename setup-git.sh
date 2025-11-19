#!/bin/bash

# Git repository initialization and GitHub setup helper
echo "🚀 Git Repository Setup Helper"
echo "================================"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install git first:"
    echo "   sudo apt install git"
    exit 1
fi

# Check if already a git repository
if [ -d ".git" ]; then
    echo "✅ Git repository already initialized"
    echo ""
    
    # Show current status
    echo "📊 Current status:"
    git status -s
    
    # Check for remote
    if git remote | grep -q "origin"; then
        echo ""
        echo "✅ Remote 'origin' is configured:"
        git remote -v
        echo ""
        echo "📝 To push changes:"
        echo "   git add ."
        echo "   git commit -m 'Prepare for deployment'"
        echo "   git push origin main"
    else
        echo ""
        echo "⚠️  No remote repository configured"
        echo ""
        echo "📝 Next steps:"
        echo "   1. Create a new repository on GitHub: https://github.com/new"
        echo "   2. Run: git remote add origin https://github.com/atulyadav745/eterna.git"
        echo "   3. Run: git push -u origin main"
    fi
else
    echo "📦 Initializing new git repository..."
    git init
    echo "✅ Git repository initialized"
    echo ""
    
    # Set default branch to main
    git branch -M main
    echo "✅ Default branch set to 'main'"
    echo ""
    
    # Add all files
    echo "📝 Adding files..."
    git add .
    echo "✅ All files staged"
    echo ""
    
    # Create initial commit
    echo "💾 Creating initial commit..."
    git commit -m "Initial commit - Order Execution Engine with DEX routing

Features:
- Market order execution
- DEX routing (Raydium vs Meteora)
- WebSocket real-time updates
- Queue management with BullMQ
- 36 unit & integration tests
- Postman collection
- Ready for Render deployment"
    
    echo "✅ Initial commit created"
    echo ""
    
    echo "🎉 Repository setup complete!"
    echo ""
    echo "📝 Next steps:"
    echo ""
    echo "   1. Create a new repository on GitHub:"
    echo "      → Go to: https://github.com/new"
    echo "      → Repository name: eterna (or your choice)"
    echo "      → Make it PUBLIC (required for Render free tier)"
    echo "      → Don't initialize with README"
    echo "      → Click 'Create repository'"
    echo ""
    echo "   2. Connect to GitHub (replace YOUR_USERNAME):"
    echo "      git remote add origin https://github.com/atulyadav745/eterna.git"
    echo ""
    echo "   3. Push to GitHub:"
    echo "      git push -u origin main"
    echo ""
    echo "   4. Then proceed to Render deployment:"
    echo "      → See DEPLOYMENT_CHECKLIST.md"
    echo ""
fi

echo ""
echo "📖 For complete deployment instructions, see:"
echo "   - DEPLOYMENT_CHECKLIST.md (step-by-step)"
echo "   - DEPLOYMENT.md (detailed guide)"
