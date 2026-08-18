from qdrant_client import QdrantClient

from src.qdrant.multimodal_collection import MODEL_VECTOR_DIMENSIONS, create_collection, upsert_song


def test_multimodal_collection_round_trip():
    client = QdrantClient(":memory:")
    create_collection(client, "test_multimodal", MODEL_VECTOR_DIMENSIONS)
    upsert_song(
        client,
        "test_multimodal",
        1,
        {name: [0.1] * size for name, size in MODEL_VECTOR_DIMENSIONS.items()},
        {"name": "test song"},
    )

    points = client.retrieve("test_multimodal", ids=[1], with_vectors=True)
    assert points[0].payload["name"] == "test song"
    assert set(points[0].vector) == set(MODEL_VECTOR_DIMENSIONS)
