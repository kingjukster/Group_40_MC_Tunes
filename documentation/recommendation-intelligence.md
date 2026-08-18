# Recommendation Intelligence Plan

## Current implementation

MC Tunes uses a staged recommender:

1. MySQL stores users and explicit ratings.
2. Qdrant retrieves candidate tracks using metadata and existing vectors.
3. The API removes rated tracks and applies optional audio preferences.
4. A lightweight reranker scores tempo, energy, and musical key when audio features exist.
5. The frontend lets users choose personalized or filter-only recommendations.

The neural model layer is available through `multimodal_embeddings.py`. It uses MERT for music audio, CLAP for audio/text alignment, and a Sentence Transformer for lyrics. Neural vectors are written to a separate `MC Tunes Multimodal` collection so the existing collection remains available during migration.

The existing Qdrant vector is preserved. Audio enrichment is written to each point's `audio_features` payload, so the first rollout does not require deleting or rebuilding the collection.

## Audio enrichment contract

`src/qdrant/audio_features.py` extracts:

- Rhythm: tempo and beat count.
- Energy: RMS energy and dynamic range.
- Timbre: spectral centroid, bandwidth, contrast, rolloff, flatness, and zero-crossing rate.
- Melody and harmony proxies: chroma profile, estimated pitch class, and key strength.
- Texture: MFCC mean and standard deviation.

Every payload includes `schema_version`, named scalar fields, and a normalized `feature_vector`. The schema version must change when feature order or meaning changes.

## Enrichment workflow

Install Python dependencies, then preview a batch:

```powershell
python -m pip install -r requirements.txt
python -m src.qdrant.ingest_audio_features "path\to\audio" --dry-run
python -m src.qdrant.download_models
```

Audio filenames must be numeric point IDs, such as `42.mp3`. After validating the preview, omit `--dry-run` to write payloads to Qdrant.

To embed one song into the multimodal collection:

```powershell
python -m src.qdrant.ingest_multimodal "path\to\42.mp3" --point-id 42 --lyrics-file "path\to\42.txt" --dry-run
```

## Next model stages

1. Add MERT or another music encoder as a second named Qdrant vector.
2. Add lyric embeddings and CLAP text/audio alignment.
3. Replace fixed reranker weights with weights learned from ratings and skips.
4. Add session and listening-order data for sequential recommendation.
5. Evaluate precision, NDCG, skip rate, completion rate, novelty, and diversity before changing production weights.

## Local AI operations

The monitoring service should observe API health, Qdrant latency, ingestion failures, feature schema versions, recommendation quality metrics, and GPU jobs. It should explain and alert on the system, while candidate retrieval and ranking remain deterministic and testable.
