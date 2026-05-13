import { useState, useEffect } from "react";
import { getSavedJobs, unsaveJob } from "./api";
import JobCard from "./components/JobCard";
import "./App.css";

type SavedJobWithId = {
  id: string;
  externalId: string;
  title: string;
  company: string;
  location: string | null;
  source: string;
  url?: string;
};

export default function SavedJobs() {
  const [savedJobs, setSavedJobs] = useState<SavedJobWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSavedJobs();
  }, []);

  const loadSavedJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSavedJobs();
      const jobs: SavedJobWithId[] = data.map((j: any) => ({
        id: j.id,
        externalId: j.externalId,
        title: j.title,
        company: j.company,
        location: j.location,
        source: j.source,
        url: j.jobData?.url,
      }));
      setSavedJobs(jobs);
    } catch (err: any) {
      setError(err.message ?? "Failed to load saved jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (savedJobId: string) => {
    try {
      await unsaveJob(savedJobId);
      setSavedJobs((prev) => prev.filter((j) => j.id !== savedJobId));
    } catch (err: any) {
      setError(err.message ?? "Failed to unsave job");
    }
  };

  if (loading) {
    return (
      <div className="glass" style={{ padding: "20px" }}>
        Loading saved jobs...
      </div>
    );
  }

  if (error) {
    return <div className="error-bar">{error}</div>;
  }

  if (savedJobs.length === 0) {
    return (
      <div className="empty-state">
        <h3>No saved jobs yet</h3>
        <p>Save jobs from chat recommendations to view them here.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ margin: "0 0 16px 0" }}>Saved Jobs ({savedJobs.length})</h2>
      <div className="job-list">
        {savedJobs.map((job) => (
          <JobCard
            key={job.id}
            job={{
              id: job.externalId,
              title: job.title,
              company: job.company,
              location: job.location ?? undefined,
              url: job.url,
              source: job.source,
            }}
            saved
            onToggleSave={() => handleUnsave(job.id)}
          />
        ))}
      </div>
    </div>
  );
}
