import { useState, useEffect } from "react";
import { usePmxStore, getPmxHeaders } from "@/lib/pmxStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Upload,
  Globe,
  Sliders,
  Sparkles,
  ChevronRight,
  TrendingUp,
  ArrowRight,
  Lightbulb,
  Plus,
  Play,
  X,
  BookOpen,
  Calendar,
  Grid,
  List,
  Search,
  Download,
  Info,
  ExternalLink,
  ChevronDown,
  Trash2
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ScreenshotCanvas from "@/components/ScreenshotCanvas";

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

export default function PmxAnalysis() {
  const { toast } = useToast();

  // Project listings
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<any | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);

  // Active workspace states
  const [activeScreenshotIdx, setActiveScreenshotIdx] = useState(0);
  const [viewMode, setViewMode] = useState<"visual" | "list">("visual");

  // New project form states
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [uploadedImages, setUploadedImages] = useState<Array<{ title: string; dataUrl: string }>>([]);
  const [runningCrawl, setRunningCrawl] = useState(false);
  const [runningUpload, setRunningUpload] = useState(false);

  // Filters for List View
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Load projects list
  const loadProjects = async () => {
    setLoading(true);
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/screenshot-intelligence`, { headers });
      const json = await res.json();
      if (json.success) {
        setProjects(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load single project detail
  const loadProjectDetail = async (id: string) => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/screenshot-intelligence/${id}`, { headers });
      const json = await res.json();
      if (json.success) {
        setActiveProject(json.data);
        if (json.data.screenshots?.length > 0) {
          setActiveScreenshotIdx(0);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      loadProjectDetail(activeProjectId);
    } else {
      setActiveProject(null);
    }
  }, [activeProjectId]);

  // Handle Drag & Drop / File select upload conversion
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(files);
  };

  const processFiles = (files: FileList) => {
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImages((prev) => [
            ...prev,
            {
              title: file.name.split(".")[0],
              dataUrl: event.target!.result as string
            }
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle clipboard Ctrl+V image paste
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    Array.from(items).forEach((item) => {
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              setUploadedImages((prev) => [
                ...prev,
                {
                  title: `Clipboard Image ${new Date().toLocaleTimeString()}`,
                  dataUrl: event.target!.result as string
                }
              ]);
              toast({
                title: "Image pasted from clipboard",
                description: "Appended screenshot to upload deck."
              });
            }
          };
          reader.readAsDataURL(file);
        }
      }
    });
  };

  // Submit screenshots upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadedImages.length === 0 || !newTitle.trim()) return;

    setRunningUpload(true);
    toast({
      title: "Compiling screenshot workspace...",
      description: "AI is scanning visual patterns to map interface annotations."
    });

    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/screenshot-intelligence`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          screenshots: uploadedImages
        })
      });

      const json = await res.json();
      if (json.success) {
        toast({
          title: "Visual Analysis Ready",
          description: `Logged feedback workspace for: ${newTitle}`
        });
        setNewTitle("");
        setNewDesc("");
        setUploadedImages([]);
        loadProjects();
        setActiveProjectId(json.data._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRunningUpload(false);
    }
  };

  // Run audit directly from live URL (Puppeteer browser capture)
  const handleUrlCrawlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setRunningCrawl(true);
    toast({
      title: "Launching browser crawler...",
      description: "Taking full-screen UI snapshot of application homepage."
    });

    try {
      // 1. Get browser screenshot base64 from backend capture endpoint
      const headers = await getPmxHeaders();
      const capRes = await fetch(`${API_URL}/pmx/screenshot`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: urlInput, fullPage: false })
      });
      const capJson = await capRes.json();
      
      if (!capJson.success || !capJson.dataUrl) {
        throw new Error(capJson.error || "Capture failed");
      }

      // 2. Submit captured screenshot base64 to screenshot intelligence workspace
      const res = await fetch(`${API_URL}/pmx/screenshot-intelligence`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: `Direct URL Audit: ${new URL(urlInput).hostname}`,
          description: `Usability snapshot taken on URL page: ${urlInput}`,
          screenshots: [{ title: "Landing Page View", dataUrl: capJson.dataUrl }]
        })
      });

      const json = await res.json();
      if (json.success) {
        toast({
          title: "URL snapshot analyzed",
          description: "Visual design review canvas workspace is now ready."
        });
        setUrlInput("");
        loadProjects();
        setActiveProjectId(json.data._id);
      }
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "URL capture failed",
        description: "Verify that server is online and URL is publicly active."
      });
    } finally {
      setRunningCrawl(false);
    }
  };

  // Add screenshot to existing project workspace
  const handleAppendScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !activeProject) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        toast({
          title: "Analyzing screenshot...",
          description: "AI is crawling layout elements."
        });
        
        try {
          const headers = await getPmxHeaders();
          const capRes = await fetch(`${API_URL}/pmx/screenshot-intelligence`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              title: activeProject.title,
              description: activeProject.description,
              screenshots: [
                ...activeProject.screenshots.map((s: any) => ({ title: s.title, dataUrl: s.dataUrl })),
                { title: file.name.split(".")[0], dataUrl: event.target!.result as string }
              ]
            })
          });
          const capJson = await capRes.json();
          if (capJson.success) {
            toast({
              title: "Screenshot appended",
              description: `Uploaded additional deck: ${file.name}`
            });
            loadProjectDetail(activeProject._id);
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Delete project review workspace
  const executeDeleteProject = async (id: string, name: string) => {
    try {
      const headers = await getPmxHeaders();
      const res = await fetch(`${API_URL}/pmx/screenshot-intelligence/${id}`, {
        method: "DELETE",
        headers
      });
      const json = await res.json();
      if (json.success) {
        toast({
          title: "Workspace deleted",
          description: `Removed "${name}".`
        });
        loadProjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  // Export report downloads (Markdown / JSON)
  const handleExport = (format: "markdown" | "json") => {
    if (!activeProject) return;

    let fileContent = "";
    let fileExtension = "md";

    if (format === "json") {
      fileContent = JSON.stringify(activeProject, null, 2);
      fileExtension = "json";
    } else {
      fileContent = `# Executive Summary: UI Visual review report for "${activeProject.title}"\n\n`;
      fileContent += `${activeProject.description || ""}\n\n`;
      fileContent += `## Visual Usability Observations\n`;
      activeProject.screenshots.forEach((s: any) => {
        fileContent += `### Screenshot: ${s.title}\n`;
        s.annotations.forEach((a: any) => {
          fileContent += `- **[${a.category}] [${a.priority.toUpperCase()}] ${a.title}** (x: ${a.x.toFixed(1)}%, y: ${a.y.toFixed(1)}%)\n`;
          fileContent += `  - **Description:** ${a.description}\n`;
          fileContent += `  - **Suggested Fix:** ${a.recommendation}\n`;
          fileContent += `  - **Impact:** ${a.expectedImpact}\n\n`;
        });
      });
    }

    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeProject.title.toLowerCase().replace(/\s+/g, "_")}_report.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render components
  const currentScreenshot = activeProject?.screenshots?.[activeScreenshotIdx];
  const listAnnotations = currentScreenshot?.annotations.filter((a: any) => {
    const titleLower = (a.title || "").toLowerCase();
    const descLower = (a.description || "").toLowerCase();
    const matchesSearch = titleLower.includes(searchQuery.toLowerCase()) || descLower.includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || a.priority === priorityFilter;
    const matchesCategory = categoryFilter === "all" || a.category === categoryFilter;
    return matchesSearch && matchesPriority && matchesCategory;
  }) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 pb-16" onPaste={handlePaste}>
      
      {/* ── HEADER TITLE ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-sky-400" /> Screenshot Intelligence Workspace
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Figma-style visual review board overlaying AI observations directly onto mockups, wireframes, and live capture screenshots.
          </p>
        </div>

        {activeProject && (
          <button
            onClick={() => setActiveProjectId(null)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:text-white transition-colors self-start"
          >
            ← Back to workspaces
          </button>
        )}
      </div>

      {/* ── WORKSPACE BOARD MAIN PANEL ── */}
      {activeProject ? (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-14rem)] min-h-[650px] relative overflow-hidden">
          
          {/* A. THUMBNAIL SIDEBAR */}
          <div className="w-full lg:w-60 border border-zinc-900 rounded-xl bg-zinc-950 p-4 flex flex-col shrink-0 overflow-y-auto scrollbar-thin space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Project Screens</span>
              <label className="p-1 rounded bg-sky-500 hover:bg-sky-400 text-black cursor-pointer transition-colors" title="Append screenshot to deck">
                <Plus className="h-3.5 w-3.5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAppendScreenshot}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-2 flex-1">
              {activeProject.screenshots.map((s: any, i: number) => {
                const active = activeScreenshotIdx === i;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveScreenshotIdx(i)}
                    className={`w-full p-2 rounded-lg border text-left flex gap-3 items-center transition-all ${
                      active
                        ? "bg-[#18181b] border-sky-500/25 text-white"
                        : "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/30"
                    }`}
                  >
                    <div className="w-10 h-10 rounded border border-zinc-900 bg-zinc-900 overflow-hidden flex items-center justify-center shrink-0">
                      <img src={s.dataUrl} className="max-w-full max-h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold truncate leading-tight">{s.title}</p>
                      <span className="text-[9px] text-zinc-500 font-mono mt-0.5 block">{s.annotations.length} pins</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Export options */}
            <div className="pt-3 border-t border-zinc-900 space-y-2 shrink-0">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Export workspace</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleExport("markdown")}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 py-1.5 text-[10px] font-semibold text-zinc-300 transition-colors"
                >
                  <Download className="h-3 w-3" />
                  <span>MD Spec</span>
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-900 py-1.5 text-[10px] font-semibold text-zinc-300 transition-colors"
                >
                  <Download className="h-3 w-3" />
                  <span>JSON</span>
                </button>
              </div>
            </div>
          </div>

          {/* B. MAIN CANVAS WORKSPACE VIEW */}
          <div className="flex-1 flex flex-col overflow-hidden relative border border-zinc-900 rounded-xl bg-zinc-950/20">
            
            {/* View Selector header bar */}
            <div className="h-14 border-b border-zinc-900 px-4 flex justify-between items-center bg-zinc-950 shrink-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-white leading-tight">{activeProject.title}</h2>
                <span className="text-[9px] text-zinc-500 font-mono hidden sm:inline">— {activeProject.description || "Design review session"}</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Visual / List mode toggles */}
                <div className="flex rounded-lg border border-zinc-800 p-0.5 bg-zinc-900/40">
                  <button
                    onClick={() => setViewMode("visual")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${
                      viewMode === "visual"
                        ? "bg-[#18181b] text-sky-400"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <Grid className="h-3.5 w-3.5" />
                    <span>Visual Review</span>
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${
                      viewMode === "list"
                        ? "bg-[#18181b] text-sky-400"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    <span>List View</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Content view renderer */}
            {currentScreenshot ? (
              <div className="flex-1 flex overflow-hidden">
                {viewMode === "visual" ? (
                  <ScreenshotCanvas
                    screenshot={currentScreenshot}
                    projectId={activeProject.projectId}
                    activeProjectId={activeProject._id}
                    onRefresh={() => loadProjectDetail(activeProject._id)}
                  />
                ) : (
                  // List Mode
                  <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
                    {/* Search & Filters */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                      <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-600" />
                        <input
                          type="text"
                          placeholder="Search annotations..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-[#18181b] border border-zinc-850 focus:border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto self-start">
                        <select
                          value={priorityFilter}
                          onChange={(e) => setPriorityFilter(e.target.value)}
                          className="bg-[#18181b] border border-zinc-850 rounded-lg px-2.5 py-2 text-xs text-zinc-400 focus:outline-none"
                        >
                          <option value="all">All Priorities</option>
                          {["critical", "high", "medium", "low", "suggestion", "improvement"].map(p => (
                            <option key={p} value={p}>{p.toUpperCase()}</option>
                          ))}
                        </select>
                        <select
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          className="bg-[#18181b] border border-zinc-850 rounded-lg px-2.5 py-2 text-xs text-zinc-400 focus:outline-none"
                        >
                          <option value="all">All Categories</option>
                          {["UX", "UI", "Accessibility", "Visual Hierarchy", "Spacing", "Content", "Interaction"].map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Table of issues */}
                    <div className="flex-1 border border-zinc-900 rounded-xl bg-zinc-950/20 overflow-y-auto scrollbar-thin">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-900 bg-zinc-950 text-zinc-400 font-semibold font-mono">
                            <th className="p-3.5">Observation details</th>
                            <th className="p-3.5">Category</th>
                            <th className="p-3.5">Severity</th>
                            <th className="p-3.5">Location Coordinate</th>
                            <th className="p-3.5">Recommendation Fix</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/50">
                          {listAnnotations.map((ann: any) => (
                            <tr key={ann.id} className="hover:bg-zinc-900/10">
                              <td className="p-3.5">
                                <h4 className="font-bold text-white">{ann.title}</h4>
                                <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{ann.description}</p>
                              </td>
                              <td className="p-3.5">
                                <span className="font-mono text-zinc-300 font-bold">{ann.category}</span>
                              </td>
                              <td className="p-3.5">
                                <span className="font-mono text-sky-400 uppercase font-bold">{ann.priority}</span>
                              </td>
                              <td className="p-3.5 font-mono text-zinc-500">
                                ({ann.x.toFixed(1)}%, {ann.y.toFixed(1)}%)
                              </td>
                              <td className="p-3.5 text-zinc-400">{ann.recommendation}</td>
                            </tr>
                          ))}

                          {listAnnotations.length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-center py-20 text-zinc-600 italic">
                                No observations match current filter criteria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 italic text-xs">
                No screenshots inside review deck. Click plus button on sidebar to upload.
              </div>
            )}
          </div>

        </div>
      ) : (
        // ── WELCOME REVIEW WORKSPACES LISTING SCREEN ──
        <div className="space-y-6">
          {/* Direct URL snapshot trigger */}
          <div className="rounded-xl border border-zinc-900 bg-zinc-950 p-5 relative overflow-hidden">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_65%_at_0%_0%,rgba(56,189,248,0.04)_0%,transparent_50%)]" />
            <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-sky-400" /> Snapshot Live URL UI
            </h3>
            
            <form onSubmit={handleUrlCrawlSubmit} className="flex gap-2.5 max-w-3xl">
              <input
                type="url"
                required
                placeholder="Enter live web app address (e.g. https://myproduct.com)..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={runningCrawl}
                className="flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-4 py-2 text-xs font-semibold text-black transition-all disabled:opacity-50"
              >
                {runningCrawl ? (
                  <>
                    <div className="h-3 w-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Snapping UI...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 fill-black text-black" />
                    <span>Take Screenshot & Audit</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Create new review workspace (Upload Files / Paste) */}
            <div className="lg:col-span-1 rounded-xl border border-zinc-900 bg-zinc-950 p-5 space-y-4">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Upload className="h-4 w-4 text-sky-400" /> Start Visual Review Board
              </h3>

              <form onSubmit={handleUploadSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Board Workspace Title</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Pricing Page Checkout UX Audit"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Optional Description</label>
                  <textarea
                    rows={2}
                    placeholder="E.g. Reviewing visual design drop-offs..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none"
                  />
                </div>

                {/* Drag / Drop visual file dropzone */}
                <div className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl p-6 text-center cursor-pointer transition-all hover:bg-zinc-900/10 relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="h-6 w-6 text-zinc-500 mx-auto mb-2" />
                  <p className="text-[10px] text-zinc-400 font-semibold">Drag & Drop screenshots here, or click to browse</p>
                  <p className="text-[9px] text-zinc-600 mt-1 font-mono">Supports PNG, JPG, JPEG, WEBP or Paste directly (Ctrl+V)</p>
                </div>

                {/* Uploaded deck list preview */}
                {uploadedImages.length > 0 && (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Images loaded ({uploadedImages.length}):</span>
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px] bg-zinc-900/50 p-1.5 rounded border border-zinc-900">
                        <span className="truncate max-w-[150px] font-medium text-zinc-300">{img.title}</span>
                        <button
                          type="button"
                          onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={runningUpload || uploadedImages.length === 0}
                  className="w-full bg-sky-500 text-black font-bold rounded-lg px-4 py-2 text-xs hover:bg-sky-400 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {runningUpload ? (
                    <>
                      <div className="h-3 w-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Reviewing visual layout...</span>
                    </>
                  ) : (
                    <span>Create Board & Analyze</span>
                  )}
                </button>
              </form>
            </div>

            {/* List of active workspaces */}
            <div className="lg:col-span-2 rounded-xl border border-zinc-900 bg-zinc-950 p-5 space-y-4">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5 border-b border-zinc-900 pb-3">
                Active Visual Review Workspaces
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto scrollbar-thin">
                {projects.map((proj) => (
                  <div
                    key={proj._id}
                    onClick={() => setActiveProjectId(proj._id)}
                    className="glass-card hover-lift p-4 flex flex-col justify-between cursor-pointer space-y-4"
                  >
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-white">{proj.title}</h4>
                      <p className="text-[10px] text-zinc-500 leading-relaxed line-clamp-2">{proj.description || "Review board layout."}</p>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-zinc-900 text-[10px]">
                      <div className="flex gap-2 text-zinc-500 font-mono">
                        <span>{proj.screenshots?.length || 0} screens</span>
                        <span>•</span>
                        <span>{proj.screenshots?.reduce((acc: number, cur: any) => acc + (cur.annotations?.length || 0), 0) || 0} notes</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteProject(proj._id, proj.title, e)}
                        className="text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {projects.length === 0 && !loading && (
                  <div className="col-span-2 text-center py-20 text-zinc-600 italic text-xs">
                    No active visual review boards. Drag & drop files or type a URL above to start.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── STYLED DELETE CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {deleteConfirmOpen && projectToDelete && (
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
                <h4 className="text-xs font-bold text-white">Delete Review Workspace</h4>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Are you sure you want to delete workspace <span className="text-white font-semibold">"{projectToDelete.name}"</span>? This will permanently remove this visual review board.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setProjectToDelete(null);
                  }}
                  className="flex-1 border border-zinc-800 hover:bg-zinc-900 rounded-lg py-1.5 text-xs text-zinc-400 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (projectToDelete) {
                      await executeDeleteProject(projectToDelete.id, projectToDelete.name);
                    }
                    setDeleteConfirmOpen(false);
                    setProjectToDelete(null);
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg py-1.5 text-xs transition-colors"
                >
                  Delete Board
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
