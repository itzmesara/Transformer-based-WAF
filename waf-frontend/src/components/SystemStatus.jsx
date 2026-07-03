import React, { useState, useEffect } from 'react'

function SystemStatus({ stats, health, onUpdateConfig, onClearLogs }) {
  const [blockingEnabled, setBlockingEnabled] = useState(stats.blockingEnabled)
  const [confidenceThreshold, setConfidenceThreshold] = useState(stats.confidenceThreshold)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)

  useEffect(() => {
    setBlockingEnabled(stats.blockingEnabled)
    setConfidenceThreshold(stats.confidenceThreshold)
  }, [stats.blockingEnabled, stats.confidenceThreshold])

  const handleToggleBlocking = async (e) => {
    const checked = e.target.checked
    setBlockingEnabled(checked)
    setIsUpdating(true)
    const success = await onUpdateConfig({
      blockingEnabled: checked,
      confidenceThreshold
    })
    setIsUpdating(false)
    if (success) flashSuccess()
  }

  const handleSliderChange = (e) => {
    setConfidenceThreshold(parseFloat(e.target.value))
  }

  const handleSliderRelease = async () => {
    setIsUpdating(true)
    const success = await onUpdateConfig({
      blockingEnabled,
      confidenceThreshold
    })
    setIsUpdating(false)
    if (success) flashSuccess()
  }

  const flashSuccess = () => {
    setUpdateSuccess(true)
    setTimeout(() => setUpdateSuccess(false), 2000)
  }

  return (
    <div className="main-content-layout">
      {/* Left Panel: Configuration Controls */}
      <div className="glass-card">
        <h3 className="card-title">⚙️ WAF Configuration Controls</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Adjust active blocking rules and sensitivity levels. Changes take effect instantly across all protected endpoints.
        </p>

        {/* Blocking Toggle */}
        <div style={{ padding: '1rem', background: 'hsla(220, 10%, 15%, 0.3)', border: '1px solid var(--border-glass)', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <label className="form-switch">
            <input 
              type="checkbox" 
              className="switch-input" 
              checked={blockingEnabled}
              onChange={handleToggleBlocking}
            />
            <span className="switch-slider"></span>
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem' }}>Active Request Blocking Mode</strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {blockingEnabled 
                  ? 'WAF actively blocks requests categorized as malicious by the AI.' 
                  : 'Detection-only mode. Attacks are identified and logged, but allowed to proceed.'}
              </span>
            </div>
          </label>
        </div>

        {/* Threshold Slider */}
        <div className="form-group" style={{ padding: '1rem', background: 'hsla(220, 10%, 15%, 0.3)', border: '1px solid var(--border-glass)', borderRadius: '8px', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <strong style={{ fontSize: '0.95rem' }}>WAF Confidence Block Threshold</strong>
            <span className="slider-value">{(confidenceThreshold * 100).toFixed(0)}%</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Sets the decision boundary. If the AI model classifies a request as an attack with confidence higher than this threshold, it is blocked.
          </p>
          <div className="slider-container">
            <input 
              type="range" 
              min="0.50" 
              max="0.95" 
              step="0.05"
              value={confidenceThreshold}
              onChange={handleSliderChange}
              onMouseUp={handleSliderRelease}
              onTouchEnd={handleSliderRelease}
              className="slider-input"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            <span>Aggressive (50%)</span>
            <span>Balanced (70%)</span>
            <span>Strict (95%)</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isUpdating && <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>⏳ Synchronizing WAF core...</span>}
          {updateSuccess && <span style={{ fontSize: '0.85rem', color: 'var(--accent-green)' }}>✔ Configuration updated & synced!</span>}
        </div>
      </div>

      {/* Right Panel: Diagnostics & Health */}
      <div className="glass-card">
        <h3 className="card-title">🔍 Pipeline Diagnostics</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Health metrics of the running microservices.
        </p>

        {/* Spring Boot Health */}
        <div className="health-widget">
          <div className={`health-dot ${health.springBoot === 'up' ? 'up' : 'down'}`}></div>
          <div className="health-info">
            <h5>Spring Boot Web Gateway</h5>
            <p>Port: 8080 | Status: {health.springBoot.toUpperCase()}</p>
          </div>
        </div>

        {/* Flask Health */}
        <div className="health-widget">
          <div className={`health-dot ${health.flaskApi === 'up' ? 'up' : 'down'}`}></div>
          <div className="health-info">
            <h5>Python AI WAF Service</h5>
            <p>Port: 5000 | Status: {health.flaskApi.toUpperCase()}</p>
          </div>
        </div>

        {/* Active ML Model */}
        <div style={{ margin: '1.5rem 0', padding: '1rem', background: 'hsl(222, 50%, 3%)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Active Classifier Instance
          </div>
          <div style={{ fontFamily: 'var(--font-code)', fontWeight: '600', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🤖 {health.activeModel}
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.3' }}>
            {health.activeModel === 'DistilBERT' 
              ? 'Transformer Context Model is active. Provides semantic self-attention payload classification.' 
              : health.activeModel.includes('Fallback')
              ? 'Fallback Machine Learning model active. Operating via TF-IDF Vectorization and Logistic Regression.'
              : 'Diagnostics pending. WAF is operating in local static regex inspection.'}
          </p>
        </div>

        {/* Database Stats */}
        <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1.25rem' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>🛠️ Database Operations</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            WAF records are saved to the persistent H2 database in `data/wafdb`. Clear logs to reset metrics counters.
          </p>
          <button className="action-btn-danger" style={{ width: '100%', justifyContent: 'center' }} onClick={onClearLogs}>
            🗑️ Wipe Database Event Logs
          </button>
        </div>
      </div>
    </div>
  )
}

export default SystemStatus
