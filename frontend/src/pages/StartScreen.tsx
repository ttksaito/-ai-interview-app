import React, { useState, useEffect } from 'react';
import type { SessionHistory } from '../types/index';
import { api } from '../services/api';

interface StartScreenProps {
  onStart: () => void;
  onViewHistory: (sessionId: string) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, onViewHistory }) => {
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await api.getHistory();
        setHistory(data);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            生きがい・人生の意味
          </h1>
          <h2 className="text-xl text-gray-600">
            AIインタビュー
          </h2>
        </div>

        <div className="space-y-6 mb-8">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              インタビューについて
            </h3>
            <p className="text-gray-700 leading-relaxed">
              このインタビューでは、あなたの<span className="font-semibold">「人生において意味や生きがいを感じる活動や経験」</span>について、
              AIが質問形式でお話を伺います。
            </p>
          </div>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              安心してご回答ください
            </h3>
            <ul className="text-gray-700 leading-relaxed space-y-2">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>AIは<span className="font-semibold">批判的な質問</span>はしません</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>同じ質問を繰り返しません</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><span className="font-semibold">素直な気持ち</span>でお答えください</span>
              </li>
            </ul>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <svg className="w-5 h-5 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              所要時間
            </h3>
            <p className="text-gray-700 leading-relaxed">
              約15〜20の質問を通じて、深くお話を伺います。<br />
              途中で中断することもできます。
            </p>
          </div>
        </div>

        <button
          onClick={onStart}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-8 rounded-lg transition duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
        >
          インタビューを開始する
        </button>

        {/* History Section */}
        {!isLoadingHistory && history.length > 0 && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">過去のインタビュー</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {history.map((item) => (
                <button
                  key={item.sessionId}
                  onClick={() => item.isAnalyzed && onViewHistory(item.sessionId)}
                  disabled={!item.isAnalyzed}
                  className={`w-full text-left p-4 rounded-lg border transition duration-200 ${
                    item.isAnalyzed
                      ? 'border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer'
                      : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(item.createdAt)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.messageCount}件の回答
                        {item.isAnalyzed ? ' • 分析済み' : ' • 未分析'}
                      </p>
                    </div>
                    {item.isAnalyzed && (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StartScreen;
