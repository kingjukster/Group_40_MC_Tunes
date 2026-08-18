from src.qdrant.audio_features import AudioFeatures, FEATURE_SCHEMA_VERSION


def make_features():
    return AudioFeatures(
        schema_version=FEATURE_SCHEMA_VERSION,
        duration_seconds=120.0,
        tempo_bpm=120.0,
        beat_count=240,
        energy=0.5,
        dynamic_range=0.2,
        spectral_centroid=0.3,
        spectral_bandwidth=0.4,
        spectral_contrast=0.5,
        spectral_rolloff=0.6,
        spectral_flatness=0.1,
        zero_crossing_rate=0.05,
        key_pitch_class=4,
        key_strength=0.7,
        chroma_mean=[0.1] * 12,
        chroma_std=[0.2] * 12,
        mfcc_mean=[0.3] * 13,
        mfcc_std=[0.4] * 13,
    )


def test_audio_feature_payload_is_versioned_and_serializable():
    payload = make_features().to_payload()

    assert payload["schema_version"] == FEATURE_SCHEMA_VERSION
    assert len(payload["feature_vector"]) == 62
    assert all(isinstance(value, float) for value in payload["feature_vector"])


def test_audio_feature_vector_contains_rhythm_and_key_values():
    vector = make_features().to_vector()

    assert vector[0] == 0.5
    assert vector[1] == 2.0
    assert vector[10] == 4 / 11
