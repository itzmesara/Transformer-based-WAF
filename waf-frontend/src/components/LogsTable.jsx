import React, { useState } from 'react'

function LogsTable({ logs, onClearLogs }) {
  const [filterAction, setFilterAction] = useState('all')
  const [filterAttack, setFilterAttack] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)

  // Filtering Logic
  const filteredLogs = logs.filter(log => {
    // Action filter
    if (filterAction === 'blocked' && !log.blocked) return false
    if (filterAction === 'allowed' && log.blocked) return false

    // Attack Type filter
    if (filterAttack !== 'all' && log.attackType !== filterAttack) return false

    // Search term filter (matches path, payload, or client IP)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const pathMatch = log.requestPath.toLowerCase().includes(searchLower)
      const payloadMatch = log.payload && log.payload.toLowerCase().includes(searchLower)
      const ipMatch = log.clientIp.includes(searchLower)
      if (!pathMatch && !payloadMatch && !ipMatch) return false
    }

    return true
  })

  const handleRowClick = (log) => {
    setSelectedLog(log)
  }

  const handleCloseModal = () => {
    setSelectedLog(null)
  }

  const formatDateTime = (dateTimeStr) => {
    try {
      const date = new Date(dateTimeStr)
      return date.toLocaleString()
    } catch (e) {
      return dateTimeStr
    }
  }

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          📋 Live Event Logs ({filteredLogs.length})
        </h3>
        <button className="action-btn-danger" onClick={onClearLogs} disabled={logs.length === 0}>
          🗑️ Clear Database Logs
        </button>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flexGrow: 1, minWidth: '240px' }}>
          <input 
            type="text" 
            placeholder="Search logs by IP, path, or payload content..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 1rem',
              background: 'hsla(220, 10%, 15%, 0.4)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              outline: 'none',
              fontFamily: 'var(--font-main)',
              fontSize: '0.9rem'
            }}
          />
        </div>

        <div>
          <select 
            value={filterAction} 
            onChange={(e) => setFilterAction(e.target.value)}
            style={{
              padding: '0.55rem 1rem',
              background: 'hsla(220, 10%, 15%, 0.4)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              outline: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <option value="all">🔍 All Actions</option>
            <option value="blocked">⛔ Blocked Requests</option>
            <option value="allowed">✅ Allowed Requests</option>
          </select>
        </div>

        <div>
          <select 
            value={filterAttack} 
            onChange={(e) => setFilterAttack(e.target.value)}
            style={{
              padding: '0.55rem 1rem',
              background: 'hsla(220, 10%, 15%, 0.4)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              outline: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            <option value="all">🏷️ All Types</option>
            <option value="Benign">Benign</option>
            <option value="SQLi">SQL Injection</option>
            <option value="XSS">XSS Scripting</option>
            <option value="Command Injection">Command Injection</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
          No logs match the selected filters.
        </div>
      ) : (
        <div className="table-container">
          <table className="waf-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Client IP</th>
                <th>Request Target</th>
                <th>Payload Snippet</th>
                <th>Action</th>
                <th>Classification</th>
                <th>Confidence</th>
                <th>Latency</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} onClick={() => handleRowClick(log)} style={{ cursor: 'pointer' }}>
                  <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td style={{ fontFamily: 'var(--font-code)' }}>{log.clientIp}</td>
                  <td style={{ fontWeight: '500' }}>
                    <span style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem', paddingRight: '0.25rem' }}>{log.requestMethod}</span>
                    {log.requestPath}
                  </td>
                  <td>
                    <div style={{ 
                      fontFamily: 'var(--font-code)', 
                      fontSize: '0.8rem', 
                      background: 'black', 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px',
                      maxWidth: '220px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {log.payload}
                    </div>
                  </td>
                  <td>
                    {log.blocked ? (
                      <span className="badge block">Blocked</span>
                    ) : (
                      <span className="badge allow">Allowed</span>
                    )}
                  </td>
                  <td>
                    {log.blocked ? (
                      <span className="badge attack">{log.attackType}</span>
                    ) : (
                      <span className="badge benign">Benign</span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'var(--font-code)', color: 'var(--accent-cyan)' }}>
                    {(log.confidence * 100).toFixed(1)}%
                  </td>
                  <td style={{ fontFamily: 'var(--font-code)', color: 'var(--text-secondary)' }}>
                    {log.latencyMs} ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal Overlay */}
      {selectedLog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }} onClick={handleCloseModal}>
          <div style={{
            background: 'hsl(222, 47%, 9%)',
            border: '1px solid var(--border-glow)',
            boxShadow: '0 0 24px var(--accent-cyan-glow)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>🛡️ Security Event Details</h3>
              <button 
                onClick={handleCloseModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '1.5rem',
                  cursor: 'pointer'
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Log Event ID</p>
                <p style={{ fontWeight: '600' }}>#{selectedLog.id}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Timestamp</p>
                <p style={{ fontWeight: '500' }}>{formatDateTime(selectedLog.timestamp)}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Client Source IP</p>
                <p style={{ fontFamily: 'var(--font-code)' }}>{selectedLog.clientIp}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Inspection Latency</p>
                <p style={{ fontFamily: 'var(--font-code)' }}>{selectedLog.latencyMs} ms</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Detection Model</p>
                <p><span className="badge model">{selectedLog.modelUsed || 'DistilBERT'}</span></p>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Threat Rating</p>
                <p style={{ fontWeight: '600', color: selectedLog.blocked ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                  {selectedLog.attackType} ({(selectedLog.confidence * 100).toFixed(2)}%)
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Request Destination</p>
              <p style={{ background: 'black', padding: '0.6rem', borderRadius: '6px', fontFamily: 'var(--font-code)', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--accent-cyan)' }}>{selectedLog.requestMethod}</span> {selectedLog.requestPath}
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Raw Payload Evaluated</p>
              <textarea 
                readOnly 
                value={selectedLog.payload}
                className="textarea-input"
                style={{ height: '90px', fontSize: '0.8rem' }}
              />
            </div>

            {/* Heuristics Features */}
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>NLP Engineered Features Profile</p>
              <div style={{ background: 'hsla(220, 10%, 15%, 0.3)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '1rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    Length: <strong style={{ color: 'var(--text-primary)' }}>{selectedLog.payload ? selectedLog.payload.length : 0} chars</strong>
                  </div>
                  <div>
                    Entropy Rank: <strong style={{ color: 'var(--text-primary)' }}>
                      {/* Calculate entropy on the fly if not logged explicitly in JSON or show standard rating */}
                      {selectedLog.payload ? calculateEntropy(selectedLog.payload) : '0.00'}
                    </strong>
                  </div>
                  <div>
                    Special Characters: <strong style={{ color: 'var(--text-primary)' }}>
                      {selectedLog.payload ? (selectedLog.payload.match(/['"<>%;\(\)\-\-\/\\\*\&\|\$\=\!]/g) || []).length : 0}
                    </strong>
                  </div>
                  <div>
                    Keyword Matches: <strong style={{ color: 'var(--text-primary)' }}>
                      {selectedLog.payload ? countKeywords(selectedLog.payload) : 0}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button 
                className="btn-primary" 
                style={{ width: 'auto', padding: '0.55rem 2rem' }}
                onClick={handleCloseModal}
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helpers for the Modal UI
function calculateEntropy(str) {
  if (!str) return '0.00'
  const len = str.length
  const freq = {}
  for (let i = 0; i < len; i++) {
    freq[str[i]] = (freq[str[i]] || 0) + 1
  }
  let entropy = 0
  for (const char in freq) {
    const p = freq[char] / len
    entropy -= p * Math.log2(p)
  }
  return entropy.toFixed(3)
}

function countKeywords(str) {
  const kws = ["select", "union", "insert", "drop", "delete", "script", "onerror", "onload", "javascript", "eval", "exec", "wget", "curl", "bash"]
  const lower = str.toLowerCase()
  return kws.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0)
}

export default LogsTable
