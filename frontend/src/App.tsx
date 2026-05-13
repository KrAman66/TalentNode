import { useState, useRef, useEffect } from "react";
import {
  sendMessage,
  type ChatMessage,
  type Job,
  getCurrentUser,
  logout,
  saveJob,
} from "./api";
import ChatInput from "./components/ChatInput";
import MessageList from "./components/MessageList";
import Login from "./components/Login";
import SavedJobs from "./SavedJobs";
import "./App.css";
import { Briefcase, Menu } from "lucide-react";

type MessageWithJobs = ChatMessage & { jobs?: Job[]; streaming?: boolean };

function App() {
  const [user, setUser] = useState(() => getCurrentUser());
  const [messages, setMessages] = useState<MessageWithJobs[]>([
    {
      role: "assistant",
      content: "Hi! I'm TalentNode. Ask me to find jobs for you.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "saved">("chat");
  const [profileOpen, setProfileOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleLogin = (userData: any) => {
    setUser(userData);
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setMessages([
      {
        role: "assistant",
        content: "Hi! I'm TalentNode. Ask me to find jobs for you.",
      },
    ]);
  };

  const handleToggleSave = async (job: Job) => {
    try {
      await saveJob(job);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.jobs) {
            const updatedJobs = msg.jobs.map((j) =>
              j.id === job.id ? { ...j, saved: true } : j,
            );
            return { ...msg, jobs: updatedJobs };
          }
          return msg;
        }),
      );
    } catch (err: any) {
      setError(err.message ?? "Failed to save job");
    }
  };

  const handleSend = async (text: string) => {
    const userMsg: MessageWithJobs = { role: "user", content: text };
    const newMessages: MessageWithJobs[] = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);
    setError(null);

    const assistantMsg: MessageWithJobs = {
      role: "assistant",
      content: "",
      streaming: true,
    };
    setMessages([...newMessages, assistantMsg]);

    try {
      await sendMessage(newMessages, {
        onToken: (token: string) => {
          setMessages((prev) => {
            const updated = [...prev];
            const idx = updated.length - 1;
            const last = updated[idx];
            if (last && last.role === "assistant" && last.streaming) {
              updated[idx] = { ...last, content: last.content + token };
              return updated;
            }
            return prev;
          });
        },
        onDone: (jobs: Job[] | null) => {
          setMessages((prev) => {
            const updated = [...prev];
            const idx = updated.length - 1;
            const last = updated[idx];
            if (last && last.role === "assistant") {
              updated[idx] = {
                ...last,
                streaming: false,
                jobs: jobs ?? undefined,
              };
              return updated;
            }
            return prev;
          });
          setLoading(false);
        },
        onError: (err: string) => {
          setError(err);
          setLoading(false);
          setMessages((prev) => {
            const updated = [...prev];
            const idx = updated.length - 1;
            const last = updated[idx];
            if (last && last.role === "assistant") {
              updated[idx] = {
                ...last,
                content: `(error: ${err})`,
                streaming: false,
              };
              return updated;
            }
            return prev;
          });
        },
      });
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="app">
        <Login onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header glass">
        <div className="header-left">
          <div className="logo-icon">
            <Briefcase size={22} className="icon" />
          </div>

          <div>
            <h1>TalentNode</h1>
            <p>AI-powered job discovery</p>
          </div>
        </div>
        <div className="profile-wrapper">
          <button
            className="profile-btn"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <Menu size={20} className="icon" />
          </button>
          {profileOpen && (
            <div className="profile-dropdown">
              <button
                className="profile-item"
                onClick={() => alert("Profile details not implemented")}
              >
                Profile Details
              </button>
              <button className="profile-item" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <nav className="tab-nav glass">
        <button
          className={activeTab === "chat" ? "active" : ""}
          onClick={() => setActiveTab("chat")}
        >
          Chat
        </button>
        <button
          className={activeTab === "saved" ? "active" : ""}
          onClick={() => setActiveTab("saved")}
        >
          Saved Jobs
        </button>
      </nav>

      <main className="chat-container glass">
        {activeTab === "chat" ? (
          <>
            <MessageList
              messages={messages}
              loading={loading}
              onToggleSave={handleToggleSave}
            />
            <div ref={bottomRef} />
          </>
        ) : (
          <SavedJobs />
        )}
      </main>

      {error && <div className="error-bar">{error}</div>}

      {activeTab === "chat" && (
        <footer className="chat-input-area">
          <ChatInput onSend={handleSend} disabled={loading} />
        </footer>
      )}
    </div>
  );
}

export default App;
