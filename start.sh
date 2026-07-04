#!/bin/bash
# Antigravity AI-WAF Startup Script for Linux

# Function to clean up background processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down AI-WAF Pipeline services..."
    # Kill background jobs
    jobs -p | xargs -r kill
    exit 0
}

# Trap CTRL+C
trap cleanup INT TERM

echo "=========================================================="
echo "🛡️  Launching Antigravity AI-WAF Pipeline..."
echo "=========================================================="

# 1. Start Python Flask AI Service
echo ""
echo "🤖 Starting Python WAF Inference Service on port 5000..."
cd waf-python
. venv/bin/activate
export WAF_PYTHON_PORT=5000
python app.py &
PYTHON_PID=$!
cd ..

# Wait a brief moment for Flask to initialize
sleep 2

# 2. Start Spring Boot Application
echo ""
echo "☕ Starting Spring Boot Protected Gateway on port 8080..."
cd waf-backend
if command -v mvn &>/dev/null; then
    mvn spring-boot:run &
else
    # Fallback to maven wrapper if available, or print error
    if [ -f "./mvnw" ]; then
        chmod +x mvnw
        ./mvnw spring-boot:run &
    else
        echo "❌ Maven not found. Please install maven or execute 'mvn spring-boot:run' manually inside 'waf-backend'."
        kill $PYTHON_PID
        exit 1
    fi
fi
cd ..

# Wait a moment for Spring Boot to load H2 database and schema
sleep 4

# 3. Start React Dashboard
echo ""
echo "🖥️  Starting React WAF Administration Dashboard on port 5173..."
cd waf-frontend
npm run dev &
cd ..

echo ""
echo "=========================================================="
echo "🚀 All systems loaded and running!"
echo "----------------------------------------------------------"
echo "  - AI WAF Classifier API : http://localhost:5000"
echo "  - WAF Admin Controller   : http://localhost:8080/api/waf/stats"
echo "  - WAF Web Dashboard      : http://localhost:5173"
echo "=========================================================="
echo "Press Ctrl+C to terminate all services."

# Wait for background jobs to complete (runs indefinitely until killed)
wait
