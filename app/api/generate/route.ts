import { NextRequest, NextResponse } from "next/server";
import { createMessageWithFallback } from "../_retry";

export async function POST(req: NextRequest) {
  try {
    const { messages, jobContext } = await req.json();

    const interviewLog = messages
      .map((m: { role: string; content: string }) =>
        `${m.role === "ai" ? "質問" : "回答"}：${m.content}`
      )
      .join("\n\n");

    const text = await createMessageWithFallback({
      maxTokens: 2048,
      system: `あなたは採用コンサルタントです。インタビューログをもとに、採用担当者が本当に求める人材像を分析・言語化してください。`,
      userContent: `【職種・背景】
${jobContext || "未入力"}

【インタビューログ】
${interviewLog}

以下のタグで出力してください：

<PERSONA>
求める人材像（3〜5文）
表面的なスキルではなく、思考スタイル・行動特性・価値観レベルで描写する
</PERSONA>

<MUST>
絶対に必要な条件（箇条書き3〜5項目）
</MUST>

<WANT>
あれば望ましい条件（箇条書き3〜5項目）
</WANT>

<NG>
この組織・ポジションに合わない人物像（箇条書き2〜3項目）
</NG>

<INTERVIEW_QUESTIONS>
この人材像を見極めるための面接質問（5問、番号付き）
行動ベースの質問にする
</INTERVIEW_QUESTIONS>

<JD>
上記をもとに作成した求人票（300〜400字）
そのままTRACEに貼り込める形式で
</JD>`,
    });

    const extract = (tag: string) => {
      const match = text.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "s"));
      return match ? match[1].trim() : "";
    };

    return NextResponse.json({
      persona: extract("PERSONA"),
      must: extract("MUST"),
      want: extract("WANT"),
      ng: extract("NG"),
      interview_questions: extract("INTERVIEW_QUESTIONS"),
      jd: extract("JD"),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
