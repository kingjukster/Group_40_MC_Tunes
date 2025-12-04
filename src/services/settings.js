// API helpers for settings (feedback and bug reports)

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
    || (typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL)
    || 'http://localhost:3000';

const postJson = async (path, body) => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    let payload = null;
    try {
        payload = await res.json();
    } catch {
        payload = null;
    }

    if (!res.ok) {
        const msg = payload && payload.error ? payload.error : (res.statusText || 'Request failed');
        throw new Error(msg);
    }

    return payload;
};

export const submitFeedback = async (userId, message, severity) => {
    if (!userId) throw new Error('Missing user ID');
    if (!message) throw new Error('Message is required');
    return postJson('/feedback', { userid: userId, message, severity });
};

export const submitBugReport = async (userId, message, severity) => {
    if (!userId) throw new Error('Missing user ID');
    if (!message) throw new Error('Message is required');
    return postJson('/bugreports', { userid: userId, message, severity });
};
