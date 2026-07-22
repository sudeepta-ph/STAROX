import { useState, useEffect } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Link2,
  Github,
  FileText,
  MessageSquare,
  Upload,
  Search,
  RefreshCw,
  Archive,
  Trash2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Database
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

export default function PmxSources() {
  const { inputs, fetchInputs, runPipeline, loading, selectedSourceIds, setSelectedSourceIds } = usePmxStore();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [quickFilter, setQuickFilter] = useState<"all" | "selected" | "unselected" | "processed" | "not_processed">("all");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedInput, setSelectedInput] = useState<any>(null);
  
  // Pipeline Status Phase for Badges
  const [pipelinePhase, setPipelinePhase] = useState<"idle" | "queued" | "processing" | "analyzing" | "completed" | "failed">("idle");
  const [lastCheckedIndex, setLastCheckedIndex] = useState<number | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState("url");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let timer1: any;
    let timer2: any;

    const onStart = () => {
      setPipelinePhase("queued");
      timer1 = setTimeout(() => setPipelinePhase("processing"), 2500);
      timer2 = setTimeout(() => setPipelinePhase("analyzing"), 8000);
    };

    const onCompleted = () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setPipelinePhase("completed");
      setTimeout(() => setPipelinePhase("idle"), 5000);
    };

    const onFailed = () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setPipelinePhase("failed");
      setTimeout(() => setPipelinePhase("idle"), 5000);
    };

    window.addEventListener("pmx-pipeline-started", onStart);
    window.addEventListener("pmx-pipeline-completed", onCompleted);
    window.addEventListener("pmx-pipeline-failed", onFailed);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener("pmx-pipeline-started", onStart);
      window.removeEventListener("pmx-pipeline-completed", onCompleted);
      window.removeEventListener("pmx-pipeline-failed", onFailed);
    };
  }, []);

  const filteredInputs = inputs.filter((input) => {
    const matchesSearch =
      input.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (input.summary && input.summary.toLowerCase().includes(searchQuery.toLowerCase()));
      
    let matchesQuick = true;
    if (quickFilter === "selected") {
      matchesQuick = selectedSourceIds.includes(input._id);
    } else if (quickFilter === "unselected") {
      matchesQuick = !selectedSourceIds.includes(input._id);
    } else if (quickFilter === "processed") {
      matchesQuick = !!input.summary && input.summary !== "Processing AI Summary...";
    } else if (quickFilter === "not_processed") {
      matchesQuick = !input.summary || input.summary === "Processing AI Summary...";
    }

    const matchesFilter = filterType === "all" || input.type === filterType;
    return matchesSearch && matchesQuick && matchesFilter;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelectedSourceIds(filteredInputs.map(i => i._id));
        toast({
          title: "Selected All",
          description: `Selected all ${filteredInputs.length} matching sources.`
        });
      } else if (e.key === "Escape") {
        setSelectedSourceIds([]);
        toast({
          title: "Deselected All",
          description: "Cleared all selections."
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredInputs, selectedSourceIds, setSelectedSourceIds]);

  const handleCheckboxClick = (index: number, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (e.shiftKey && lastCheckedIndex !== null) {
      const start = Math.min(lastCheckedIndex, index);
      const end = Math.max(lastCheckedIndex, index);
      const rangeIds = filteredInputs.slice(start, end + 1).map(i => i._id);
      
      const isCurrentlyChecked = selectedSourceIds.includes(id);
      let newSelection = [...selectedSourceIds];
      
      if (isCurrentlyChecked) {
        newSelection = newSelection.filter(x => !rangeIds.includes(x));
      } else {
        rangeIds.forEach(rid => {
          if (!newSelection.includes(rid)) {
            newSelection.push(rid);
          }
        });
      }
      setSelectedSourceIds(newSelection);
    } else {
      if (selectedSourceIds.includes(id)) {
        setSelectedSourceIds(selectedSourceIds.filter(x => x !== id));
      } else {
        setSelectedSourceIds([...selectedSourceIds, id]);
      }
    }
    setLastCheckedIndex(index);
  };

  const renderStatusBadge = (input: any) => {
    if (pipelinePhase === "idle") return null;

    const isInputSelected = selectedSourceIds.includes(input._id);
    if (!isInputSelected) {
      return (
        <span className="text-[9px] font-semibold px-2 py-0.5 rounded border bg-zinc-900 border-zinc-800 text-zinc-500">
          Skipped
        </span>
      );
    }

    const badgeStyles = {
      queued: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400 animate-pulse",
      processing: "bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse",
      analyzing: "bg-purple-500/10 border-purple-500/20 text-purple-400 animate-pulse",
      completed: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      failed: "bg-red-500/10 border-red-500/20 text-red-400"
    }[pipelinePhase];

    const label = {
      queued: "Queued",
      processing: "Processing",
      analyzing: "Analyzing",
      completed: "Completed",
      failed: "Failed"
    }[pipelinePhase];

    return (
      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${badgeStyles}`}>
        {label}
      </span>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/inputs`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name,
          type,
          url: type === "url" || type === "repo" ? url : undefined,
          content
        })
      });

      const json = await res.json();
      if (json.success) {
        toast({
          title: "Source node created",
          description: `"${name}" has been successfully added to STAROX PMX.`
        });
        setName("");
        setUrl("");
        setContent("");
        setIsAdding(false);
        fetchInputs();
      } else {
        toast({
          variant: "destructive",
          title: "Submission failed",
          description: json.error || "An unknown error occurred."
        });
      }
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Connection error",
        description: "Failed to connect to backend api server."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReprocess = async (id: string, name: string) => {
    toast({
      title: "Reprocessing node...",
      description: `AI is updating signals based on "${name}".`
    });

    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/inputs/${id}/reprocess`, {
        method: "POST",
        headers
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Node reprocessed",
          description: `Signals successfully updated for "${name}".`
        });
        fetchInputs();
        if (selectedInput && selectedInput._id === id) {
          setSelectedInput(json.data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from PMX inputs?`)) return;

    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/inputs/${id}`, {
        method: "DELETE",
        headers
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Source deleted",
          description: `"${name}" removed.`
        });
        setSelectedInput(null);
        fetchInputs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getInputIcon = (type: string) => {
    switch (type) {
      case "url":
        return <Link2 className="h-4 w-4 text-blue-400" />;
      case "repo":
        return <Github className="h-4 w-4 text-purple-400" />;
      case "text":
      case "markdown":
        return <FileText className="h-4 w-4 text-yellow-400" />;
      case "support":
      case "interview":
        return <MessageSquare className="h-4 w-4 text-green-400" />;
      case "csv":
        return <FileText className="h-4 w-4 text-emerald-400" />;
      default:
        return <Upload className="h-4 w-4 text-zinc-400" />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">
      
      {/* ── LEFT LISTING WORKSPACE ────────────────────────────── */}
      <div className="flex-1 flex flex-col border-r border-zinc-900 overflow-hidden">
        {/* Toolbar Header */}
        <div className="p-4 border-b border-zinc-900 flex items-center justify-between gap-4 bg-zinc-950/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Filter source nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#18181b]/50 border border-zinc-800 focus:border-zinc-700 rounded-lg py-1.5 pl-9 pr-4 text-xs placeholder-zinc-500 text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px] bg-[#18181b] border-zinc-800 text-zinc-400 text-xs h-[30px] rounded-lg">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-900 text-zinc-400 text-xs">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="url">Website URL</SelectItem>
                <SelectItem value="repo">GitHub Repos</SelectItem>
                <SelectItem value="text">Markdown/Text</SelectItem>
                <SelectItem value="interview">Interview Notes</SelectItem>
                <SelectItem value="support">Support Chat</SelectItem>
                <SelectItem value="csv">Customer Review (CSV)</SelectItem>
              </SelectContent>
            </Select>

            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-3 py-1.5 text-xs font-medium text-black transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Import Source</span>
            </button>
          </div>
        </div>

        {/* Quick Selection and Filter Actions Toolbar */}
        <div className="px-4 py-2 border-b border-zinc-900 bg-zinc-950/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
            {(["all", "selected", "unselected", "processed", "not_processed"] as const).map((qf) => {
              const label = {
                all: "All",
                selected: `Selected (${selectedSourceIds.length})`,
                unselected: "Unselected",
                processed: "Processed",
                not_processed: "Pending"
              }[qf];
              const active = quickFilter === qf;
              return (
                <button
                  key={qf}
                  onClick={() => setQuickFilter(qf)}
                  className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-all shrink-0 ${
                    active
                      ? "bg-sky-500/10 border-sky-500/20 text-sky-400"
                      : "bg-zinc-900/20 border-zinc-900 text-zinc-500 hover:text-zinc-400 hover:border-zinc-800"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setSelectedSourceIds(filteredInputs.map(i => i._id));
                toast({ title: "Selected All", description: "All matching inputs have been checked." });
              }}
              className="text-[10px] font-semibold text-zinc-500 hover:text-sky-400 transition-colors"
            >
              Select All
            </button>
            <span className="text-zinc-800 text-[10px]">|</span>
            <button
              onClick={() => {
                setSelectedSourceIds([]);
                toast({ title: "Deselected All", description: "Selections cleared." });
              }}
              className="text-[10px] font-semibold text-zinc-500 hover:text-red-400 transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Inputs List Wall */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
          {filteredInputs.map((input, index) => {
            const isSelected = selectedInput?._id === input._id;
            const isChecked = selectedSourceIds.includes(input._id);
            return (
              <div
                key={input._id}
                onClick={() => setSelectedInput(input)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isChecked
                    ? "bg-[#18181b] border-sky-500/50 shadow-[0_0_12px_rgba(56,189,248,0.12)]"
                    : isSelected
                    ? "bg-zinc-900/55 border-zinc-800"
                    : "bg-zinc-950/40 border-zinc-900 hover:border-zinc-800"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Checkbox
                    checked={isChecked}
                    onClick={(e) => handleCheckboxClick(index, input._id, e)}
                    className="border-zinc-700 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500 data-[state=checked]:text-black shrink-0"
                  />
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 shrink-0">
                    {getInputIcon(input.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-white truncate">{input.name}</h4>
                      <span className="text-[9px] uppercase font-mono text-zinc-500 bg-zinc-900 px-1 py-0.5 rounded border border-zinc-800 shrink-0">
                        {input.type}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1">{input.summary || "Extracting PM signals..."}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {renderStatusBadge(input)}
                  <span className="text-[9px] text-zinc-500">
                    {new Date(input.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
                </div>
              </div>
            );
          })}

          {filteredInputs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <Upload className="h-8 w-8 text-zinc-700 mb-3" />
              <p className="text-xs">No product inputs imported. Click Import Source to start.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL (DRAWER / DETAIL VIEW) ────────────────── */}
      <AnimatePresence mode="wait">
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-96 border-l border-zinc-900 bg-zinc-950 p-6 flex flex-col justify-between overflow-y-auto"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="h-4 w-4 text-sky-400" /> Import Source Node
                </h3>
                <button
                  onClick={() => setIsAdding(false)}
                  className="p-1 rounded-md text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Node Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stripe checkout feedback"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Source Type</label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="w-full bg-[#18181b] border-zinc-800 text-zinc-300 text-xs rounded-lg h-[34px]">
                      <SelectValue placeholder="Select Source Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-900 text-zinc-400 text-xs">
                      <SelectItem value="url">Website URL</SelectItem>
                      <SelectItem value="repo">GitHub Repos</SelectItem>
                      <SelectItem value="text">Markdown / Notepad</SelectItem>
                      <SelectItem value="interview">Interview Notes</SelectItem>
                      <SelectItem value="support">Support Ticket Chat</SelectItem>
                      <SelectItem value="report">Business Analytics</SelectItem>
                      <SelectItem value="csv">Customer Review (CSV)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(type === "url" || type === "repo") && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Link URL</label>
                    <input
                      type="url"
                      required
                      placeholder={type === "repo" ? "https://github.com/org/repo" : "https://example.com"}
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                )}

                {type === "csv" ? (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Upload CSV File</label>
                    <div className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl p-6 text-center cursor-pointer transition-all hover:bg-zinc-900/10 relative">
                      <input
                        type="file"
                        accept=".csv"
                        required
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setContent(event.target.result as string);
                                toast({
                                  title: "CSV Loaded",
                                  description: `Loaded file: ${file.name} (${file.size} bytes)`
                                });
                              }
                            };
                            reader.readAsText(file);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Upload className="h-6 w-6 text-zinc-500 mx-auto mb-2" />
                      <p className="text-[10px] text-zinc-400 font-semibold">Click to upload or drag CSV file here</p>
                      {content && (
                        <p className="text-[9px] text-emerald-400 mt-1 font-mono">
                          ✓ File loaded successfully ({content.length} characters)
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Source Text Content</label>
                    <textarea
                      rows={8}
                      required={type !== "url" && type !== "repo"}
                      placeholder="Paste transcripts, support chats, raw reports or code details here..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none font-mono"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-sky-500 text-black font-semibold rounded-lg px-4 py-2 text-xs hover:bg-sky-400 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="h-3 w-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Parsing Signals...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Import & Sync Node</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {selectedInput && !isAdding && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-96 border-l border-zinc-900 bg-zinc-950 p-6 flex flex-col justify-between overflow-y-auto"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {getInputIcon(selectedInput.type)} {selectedInput.name}
                </h3>
                <button
                  onClick={() => setSelectedInput(null)}
                  className="p-1 rounded-md text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* AI Summary Block */}
              <div className="rounded-xl border border-sky-500/10 bg-sky-500/5 p-4 space-y-2">
                <span className="text-[9px] uppercase tracking-wider text-sky-400 font-bold flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI Summary Summary
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                  {selectedInput.summary || "Extracting signals in background..."}
                </p>
              </div>

              {/* URL Link */}
              {selectedInput.url && (
                <div className="space-y-1.5">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Origin URL</span>
                  <a
                    href={selectedInput.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-sky-400 hover:underline"
                  >
                    <span>{selectedInput.url}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              {/* Raw Content Block */}
              {selectedInput.content && (
                <div className="space-y-1.5">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Raw Data Content</span>
                  <div className="rounded-lg bg-[#18181b]/50 border border-zinc-800 p-3 max-h-48 overflow-y-auto text-[11px] text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap">
                    {selectedInput.content}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Metadata Node</span>
                <div className="text-[10px] text-zinc-500 space-y-1">
                  <p>ID: {selectedInput._id}</p>
                  <p>Status: <span className="text-emerald-400 font-semibold">{selectedInput.status}</span></p>
                  <p>Added: {new Date(selectedInput.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-900 pt-4 mt-6 flex gap-2">
              <button
                onClick={() => handleReprocess(selectedInput._id, selectedInput.name)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reprocess</span>
              </button>
              <button
                onClick={() => handleDelete(selectedInput._id, selectedInput.name)}
                className="flex items-center justify-center rounded-lg border border-red-500/20 hover:bg-red-500/10 p-2 text-red-400 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
