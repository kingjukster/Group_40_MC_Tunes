from src.qdrant.vector_database import Recommendation_System
from qdrant_client.http import models

def test_get_parsed_recommendations_feedback(mocker):
    rs = Recommendation_System("test_collection")

    # Mock get_user_ratings to return some positive and negative IDs
    mocker.patch.object(rs, "get_user_ratings", return_value=([7], [8]))

    # Mock query_points
    mocker.patch.object(
        rs,
        "get_recommendations_using_feedback",
        return_value=models.QueryResponse(
            points=[
                models.ScoredPoint(
                    id=7,
                    payload={"genre": "rock", "artist": "Artist1", "name": "Song1"},
                    score=0.95,
                    version=1
                )
            ]
        )
    )

    parsed = rs.get_parsed_recommendations("test_user")
    assert parsed == [(7, "Artist1", "rock", "Song1")]
