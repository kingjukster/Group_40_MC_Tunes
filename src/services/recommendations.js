// Recommendations API client (uses backend endpoint backed by Qdrant helper)

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
    || 'http://localhost:3000';

export const fetchRecommendations = async ({ genre, artist, subgenre, tempo, energy, key, limit = 20 }) => {
    const params = new URLSearchParams();
    if (genre) params.append('genre', genre);
    if (artist) params.append('artist', artist);
    if (subgenre) params.append('subgenre', subgenre);
    if (tempo) params.append('tempo', tempo);
    if (energy !== undefined && energy !== '') params.append('energy', energy);
    if (key !== undefined && key !== '') params.append('key', key);
    if (limit) params.append('num_points', limit);

    const res = await fetch(`${API_BASE_URL}/recommendations?${params.toString()}`, {
        method: 'GET'
    });

    let payload = null;
    try {
        payload = await res.json();
    } catch {
        payload = null;
    }

    if (!res.ok) {
        const msg = payload && payload.error ? payload.error : (res.statusText || 'Failed to load recommendations');
        throw new Error(msg);
    }

    // Normalize common result shapes: { result: {...} } or { points: [...] } or direct array
    const rawList = payload?.points || payload?.result || payload?.recommendations || payload || [];
    const list = Array.isArray(rawList) ? rawList : (rawList?.points || []);
    return list;
};

// Feedback-aware recommendations (uses /recommendations/with-feedback)
export const fetchRecommendationsWithFeedback = async ({ token, genre, artist, subgenre, tempo, energy, key, limit = 20 }) => {
    if (!token) throw new Error('Authentication required');

    const params = new URLSearchParams();
    if (genre) params.append('genre', genre);
    if (artist) params.append('artist', artist);
    if (subgenre) params.append('subgenre', subgenre);
    if (tempo) params.append('tempo', tempo);
    if (energy !== undefined && energy !== '') params.append('energy', energy);
    if (key !== undefined && key !== '') params.append('key', key);
    if (limit) params.append('num_points', limit);

    const res = await fetch(`${API_BASE_URL}/recommendations/with-feedback?${params.toString()}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
    });

    let payload = null;
    try {
        payload = await res.json();
    } catch {
        payload = null;
    }

    if (!res.ok) {
        const msg = payload && payload.error ? payload.error : (res.statusText || 'Failed to load recommendations');
        throw new Error(msg);
    }

    const rawList = payload?.points || payload?.result || payload?.recommendations || payload || [];
    const list = Array.isArray(rawList) ? rawList : (rawList?.points || []);

    return {
        list,
        positiveIds: payload?.positive_ids || [],
        negativeIds: payload?.negative_ids || []
    };
};

// Save like/dislike feedback (1 = like, 0 = dislike)
export const submitRecommendationFeedback = async ({ token, songId, rating }) => {
    if (!token || songId == null || rating == null) {
        throw new Error('Authentication, song ID, and rating are required');
    }

    const res = await fetch(`${API_BASE_URL}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ songid: songId, rating })
    });

    let payload = null;
    try {
        payload = await res.json();
    } catch {
        payload = null;
    }

    if (!res.ok) {
        const msg = payload && payload.error ? payload.error : (res.statusText || 'Failed to save feedback');
        throw new Error(msg);
    }

    return payload;
};
