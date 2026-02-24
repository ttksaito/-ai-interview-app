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

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setIsLoading(true);
        // Try to get existing analysis first
        try {
          const result = await api.getSessionResult(sessionId);
          setAnalysisResult(result);
        } catch {
          // If no existing analysis, create new one
          const result = await api.analyzeInterview(sessionId);
          setAnalysisResult(result);
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
    // 根拠をクリックしても何もしない（インタビュー記録セクションを削除したため）
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">分析中...</p>
          <p className="text-sm text-gray-500 mt-2">AIがインタビュー結果を分析しています</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">分析結果</h1>
              <p className="text-sm text-gray-600 mt-1">インタビュー内容の評価</p>
            </div>
            <button
              onClick={onRestart}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition duration-200"
            >
              新しいインタビューを開始
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 md:p-6">
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
  );
};

export default ResultScreen;
