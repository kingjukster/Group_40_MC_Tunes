"""Local MERT, CLAP, and lyric embedding pipeline."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np


@dataclass(frozen=True)
class EmbeddingConfig:
    mert_model: str = "m-a-p/MERT-v1-330M"
    clap_model: str = "laion/clap-htsat-unfused"
    lyric_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    sample_rate: int = 24_000
    max_audio_seconds: float = 30.0
    device: str | None = None


def _normalize(vector: Any) -> list[float]:
    array = np.asarray(vector, dtype=np.float32).reshape(-1)
    norm = float(np.linalg.norm(array))
    if norm > 0:
        array = array / norm
    return array.tolist()


def _embedding_array(output: Any) -> Any:
    for attribute in ("audio_embeds", "text_embeds", "pooler_output", "last_hidden_state"):
        value = getattr(output, attribute, None)
        if value is not None:
            if len(value.shape) == 3:
                return value.mean(dim=1)
            return value
    return output


class MultimodalEmbedder:
    def __init__(self, config: EmbeddingConfig | None = None):
        self.config = config or EmbeddingConfig()
        self.device = self.config.device or self._default_device()
        self._mert = None
        self._mert_processor = None
        self._clap = None
        self._clap_processor = None
        self._lyrics = None

    @staticmethod
    def _default_device() -> str:
        try:
            import torch
            return "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            return "cpu"

    @staticmethod
    def _torch():
        try:
            import torch
            return torch
        except ImportError as error:
            raise RuntimeError("Install torch before loading neural embedding models") from error

    def _load_audio(self, audio_path: str | Path, sample_rate: int | None = None) -> tuple[np.ndarray, int]:
        try:
            import librosa
        except ImportError as error:
            raise RuntimeError("Install librosa and soundfile before embedding audio") from error

        audio, sample_rate = librosa.load(
            str(audio_path),
            sr=sample_rate or self.config.sample_rate,
            mono=True,
            duration=self.config.max_audio_seconds,
        )
        if audio.size == 0:
            raise ValueError(f"Audio file is empty: {audio_path}")
        return audio.astype(np.float32), sample_rate

    def _load_mert(self):
        if self._mert is None:
            try:
                from transformers import AutoFeatureExtractor, AutoModel
            except ImportError as error:
                raise RuntimeError("Install transformers before loading MERT") from error
            torch = self._torch()
            self._mert_processor = AutoFeatureExtractor.from_pretrained(self.config.mert_model)
            self._mert = AutoModel.from_pretrained(
                self.config.mert_model,
                trust_remote_code=True,
            ).to(self.device).eval()
            self._mert_dtype = torch.float16 if self.device == "cuda" else torch.float32
        return self._mert, self._mert_processor

    def _load_clap(self):
        if self._clap is None:
            try:
                from transformers import ClapModel, ClapProcessor
            except ImportError as error:
                raise RuntimeError("Install transformers before loading CLAP") from error
            self._clap_processor = ClapProcessor.from_pretrained(self.config.clap_model)
            self._clap = ClapModel.from_pretrained(self.config.clap_model).to(self.device).eval()
        return self._clap, self._clap_processor

    def _load_lyrics(self):
        if self._lyrics is None:
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError as error:
                raise RuntimeError("Install sentence-transformers before loading lyric embeddings") from error
            self._lyrics = SentenceTransformer(self.config.lyric_model, device=self.device)
        return self._lyrics

    def embed_mert(self, audio_path: str | Path) -> list[float]:
        torch = self._torch()
        model, processor = self._load_mert()
        audio, sample_rate = self._load_audio(audio_path)
        inputs = processor(audio, sampling_rate=sample_rate, return_tensors="pt")
        inputs = {key: value.to(self.device) for key, value in inputs.items()}
        with torch.inference_mode():
            outputs = model(**inputs)
            hidden = outputs.last_hidden_state
            pooled = hidden.mean(dim=1)
        return _normalize(pooled.detach().float().cpu().numpy()[0])

    def embed_clap_audio(self, audio_path: str | Path) -> list[float]:
        torch = self._torch()
        model, processor = self._load_clap()
        audio, sample_rate = self._load_audio(audio_path, sample_rate=48_000)
        inputs = processor(audio=audio, sampling_rate=sample_rate, return_tensors="pt")
        inputs = {key: value.to(self.device) for key, value in inputs.items()}
        with torch.inference_mode():
            embedding = model.get_audio_features(**inputs)
        embedding = _embedding_array(embedding)
        return _normalize(embedding.detach().float().cpu().numpy()[0])

    def embed_clap_text(self, text: str) -> list[float]:
        torch = self._torch()
        model, processor = self._load_clap()
        inputs = processor(text=[text], return_tensors="pt", padding=True)
        inputs = {key: value.to(self.device) for key, value in inputs.items()}
        with torch.inference_mode():
            embedding = model.get_text_features(**inputs)
        embedding = _embedding_array(embedding)
        return _normalize(embedding.detach().float().cpu().numpy()[0])

    def embed_lyrics(self, lyrics: str) -> list[float]:
        if not lyrics or not lyrics.strip():
            raise ValueError("Lyrics text is required")
        embedding = self._load_lyrics().encode(
            lyrics.strip(),
            normalize_embeddings=True,
            convert_to_numpy=True,
        )
        return _normalize(embedding)

    def embed_song(self, audio_path: str | Path, lyrics: str | None = None) -> dict[str, list[float]]:
        embeddings = {
            "mert": self.embed_mert(audio_path),
            "clap_audio": self.embed_clap_audio(audio_path),
        }
        if lyrics and lyrics.strip():
            embeddings["lyrics"] = self.embed_lyrics(lyrics)
            embeddings["clap_text"] = self.embed_clap_text(lyrics)
        return embeddings
