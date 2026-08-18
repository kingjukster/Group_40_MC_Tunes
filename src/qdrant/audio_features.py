"""Extract deterministic audio descriptors for music recommendation."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import numpy as np


FEATURE_SCHEMA_VERSION = "1.0"


@dataclass(frozen=True)
class AudioFeatureConfig:
    sample_rate: int = 22_050
    duration_seconds: float = 180.0
    hop_length: int = 512
    n_fft: int = 2_048
    n_mfcc: int = 13


@dataclass(frozen=True)
class AudioFeatures:
    schema_version: str
    duration_seconds: float
    tempo_bpm: float
    beat_count: int
    energy: float
    dynamic_range: float
    spectral_centroid: float
    spectral_bandwidth: float
    spectral_contrast: float
    spectral_rolloff: float
    spectral_flatness: float
    zero_crossing_rate: float
    key_pitch_class: int
    key_strength: float
    chroma_mean: list[float]
    chroma_std: list[float]
    mfcc_mean: list[float]
    mfcc_std: list[float]

    def to_payload(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["feature_vector"] = self.to_vector()
        return payload

    def to_vector(self) -> list[float]:
        values = [
            self.tempo_bpm / 240.0,
            self.beat_count / max(self.duration_seconds, 1.0),
            self.energy,
            self.dynamic_range,
            self.spectral_centroid,
            self.spectral_bandwidth,
            self.spectral_contrast,
            self.spectral_rolloff,
            self.spectral_flatness,
            self.zero_crossing_rate,
            self.key_pitch_class / 11.0,
            self.key_strength,
            *self.chroma_mean,
            *self.chroma_std,
            *self.mfcc_mean,
            *self.mfcc_std,
        ]
        return [float(value) for value in values]


def _safe_scalar(value: Any) -> float:
    array = np.asarray(value, dtype=np.float64)
    finite = array[np.isfinite(array)]
    return float(finite.mean()) if finite.size else 0.0


def _summary(matrix: Any, size: int) -> tuple[list[float], list[float]]:
    array = np.asarray(matrix, dtype=np.float64)
    if array.ndim == 1:
        array = array.reshape(1, -1)
    mean = np.nan_to_num(array.mean(axis=1), nan=0.0, posinf=0.0, neginf=0.0)
    std = np.nan_to_num(array.std(axis=1), nan=0.0, posinf=0.0, neginf=0.0)
    return mean[:size].tolist(), std[:size].tolist()


class AudioFeatureExtractor:
    def __init__(self, config: AudioFeatureConfig | None = None):
        self.config = config or AudioFeatureConfig()

    def extract(self, audio_path: str | Path) -> AudioFeatures:
        try:
            import librosa
        except ImportError as error:
            raise RuntimeError(
                "Audio extraction requires librosa and soundfile. Install requirements.txt."
            ) from error

        path = Path(audio_path)
        if not path.is_file():
            raise FileNotFoundError(path)

        audio, sample_rate = librosa.load(
            str(path),
            sr=self.config.sample_rate,
            mono=True,
            duration=self.config.duration_seconds,
        )
        if audio.size == 0:
            raise ValueError(f"Audio file is empty: {path}")

        cfg = self.config
        harmonic, percussive = librosa.effects.hpss(audio)
        onset = librosa.onset.onset_strength(y=percussive, sr=sample_rate, hop_length=cfg.hop_length)
        tempo, beats = librosa.beat.beat_track(
            onset_envelope=onset,
            sr=sample_rate,
            hop_length=cfg.hop_length,
        )
        tempo_value = _safe_scalar(tempo)

        chroma = librosa.feature.chroma_cqt(
            y=harmonic,
            sr=sample_rate,
            hop_length=cfg.hop_length,
        )
        chroma_mean, chroma_std = _summary(chroma, 12)
        chroma_profile = np.asarray(chroma_mean, dtype=np.float64)
        key_pitch_class = int(np.argmax(chroma_profile)) if chroma_profile.size else 0
        key_strength = float(
            chroma_profile[key_pitch_class] / max(float(chroma_profile.sum()), 1e-9)
        )

        mfcc = librosa.feature.mfcc(
            y=audio,
            sr=sample_rate,
            n_mfcc=cfg.n_mfcc,
            n_fft=cfg.n_fft,
            hop_length=cfg.hop_length,
        )
        mfcc_mean, mfcc_std = _summary(mfcc, cfg.n_mfcc)
        rms = librosa.feature.rms(y=audio, hop_length=cfg.hop_length)
        spectral_centroid = librosa.feature.spectral_centroid(
            y=audio, sr=sample_rate, n_fft=cfg.n_fft, hop_length=cfg.hop_length
        )
        spectral_bandwidth = librosa.feature.spectral_bandwidth(
            y=audio, sr=sample_rate, n_fft=cfg.n_fft, hop_length=cfg.hop_length
        )
        spectral_contrast = librosa.feature.spectral_contrast(
            y=audio, sr=sample_rate, n_fft=cfg.n_fft, hop_length=cfg.hop_length
        )
        spectral_rolloff = librosa.feature.spectral_rolloff(
            y=audio, sr=sample_rate, n_fft=cfg.n_fft, hop_length=cfg.hop_length
        )
        spectral_flatness = librosa.feature.spectral_flatness(
            y=audio, n_fft=cfg.n_fft, hop_length=cfg.hop_length
        )
        zero_crossing_rate = librosa.feature.zero_crossing_rate(
            audio, hop_length=cfg.hop_length
        )

        return AudioFeatures(
            schema_version=FEATURE_SCHEMA_VERSION,
            duration_seconds=float(audio.size / sample_rate),
            tempo_bpm=tempo_value,
            beat_count=int(len(beats)),
            energy=_safe_scalar(rms),
            dynamic_range=float(np.percentile(np.abs(audio), 95) - np.percentile(np.abs(audio), 5)),
            spectral_centroid=_safe_scalar(spectral_centroid) / sample_rate,
            spectral_bandwidth=_safe_scalar(spectral_bandwidth) / sample_rate,
            spectral_contrast=_safe_scalar(spectral_contrast) / 100.0,
            spectral_rolloff=_safe_scalar(spectral_rolloff) / sample_rate,
            spectral_flatness=_safe_scalar(spectral_flatness),
            zero_crossing_rate=_safe_scalar(zero_crossing_rate),
            key_pitch_class=key_pitch_class,
            key_strength=key_strength,
            chroma_mean=chroma_mean,
            chroma_std=chroma_std,
            mfcc_mean=mfcc_mean,
            mfcc_std=mfcc_std,
        )
