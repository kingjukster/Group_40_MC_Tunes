from qdrant_client import QdrantClient, models
from qdrant_client.http import models
import requests


class Recommendation_System:

    # Qdrant Vector DB is hosted locally in docker container outside of repo (currently using ports 6333 and 6334). System will be saved onto disk for now. 
    client = QdrantClient(host="localhost", port=6333)

    def __init__(self, collection_name):
        self.collection_name = collection_name

    # Embedding for songs to turn into vectors
    
    # Get recommedations based upon filters. If no, filters are used it will return anything
    # Can be used as a jumping off point before using likes and dislikes
    def get_recommendations_using_filter(self, genre=None, artist=None, subgenre=None, num_points=20):
        Filter = self.build_filter(genre, artist, subgenre)
        results = self.client.scroll(
            collection_name=self.collection_name,
            scroll_filter=Filter,
            limit=num_points,
            with_payload=True
        )
        return results

    # Build a dynamic filter based upon the parameters given. If no, parameters are given, it will match anything
    def build_filter(self, genre=None, artist=None, subgenre=None):
        conditions = []

        if genre is not None:
            conditions.append(
                models.FieldCondition(
                    key="genre",
                    match=models.MatchValue(value=genre),
                )
            )

        if artist is not None:
            conditions.append(
                models.FieldCondition(
                    key="artist",
                    match=models.MatchValue(value=artist),
                )
            )

        if subgenre is not None:
            conditions.append(
                models.FieldCondition(
                    key="subgenre",
                    match=models.MatchValue(value=subgenre),
                )
            )

        # If no filters at all, return None (Qdrant treats this as "match everything")
        return models.Filter(must=conditions) if conditions else None
    
    # Given Feedback (ids of likes or dislikes), give new recommendations
    def get_recommendations_using_feedback(self, positive_ids, negative_ids, genre=None, artist=None, subgenre=None, num_points=20):
        Filter = self.build_filter(genre, artist, subgenre)
        results = self.client.query_points(
            collection_name=self.collection_name,
            query=models.RecommendQuery(
                recommend=models.RecommendInput(
                    positive=positive_ids,
                    negative=negative_ids,
                    strategy=models.RecommendStrategy.AVERAGE_VECTOR,
                    )
                ),
            query_filter=Filter,
            limit=num_points
        )
        return results
    
    def get_parsed_recommendations(self, userID, genre=None, artist=None, subgenre=None, num_points=20):
        positive_ids, negative_ids = self.get_user_ratings(userID)
        if len(positive_ids) != 0:
            raw = self.get_recommendations_using_feedback(
                positive_ids, negative_ids, genre, artist, subgenre, num_points
            )
            # QueryResponseNearby extract ScoredPoints
            results = raw.points

        else:
            raw = self.get_recommendations_using_filter(
                genre, artist, subgenre, num_points
            )
            # Scroll returns (points, next_offset)
            results = raw[0]

        # Filter out any results that raise payload encoding issues
        newresults = []
        for point in results:
            try:
                newresults.append(point)
            except Exception:
                continue
        results = newresults
        
        # Parsing will be returned as list of tuples. Tuples will be ordered (id, artist, genre, name)
        parsed_data = []
        for point in results:
            track_id = point.id
            artist = point.payload.get("artist")
            genre = point.payload.get("genre")
            name = point.payload.get("name")

            parsed_data.append((track_id, artist, genre, name))
        # Shuffle to avoid returning the exact same ordering on repeated calls
        try:
            import random
            random.shuffle(parsed_data)
        except Exception:
            pass
        return parsed_data
    
    def get_user_ratings(self, userID):
        # Rating api URL
        url = "http://localhost:3000/ratings"

        params = {
            "username": userID
        }

        response = requests.get(url, params=params)

        if not response.ok:
            print("Error:", response.status_code, response.text)
            return [], []

        data = response.json()
        positive_ids = []
        negative_ids = []
        for entry in data.get("reports", []):
            song_id = entry["songID"]
            rating = entry["rating"]

            if rating == 1:
                positive_ids.append(song_id)
            elif rating == 0:
                negative_ids.append(song_id)
        return positive_ids, negative_ids
        
if __name__ == "__main__":
    RS = Recommendation_System("MC Tunes")
    RS.client.delete(collection_name="MC Tunes", points_selector=RS.build_filter(genre="latin"))
