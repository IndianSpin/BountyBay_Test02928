'use client';

import { useEffect, useState } from 'react';
import type { TimelineItem } from './types';

/**
 * ChatPanel (BB-216, founder D-26): the opponent IS the conversation; the
 * chat box is only the mechanism. Three levels —
 *   Level 1 · Ambient: the latest message lives NEXT TO the character as
 *     a speech bubble and fades into history after ~6 s; the Talk button
 *     stays available.
 *   Level 2 · Compose: the compact composer (one row, ≈48–56 px core)
 *     with quick negotiation prompts. Visible by default on desktop
 *     (friend-match E2E fills `.chat-row input` directly — a contract);
 *     Talk toggles it closed. Mobile opens it as a bottom sheet instead.
 *   Level 3 · History: the Log control expands the full transcript
 *     inside the sheet.
 * Quick prompts are sent as ordinary chat messages (COMM stays
 * mechanically separate from FORMAL OFFER — GR-025 territory); they read
 * as character dialogue, not system messages. The permanent
 * instructional sentence is gone — a subtle placeholder teaches instead.
 */

const QUICK_PROMPTS = [
  'Why?',
  'Too far.',
  "I'm holding.",
  'You need to move.',
  "We're close.",
  'Is that final?',
  'What would get this done?',
];

const BUBBLE_FADE_MS = 6000;

export default function ChatPanel({
  timeline,
  messages,
  unread,
  onSend,
  onSeen,
  disabled,
  inputValue,
  onInputChange,
  opponentName,
}: {
  timeline: TimelineItem[];
  messages: { actor: 'me' | 'opponent'; text: string }[];
  unread: number;
  onSend: (text?: string) => void;
  onSeen: () => void;
  disabled: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  opponentName?: string;
}) {
  // Desktop keeps the compact composer visible (E2E contract); mobile
  // defaults to ambient and opens a bottom sheet on Talk.
  const [composeOpen, setComposeOpen] = useState<boolean>(() =>
    typeof window === 'undefined' ? true : window.matchMedia('(min-width: 781px)').matches,
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [faded, setFaded] = useState(false);

  const last = messages.length > 0 ? messages[messages.length - 1]! : null;
  const lastKey = messages.length > 0 ? `${messages.length}:${last!.text}` : '';

  // D-26: the latest message fades into history after ~6 s.
  useEffect(() => {
    if (last === null) return;
    setFaded(false);
    const timer = setTimeout(() => setFaded(true), BUBBLE_FADE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastKey]);

  function send(text?: string): void {
    onSend(text);
    setComposeOpen(false);
    setHistoryOpen(false);
  }

  const placeholder = opponentName !== undefined && opponentName !== '' ? `Talk to ${opponentName}…` : 'Talk to your opponent…';

  return (
    <aside className="chat-panel lm-chat-panel" aria-label="market talk" data-testid="chat-panel">
      {/* Level 1 · ambient: the conversation lives with the character */}
      {last !== null && (
        <div
          key={lastKey}
          className={`lm-chat-bubble ${last.actor === 'me' ? 'lm-chat-bubble--mine' : ''} ${faded ? 'lm-chat-bubble--fade' : ''}`}
        >
          {last.text}
        </div>
      )}
      {unread > 0 && (
        <button type="button" className="lm-chat-unread" data-testid="chat-toggle" aria-expanded={false} onClick={onSeen}>
          {unread} new
        </button>
      )}
      <button
        type="button"
        className="lm-round-btn lm-round-btn--chat"
        aria-label="Open chat"
        aria-expanded={composeOpen}
        onClick={() => setComposeOpen((v) => !v)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M4 5h16v11H9l-5 4z" />
        </svg>
      </button>

      {/* Level 2 · compose (+ Level 3 · history) */}
      {composeOpen && (
        <div className="lm-chat-sheet" role="dialog" aria-label="Talk to your opponent">
          <div className="lm-chat-sheet__prompts">
            {QUICK_PROMPTS.map((prompt) => (
              <button key={prompt} type="button" className="lm-chat-sheet__prompt" disabled={disabled} onClick={() => send(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
          <div className="lm-chat-sheet__row chat-row">
            <input
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={placeholder}
              maxLength={500}
              disabled={disabled}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button type="button" className="lm-chat-sheet__send chat-send" onClick={() => send()} disabled={disabled || !inputValue.trim()}>
              Send
            </button>
            <button type="button" className="lm-chat-sheet__log" onClick={() => setHistoryOpen((v) => !v)} aria-expanded={historyOpen}>
              Log
            </button>
          </div>
          {historyOpen && (
            <ol className="timeline" aria-label="match history">
              {timeline.map((item, index) => (
                <li key={index} className={`timeline-item timeline-${item.actor}`}>
                  {item.text}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </aside>
  );
}
