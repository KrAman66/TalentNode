import { useState, useEffect } from 'react';
import type { Job } from '../api';
import { toggleJobInteraction } from '../api';

interface Props {
  job: Job;
  saved?: boolean;
  onToggleSave?: () => void;
}

const sourceColors: Record<string, string> = {
  remotive: '#10b981',
  adzuna: '#f59e0b',
};

const sourceLabels: Record<string, string> = {
  remotive: 'Remotive',
  adzuna: 'Adzuna',
};

export default function JobCard({ job, saved, onToggleSave }: Props) {
  const source = job.source ?? 'unknown';
  const color = sourceColors[source] ?? '#6b7280';
  const label = sourceLabels[source] ?? source;

  const [interactions, setInteractions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadInteractions();
  }, [job.id]);

  const loadInteractions = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';
      const token = localStorage.getItem('talentnode_token');
      if (!token) return;

      const res = await fetch(`${API_URL}/api/job-interactions?jobId=${job.id}&source=${source}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const map: Record<string, boolean> = {};
        data.forEach((i: any) => { map[i.type] = true; });
        setInteractions(map);
      }
    } catch {}
  };

  const toggleInteraction = async (type: string) => {
    try {
      const removed = await toggleJobInteraction(job.id, source, type);
      setInteractions(prev => ({ ...prev, [type]: !removed }));
    } catch {}
  };

  return (
    <div className="job-card glass">
      <div className="job-card-header">
        <div>
          <div className="job-title">{job.title}</div>
          <div className="job-company">{job.company}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span
            className="source-badge"
            style={{ background: color + '22', color, border: `1px solid ${color}44` }}
          >
            {label}
          </span>
          {onToggleSave && (
            <button className="save-btn" onClick={onToggleSave} title={saved ? 'Unsave' : 'Save job'}>
              {saved ? '★' : '☆'}
            </button>
          )}
        </div>
      </div>

      <div className="job-interactions">
        <button
          className={`int-btn ${interactions['favorite'] ? 'active' : ''}`}
          onClick={() => toggleInteraction('favorite')}
          title="Favorite"
        >
          {interactions['favorite'] ? '★' : '☆'}
        </button>
        <button
          className={`int-btn ${interactions['liked'] ? 'active' : ''}`}
          onClick={() => toggleInteraction('liked')}
          title="Like"
        >
          ♥
        </button>
        <button
          className={`int-btn ${interactions['disliked'] ? 'active' : ''}`}
          onClick={() => toggleInteraction('disliked')}
          title="Dislike"
        >
          ✕
        </button>
        <button
          className={`int-btn ${interactions['visited'] ? 'active' : ''}`}
          onClick={() => toggleInteraction('visited')}
          title="Mark as visited"
        >
          ✓
        </button>
      </div>

      {job.location && <div className="job-meta">📍 {job.location}</div>}
      {job.description && <div className="job-desc">{job.description}</div>}
      <div className="job-card-footer">
        {job.postedAt && <span className="job-posted">{job.postedAt}</span>}
        {job.url && (
          <a href={job.url} target="_blank" rel="noreferrer" className="job-link">
            View →
          </a>
        )}
      </div>
    </div>
  );
}
