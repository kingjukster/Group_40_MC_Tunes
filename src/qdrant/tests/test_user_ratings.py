from unittest.mock import Mock
from src.qdrant.vector_database import Recommendation_System

def test_get_user_ratings(mocker):
    rs = Recommendation_System("test_collection")

    # Mock the API response
    mock_response = Mock()
    mock_response.ok = True
    mock_response.json.return_value = {
        "reports": [
            {"songID": 1, "rating": 1},
            {"songID": 2, "rating": 0},
            {"songID": 3, "rating": 1}
        ]
    }

    mocker.patch("src.qdrant.vector_database.requests.get", return_value=mock_response)

    positive, negative = rs.get_user_ratings("test_user")

    assert positive == [1, 3]
    assert negative == [2]
