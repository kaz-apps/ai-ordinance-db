import OpenAI from 'openai';

// OpenAIクライアントの設定
const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OpenAI APIキーが設定されていません。');
}

export const openai = new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true
});

export async function searchRegulations(userInput: string, regulations: any[]): Promise<any[]> {
  console.log("検索クエリ:", userInput);
  console.log("条例データ件数:", regulations.length);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `あなたは条例データベースの検索エキスパートです。
与えられた条例データの中から、ユーザーの質問に関連する条例を見つけ出し、各条例に関連度スコアを付与してください。

重要な注意事項:
1. 必ず全ての条例に対してスコアを付与してください
2. スコアは0以上1以下の数値である必要があります
3. スコアの配列の長さは、入力された条例データの数（${regulations.length}件）と完全に一致する必要があります

スコアリング基準:
1. 地域名での判定:
- 質問に地域名が含まれる場合、その地域の条例には必ず0.1以上のスコアを付与
- 完全一致（例：京都府→京都府）: 0.8-1.0
- 部分一致（例：京都→京都府/京都市）: 0.6-0.8
- その他の地域: 0.0

2. 内容での判定（地域名一致の場合に加算）:
- 質問のキーワードと条例の内容が一致: +0.2
- 関連するカテゴリーと一致: +0.1
- 質問の意図と条例の目的が一致: +0.1

あなたの回答は必ずJSON形式で、以下の構造に従ってください：
{
  "scores": [
    0.0,  // 1件目のスコア
    0.0,  // 2件目のスコア
    ...   // ${regulations.length}件目まで
  ]
}

注意: 
- 必ずJSONオブジェクトを返してください
- 配列の長さは必ず${regulations.length}である必要があります
- コメントは実際のJSONからは除外してください`
        },
        {
          role: "user",
          content: `以下の質問に対して、条例データの関連度をJSON形式で返してください。

質問: ${userInput}

条例データ（${regulations.length}件）: ${JSON.stringify(regulations.map((r, index) => ({
  index: index,
  prefecture: r.prefecture,
  city: r.city,
  category: r.category,
  title: r.title,
  content: r.content
})))}`
        }
      ],
      temperature: 0,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    console.log("OpenAI レスポンス:", response.choices[0].message.content);

    // レスポンスの検証
    if (!response.choices?.[0]?.message?.content) {
      throw new Error("OpenAIからの応答が空です");
    }

    const responseContent = response.choices[0].message.content;
    
    // JSONの形式を検証
    if (!responseContent.includes('"scores"')) {
      throw new Error("レスポンスにscoresが含まれていません");
    }

    const result = JSON.parse(responseContent);
    
    if (!Array.isArray(result.scores)) {
      throw new Error("scoresが配列ではありません");
    }

    // スコアの数が一致しない場合は、不足分を0で補完
    let scores: number[] = result.scores;
    if (scores.length !== regulations.length) {
      console.warn(`スコアの数（${scores.length}）が条例の数（${regulations.length}）と一致しないため、不足分を0で補完します`);
      scores = Array(regulations.length).fill(0).map((_, i) => scores[i] || 0);
    }

    // スコアの値を検証して正規化
    scores = scores.map((score: number) => {
      if (typeof score !== 'number' || isNaN(score)) return 0;
      return Math.max(0, Math.min(1, score)); // 0-1の範囲に収める
    });
    
    console.log("スコア:", scores);

    // スコアでソートした条例を返す
    const searchResults = regulations
      .map((reg, index) => ({
        ...reg,
        relevance: scores[index]
      }))
      .filter(reg => reg.relevance > 0.01)
      .sort((a, b) => b.relevance - a.relevance);

    console.log("検索結果件数:", searchResults.length);
    
    // 検索結果が0件の場合は、地域名での単純マッチを試みる
    if (searchResults.length === 0) {
      return fallbackSearch(userInput, regulations);
    }

    return searchResults;
  } catch (error) {
    console.error("検索処理でエラーが発生:", error);
    return fallbackSearch(userInput, regulations);
  }
}

// フォールバック検索処理
function fallbackSearch(userInput: string, regulations: any[]): any[] {
  console.log("フォールバック検索を実行");
  
  // 地域名での検索
  const locationKeywords = userInput.match(/(京都|東京|大阪|北海道|沖縄|神戸|横浜|名古屋|福岡|札幌|仙台|広島|福島|千葉|埼玉|神奈川|新潟|富山|石川|福井|山梨|長野|岐阜|静岡|愛知|三重|滋賀|奈良|和歌山|鳥取|島根|岡山|山口|徳島|香川|愛媛|高知|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄)/g) || [];
  
  if (locationKeywords.length > 0) {
    console.log("地域名での検索:", locationKeywords);
    const results = regulations
      .filter(reg => 
        locationKeywords.some(keyword => 
          reg.prefecture.includes(keyword) || reg.city.includes(keyword)
        )
      )
      .map(reg => ({
        ...reg,
        relevance: 0.5
      }));
    
    if (results.length > 0) {
      console.log("地域名での検索結果:", results.length, "件");
      return results;
    }
  }
  
  // キーワードでの検索
  const keywords = userInput.split(/[\s,、　]+/).filter(k => k.length > 1);
  if (keywords.length > 0) {
    console.log("キーワードでの検索:", keywords);
    return regulations
      .filter(reg => 
        keywords.some(keyword => 
          reg.title.includes(keyword) || 
          reg.content.includes(keyword) ||
          reg.category.includes(keyword)
        )
      )
      .map(reg => ({
        ...reg,
        relevance: 0.3
      }));
  }
  
  return [];
} 