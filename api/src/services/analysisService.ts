import Anthropic from '@anthropic-ai/sdk';
import { AnalysisResult, AnalysisCategory, AnalysisItem, InterviewTheme, MessageAnalysis, Message } from '../types';

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

const getAnalysisPrompt = (theme: InterviewTheme): string => {
  switch (theme) {
    case 'life-meaning':
      return LIFE_MEANING_ANALYSIS_PROMPT;
    case 'job-change':
      return JOB_CHANGE_ANALYSIS_PROMPT;
    default:
      return LIFE_MEANING_ANALYSIS_PROMPT;
  }
};

const getCategoryNames = (theme: InterviewTheme) => {
  switch (theme) {
    case 'life-meaning':
      return {
        A: '仕事への意味・充実感',
        B: '人間関係・つながりの感覚',
        C: '自己成長・学びへの志向',
        D: '人生全体の意味・目的感',
        E: '日常の喜び・主観的幸福感',
      };
    case 'job-change':
      return {
        A: 'キャリア成長・スキル開発',
        B: '職場環境・人間関係',
        C: '労働条件・待遇',
        D: '仕事の意義・やりがい',
        E: 'ワークライフバランス・個人的要因',
      };
    default:
      return {
        A: '仕事への意味・充実感',
        B: '人間関係・つながりの感覚',
        C: '自己成長・学びへの志向',
        D: '人生全体の意味・目的感',
        E: '日常の喜び・主観的幸福感',
      };
  }
};

const getItemTexts = (theme: InterviewTheme): { [key: string]: string } => {
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
};

const getIncrementalAnalysisPrompt = (theme: InterviewTheme): string => {
  const prompt = `以下のインタビューのやり取りを分析し、回答者の発言から各カテゴリ項目への言及を抽出してください。

**重要な指示:**
- 回答者（ユーザー）の発言のみを分析対象とすること
- AIインタビュアーの質問は分析対象外
- 各項目について、回答者の発言に関連する内容があれば評価すること
- 根拠には必ず回答者の実際の発言を「」で囲んで抽出すること
- 言及がない場合は「なし」と記載すること

評価基準:
- ポジティブな言及があれば「1」
- ネガティブな言及があれば「-1」
- 言及がなければ「0」

カテゴリと項目は以下の通りです：
${getAnalysisPrompt(theme).split('カテゴリと項目:')[1].split('**出力形式')[0]}

**出力形式（必ずこの形式のJSONで出力してください）:**
\`\`\`json
{
  "A1": { "evaluation": 0, "evidence": "なし" },
  "A2": { "evaluation": 1, "evidence": "「仕事で成長を感じる」" },
  ...全50項目
}
\`\`\`
`;
  return prompt;
};

