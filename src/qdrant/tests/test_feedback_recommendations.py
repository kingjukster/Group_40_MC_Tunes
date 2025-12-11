from src.qdrant.vector_database import Recommendation_System
from qdrant_client.http import models

def test_get_recommendations_using_feedback(mocker):
    rs = Recommendation_System("test_collection")

    # Mock query_points to return ScoredPoints
    mocker.patch.object(
        rs.client,
        "query_points",
        return_value=models.QueryResponse(
            points=[
                models.ScoredPoint(
                    id=7,
                    payload={"genre": "rock", "artist": "Artist1", "name": "Song1"},
                    score=0.95,
                    version=1
                ),
                models.ScoredPoint(
                    id=8,
                    payload={"genre": "pop", "artist": "Artist2", "name": "Song2"},
                    score=0.90,
                    version=1
                )
            ]
        )
    )

    results = rs.get_recommendations_using_feedback(positive_ids=[7], negative_ids=[8])
    assert len(results.points) == 2
    assert results.points[0].id == 7
