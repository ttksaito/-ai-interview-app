import { Router, Request, Response } from 'express';
import { ClaudeService } from '../services/claudeService';
import { AnalysisService } from '../services/analysisService';
import { InterviewSession, Message, AnalysisResult } from '../types';

const router = Router();

// In-memory session storage (for demo purposes - use Redis or DB in production)
const sessions = new Map<string, InterviewSession>();

const claudeService = new ClaudeService(process.env.ANTHROPIC_API_KEY || '');
const analysisService = new AnalysisService(process.env.ANTHROPIC_API_KEY || '');

// Start a new interview session
router.post('/start', async (req: Request, res: Response) => {
  try {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Initialize session
    const session: InterviewSession = {
      chatHistory: [],
      isActive: true,
      costTracker: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
      },
      createdAt: new Date().toISOString(),
    };

    // Get first AI message
    const startMessage: Message = {
      role: 'user',
      content: 'インタビューを開始してください。',
    };

    session.chatHistory.push(startMessage);

    const { response, inputTokens, outputTokens } = await claudeService.getResponse(
      session.chatHistory,
    );

    const aiMessage: Message = {
      role: 'assistant',
      content: response,
    };

    session.chatHistory.push(aiMessage);
    session.costTracker.totalInputTokens += inputTokens;
    session.costTracker.totalOutputTokens += outputTokens;

    sessions.set(sessionId, session);

    res.json({
      sessionId,
      message: response,
      isActive: session.isActive,
    });
  } catch (error: any) {
    console.error('Error starting interview:', error);
    res.status(500).json({ error: 'Failed to start interview', details: error.message });
  }
});

// Send a message in an interview session
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message are required' });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!session.isActive) {
      return res.status(400).json({ error: 'Interview session is not active' });
    }

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: message,
    };
    session.chatHistory.push(userMessage);

    // Get AI response
    const { response, inputTokens, outputTokens } = await claudeService.getResponse(
      session.chatHistory,
    );

    // Check for end codes
    const endCodes = ['x7y8', '5j3k', '1y4x'];
    const isEndCode = endCodes.includes(response.trim());

    if (isEndCode) {
      session.isActive = false;
    } else {
      // Add AI message to history
      const aiMessage: Message = {
        role: 'assistant',
        content: response,
      };
      session.chatHistory.push(aiMessage);
    }

    session.costTracker.totalInputTokens += inputTokens;
    session.costTracker.totalOutputTokens += outputTokens;

    res.json({
      message: response,
      isActive: session.isActive,
      isEndCode,
      costTracker: session.costTracker,
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
});

// End interview manually
router.post('/end', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.isActive = false;

    res.json({
      message: 'Interview ended',
      isActive: false,
    });
  } catch (error: any) {
    console.error('Error ending interview:', error);
    res.status(500).json({ error: 'Failed to end interview', details: error.message });
  }
});

// Analyze a single message (for incremental processing)
router.post('/analyze-message', async (req: Request, res: Response) => {
  try {
    const { sessionId, messageIndex } = req.body;

    if (!sessionId || messageIndex === undefined) {
      return res.status(400).json({ error: 'sessionId and messageIndex are required' });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Initialize partialAnalysis if not exists
    if (!session.partialAnalysis) {
      session.partialAnalysis = new Map();
    }

    // Get user messages (excluding the initial prompt)
    const userMessages = session.chatHistory.filter(
      (msg) => msg.role === 'user' && msg.content !== 'インタビューを開始してください。'
    );

    if (messageIndex < 0 || messageIndex >= userMessages.length) {
      return res.status(400).json({ error: 'Invalid messageIndex' });
    }

    console.log(`Analyzing message ${messageIndex + 1}/${userMessages.length} with full conversation context`);

    // Analyze the single message with full conversation context
    const result = await analysisService.analyzeSingleMessage(session.chatHistory, messageIndex);

    // Save to session
    session.partialAnalysis.set(messageIndex, result);

    // Check if all messages have been analyzed
    const allAnalyzed = session.partialAnalysis.size === userMessages.length;

    res.json({
      success: true,
      messageIndex,
      totalMessages: userMessages.length,
      analyzedCount: session.partialAnalysis.size,
      allAnalyzed,
      result,
    });
  } catch (error: any) {
    console.error('Error analyzing message:', error);
    res.status(500).json({
      error: 'Failed to analyze message',
      details: error.message,
    });
  }
});

// Finalize analysis from partial results
router.post('/finalize-analysis', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!session.partialAnalysis || session.partialAnalysis.size === 0) {
      return res.status(400).json({ error: 'No partial analysis results found' });
    }

    console.log(`Finalizing analysis from ${session.partialAnalysis.size} partial results`);

    // Convert Map to Array
    const partialResults = Array.from(session.partialAnalysis.values());

    // Aggregate into final result
    const analysisResult = analysisService.aggregatePartialResults(
      partialResults,
      session.chatHistory,
    );

    // Save to session
    session.analysisResult = analysisResult;

    // Clear partial results to save memory
    session.partialAnalysis = undefined;

    res.json(analysisResult);
  } catch (error: any) {
    console.error('Error finalizing analysis:', error);
    res.status(500).json({
      error: 'Failed to finalize analysis',
      details: error.message,
    });
  }
});

