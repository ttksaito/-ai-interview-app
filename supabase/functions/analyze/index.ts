import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.30.1';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get session data
    const { data: session, error: sessionError } = await supabaseClient
      .from('interview_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get chat messages
    const { data: messages, error: messagesError } = await supabaseClient
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('message_index', { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    // Generate transcript (exclude initial start command)
    const transcript = messages
      .filter(msg => msg.content !== 'インタビューを開始してください。')
      .map(msg => {
        const role = msg.role === 'assistant' ? 'AI インタビュアー' : '回答者';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
    });

    // Analyze the transcript
    const analysisPrompt = getAnalysisPrompt(session.theme);
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `${analysisPrompt}\n\nインタビュー結果:\n${transcript}`,
        },
      ],
    });

    const textContent = response.content.find((block: any) => block.type === 'text');
    const responseText = textContent?.text || '';

    // Extract JSON from code block
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : responseText;

    const parsedData = JSON.parse(jsonText);

    // Transform to AnalysisResult format
    const categoryNames = getCategoryNames(session.theme);
    const analysisResult = {
      categories: {
        A: createCategory('A', categoryNames.A, parsedData.A),
        B: createCategory('B', categoryNames.B, parsedData.B),
        C: createCategory('C', categoryNames.C, parsedData.C),
        D: createCategory('D', categoryNames.D, parsedData.D),
        E: createCategory('E', categoryNames.E, parsedData.E),
      },
      transcript,
    };

    // Save analysis result to database
    const { error: saveError } = await supabaseClient
      .from('analysis_results')
      .upsert({
        session_id: sessionId,
        result_data: analysisResult,
      });

    if (saveError) {
      console.error('Error saving analysis result:', saveError);
    }

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in analyze function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper functions (copied from analysisService.ts)
function getAnalysisPrompt(theme: string): string {
  if (theme === 'job-change') {
    return JOB_CHANGE_ANALYSIS_PROMPT;
  }
  return LIFE_MEANING_ANALYSIS_PROMPT;
}

function getCategoryNames(theme: string) {
  if (theme === 'job-change') {
    return {
      A: 'キャリア成長・スキル開発',
      B: '職場環境・人間関係',
      C: '労働条件・待遇',
      D: '仕事の意義・やりがい',
      E: 'ワークライフバランス・個人的要因',
    };
  }
  return {
    A: '仕事への意味・充実感',
    B: '人間関係・つながりの感覚',
    C: '自己成長・学びへの志向',
    D: '人生全体の意味・目的感',
    E: '日常の喜び・主観的幸福感',
  };
}

function createCategory(id: string, name: string, items: any[]) {
  const positiveCount = items.filter((item) => item.evaluation === 1).length;
  const negativeCount = items.filter((item) => item.evaluation === -1).length;

  return {
    name,
    items,
    positiveCount,
    negativeCount,
  };
}

