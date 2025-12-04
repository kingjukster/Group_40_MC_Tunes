import React, { useState } from 'react';
import './recommendations.css';
import { fetchRecommendations } from '../services/recommendations';

function Recommendations({ onBack }) {
  const [genre, setGenre] = useState('');
  const [artist, setArtist] = useState('');
  const [subgenre, setSubgenre] = useState('');
  const [limit, setLimit] = useState(10);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const normalizeItem = (item, idx) => {
    const payload = item?.payload || item;
    return {
      id: payload?.id || item?.id || idx,
      title: payload?.title || payload?.songName || payload?.name || 'Unknown track',
      artist: payload?.artist || payload?.artistName || 'Unknown artist',
      genre: payload?.genre || payload?.subgenre || 'Unknown genre',
      score: item?.score ?? payload?._score
    };
  };

  const handleFetch = async () => {
    setIsLoading(true);
    setError('');
    try {
      const raw = await fetchRecommendations({ genre: genre || undefined, artist: artist || undefined, subgenre: subgenre || undefined, limit });
      setItems(raw.map((r, i) => normalizeItem(r, i)));
    } catch (err) {
      setItems([]);
      setError(err.message || 'Could not load recommendations');
    } finally {
      setIsLoading(false);
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
          <label>Genre</label>
          <input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="e.g., hip hop" />
        </div>
        <div className="recs-field">
          <label>Artist</label>
          <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="e.g., drake" />
        </div>
        <div className="recs-field">
          <label>Subgenre</label>
          <input value={subgenre} onChange={(e) => setSubgenre(e.target.value)} placeholder="e.g., trap" />
        </div>
        <div className="recs-field">
          <label>How many</label>
          <input
            type="number"
            min="1"
            max="50"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value) || 1)}
          />
        </div>
        <button className="ribbon-btn" onClick={handleFetch} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Get Recommendations'}
        </button>
      </div>

      {error && <div className="recs-status error">{error}</div>}

      <div className="recs-list">
        {items.length === 0 && !isLoading && !error && (
          <div className="recs-empty">No recommendations yet. Try applying a filter.</div>
        )}
        {items.map((item) => (
          <div key={item.id} className="recs-card">
            <div className="recs-title">{item.title}</div>
            <div className="recs-meta">
              <span>{item.artist}</span>
              <span>• {item.genre}</span>
              {item.score != null && <span>• score: {item.score}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Recommendations;
