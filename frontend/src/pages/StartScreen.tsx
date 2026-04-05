import React, { useState, useEffect } from 'react';
import type { SessionHistory, AnalysisResult, InterviewTheme } from '../types/index';
import { api } from '../services/api';
import { sampleData } from '../data/sampleData';
import { sampleDataJobChange } from '../data/sampleDataJobChange';

interface StartScreenProps {
  onStart: (theme: InterviewTheme) => void;
  onViewHistory: (sessionId: string) => void;
  onViewSample: (data: AnalysisResult) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, onViewHistory, onViewSample }) => {
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<InterviewTheme>('life-meaning');

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

  const getThemeLabel = (theme: InterviewTheme) => {
    return theme === 'life-meaning' ? '生きがい・人生の意味' : '転職理由';
  };

  const themeContent = {
    'life-meaning': {
      title: '生きがい・人生の意味',
      description: 'このインタビューでは、あなたの「人生において意味や生きがいを感じる活動や経験」について、AIが質問形式でお話を伺います。',
    },
    'job-change': {
      title: '転職理由',
      description: 'このインタビューでは、転職を考えている理由や、転職に至った経緯について、AIが質問形式でお話を伺います。本質的な動機を整理するお手伝いをします。',
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 md:p-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            AIインタビュー
          </h1>
          <h2 className="text-xl text-gray-600">
            {themeContent[selectedTheme].title}
          </h2>
        </div>

        {/* Theme Selection */}
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-4">インタビューテーマを選択</h3>
          <div className="space-y-3">
            <label className="flex items-center p-4 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:border-indigo-300 transition">
              <input
                type="radio"
                name="theme"
                value="life-meaning"
                checked={selectedTheme === 'life-meaning'}
                onChange={() => setSelectedTheme('life-meaning')}
                className="w-4 h-4 text-indigo-600"
              />
              <span className="ml-3 text-gray-700 font-medium">生きがい・人生の意味</span>
            </label>
            <label className="flex items-center p-4 bg-white rounded-lg border-2 border-gray-200 cursor-pointer hover:border-indigo-300 transition">
              <input
                type="radio"
                name="theme"
                value="job-change"
                checked={selectedTheme === 'job-change'}
                onChange={() => setSelectedTheme('job-change')}
                className="w-4 h-4 text-indigo-600"
              />
              <span className="ml-3 text-gray-700 font-medium">転職理由</span>
            </label>
          </div>
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
              {themeContent[selectedTheme].description}
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

        <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg mb-6">
          <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            サンプルデータを見る
          </h3>
          <p className="text-gray-700 leading-relaxed mb-3">
            実際のインタビュー結果のサンプルを確認できます。どのような分析が行われるか事前に確認したい方はこちらをご覧ください。
          </p>
          <button
            onClick={() => onViewSample(selectedTheme === 'life-meaning' ? sampleData : sampleDataJobChange)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md"
          >
            サンプル分析結果を見る（{themeContent[selectedTheme].title}）
          </button>
        </div>

        <button
          onClick={() => onStart(selectedTheme)}
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
                        {getThemeLabel(item.theme)} • {item.messageCount}件の回答
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
