import React from 'react'

function Dashboard({ stats, logs }) {
  // Extract and calculate attack categories
  const breakdown = stats.attackBreakdown || {}
  const sqliCount = breakdown['SQLi'] || 0
  const xssCount = breakdown['XSS'] || 0
  const cmdCount = breakdown['Command Injection'] || 0
  const otherCount = Object.keys(breakdown).reduce((acc, key) => {
    if (['SQLi', 'XSS', 'Command Injection'].includes(key)) return acc
    return acc + breakdown[key]
  }, 0)

  const totalMalicious = sqliCount + xssCount + cmdCount + otherCount
  const total = stats.totalRequests || 0
  const benignCount = stats.benignCount || (total - totalMalicious)

  // Calculate percentages for bar heights
  const getPercent = (count) => {
    if (total === 0) return '0%'
    return `${((count / total) * 100).toFixed(1)}%`
  }

  const formatTime = (timeStr) => {
    try {
      const date = new Date(timeStr)
      return date.toLocaleTimeString()
    } catch (e) {
      return timeStr
    }
  }

  return (
    <div>
      {/* 4 Stat Cards */}
      <div className="dashboard-grid">
        <div className="glass-card stat-card total">
          <div className="stat-info">
            <p>Total Traffic</p>
            <h3>{stats.totalRequests}</h3>
          </div>
          <div className="stat-icon">📡</div>
        </div>

        <div className="glass-card stat-card blocked">
          <div className="stat-info">
            <p>Blocked Attacks</p>
            <h3>{stats.blockedRequests}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-red)' }}>
              {stats.blockRate}% Deflected
            </span>
          </div>
          <div className="stat-icon">⛔</div>
        </div>

        <div className="glass-card stat-card allowed">
          <div className="stat-info">
            <p>Allowed Traffic</p>
            <h3>{stats.allowedRequests}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)' }}>
              {total === 0 ? '0' : ((stats.allowedRequests / total) * 100).toFixed(1)}% Safe
            </span>
          </div>
          <div className="stat-icon">✅</div>
        </div>

        <div className="glass-card stat-card latency">
          <div className="stat-info">
            <p>Avg WAF Latency</p>
            <h3>{stats.avgLatencyMs} <span style={{ fontSize: '1rem', fontWeight: '400' }}>ms</span></h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Inference Speed
            </span>
          </div>
          <div className="stat-icon">⚡</div>
        </div>
      </div>

      {/* Main Split Section */}
      <div className="main-content-layout">
        {/* Left Column: Attack Breakdown */}
        <div className="glass-card">
          <h3 className="card-title">🛡️ Attack Vector Distribution</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            Breakdown of security vulnerabilities identified in incoming payloads.
          </p>
          
          <div className="bar-chart-container">
            <div className="chart-bar-row">
              <div className="chart-label-row">
                <span>SQL Injection (SQLi)</span>
                <strong style={{ color: 'var(--accent-purple)' }}>{sqliCount} ({getPercent(sqliCount)})</strong>
              </div>
              <div className="chart-bar-bg">
                <div className="chart-bar-fill sqli" style={{ width: getPercent(sqliCount) }}></div>
              </div>
            </div>

            <div className="chart-bar-row">
              <div className="chart-label-row">
                <span>Cross-Site Scripting (XSS)</span>
                <strong style={{ color: 'var(--accent-red)' }}>{xssCount} ({getPercent(xssCount)})</strong>
              </div>
              <div className="chart-bar-bg">
                <div className="chart-bar-fill xss" style={{ width: getPercent(xssCount) }}></div>
              </div>
            </div>

            <div className="chart-bar-row">
              <div className="chart-label-row">
                <span>Command Injection</span>
                <strong style={{ color: 'var(--accent-orange)' }}>{cmdCount} ({getPercent(cmdCount)})</strong>
              </div>
              <div className="chart-bar-bg">
                <div className="chart-bar-fill cmd" style={{ width: getPercent(cmdCount) }}></div>
              </div>
            </div>

            {otherCount > 0 && (
              <div className="chart-bar-row">
                <div className="chart-label-row">
                  <span>Other Malicious</span>
                  <strong style={{ color: 'var(--accent-red)' }}>{otherCount} ({getPercent(otherCount)})</strong>
                </div>
                <div className="chart-bar-bg">
                  <div className="chart-bar-fill xss" style={{ width: getPercent(otherCount) }}></div>
                </div>
              </div>
            )}

            <div className="chart-bar-row">
              <div className="chart-label-row">
                <span>Benign / Legitimate Traffic</span>
                <strong style={{ color: 'var(--accent-cyan)' }}>{benignCount} ({getPercent(benignCount)})</strong>
              </div>
              <div className="chart-bar-bg">
                <div className="chart-bar-fill benign" style={{ width: getPercent(benignCount) }}></div>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'hsla(220, 10%, 15%, 0.3)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <h5 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>💡 Threat Intelligence Note</h5>
            Transformer models assess request structures semantically. Rather than using exact regex signature matching, they analyze context, meaning obfuscated SQLi/XSS queries (such as base64-encoded strings or hex bypasses) are detected automatically based on statistical pattern weights.
          </div>
        </div>

        {/* Right Column: Live Feed */}
        <div className="glass-card">
          <h3 className="card-title">🚨 Real-Time Security Feed</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Latest security checks completed by the pipeline.
          </p>
          
          {logs.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No request activity logged yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className="log-item-new" 
                  style={{
                    padding: '0.8rem', 
                    background: 'hsla(220, 10%, 12%, 0.4)', 
                    border: '1px solid var(--border-glass)', 
                    borderLeft: `3px solid ${log.blocked ? 'var(--accent-red)' : 'var(--accent-green)'}`,
                    borderRadius: '6px',
                    fontSize: '0.85rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <strong style={{ fontFamily: 'var(--font-code)', fontSize: '0.8rem' }}>
                      {log.requestMethod} {log.requestPath.length > 25 ? log.requestPath.substring(0, 25) + '...' : log.requestPath}
                    </strong>
                    <span style={{ color: var(--text-muted), fontSize: '0.75rem' }}>{formatTime(log.timestamp)}</span>
                  </div>
                  
                  <div 
                    style={{ 
                      background: 'black', 
                      padding: '0.35rem 0.5rem', 
                      borderRadius: '4px', 
                      fontFamily: 'var(--font-code)', 
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginBottom: '0.5rem'
                    }}
                    title={log.payload}
                  >
                    {log.payload}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                    <div>
                      IP: <span style={{ color: 'var(--text-primary)' }}>{log.clientIp}</span>
                    </div>
                    <div>
                      {log.blocked ? (
                        <span className="badge block">Blocked ({log.attackType})</span>
                      ) : (
                        <span className="badge allow">Passed</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
