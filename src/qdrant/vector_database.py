from datasets import load_dataset, Audio
from qdrant_client import QdrantClient
from qdrant_client.http import models
from os.path import join
from glob import glob
import pandas as pd
import numpy as np
import torch
from panns_inference import AudioTagging

# TODO generic vector db functions to allow for easy use across projects probably will use different python file 
# Qdrant Vector DB is hosted locally in docker container outside of repo (currently using ports 6333 and 6334). System will be saved onto disk for now. 
collection_name = "MC Tunes"
client = QdrantClient(host="localhost", port=6333)
at = AudioTagging(checkpoint_path=None, device='cuda')

def create_collection_if_not_created():
  if not client.collection_exists(collection_name={collection_name}):
    client.create_collection(
      collection_name={collection_name},
      vectors_config=models.VectorParams(size=65536, distance=models.Distance.COSINE),
  )
    
def get_metadata(x):
  cols = ['artist', 'genre', 'name', 'subgenres']
  list_of_cols = []
  for col in cols:
      try:
          mdata = list(x[col].values())[0]
      except:
          mdata = "Unknown"
      list_of_cols.append(mdata)
  return pd.Series(list_of_cols, index=cols)

def get_vals(genres):
    genre_list = []
    for dicts in genres:
        if type(dicts) != str:
            for _, val in dicts.items():
                genre_list.append(val)
    return genre_list

def get_panns_embs(batch):
    arrays = [torch.tensor(val['array'], dtype=torch.float64) for val in batch['audio']]
    inputs = torch.nn.utils.rnn.pad_sequence(arrays, batch_first=True, padding_value=0).float()
    _, embedding = at.inference(inputs)
    batch['panns_embeddings'] = embedding
    return batch

if __name__ == "__main__":
  create_collection_if_not_created()

  # Temp data path of song db
  data_path = join("..","Music DB")

  # Load mp3 data from song db
  music_data = load_dataset(
    "audiofolder", data_dir=join(data_path, "mp3"), split="train", drop_labels=True
  )

  # Generate temp indexes (Will be better once relational db is incorporated)
  index = [num for num in range(len(music_data))]
  music_data.add_column("index", index)
  music_data[-1]
  
  # Read labels.json which includes metadata of every song (artists, genre, sub-genre, name)
  labels = pd.read_json(join(data_path, "labels.json"))

  # Seperate track info into separate columns
  clean_labels = labels['tracks'].apply(get_metadata).reset_index()
  clean_labels.head()

  # Reformat sub-genre to be easier to use
  clean_labels['subgenres'] = clean_labels.subgenres.apply(get_vals)
  clean_labels['subgenres'].head()

  # Analyzes song mp3 for embeddings and add to music_data
  music_data = music_data.map(get_panns_embs, batched=True, batch_size=8)

  # Creates payload with artists, genre, sub-genre, name
  payload = clean_labels.drop(['index'], axis=1).to_dict(orient="records")

  # Adds songs to recommendation systems with vector points and metadata
  client.upsert(
    collection_name={collection_name},
    points=models.Batch(
        ids=music_data['index'],
        vectors=music_data['panns_embeddings'],
        payloads=payload
    )
  )




  