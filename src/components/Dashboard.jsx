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
          <span className="welcome">Hello, {user?.name}</span>
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

            <div className="card">
              <h2>Recommended for you</h2>
              <ul className="song-list">
                <li className="song-item">1. I’ll Be Missing You — Sean Combs (1997)</li>
                <li className="song-item">2. God's Plan — Aubrey Graham (2018)</li>
                <li className="song-item">3. Shake Ya Tailfeather — Sean Combs (2003)</li>
                <li className="song-item">4. Hotline Bling — Aubrey Graham (2015)</li>
                <li className="song-item">5. Crank That — Soulja Boy Tell`em (2007)</li>
              </ul>
            </div>
          </>
        )}

        {view === 'settings' && (
          <Settings user={user} onClose={() => setView('home')} />
        )}

        {view === 'recommendations' && (
          <Recommendations onBack={() => setView('home')} />
        )}
      </main>
    </div>
  )
}

export default Dashboard
