from qdrant_client import QdrantClient, models
from qdrant_client.http import models

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
    
if __name__ == "__main__":
    RS = Recommendation_System("MC Tunes")
    print(RS.get_recommendations_using_feedback(positive_ids=[26],negative_ids=[],genre="hip hop", num_points=10))