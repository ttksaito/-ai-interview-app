import Anthropic from '@anthropic-ai/sdk';
import { AnalysisResult, AnalysisCategory, AnalysisItem, AnalysisEvidence, Message } from '../types';

// Category definitions
const CATEGORIES = {
  A: {
    name: '仕事への意味・充実感',
    items: [
      'A1: 自分の仕事は、社会に何らかの形で役立っていると感じる。',
      'A2: 仕事を通じて、自分が成長していると感じることがある。',
      'A3: 毎日の仕事に、やりがいを見出せていると思う。',
      'A4: 自分が仕事に費やしている時間は、意味のある使い方だと感じる。',
      'A5: 仕事の中に、自分が大切にしている価値観と一致する部分があると思う。',
      'A6: 職場での経験が、自分という人間を形づくる一部になっていると感じる。',
      'A7: 仕事上の小さな達成でも、自分にとって喜びになることがある。',
      'A8: 自分が取り組んでいる仕事には、続けるだけの意味があると感じる。',
      'A9: 働くことは、単なる収入を得る手段以上の何かだと思う。',
      'A10: 仕事を通じて、自分の存在意義を感じる瞬間がある。',
    ],
  },
  B: {
    name: '人間関係・つながりの感覚',
    items: [
      'B1: 自分の周りには、困ったときに支えてくれると感じる人がいる。',
      'B2: 誰かの役に立てたと感じるとき、生きていてよかったと思う。',
      'B3: 人との関わりの中に、自分の生きがいの一部があると感じる。',
      'B4: 自分のことを理解してくれていると感じる人が、身の回りにいる。',
      'B5: 誰かに感謝されたとき、自分の存在に意味があると感じる。',
      'B6: 他者とつながっているという感覚が、自分の心の支えになっている。',
      'B7: 自分が関わることで、他者の生活や気持ちが少しでもよくなっていると感じることがある。',
      'B8: 孤独を感じることなく日々を過ごせていると思う。',
      'B9: 自分の存在が、誰かにとってプラスになっていると感じる。',
      'B10: 人との関係の中に、人生の喜びを感じることがある。',
    ],
  },
  C: {
    name: '自己成長・学びへの志向',
    items: [
      'C1: 自分はまだ成長できる余地があると感じている。',
      'C2: 新しいことを学ぶことに、意欲を感じることがある。',
      'C3: 自分の可能性は、今後も広がっていくと思う。',
      'C4: 過去の失敗や困難は、自分を成長させてくれたと感じる。',
      'C5: 自分の強みや得意なことを、活かせる場面があると感じる。',
      'C6: 日々の経験から、何かしら学び取れることがあると思う。',
      'C7: 自分が目指したい姿や、なりたい自分のイメージを持っている。',
      'C8: 挑戦することに対して、不安よりも期待の方が大きいと感じることがある。',
      'C9: 自分の知識やスキルが高まっていると感じることがある。',
      'C10: 努力を続けることに、意味を感じている。',
    ],
  },
  D: {
    name: '人生全体の意味・目的感',
    items: [
      'D1: 自分の人生には、意味や目的があると感じている。',
      'D2: 今の自分の生き方は、自分らしいと感じる。',
      'D3: 将来に対して、漠然とでも希望を持てている。',
      'D4: 自分が何のために生きているか、感じられることがある。',
      'D5: 自分の人生を振り返ったとき、意味のある時間を過ごしてきたと思える。',
      'D6: 今この瞬間、生きていることに価値を感じる。',
      'D7: 自分の価値観にそった生き方ができていると感じる。',
      'D8: 人生において、自分なりの優先順位や軸を持っていると思う。',
      'D9: 今後の人生に対して、楽しみにしていることがある。',
      'D10: 自分の生き方を、自分自身で選んでいるという感覚がある。',
    ],
  },
  E: {
    name: '日常の喜び・主観的幸福感',
    items: [
      'E1: 日常の中に、小さな喜びを見つけることができると感じる。',
      'E2: 今の自分の生活に、全体として満足感を感じている。',
      'E3: 朝目覚めたとき、今日という一日に前向きな気持ちになれることがある。',
      'E4: 自分の生活の中に、楽しみにしていることがある。',
      'E5: 心が穏やかでいられる時間が、日常の中にあると感じる。',
      'E6: 自分の感情や気持ちを、大切にできていると思う。',
      'E7: 趣味・関心事・好きなことが、自分の生活を豊かにしていると感じる。',
      'E8: 自分が「いい一日だった」と感じる日が、ある程度あると思う。',
      'E9: 自分はおおむね幸せな状態にあると感じる。',
      'E10: 今の自分の生き方を、肯定的に受け止めている。',
    ],
  },
};

