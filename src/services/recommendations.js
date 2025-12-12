// Recommendations API client (uses backend endpoint backed by Qdrant helper)

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
    || (typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL)
    || 'http://localhost:3000';

// Parsed recommendations coming directly from the Python vector_database.get_parsed_recommendations
export const fetchParsedRecommendations = async (userId) => {
    if (!userId) throw new Error('userId is required');

    const res = await fetch(`${API_BASE_URL}/parsed-recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
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

    // Function returns a list of tuples: (id, artist, genre, name)
    const rawList = payload?.recommendations || payload?.result || payload || [];
    return Array.isArray(rawList) ? rawList : [];
};

export const fetchRecommendations = async ({ genre, artist, subgenre, limit = 20 }) => {
    const params = new URLSearchParams();
    if (genre) params.append('genre', genre);
    if (artist) params.append('artist', artist);
    if (subgenre) params.append('subgenre', subgenre);
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
export const fetchRecommendationsWithFeedback = async ({ userId, genre, artist, subgenre, limit = 20 }) => {
    if (!userId) throw new Error('userId is required');

    const params = new URLSearchParams();
    params.append('userId', userId);
    if (genre) params.append('genre', genre);
    if (artist) params.append('artist', artist);
    if (subgenre) params.append('subgenre', subgenre);
    if (limit) params.append('num_points', limit);

    const res = await fetch(`${API_BASE_URL}/recommendations/with-feedback?${params.toString()}`, {
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

    const rawList = payload?.points || payload?.result || payload?.recommendations || payload || [];
    const list = Array.isArray(rawList) ? rawList : (rawList?.points || []);

    return {
        list,
        positiveIds: payload?.positive_ids || [],
        negativeIds: payload?.negative_ids || []
    };
};

// Save like/dislike feedback (1 = like, 0 = dislike)
export const submitRecommendationFeedback = async ({ userId, songId, rating }) => {
    if (userId == null || songId == null || rating == null) {
        throw new Error('userId, songId, and rating are required');
    }

    const res = await fetch(`${API_BASE_URL}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid: userId, songid: songId, rating })
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
