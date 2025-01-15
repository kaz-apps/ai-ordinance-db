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
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: `あなたは条例データベースの検索エキスパートです。
ユーザーの質問に基づいて、最も関連性の高い条例を見つけ出す必要があります。

検索の際は以下の基準で判断してください：

1. 地域の一致:
- 都道府県名や市区町村名が明示的に指定された場合、その地域の条例を優先（スコア0.8-1.0）
- 地域名が部分的にマッチする場合も考慮（例：「京都」で「京都市」「京都府」両方をカバー）
- 地域が明示されていない場合は、関連する可能性のある地域も含める

2. 内容の関連性:
- タイトルや内容に関連するキーワードが含まれる場合、スコアを加算
- カテゴリーが質問の文脈と一致する場合、スコアを加算
- 一般的な条例や基本的な規制も重要な情報として含める

スコアリング基準:
1.0: 完全一致（地域名が完全一致、かつ内容が非常に関連性が高い）
0.8: 地域名が完全一致
0.6: 地域名が部分一致（例：京都市→京都）
0.4: 地域名は一致するが、内容の関連性が低い
0.2: 間接的な関連性がある

返答は以下のような形式のJSONで返してください：
{
  "scores": [0.8, 0.5, 0.3, ...] // 各条例の関連度（0-1の値）
}`
      },
      {
        role: "user",
        content: `質問: ${userInput}
条例データ: ${JSON.stringify(regulations.map(r => ({
  id: r.id,
  prefecture: r.prefecture,
  city: r.city,
  category: r.category,
  title: r.title,
  content: r.content
})))}`
      }
    ],
    temperature: 0.3,
    max_tokens: 1000,
    response_format: { type: "json_object" }
  });

  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    const scores = result.scores || [];
    
    // スコアでソートした条例を返す
    return regulations
      .map((reg, index) => ({
        ...reg,
        relevance: scores[index] || 0
      }))
      .filter(reg => reg.relevance > 0.1) // より低いスコアの結果も含める
      .sort((a, b) => b.relevance - a.relevance);
  } catch (error) {
    console.error("検索結果のパースに失敗:", error);
    return [];
  }
} 