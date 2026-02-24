export interface Message {
  role: 'user' | 'assistant';
  content: string;
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
  evaluation: 1 | -1 | 0;
  evidence: string;
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
  createdAt: string;
  messageCount: number;
  isAnalyzed: boolean;
}
