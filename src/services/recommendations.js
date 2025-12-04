// Recommendations API client (uses backend endpoint backed by Qdrant helper)

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
    || (typeof process !== 'undefined' && process.env && process.env.VITE_API_BASE_URL)
    || 'http://localhost:3000';

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
