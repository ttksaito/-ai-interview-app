-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- セッションテーブル
CREATE TABLE interview_sessions (
  id TEXT PRIMARY KEY,
  theme TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- チャット履歴テーブル
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT REFERENCES interview_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  message_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- メッセージ分析結果テーブル
CREATE TABLE message_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT REFERENCES interview_sessions(id) ON DELETE CASCADE,
  message_index INTEGER NOT NULL,
  analysis_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 最終分析結果テーブル
CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT REFERENCES interview_sessions(id) ON DELETE CASCADE,
  result_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id) -- 1セッション1分析結果
);

-- インデックス作成
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, message_index);
CREATE INDEX idx_message_analyses_session ON message_analyses(session_id, message_index);
CREATE INDEX idx_sessions_created ON interview_sessions(created_at DESC);
CREATE INDEX idx_analysis_results_session ON analysis_results(session_id);

-- updated_at自動更新のトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_interview_sessions_updated_at BEFORE UPDATE
    ON interview_sessions FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) の有効化 - 必要に応じて設定
-- ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE message_analyses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- サンプルクエリ用のビュー（オプション）
CREATE VIEW session_summary AS
SELECT
  s.id,
  s.theme,
  s.is_active,
  s.created_at,
  COUNT(DISTINCT cm.id) as message_count,
  EXISTS(SELECT 1 FROM analysis_results ar WHERE ar.session_id = s.id) as is_analyzed
FROM interview_sessions s
LEFT JOIN chat_messages cm ON s.id = cm.session_id
GROUP BY s.id, s.theme, s.is_active, s.created_at;
