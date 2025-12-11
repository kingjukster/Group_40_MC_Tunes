function simpleHash(password, salt) {
    let hash = '';
    const combinedString = password + salt;
    for (let i = 0; i < combinedString.length; i++) {
        hash += (combinedString.charCodeAt(i) * 31).toString(16);
    }
    return hash;
}

function generateSalt(rounds) {
    const chars = 'abcdef0123456789';
    let salt = '';
    for (let i = 0; i < rounds; i++) {
        salt += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return salt;
}

function hash(password, salt) {
    if (password == null || salt == null) {
        throw new Error('Must Provide Password and salt values');
    }
    if (typeof password !== 'string' || typeof salt !== 'string') {
        throw new Error('password must be a string and salt must either be a salt string or a number of rounds');
    }
    const hashedValue = simpleHash(password, salt);
    return { salt: salt, hashedpassword: hashedValue };
}

// Utility function to hash new passwords (unchanged)
export const hashNewPassword = (password) => {
    const salt = generateSalt(12);
    return hash(password, salt);
};

// Support both browser (Vite) and Node runtimes; avoid touching process in browser
const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
    || (typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL)
    || 'http://localhost:3000';

// Local fallback for when the backend auth path is unavailable during demos/dev
const MOCK_USER = {
    id: 0,
    userName: 'admin',
    credentialLevel: 'ADMIN',
    source: 'mock'
};

// Replace/mock authentication to call server API
export const authenticateUser = async (username, password) => {
    try {
        if (!username || !password) throw new Error('Username and password required');

        const params = new URLSearchParams({ username, password });
        const res = await fetch(`${API_BASE_URL}/login?${params.toString()}`, { method: 'GET' });

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
        // Allow a local mock login so the UI is still usable if the API is down or misconfigured
        if (username === 'admin' && password === 'admin123') {
            return { success: true, user: MOCK_USER };
        }
        throw new Error(error.message || 'Network error');
    }
};

// Register a new user: hash client-side to match existing API contract
export const registerUser = async (username, password) => {
    if (!username || !password) {
        throw new Error('Username and password required');
    }

    const { salt, hashedpassword } = hashNewPassword(password);

    const res = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username,
            userhash: hashedpassword,
            usersalt: salt
        })
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


export { hash };
