"""Batch-enrich existing Qdrant points with deterministic audio features."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable

from qdrant_client import QdrantClient

try:
    from .audio_features import AudioFeatureExtractor
except ImportError:
    from audio_features import AudioFeatureExtractor


def iter_audio_files(audio_dir: Path) -> Iterable[Path]:
    extensions = {".flac", ".m4a", ".mp3", ".ogg", ".wav"}
    return sorted(path for path in audio_dir.rglob("*") if path.suffix.lower() in extensions)


def update_point(client: QdrantClient, collection: str, point_id: int | str, features: dict) -> None:
    client.set_payload(
        collection_name=collection,
        payload={"audio_features": features},
        points=[point_id],
    )


def ingest(audio_dir: Path, collection: str, qdrant_url: str, dry_run: bool = False) -> dict:
    client = QdrantClient(url=qdrant_url)
    extractor = AudioFeatureExtractor()
    processed = 0
    failed: list[dict[str, str]] = []

    for audio_path in iter_audio_files(audio_dir):
        try:
            point_id = int(audio_path.stem)
            features = extractor.extract(audio_path).to_payload()
            if not dry_run:
                update_point(client, collection, point_id, features)
            processed += 1
        except (ValueError, FileNotFoundError, RuntimeError) as error:
            failed.append({"file": str(audio_path), "error": str(error)})

    return {"processed": processed, "failed": failed, "dry_run": dry_run}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio_dir", type=Path)
    parser.add_argument("--collection", default="MC Tunes")
    parser.add_argument("--qdrant-url", default="http://localhost:6333")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    print(json.dumps(ingest(args.audio_dir, args.collection, args.qdrant_url, args.dry_run)))


if __name__ == "__main__":
    main()
