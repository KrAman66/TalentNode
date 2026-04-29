interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  url?: string;
  postedAt?: string;
}

interface Props {
  job: Job;
  saved?: boolean;
  onToggleSave?: () => void;
}

export default function JobCard({ job, saved, onToggleSave }: Props) {
  return (
    <div className="job-card glass">
      <div className="job-card-header">
        <div>
          <div className="job-title">{job.title}</div>
          <div className="job-company">{job.company}</div>
        </div>
        {onToggleSave && (
          <button className="save-btn" onClick={onToggleSave} title={saved ? 'Unsave' : 'Save job'}>
            {saved ? '★' : '☆'}
          </button>
        )}
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
