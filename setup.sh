#!/bin/bash
# Antigravity AI-WAF Setup Script for Linux

# Exit on error
set -e

echo "=========================================================="
echo "🛡️  Antigravity AI-WAF Pipeline Setup Script for Linux"
echo "=========================================================="

# 1. System Requirements Verification
echo ""
echo "🔍 Step 1: Checking System Dependencies..."

# Check Python
if command -v python3 &>/dev/null; then
    echo "✔ Python3 is installed: $(python3 --version)"
else
    echo "❌ Python3 is NOT installed. Please run: sudo apt install -y python3 python3-pip python3-venv"
    exit 1
fi

# Check Java (JDK 17+)
if command -v java &>/dev/null; then
    JAVA_VER=$(java -version 2>&1 | head -n 1 | awk -F '"' '{print $2}')
    echo "✔ Java JDK is installed: $JAVA_VER"
else
    echo "⚠️  Java JDK is NOT installed in path. If missing, please run: sudo apt install -y openjdk-17-jdk"
fi

# Check Maven
if command -v mvn &>/dev/null; then
    echo "✔ Maven is installed: $(mvn -version | head -n 1)"
else
    echo "⚠️  Maven is not installed. We will compile using Spring Boot plugin or wrapper, but installing it is recommended: sudo apt install -y maven"
fi

# Check Node.js & npm
if command -v node &>/dev/null; then
    echo "✔ Node.js is installed: $(node -v)"
else
    echo "❌ Node.js is NOT installed. Please run: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs"
    exit 1
fi

# 2. Setup Python Virtual Environment and dependencies
echo ""
echo "📦 Step 2: Setting up Python AI Environment..."
cd waf-python
if [ ! -d "venv" ]; then
    echo "Creating virtual environment 'venv'..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
. venv/bin/activate

echo "Upgrading pip..."
pip install --upgrade pip

echo "Installing Python dependencies..."
if [ -f "requirements-light.txt" ]; then
    echo "✔ Found requirements-light.txt, installing lightweight dependencies (Flask, scikit-learn, etc.)..."
    pip install -r requirements-light.txt
else
    echo "✔ Installing full deep-learning dependencies (Flask, PyTorch, Transformers)..."
    pip install -r requirements.txt
fi

echo "Initializing Model Training (TF-IDF + Logistic Regression fallback model will compile)..."
python train.py

deactivate
cd ..

# 3. Setup React Frontend Dependencies
echo ""
echo "📦 Step 3: Installing React Frontend Dependencies..."
cd waf-frontend
echo "Running npm install..."
npm install
cd ..

echo ""
echo "=========================================================="
echo "🛡️  AI-WAF Pipeline Setup Complete!"
echo "=========================================================="
echo "To run the application:"
echo "  1. Execute: ./start.sh"
echo "  2. Open your browser and navigate to: http://localhost:5173"
echo "=========================================================="
