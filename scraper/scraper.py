import feedparser
import requests
from newspaper import Article
from datetime import datetime
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
client = MongoClient(os.getenv("MONGO_URI"))
db = client["newspulse"]
articles_collection = db["articles"]

# 3 RSS feeds
RSS_FEEDS = [
    {"source": "BBC", "url": "http://feeds.bbci.co.uk/news/rss.xml"},
    {"source": "NPR", "url": "https://feeds.npr.org/1001/rss.xml"},
    {"source": "Reuters", "url": "https://feeds.reuters.com/reuters/topNews"},
]

def fetch_full_text(url):
    try:
        article = Article(url)
        article.download()
        article.parse()
        return article.text
    except:
        return ""

def scrape_all_feeds():
    for feed_info in RSS_FEEDS:
        print(f"Fetching {feed_info['source']}...")
        feed = feedparser.parse(feed_info["url"])

        for entry in feed.entries[:10]:  # 10 articles per source
            title = entry.get("title", "")
            summary = entry.get("summary", entry.get("description", ""))
            link = entry.get("link", "")
            
            # Skip if already in DB
            if articles_collection.find_one({"link": link}):
                continue

            # Try to get published date
            try:
                pub_date = datetime(*entry.published_parsed[:6])
            except:
                pub_date = datetime.utcnow()

            full_text = fetch_full_text(link)

            article_doc = {
                "title": title,
                "summary": summary,
                "full_text": full_text,
                "link": link,
                "source": feed_info["source"],
                "published_at": pub_date,
                "cluster_id": None,
                "cluster_label": None,
            }

            articles_collection.insert_one(article_doc)
            print(f"  Saved: {title[:60]}")

    print("Scraping done!")

if __name__ == "__main__":
    scrape_all_feeds()