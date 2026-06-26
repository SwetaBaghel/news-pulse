from pymongo import MongoClient
import os
from dotenv import load_dotenv
from collections import defaultdict
import re

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["newspulse"]
articles_collection = db["articles"]
clusters_collection = db["clusters"]

STOP_WORDS = set([
    "the","a","an","and","or","but","in","on","at","to","for",
    "of","with","by","from","is","was","are","were","be","been",
    "has","have","had","will","would","could","should","may","might",
    "it","its","this","that","these","those","he","she","they","we",
    "his","her","their","our","as","up","about","into","than","more",
    "also","after","before","over","under","new","says","said","say"
])

def get_keywords(text):
    words = re.findall(r'\b[a-z]{4,}\b', text.lower())
    return set(w for w in words if w not in STOP_WORDS)

def group_articles():
    articles = list(articles_collection.find({}))
    print(f"Total articles: {len(articles)}")

    clusters = []
    used = set()

    for i, article in enumerate(articles):
        if i in used:
            continue
        
        text_i = article["title"] + " " + article.get("summary", "")
        keywords_i = get_keywords(text_i)
        
        cluster = [article]
        used.add(i)

        for j, other in enumerate(articles):
            if j in used or j == i:
                continue
            text_j = other["title"] + " " + other.get("summary", "")
            keywords_j = get_keywords(text_j)
            
            overlap = keywords_i & keywords_j
            if len(overlap) >= 3:
                cluster.append(other)
                used.add(j)

        clusters.append(cluster)

    # Save clusters to MongoDB
    clusters_collection.delete_many({})  # clear old clusters
    
    for idx, cluster in enumerate(clusters):
        all_text = " ".join([a["title"] for a in cluster])
        keywords = get_keywords(all_text)
        label = " ".join(list(keywords)[:3]).title()

        times = [a["published_at"] for a in cluster if a.get("published_at")]
        
        cluster_doc = {
            "cluster_id": idx,
            "label": label,
            "article_count": len(cluster),
            "article_ids": [str(a["_id"]) for a in cluster],
            "start_time": min(times) if times else None,
            "end_time": max(times) if times else None,
        }
        clusters_collection.insert_one(cluster_doc)
        print(f"Cluster {idx}: '{label}' — {len(cluster)} articles")

    print(f"\nDone! {len(clusters)} clusters created.")

if __name__ == "__main__":
    group_articles()