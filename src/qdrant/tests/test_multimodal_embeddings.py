from src.qdrant.multimodal_embeddings import _normalize


def test_normalize_returns_unit_vector():
    vector = _normalize([3.0, 4.0])

    assert len(vector) == 2
    assert abs(sum(value * value for value in vector) - 1.0) < 1e-6
