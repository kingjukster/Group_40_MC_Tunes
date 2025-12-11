from src.qdrant.vector_database import Recommendation_System

def test_get_recommendations_using_filter(mocker):
    rs = Recommendation_System("test_collection")

    # Mock scroll response (tuple: points, next_offset)
    mocker.patch.object(
        rs.client,
        "scroll",
        return_value=(
            [
                {"id": 10, "payload": {"genre": "jazz", "artist": "Artist3", "name": "Song3"}},
                {"id": 11, "payload": {"genre": "blues", "artist": "Artist4", "name": "Song4"}}
            ],
            None
        )
    )

    results = rs.get_recommendations_using_filter(genre="jazz", num_points=2)
    assert len(results[0]) == 2
    assert results[0][0]["id"] == 10
