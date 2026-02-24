import React, { useState, useRef, useEffect } from 'react';
import type { Message } from '../types/index';
import ChatMessage from '../components/ChatMessage';
import { api } from '../services/api';

interface InterviewScreenProps {
  sessionId: string;
  initialMessage: string;
  onComplete: () => void;
}

const InterviewScreen: React.FC<InterviewScreenProps> = ({
  sessionId,
  initialMessage,
  onComplete,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: initialMessage },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !isActive) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Add user message to UI
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
    };
    setMessages((prev) => [...prev, newUserMessage]);

    setIsLoading(true);

    try {
      const response = await api.sendMessage(sessionId, userMessage);

      // Log API usage cost to console
      if (response.costTracker) {
        const inputCost = (response.costTracker.totalInputTokens * 3.00) / 1_000_000;
        const outputCost = (response.costTracker.totalOutputTokens * 15.00) / 1_000_000;
        const totalCost = inputCost + outputCost;
        console.log('💰 API使用料:', {
          入力トークン: response.costTracker.totalInputTokens.toLocaleString(),
          出力トークン: response.costTracker.totalOutputTokens.toLocaleString(),
          累計コスト: `$${totalCost.toFixed(4)} (約${(totalCost * 150).toFixed(2)}円)`,
        });
      }

      // Add AI response to UI (unless it's an end code)
      if (!response.isEndCode) {
        const aiMessage: Message = {
          role: 'assistant',
          content: response.message,
        };
        setMessages((prev) => [...prev, aiMessage]);
      }

      // Check if interview ended
      if (!response.isActive) {
        setIsActive(false);
        // Auto-navigate to results after a short delay
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('メッセージの送信に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndInterview = async () => {
    if (!confirm('インタビューを終了してもよろしいですか？')) {
      return;
    }

    try {
      await api.endInterview(sessionId);
      setIsActive(false);
      onComplete();
    } catch (error) {
      console.error('Error ending interview:', error);
      alert('インタビューの終了に失敗しました。');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Command+Enter (Mac) or Ctrl+Enter (Windows/Linux) to send
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">AIインタビュー</h1>
            <p className="text-sm text-gray-500">生きがい・人生の意味</p>
          </div>
          <button
            onClick={handleEndInterview}
            disabled={!isActive}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-lg transition duration-200 text-sm font-medium"
          >
            中断する
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          {isActive ? (
            <>
              <div className="flex items-end space-x-3">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="メッセージを入力..."
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  style={{ maxHeight: '120px' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition duration-200 font-medium"
                >
                  送信
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                ⌘ Command + Enter で送信
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-3">インタビューが終了しました</p>
              <p className="text-sm text-gray-500">分析結果画面に移動します...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewScreen;
