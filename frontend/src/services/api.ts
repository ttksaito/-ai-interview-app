import type { Message, AnalysisResult, SessionHistory } from '../types/index';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export interface StartInterviewResponse {
  sessionId: string;
  message: string;
  isActive: boolean;
}

export interface SendMessageResponse {
  message: string;
  isActive: boolean;
  isEndCode: boolean;
  costTracker: {
    totalInputTokens: number;
    totalOutputTokens: number;
  };
}

export const api = {
  async startInterview(): Promise<StartInterviewResponse> {
    const response = await fetch(`${API_BASE_URL}/interview/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to start interview');
    }

    return response.json();
  },

  async sendMessage(sessionId: string, message: string): Promise<SendMessageResponse> {
    const response = await fetch(`${API_BASE_URL}/interview/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, message }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  },

  async endInterview(sessionId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/interview/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      throw new Error('Failed to end interview');
    }
  },

  async analyzeInterview(sessionId: string): Promise<AnalysisResult> {
    const response = await fetch(`${API_BASE_URL}/interview/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle timeout specifically
      if (response.status === 504) {
        throw new Error('Analysis timed out - interview may be too long');
      }

      throw new Error(errorData.details || 'Failed to analyze interview');
    }

    return response.json();
  },

  async getTranscript(sessionId: string): Promise<{ transcript: string; chatHistory: Message[] }> {
    const response = await fetch(`${API_BASE_URL}/interview/transcript/${sessionId}`);

    if (!response.ok) {
      throw new Error('Failed to get transcript');
    }

    return response.json();
  },

  async getHistory(): Promise<SessionHistory[]> {
    const response = await fetch(`${API_BASE_URL}/interview/history`);

    if (!response.ok) {
      throw new Error('Failed to get history');
    }

    return response.json();
  },

  async getSessionResult(sessionId: string): Promise<AnalysisResult> {
    const response = await fetch(`${API_BASE_URL}/interview/session/${sessionId}`);

    if (!response.ok) {
      throw new Error('Failed to get session result');
    }

    return response.json();
  },
};
