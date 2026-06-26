const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected!'))
  .catch(err => console.log(err));

// Schemas
const articleSchema = new mongoose.Schema({}, { strict: false });
const clusterSchema = new mongoose.Schema({}, { strict: false });

const Article = mongoose.model('Article', articleSchema, 'articles');
const Cluster = mongoose.model('Cluster', clusterSchema, 'clusters');

// Job store (in-memory)
const jobs = {};

// GET /clusters
app.get('/clusters', async (req, res) => {
  try {
    const clusters = await Cluster.find({});
    res.json(clusters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /clusters/:id
app.get('/clusters/:id', async (req, res) => {
  try {
    const cluster = await Cluster.findOne({ cluster_id: parseInt(req.params.id) });
    if (!cluster) return res.status(404).json({ error: 'Cluster not found' });

    const articles = await Article.find({
      _id: { $in: cluster.article_ids.map(id => new mongoose.Types.ObjectId(id)) }
    }).sort({ published_at: 1 });

    res.json({ ...cluster.toObject(), articles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /timeline
app.get('/timeline', async (req, res) => {
  try {
    const clusters = await Cluster.find({});
    const timeline = clusters.map(c => ({
      id: c.cluster_id,
      label: c.label,
      start: c.start_time,
      end: c.end_time,
      article_count: c.article_count,
      size: c.article_count,
    }));
    res.json(timeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /ingest/trigger
app.post('/ingest/trigger', (req, res) => {
  const jobId = uuidv4();
  jobs[jobId] = { status: 'running', started_at: new Date() };

  const python = spawn('python', [
    'C:\\Users\\OWNER\\news-pulse\\scraper\\scraper\\scraper.py'
  ]);

  python.on('close', (code) => {
    const grouper = spawn('python', [
      'C:\\Users\\OWNER\\news-pulse\\scraper\\scraper\\grouper.py'
    ]);
    grouper.on('close', () => {
      jobs[jobId] = { status: 'done', finished_at: new Date() };
    });
  });

  res.json({ jobId });
});

// GET /ingest/status/:jobId
app.get('/ingest/status/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json(job);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));