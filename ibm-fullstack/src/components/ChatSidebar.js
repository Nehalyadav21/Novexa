'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { COLORS } from '@/lib/theme';

export default function ChatSidebar({ chats, activeChatId, onNewChat, onChatSelect }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(true);

  // Update the main content margin when sidebar state changes
  useEffect(() => {
    const mainContent = document.querySelector('[data-main-content]');
    if (mainContent) {
      mainContent.style.marginLeft = isOpen ? '256px' : '64px';
    }
  }, [isOpen]);

  return (
    <div 
      className={`fixed left-0 top-0 h-full text-white transition-all duration-300 border-r z-20 ${isOpen ? 'w-64' : 'w-16'}`}
      style={{ 
        backgroundColor: "#141417",
        borderColor: COLORS.border 
      }}
    >
      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute right-[-12px] top-6 rounded-full p-1 z-30 border hover:opacity-80 transition-opacity"
        style={{ 
          backgroundColor: "#141417",
          borderColor: COLORS.border 
        }}
      >
        <svg
          className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-0' : 'rotate-180'}`}
          fill="white"
          viewBox="0 0 24 24"
        >
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </button>

      {/* Content */}
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center p-4 h-16">
          {isOpen ? (
            <>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-2 overflow-hidden">
                <img 
                  src="/novexa2.png" 
                  alt="Novexa" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span 
                  className="font-bold text-lg bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.secondary})`
                  }}
                >
                  Novexa
                </span>
                <span className="text-xs text-gray-400">AI Agent</span>
              </div>
            </>
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto overflow-hidden">
              <img 
                src="/novexa2.png" 
                alt="Novexa" 
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </div>

        {/* New Chat Button */}
        <div className="mx-2 mt-4 mb-2">
          <button
            onClick={onNewChat}
            className={`flex items-center px-4 py-2 rounded-lg hover:opacity-80 transition-all duration-200 w-full ${!isOpen ? 'justify-center' : ''}`}
            style={{ 
              background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})` 
            }}
            title={!isOpen ? "New Chat" : ""}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            {isOpen && <span className="ml-2">New Chat</span>}
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto mt-4 px-2">
          {chats.map((chat) => (
            <div
              key={chat._id || chat.id}
              onClick={() => onChatSelect && onChatSelect(chat._id || chat.id)}
              className={`flex items-center py-3 px-2 rounded-lg cursor-pointer transition-all duration-200 mb-1 ${
                (chat._id || chat.id) === activeChatId
                  ? 'border'
                  : 'hover:bg-opacity-50'
              } ${!isOpen ? 'justify-center' : ''}`}
              style={{
                backgroundColor: (chat._id || chat.id) === activeChatId 
                  ? `${COLORS.accent}22` 
                  : 'transparent',
                borderColor: (chat._id || chat.id) === activeChatId 
                  ? COLORS.accent 
                  : 'transparent'
              }}
              title={!isOpen ? (chat.title || 'New Chat') : ""}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
              </svg>
              {isOpen && (
                <div className="flex-1 truncate ml-3">
                  <span>{chat.title || 'New Chat'}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* User Profile */}
        {session && (
          <div 
            className="flex items-center p-4 border-t"
            style={{ borderColor: COLORS.border }}
          >
            {isOpen ? (
              <>
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center mr-3 text-white text-sm font-medium"
                  style={{ 
                    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})` 
                  }}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <div className="flex-1 truncate">
                  <div className="font-medium">{session.user.name}</div>
                  <div className="text-sm text-gray-400 truncate">
                    {session.user.email}
                  </div>
                </div>
              </>
            ) : (
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center mx-auto text-white text-sm font-medium"
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.secondary})` 
                }}
                title={session.user.name}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
