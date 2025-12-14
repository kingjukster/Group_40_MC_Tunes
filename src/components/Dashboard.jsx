import React, { useState } from 'react'
import MCT from '../assets/mc_tunes_logo.png'
import './dashboard.css'
import Settings from './Settings'
import Recommendations from './Recommendations'

function Dashboard({ user, onLogout }) {
  const [view, setView] = useState('home') // 'home' | 'settings' | 'recommendations'

  return (
    <div className="dashboard-root">
      <header className="dashboard-header">
        <div className="user-actions">
          <span className="welcome">Hello, {user?.userName || user?.name}</span>
          <button className="ribbon-btn" onClick={onLogout}>Logout</button>
          <button className="ribbon-btn" onClick={() => setView('settings')}>Settings</button>
          <button className="ribbon-btn" onClick={() => setView('recommendations')}>Recommendations</button>
        </div>
      </header>

      <main className="dashboard-main">
        {view === 'home' && (
          <>
            <div className="hero">
              <img src={MCT} className="logo logo-large" alt="MC Tunes logo" />
              <h1>Welcome to MC Tunes</h1>
            </div>
          </>
        )}

        {view === 'settings' && (
          <Settings user={user} onClose={() => setView('home')} />
        )}

        {view === 'recommendations' && (
          <Recommendations user={user} onBack={() => setView('home')} />
        )}
      </main>
    </div>
  )
}

export default Dashboard
