import { useState } from 'react';
import StartScreen from './pages/StartScreen';
import InterviewScreen from './pages/InterviewScreen';
import ResultScreen from './pages/ResultScreen';
import { api } from './services/api';

type AppScreen = 'start' | 'interview' | 'result';

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('start');
  const [sessionId, setSessionId] = useState<string>('');
  const [initialMessage, setInitialMessage] = useState<string>('');

  const handleStartInterview = async () => {
    try {
      const response = await api.startInterview();
      setSessionId(response.sessionId);
      setInitialMessage(response.message);
      setCurrentScreen('interview');
    } catch (error) {
      console.error('Error starting interview:', error);
      alert('インタビューの開始に失敗しました。バックエンドサーバーが起動していることを確認してください。');
    }
  };

  const handleInterviewComplete = () => {
    setCurrentScreen('result');
  };

  const handleViewHistory = (historySessionId: string) => {
    setSessionId(historySessionId);
    setCurrentScreen('result');
  };

  const handleRestart = () => {
    setSessionId('');
    setInitialMessage('');
    setCurrentScreen('start');
  };

  return (
    <>
      {currentScreen === 'start' && (
        <StartScreen
          onStart={handleStartInterview}
          onViewHistory={handleViewHistory}
        />
      )}
      {currentScreen === 'interview' && sessionId && (
        <InterviewScreen
          sessionId={sessionId}
          initialMessage={initialMessage}
          onComplete={handleInterviewComplete}
        />
      )}
      {currentScreen === 'result' && sessionId && (
        <ResultScreen sessionId={sessionId} onRestart={handleRestart} />
      )}
    </>
  );
}

export default App;
