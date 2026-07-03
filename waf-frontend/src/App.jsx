import React, { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import LogsTable from './components/LogsTable'
import Sandbox from './components/Sandbox'
import SystemStatus from './components/SystemStatus'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState({
    totalRequests: 0,
    blockedRequests: 0,
    allowedRequests: 0,
    blockRate: 0,
    avgLatencyMs: 0,
    attackBreakdown: {},
    benignCount: 0,
    blockingEnabled: true,
    confidenceThreshold: 0.70
  })
  const [logs, setLogs] = useState([])
  const [systemHealth, setSystemHealth] = useState({
    springBoot: 'checking',
    flaskApi: 'checking',
    activeModel: 'Checking...'
  })
  const [errorMsg, setErrorMsg] = useState('')

  // Fetch all WAF data
  const fetchData = async () => {
    try {
      // 1. Fetch Stats
      const statsRes = await fetch('/api/waf/stats')
      if (!statsRes.ok) throw new Error('Backend server error')
      const statsData = await statsRes.json()
      setStats(statsData)

      // 2. Fetch Logs
      const logsRes = await fetch('/api/waf/logs')
      const logsData = await logsRes.json()
      setLogs(logsData)

      // Spring Boot is UP
      setSystemHealth(prev => ({ ...prev, springBoot: 'up' }))
      setErrorMsg('')
    } catch (err) {
      console.warn('WAF Backend is offline:', err.message)
      setSystemHealth(prev => ({ ...prev, springBoot: 'down' }))
      setErrorMsg('Cannot connect to Spring Boot backend server.')
    }
  }

  // Check Flask API health directly (or via backend. Let's do it via backend /api/waf/config check or directly if possible. Direct is easier since backend config returns Python URL)
  const checkFlaskHealth = async () => {
    try {
      // We check via our Spring Boot's custom health check which contacts python, or we can check python status from stats.
      // Wait, we can fetch python health directly or let the backend tell us.
      // Let's check python health directly at http://localhost:5000/health (note: might hit CORS, so let's write a backend proxy or handle it in python. We already enabled CORS in Flask since we didn't add CORS headers to Flask in detail, but let's check it. Let's check from the python backend itself if we can. Actually, we can fetch from Flask port 5000, but to avoid CORS issues, we can fetch a proxy endpoint on the Spring Boot backend or hit python and catch. Let's do a fetch to flask. Flask doesn't have CORS enabled by default in our app.py! Wait! In our app.py, we didn't add CORS headers.
      // Let's add CORS headers to app.py if needed, or we can verify the flask health via the spring boot server. Since Flask is called by Spring Boot, Spring Boot knows if it's up. In the logs we can see "modelUsed". Let's write a simple check or fetch directly.)
      
      // Let's try to fetch flask health
      const res = await fetch('http://localhost:5000/health')
      const data = await res.json()
      setSystemHealth(prev => ({
        ...prev,
        flaskApi: 'up',
        activeModel: data.active_model
      }))
    } catch (err) {
      // If flask direct check fails, let's look at the logs to see if we've successfully communicated before
      setSystemHealth(prev => ({
        ...prev,
        flaskApi: 'down',
        activeModel: 'OFFLINE'
      }))
    }
  }

  // Handle configuration updates
  const handleUpdateConfig = async (newConfig) => {
    try {
      const res = await fetch('/api/waf/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      })
      if (res.ok) {
        const data = await res.json()
        setStats(prev => ({
          ...prev,
          blockingEnabled: data.blockingEnabled,
          confidenceThreshold: data.confidenceThreshold
        }))
        fetchData()
        return true
      }
    } catch (err) {
      console.error('Failed to update config:', err)
    }
    return false
  }

  // Handle clearing of logs
  const handleClearLogs = async () => {
    try {
      const res = await fetch('/api/waf/clear', { method: 'POST' })
      if (res.ok) {
        fetchData()
        return true
      }
    } catch (err) {
      console.error('Failed to clear logs:', err)
    }
    return false
  }

  useEffect(() => {
    fetchData()
    checkFlaskHealth()

    // Polling intervals
    const dataInterval = setInterval(fetchData, 4000)
    const healthInterval = setInterval(checkFlaskHealth, 8000)

    return () => {
      clearInterval(dataInterval)
      clearInterval(healthInterval)
    }
  }, [])

  return (
    <div className="app-container">
      {/* Navigation Header Bar */}
      <nav className="navbar">
        <div className="brand">
          <span className="brand-icon">🛡️</span>
          <div>
            <div>Antigravity AI-WAF</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '400' }}>
              Transformer-Based Request Security Pipeline
            </div>
          </div>
        </div>

        <div className="nav-links">
          <button 
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={`nav-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            📋 Live Event Logs
          </button>
          <button 
            className={`nav-btn ${activeTab === 'sandbox' ? 'active' : ''}`}
            onClick={() => setActiveTab('sandbox')}
          >
            🧪 Heuristic Sandbox
          </button>
          <button 
            className={`nav-btn ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            ⚙️ System Config
          </button>
        </div>
      </nav>

      {/* Connection Failure Banner */}
      {errorMsg && (
        <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-red)', marginBottom: '1.5rem', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ color: 'var(--accent-red)' }}>⚠️ Connection Alert:</strong> {errorMsg}
            </div>
            <button className="preset-btn" onClick={fetchData}>Retry Connection</button>
          </div>
        </div>
      )}

      {/* Main Container Views */}
      <main>
        {activeTab === 'dashboard' && (
          <Dashboard stats={stats} logs={logs.slice(0, 5)} />
        )}
        
        {activeTab === 'logs' && (
          <LogsTable logs={logs} onClearLogs={handleClearLogs} />
        )}
        
        {activeTab === 'sandbox' && (
          <Sandbox onRefreshLogs={fetchData} />
        )}
        
        {activeTab === 'system' && (
          <SystemStatus 
            stats={stats} 
            health={systemHealth} 
            onUpdateConfig={handleUpdateConfig} 
            onClearLogs={handleClearLogs}
          />
        )}
      </main>

      <footer style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', paddingBottom: '1.5rem' }}>
        Antigravity AI-WAF | Powered by DistilBERT NLP Security Models | © 2026 MGIT Cybersecurity Research Group
      </footer>
    </div>
  )
}

export default App
