# News Pulse — Topic-Clustered News Timeline

## Architecture Overview
- **Scraper** (Python): Fetches articles from 3 RSS feeds, extracts full text, groups into topic clusters, stores in MongoDB Atlas
- **Backend** (Node.js/Express): REST API serving clusters, articles, and timeline data
- **Frontend** (Next.js/React): Visual timeline with cluster explorer
- **Database**: MongoDB Atlas (free tier)

## News Sources Used
- BBC News — http://feeds.bbci.co.uk/news/rss.xml
- NPR — https://feeds.npr.org/1001/rss.xml
- Reuters — https://feeds.reuters.com/reuters/topNews

## Topic Grouping Approach
Used **keyword-overlap grouping** (Option A):
- Strip stop words from headline + summary
- Compare every pair of articles by shared meaningful words
- If overlap >= 3 words → same cluster
- Cluster label = top 3 shared keywords

**Why this approach:** Simple, reliable, no ML dependencies needed. Works well for news articles that repeat key terms.

**Threshold chosen:** 3 shared words — low enough to catch related stories, high enough to avoid false groupings.

**One limitation:** Single-word topics (e.g. "earthquake") may not cluster well if articles use different vocabulary ("tremor", "seismic"). TF-IDF would handle synonyms better.

## Setup Instructions

### Prerequisites
- Python 3.12+
- Node.js 18+
- MongoDB Atlas account

### 1. Scraper (Python)
```bash
cd scraper
python -m venv venv
venv\Scripts\activate
pip install feedparser newspaper3k requests python-dotenv pymongo
# Create .env with MONGO_URI=your_connection_string
python scraper.py   # fetch articles
python grouper.py   # group into clusters
```

### 2. Backend (Node.js)
```bash
cd backend
npm install
# Create .env with MONGO_URI and PORT=5000
node index.js
```

### 3. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

## Deployment
- **Frontend**: Vercel
- **Backend**: Render
- **Database**: MongoDB Atlas
- **Python pipeline**: Triggered on-demand via POST /ingest/trigger from the Node API

## API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| /clusters | GET | List all clusters |
| /clusters/:id | GET | Cluster detail with articles |
| /timeline | GET | Timeline data for charting |
| /ingest/trigger | POST | Trigger scrape + group pipeline |
| /ingest/status/:jobId | GET | Poll job status |