# 🛡️ Transformer-Based Web Application Firewall (WAF) Pipeline

An end-to-end, context-aware Web Application Firewall (WAF) pipeline. It intercepts incoming HTTP requests, performs semantic and statistical feature analysis using a deep learning Transformer model (DistilBERT) in Python, logs security events into a database, blocks malicious payloads in real-time, and visualizes stats/logs on a premium React dashboard.

---

## 🏗️ System Architecture

The pipeline consists of three decoupled microservices:

1. **Python AI Classifier Service (`/waf-python`)**:
   - Runs a Flask server (`app.py`) exposing the `/predict` API.
   - Utilizes a fine-tuned Hugging Face **DistilBERT** sequence classification model to semantically inspect payloads.
   - **Dual-Mode System**: Implements an automatic fallback to a TF-IDF + Logistic Regression model trained on-the-fly if system memory or package installations restrict transformer deployment.
   - Extracts engineered features: Request length, character entropy, special character count, encoded sequence count, script tag density, and malicious keyword presence.
2. **Spring Boot Security Interceptor (`/waf-backend`)**:
   - Intercepts requests using an HTTP Servlet Filter (`WafFilter`).
   - Employs a custom request wrapper (`CachedBodyHttpServletRequest`) to cache body input streams, preventing downstream Spring controllers from failing with closed-stream errors.
   - Stores log events (allowed/blocked metadata) into an H2 database.
   - Exposes administrative and telemetry endpoints for configuration updates, statistics, and log feeds.
3. **React WAF Dashboard (`/waf-frontend`)**:
   - Displays real-time threat metrics (total requests, block rate, latency, attack type breakdown).
   - Renders a **Heuristics Sandbox** where developers can test preset attacks (SQLi, XSS, Command Injection, Benign) and observe raw HTTP request-response states in a simulated security console.
   - Exposes configuration controls to toggle blocking modes and slide detection thresholds at runtime.

---

## 📂 Project Structure

```text
d:\AntiGravity_Project\
├── waf-python/               # Python AI Inference Service
│   ├── app.py                # Flask Server (Inference API)
│   ├── train.py              # Model Fine-Tuning & Dataset Generator
│   └── requirements.txt      # Python dependencies
├── waf-backend/              # Spring Boot Request Interceptor
│   ├── pom.xml               # Maven configuration
│   └── src/main/java/com/waf/
│       ├── WafBackendApplication.java
│       ├── config/           # Properties mapping
│       ├── controller/       # WAF Admin & Demo test controllers
│       ├── entity/           # WafLog JPA entity
│       ├── filter/           # WafFilter & Caching Request Wrapper
│       ├── model/            # DTO response maps
│       └── repository/       # WafLog JPA repository
├── waf-frontend/             # React Administration Dashboard
│   ├── package.json          # Node configurations
│   ├── index.html            # Entry HTML
│   └── src/
│       ├── main.jsx          # Entry point
│       ├── index.css         # Premium Glassmorphic Styling
│       ├── App.jsx           # Tab routing & Polling controller
│       └── components/       # Dashboard, Logs, Sandbox & Status panels
├── setup.sh / setup.bat      # Installers (Linux / Windows)
└── start.sh / start.bat      # Concurrent Launchers (Linux / Windows)
```

---

## ⚡ Setup & Run Instructions

### 🐧 Running on Linux (Target Environment)

1. **Verify Prerequisites**:
   Ensure you have Java 17+, Node.js 18+, and Python 3.10+ installed.

2. **Execute Setup**:
   Run the installation script to configure the python virtual environment, compile fallback models, and install React Node modules:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Launch the Pipeline**:
   Start the concurrently running services:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

4. **Access Dashboard**:
   Open your web browser and navigate to `http://localhost:5173`.

---

### 🪟 Running on Windows (Local Testing)

1. **Execute Setup**:
   Open Command Prompt (or PowerShell) and run:
   ```cmd
   setup.bat
   ```
   This creates the python `venv`, trains the Logistic Regression fallback model, and runs `npm install`.

2. **Launch Services**:
   Execute the launcher:
   ```cmd
   start.bat
   ```
   This spawns three separate Command Prompt windows running the Flask API (port 5000), Spring Boot (port 8080), and Vite React (port 5173).

---

## 🔌 Reusable WAF Integration Guide (For Your Own Spring Boot App)

To integrate this WAF security layer into your own Spring Boot project, copy the following files from `waf-backend` into your codebase:

### Step 1: Add Dependencies
Add the following dependency tags to your own `pom.xml`:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

### Step 2: Copy Reusable Classes
Copy the classes to your project package structure:
1. **Request CachingWrapper**: [CachedBodyHttpServletRequest.java](file:///d:/AntiGravity_Project/waf-backend/src/main/java/com/waf/filter/CachedBodyHttpServletRequest.java)
   * *Purpose*: Caches the servlet input stream so it can be scanned without closing.
2. **WAF Servlet Filter**: [WafFilter.java](file:///d:/AntiGravity_Project/waf-backend/src/main/java/com/waf/filter/WafFilter.java)
   * *Purpose*: Main interceptor filter. Set it as a `@Component` or register it in a filter configuration bean.
3. **Properties Configuration**: [WafProperties.java](file:///d:/AntiGravity_Project/waf-backend/src/main/java/com/waf/config/WafProperties.java)
   * *Purpose*: Maps variables from properties.
4. **Data Entities & Telemetry**: Copy [WafLog.java](file:///d:/AntiGravity_Project/waf-backend/src/main/java/com/waf/entity/WafLog.java), [WafLogRepository.java](file:///d:/AntiGravity_Project/waf-backend/src/main/java/com/waf/repository/WafLogRepository.java), and [WafController.java](file:///d:/AntiGravity_Project/waf-backend/src/main/java/com/waf/controller/WafController.java).
   * *Purpose*: Sets up the JPA logging database and exposes endpoints for logs/charts.

### Step 3: Add Properties
Append these properties to your `src/main/resources/application.properties` (or `application.yml` equivalent):
```properties
# Custom WAF Properties
waf.python.url=http://localhost:5000/predict
waf.blocking.enabled=true
waf.confidence.threshold=0.70
# Add your bypass paths here
waf.bypass.paths=/api/waf/**,/h2-console/**,/favicon.ico,/index.html,/assets/**
```

---

## 🎛️ REST API Documentation

### ⚙️ WAF Administration Endpoints (Spring Boot)

* **GET `/api/waf/stats`**:
  Fetches aggregate threat statistics (total requests, block rate, latency averages, and category breakdowns).
* **GET `/api/waf/logs`**:
  Returns all request events, sorted newest first.
* **POST `/api/waf/config`**:
  Updates WAF parameters. Body format:
  ```json
  {
    "blockingEnabled": true,
    "confidenceThreshold": 0.75
  }
  ```
* **POST `/api/waf/clear`**:
  Clears the in-memory database of all logged security events.

### 🧪 WAF Protected Testing Endpoints (Spring Boot)

* **POST `/api/test/submit`**:
  Protected POST endpoint. Evaluated by WAF. Body format:
  ```json
  { "inputData": "your payload text" }
  ```
* **GET `/api/test/query?q=payload`**:
  Protected GET query parameter. Evaluated by WAF.
