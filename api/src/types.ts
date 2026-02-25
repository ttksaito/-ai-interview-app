export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface InterviewSession {
  chatHistory: Message[];
  isActive: boolean;
  costTracker: {
    totalInputTokens: number;
    totalOutputTokens: number;
  };
  createdAt: string;
  analysisResult?: AnalysisResult;
}

export interface AnalysisCategory {
  name: string;
  items: AnalysisItem[];
  positiveCount: number;
  negativeCount: number;
}

export interface AnalysisEvidence {
  messageIndex: number; // Index of the user message (0-based, excluding initial prompt)
  evaluation: 1 | -1; // 1: positive mention, -1: negative mention
  evidence: string; // Extracted quote from the message
  messageContent: string; // Full message content for context
}

export interface AnalysisItem {
  id: string;
  item: string;
  mentions: AnalysisEvidence[]; // List of mentions across all messages
  evaluation: 1 | -1 | 0; // Overall evaluation: 1 if any positive, -1 if any negative, 0 if none
  evidence: string; // Combined evidence for backward compatibility
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
