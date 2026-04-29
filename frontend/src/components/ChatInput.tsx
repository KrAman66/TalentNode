import { useState } from "react";
import type { FormEvent } from "react";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <form className="chat-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask me to find jobs..."
        disabled={disabled}
        className="chat-input"
        autoFocus
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="chat-send-btn"
      >
        {disabled ? "..." : "Send"}
      </button>
    </form>
  );
}
