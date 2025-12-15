# tests/test_run_recommendations.py

import runpy
import json
import pytest
from unittest.mock import patch

def test_run_recommendations_happy_path(capsys):
    # Fake Recommendation_System
    class FakeRS:
        def __init__(self, *args, **kwargs):
            pass
        def get_parsed_recommendations(self, **kwargs):
            return [{"track_id": "123", "score": 0.98}]

    # Patch the class in vector_database
    with patch("src.qdrant.vector_database.Recommendation_System", FakeRS):
        import sys
        sys.argv = ["run_recommendations.py", "user123", "rock", "nirvana", "grunge", "2"]

        # Execute module as __main__ to cover main()
        runpy.run_module("src.qdrant.run_recommendations", run_name="__main__")

    out = capsys.readouterr().out
    data = json.loads(out)
    assert isinstance(data, list)
    assert data[0]["track_id"] == "123"


def test_run_recommendations_exception(capsys):
    class FailingRS:
        def __init__(self, *args, **kwargs):
            pass
        def get_parsed_recommendations(self, **kwargs):
            raise RuntimeError("Qdrant not reachable")

    with patch("src.qdrant.vector_database.Recommendation_System", FailingRS):
        import sys
        sys.argv = ["run_recommendations.py", "user1"]

        with pytest.raises(SystemExit) as exc:
            runpy.run_module("src.qdrant.run_recommendations", run_name="__main__")

        assert exc.value.code == 1
        out = capsys.readouterr().out
        data = json.loads(out)
        assert "error" in data
        assert "Qdrant not reachable" in data["error"]