export class AnalysisService {
  private client: Anthropic;
  private model = 'claude-sonnet-4-5';

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyzeMessage(
    conversationContext: Message[],
    latestMessage: Message,
    messageIndex: number,
    theme: InterviewTheme = 'life-meaning',
  ): Promise<MessageAnalysis> {
    const prompt = getIncrementalAnalysisPrompt(theme);

    // Create context string with recent conversation
    const contextMessages = conversationContext.slice(-5); // Last 5 messages for context
    const conversationText = contextMessages
      .map(msg => {
        const role = msg.role === 'assistant' ? 'AIインタビュアー' : '回答者';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\n会話の文脈:\n${conversationText}\n\n最新の回答者の発言:\n回答者: ${latestMessage.content}`,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === 'text');
    const responseText = textContent && 'text' in textContent ? textContent.text : '';

    // Extract JSON from code block if present
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : responseText;

    try {
      const parsedData = JSON.parse(jsonText) as {
        [key: string]: { evaluation: 1 | -1 | 0; evidence: string };
      };

      // Transform to MessageAnalysis format
      const categories: MessageAnalysis['categories'] = {};

      for (const [itemId, data] of Object.entries(parsedData)) {
        const categoryId = itemId.charAt(0); // A, B, C, D, or E
        if (!categories[categoryId]) {
          categories[categoryId] = [];
        }
        categories[categoryId].push({
          itemId,
          evaluation: data.evaluation,
          evidence: data.evidence === 'なし' ? '' : data.evidence,
        });
      }

      return {
        messageIndex,
        categories,
      };
    } catch (error) {
      console.error('Failed to parse message analysis result:', error);
      console.error('Response text:', responseText);
      throw new Error('Failed to parse message analysis result');
    }
  }

  async analyzeTranscript(
    transcript: string,
    theme: InterviewTheme = 'life-meaning',
  ): Promise<AnalysisResult> {
    const analysisPrompt = getAnalysisPrompt(theme);
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `${analysisPrompt}\n\nインタビュー結果:\n${transcript}`,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === 'text');
    const responseText = textContent && 'text' in textContent ? textContent.text : '';

    // Extract JSON from code block if present
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonText = jsonMatch ? jsonMatch[1] : responseText;

    try {
      const parsedData = JSON.parse(jsonText) as {
        A: AnalysisItem[];
        B: AnalysisItem[];
        C: AnalysisItem[];
        D: AnalysisItem[];
        E: AnalysisItem[];
      };

      // Transform to AnalysisCategory format
      const categoryNames = getCategoryNames(theme);
      const categories = {
        A: this.createCategory('A', categoryNames.A, parsedData.A),
        B: this.createCategory('B', categoryNames.B, parsedData.B),
        C: this.createCategory('C', categoryNames.C, parsedData.C),
        D: this.createCategory('D', categoryNames.D, parsedData.D),
        E: this.createCategory('E', categoryNames.E, parsedData.E),
      };

      return {
        categories,
        transcript,
      };
    } catch (error) {
      console.error('Failed to parse analysis result:', error);
      console.error('Response text:', responseText);
      throw new Error('Failed to parse analysis result');
    }
  }

  aggregateMessageAnalyses(
    messageAnalyses: MessageAnalysis[],
    theme: InterviewTheme = 'life-meaning',
    transcript: string,
  ): AnalysisResult {
    const categoryNames = getCategoryNames(theme);
    const itemTexts = getItemTexts(theme);

    // Initialize all items with 0 evaluation
    const allItems: { [key: string]: AnalysisItem } = {};
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
      Object.entries(msgAnalysis.categories).forEach(([categoryId, items]) => {
        items.forEach(item => {
          if (allItems[item.itemId]) {
            // Update evaluation (later messages override earlier ones if conflicting)
            if (item.evaluation !== 0) {
              // Keep the most recent evaluation (positive or negative)
              if (allItems[item.itemId].evaluation === 0 || item.evaluation !== 0) {
                allItems[item.itemId].evaluation = item.evaluation;
              }

              if (item.evidence && item.evidence !== 'なし') {
                // Format evidence with proper markers
                const formattedEvidence = item.evidence.startsWith('「')
                  ? `【${item.evidence}と発言】`
                  : `【「${item.evidence}」と発言】`;

                // Add to mentions array with messageIndex
                allItems[item.itemId].mentions.push({
                  messageIndex: msgAnalysis.messageIndex,
                  evaluation: item.evaluation,
                  evidence: formattedEvidence,
                  messageContent: '', // Will be filled later if needed
                });

                // Update combined evidence string (for backward compatibility)
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
    const categorizedItems: { [key: string]: AnalysisItem[] } = {
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
        A: this.createCategory('A', categoryNames.A, categorizedItems.A),
        B: this.createCategory('B', categoryNames.B, categorizedItems.B),
        C: this.createCategory('C', categoryNames.C, categorizedItems.C),
        D: this.createCategory('D', categoryNames.D, categorizedItems.D),
        E: this.createCategory('E', categoryNames.E, categorizedItems.E),
      },
      transcript,
    };
  }

  private createCategory(
    id: string,
    name: string,
    items: AnalysisItem[],
  ): AnalysisCategory {
    const positiveCount = items.filter((item) => item.evaluation === 1).length;
    const negativeCount = items.filter((item) => item.evaluation === -1).length;

    return {
      name,
      items,
      positiveCount,
      negativeCount,
    };
  }
}
