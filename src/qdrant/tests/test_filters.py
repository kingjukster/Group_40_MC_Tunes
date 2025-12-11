from src.qdrant.vector_database import Recommendation_System
from qdrant_client.http import models

def test_build_filter_with_params():
    rs = Recommendation_System("test_collection")

    # Genre only
    f = rs.build_filter(genre="rock")
    assert isinstance(f, models.Filter)
    assert f.must[0].key == "genre"

    # Genre + artist
    f2 = rs.build_filter(genre="pop", artist="Artist1")
    assert len(f2.must) == 2

    # No params returns None
    f3 = rs.build_filter()
    assert f3 is None
