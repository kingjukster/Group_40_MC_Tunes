// Support both browser (Vite) and Node runtimes; avoid touching process in browser
const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
    || 'http://localhost:3000';

// Authenticate against the backend API.
export const authenticateUser = async (username, password) => {
    try {
        if (!username || !password) throw new Error('Username and password required');

        const res = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        let payload = null;
        try {
            payload = await res.json();
        } catch {
            payload = null;
        }

        if (!res.ok) {
            const msg = payload && payload.error ? payload.error : (res.statusText || 'Authentication failed');
            throw new Error(msg);
        }

        if (!payload || !payload.user) {
            throw new Error('Invalid response from server');
        }

        return { success: true, user: payload.user };
    } catch (error) {
        throw new Error(error.message || 'Network error');
    }
};

// Register a new user; password hashing is handled by the backend.
export const registerUser = async (username, password) => {
    if (!username || !password || password.length < 8) {
        throw new Error('Username required and password must be at least 8 characters');
    }

    const res = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    let payload = null;
    try {
        payload = await res.json();
    } catch {
        payload = null;
    }

    if (!res.ok) {
        const msg = payload && payload.error ? payload.error : (res.statusText || 'Registration failed');
        throw new Error(msg);
    }

    return payload;
};
