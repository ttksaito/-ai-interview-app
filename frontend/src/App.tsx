import { useState } from 'react';
import StartScreen from './pages/StartScreen';
import InterviewScreen from './pages/InterviewScreen';
import ResultScreen from './pages/ResultScreen';
import { api } from './services/api';
import type { AnalysisResult } from './types/index';

type AppScreen = 'start' | 'interview' | 'result';

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('start');
  const [sessionId, setSessionId] = useState<string>('');
  const [initialMessage, setInitialMessage] = useState<string>('');
  const [sampleData, setSampleData] = useState<AnalysisResult | null>(null);

  const handleStartInterview = async () => {
    try {
      const response = await api.startInterview();
      setSessionId(response.sessionId);
      setInitialMessage(response.message);
      setSampleData(null);
      setCurrentScreen('interview');
    } catch (error) {
      console.error('Error starting interview:', error);
      alert('インタビューの開始に失敗しました。バックエンドサーバーが起動していることを確認してください。');
    }
  };

  const handleInterviewComplete = () => {
    setSampleData(null);
    setCurrentScreen('result');
  };

  const handleViewHistory = (historySessionId: string) => {
    setSessionId(historySessionId);
    setSampleData(null);
    setCurrentScreen('result');
  };

  const handleViewSample = (data: AnalysisResult) => {
    setSampleData(data);
    setSessionId('');
    setCurrentScreen('result');
  };

  const handleRestart = () => {
    setSessionId('');
    setInitialMessage('');
    setSampleData(null);
    setCurrentScreen('start');
  };

  return (
    <>
      {currentScreen === 'start' && (
        <StartScreen
          onStart={handleStartInterview}
          onViewHistory={handleViewHistory}
          onViewSample={handleViewSample}
        />
      )}
      {currentScreen === 'interview' && sessionId && (
        <InterviewScreen
          sessionId={sessionId}
          initialMessage={initialMessage}
          onComplete={handleInterviewComplete}
        />
      )}
      {currentScreen === 'result' && (
        <ResultScreen
          sessionId={sessionId}
          sampleData={sampleData}
          onRestart={handleRestart}
        />
      )}
    </>
  );
}

export default App;
