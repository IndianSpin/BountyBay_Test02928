'use client';

import { useState } from 'react';
import type { TimelineItem } from './types';

/**
 * ChatPanel (canvas v1): the last-message speech bubble beside the
 * opponent plus the always-visible talk strip (desktop keeps the input
 * row inline — an E2E contract; mobile collapses to the bubble + round
 * chat button). Chat numbers remain non-binding and visually distinct
 * from formal offers.
 */
export default function ChatPanel({
  timeline,
  messages,
  unread,
  onSend,
  onSeen,
  disabled,
  inputValue,
  onInputChange,
}: {
  timeline: TimelineItem[];
  messages: { actor: 'me' | 'opponent'; text: string }[];
  unread: number;
  onSend: () => void;
  onSeen: () => void;
  disabled: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const last = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <aside className="chat-panel lm-chat-panel" aria-label="market talk" data-testid="chat-panel">
      {/* the round chat button (board LMR-D-01): toggles the talk strip */}
      <button
        type="button"
        className="lm-round-btn lm-round-btn--chat"
        aria-label="Open chat"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((v) => !v)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M4 5h16v11H9l-5 4z" />
        </svg>
      </button>
      {last ? (
        <div className={`lm-chat-bubble ${last.actor === 'me' ? 'lm-chat-bubble--mine' : ''}`}>{last.text}</div>
      ) : (
        <p className="lm-chat-empty">Persuasion lives here. Numbers in chat are not offers.</p>
      )}
      {unread > 0 && (
        <button type="button" className="lm-chat-unread" data-testid="chat-toggle" aria-expanded={false} onClick={onSeen}>
          {unread} new
        </button>
      )}
      <div className="chat-row" hidden={collapsed}>
        <input
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Talk · numbers are not offers"
          maxLength={500}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <button type="button" className="chat-send" onClick={onSend} disabled={disabled || !inputValue.trim()}>
          Send
        </button>
        <button type="button" className="chat-history" onClick={() => setShowHistory((v) => !v)}>
          Log
        </button>
      </div>
      {showHistory && (
        <ol className="timeline" aria-label="match history">
          {timeline.map((item, index) => (
            <li key={index} className={`timeline-item timeline-${item.actor}`}>
              {item.text}
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
