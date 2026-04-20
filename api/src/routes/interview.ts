import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { ClaudeService } from '../services/claudeService';
import { InterviewSession, Message, InterviewTheme } from '../types';

const router = Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const claudeService = new ClaudeService(process.env.ANTHROPIC_API_KEY || '');

// Start a new interview session
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { theme = 'life-meaning' } = req.body as { theme?: InterviewTheme };
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create session in database
    const { error: sessionError } = await supabase
      .from('interview_sessions')
      .insert({
        id: sessionId,
        theme: theme as InterviewTheme,
        is_active: true,
        total_input_tokens: 0,
        total_output_tokens: 0,
      });

    if (sessionError) {
      throw sessionError;
    }

    // Get first AI message
    const startMessage: Message = {
      role: 'user',
      content: 'インタビューを開始してください。',
    };

    const { response, inputTokens, outputTokens } = await claudeService.getResponse(
      [startMessage],
      theme
    );

    // Save chat messages
    const { error: messagesError } = await supabase
      .from('chat_messages')
      .insert([
        {
          session_id: sessionId,
          role: 'user',
          content: startMessage.content,
          message_index: 0,
        },
        {
          session_id: sessionId,
          role: 'assistant',
          content: response,
          message_index: 1,
        },
      ]);

    if (messagesError) {
      throw messagesError;
    }

    // Update token counts
    const { error: updateError } = await supabase
      .from('interview_sessions')
      .update({
        total_input_tokens: inputTokens,
        total_output_tokens: outputTokens,
      })
      .eq('id', sessionId);

    if (updateError) {
      throw updateError;
    }

    res.json({
      sessionId,
      message: response,
      isActive: true,
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

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!session.is_active) {
      return res.status(400).json({ error: 'Interview session is not active' });
    }

    // Get chat history
    const { data: chatHistory, error: historyError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('message_index', { ascending: true });

    if (historyError) {
      throw historyError;
    }

    const nextIndex = chatHistory.length;

    // Add user message
    const { error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: message,
        message_index: nextIndex,
      });

    if (userMsgError) {
      throw userMsgError;
    }

    // Build message history for Claude
    const messages: Message[] = chatHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));
    messages.push({ role: 'user', content: message });

    // Get AI response
    const { response, inputTokens, outputTokens } = await claudeService.getResponse(
      messages,
      session.theme
    );

    // Check for end codes
    const endCodes = ['x7y8', '5j3k', '1y4x'];
    const isEndCode = endCodes.includes(response.trim());

    if (isEndCode) {
      // Update session to inactive
      await supabase
        .from('interview_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);
    } else {
      // Add AI message to history
      await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role: 'assistant',
          content: response,
          message_index: nextIndex + 1,
        });
    }

    // Update token counts
    await supabase
      .from('interview_sessions')
      .update({
        total_input_tokens: session.total_input_tokens + inputTokens,
        total_output_tokens: session.total_output_tokens + outputTokens,
      })
      .eq('id', sessionId);

    // Get updated session for costTracker
    const { data: updatedSession } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    res.json({
      message: response,
      isActive: !isEndCode,
      isEndCode,
      costTracker: {
        totalInputTokens: updatedSession?.total_input_tokens || 0,
        totalOutputTokens: updatedSession?.total_output_tokens || 0,
      },
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

    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await supabase
      .from('interview_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);

    res.json({
      message: 'Interview ended',
      isActive: false,
    });
  } catch (error: any) {
    console.error('Error ending interview:', error);
    res.status(500).json({ error: 'Failed to end interview', details: error.message });
  }
});

// Get interview transcript
router.get('/transcript/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('message_index', { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    if (!messages || messages.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const transcript = messages
      .filter((msg) => msg.content !== 'インタビューを開始してください。')
      .map((msg) => {
        const role = msg.role === 'assistant' ? 'AI インタビュアー' : '回答者';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');

    const chatHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    res.json({ transcript, chatHistory });
  } catch (error: any) {
    console.error('Error getting transcript:', error);
    res.status(500).json({ error: 'Failed to get transcript', details: error.message });
  }
});

// Get session history list
router.get('/history', async (req: Request, res: Response) => {
  try {
    // Use the session_summary view for efficient querying
    const { data: sessions, error: sessionsError } = await supabase
      .from('session_summary')
      .select('*')
      .order('created_at', { ascending: false });

    if (sessionsError) {
      throw sessionsError;
    }

    const history = sessions.map(session => ({
      sessionId: session.id,
      theme: session.theme,
      createdAt: session.created_at,
      messageCount: session.message_count,
      isAnalyzed: session.is_analyzed,
    }));

    res.json(history);
  } catch (error: any) {
    console.error('Error getting history:', error);
    res.status(500).json({ error: 'Failed to get history', details: error.message });
  }
});

// Get session by ID (for viewing past results)
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const { data: analysisResult, error: analysisError } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (analysisError || !analysisResult) {
      return res.status(404).json({ error: 'Session has not been analyzed yet' });
    }

    res.json(analysisResult.result_data);
  } catch (error: any) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session', details: error.message });
  }
});

// Note: /analyze, /analyze-message, and /finalize-analysis endpoints
// have been moved to Supabase Edge Functions for better timeout handling

export default router;
