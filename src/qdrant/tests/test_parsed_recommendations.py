from src.qdrant.vector_database import Recommendation_System
from qdrant_client.http import models

def test_get_parsed_recommendations_no_feedback(mocker):
    rs = Recommendation_System("test_collection")

    # --- Mock get_user_ratings to return empty lists ---
    mocker.patch.object(rs, "get_user_ratings", return_value=([], []))

    # --- Mock get_recommendations_using_filter ---
    mocker.patch.object(
        rs,
        "get_recommendations_using_filter",
        return_value=(
            [
                models.ScoredPoint(
                    id=42,
                    payload={"genre": "jazz", "artist": "Artist2", "name": "Song2"},
                    score=0.88,
                    version=1,
                )
            ],
            None  # next_offset
        ),
    )

    # --- Call method ---
    parsed = rs.get_parsed_recommendations(
        "test_user",
        genre="jazz",
        artist="Artist2",
        subgenre=None,
        num_points=10
    )

    # --- Assert parsed output ---
    # Make sure this matches exactly how get_parsed_recommendations returns it
    expected = [(42, "Artist2", "jazz", "Song2")]
    assert parsed == expected

def test_get_parsed_recommendations_with_feedback(mocker):
    rs = Recommendation_System("test_collection")

    # --- Mock get_user_ratings to return some positive and negative IDs ---
    mocker.patch.object(rs, "get_user_ratings", return_value=([7], [8]))

    # --- Mock get_recommendations_using_feedback ---
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

    # --- Call method ---
    parsed = rs.get_parsed_recommendations("test_user")

    # --- Assert expected parsed result ---
    assert parsed == [(7, "Artist1", "rock", "Song1")]
