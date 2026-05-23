"use client";

import { useState, useRef, useEffect } from "react";

type Screen = "top" | "input" | "interview" | "result";

interface Message {
  role: "ai" | "user";
  content: string;
}

interface Result {
  persona: string;
  must: string;
  want: string;
  ng: string;
  interview_questions: string;
  jd: string;
}

const TABS = [
  { key: "persona", label: "人材像" },
  { key: "must", label: "MUST条件" },
  { key: "want", label: "WANT条件" },
  { key: "ng", label: "NG像" },
  { key: "interview_questions", label: "面接質問" },
  { key: "jd", label: "求人票" },
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>("top");
  const [jobContext, setJobContext] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [activeTab, setActiveTab] = useState("persona");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");
  const [buzzJd, setBuzzJd] = useState("");
  const [buzzGenerating, setBuzzGenerating] = useState(false);
  const [buzzCopied, setBuzzCopied] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  async function startInterview() {
    setLoading(true);
    setMessages([]);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [], jobContext }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages([{ role: "ai", content: data.reply }]);
        setScreen("interview");
      }
    } catch {
      showToast("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!input.trim()) return;
    const newMessages: Message[] = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, jobContext }),
      });
      const data = await res.json();
      const aiReply = data.reply || "";
      if (aiReply) {
        setMessages([...newMessages, { role: "ai", content: aiReply }]);
      }
      if (data.isComplete) {
        await generateResult([...newMessages, { role: "ai", content: aiReply }]);
      }
    } catch {
      showToast("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  async function generateResult(msgs: Message[]) {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs, jobContext }),
      });
      const data = await res.json();
      setResult(data);
      setScreen("result");
    } catch {
      showToast("レポート生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  }

  async function generateBuzzJd() {
    if (!result) return;
    setBuzzGenerating(true);
    try {
      const res = await fetch("/api/buzz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: result.persona,
          must: result.must,
          want: result.want,
          ng: result.ng,
          jobContext,
        }),
      });
      const data = await res.json();
      if (data.buzzJd) setBuzzJd(data.buzzJd);
    } catch {
      showToast("生成に失敗しました");
    } finally {
      setBuzzGenerating(false);
    }
  }

  function copyText() {
    if (!result) return;
    const text = result[activeTab as keyof Result] || "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium z-50">
          {toast}
        </div>
      )}

      {generating && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4" />
          <p className="text-white font-semibold">人材像レポートを生成中...</p>
        </div>
      )}

      <header className="bg-slate-900 text-white px-6 py-1.5 flex justify-between items-center shadow-lg">
        <button
          onClick={() => setScreen("top")}
          className="font-black tracking-widest text-lg bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent hover:opacity-70 transition-opacity"
        >
          SEEK
        </button>
        <p className="text-xs text-slate-400">
          {screen === "top" && "採用担当者のための人材像言語化"}
          {screen === "input" && "採用担当者のための人材像言語化"}
          {screen === "interview" && "インタビュー中"}
          {screen === "result" && "人材像レポート"}
        </p>
      </header>

      {screen === "top" && (
        <div className="min-h-[calc(100vh-44px)] bg-slate-900 text-white">
          <div className="flex flex-col items-center text-center px-8 py-24 max-w-3xl mx-auto">
            <p className="text-xs tracking-widest text-violet-400 uppercase mb-4">For Hiring Managers</p>
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              <span className="block">本当に欲しい人材、</span>
              <span className="block">
                <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">言語化できてる？</span>
              </span>
            </h1>
            <p className="text-slate-400 text-base md:text-lg max-w-xl leading-relaxed mb-10">
              AIとの対話で、採用担当者自身も気づいていない<br />「本当に求める人材像」を引き出す。
            </p>
            <button
              onClick={() => setScreen("input")}
              className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-12 py-4 rounded-2xl text-sm transition-colors"
            >
              無料で試す →
            </button>
          </div>

          <div className="bg-slate-800 px-6 py-16 border-t border-violet-500/20">
            <div className="max-w-2xl mx-auto">
              <p className="text-center text-xs tracking-widest text-slate-400 uppercase mb-10">What SEEK generates</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { title: "人材像", desc: "思考スタイル・行動特性まで言語化" },
                  { title: "MUST/WANT条件", desc: "本当に必要な条件を整理" },
                  { title: "NG像", desc: "合わない人物像を明確化" },
                  { title: "面接質問", desc: "見極めるための行動ベース質問" },
                  { title: "求人票", desc: "TRACEにそのまま使える形式" },
                  { title: "採用精度UP", desc: "ミスマッチを構造的に減らす" },
                ].map((item) => (
                  <div key={item.title} className="bg-slate-700/50 rounded-2xl p-4">
                    <p className="font-bold text-sm mb-1">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                ))}
              </div>
              <div className="text-center mt-10">
                <button
                  onClick={() => setScreen("input")}
                  className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-10 py-4 rounded-2xl text-sm transition-colors"
                >
                  今すぐ試す →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {screen === "input" && (
        <div className="flex items-center justify-center min-h-[calc(100vh-44px)] p-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 w-full max-w-lg">
            <h2 className="text-xl font-bold text-slate-800 mb-1">採用背景を教えてください</h2>
            <p className="text-sm text-slate-500 mb-6">職種や採用背景をざっくり入力するだけでOKです</p>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">職種・採用背景（任意）</label>
              <textarea
                value={jobContext}
                onChange={(e) => setJobContext(e.target.value)}
                rows={4}
                placeholder="例：営業マネージャーを採用したい。チームをまとめられる人が欲しいが、具体的にどんな人がいいか整理できていない。"
                className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-violet-400 transition-colors"
              />
            </div>
            <button
              onClick={startInterview}
              disabled={loading}
              className="w-full mt-6 bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 rounded-2xl text-sm transition-colors disabled:opacity-30"
            >
              {loading ? "準備中..." : "インタビューを開始する →"}
            </button>
          </div>
        </div>
      )}

      {screen === "interview" && (
        <div className="flex flex-col h-[calc(100dvh-44px)] p-4 max-w-2xl mx-auto w-full">
          <div ref={chatRef} className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 overflow-y-auto flex flex-col gap-4 mb-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "ai"
                    ? "bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-sm"
                    : "bg-violet-600 text-white rounded-tr-sm"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              rows={2}
              placeholder="回答を入力..."
              className="flex-1 border border-slate-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-violet-400 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="bg-slate-900 hover:bg-slate-700 text-white rounded-xl px-5 font-semibold text-sm transition-colors disabled:opacity-30"
            >
              送信
            </button>
          </div>
        </div>
      )}

      {screen === "result" && result && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === tab.key
                    ? "bg-violet-600 text-white"
                    : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-xs font-bold text-violet-600 uppercase tracking-widest">
                {TABS.find(t => t.key === activeTab)?.label}
              </p>
              <button
                onClick={copyText}
                className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                {copied ? "✅ コピーした" : "コピー"}
              </button>
            </div>
            <pre className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-sans">
              {result[activeTab as keyof Result] || "生成されませんでした"}
            </pre>
          </div>

          {activeTab === "jd" && (
            <>
              <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 mb-4">
                <p className="text-xs font-bold text-violet-600 mb-1">TRACEと連携する</p>
                <p className="text-xs text-slate-600">上の求人票をコピーして、TRACEに貼り付けるとシミュレーションを即開始できます。</p>
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="text-xs font-bold text-orange-600 mb-0.5">🔥 バズる求人票</p>
                    <p className="text-xs text-slate-500">正直すぎる・ぶっちゃけすぎる求人票でSNSの話題を作る</p>
                  </div>
                  <button
                    onClick={generateBuzzJd}
                    disabled={buzzGenerating}
                    className="text-xs bg-orange-500 hover:bg-orange-400 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30 flex-shrink-0"
                  >
                    {buzzGenerating ? "生成中..." : "生成する"}
                  </button>
                </div>
                {buzzJd && (
                  <div className="mt-3 bg-white rounded-xl p-4 border border-orange-100">
                    <div className="flex justify-end mb-2">
                      <button
                        onClick={() => { navigator.clipboard.writeText(buzzJd); setBuzzCopied(true); setTimeout(() => setBuzzCopied(false), 2000); }}
                        className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {buzzCopied ? "✅ コピーした" : "コピー"}
                      </button>
                    </div>
                    <pre className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-sans">{buzzJd}</pre>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setScreen("input"); setMessages([]); setResult(null); setJobContext(""); }}
              className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-3 font-semibold hover:bg-slate-50 transition-colors text-sm"
            >
              もう一度
            </button>
            <button
              onClick={() => setScreen("interview")}
              className="flex-1 border border-violet-200 text-violet-600 rounded-xl py-3 font-semibold hover:bg-violet-50 transition-colors text-sm"
            >
              会話を確認
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
