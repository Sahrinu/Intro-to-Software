import { useState, useRef, useEffect } from 'react';
import { assistantAPI } from '../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const Assistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setLoading(true);

    try {
      const response = await assistantAPI.chat(message);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.response },
      ]);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry, I encountered an error: ${error.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header" style={{ justifyContent: 'center' }}>
        <h2>AI Campus Assistant</h2>
      </div>
      <div className="assistant-container">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-message assistant">
              <div className="chat-message-header">AI Assistant</div>
              <div>Hello! How can I help you today?</div>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`chat-message ${msg.role}`}>
              <div className="chat-message-header">
                {msg.role === 'user' ? 'You' : 'AI Assistant'}
              </div>
              <div>{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="chat-message assistant">
              <div className="chat-message-header">AI Assistant</div>
              <div>Thinking...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input-container">
          <form onSubmit={handleSend}>
            <input
              type="text"
              className="chat-input"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Assistant;


