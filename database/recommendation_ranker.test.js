import assert from 'node:assert/strict';
import test from 'node:test';

import { parseAudioPreferences, rankCandidates } from './recommendation_ranker.js';

test('parses valid audio preferences and rejects invalid values', () => {
  assert.deepEqual(parseAudioPreferences({ tempo: '120', energy: '0.8', key: '4' }), {
    tempo: 120,
    energy: 0.8,
    key: 4
  });
  assert.deepEqual(parseAudioPreferences({ tempo: 'fast', energy: '2', key: '12' }), {
    tempo: null,
    energy: null,
    key: null
  });
});

test('ranks candidates by audio preferences after retrieval', () => {
  const points = [
    { id: 1, score: 0.9, payload: { audio_features: { tempo_bpm: 180, energy: 0.9, key_pitch_class: 8 } } },
    { id: 2, score: 0.7, payload: { audio_features: { tempo_bpm: 120, energy: 0.5, key_pitch_class: 4 } } }
  ];

  const ranked = rankCandidates(points, { tempo: 120, energy: 0.5, key: 4 }, 2);

  assert.equal(ranked[0].id, 2);
});

test('preserves retrieval order without audio preferences', () => {
  const points = [{ id: 1 }, { id: 2 }];

  assert.deepEqual(rankCandidates(points, { tempo: null, energy: null, key: null }, 2), points);
});
