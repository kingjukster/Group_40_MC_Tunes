"""Generate MERT, CLAP, and lyric vectors and upsert them into Qdrant."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from qdrant_client import QdrantClient

try:
    from .multimodal_collection import MODEL_VECTOR_DIMENSIONS, MULTIMODAL_COLLECTION, create_collection, upsert_song
    from .multimodal_embeddings import EmbeddingConfig, MultimodalEmbedder
except ImportError:
    from multimodal_collection import MODEL_VECTOR_DIMENSIONS, MULTIMODAL_COLLECTION, create_collection, upsert_song
    from multimodal_embeddings import EmbeddingConfig, MultimodalEmbedder


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio_file", type=Path)
    parser.add_argument("--lyrics-file", type=Path)
    parser.add_argument("--point-id", type=int, required=True)
    parser.add_argument("--collection", default=MULTIMODAL_COLLECTION)
    parser.add_argument("--qdrant-url", default="http://localhost:6333")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    lyrics = args.lyrics_file.read_text(encoding="utf-8") if args.lyrics_file else None
    config = EmbeddingConfig()
    embedder = MultimodalEmbedder(config)
    embeddings = embedder.embed_song(args.audio_file, lyrics)
    dimensions = {name: len(vector) for name, vector in embeddings.items()}
    result = {"point_id": args.point_id, "dimensions": dimensions, "dry_run": args.dry_run}

    if not args.dry_run:
        client = QdrantClient(url=args.qdrant_url)
        create_collection(client, args.collection, MODEL_VECTOR_DIMENSIONS)
        upsert_song(
            client,
            args.collection,
            args.point_id,
            embeddings,
            {"embedding_models": {"mert": config.mert_model, "clap": config.clap_model}},
        )

    print(json.dumps(result))


if __name__ == "__main__":
    main()
