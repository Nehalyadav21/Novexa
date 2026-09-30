'use client';

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { COLORS } from '@/lib/theme';

export default function ChatMessage({ message, isAI }) {
  const messageRef = useRef(null);

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [message]);

  return (
    <div
      ref={messageRef}
      className={`flex p-6`}
      style={{ 
        backgroundColor: isAI ? "#141417" : `${COLORS.background}cc`
      }}
    >
      <div className="max-w-4xl mx-auto w-full flex">
        {/* Avatar */}
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center mr-4 flex-shrink-0 overflow-hidden"
          style={{ 
            backgroundColor: isAI ? 'transparent' : `${COLORS.accent}22`,
            border: `1px solid ${isAI ? 'transparent' : COLORS.border}`
          }}
        >
          {isAI ? (
            <img 
              src="/novexa2.png" 
              alt="Novexa AI" 
              className="w-full h-full object-contain"
            />
          ) : (
            <div 
              className="w-full h-full rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{ 
                background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})`
              }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1 overflow-hidden">
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
