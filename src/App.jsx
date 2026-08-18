import { useEffect, useState } from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import './App.css'

function App() {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = sessionStorage.getItem('mc-tunes-user')
      return savedUser ? JSON.parse(savedUser) : null
    } catch {
      return null
    }
  })
  const isLoggedIn = Boolean(user?.token)

  useEffect(() => {
    if (user?.token) {
      sessionStorage.setItem('mc-tunes-user', JSON.stringify(user))
    } else {
      sessionStorage.removeItem('mc-tunes-user')
    }
  }, [user])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
  }

  return (
    <>
      {!isLoggedIn ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </>
  )
}

export default App
