import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, ChevronDown, Lightbulb } from "lucide-react";

const QUICK_PROMPTS = [
  "Why is this ranked first?",
  "What should we prioritize next?",
  "Summarize customer feedback.",
  "Show supporting evidence.",
  "Generate roadmap.",
  "Compare with last month.",
  "What are the biggest risks?",
  "Should we build this?",
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AskPmx() {
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi, I'm PMX. Ask me anything about your product — what to build, what problems exist, or what to prioritize next." }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;
    const userMsg: Message = { role: "user", content };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Simulated response — replace with real API call
    await new Promise(r => setTimeout(r, 1200));
    const replies: Record<string, string> = {
      "what should we prioritize next?": "Based on your current RICE scores, I recommend focusing on the top-ranked opportunity first. It has the highest user impact and lowest effort ratio.",
      "summarize customer feedback.": "Your evidence database shows 3 main themes: navigation confusion (67% of signals), slow load times (23%), and missing mobile features (10%).",
      "what are the biggest risks?": "Your top critical risks are: 1) High checkout drop-off rate affecting revenue, 2) Performance issues on mobile devices, 3) Missing onboarding flow.",
    };
    const reply = replies[content.toLowerCase()] || "I've analyzed your product data. The most impactful next step based on your current evidence, problems, and opportunities would be to address the top critical issue first, then build from the highest-RICE opportunity.";
    setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    setLoading(false);
  };

  return (
    <>
      {/* Floating trigger */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary hover:bg-primary/90 px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ask PMX
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-5 right-5 z-40 w-[380px] rounded-2xl border border-border bg-card shadow-2xl shadow-black/40 flex flex-col overflow-hidden"
            style={{ maxHeight: "520px" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/80 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Ask PMX</p>
                  <p className="text-[9px] text-muted-foreground">AI Product Manager</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin min-h-0" style={{ maxHeight: "320px" }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground border border-border/50"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted border border-border/50 rounded-xl px-3 py-2 text-xs flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-muted-foreground">Analyzing...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick prompts */}
            <div className="px-3 py-2 border-t border-border/30 flex gap-1.5 overflow-x-auto scrollbar-none">
              {QUICK_PROMPTS.slice(0, 4).map(p => (
                <button key={p} onClick={() => sendMessage(p)}
                  className="shrink-0 text-[9px] font-medium text-muted-foreground border border-border/50 rounded-full px-2.5 py-1 hover:bg-muted hover:text-foreground transition-all">
                  {p}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-1">
              <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage(input)}
                  placeholder="Ask anything about your product..."
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
                  className="p-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 transition-all">
                  <Send className="h-3 w-3" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
