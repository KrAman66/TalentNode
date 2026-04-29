import { useState, useRef, useEffect } from "react";
import { sendMessage, type ChatMessage, type Job } from "./api";
import ChatInput from "./components/ChatInput";
import MessageList from "./components/MessageList";
import "./App.css";

type MessageWithJobs = ChatMessage & { jobs?: Job[]; streaming?: boolean };

function App() {
  const [messages, setMessages] = useState<MessageWithJobs[]>([
    {
      role: "assistant",
      content: "Hi! I'm TalentNode. Ask me to find jobs for you.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text: string) => {
    const userMsg: MessageWithJobs = { role: "user", content: text };
    const newMessages: MessageWithJobs[] = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);
    setError(null);

    // Add a placeholder assistant message for streaming
    const assistantMsg: MessageWithJobs = { role: "assistant", content: "", streaming: true };
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
              updated[idx] = { ...last, streaming: false, jobs: jobs ?? undefined };
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
              updated[idx] = { ...last, content: `(error: ${err})`, streaming: false };
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

  return (
    <div className="app">
      <header className="app-header glass">
        <h1>TalentNode</h1>
        <p>AI-powered job search</p>
      </header>

      <main className="chat-container glass">
        <MessageList messages={messages} loading={loading} />
        <div ref={bottomRef} />
      </main>

      {error && <div className="error-bar">{error}</div>}

      <footer className="chat-input-area">
        <ChatInput onSend={handleSend} disabled={loading} />
      </footer>
    </div>
  );
}

export default App;
