import React from 'react';
import type { Message } from '../types/index';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isAI = message.role === 'assistant';

  return (
    <div className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-4 animate-fade-in`}>
      <div className={`flex max-w-[80%] ${isAI ? 'flex-row' : 'flex-row-reverse'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isAI ? 'mr-3' : 'ml-3'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isAI ? 'bg-indigo-500' : 'bg-gray-400'
          }`}>
            {isAI ? (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
        </div>

        {/* Message Bubble */}
        <div>
          <div className={`text-xs mb-1 ${isAI ? 'text-left' : 'text-right'} text-gray-500`}>
            {isAI ? 'AIインタビュアー' : 'あなた'}
          </div>
          <div className={`rounded-2xl px-4 py-3 ${
            isAI
              ? 'bg-white border border-gray-200 text-gray-800'
              : 'bg-indigo-600 text-white'
          }`}>
            <p className="whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
