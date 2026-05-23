import { NextRequest, NextResponse } from "next/server";
import { createMessageWithFallback } from "../_retry";

export async function POST(req: NextRequest) {
  try {
    const { persona, must, want, ng, jobContext } = await req.json();

    const text = await createMessageWithFallback({
      maxTokens: 1024,
      system: `あなたは採用マーケティングの天才コピーライターです。人材像の本質を守りながら、SNSでバズる・思わずシェアしたくなる求人票を書いてください。`,
      userContent: `【職種・背景】
${jobContext || "未入力"}

【求める人材像】
${persona}

【MUST条件】
${must}

【WANT条件】
${want}

【NG像】
${ng}

上記をもとに、以下の条件でバズる求人票を書いてください：

- 正直すぎる・ぶっちゃけすぎる表現を使う（「正直に言うと〜」「ぶっちゃけ〜」など）
- 一般的な求人票では絶対に書かないようなことを書く（でも嘘はつかない）
- 読んだ人が「え、こんな会社あるの？」「これシェアしたい」と思う内容
- フル在宅の場合は「服装自由（全裸可）」など思い切った表現もOK
- でも求める人材像の本質は守る
- 300〜400字

<BUZZ_JD>
バズる求人票
</BUZZ_JD>`,
    });

    const match = text.match(/<BUZZ_JD>(.*?)<\/BUZZ_JD>/s);
    const buzzJd = match ? match[1].trim() : text.trim();

    return NextResponse.json({ buzzJd });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
