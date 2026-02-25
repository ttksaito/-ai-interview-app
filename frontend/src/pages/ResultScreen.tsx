import React, { useState, useEffect, useRef } from 'react';
import type { AnalysisResult } from '../types/index';
import CategoryTable from '../components/CategoryTable';
import { api } from '../services/api';

interface ResultScreenProps {
  sessionId: string;
  onRestart: () => void;
}

const ResultScreen: React.FC<ResultScreenProps> = ({ sessionId, onRestart }) => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedText, setHighlightedText] = useState<string | null>(null);
  const [isTranscriptVisible, setIsTranscriptVisible] = useState(true);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setIsLoading(true);

        // Poll for analysis result (it may still be processing in background)
        let result;
        let attempts = 0;
        const maxAttempts = 30; // Poll for up to 30 seconds

        while (attempts < maxAttempts) {
          try {
            result = await api.getSessionResult(sessionId);
            // If we got a result, break out of the loop
            break;
          } catch (sessionErr) {
            // Analysis not ready yet, wait and try again
            if (attempts === 0) {
              console.log('Analysis not ready yet, polling...');
            }

            attempts++;

            if (attempts >= maxAttempts) {
              // If polling failed, try to start analysis ourselves
              console.log('Polling timeout, starting analysis manually...');
              try {
                result = await api.analyzeInterview(sessionId);
              } catch (analyzeErr: any) {
                // Check if it's a timeout error
                if (analyzeErr.message?.includes('timeout') || analyzeErr.message?.includes('timed out')) {
                  setError('分析に時間がかかりすぎています。インタビューが長すぎる可能性があります。もう一度お試しいただくか、短いインタビューで試してみてください。');
                } else {
                  setError('分析の実行に失敗しました。もう一度お試しください。');
                }
                setIsLoading(false);
                return;
              }
              break;
            }

            // Wait 1 second before next poll
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        // Fetch chat history for LINE-style display
        if (result) {
          try {
            const { chatHistory } = await api.getTranscript(sessionId);
            result.messages = chatHistory;
          } catch (err) {
            console.error('Error fetching chat history:', err);
          }

          setAnalysisResult(result);
        } else {
          setError('分析結果が取得できませんでした。');
        }
      } catch (err) {
        console.error('Error fetching analysis:', err);
        setError('分析結果の取得に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysis();
  }, [sessionId]);

  const handleEvidenceClick = (evidence: string) => {
    // Remove all formatting markers to get clean text
    const cleanText = evidence
      .replace(/【「(.+?)」と発言[^】]*】/g, '$1')
      .replace(/【「(.+?)」】/g, '$1')
      .replace(/「(.+?)」/g, '$1')
      .replace(/【(.+?)】/g, '$1');

    if (!cleanText || cleanText === '言及なし' || !analysisResult?.messages) {
      return;
    }

    setHighlightedText(cleanText);

    // Find the message containing the text and scroll to it (skip first message)
    const messagesToSearch = analysisResult.messages.slice(1);
    const messageIndex = messagesToSearch.findIndex((msg) =>
      msg.content.includes(cleanText)
    );

    if (messageIndex !== -1 && transcriptRef.current) {
      // Find the corresponding message element
      const messageElements = transcriptRef.current.querySelectorAll('[data-message-index]');
      const targetElement = messageElements[messageIndex] as HTMLElement;

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }

    // Clear highlight after a few seconds
    setTimeout(() => {
      setHighlightedText(null);
    }, 3000);
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">分析中...</p>
          <p className="text-sm text-gray-500 mt-2">AIがインタビュー結果を分析しています</p>
          <p className="text-xs text-gray-400 mt-3">メッセージごとに詳細に分析しているため、少し時間がかかります</p>
        </div>
      </div>
    );
  }

  if (error || !analysisResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">エラーが発生しました</h2>
          <p className="text-gray-600 mb-6">{error || '分析結果を取得できませんでした。'}</p>
          <button
            onClick={onRestart}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition duration-200"
          >
            最初に戻る
          </button>
        </div>
      </div>
    );
  }

  const renderTranscriptWithHighlight = () => {
    if (!analysisResult?.messages || analysisResult.messages.length === 0) {
      return <p className="text-gray-500 text-sm">トランスクリプトがありません</p>;
    }

    // Skip the first message if it's the initial prompt
    const messagesToDisplay = analysisResult.messages.slice(1);

    return (
      <div className="space-y-4">
        {messagesToDisplay.map((message, index) => {
          const isAssistant = message.role === 'assistant';
          const shouldHighlight = highlightedText && message.content.includes(highlightedText);

          return (
            <div
              key={index}
              data-message-index={index}
              className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`flex gap-2 max-w-[80%] ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}>
                {/* Avatar - only show for AI */}
                {isAssistant && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-semibold">
                    AI
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`rounded-lg px-4 py-2 ${
                  isAssistant
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-green-500 text-white'
                }`}>
                  {shouldHighlight ? (
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content.split(highlightedText!).map((part, i, arr) => (
                        <React.Fragment key={i}>
                          {part}
                          {i < arr.length - 1 && (
                            <span className="bg-yellow-200 font-semibold text-gray-900 px-1 rounded">
                              {highlightedText}
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </p>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 shadow-sm flex-shrink-0">
        <div className="max-w-full mx-auto px-2">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">分析結果</h1>
              <p className="text-sm text-gray-600 mt-1">インタビュー内容の評価</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsTranscriptVisible(!isTranscriptVisible)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition duration-200 flex items-center gap-2"
              >
                {isTranscriptVisible ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    非表示
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    表示
                  </>
                )}
              </button>
              <button
                onClick={onRestart}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition duration-200"
              >
                新しいインタビューを開始
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Horizontal Split */}
      <div className="flex-1 flex min-h-0">
        {/* Left Side - Interview Transcript */}
        {isTranscriptVisible && (
          <div className="w-1/3 flex flex-col bg-white border-r border-gray-200 shadow-sm">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-800">インタビュー内容</h3>
            </div>
            <div
              ref={transcriptRef}
              className="flex-1 overflow-y-auto px-6 py-4"
            >
              {renderTranscriptWithHighlight()}
            </div>
          </div>
        )}

        {/* Right Side - Category Tables */}
        <div className={`flex-1 overflow-y-auto p-4 md:p-6 ${isTranscriptVisible ? '' : 'max-w-6xl mx-auto w-full'}`}>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">カテゴリ別評価</h2>
          <CategoryTable
            categoryId="A"
            category={analysisResult.categories.A}
            onEvidenceClick={handleEvidenceClick}
          />
          <CategoryTable
            categoryId="B"
            category={analysisResult.categories.B}
            onEvidenceClick={handleEvidenceClick}
          />
          <CategoryTable
            categoryId="C"
            category={analysisResult.categories.C}
            onEvidenceClick={handleEvidenceClick}
          />
          <CategoryTable
            categoryId="D"
            category={analysisResult.categories.D}
            onEvidenceClick={handleEvidenceClick}
          />
          <CategoryTable
            categoryId="E"
            category={analysisResult.categories.E}
            onEvidenceClick={handleEvidenceClick}
          />
        </div>
      </div>
    </div>
  );
};

export default ResultScreen;
