import React, { useState } from 'react';
import './recommendations.css';
import { fetchParsedRecommendations, submitRecommendationFeedback } from '../services/recommendations';

function Recommendations({ onBack, user }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState({});

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
      score: item?.score ?? payload?._score
    };
  };

  const handleFetch = async () => {
    if (!user?.userName) {
      setError('Missing user id for recommendations');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const raw = await fetchParsedRecommendations(user.userName);
      setItems(raw.map((r, i) => normalizeItem(r, i)));
      setFeedbackMap({});
    } catch (err) {
      setItems([]);
      setError(err.message || 'Could not load recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (itemId, rating) => {
    if (!user?.id) {
      setError('Missing user id for feedback');
      return;
    }
    try {
      await submitRecommendationFeedback({ userId: user.id, songId: itemId, rating });
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
        <div className="recs-field">
          <label>Your user id</label>
          <input value={user?.id || ''} readOnly />
          <small>Recommendations use your saved likes/dislikes.</small>
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