const LIFE_MEANING_ANALYSIS_PROMPT = `以下のインタビュー結果を分析し、5つのカテゴリ（A〜E）の各10項目について、
回答者の言及状況を評価してください。

評価基準:
- ポジティブな言及があれば「1」
- ネガティブな言及があれば「-1」
- 言及がなければ「0」

**重要な指示:**
- 根拠には必ず回答者の実際の発言を忠実に抽出すること
- 根拠がある場合は、「【「回答者の実際の発言」と発言】」という形式で記載すること
- 言及がない場合は「言及なし」と記載すること

カテゴリと項目:

【A】仕事への意味・充実感
A1: 自分の仕事は、社会に何らかの形で役立っていると感じる。
A2: 仕事を通じて、自分が成長していると感じることがある。
A3: 毎日の仕事に、やりがいを見出せていると思う。
A4: 自分が仕事に費やしている時間は、意味のある使い方だと感じる。
A5: 仕事の中に、自分が大切にしている価値観と一致する部分があると思う。
A6: 職場での経験が、自分という人間を形づくる一部になっていると感じる。
A7: 仕事上の小さな達成でも、自分にとって喜びになることがある。
A8: 自分が取り組んでいる仕事には、続けるだけの意味があると感じる。
A9: 働くことは、単なる収入を得る手段以上の何かだと思う。
A10: 仕事を通じて、自分の存在意義を感じる瞬間がある。

【B】人間関係・つながりの感覚
B1: 自分の周りには、困ったときに支えてくれると感じる人がいる。
B2: 誰かの役に立てたと感じるとき、生きていてよかったと思う。
B3: 人との関わりの中に、自分の生きがいの一部があると感じる。
B4: 自分のことを理解してくれていると感じる人が、身の回りにいる。
B5: 誰かに感謝されたとき、自分の存在に意味があると感じる。
B6: 他者とつながっているという感覚が、自分の心の支えになっている。
B7: 自分が関わることで、他者の生活や気持ちが少しでもよくなっていると感じることがある。
B8: 孤独を感じることなく日々を過ごせていると思う。
B9: 自分の存在が、誰かにとってプラスになっていると感じる。
B10: 人との関係の中に、人生の喜びを感じることがある。

【C】自己成長・学びへの志向
C1: 自分はまだ成長できる余地があると感じている。
C2: 新しいことを学ぶことに、意欲を感じることがある。
C3: 自分の可能性は、今後も広がっていくと思う。
C4: 過去の失敗や困難は、自分を成長させてくれたと感じる。
C5: 自分の強みや得意なことを、活かせる場面があると感じる。
C6: 日々の経験から、何かしら学び取れることがあると思う。
C7: 自分が目指したい姿や、なりたい自分のイメージを持っている。
C8: 挑戦することに対して、不安よりも期待の方が大きいと感じることがある。
C9: 自分の知識やスキルが高まっていると感じることがある。
C10: 努力を続けることに、意味を感じている。

【D】人生全体の意味・目的感
D1: 自分の人生には、意味や目的があると感じている。
D2: 今の自分の生き方は、自分らしいと感じる。
D3: 将来に対して、漠然とでも希望を持てている。
D4: 自分が何のために生きているか、感じられることがある。
D5: 自分の人生を振り返ったとき、意味のある時間を過ごしてきたと思える。
D6: 今この瞬間、生きていることに価値を感じる。
D7: 自分の価値観にそった生き方ができていると感じる。
D8: 人生において、自分なりの優先順位や軸を持っていると思う。
D9: 今後の人生に対して、楽しみにしていることがある。
D10: 自分の生き方を、自分自身で選んでいるという感覚がある。

【E】日常の喜び・主観的幸福感
E1: 日常の中に、小さな喜びを見つけることができると感じる。
E2: 今の自分の生活に、全体として満足感を感じている。
E3: 朝目覚めたとき、今日という一日に前向きな気持ちになれることがある。
E4: 自分の生活の中に、楽しみにしていることがある。
E5: 心が穏やかでいられる時間が、日常の中にあると感じる。
E6: 自分の感情や気持ちを、大切にできていると思う。
E7: 趣味・関心事・好きなことが、自分の生活を豊かにしていると感じる。
E8: 自分が「いい一日だった」と感じる日が、ある程度あると思う。
E9: 自分はおおむね幸せな状態にあると感じる。
E10: 今の自分の生き方を、肯定的に受け止めている。

**出力形式（必ずこの形式のJSONで出力してください）:**
\`\`\`json
{
  "A": [
    { "id": "A1", "item": "仕事が社会に役立っていると感じる", "evaluation": 0, "evidence": "言及なし" },
    { "id": "A2", "item": "仕事を通じて成長していると感じる", "evaluation": 1, "evidence": "【「研究で成果を出せたときに生きがいを感じます」と発言】" }
  ],
  "B": [...],
  "C": [...],
  "D": [...],
  "E": [...]
}
\`\`\`
`;

