const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const normalizedDistance = (value, target, range) => {
  if (!Number.isFinite(value) || !Number.isFinite(target)) return 0.5;
  return clamp(Math.abs(value - target) / range, 0, 1);
};

const preferenceScore = (features, preferences) => {
  if (!features || !preferences) return 0.5;

  const comparisons = [];
  if (Number.isFinite(preferences.tempo)) {
    comparisons.push(1 - normalizedDistance(features.tempo_bpm, preferences.tempo, 120));
  }
  if (Number.isFinite(preferences.energy)) {
    comparisons.push(1 - normalizedDistance(features.energy, preferences.energy, 1));
  }
  if (Number.isFinite(preferences.key)) {
    const distance = Math.abs((features.key_pitch_class ?? 0) - preferences.key);
    const circularDistance = Math.min(distance, 12 - distance) / 6;
    comparisons.push(1 - clamp(circularDistance, 0, 1));
  }

  return comparisons.length > 0
    ? comparisons.reduce((sum, value) => sum + value, 0) / comparisons.length
    : 0.5;
};

export function parseAudioPreferences(query) {
  const parse = (value, minimum, maximum) => {
    if (value === undefined || value === null || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
  };

  return {
    tempo: parse(query.tempo, 30, 240),
    energy: parse(query.energy, 0, 1),
    key: parse(query.key, 0, 11)
  };
}

export function rankCandidates(points, preferences, limit) {
  const hasPreferences = Object.values(preferences).some(value => value !== null);
  if (!hasPreferences) return points.slice(0, limit);

  return points
    .map((point, index) => {
      const qdrantScore = Number.isFinite(point.score) ? clamp(point.score, 0, 1) : 0.5;
      const featureScore = preferenceScore(point.payload?.audio_features, preferences);
      return {
        point,
        originalIndex: index,
        score: 0.65 * qdrantScore + 0.35 * featureScore
      };
    })
    .sort((left, right) => right.score - left.score || left.originalIndex - right.originalIndex)
    .slice(0, limit)
    .map(entry => entry.point);
}
