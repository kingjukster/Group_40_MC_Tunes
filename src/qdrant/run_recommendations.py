import sys
import io
import json
from vector_database import Recommendation_System 


def main():
    # Read command line arguments
    # Arguments will be passed from Node.js in order:
    # userID, genre, artist, subgenre, num_points
    userID = sys.argv[1] if len(sys.argv) > 1 else None
    genre = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "" else None
    artist = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "" else None
    subgenre = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != "" else None
    num_points = int(sys.argv[5]) if len(sys.argv) > 5 and sys.argv[5] != "" else 20

    with open("log.txt", "a", encoding="utf-8", errors="ignore") as log_file:
        log_file.write(f"Received arguments: userID={userID}, genre={genre}, artist={artist}, subgenre={subgenre}, num_points={num_points}\n")
    # Initialize recommendation system
    RS = Recommendation_System("MC Tunes")

    # Get recommendations
    try:
        recommendations = RS.get_parsed_recommendations(
            userID=userID,
            genre=genre,
            artist=artist,
            subgenre=subgenre,
            num_points=num_points
        )
    except Exception as e:
        # If something fails, return an error JSON
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

    with open("log_rec.txt", "a", encoding="utf-8", errors="ignore") as log_file:
        log_file.write(f"Recommendations: {recommendations}\n")
    
    # Print results as JSON so Node.js can read it
    print(json.dumps(recommendations, ensure_ascii=True))


if __name__ == "__main__":
    main()
