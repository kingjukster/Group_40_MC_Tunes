import React, { useState } from 'react';
import './recommendations.css';
import { fetchRecommendations, fetchRecommendationsWithFeedback, submitRecommendationFeedback } from '../services/recommendations';

function Recommendations({ onBack, user }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState({});
  const [genre, setGenre] = useState('');
  const [artist, setArtist] = useState('');
  const [subgenre, setSubgenre] = useState('');
  const [tempo, setTempo] = useState('');
  const [energy, setEnergy] = useState('');
  const [key, setKey] = useState('');
  const [limit, setLimit] = useState('');
  const [mode, setMode] = useState('personalized');

  const normalizeItem = (item, idx) => {
    if (Array.isArray(item)) {
      const [trackId, artistVal, genreVal, nameVal] = item;
      return {
        id: trackId ?? idx,
        title: nameVal || 'Unknown track',
        artist: artistVal || 'Unknown artist',
        genre: genreVal || 'Unknown genre'
      };
    }

    const payload = item?.payload || item;
    return {
      id: item?.id ?? payload?.id ?? idx,
      title: payload?.title || payload?.songName || payload?.name || 'Unknown track',
      artist: payload?.artist || payload?.artistName || 'Unknown artist',
      genre: payload?.genre || payload?.subgenre || 'Unknown genre',
      score: item?.score ?? payload?._score,
      audioFeatures: payload?.audio_features || null
    };
  };

  const handleFetch = async () => {
    if (!user?.token) {
      setError('Authentication required for recommendations');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = mode === 'personalized'
        ? await fetchRecommendationsWithFeedback({
            token: user.token,
            genre: genre || undefined,
            artist: artist || undefined,
            subgenre: subgenre || undefined,
            tempo: tempo || undefined,
            energy: energy || undefined,
            key: key || undefined,
            limit: limit ? Number(limit) : undefined
          })
        : { list: await fetchRecommendations({
            genre: genre || undefined,
            artist: artist || undefined,
            subgenre: subgenre || undefined,
            tempo: tempo || undefined,
            energy: energy || undefined,
            key: key || undefined,
            limit: limit ? Number(limit) : undefined
          }), positiveIds: [], negativeIds: [] };
      const { list, positiveIds, negativeIds } = response;
      setItems(list.map((r, i) => normalizeItem(r, i)));
      const savedFeedback = {};
      positiveIds.forEach(id => { savedFeedback[String(id)] = 'like'; });
      negativeIds.forEach(id => { savedFeedback[String(id)] = 'dislike'; });
      setFeedbackMap(savedFeedback);
    } catch (err) {
      setItems([]);
      setError(err.message || 'Could not load recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (itemId, rating) => {
    if (!user?.token) {
      setError('Authentication required for feedback');
      return;
    }
    try {
      await submitRecommendationFeedback({ token: user.token, songId: itemId, rating });
      setFeedbackMap(prev => ({ ...prev, [String(itemId)]: rating === 1 ? 'like' : 'dislike' }));
    } catch (err) {
      setError(err.message || 'Could not save feedback');
    }
  };

  return (
    <div className="recs-root card">
      <div className="recs-header">
        <h2>Recommendations</h2>
        <button className="ribbon-btn" onClick={onBack}>Back</button>
      </div>

      <div className="recs-filters">
        <div className="recs-mode">
          <label>
            <input type="radio" checked={mode === 'personalized'} onChange={() => setMode('personalized')} />
            Personalized
          </label>
          <label>
            <input type="radio" checked={mode === 'filters'} onChange={() => setMode('filters')} />
            Filters only
          </label>
        </div>
        <div className="recs-field">
          <label>Recommendation mode</label>
          <small>{mode === 'personalized' ? 'Uses your saved likes and dislikes.' : 'Searches the catalog using only your filters.'}</small>
        </div>
        <div className="recs-field">
          <label>Genre (optional)</label>
          <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g., hip hop" />
        </div>
        <div className="recs-field">
          <label>Artist (optional)</label>
          <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="e.g., drake" />
        </div>
        <div className="recs-field">
          <label>Subgenre (optional)</label>
          <input value={subgenre} onChange={(e) => setSubgenre(e.target.value)} placeholder="e.g., trap" />
        </div>
        <div className="recs-field">
          <label>How many (optional)</label>
          <input
            type="number"
            min="1"
            max="50"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            placeholder="default 20"
          />
        </div>
        <div className="recs-field">
          <label>Tempo BPM (optional)</label>
          <input type="number" min="30" max="240" value={tempo} onChange={(e) => setTempo(e.target.value)} placeholder="e.g., 120" />
        </div>
        <div className="recs-field">
          <label>Energy 0–1 (optional)</label>
          <input type="number" min="0" max="1" step="0.1" value={energy} onChange={(e) => setEnergy(e.target.value)} placeholder="e.g., 0.8" />
        </div>
        <div className="recs-field">
          <label>Key 0–11 (optional)</label>
          <input type="number" min="0" max="11" value={key} onChange={(e) => setKey(e.target.value)} placeholder="pitch class" />
        </div>
        <button className="ribbon-btn" onClick={handleFetch} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Get Recommendations'}
        </button>
      </div>

      {error && <div className="recs-status error">{error}</div>}

      <div className="recs-list">
        {items.length === 0 && !isLoading && !error && (
          <div className="recs-empty">No recommendations yet. Fetch to see personalized picks.</div>
        )}
        {items.map((item) => (
          <div key={item.id} className="recs-card">
            <div className="recs-title">{item.title}</div>
            <div className="recs-meta">
              <span>{item.artist}</span>
              <span>| {item.genre}</span>
              {item.score != null && <span>| score: {item.score}</span>}
              {item.audioFeatures?.tempo_bpm != null && <span>| {Math.round(item.audioFeatures.tempo_bpm)} BPM</span>}
            </div>
            <div className="recs-actions">
              <button
                className={`pill-btn ${feedbackMap[String(item.id)] === 'like' ? 'pill-active' : ''}`}
                onClick={() => handleFeedback(item.id, 1)}
                disabled={isLoading}
              >
                Like
              </button>
              <button
                className={`pill-btn danger ${feedbackMap[String(item.id)] === 'dislike' ? 'pill-active' : ''}`}
                onClick={() => handleFeedback(item.id, 0)}
                disabled={isLoading}
              >
                Dislike
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Recommendations;
