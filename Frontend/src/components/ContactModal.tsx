import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Check, User, Mail, Phone, Globe, MessageSquare } from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: string;
}

const smoothEase = [0.22, 1, 0.36, 1] as const;export default function ContactModal({ isOpen, onClose, context }: ContactModalProps) {
  const [firstName, setFirstName]   = useState("");
  const [lastName, setLastName]     = useState("");
  const [email, setEmail]           = useState("");
  const [phone, setPhone]           = useState("");
  const [website, setWebsite]       = useState("");
  const [problem, setProblem]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [sent, setSent]             = useState(false);

  const reset = () => {
    setFirstName(""); setLastName(""); setEmail("");
    setPhone(""); setWebsite(""); setProblem("");
    setSent(false);
  };

  const handleClose = () => { onClose(); setTimeout(reset, 300); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1300));
    setLoading(false);
    setSent(true);
  };

  const inputCls =
    "w-full rounded-lg border border-white/[0.09] bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all duration-150";

  const labelCls = "block text-[11px] font-medium text-white/45 mb-1.5";

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
            style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.07), 0 32px 64px rgba(0,0,0,0.7)" }}
          >
            {/* ── LEFT: Form ─────────────────────────────────── */}
            <div className="flex-1 min-w-0 bg-[#0e0e14] px-8 py-8 overflow-y-auto max-h-[90vh]">
              {/* close */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              <AnimatePresence mode="wait">
                {sent ? (
                  <motion.div
                    key="sent"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center gap-4 py-16 text-center"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                      <Check className="w-6 h-6 text-emerald-400" />
                    </div>
                    <p className="text-lg font-bold text-white">Demo request sent</p>
                    <p className="text-sm text-white/40 max-w-xs">
                      We'll be in touch within 24 hours to confirm your slot.
                    </p>
                    <button onClick={handleClose} className="mt-2 text-xs text-white/30 hover:text-white/60 transition-colors">
                      Close
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {/* header */}
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/30 mb-3">
                      {context ? `Starox Teams · ${context}` : "Starox Teams"}
                    </p>
                    <h2 className="text-2xl font-bold text-white leading-tight mb-1.5">
                      Book a personalized<br />product demo
                    </h2>
                    <p className="text-xs leading-5 text-white/35 mb-7">
                      Meet with our team to see how Starox can accelerate your workflow — tailored to your use case.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* name row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>First name <span className="text-white/25">*</span></label>
                          <div className="relative">
                            <input
                              type="text" placeholder="John" value={firstName}
                              onChange={(e) => setFirstName(e.target.value)} required
                              className={inputCls}
                            />
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>Last name <span className="text-white/25">*</span></label>
                          <input
                            type="text" placeholder="Doe" value={lastName}
                            onChange={(e) => setLastName(e.target.value)} required
                            className={inputCls}
                          />
                        </div>
                      </div>

                      {/* work email */}
                      <div>
                        <label className={labelCls}>Work email <span className="text-white/25">*</span></label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
                          <input
                            type="email" placeholder="e.g. john@company.com" value={email}
                            onChange={(e) => setEmail(e.target.value)} required
                            className={`${inputCls} pl-9`}
                          />
                        </div>
                      </div>

                      {/* phone */}
                      <div>
                        <label className={labelCls}>Phone number</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
                          <input
                            type="tel" placeholder="Enter phone number" value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className={`${inputCls} pl-9`}
                          />
                        </div>
                      </div>

                      {/* company website */}
                      <div>
                        <label className={labelCls}>Company website <span className="text-white/25">*</span></label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 pointer-events-none" />
                          <input
                            type="text" placeholder="e.g. company.com" value={website}
                            onChange={(e) => setWebsite(e.target.value)} required
                            className={`${inputCls} pl-9`}
                          />
                        </div>
                      </div>

                      {/* problem */}
                      <div>
                        <label className={labelCls}>What are you trying to solve? <span className="text-white/25">*</span></label>
                        <div className="relative">
                          <MessageSquare className="absolute left-3 top-3 w-3.5 h-3.5 text-white/20 pointer-events-none" />
                          <textarea
                            rows={4} required
                            placeholder="We need to streamline our design approval process and reduce time to deployment..."
                            value={problem}
                            onChange={(e) => setProblem(e.target.value)}
                            className={`${inputCls} pl-9 resize-none`}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-white text-[#09090e] py-2.5 text-sm font-semibold transition-all duration-200 hover:bg-white/90 disabled:opacity-60 mt-1"
                      >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {loading ? "Submitting…" : "Submit"}
                      </button>
                      <p className="text-[10px] text-white/20 text-center">* Required field</p>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>


          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
