import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // Get all message analyses
    const { data: messageAnalyses, error: analysesError } = await supabaseClient
      .from('message_analyses')
      .select('*')
      .eq('session_id', sessionId)
      .order('message_index', { ascending: true });

    if (analysesError) {
      throw analysesError;
    }

    if (!messageAnalyses || messageAnalyses.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No message analyses found. Run analyze-message first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get chat messages for transcript
    const { data: messages, error: messagesError } = await supabaseClient
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('message_index', { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    // Generate transcript
    const transcript = messages
      .filter(msg => msg.content !== 'インタビューを開始してください。')
      .map(msg => {
        const role = msg.role === 'assistant' ? 'AI インタビュアー' : '回答者';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');

    // Aggregate message analyses
    const analysisResult = aggregateMessageAnalyses(
      messageAnalyses.map(ma => ma.analysis_data),
      session.theme,
      transcript
    );

    // Save to database
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
    console.error('Error in finalize-analysis function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper functions
function aggregateMessageAnalyses(
  messageAnalyses: any[],
  theme: string,
  transcript: string
): any {
  const categoryNames = getCategoryNames(theme);
  const itemTexts = getItemTexts(theme);

  // Initialize all items with 0 evaluation
  const allItems: { [key: string]: any } = {};
  const categories = ['A', 'B', 'C', 'D', 'E'];

  categories.forEach(cat => {
    for (let i = 1; i <= 10; i++) {
      const itemId = `${cat}${i}`;
      allItems[itemId] = {
        id: itemId,
        item: itemTexts[itemId] || '',
        mentions: [],
        evaluation: 0,
        evidence: '言及なし',
      };
    }
  });

  // Aggregate all message analyses
  messageAnalyses.forEach(msgAnalysis => {
    Object.entries(msgAnalysis.categories || {}).forEach(([categoryId, items]: [string, any]) => {
      (items as any[]).forEach(item => {
        if (allItems[item.itemId]) {
          // Update evaluation
          if (item.evaluation !== 0) {
            if (allItems[item.itemId].evaluation === 0 || item.evaluation !== 0) {
              allItems[item.itemId].evaluation = item.evaluation;
            }

            if (item.evidence && item.evidence !== 'なし') {
              // Format evidence with proper markers
              const formattedEvidence = item.evidence.startsWith('「')
                ? `【${item.evidence}と発言】`
                : `【「${item.evidence}」と発言】`;

              // Add to mentions array
              allItems[item.itemId].mentions.push({
                messageIndex: msgAnalysis.messageIndex,
                evaluation: item.evaluation,
                evidence: formattedEvidence,
                messageContent: '',
              });

              // Update combined evidence string
              if (allItems[item.itemId].evidence === '言及なし') {
                allItems[item.itemId].evidence = formattedEvidence;
              } else {
                allItems[item.itemId].evidence += ', ' + formattedEvidence;
              }
            }
          }
        }
      });
    });
  });

  // Group by category
  const categorizedItems: { [key: string]: any[] } = {
    A: [], B: [], C: [], D: [], E: []
  };

  Object.values(allItems).forEach(item => {
    const categoryId = item.id.charAt(0);
    categorizedItems[categoryId].push(item);
  });

  // Sort items by ID
  Object.keys(categorizedItems).forEach(cat => {
    categorizedItems[cat].sort((a, b) => {
      const numA = parseInt(a.id.substring(1));
      const numB = parseInt(b.id.substring(1));
      return numA - numB;
    });
  });

  return {
    categories: {
      A: createCategory('A', categoryNames.A, categorizedItems.A),
      B: createCategory('B', categoryNames.B, categorizedItems.B),
      C: createCategory('C', categoryNames.C, categorizedItems.C),
      D: createCategory('D', categoryNames.D, categorizedItems.D),
      E: createCategory('E', categoryNames.E, categorizedItems.E),
    },
    transcript,
  };
}

function createCategory(id: string, name: string, items: any[]) {
  const positiveCount = items.filter(item => item.evaluation === 1).length;
  const negativeCount = items.filter(item => item.evaluation === -1).length;

  return {
    name,
    items,
    positiveCount,
    negativeCount,
  };
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

function getItemTexts(theme: string): { [key: string]: string } {
  if (theme === 'life-meaning') {
    return {
      A1: '仕事が社会に役立っていると感じる',
      A2: '仕事を通じて成長していると感じる',
      A3: '毎日の仕事にやりがいを見出せている',
      A4: '仕事に費やす時間は意味がある',
      A5: '仕事と価値観が一致している',
      A6: '職場経験が自分を形づくっている',
      A7: '仕事上の小さな達成が喜びになる',
      A8: '仕事を続けるだけの意味がある',
      A9: '働くことは収入以上の何か',
      A10: '仕事を通じて存在意義を感じる',
      B1: '困ったときに支えてくれる人がいる',
      B2: '誰かの役に立てると生きていてよかったと思う',
      B3: '人との関わりに生きがいがある',
      B4: '自分を理解してくれる人がいる',
      B5: '感謝されると存在意義を感じる',
      B6: '他者とのつながりが心の支え',
      B7: '他者の生活や気持ちがよくなっていると感じる',
      B8: '孤独を感じず過ごせている',
      B9: '自分の存在が誰かのプラスになっている',
      B10: '人との関係に人生の喜びを感じる',
      C1: 'まだ成長できる余地がある',
      C2: '新しいことを学ぶ意欲がある',
      C3: '自分の可能性は広がっていく',
      C4: '失敗や困難が成長させてくれた',
      C5: '強みや得意を活かせている',
      C6: '日々の経験から学び取れる',
      C7: '目指したい姿がある',
      C8: '挑戦に不安より期待を感じる',
      C9: '知識やスキルが高まっている',
      C10: '努力を続けることに意味を感じる',
      D1: '人生に意味や目的がある',
      D2: '今の生き方は自分らしい',
      D3: '将来に希望を持てている',
      D4: '何のために生きているか感じられる',
      D5: '意味のある時間を過ごしてきた',
      D6: '生きていることに価値を感じる',
      D7: '価値観にそった生き方ができている',
      D8: '人生の優先順位や軸を持っている',
      D9: '今後の人生に楽しみがある',
      D10: '自分の生き方を自分で選んでいる',
      E1: '日常に小さな喜びを見つけられる',
      E2: '今の生活に満足感がある',
      E3: '朝目覚めると前向きな気持ちになれる',
      E4: '生活に楽しみがある',
      E5: '心が穏やかな時間がある',
      E6: '自分の感情や気持ちを大切にできている',
      E7: '趣味や好きなことが生活を豊かにしている',
      E8: 'いい一日だったと感じる日がある',
      E9: 'おおむね幸せな状態にある',
      E10: '今の生き方を肯定的に受け止めている',
    };
  } else {
    // job-change theme
    return {
      A1: '新しいスキルや知識を習得できている',
      A2: '目指すキャリアパスが描けている',
      A3: '専門性を深めたり広げる機会がある',
      A4: '市場価値が高まっている',
      A5: 'より大きな責任や裁量のある仕事に挑戦できる',
      A6: '成長につながる指導を受けられている',
      A7: 'キャリアビジョンと仕事内容が一致している',
      A8: '将来のキャリアに不安を感じない',
      A9: '長期的なキャリア形成ができる',
      A10: '望む専門分野や役割に近づいている',
      B1: '上司との関係は良好で信頼できる',
      B2: '同僚とのコミュニケーションが円滑',
      B3: '職場の雰囲気がよく心地よく働けている',
      B4: '組織の文化や価値観に共感できる',
      B5: '自分の意見や提案を聞いてもらえる',
      B6: 'ハラスメントや人間関係のストレスがない',
      B7: 'チームとして一体感を持って仕事ができている',
      B8: '職場の人間関係がモチベーションになっている',
      B9: '尊敬できる人や目標にしたい人がいる',
      B10: '職場の人たちと価値観や考え方が合っている',
      C1: '給与は仕事内容や貢献度に見合っている',
      C2: '労働時間は適切で無理なく働けている',
      C3: '残業や休日出勤の頻度・量に納得できている',
      C4: '評価制度は公平で頑張りが正当に評価されている',
      C5: '福利厚生や手当に満足している',
      C6: '昇給や昇進の機会が適切に提供されている',
      C7: '勤務形態は自分の希望に合っている',
      C8: '有給休暇を取りたいときに取れる',
      C9: '待遇面での不満やストレスがない',
      C10: '同業他社と比べて条件面で劣っていない',
      D1: '今の仕事内容に興味や関心を持てている',
      D2: '担当している業務にやりがいを感じる',
      D3: '社会や顧客に貢献できていると実感できる',
      D4: '業務内容が興味や適性に合っている',
      D5: '達成感や充実感を得られる仕事ができている',
      D6: '自分の仕事が会社や組織にとって意味がある',
      D7: '毎日の業務にモチベーションを持って取り組める',
      D8: '今の仕事を続けることに意味や価値を見出せている',
      D9: '強みや能力を仕事で活かせている',
      D10: '仕事内容にマンネリや退屈を感じていない',
      E1: '仕事とプライベートのバランスが適切',
      E2: '家族との時間を十分に確保できている',
      E3: '通勤時間や勤務地は負担になっていない',
      E4: '趣味や自己啓発の時間を確保できている',
      E5: '心身の健康を保ちながら働けている',
      E6: '仕事のストレスが私生活に悪影響を与えていない',
      E7: '家庭の事情と仕事を両立できている',
      E8: '体調やメンタル面で無理なく働ける',
      E9: 'プライベートの予定を仕事に合わせて調整する必要が少ない',
      E10: '今の働き方は自分のライフステージに合っている',
    };
  }
}
