"""Download all local recommendation models into the Hugging Face cache."""

from __future__ import annotations

try:
    from .multimodal_embeddings import EmbeddingConfig, MultimodalEmbedder
except ImportError:
    from multimodal_embeddings import EmbeddingConfig, MultimodalEmbedder


def main() -> None:
    config = EmbeddingConfig()
    embedder = MultimodalEmbedder(config)
    embedder._load_mert()
    print(f"Downloaded MERT: {config.mert_model}")
    embedder._load_clap()
    print(f"Downloaded CLAP: {config.clap_model}")
    embedder._load_lyrics()
    print(f"Downloaded lyric model: {config.lyric_model}")


if __name__ == "__main__":
    main()
