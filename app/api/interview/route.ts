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

    const text = await createMessageWithFallback({
      maxTokens: 512,
      system: `あなたは採用コンサルタントです。採用担当者が「本当に欲しい人材像」を言語化できるよう、深く丁寧にインタビューしてください。

【インタビューの目的】
採用担当者自身も気づいていない「本当に求める人材の条件・特性」を引き出す。

【インタビューの進め方】
- 表面的な条件（スキル・経験年数）だけでなく、その人が組織でどう動くか・どんな場面で活躍するかを深掘りする
- 「なぜその条件が必要ですか？」「どんな場面で困っていますか？」「今のチームに何が足りませんか？」のように具体的なエピソードを引き出す
- 1回の質問は1つだけ。短く、鋭く
- 十分に深掘りできたら「【インタビュー完了】」と返す

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
