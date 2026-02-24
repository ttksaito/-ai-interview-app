import { Router, Request, Response } from 'express';
import { ClaudeService } from '../services/claudeService';
import { AnalysisService } from '../services/analysisService';
import { InterviewSession, Message } from '../types';

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

// Analyze interview results
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Generate transcript (exclude the initial start command)
    const transcript = session.chatHistory
      .filter((msg) => msg.content !== 'インタビューを開始してください。')
      .map((msg) => {
        const role = msg.role === 'assistant' ? 'AI インタビュアー' : '回答者';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');

    // Analyze the transcript
    const analysisResult = await analysisService.analyzeTranscript(transcript);

    // Save analysis result to session
    session.analysisResult = analysisResult;

    res.json(analysisResult);
  } catch (error: any) {
    console.error('Error analyzing interview:', error);
    res.status(500).json({ error: 'Failed to analyze interview', details: error.message });
  }
});

// Get interview transcript
router.get('/transcript/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

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
    const { sessionId } = req.params;

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
