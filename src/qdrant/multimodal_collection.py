"""Create and populate a Qdrant collection with named multimodal vectors."""

from __future__ import annotations

from typing import Any

from qdrant_client import QdrantClient, models


MULTIMODAL_COLLECTION = "MC Tunes Multimodal"
MODEL_VECTOR_DIMENSIONS = {
    "mert": 1024,
    "clap_audio": 512,
    "lyrics": 384,
    "clap_text": 512,
}


def create_collection(client: QdrantClient, collection_name: str, dimensions: dict[str, int]) -> None:
    if client.collection_exists(collection_name=collection_name):
        return
    client.create_collection(
        collection_name=collection_name,
        vectors_config={
            name: models.VectorParams(size=size, distance=models.Distance.COSINE)
            for name, size in dimensions.items()
        },
    )


def upsert_song(
    client: QdrantClient,
    collection_name: str,
    point_id: int | str,
    embeddings: dict[str, list[float]],
    payload: dict[str, Any],
) -> None:
    client.upsert(
        collection_name=collection_name,
        points=[models.PointStruct(id=point_id, vector=embeddings, payload=payload)],
    )
