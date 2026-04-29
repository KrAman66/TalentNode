import type { ChatMessage, Job } from "../api";
import SkeletonLoader from "./SkeletonLoader";
import JobCard from "./JobCard";

interface Props {
  messages: (ChatMessage & { jobs?: Job[]; streaming?: boolean })[];
  loading: boolean;
}

export default function MessageList({ messages, loading }: Props) {
  return (
    <div className="message-list">
      {messages.map((msg, i) => (
        <div key={i} className={`message ${msg.role}`}>
          <div className="message-role">
            {msg.role === "user" ? "You" : "TalentNode"}
          </div>
          {msg.content && (
            <div className="message-content">{msg.content}{msg.streaming && <span className="cursor">|</span>}</div>
          )}
          {msg.jobs?.length ? (
            <div className="job-list">
              {msg.jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          ) : null}
        </div>
      ))}
      {loading && <SkeletonLoader />}
    </div>
  );
}
