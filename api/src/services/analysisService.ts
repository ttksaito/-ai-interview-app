import Anthropic from '@anthropic-ai/sdk';
import { AnalysisResult, AnalysisCategory, AnalysisItem } from '../types';

const ANALYSIS_PROMPT = `以下のインタビュー結果を分析し、5つのカテゴリ（A〜E）の各10項目について、
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

export class AnalysisService {
  private client: Anthropic;
  private model = 'claude-sonnet-4-5';

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async analyzeTranscript(transcript: string): Promise<AnalysisResult> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `${ANALYSIS_PROMPT}\n\nインタビュー結果:\n${transcript}`,
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
      const categories = {
        A: this.createCategory('A', '仕事への意味・充実感', parsedData.A),
        B: this.createCategory('B', '人間関係・つながりの感覚', parsedData.B),
        C: this.createCategory('C', '自己成長・学びへの志向', parsedData.C),
        D: this.createCategory('D', '人生全体の意味・目的感', parsedData.D),
        E: this.createCategory('E', '日常の喜び・主観的幸福感', parsedData.E),
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
