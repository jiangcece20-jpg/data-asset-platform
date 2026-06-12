import { useState, useRef, useEffect, type ReactNode } from 'react';
import './interaction.css';

export type ChatMessage = {
  id: string;
  role: 'ai' | 'user';
  content: ReactNode;
};

type ChatInterfaceProps = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  placeholder?: string;
  header?: ReactNode;
  guides?: string[];
  followUps?: string[];
  typing?: boolean;
  className?: string;
};

export function ChatInterface({
  messages,
  onSend,
  placeholder = '输入你的问题...',
  header,
  guides,
  followUps,
  typing = false,
  className = '',
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  return (
    <div className={`ui-chat ${className}`}>
      {header ? <div className="ui-chat__header">{header}</div> : null}
      <div className="ui-chat__messages">
        {guides && messages.length === 0 ? (
          <div className="ui-chat__guides">
            {guides.map((g) => (
              <button key={g} type="button" className="ui-chat__guide" onClick={() => onSend(g)}>
                {g}
              </button>
            ))}
          </div>
        ) : null}
        {messages.map((msg) => (
          <div key={msg.id} className={`ui-chat__message ui-chat__message--${msg.role}`}>
            <div className={`ui-chat__avatar ui-chat__avatar--${msg.role}`}>
              {msg.role === 'ai' ? 'AI' : 'U'}
            </div>
            <div className="ui-chat__bubble">{msg.content}</div>
          </div>
        ))}
        {typing ? (
          <div className="ui-chat__message ui-chat__message--ai">
            <div className="ui-chat__avatar ui-chat__avatar--ai">AI</div>
            <div className="ui-chat__bubble">
              <div className="ui-chat__typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        ) : null}
        {followUps && followUps.length > 0 && !typing ? (
          <div className="ui-chat__follow-ups">
            {followUps.map((fu) => (
              <button key={fu} type="button" className="ui-chat__follow-up" onClick={() => onSend(fu)}>
                {fu}
              </button>
            ))}
          </div>
        ) : null}
        <div ref={messagesEndRef} />
      </div>
      <div className="ui-chat__input-area">
        <textarea
          className="ui-chat__input"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          type="button"
          className="ui-chat__send"
          disabled={!input.trim()}
          onClick={handleSend}
          aria-label="发送"
        >
          &#10148;
        </button>
      </div>
    </div>
  );
}
