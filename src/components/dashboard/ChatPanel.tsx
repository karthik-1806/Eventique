'use client';

import { useState, useRef, useEffect } from 'react';
import { useEventContext } from '@/context/EventContext';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage } from '@/lib/models/types';
import styles from './panels.module.css';

interface ChatPanelProps {
  onClose: () => void;
}

const QUICK_PROMPTS = [
  'How can I reduce catering costs without hurting guest experience?',
  'What are my highest priority tasks right now?',
  'Draft questions to ask the venue coordinator before signing.',
  'What emergency contingency plan should I have for weather?',
];

export default function ChatPanel({ onClose }: ChatPanelProps) {
  const { state, dispatch, getEventContext } = useEventContext();
  const { currentPlan } = state;
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatMessages = currentPlan?.chat ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, isSending]);

  if (!currentPlan) return null;

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMessage });
    setInput('');
    setIsSending(true);

    try {
      const ctx = getEventContext();
      if (!ctx) throw new Error('No event context found');

      // Prepare context with active categories & vendors for grounding
      const enrichedContext = {
        ...ctx,
        currentBudgetCategories: currentPlan.budget.categories.map((c) => ({
          name: c.name,
          allocated: c.allocated,
        })),
        currentVendors: currentPlan.vendors.map((v) => ({
          category: v.category,
          status: v.status,
        })),
      };

      const history = chatMessages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          eventContext: enrichedContext,
          conversationHistory: history,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await res.json();
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: data.message || 'I have analyzed your request based on your event plan.',
        timestamp: new Date().toISOString(),
      };

      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: assistantMessage });
    } catch (err) {
      console.error('[Chat Error]:', err);
      const fallbackMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `I'm having difficulty reaching the AI service right now. However, looking at your plan for ${currentPlan.event.name}: you have ${currentPlan.tasks.filter((t) => t.status !== 'completed').length} pending tasks and ${currentPlan.budget.categories.length} budget categories allocated. Please check your network or try again shortly.`,
        timestamp: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: fallbackMessage });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className={styles.chatContainer} role="region" aria-label="AI Event Planning Assistant Chat">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-bg-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: '1.25rem' }} aria-hidden="true">🤖</span>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>AI Planning Assistant</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Context: {currentPlan.event.name}
            </div>
          </div>
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={onClose}
          aria-label="Close chat"
          style={{ padding: '4px 8px' }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className={styles.chatMessages} role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation messages">
        {chatMessages.length === 0 ? (
          <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>💡</span>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '6px' }}>
              Ask anything about your plan
            </p>
            <p style={{ fontSize: '0.75rem', marginBottom: '16px' }}>
              I know your budget, tasks, timeline, and vendors. Try one of these questions:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  className="btn btn-secondary btn-sm"
                  style={{
                    fontSize: '0.75rem',
                    textAlign: 'left',
                    padding: '8px 12px',
                    whiteSpace: 'normal',
                    lineHeight: 1.4,
                  }}
                  onClick={() => sendMessage(qp)}
                >
                  {qp}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`${styles.chatMessage} ${isUser ? styles.chatMessageUser : ''}`}
              >
                <div className={styles.chatAvatar} aria-hidden="true">
                  {isUser ? '👤' : '✦'}
                </div>
                <div
                  className={`${styles.chatBubble} ${
                    isUser ? styles.chatBubbleUser : styles.chatBubbleAssistant
                  }`}
                >
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  <div
                    style={{
                      fontSize: '0.65rem',
                      color: 'var(--color-text-muted)',
                      marginTop: '4px',
                      textAlign: isUser ? 'right' : 'left',
                    }}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isSending && (
          <div className={styles.chatMessage} role="status" aria-live="polite">
            <div className={styles.chatAvatar} aria-hidden="true">
              ✦
            </div>
            <div className={`${styles.chatBubble} ${styles.chatBubbleAssistant}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="spinner" style={{ width: '14px', height: '14px' }} aria-hidden="true" />
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Analyzing event context & generating response...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts footer bar when chat has started */}
      {chatMessages.length > 0 && (
        <div
          style={{
            padding: '6px 12px',
            background: 'var(--color-bg)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
          }}
        >
          <span className="text-xs text-muted" style={{ alignSelf: 'center', flexShrink: 0 }}>
            Suggest:
          </span>
          {QUICK_PROMPTS.slice(0, 2).map((qp, idx) => (
            <button
              key={idx}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.7rem', padding: '2px 8px', height: 'auto', flexShrink: 0 }}
              onClick={() => sendMessage(qp)}
            >
              {qp.length > 30 ? qp.slice(0, 30) + '...' : qp}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        className={styles.chatInput}
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
      >
        <textarea
          className={styles.chatTextarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or request advice... (Enter to send)"
          rows={1}
          aria-label="Message to AI planner"
          disabled={isSending}
        />
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={!input.trim() || isSending}
          aria-label="Send message"
        >
          Send
        </button>
      </form>
    </div>
  );
}
