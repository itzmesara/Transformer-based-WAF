@echo off
echo ==========================================================
echo 🛡️  Antigravity AI-WAF Pipeline Setup Script for Windows
echo ==========================================================

echo.
echo 🔍 Step 1: Checking System Dependencies...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is NOT installed or not in PATH. Please install Python 3.10+.
    pause
    exit /b 1
) else (
    echo ✔ Python is available
)

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is NOT installed or not in PATH. Please install Node.js.
    pause
    exit /b 1
) else (
    echo ✔ Node.js is available
)

echo.
echo 📦 Step 2: Setting up Python AI Environment...
cd waf-python
if not exist "venv" (
    echo Creating virtual environment 'venv'...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Upgrading pip...
python -m pip install --upgrade pip

echo Installing Python dependencies (Flask, PyTorch, Transformers)...
pip install -r requirements.txt

echo Initializing Model Training...
python train.py

call deactivate
cd ..

echo.
echo 📦 Step 3: Installing React Frontend Dependencies...
cd waf-frontend
echo Running npm install...
call npm install
cd ..

echo.
echo ==========================================================
echo 🛡️  AI-WAF Windows Setup Complete!
echo ==========================================================
echo To run the WAF pipeline:
echo   1. Execute: start.bat
echo   2. Open browser to: http://localhost:5173
echo ==========================================================
pause
