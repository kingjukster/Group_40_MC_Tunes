import React, { useState, useEffect } from 'react'
import './settings.css'

function Settings({ onClose }) {
  // Local state for credential level and explicit preference
  const [credentialLevel, setCredentialLevel] = useState(1) // default: 1 = user
  // Explicit recommendations default to true unless the account is a child (level 0)
  const [allowExplicit, setAllowExplicit] = useState(true)

  // If credential level is 0 (child), force explicit to false and disable changes
  useEffect(() => {
    if (credentialLevel === 0) {
      setAllowExplicit(false)
    }
  }, [credentialLevel])

  const handleSave = () => {
    // Placeholder save - this should call an API
    console.log('Saving settings', { credentialLevel, allowExplicit })
    alert('Settings saved (placeholder)')
  }

  const handleSendFeedback = () => {
    const message = window.prompt('Please enter your feedback:')
    if (message != null && message.trim() !== '') {
      // Placeholder: submit feedback
      console.log('Feedback submitted:', message)
      alert('Thank you for your feedback! (placeholder)')
    }
  }

  const handleReportBug = () => {
    const message = window.prompt('Please describe the bug you encountered:')
    if (message != null && message.trim() !== '') {
      // Placeholder: submit bug report
      console.log('Bug report submitted:', message)
      alert('Bug report submitted. Thank you! (placeholder)')
    }
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
        <button className="ribbon-btn" onClick={handleSendFeedback}>Send Feedback</button>
        <button className="ribbon-btn" onClick={handleReportBug} style={{ marginLeft: '8px' }}>Report a Bug</button>
      </div>

      <div className="settings-actions">
        <button className="ribbon-btn" onClick={handleSave}>Save</button>
        <button className="ribbon-btn" onClick={onClose} style={{ marginLeft: '8px' }}>Back</button>
      </div>
    </div>
  )
}

export default Settings