const ANALYSIS_PROMPT = `以下の回答者の発言を分析し、指定されたカテゴリの各項目について、
回答者の言及状況を評価してください。

評価基準:
- ポジティブな言及があれば「1」
- ネガティブな言及があれば「-1」
- 言及がなければ「0」

**重要な指示:**
- 根拠には必ず回答者の実際の発言を忠実に抽出すること
- 根拠がある場合は、「【「回答者の実際の発言」と発言】」という形式で記載すること
- 言及がない場合は「言及なし」と記載すること`;

export class AnalysisService {
  private client: Anthropic;
  private model = 'claude-sonnet-4-5';

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000,
  ): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if it's a rate limit error
        const isRateLimit = error.message?.includes('rate_limit') || error.status === 429;

        if (!isRateLimit || attempt === maxRetries - 1) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  /**
   * Analyze a single message for a specific category with retry logic
   */
  async analyzeCategoryForMessage(
    messageContent: string,
    categoryId: 'A' | 'B' | 'C' | 'D' | 'E',
  ): Promise<{ id: string; item: string; evaluation: 0 | 1 | -1; evidence: string }[]> {
    return this.retryWithBackoff(async () => {
      const category = CATEGORIES[categoryId];
      const itemsText = category.items.join('\n');

      const prompt = [
        ANALYSIS_PROMPT,
        '',
        `【${categoryId}】${category.name}`,
        itemsText,
        '',
        '**出力形式（必ずこの形式のJSONで出力してください）:**',
        '```json',
        '[',
        `  { "id": "${categoryId}1", "item": "項目の要約", "evaluation": 0, "evidence": "言及なし" },`,
        `  { "id": "${categoryId}2", "item": "項目の要約", "evaluation": 1, "evidence": "【「実際の発言」と発言】" }`,
        ']',
        '```',
        '',
        '回答者の発言:',
        messageContent,
      ].join('\n');

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });

      const textContent = response.content.find((block) => block.type === 'text');
      const responseText = textContent && 'text' in textContent ? textContent.text : '';

      // Extract JSON from code block
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;

      try {
        return JSON.parse(jsonText);
      } catch (error) {
        console.error('Failed to parse category analysis:', error);
        console.error('Response text:', responseText);
        throw new Error(`Failed to parse category ${categoryId} analysis`);
      }
    });
  }

  /**
   * Process promises in batches with limited concurrency
   */
  private async processBatch<T>(
    items: T[],
    processor: (item: T) => Promise<any>,
    concurrency: number,
  ): Promise<any[]> {
    const results: any[] = [];
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + concurrency < items.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    return results;
  }

  /**
   * Analyze a single message across all categories with full conversation context
   */
  async analyzeSingleMessage(
    chatHistory: Message[],
    messageIndex: number,
  ): Promise<{
    messageIndex: number;
    messageContent: string;
    categories: {
      [categoryId: string]: Array<{
        id: string;
        item: string;
        evaluation: 0 | 1 | -1;
        evidence: string;
      }>;
    };
  }> {
    // Get user messages (excluding the initial prompt)
    const userMessages = chatHistory.filter(
      (msg) => msg.role === 'user' && msg.content !== 'インタビューを開始してください。'
    );

    if (messageIndex < 0 || messageIndex >= userMessages.length) {
      throw new Error('Invalid messageIndex');
    }

    const targetMessage = userMessages[messageIndex];

    console.log(`Analyzing message ${messageIndex + 1}/${userMessages.length} with full context`);

    // Build conversation context up to this message
    const contextMessages: Message[] = [];
    let userCount = 0;

    for (const msg of chatHistory) {
      if (msg.content === 'インタビューを開始してください。') {
        continue;
      }

      // Include messages up to and including the target message
      contextMessages.push(msg);

      if (msg.role === 'user') {
        if (userCount === messageIndex) {
          break;
        }
        userCount++;
      }
    }

    // Create conversation context string
    const conversationContext = contextMessages
      .map((msg) => {
        const role = msg.role === 'assistant' ? 'AI インタビュアー' : '回答者';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');

    // Create analysis tasks for all 5 categories
    const categoryIds = ['A', 'B', 'C', 'D', 'E'] as const;
    const categoryResults: any = {};

    // Process categories with limited concurrency (2 at a time)
    for (let i = 0; i < categoryIds.length; i += 2) {
      const batch = categoryIds.slice(i, i + 2);
      const batchResults = await Promise.all(
        batch.map(async (categoryId) => {
          const results = await this.analyzeCategoryWithContext(
            conversationContext,
            targetMessage.content,
            categoryId
          );
          return { categoryId, results };
        }),
      );

      for (const { categoryId, results } of batchResults) {
        categoryResults[categoryId] = results;
      }

      // Small delay between batches
      if (i + 2 < categoryIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return {
      messageIndex,
      messageContent: targetMessage.content,
      categories: categoryResults,
    };
  }

  /**
   * Analyze a category for a message with conversation context
   */
  async analyzeCategoryWithContext(
    conversationContext: string,
    targetMessageContent: string,
    categoryId: 'A' | 'B' | 'C' | 'D' | 'E',
  ): Promise<{ id: string; item: string; evaluation: 0 | 1 | -1; evidence: string }[]> {
    return this.retryWithBackoff(async () => {
      const category = CATEGORIES[categoryId];
      const itemsText = category.items.join('\n');

      const prompt = [
        ANALYSIS_PROMPT,
        '',
        `【${categoryId}】${category.name}`,
        itemsText,
        '',
        '**会話の文脈:**',
        conversationContext,
        '',
        '**【重要】上記の会話の流れを踏まえて、以下の最新の回答のみを分析してください:**',
        `「${targetMessageContent}」`,
        '',
        '**【必須】根拠を記載する際の注意:**',
        '- 根拠には必ず上記の最新の回答「' + targetMessageContent + '」からのみ引用すること',
        '- 会話の文脈は参考情報であり、そこから引用してはいけません',
        '- 最新の回答に言及がない場合は、必ず「言及なし」と記載すること',
        '',
        '**出力形式（必ずこの形式のJSONで出力してください）:**',
        '```json',
        '[',
        `  { "id": "${categoryId}1", "item": "項目の要約", "evaluation": 0, "evidence": "言及なし" },`,
        `  { "id": "${categoryId}2", "item": "項目の要約", "evaluation": 1, "evidence": "【「最新の回答からの実際の発言」と発言】" }`,
        ']',
        '```',
      ].join('\n');

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });

      const textContent = response.content.find((block) => block.type === 'text');
      const responseText = textContent && 'text' in textContent ? textContent.text : '';

      // Extract JSON from code block
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;

      try {
        return JSON.parse(jsonText);
      } catch (error) {
        console.error('Failed to parse category analysis:', error);
        console.error('Response text:', responseText);
        throw new Error(`Failed to parse category ${categoryId} analysis`);
      }
    });
  }

  /**
   * Aggregate partial analysis results into a final AnalysisResult
   */
  aggregatePartialResults(
    partialResults: Array<{
      messageIndex: number;
      messageContent: string;
      categories: {
        [categoryId: string]: Array<{
          id: string;
          item: string;
          evaluation: 0 | 1 | -1;
          evidence: string;
        }>;
      };
    }>,
    allMessages: Message[],
  ): AnalysisResult {
    console.log(`Aggregating ${partialResults.length} partial analysis results`);

    // Initialize all items
    const itemMap = new Map<string, AnalysisItem>();

    for (const [categoryId, category] of Object.entries(CATEGORIES)) {
      category.items.forEach((itemText, idx) => {
        const itemId = `${categoryId}${idx + 1}`;
        itemMap.set(itemId, {
          id: itemId,
          item: itemText,
          mentions: [],
          evaluation: 0,
          evidence: '言及なし',
        });
      });
    }

    // Aggregate mentions from all partial results
    for (const partial of partialResults) {
      for (const [categoryId, results] of Object.entries(partial.categories)) {
        for (const result of results) {
          if (result.evaluation !== 0) {
            const item = itemMap.get(result.id);
            if (item) {
              item.mentions.push({
                messageIndex: partial.messageIndex,
                evaluation: result.evaluation as 1 | -1,
                evidence: result.evidence,
                messageContent: partial.messageContent,
              });
            }
          }
        }
      }
    }

    // Calculate overall evaluation and combined evidence for each item
    for (const item of itemMap.values()) {
      if (item.mentions.length > 0) {
        const hasPositive = item.mentions.some((m) => m.evaluation === 1);
        const hasNegative = item.mentions.some((m) => m.evaluation === -1);
        item.evaluation = hasPositive ? 1 : hasNegative ? -1 : 0;
        item.evidence = item.mentions.map((m) => m.evidence).join(' / ');
      }
    }

    // Build category structure
    const categories = {
      A: this.createCategoryFromItems('A', '仕事への意味・充実感', itemMap),
      B: this.createCategoryFromItems('B', '人間関係・つながりの感覚', itemMap),
      C: this.createCategoryFromItems('C', '自己成長・学びへの志向', itemMap),
      D: this.createCategoryFromItems('D', '人生全体の意味・目的感', itemMap),
      E: this.createCategoryFromItems('E', '日常の喜び・主観的幸福感', itemMap),
    };

    return {
      categories,
      transcript: allMessages
        .filter((msg) => msg.content !== 'インタビューを開始してください。')
        .map((msg) => {
          const role = msg.role === 'assistant' ? 'AI インタビュアー' : '回答者';
          return `${role}: ${msg.content}`;
        })
        .join('\n\n'),
    };
  }

  /**
   * Analyze all user messages across all categories with controlled parallel processing
   */
  async analyzeMessagesBatch(messages: Message[]): Promise<AnalysisResult> {
    // Extract user messages (excluding the initial prompt)
    const userMessages = messages
      .map((msg, index) => ({ msg, index }))
      .filter(({ msg }) => msg.role === 'user' && msg.content !== 'インタビューを開始してください。');

    console.log(`Analyzing ${userMessages.length} user messages across 5 categories`);

    // Create all analysis tasks
    const analysisTasks: Array<{
      msg: Message;
      index: number;
      categoryId: 'A' | 'B' | 'C' | 'D' | 'E';
    }> = [];

    for (const { msg, index } of userMessages) {
      for (const categoryId of ['A', 'B', 'C', 'D', 'E'] as const) {
        analysisTasks.push({ msg, index, categoryId });
      }
    }

    console.log(`Total API calls: ${analysisTasks.length}, processing with concurrency limit of 3`);

    // Process with limited concurrency (3 at a time to avoid rate limits)
    const allAnalyses = await this.processBatch(
      analysisTasks,
      async (task) => {
        const results = await this.analyzeCategoryForMessage(task.msg.content, task.categoryId);
        return {
          messageIndex: task.index,
          categoryId: task.categoryId,
          results,
          messageContent: task.msg.content,
        };
      },
      3, // Max 3 concurrent requests
    );

    // Aggregate results by item
    const itemMap = new Map<string, AnalysisItem>();

    // Initialize all items
    for (const [categoryId, category] of Object.entries(CATEGORIES)) {
      category.items.forEach((itemText, idx) => {
        const itemId = `${categoryId}${idx + 1}`;
        itemMap.set(itemId, {
          id: itemId,
          item: itemText,
          mentions: [],
          evaluation: 0,
          evidence: '言及なし',
        });
      });
    }

    // Aggregate mentions from all analyses
    for (const analysis of allAnalyses) {
      for (const result of analysis.results) {
        if (result.evaluation !== 0) {
          const item = itemMap.get(result.id);
          if (item) {
            item.mentions.push({
              messageIndex: analysis.messageIndex,
              evaluation: result.evaluation as 1 | -1,
              evidence: result.evidence,
              messageContent: analysis.messageContent,
            });
          }
        }
      }
    }

    // Calculate overall evaluation and combined evidence for each item
    for (const item of itemMap.values()) {
      if (item.mentions.length > 0) {
        // If any positive mention, mark as positive; otherwise if any negative, mark as negative
        const hasPositive = item.mentions.some((m) => m.evaluation === 1);
        const hasNegative = item.mentions.some((m) => m.evaluation === -1);
        item.evaluation = hasPositive ? 1 : hasNegative ? -1 : 0;

        // Combine all evidence
        item.evidence = item.mentions.map((m) => m.evidence).join(' / ');
      }
    }

    // Build category structure
    const categories = {
      A: this.createCategoryFromItems('A', '仕事への意味・充実感', itemMap),
      B: this.createCategoryFromItems('B', '人間関係・つながりの感覚', itemMap),
      C: this.createCategoryFromItems('C', '自己成長・学びへの志向', itemMap),
      D: this.createCategoryFromItems('D', '人生全体の意味・目的感', itemMap),
      E: this.createCategoryFromItems('E', '日常の喜び・主観的幸福感', itemMap),
    };

    return {
      categories,
      transcript: messages
        .filter((msg) => msg.content !== 'インタビューを開始してください。')
        .map((msg) => {
          const role = msg.role === 'assistant' ? 'AI インタビュアー' : '回答者';
          return `${role}: ${msg.content}`;
        })
        .join('\n\n'),
    };
  }

  private createCategoryFromItems(
    categoryId: string,
    name: string,
    itemMap: Map<string, AnalysisItem>,
  ): AnalysisCategory {
    const items: AnalysisItem[] = [];
    for (let i = 1; i <= 10; i++) {
      const itemId = `${categoryId}${i}`;
      const item = itemMap.get(itemId);
      if (item) {
        items.push(item);
      }
    }

    const positiveCount = items.filter((item) => item.evaluation === 1).length;
    const negativeCount = items.filter((item) => item.evaluation === -1).length;

    return {
      name,
      items,
      positiveCount,
      negativeCount,
    };
  }

  // Keep old method for backward compatibility (deprecated)
  async analyzeTranscript(transcript: string): Promise<AnalysisResult> {
    console.warn('analyzeTranscript is deprecated, use analyzeMessagesBatch instead');
    // For now, just throw an error directing to use the new method
    throw new Error('This method is deprecated. Use analyzeMessagesBatch instead.');
  }
}
