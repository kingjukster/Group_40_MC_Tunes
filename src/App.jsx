import { useState } from 'react'
import Login from './components/Login'
import MCT from './assets/mc_tunes_logo.png'
import './App.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)

  const handleLogin = (userData) => {
    setUser(userData)
    setIsLoggedIn(true)
  }

  return (
    <>
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          <div>
            <a target="_blank">
              <img src={MCT} className="logo logo-large" alt="MC Tunes logo" />
            </a>
          </div>
          <h1>Welcome to MC Tunes, {user.name}!</h1>
          <div className="card">
            <p>Your music dashboard will go here</p>
          </div>
        </>
      )}
    </>
  )
}

export default App