const JOB_CHANGE_ANALYSIS_PROMPT = `以下のインタビュー結果を分析し、5つのカテゴリ（A〜E）の各10項目について、
回答者の言及状況を評価してください。

評価基準:
- ポジティブな言及があれば「1」
- ネガティブな言及があれば「-1」
- 言及がなければ「0」

**重要な指示:**
- 根拠には必ず回答者の実際の発言を忠実に抽出すること
- 根拠がある場合は、「【「回答者の実際の発言」と発言】」という形式で記載すること
- 言及がない場合は「言及なし」と記載すること

カテゴリと項目:

【A】キャリア成長・スキル開発
A1: 現在の仕事で、新しいスキルや知識を習得できていると感じる
A2: 今の職場で、自分が目指すキャリアパスが描けている
A3: 専門性を深めたり、幅を広げたりする機会があると感じる
A4: 仕事を通じて、市場価値が高まっていると感じる
A5: より大きな責任や裁量のある仕事に挑戦できる環境だと思う
A6: 上司や先輩から、成長につながる指導を受けられている
A7: 自分のキャリアビジョンと、現在の仕事内容が一致していると感じる
A8: 将来のキャリアに不安を感じることなく働けている
A9: 今の職場にいることで、長期的なキャリア形成ができると思う
A10: 自分が望む専門分野や役割に近づいていると感じる

【B】職場環境・人間関係
B1: 上司との関係は良好で、信頼できると感じる
B2: 同僚とのコミュニケーションが円滑で、協力し合えている
B3: 職場の雰囲気は良く、心地よく働けていると思う
B4: 組織の文化や価値観に、共感できる部分がある
B5: 自分の意見や提案を、聞いてもらえる環境だと感じる
B6: ハラスメントや人間関係のストレスを感じることなく働けている
B7: チームとして一体感を持って仕事ができていると思う
B8: 職場での人間関係が、仕事のモチベーションになっている
B9: 尊敬できる人や、目標にしたい人が職場にいる
B10: 職場の人たちと、価値観や考え方が合っていると感じる

【C】労働条件・待遇
C1: 現在の給与は、自分の仕事内容や貢献度に見合っていると感じる
C2: 労働時間は適切で、無理なく働けていると思う
C3: 残業や休日出勤の頻度・量に、納得できている
C4: 評価制度は公平で、頑張りが正当に評価されていると感じる
C5: 福利厚生や手当に、満足している
C6: 昇給や昇進の機会が、適切に提供されていると思う
C7: 勤務形態（リモート・フレックスなど）は、自分の希望に合っている
C8: 有給休暇を、取りたいときに取れる環境だと感じる
C9: 待遇面での不満やストレスを感じることなく働けている
C10: 同業他社と比べて、条件面で劣っていないと思う

【D】仕事の意義・やりがい
D1: 今の仕事内容に、興味や関心を持てている
D2: 自分が担当している業務に、やりがいを感じる
D3: 仕事を通じて、社会や顧客に貢献できていると実感できる
D4: 業務内容が、自分の興味や適性に合っていると感じる
D5: 達成感や充実感を得られる仕事ができていると思う
D6: 自分の仕事が、会社や組織にとって意味があると感じる
D7: 毎日の業務に、モチベーションを持って取り組めている
D8: 今の仕事を続けることに、意味や価値を見出せている
D9: 自分の強みや能力を、仕事で活かせていると感じる
D10: 仕事内容に対して、マンネリや退屈を感じていない

【E】ワークライフバランス・個人的要因
E1: 仕事とプライベートのバランスが、適切に取れていると感じる
E2: 家族との時間を、十分に確保できている
E3: 通勤時間や勤務地は、負担になっていないと思う
E4: 趣味や自己啓発の時間を、確保できている
E5: 心身の健康を保ちながら、働けていると感じる
E6: 仕事のストレスが、私生活に悪影響を与えていない
E7: 家庭の事情（育児・介護など）と、仕事を両立できている
E8: 体調やメンタル面で、無理なく働ける環境だと思う
E9: プライベートの予定を、仕事に合わせて調整する必要が少ない
E10: 今の働き方は、自分のライフステージに合っていると感じる

**出力形式（必ずこの形式のJSONで出力してください）:**
\`\`\`json
{
  "A": [
    { "id": "A1", "item": "新しいスキルや知識を習得できている", "evaluation": 0, "evidence": "言及なし" },
    { "id": "A2", "item": "目指すキャリアパスが描けている", "evaluation": -1, "evidence": "【「今の会社では自分のキャリアが見えない」と発言】" }
  ],
  "B": [...],
  "C": [...],
  "D": [...],
  "E": [...]
}
\`\`\`
`;
