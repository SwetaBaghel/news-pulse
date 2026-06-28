'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const API = 'http://localhost:5000';
const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];

interface Cluster { id: number; label: string; start: string; end: string; article_count: number; size: number; }
interface Article { title: string; source: string; published_at: string; link: string; summary: string; }
interface ClusterDetail { label: string; articles: Article[]; }

export default function Home() {
  const [timeline, setTimeline] = useState<Cluster[]>([]);
  const [selected, setSelected] = useState<ClusterDetail | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => { fetchTimeline(); }, []);

  async function fetchTimeline() {
    const res = await fetch(`${API}/timeline`);
    const data = await res.json();
    setTimeline(data);
  }

  async function openCluster(id: number) {
    const res = await fetch(`${API}/clusters/${id}`);
    const data = await res.json();
    setSelected(data);
    const srcs = [...new Set(data.articles.map((a: Article) => a.source))] as string[];
    setSources(srcs);
    setActiveSources(srcs);
  }

  function toggleSource(src: string) {
    setActiveSources(prev => prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]);
  }

  async function handleRefresh() {
    setRefreshing(true);
    setStatus('Starting...');
    const res = await fetch(`${API}/ingest/trigger`, { method: 'POST' });
    const { jobId } = await res.json();
    const poll = setInterval(async () => {
      const s = await fetch(`${API}/ingest/status/${jobId}`);
      const j = await s.json();
      setStatus(j.status);
      if (j.status === 'done') {
        clearInterval(poll);
        setRefreshing(false);
        fetchTimeline();
        setStatus('');
      }
    }, 2000);
  }

  const filtered = selected
    ? { ...selected, articles: selected.articles.filter(a => activeSources.includes(a.source)) }
    : null;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-indigo-400">News Pulse</h1>
            <p className="text-gray-400 mt-1">Topic-clustered news timeline</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 rounded-lg font-medium transition"
          >
            {refreshing ? `${status}` : 'Refresh Data'}
          </button>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-200">Timeline</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={timeline} layout="vertical" margin={{ left: 160 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" width={155} tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8 }}
                formatter={(val: unknown) => [`${val} articles`, 'Count']}
              />
              <Bar dataKey="article_count" radius={[0, 6, 6, 0]} onClick={(d) => d.id !== undefined && openCluster(Number(d.id))}>
                {timeline.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} cursor="pointer" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-gray-500 text-sm mt-2">Click a bar to see articles</p>
        </div>

        {filtered && (
          <div className="bg-gray-900 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-indigo-300">{filtered.label}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white">X</button>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              {sources.map(src => (
                <button
                  key={src}
                  onClick={() => toggleSource(src)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                    activeSources.includes(src) ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filtered.articles.map((a, i) => (
                <div key={i} className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <a href={a.link} target="_blank" rel="noopener noreferrer"
                        className="font-medium text-white hover:text-indigo-300">
                        {a.title}
                      </a>
                      <p className="text-gray-400 text-sm mt-1">{a.summary}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-1 rounded">{a.source}</span>
                      <p className="text-gray-500 text-xs mt-1">{new Date(a.published_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}