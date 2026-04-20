export type InterviewTheme = 'life-meaning' | 'job-change';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface MessageAnalysis {
  messageIndex: number;
  categories: {
    [key: string]: {
      itemId: string;
      evaluation: 1 | -1 | 0;
      evidence: string;
    }[];
  };
}

export interface InterviewSession {
  theme: InterviewTheme;
  chatHistory: Message[];
  isActive: boolean;
  costTracker: {
    totalInputTokens: number;
    totalOutputTokens: number;
  };
  createdAt: string;
  analysisResult?: AnalysisResult;
  messageAnalyses?: MessageAnalysis[];
}

export interface AnalysisCategory {
  name: string;
  items: AnalysisItem[];
  positiveCount: number;
  negativeCount: number;
}

export interface AnalysisItem {
  id: string;
  item: string;
  evaluation: 1 | -1 | 0; // 1: positive, -1: negative, 0: no mention
  evidence: string;
  mentions: {
    messageIndex: number;
    evaluation: 1 | -1 | 0;
    evidence: string;
    messageContent: string;
  }[];
}

export interface AnalysisResult {
  categories: {
    A: AnalysisCategory;
    B: AnalysisCategory;
    C: AnalysisCategory;
    D: AnalysisCategory;
    E: AnalysisCategory;
  };
  transcript: string;
}

export interface SessionHistory {
  sessionId: string;
  theme: InterviewTheme;
  createdAt: string;
  messageCount: number;
  isAnalyzed: boolean;
}
