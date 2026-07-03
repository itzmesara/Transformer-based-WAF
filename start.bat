@echo off
echo ==========================================================
echo 🛡️  Launching Antigravity AI-WAF Pipeline (Windows)
echo ==========================================================

echo.
echo [1/3] Starting Python WAF Inference Service (Port 5000)...
start "AI WAF Python Classifier" cmd /c "cd waf-python && call venv\Scripts\activate.bat && python app.py"

echo.
echo [2/3] Starting Spring Boot Protected Gateway (Port 8080)...
cd waf-backend
mvn -v >nul 2>&1
if %errorlevel% equ 0 (
    start "WAF Spring Boot Gateway" cmd /c "mvn spring-boot:run"
) else (
    if exist "mvnw.cmd" (
        start "WAF Spring Boot Gateway" cmd /c "mvnw.cmd spring-boot:run"
    ) else (
        echo ⚠️ Maven not found. Please run 'mvn spring-boot:run' manually inside 'waf-backend'.
    )
)
cd ..

echo.
echo [3/3] Starting React WAF Admin Dashboard (Port 5173)...
start "WAF Admin Dashboard" cmd /c "cd waf-frontend && npm run dev"

echo.
echo ==========================================================
echo 🚀 Services spawned successfully!
echo.
echo   - AI WAF Classifier API : http://localhost:5000
echo   - WAF Admin Controller   : http://localhost:8080/api/waf/stats
echo   - WAF Web Dashboard      : http://localhost:5173
echo ==========================================================
echo Close the respective spawned command windows to stop each service.
echo ==========================================================
