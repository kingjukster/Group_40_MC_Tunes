import { useState } from 'react';
import { authenticateUser, registerUser } from '../services/login.js';
import './login.css';

function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState('login'); // 'login' | 'register'

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (!username || !password) {
                throw new Error('Please enter both username and password');
            }
            if (mode === 'login') {
                console.log('Submitting login form:', { username });
                const response = await authenticateUser(username, password);
                console.log('Login response:', response);
                onLogin(response.user);
            } else {
                console.log('Submitting registration form:', { username });
                await registerUser(username, password);
                setMode('login');
                setPassword('');
                setError('Registration successful. Please log in.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Login failed');
            setPassword('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <h2>Welcome to MC Tunes</h2>
            <form onSubmit={handleSubmit} className="login-form">
                {error && <div className="error-message">{error}</div>}
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                />
                <button type="submit" disabled={isLoading}>
                    {isLoading ? (mode === 'login' ? 'Logging in...' : 'Registering...') : (mode === 'login' ? 'Login' : 'Register')}
                </button>
            </form>
            <div className="login-toggle">
                {mode === 'login' ? (
                    <>
                        <span>Need an account? </span>
                        <button type="button" onClick={() => { setMode('register'); setError(''); }} disabled={isLoading} className="link-btn">Register</button>
                    </>
                ) : (
                    <>
                        <span>Already have an account? </span>
                        <button type="button" onClick={() => { setMode('login'); setError(''); }} disabled={isLoading} className="link-btn">Back to login</button>
                    </>
                )}
            </div>
        </div>
    );
}

export default Login;
