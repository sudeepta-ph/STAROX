import { useState, useRef, useEffect, MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RefreshCw,
  PlusCircle,
  Eye,
  EyeOff,
  User,
  CheckCircle,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Send,
  Trash2,
  GitPullRequest
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Annotation {
  id: string;
  title: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low" | "suggestion" | "improvement";
  confidence: number;
  severity: "critical" | "high" | "medium" | "low" | "info";
  description: string;
  reasoning: string;
  recommendation: string;
  expectedImpact: string;
  affectedComponent?: string;
  x: number;
  y: number;
  isResolved: boolean;
  comments: Array<{
    id: string;
    author: string;
    avatar?: string;
    content: string;
    createdAt: string | Date;
  }>;
}

interface Screenshot {
  id: string;
  title: string;
  dataUrl: string;
  annotations: Annotation[];
}

interface Props {
  screenshot: Screenshot;
  projectId: string;
  activeProjectId: string;
  onRefresh: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500 text-white border-red-600",
  high: "bg-orange-500 text-white border-orange-600",
  medium: "bg-yellow-500 text-black border-yellow-600",
  low: "bg-blue-500 text-white border-blue-600",
  suggestion: "bg-purple-500 text-white border-purple-600",
  improvement: "bg-green-500 text-white border-green-600"
};

const DOT_GLOWS: Record<string, string> = {
  critical: "rgba(239, 68, 68, 0.4)",
  high: "rgba(249, 115, 22, 0.4)",
  medium: "rgba(234, 179, 8, 0.4)",
  low: "rgba(59, 130, 246, 0.4)",
  suggestion: "rgba(168, 85, 247, 0.4)",
  improvement: "rgba(34, 197, 94, 0.4)"
};

export default function ScreenshotCanvas({ screenshot, activeProjectId, onRefresh }: Props) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Viewport states
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPins, setShowPins] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [annToDelete, setAnnToDelete] = useState<string | null>(null);

  // Active Annotation details
  const [selectedAnn, setSelectedAnn] = useState<Annotation | null>(null);
  const [commentText, setCommentText] = useState("");
  const [addingPin, setAddingPin] = useState<null | { x: number; y: number }>(null);

  // Manual pin fields
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("UX");
  const [newPriority, setNewPriority] = useState<any>("medium");

  const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

  // Re-bind selected annotation details if screenshot updates
  useEffect(() => {
    if (selectedAnn) {
      const refreshed = screenshot.annotations.find(a => a.id === selectedAnn.id);
      if (refreshed) {
        setSelectedAnn(refreshed);
      } else {
        setSelectedAnn(null);
      }
    }
  }, [screenshot]);

  // Mouse pan handlers
  const handleMouseDown = (e: MouseEvent) => {
    if (addingPin) return;
    if ((e.target as HTMLElement).closest(".pin-element") || (e.target as HTMLElement).closest(".controls-bar")) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Click on image to trigger manual pin placement
  const handleImageClick = (e: MouseEvent) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    
    // Calculate percentage coordinates normalized
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setAddingPin({ x, y });
    setNewTitle("");
    setNewDesc("");
  };

  // Submit manual pin to database
  const handleSaveManualPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingPin || !newTitle.trim() || !newDesc.trim()) return;

    try {
      const headers = { "Content-Type": "application/json" };
      const res = await fetch(`${API_URL}/pmx/screenshot-intelligence/${activeProjectId}/annotations`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          screenshotId: screenshot.id,
          title: newTitle,
          description: newDesc,
          category: newCategory,
          priority: newPriority,
          x: addingPin.x,
          y: addingPin.y
        })
      });

      const json = await res.json();
      if (json.success) {
        toast({
          title: "Feedback pinned",
          description: `Logged manual comment at coordinate: (${addingPin.x.toFixed(1)}%, ${addingPin.y.toFixed(1)}%).`
        });
        setAddingPin(null);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit comment reply
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnn || !commentText.trim()) return;

    try {
      const headers = { "Content-Type": "application/json" };
      const res = await fetch(`${API_URL}/pmx/screenshot-intelligence/${activeProjectId}/annotations/${selectedAnn.id}/comments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          author: "Product Manager",
          content: commentText
        })
      });

      const json = await res.json();
      if (json.success) {
        setCommentText("");
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle resolved status
  const handleToggleResolve = async () => {
    if (!selectedAnn) return;
    const newResolvedState = !selectedAnn.isResolved;

    try {
      const headers = { "Content-Type": "application/json" };
      const res = await fetch(`${API_URL}/pmx/screenshot-intelligence/${activeProjectId}/annotations/${selectedAnn.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ isResolved: newResolvedState })
      });

      const json = await res.json();
      if (json.success) {
        toast({
          title: newResolvedState ? "Issue Resolved" : "Issue Reopened",
          description: `Feedback status has been updated.`
        });
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete annotation
  const executeDeleteAnnotation = async (annId: string) => {
    try {
      const res = await fetch(`${API_URL}/pmx/screenshot-intelligence/${activeProjectId}/annotations/${annId}`, {
        method: "DELETE"
      });

      const json = await res.json();
      if (json.success) {
        toast({
          title: "Feedback Deleted",
          description: `Sticky note coordinate successfully removed.`
        });
        setSelectedAnn(null);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAnnotation = (annId: string) => {
    setAnnToDelete(annId);
    setDeleteConfirmOpen(true);
  };

  // Zoom controls
  const handleZoomIn = () => setScale(s => Math.min(2.5, s + 0.2));
  const handleZoomOut = () => setScale(s => Math.max(0.5, s - 0.2));
  const handleZoomReset = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className={`flex flex-1 overflow-hidden relative bg-[#070b11] ${isFullscreen ? "fixed inset-0 z-50 h-screen w-screen" : "h-[650px] border border-zinc-900 rounded-xl"}`}>
      
      {/* 1. INTERACTIVE CANVAS CONTAINER */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 relative overflow-hidden select-none cursor-grab ${isDragging ? "cursor-grabbing" : ""}`}
      >
        
        {/* Visual Map Wrapper (Apply scale & pan transformations) */}
        <div
          className="absolute origin-center transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            left: "5%",
            top: "5%",
            width: "90%",
            height: "90%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div className="relative inline-block border border-zinc-800 shadow-[0_24px_64px_rgba(0,0,0,0.7)] rounded-xl overflow-visible bg-zinc-950">
            
            <img
              ref={imgRef}
              src={screenshot.dataUrl}
              alt={screenshot.title}
              onClick={handleImageClick}
              onLoad={(e) => {
                const img = e.currentTarget;
                console.log("Image loaded successfully. Natural size:", img.naturalWidth, "x", img.naturalHeight);
              }}
              onError={(e) => {
                console.error("Failed to load screenshot image data URL. Source length:", screenshot.dataUrl?.length);
              }}
              className="max-h-[500px] object-contain rounded-xl block pointer-events-auto"
              draggable={false}
            />

            {/* Pinned Sticky Notes Dots */}
            {showPins && screenshot.annotations.map((ann) => {
              const glow = DOT_GLOWS[ann.priority] || "rgba(255, 255, 255, 0.3)";
              const active = selectedAnn?.id === ann.id;
              
              return (
                <div
                  key={ann.id}
                  className="absolute pin-element pointer-events-auto"
                  style={{
                    left: `${ann.x}%`,
                    top: `${ann.y}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex: active ? 100 : 50
                  }}
                >
                  {/* Pinned indicator dot */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAnn(ann);
                    }}
                    className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center font-bold text-[10px] shadow-lg transition-transform hover:scale-125 ${SEVERITY_COLORS[ann.priority] || "bg-zinc-700"} ${ann.isResolved ? "opacity-40" : ""}`}
                    style={{
                      boxShadow: `0 0 12px 4px ${glow}`
                    }}
                  >
                    {(ann.category || "UX").slice(0, 2).toUpperCase()}
                  </button>

                  {/* Minimal floating banner on hover */}
                  {!active && (
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-zinc-950/90 border border-zinc-800 text-[9px] text-zinc-300 font-semibold px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      {ann.title}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Target marker when clicking to place manual comments */}
            {addingPin && (
              <div
                className="absolute w-5 h-5 rounded-full border-2 border-sky-400 bg-sky-500/20 flex items-center justify-center animate-ping"
                style={{
                  left: `${addingPin.x}%`,
                  top: `${addingPin.y}%`,
                  transform: "translate(-50%, -50%)"
                }}
              />
            )}
          </div>
        </div>

        {/* 2. CANVAS ACTIONS BAR */}
        <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-950/80 border border-zinc-900 backdrop-blur-md controls-bar text-zinc-400">
          <button onClick={handleZoomOut} className="p-1.5 hover:bg-zinc-900 rounded-lg hover:text-white transition-colors" title="Zoom Out"><ZoomOut className="h-4 w-4" /></button>
          <span className="text-[10px] font-mono w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={handleZoomIn} className="p-1.5 hover:bg-zinc-900 rounded-lg hover:text-white transition-colors" title="Zoom In"><ZoomIn className="h-4 w-4" /></button>
          <div className="w-px h-4 bg-zinc-800 mx-1" />
          <button onClick={handleZoomReset} className="p-1.5 hover:bg-zinc-900 rounded-lg hover:text-white transition-colors" title="Reset View"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={() => setShowPins(!showPins)} className={`p-1.5 rounded-lg transition-colors ${showPins ? "text-sky-400" : "hover:text-white"}`} title="Toggle Pins">
            {showPins ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 hover:bg-zinc-900 rounded-lg hover:text-white transition-colors" title="Fullscreen">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>

        {/* Informative double click guide label */}
        <div className="absolute top-4 left-4 text-[10px] text-zinc-500 font-mono pointer-events-none">
          💡 Click anywhere on the screenshot to drop a manual review sticky note
        </div>

      </div>

      {/* 3. NEW PIN CREATION MODAL CONTAINER */}
      <AnimatePresence>
        {addingPin && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
          >
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <PlusCircle className="h-4 w-4 text-sky-400" /> Pinned Team Observation
                </h4>
                <button onClick={() => setAddingPin(null)} className="text-zinc-500 hover:text-white"><XIcon className="h-4 w-4" /></button>
              </div>

              <form onSubmit={handleSaveManualPin} className="space-y-3">
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Issue Title</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Broken input borders..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Feedback Description</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe usability friction..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none leading-relaxed"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      {["UX", "UI", "Accessibility", "Visual Hierarchy", "Spacing", "Content", "Interaction"].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Severity Weight</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as any)}
                      className="w-full bg-[#18181b] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    >
                      {["critical", "high", "medium", "low", "suggestion", "improvement"].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAddingPin(null)}
                    className="flex-1 border border-zinc-800 hover:bg-zinc-900 rounded-lg py-2 text-xs text-zinc-400 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-sky-500 hover:bg-sky-400 text-black font-semibold rounded-lg py-2 text-xs"
                  >
                    Pin Comment
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. DETAIL SIDE DRAWER PANEL */}
      <AnimatePresence>
        {selectedAnn && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="w-80 border-l border-zinc-900 bg-zinc-950 flex flex-col pointer-events-auto"
          >
            {/* Header info */}
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-950/40 shrink-0">
              <div className="space-y-0.5">
                <span className={`text-[8px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${SEVERITY_COLORS[selectedAnn.priority]}`}>
                  {selectedAnn.priority}
                </span>
                <h4 className="text-xs font-bold text-white mt-1.5 truncate max-w-[200px]">{selectedAnn.title}</h4>
              </div>
              <button onClick={() => setSelectedAnn(null)} className="text-zinc-500 hover:text-white"><XIcon className="h-4 w-4" /></button>
            </div>

            {/* Sticky contents */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {/* Resolve actions */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-900 bg-zinc-900/10">
                <span className="text-[10px] text-zinc-500 font-semibold">Status: {selectedAnn.isResolved ? "Resolved" : "Open"}</span>
                <button
                  onClick={handleToggleResolve}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-bold border transition-colors ${selectedAnn.isResolved ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"}`}
                >
                  <CheckCircle className="h-3 w-3" />
                  <span>{selectedAnn.isResolved ? "Reopen issue" : "Resolve note"}</span>
                </button>
              </div>

              {/* Description & Impact */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Affected Component</span>
                  <p className="text-xs text-white font-medium">{selectedAnn.affectedComponent || "General Layout Screen"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">UI Description</span>
                  <p className="text-xs text-zinc-300 leading-relaxed">{selectedAnn.description}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">AI Reasoning</span>
                  <p className="text-xs text-zinc-400 italic leading-relaxed">{selectedAnn.reasoning}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Suggested Fix</span>
                  <p className="text-xs text-sky-400 leading-relaxed">{selectedAnn.recommendation}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Expected Impact</span>
                  <p className="text-xs text-emerald-400 font-medium leading-relaxed">{selectedAnn.expectedImpact}</p>
                </div>
              </div>

              {/* Comment reply list */}
              <div className="space-y-3 pt-3 border-t border-zinc-900">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" /> Comments ({selectedAnn.comments?.length || 0})
                </span>

                <div className="space-y-2">
                  {selectedAnn.comments && selectedAnn.comments.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-lg bg-[#18181b]/30 border border-zinc-900/60 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-white font-bold flex items-center gap-1"><User className="h-3 w-3 text-zinc-400" /> {c.author}</span>
                        <span className="text-[8px] text-zinc-600 font-mono">{new Date(c.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[10px] text-zinc-300 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))}

                  {(!selectedAnn.comments || selectedAnn.comments.length === 0) && (
                    <div className="text-[10px] text-zinc-600 italic">No discussion logged. Post a reply below.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Write reply textbar */}
            <div className="p-3 border-t border-zinc-900 shrink-0 bg-zinc-950">
              <form onSubmit={handleSubmitComment} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Post comment reply..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-sky-500 hover:bg-sky-400 text-black p-2 rounded-lg transition-colors flex items-center justify-center shrink-0"
                >
                  <Send className="h-3 w-3" />
                </button>
              </form>
              <div className="pt-2 flex justify-between">
                <button
                  onClick={() => handleDeleteAnnotation(selectedAnn.id)}
                  className="text-[9px] text-red-500 hover:text-red-400 transition-colors flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="h-3 w-3" /> Delete Pin
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STYLED DELETE CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {deleteConfirmOpen && annToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-zinc-950 border border-zinc-900 rounded-xl p-5 w-full max-w-sm space-y-4 shadow-2xl"
            >
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-white">Delete Annotation</h4>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Are you sure you want to delete this annotation pin? This will permanently remove the sticky note feedback.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setAnnToDelete(null);
                  }}
                  className="flex-1 border border-zinc-800 hover:bg-zinc-900 rounded-lg py-1.5 text-xs text-zinc-400 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (annToDelete) {
                      await executeDeleteAnnotation(annToDelete);
                    }
                    setDeleteConfirmOpen(false);
                    setAnnToDelete(null);
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg py-1.5 text-xs transition-colors"
                >
                  Delete Pin
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function XIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
