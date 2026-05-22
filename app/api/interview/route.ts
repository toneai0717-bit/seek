import { NextRequest, NextResponse } from "next/server";
import { createMessageWithFallback } from "../_retry";

export async function POST(req: NextRequest) {
  try {
    const { messages, jobContext } = await req.json();

    const history = messages
      .map((m: { role: string; content: string }) =>
        `${m.role === "ai" ? "AI" : "採用担当者"}：${m.content}`
      )
      .join("\n\n");

    const rallyCount = Math.floor(messages.length / 2);
    const forceFinish = rallyCount >= 15;

    const text = await createMessageWithFallback({
      maxTokens: 512,
      system: `あなたは採用コンサルタントです。採用担当者が「本当に欲しい人材像」を言語化できるよう、深く丁寧にインタビューしてください。

【インタビューの目的】
採用担当者自身も気づいていない「本当に求める人材の条件・特性」を引き出す。

【インタビューの進め方】
- 表面的な条件（スキル・経験年数）だけでなく、その人が組織でどう動くか・どんな場面で活躍するかを深掘りする
- 「なぜその条件が必要ですか？」「どんな場面で困っていますか？」「今のチームに何が足りませんか？」のように具体的なエピソードを引き出す
- 1回の質問は1つだけ。短く、鋭く

【完了条件】
以下の3つが揃ったと判断したら「【インタビュー完了】」と返す。揃っていなければ引き続き深掘りする。
1. 人材像：求める人物の思考スタイル・行動特性・価値観レベルで具体像が見えている
2. 採用条件：MUSTとWANTの条件が区別できている（スキル・経験・特性など）
3. 組織課題：なぜ今採用が必要なのか、チームの課題や背景が見えている

${forceFinish ? "【重要】十分な深掘りが完了しました。必ず「【インタビュー完了】」を返してください。" : `現在${rallyCount}往復目。3つの条件が揃ったと感じたら積極的に完了してよい。揃っていない軸があれば引き続き深掘りする。`}

【現在の文脈】
${jobContext ? `職種・背景：${jobContext}` : "まだ情報なし"}

【これまでの会話】
${history || "まだ会話なし"}`,
      userContent: history ? "次の質問をしてください" : "インタビューを開始してください。最初の質問をしてください。",
    });

    const isComplete = text.includes("【インタビュー完了】");
    const reply = text.replace("【インタビュー完了】", "").trim();

    return NextResponse.json({ reply, isComplete });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
