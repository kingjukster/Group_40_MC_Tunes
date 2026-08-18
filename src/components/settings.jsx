import React, { useState, useEffect } from 'react'
import './settings.css'
import { submitFeedback, submitBugReport } from '../services/settings'

function Settings({ user, onClose }) {
  // Local state for credential level and explicit preference
  const settingsKey = `mc-tunes-settings-${user?.id ?? 'current'}`
  const [credentialLevel, setCredentialLevel] = useState(() => {
    try {
      return Number(JSON.parse(localStorage.getItem(settingsKey))?.credentialLevel ?? 1)
    } catch {
      return 1
    }
  })
  // Explicit recommendations default to true unless the account is a child (level 0)
  const [allowExplicit, setAllowExplicit] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(settingsKey))?.allowExplicit ?? true
    } catch {
      return true
    }
  })
  const [status, setStatus] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const authToken = user?.token

  // If credential level is 0 (child), force explicit to false and disable changes
  useEffect(() => {
    if (credentialLevel === 0) {
      setAllowExplicit(false)
    }
  }, [credentialLevel])

  const handleSave = () => {
    localStorage.setItem(settingsKey, JSON.stringify({ credentialLevel, allowExplicit }))
    setStatus({ type: 'success', text: 'Settings saved.' })
  }

  const handleSendFeedback = () => {
    const message = window.prompt('Please enter your feedback:')
    if (message == null || message.trim() === '') return

    if (!authToken) {
      setStatus({ type: 'error', text: 'Authentication is unavailable. Please re-login.' })
      return
    }

    setStatus(null)
    setIsSubmitting(true)
    submitFeedback(authToken, message.trim(), 'MEDIUM')
      .then(() => setStatus({ type: 'success', text: 'Feedback submitted. Thank you!' }))
      .catch((err) => setStatus({ type: 'error', text: err.message || 'Failed to submit feedback' }))
      .finally(() => setIsSubmitting(false))
  }

  const handleReportBug = () => {
    const message = window.prompt('Please describe the bug you encountered:')
    if (message == null || message.trim() === '') return

    if (!authToken) {
      setStatus({ type: 'error', text: 'Authentication is unavailable. Please re-login.' })
      return
    }

    setStatus(null)
    setIsSubmitting(true)
    submitBugReport(authToken, message.trim(), 'HIGH')
      .then(() => setStatus({ type: 'success', text: 'Bug report submitted. Thank you!' }))
      .catch((err) => setStatus({ type: 'error', text: err.message || 'Failed to submit bug report' }))
      .finally(() => setIsSubmitting(false))
  }

  return (
    <div className="settings-root card">
      <h2>Settings</h2>

      <div className="settings-section">
        <label htmlFor="credential-level">Credential level: </label>
        <select
          id="credential-level"
          value={credentialLevel}
          onChange={(e) => setCredentialLevel(Number(e.target.value))}
        >
          <option value={0}>0 - Child</option>
          <option value={1}>1 - User</option>
          <option value={2}>2 - Developer</option>
          <option value={3}>3 - Admin</option>
        </select>
      </div>

      <div className="settings-section">
        <label>
          <input
            type="checkbox"
            checked={allowExplicit}
            onChange={(e) => setAllowExplicit(e.target.checked)}
            disabled={credentialLevel === 0}
            title={credentialLevel === 0 ? 'Disabled for child accounts' : 'Allow explicit recommendations'}
          />{' '}
          Enable explicit recommendations
        </label>
      </div>

      <div className="settings-section">
        <button className="ribbon-btn" onClick={handleSendFeedback} disabled={isSubmitting}>Send Feedback</button>
        <button className="ribbon-btn" onClick={handleReportBug} style={{ marginLeft: '8px' }} disabled={isSubmitting}>Report a Bug</button>
      </div>

      {status && (
        <div className={`settings-status ${status.type === 'error' ? 'error' : 'success'}`}>
          {status.text}
        </div>
      )}

      <div className="settings-actions">
        <button className="ribbon-btn" onClick={handleSave}>Save</button>
        <button className="ribbon-btn" onClick={onClose} style={{ marginLeft: '8px' }}>Back</button>
      </div>
    </div>
  )
}

export default Settings