// Analyze interview results
router.post('/analyze', async (req: Request, res: Response) => {
  let sessionId: string | undefined;
  let transcript: string | undefined;

  try {
    sessionId = req.body.sessionId;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Count user messages for logging
    const userMessageCount = session.chatHistory.filter(
      (msg) => msg.role === 'user' && msg.content !== 'インタビューを開始してください。'
    ).length;

    console.log(`Starting batch analysis for ${userMessageCount} user messages x 5 categories = ${userMessageCount * 5} API calls`);

    // Analyze using the new batch method (processes messages x categories in parallel)
    // This is much faster than the old single-transcript method and avoids timeout
    const analysisResult = await Promise.race([
      analysisService.analyzeMessagesBatch(session.chatHistory),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Analysis timeout')), 25000)
      ),
    ]);

    transcript = (analysisResult as AnalysisResult).transcript;

    // Save analysis result to session
    session.analysisResult = analysisResult as AnalysisResult;

    res.json(analysisResult);
  } catch (error: any) {
    const errorTimestamp = new Date().toISOString();
    console.error(`[${errorTimestamp}] Error analyzing interview:`, {
      sessionId,
      errorMessage: error.message,
      errorStack: error.stack,
      transcriptLength: transcript?.length || 0,
    });

    // Check if it's a timeout error
    if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
      return res.status(504).json({
        error: 'Analysis timeout',
        details: 'インタビューの分析に時間がかかりすぎています。インタビューを短くしてもう一度お試しください。',
        transcriptLength: transcript?.length,
      });
    }

    res.status(500).json({
      error: 'Failed to analyze interview',
      details: error.message,
      transcriptLength: transcript?.length,
    });
  }
});

// Get interview transcript
router.get('/transcript/:sessionId', (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const transcript = session.chatHistory
      .filter((msg) => msg.content !== 'インタビューを開始してください。')
      .map((msg) => {
        const role = msg.role === 'assistant' ? 'AI インタビュアー' : '回答者';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');

    res.json({ transcript, chatHistory: session.chatHistory });
  } catch (error: any) {
    console.error('Error getting transcript:', error);
    res.status(500).json({ error: 'Failed to get transcript', details: error.message });
  }
});

// Get session history list
router.get('/history', (req: Request, res: Response) => {
  try {
    const history = Array.from(sessions.entries())
      .map(([sessionId, session]) => ({
        sessionId,
        createdAt: session.createdAt,
        messageCount: session.chatHistory.filter(
          (msg) => msg.content !== 'インタビューを開始してください。'
        ).length,
        isAnalyzed: !!session.analysisResult,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(history);
  } catch (error: any) {
    console.error('Error getting history:', error);
    res.status(500).json({ error: 'Failed to get history', details: error.message });
  }
});

// Get session by ID (for viewing past results)
router.get('/session/:sessionId', (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId as string;

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!session.analysisResult) {
      return res.status(404).json({ error: 'Session has not been analyzed yet' });
    }

    res.json(session.analysisResult);
  } catch (error: any) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session', details: error.message });
  }
});

export default router;
