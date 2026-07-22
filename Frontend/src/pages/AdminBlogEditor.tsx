import { useEffect, useState, useRef, Component, ErrorInfo, ReactNode } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Editor, { Monaco } from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeRaw from "rehype-raw";
import Sidebar from "@/components/Sidebar";
import { useSidebarStore } from "@/lib/sidebarStore";
import { useAuthStore } from "@/lib/authStore";
import {
  ArrowLeft,
  Save,
  Eye,
  Upload,
  User as UserIcon,
  Tag,
  BookOpen,
  Loader2,
  Trash2,
  Globe,
  Camera,
  Copy,
  Check,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Quote,
  Code,
  Terminal,
  Table,
  ListOrdered,
  List,
  ListTodo,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Smile,
  FolderOpen,
  X,
  Clipboard,
  Play,
  Music,
  File,
  AlertTriangle,
  RefreshCw,
  Search
} from "lucide-react";

import "highlight.js/styles/github-dark.css";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
}

interface UploadTask {
  id: string;
  fileName: string;
  progress: number;
  status: "uploading" | "success" | "error" | "cancelled";
  xhr: XMLHttpRequest;
  retryAction?: () => void;
}

const CATEGORIES = ["Engineering", "ML/AI", "Product", "Design", "Updates", "Guides"];
const EMOJIS = ["💻", "🚀", "🤖", "📊", "🛠", "💡", "📝", "📦", "✅", "⚠️", "🔥", "✨", "🎉", "🎨", "🔒", "⚡️"];
const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

const CustomMarkdownRenderers = {
  // Render video blocks with controls and styling
  video: ({ src, className, ...props }: any) => (
    <div className="my-6 rounded-2xl overflow-hidden border border-border/40 shadow-lg bg-black/60 max-w-[70ch]">
      <video controls className="w-full h-auto aspect-video rounded-2xl" src={src} {...props} />
    </div>
  ),
  // Render audio blocks with controls
  audio: ({ src, ...props }: any) => (
    <div className="my-4 p-3 bg-surface border border-border/40 rounded-xl flex items-center justify-center max-w-[70ch]">
      <audio controls className="w-full" src={src} {...props} />
    </div>
  ),
  // Render PDF frames
  iframe: ({ src, className, ...props }: any) => (
    <div className="my-6 rounded-2xl overflow-hidden border border-border/40 shadow-lg max-w-[70ch]">
      <iframe src={src} className="w-full h-[450px]" {...props} />
    </div>
  ),
  // Code block custom templates
  code: ({ children, className, inline }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    const lang = match ? match[1] : "";
    const codeText = String(children).replace(/\n$/, "");
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (inline) {
      return (
        <code className="bg-surface px-1.5 py-0.5 rounded text-primary font-mono text-[13px]">
          {children}
        </code>
      );
    }

    return (
      <div className="relative border border-border/40 rounded-xl overflow-hidden my-4 bg-[#0d1117] font-mono group">
        <div className="flex justify-between items-center bg-surface/50 px-4 py-2 border-b border-border/30 text-xs text-muted-foreground">
          <span>{lang || "code"}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
        <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed">
          <code className={className}>
            {children}
          </code>
        </pre>
      </div>
    );
  },
  h1: ({ children }: any) => <h1 className="text-[2rem] font-bold font-display mt-8 mb-4 border-b border-border/30 pb-2">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-[1.65rem] font-bold font-display mt-6 mb-3 border-b border-border/20 pb-1">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-[1.3rem] font-bold font-display mt-4 mb-2">{children}</h3>,
  a: ({ href, children }: any) => {
    // Intercept media file link extensions to render them beautifully in line (Part 2 and GFM preview support)
    const isVideo = href?.match(/\.(mp4|webm|mov|mkv)$/i);
    const isAudio = href?.match(/\.(mp3|wav|ogg|aac)$/i);
    const isPdf = href?.match(/\.pdf$/i);

    if (isVideo) {
      return (
        <div className="my-6 rounded-2xl overflow-hidden border border-border/40 shadow-lg bg-black/60 max-w-[70ch]">
          <video controls className="w-full h-auto aspect-video rounded-2xl">
            <source src={href} />
          </video>
        </div>
      );
    }
    if (isAudio) {
      return (
        <div className="my-4 p-3 bg-surface border border-border/40 rounded-xl flex items-center justify-center max-w-[70ch]">
          <audio controls className="w-full">
            <source src={href} />
          </audio>
        </div>
      );
    }
    if (isPdf) {
      return (
        <div className="my-6 space-y-3 max-w-[70ch]">
          <iframe src={href} className="w-full h-[450px] border border-border/40 rounded-2xl shadow" />
          <a href={href} download className="inline-flex items-center gap-1.5 text-primary hover:underline font-semibold">
            Download PDF Document
          </a>
        </div>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold transition-all">
        {children}
      </a>
    );
  },
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-primary bg-surface/30 pl-4 py-1.5 my-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  img: ({ src, alt }: any) => (
    <img src={src} alt={alt} className="max-w-full h-auto rounded-xl border border-border/40 my-4 shadow-md mx-auto block" />
  ),
  table: ({ children }: any) => (
    <div className="overflow-x-auto my-6 border border-border/40 rounded-xl">
      <table className="w-full text-left border-collapse text-xs md:text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-surface/50 font-bold border-b border-border/40">{children}</thead>,
  tbody: ({ children }: any) => <tbody className="divide-y divide-border/20">{children}</tbody>,
  tr: ({ children }: any) => <tr className="hover:bg-surface/10">{children}</tr>,
  th: ({ children }: any) => <th className="p-3">{children}</th>,
  td: ({ children }: any) => <td className="p-3 text-muted-foreground">{children}</td>,
};

class PreviewErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  public state = { hasError: false, error: null };
  public static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[PreviewErrorBoundary] Render crashed:", error, errorInfo);
  }
  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl my-6 text-xs">
          <h4 className="font-bold mb-2">Preview Compilation Failed</h4>
          <p className="text-[10px] text-muted-foreground mb-3">{this.state.error?.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-[10px] font-semibold text-red-300 transition-colors"
          >
            Retry Render
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

class PageErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  public state = { hasError: false, error: null };
  public static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[PageErrorBoundary] Workspace crashed:", error, errorInfo);
  }
  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-background flex items-center justify-center text-foreground p-6">
          <div className="max-w-md w-full glass-card p-6 text-center space-y-4 border border-red-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <h2 className="text-lg font-bold text-red-400">Workspace Crash Detected</h2>
            <p className="text-xs text-muted-foreground leading-normal">
              A runtime exception interrupted the Blog CMS editor.
            </p>
            <pre className="text-[10px] p-4 bg-black/40 rounded-xl border border-border/30 overflow-x-auto text-left font-mono max-h-40 overflow-y-auto">
              {this.state.error?.stack || this.state.error?.message}
            </pre>
            <div className="pt-2">
              <Link
                to="/admin/blog"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface text-xs font-semibold hover:bg-surface-hover text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminBlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { collapsed } = useSidebarStore();
  const isMobile = useIsMobile();

  // Refs
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const isScrollingEditor = useRef(false);
  const isScrollingPreview = useRef(false);

  // General States
  const [loading, setLoading] = useState(!!id);
  const [saveLoading, setSaveLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monacoFailed, setMonacoFailed] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"edit" | "split" | "preview">("split");

  // Drag-Resizable split ratios
  const containerRef = useRef<HTMLDivElement>(null);
  const [splitRatio, setSplitRatio] = useState(() => {
    const saved = localStorage.getItem("starox_editor_split_ratio");
    return saved ? parseFloat(saved) : 50;
  });
  const [isDragging, setIsDragging] = useState(false);

  // Form inputs
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentMarkdown, setContentMarkdown] = useState("");
  const [category, setCategory] = useState("Engineering");
  const [tagsInput, setTagsInput] = useState("");
  const [coverImage, setCoverImage] = useState("");
  
  // Author
  const [authorName, setAuthorName] = useState("Mayur Shashidhar");
  const [authorImage, setAuthorImage] = useState("https://strx.png");
  const [authorDesignation, setAuthorDesignation] = useState("Chief Technology Officer");
  
  // Statuses
  const [status, setStatus] = useState("draft");
  const [featured, setFeatured] = useState(false);
  const [popular, setPopular] = useState(false);
  
  // SEO
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [twitterCard, setTwitterCard] = useState("summary_large_image");
  const [metaKeywords, setMetaKeywords] = useState("");

  const [debouncedMarkdown, setDebouncedMarkdown] = useState("");

  // Media upload tasks list
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);

  // Reusable Media Library Modal States
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaFilter, setMediaFilter] = useState("all");
  const [mediaLoading, setMediaLoading] = useState(false);

  // Paste URL / Embed prompt Modal States
  const [pasteUrlOpen, setPasteUrlOpen] = useState(false);
  const [pasteUrlInput, setPasteUrlInput] = useState("");
  const [pasteUrlType, setPasteUrlType] = useState<"image" | "video" | "audio" | "file">("image");

  // Emoji Dropdown overlay open status
  const [emojiOpen, setEmojiOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Adjust ViewMode if mobile
  useEffect(() => {
    if (isMobile && viewMode === "split") {
      setViewMode("edit");
    }
  }, [isMobile, viewMode]);

  // Debounce preview updates
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedMarkdown(contentMarkdown);
    }, 250);
    return () => clearTimeout(handler);
  }, [contentMarkdown]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!id && title) {
      const generated = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setSlug(generated);
    }
  }, [title, id]);

  // Fetch blog details
  useEffect(() => {
    if (!id) {
      const saved = localStorage.getItem("starox_blog_autosave");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setTitle(parsed.title || "");
          setSlug(parsed.slug || "");
          setExcerpt(parsed.excerpt || "");
          setContentMarkdown(parsed.contentMarkdown || "");
          setCategory(parsed.category || "Engineering");
          setTagsInput(parsed.tagsInput || "");
          setCoverImage(parsed.coverImage || "");
          setAuthorName(parsed.authorName || "Mayur Shashidhar");
          setAuthorDesignation(parsed.authorDesignation || "Chief Technology Officer");
          setAuthorImage(parsed.authorImage || "");
          setStatus(parsed.status || "draft");
          setFeatured(parsed.featured || false);
          setPopular(parsed.popular || false);
          setSeoTitle(parsed.seoTitle || "");
          setSeoDescription(parsed.seoDescription || "");
          setCanonicalUrl(parsed.canonicalUrl || "");
          setMetaKeywords(parsed.metaKeywords || "");
        } catch (e) {
          console.warn("Failed to restore autosaved draft:", e);
        }
      }
      return;
    }

    const fetchPost = async () => {
      setLoading(true);
      setError(null);
      console.log(`[Admin CMS Editor] Fetching blog post details for ID: "${id}"`);
      try {
        const token = await (window as any).Clerk?.session?.getToken();
        const res = await fetch(`${API_URL}/blogs/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (!data) {
            setError("Database returned empty document.");
            return;
          }
          
          const localAutosave = localStorage.getItem(`starox_blog_autosave_${id}`);
          let useData = data;
          if (localAutosave) {
            try {
              const parsed = JSON.parse(localAutosave);
              const localTime = parsed.timestamp || 0;
              const dbTime = new Date(data.updatedAt).getTime();
              if (localTime > dbTime && confirm("You have unsaved changes from a previous session on this device. Would you like to restore them?")) {
                useData = parsed;
              }
            } catch (e) {
              console.warn("Autosave load error:", e);
            }
          }

          setTitle(useData.title || "");
          setSlug(useData.slug || "");
          setExcerpt(useData.excerpt || "");
          setContentMarkdown(useData.contentMarkdown || "");
          setCategory(useData.category || "Engineering");
          setTagsInput(useData.tags ? (Array.isArray(useData.tags) ? useData.tags.join(", ") : useData.tags) : "");
          setCoverImage(useData.coverImage || "");
          setAuthorName(useData.authorName || "");
          setAuthorDesignation(useData.authorDesignation || "");
          setAuthorImage(useData.authorImage || "");
          setStatus(useData.status || "draft");
          setFeatured(useData.featured || false);
          setPopular(useData.popular || false);
          setSeoTitle(useData.seoTitle || "");
          setSeoDescription(useData.seoDescription || "");
          setCanonicalUrl(useData.canonicalUrl || "");
          setOgImage(useData.ogImage || "");
          setTwitterCard(useData.twitterCard || "summary_large_image");
          setMetaKeywords(useData.metaKeywords ? (Array.isArray(useData.metaKeywords) ? useData.metaKeywords.join(", ") : useData.metaKeywords) : "");
          setHasChanges(false);
        } else {
          setError(`Failed to fetch article details (Server returned: ${res.status})`);
        }
      } catch (err) {
        console.error(err);
        setError("Network error occurred while fetching article details.");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  // Load Media library listing
  const fetchMediaList = async () => {
    setMediaLoading(true);
    try {
      const token = await (window as any).Clerk?.session?.getToken();
      const res = await fetch(`${API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMediaList(data.recentUploads || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMediaLoading(false);
    }
  };

  useEffect(() => {
    if (mediaModalOpen) {
      fetchMediaList();
    }
  }, [mediaModalOpen]);

  // Keyboard save shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveButtonRef.current?.click();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Unsaved changes unload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  // Mouse resizing events
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const percentage = (relativeX / rect.width) * 100;
      
      const clamped = Math.max(35, Math.min(65, percentage));
      setSplitRatio(clamped);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      localStorage.setItem("starox_editor_split_ratio", splitRatio.toString());
      if (editorRef.current) {
        editorRef.current.layout();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, splitRatio]);

  // Recalculate Monaco sizing layout
  useEffect(() => {
    if (editorRef.current) {
      setTimeout(() => {
        editorRef.current.layout();
      }, 80);
    }
  }, [viewMode, splitRatio]);

  // Autosave interval loop
  useEffect(() => {
    const interval = setInterval(() => {
      const dataToSave = {
        title,
        slug,
        excerpt,
        contentMarkdown,
        category,
        tagsInput,
        coverImage,
        authorName,
        authorDesignation,
        authorImage,
        status,
        featured,
        popular,
        seoTitle,
        seoDescription,
        canonicalUrl,
        metaKeywords,
        timestamp: Date.now()
      };
      
      const key = id ? `starox_blog_autosave_${id}` : "starox_blog_autosave";
      localStorage.setItem(key, JSON.stringify(dataToSave));
    }, 8000);

    return () => clearInterval(interval);
  }, [
    title, slug, excerpt, contentMarkdown, category, tagsInput, coverImage,
    authorName, authorDesignation, authorImage, status, featured, popular,
    seoTitle, seoDescription, canonicalUrl, metaKeywords, id
  ]);

  // Inserts formatting markdown text at the cursor position
  const insertTextAtCursor = (prefix: string, suffix: string = "") => {
    if (editorRef.current && monacoRef.current) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const selection = editor.getSelection();
      const model = editor.getModel();
      if (!selection || !model) return;

      const selectedText = model.getValueInRange(selection);
      const replacement = `${prefix}${selectedText}${suffix}`;
      
      const range = new monaco.Range(
        selection.startLineNumber,
        selection.startColumn,
        selection.endLineNumber,
        selection.endColumn
      );

      editor.executeEdits("toolbar-insert", [
        { range, text: replacement, forceMoveMarkers: true }
      ]);
      editor.focus();
      setHasChanges(true);
    } else {
      // Textarea backup fallbacks
      const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);
        const replacement = `${prefix}${selectedText}${suffix}`;
        const newValue = text.substring(0, start) + replacement + text.substring(end);
        setContentMarkdown(newValue);
        setHasChanges(true);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
        }, 50);
      }
    }
  };

  // Upload file with XHR progress monitoring, cancellation, and retry triggers (Part 7 Upload Experience)
  const uploadFileWithProgress = (file: File, type: "cover" | "author" | "inline") => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    const taskId = Math.random().toString(36).substring(7);
    
    const task: UploadTask = {
      id: taskId,
      fileName: file.name,
      progress: 0,
      status: "uploading",
      xhr,
      retryAction: () => uploadFileWithProgress(file, type)
    };

    setUploadTasks(prev => [task, ...prev]);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percentage = Math.round((e.loaded / e.total) * 100);
        setUploadTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: percentage } : t));
      }
    });

    xhr.addEventListener("load", async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.url) {
            setUploadTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "success", progress: 100 } : t));
            showToast(`Uploaded "${file.name}" successfully!`);
            
            if (type === "cover") {
              setCoverImage(data.url);
              setOgImage(data.url);
            } else if (type === "author") {
              setAuthorImage(data.url);
            } else {
              let insertStr = `![${file.name}](${data.url})`;
              if (file.type.startsWith("video/")) {
                insertStr = `\n<video controls width="100%">\n  <source src="${data.url}" type="${file.type}">\n</video>\n`;
              } else if (file.type.startsWith("audio/")) {
                insertStr = `\n<audio controls className="w-full mt-4">\n  <source src="${data.url}" type="${file.type}">\n</audio>\n`;
              } else if (file.type === "application/pdf") {
                insertStr = `\n<iframe src="${data.url}" width="100%" height="450px"></iframe>\n[Download PDF](${data.url})\n`;
              } else if (!file.type.startsWith("image/")) {
                insertStr = `[Download File](${data.url})`;
              }
              insertTextAtCursor(insertStr);
            }
            fetchMediaList();
          } else {
            setUploadTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "error" } : t));
            showToast(`Upload failed for "${file.name}"`);
          }
        } catch (e) {
          setUploadTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "error" } : t));
        }
      } else {
        setUploadTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "error" } : t));
      }
    });

    xhr.addEventListener("error", () => {
      setUploadTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "error" } : t));
      showToast(`Upload error occurred for "${file.name}"`);
    });

    xhr.addEventListener("abort", () => {
      setUploadTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "cancelled" } : t));
      showToast(`Cancelled upload of "${file.name}"`);
    });

    (window as any).Clerk?.session?.getToken().then((token: string) => {
      xhr.open("POST", `${API_URL}/media/upload`);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.send(formData);
    }).catch(() => {
      setUploadTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "error" } : t));
    });
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);

    try {
      const tags = tagsInput.split(",").map(t => t.trim()).filter(Boolean);
      const keywords = metaKeywords.split(",").map(t => t.trim()).filter(Boolean);

      const payload = {
        title,
        slug,
        excerpt,
        contentMarkdown,
        coverImage,
        category,
        tags,
        authorName,
        authorDesignation,
        authorImage,
        status,
        draft: status !== "published",
        featured,
        popular,
        seoTitle: seoTitle || title,
        seoDescription: seoDescription || excerpt,
        canonicalUrl,
        ogImage: ogImage || coverImage,
        twitterCard,
        metaKeywords: keywords
      };

      const token = await (window as any).Clerk?.session?.getToken();
      const method = id ? "PUT" : "POST";
      const endpoint = id ? `${API_URL}/blogs/${id}` : `${API_URL}/blogs`;

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setHasChanges(false);
        const key = id ? `starox_blog_autosave_${id}` : "starox_blog_autosave";
        localStorage.removeItem(key);
        navigate("/admin/blog");
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to save blog post");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save post");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from CDN library?`)) return;
    try {
      const token = await (window as any).Clerk?.session?.getToken();
      const res = await fetch(`${API_URL}/media/${mediaId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMediaList(prev => prev.filter(m => m.id !== mediaId));
        showToast("Deleted media asset");
      } else {
        alert("Failed to delete media asset");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.editor.defineTheme("staroxDark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "60a5fa", fontStyle: "bold" },
        { token: "string", foreground: "34d399" },
        { token: "number", foreground: "a78bfa" },
        { token: "comment", foreground: "6b7280", fontStyle: "italic" },
        { token: "heading", foreground: "60a5fa", fontStyle: "bold" },
        { token: "bold", fontStyle: "bold" },
        { token: "italic", fontStyle: "italic" },
      ],
      colors: {
        "editor.background": "#0B0F19",
        "editor.foreground": "#F3F4F6",
        "editorCursor.foreground": "#3B82F6",
        "editor.lineHighlightBackground": "#1E293B35",
        "editorLineNumber.foreground": "#4B5563",
        "editorLineNumber.activeForeground": "#3B82F6",
        "editor.selectionBackground": "#2563EB35",
        "editorWidget.background": "#0B0F19",
        "editorWidget.border": "#1E293B",
      }
    });

    monaco.editor.setTheme("staroxDark");

    // Scroll synchronization
    editor.onDidScrollChange(() => {
      if (viewMode !== "split" || isScrollingPreview.current || !previewContainerRef.current) return;
      isScrollingEditor.current = true;

      const scrollInfo = editor.getScrollInfo();
      const pct = scrollInfo.scrollTop / (scrollInfo.scrollHeight - scrollInfo.clientHeight || 1);
      
      const preview = previewContainerRef.current;
      preview.scrollTop = pct * (preview.scrollHeight - preview.clientHeight);

      setTimeout(() => {
        isScrollingEditor.current = false;
      }, 50);
    });

    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.addEventListener("drop", async (e: DragEvent) => {
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          const file = files[0];
          e.preventDefault();
          e.stopPropagation();
          uploadFileWithProgress(file, "inline");
        }
      });

      domNode.addEventListener("paste", async (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1 || items[i].type.indexOf("video") !== -1 || items[i].type.indexOf("audio") !== -1) {
              const file = items[i].getAsFile();
              if (file) {
                e.preventDefault();
                uploadFileWithProgress(file, "inline");
              }
            }
          }
        }
      });
    }

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveButtonRef.current?.click();
    });
  };

  const handlePreviewScroll = () => {
    if (viewMode !== "split" || isScrollingEditor.current || !editorRef.current || !previewContainerRef.current) return;
    isScrollingPreview.current = true;

    const preview = previewContainerRef.current;
    const pct = preview.scrollTop / (preview.scrollHeight - preview.clientHeight || 1);

    const scrollInfo = editorRef.current.getScrollInfo();
    editorRef.current.setScrollTop(pct * (scrollInfo.scrollHeight - scrollInfo.clientHeight));

    setTimeout(() => {
      isScrollingPreview.current = false;
    }, 50);
  };

  const handlePasteUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteUrlInput) return;

    let insertStr = "";
    if (pasteUrlType === "image") {
      insertStr = `![Alt Text](${pasteUrlInput})`;
    } else if (pasteUrlType === "video") {
      insertStr = `\n<video controls width="100%">\n  <source src="${pasteUrlInput}" type="video/mp4">\n</video>\n`;
    } else if (pasteUrlType === "audio") {
      insertStr = `\n<audio controls className="w-full mt-4">\n  <source src="${pasteUrlInput}" type="audio/mp3">\n</audio>\n`;
    } else {
      insertStr = `[Download File](${pasteUrlInput})`;
    }

    insertTextAtCursor(insertStr);
    setPasteUrlInput("");
    setPasteUrlOpen(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Filter media library lists (Images, Videos, Audio, Documents)
  const filteredMedia = mediaList.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(mediaSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (mediaFilter === "all") return true;
    if (mediaFilter === "images") return item.name.match(/\.(png|jpg|jpeg|gif|webp)$/i) !== null;
    if (mediaFilter === "videos") return item.name.match(/\.(mp4|webm|mov|mkv)$/i) !== null;
    if (mediaFilter === "audio") return item.name.match(/\.(mp3|wav|ogg|aac)$/i) !== null;
    if (mediaFilter === "documents") return item.name.match(/\.(pdf|zip|txt|json|csv)$/i) !== null;
    return true;
  });

  const wordCount = (contentMarkdown || "").split(/\s+/).filter(Boolean).length;
  const readingTimeEstimate = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar />
      <div
        className="flex-1 relative flex flex-col overflow-y-auto scroll-smooth transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: isMobile ? 0 : collapsed ? 56 : 224, paddingTop: isMobile ? 56 : 0 }}
      >
        {/* Progress micro toasting updates */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-surface border border-primary/20 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-5">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-xs font-semibold text-foreground/90">{toastMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col h-screen items-center justify-center text-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Loading publication workspace...</p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto my-32 p-6 glass-card text-center space-y-4">
            <h2 className="text-lg font-bold text-red-400">Error Loading Document</h2>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Link
              to="/admin/blog"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface text-xs font-semibold hover:bg-surface-hover text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSavePost} className="max-w-6xl mx-auto px-6 py-10 w-full text-foreground relative z-10 space-y-6">
            
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-6">
              <div className="flex items-center gap-4">
                <Link
                  to="/admin/blog"
                  className="p-2 rounded-lg border border-border bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                  <h1 className="text-xl font-display font-bold">
                    {id ? "Edit Article" : "Compose Article"}
                  </h1>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {id ? `Modifying post ID: ${id}` : "Save drafts or publish to global feed."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 ml-auto">
                {hasChanges ? (
                  <span className="text-[11px] text-amber-400 animate-pulse bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 font-semibold shrink-0">
                    Unsaved Changes
                  </span>
                ) : (
                  <span className="text-[11px] text-green-400 bg-green-500/10 px-2.5 py-1 rounded-md border border-green-500/20 font-semibold shrink-0">
                    All Saved
                  </span>
                )}

                {/* Viewmode Segmented tab control */}
                <div className="relative flex bg-surface border border-border/50 rounded-xl p-1 shrink-0 font-semibold text-xs select-none">
                  <div 
                    className="absolute bg-primary rounded-lg transition-all duration-200"
                    style={{
                      top: 4,
                      bottom: 4,
                      left: viewMode === "edit" ? 4 : viewMode === "split" ? (isMobile ? 0 : 54) : (isMobile ? 54 : 100),
                      width: viewMode === "edit" ? 50 : viewMode === "split" ? (isMobile ? 0 : 46) : 66,
                      opacity: viewMode === "split" && isMobile ? 0 : 1
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("edit");
                      if (editorRef.current) {
                        editorRef.current.focus();
                      }
                    }}
                    className={`relative z-10 px-3 py-1.5 rounded-lg transition-colors ${
                      viewMode === "edit" ? "text-white font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Edit
                  </button>
                  
                  {!isMobile && (
                    <button
                      type="button"
                      onClick={() => setViewMode("split")}
                      className={`relative z-10 px-3 py-1.5 rounded-lg transition-colors ${
                        viewMode === "split" ? "text-white font-bold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Split
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => setViewMode("preview")}
                    className={`relative z-10 px-3 py-1.5 rounded-lg transition-colors ${
                      viewMode === "preview" ? "text-white font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Preview
                  </button>
                </div>

                <button
                  ref={saveButtonRef}
                  type="submit"
                  disabled={saveLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl gradient-starox text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {saveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Article
                </button>
              </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Form + Editor Workspace */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Form fields */}
                <div className="glass-card p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-semibold">Article Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Edge LLM inference benchmarks"
                      value={title}
                      onChange={(e) => { setTitle(e.target.value); setHasChanges(true); }}
                      className="w-full px-4 py-3 rounded-xl bg-surface border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground font-semibold">URL Slug</label>
                      <input
                        type="text"
                        required
                        placeholder="edge-llm-benchmarks"
                        value={slug}
                        onChange={(e) => { setSlug(e.target.value); setHasChanges(true); }}
                        className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border/50 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground font-semibold">Category</label>
                      <select
                        value={category}
                        onChange={(e) => { setCategory(e.target.value); setHasChanges(true); }}
                        className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border/50 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-semibold">Summary Excerpt</label>
                    <textarea
                      rows={2}
                      placeholder="Summary excerpt..."
                      value={excerpt}
                      onChange={(e) => { setExcerpt(e.target.value); setHasChanges(true); }}
                      className="w-full px-4 py-3 rounded-xl bg-surface border border-border/50 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none"
                    />
                  </div>
                </div>

                {/* Full Formatting + Media Toolbar Editor Container (Part 1 VS Code + Notion experience) */}
                <div className="glass-card overflow-hidden flex flex-col min-h-[620px] w-full border border-border/50 shadow-2xl relative">
                  
                  {/* Active Upload Tasks overlay progress bar list */}
                  {uploadTasks.some(t => t.status === "uploading") && (
                    <div className="bg-surface/90 border-b border-border/40 p-3 space-y-2 animate-in fade-in">
                      {uploadTasks.filter(t => t.status === "uploading").map(task => (
                        <div key={task.id} className="flex items-center justify-between text-xs gap-4">
                          <div className="flex items-center gap-2 overflow-hidden flex-1">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                            <span className="truncate font-mono text-[11px]">{task.fileName}</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-primary">{task.progress}%</span>
                            
                            {/* Cancel upload button */}
                            <button
                              type="button"
                              onClick={() => task.xhr.abort()}
                              className="p-1 rounded bg-surface border border-border text-red-400 hover:text-red-300 text-[10px] font-semibold transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Active Failed Tasks (retry options) */}
                  {uploadTasks.some(t => t.status === "error") && (
                    <div className="bg-red-500/10 border-b border-red-500/20 p-2.5 space-y-2">
                      {uploadTasks.filter(t => t.status === "error").map(task => (
                        <div key={task.id} className="flex items-center justify-between text-[11px] text-red-400">
                          <span className="truncate flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                            Failed: {task.fileName}
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setUploadTasks(prev => prev.filter(t => t.id !== task.id));
                                if (task.retryAction) task.retryAction();
                              }}
                              className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30"
                            >
                              <RefreshCw className="w-3 h-3" /> Retry
                            </button>
                            <button
                              type="button"
                              onClick={() => setUploadTasks(prev => prev.filter(t => t.id !== task.id))}
                              className="p-0.5 text-muted-foreground hover:text-foreground"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formatting Toolbar */}
                  <div className="bg-surface/75 backdrop-blur-md border-b border-border/40 px-3 py-2 flex flex-wrap items-center gap-1.5 text-muted-foreground select-none relative z-20">
                    <button type="button" onClick={() => insertTextAtCursor("# ")} className="p-1.5 hover:bg-surface-hover hover:text-foreground rounded transition-colors" title="H1"><Heading1 className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertTextAtCursor("## ")} className="p-1.5 hover:bg-surface-hover hover:text-foreground rounded transition-colors" title="H2"><Heading2 className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertTextAtCursor("### ")} className="p-1.5 hover:bg-surface-hover hover:text-foreground rounded transition-colors" title="H3"><Heading3 className="w-4 h-4" /></button>
                    <div className="w-px h-4 bg-border/40 mx-1" />
                    <button type="button" onClick={() => insertTextAtCursor("**", "**")} className="p-1.5 hover:bg-surface-hover hover:text-foreground rounded transition-colors" title="Bold"><Bold className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertTextAtCursor("*", "*")} className="p-1.5 hover:bg-surface-hover hover:text-foreground rounded transition-colors" title="Italic"><Italic className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertTextAtCursor("<u>", "</u>")} className="p-1.5 hover:bg-surface-hover hover:text-foreground rounded transition-colors" title="Underline"><Underline className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertTextAtCursor("~~", "~~")} className="p-1.5 hover:bg-surface-hover hover:text-foreground rounded transition-colors" title="Strikethrough"><Strikethrough className="w-4 h-4" /></button>
                    <div className="w-px h-4 bg-border/40 mx-1" />
                    <button type="button" onClick={() => insertTextAtCursor("> ")} className="p-1.5 hover:bg-surface-hover hover:text-foreground rounded transition-colors" title="Quote"><Quote className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertTextAtCursor("`", "`")} className="p-1.5 hover:bg-surface-hover hover:text-foreground rounded transition-colors" title="Inline Code"><Code className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertTextAtCursor("```\n", "\n```")} className="p-1.5 hover:bg-surface-hover hover:text-foreground rounded transition-colors" title="Code Block"><Terminal className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertTextAtCursor("\n| Col 1 | Col 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n")} className="p-1.5 hover:bg-surface-hover hover:text-foreground rounded transition-colors" title="Table"><Table className="w-4 h-4" /></button>
                    <div className="w-px h-4 bg-border/40 mx-1" />
                    <button type="button" onClick={() => insertTextAtCursor("1. ")} className="p-1.5 hover:bg-surface-hover hover:text-foreground rounded transition-colors" title="Ordered List"><ListOrdered className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertTextAtCursor("- ")} className="p-1.5 hover:bg-surface-hover hover:text-foreground rounded transition-colors" title="Bullet List"><List className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertTextAtCursor("- [ ] ")} className="p-1.5 hover:bg-surface-hover hover:text-foreground rounded transition-colors" title="Checklist"><ListTodo className="w-4 h-4" /></button>
                    <button type="button" onClick={() => insertTextAtCursor("\n---\n")} className="p-1.5 hover:bg-surface-hover hover:text-foreground rounded transition-colors" title="Horizontal Rule"><Minus className="w-4 h-4" /></button>
                    <div className="w-px h-4 bg-border/40 mx-1" />
                    <button type="button" onClick={() => insertTextAtCursor("[", "](https://)")} className="p-1.5 hover:bg-surface-hover hover:text-foreground rounded transition-colors" title="Link"><LinkIcon className="w-4 h-4" /></button>
                    
                    {/* Emoji dropdown selector */}
                    <div className="relative">
                      <button 
                        type="button" 
                        onClick={() => setEmojiOpen(!emojiOpen)} 
                        className={`p-1.5 rounded transition-colors ${emojiOpen ? "bg-surface text-primary" : "hover:bg-surface-hover hover:text-foreground"}`}
                        title="Insert Emoji"
                      >
                        <Smile className="w-4 h-4" />
                      </button>
                      {emojiOpen && (
                        <div className="absolute top-full left-0 mt-1.5 p-2 bg-[#0B0F19] border border-border rounded-xl shadow-2xl z-50 grid grid-cols-4 gap-1 select-none w-36">
                          {EMOJIS.map(emo => (
                            <button
                              key={emo}
                              type="button"
                              onClick={() => {
                                insertTextAtCursor(emo);
                                setEmojiOpen(false);
                              }}
                              className="p-1 text-base hover:bg-surface rounded text-center"
                            >
                              {emo}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button 
                      type="button" 
                      onClick={() => setMediaModalOpen(true)} 
                      className="p-1.5 hover:bg-surface-hover hover:text-foreground rounded transition-colors ml-auto flex items-center gap-1 text-[11px] font-bold text-primary"
                      title="Open Media Library"
                    >
                      <FolderOpen className="w-4 h-4" /> Library
                    </button>
                  </div>

                  {/* Media Toolbar (drag & drop replacements) */}
                  <div className="bg-surface/50 border-b border-border/30 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-muted-foreground select-none relative z-10">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                      {/* Image Picker */}
                      <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 bg-surface/40 hover:bg-surface hover:text-foreground cursor-pointer transition-colors text-[11px]">
                        <ImageIcon className="w-3.5 h-3.5 text-primary" /> Image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              uploadFileWithProgress(e.target.files[0], "inline");
                            }
                          }}
                        />
                      </label>

                      {/* Video Picker */}
                      <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 bg-surface/40 hover:bg-surface hover:text-foreground cursor-pointer transition-colors text-[11px]">
                        <VideoIcon className="w-3.5 h-3.5 text-blue-400" /> Video
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              uploadFileWithProgress(e.target.files[0], "inline");
                            }
                          }}
                        />
                      </label>

                      {/* Generic File Picker */}
                      <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 bg-surface/40 hover:bg-surface hover:text-foreground cursor-pointer transition-colors text-[11px]">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" /> File
                        <input
                          type="file"
                          accept=".pdf,.zip,.txt,.json,.csv"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              uploadFileWithProgress(e.target.files[0], "inline");
                            }
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setMediaModalOpen(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 bg-surface/40 hover:bg-surface hover:text-foreground transition-colors text-[11px] cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-emerald-400" /> Media Library
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPasteUrlType("image");
                          setPasteUrlOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 bg-surface/40 hover:bg-surface hover:text-foreground transition-colors text-[11px] cursor-pointer"
                      >
                        <Clipboard className="w-3.5 h-3.5 text-amber-400" /> Paste URL
                      </button>
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                      <span>Words: {wordCount}</span>
                      <span>Est: {readingTimeEstimate} min</span>
                    </div>
                  </div>

                  {/* Monaco and Preview Workspace Pane */}
                  <div 
                    ref={containerRef}
                    className="flex flex-row flex-1 w-full relative"
                    style={{ cursor: isDragging ? "col-resize" : "default" }}
                  >
                    
                    {/* Monaco Editor Container (Strict explicit height h-[550px] prevents collapses) */}
                    <div 
                      className="flex flex-col h-[550px] relative select-text"
                      style={{ 
                        width: viewMode === "edit" ? "100%" : `${splitRatio}%`,
                        display: viewMode === "preview" ? "none" : "flex" 
                      }}
                    >
                      {monacoFailed ? (
                        <textarea
                          value={contentMarkdown}
                          onChange={(e) => handleEditorChange(e.target.value)}
                          className="w-full h-full min-h-[400px] bg-[#0B0F19] text-foreground p-4 focus:outline-none font-mono resize-none border-none outline-none"
                          placeholder="Write article GFM markdown here..."
                        />
                      ) : (
                        <Editor
                          height="100%"
                          defaultLanguage="markdown"
                          value={contentMarkdown || ""}
                          onChange={(val) => { setContentMarkdown(val || ""); setHasChanges(true); }}
                          onMount={handleEditorDidMount}
                          onError={(err) => {
                            console.error("[Monaco Editor] Loading failed, using textarea fallback.", err);
                            setMonacoFailed(true);
                          }}
                          loading={
                            <div className="flex items-center justify-center p-8">
                              <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                          }
                          options={{
                            readOnly: false,
                            automaticLayout: true,
                            wordWrap: "on",
                            lineNumbers: "on",
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            smoothScrolling: true,
                            fontSize: 15,
                            fontFamily: "JetBrains Mono, Menlo, Monaco, Consolas, monospace",
                            tabSize: 2,
                            insertSpaces: true,
                            renderWhitespace: "selection",
                            renderLineHighlight: "all",
                            bracketPairColorization: { enabled: true },
                            cursorBlinking: "smooth",
                            cursorSmoothCaretAnimation: "on",
                            cursorStyle: "line",
                            padding: { top: 12, bottom: 12 },
                            folding: true,
                            stickyScroll: { enabled: true }
                          }}
                        />
                      )}
                    </div>

                    {/* Resizable drag bar splitter */}
                    {viewMode === "split" && !isMobile && (
                      <div 
                        onMouseDown={handleMouseDown}
                        className="w-1.5 bg-border/40 hover:bg-primary/60 hover:shadow-[0_0_10px_rgba(59,130,246,0.5)] cursor-col-resize transition-all shrink-0 z-30 relative"
                        title="Drag to resize panels"
                      />
                    )}

                    {/* Preview (Strict explicit height h-[550px] prevents collapses, uses rehypeRaw) */}
                    <div 
                      ref={previewContainerRef}
                      onScroll={handlePreviewScroll}
                      className={`p-6 overflow-y-auto h-[550px] bg-[#0d1117]/20 prose prose-invert select-text scrollbar-thin transition-all duration-75 ${
                        viewMode === "preview" ? "w-full max-w-[800px] mx-auto" : ""
                      }`}
                      style={{ 
                        width: viewMode === "preview" ? "100%" : `${100 - splitRatio}%`,
                        display: viewMode === "edit" ? "none" : "block"
                      }}
                    >
                      <PreviewErrorBoundary>
                        {contentMarkdown ? (
                          <div className="markdown-content text-foreground/90 leading-relaxed space-y-4">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeHighlight, rehypeSlug, rehypeAutolinkHeadings, rehypeRaw]}
                              components={CustomMarkdownRenderers}
                            >
                              {debouncedMarkdown}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-muted-foreground italic text-center py-20">Live compile preview displays here</p>
                        )}
                      </PreviewErrorBoundary>
                    </div>

                  </div>
                </div>

              </div>

              {/* Right Column: Uploads, Author, Metadata, SEO */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Status Options */}
                <div className="glass-card p-5 space-y-4">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-2">
                    Publishing options
                  </h3>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-semibold">Post Status</label>
                    <select
                      value={status}
                      onChange={(e) => { setStatus(e.target.value); setHasChanges(true); }}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-border/50 text-xs text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2 pt-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={featured}
                        onChange={(e) => { setFeatured(e.target.checked); setHasChanges(true); }}
                        className="rounded border-border bg-surface text-primary focus:ring-0 focus:ring-offset-0"
                      />
                      <span>Featured Article</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={popular}
                        onChange={(e) => { setPopular(e.target.checked); setHasChanges(true); }}
                        className="rounded border-border bg-surface text-primary focus:ring-0 focus:ring-offset-0"
                      />
                      <span>Popular Article</span>
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground font-semibold">Tags (Comma-separated)</label>
                    <div className="relative">
                      <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="ai, deployment, nextjs"
                        value={tagsInput}
                        onChange={(e) => { setTagsInput(e.target.value); setHasChanges(true); }}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-border/50 text-xs text-foreground focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Cover Image Upload */}
                <div className="glass-card p-5 space-y-4">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-2">
                    Cover Image
                  </h3>

                  <div className="space-y-3">
                    {coverImage ? (
                      <div className="relative rounded-xl overflow-hidden aspect-video border border-border/40 bg-surface">
                        <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => { setCoverImage(""); setHasChanges(true); }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-border/60 bg-surface/30 cursor-pointer hover:bg-surface transition-colors">
                        <Camera className="w-8 h-8 text-muted-foreground/60 mb-2" />
                        <span className="text-[11px] font-bold text-muted-foreground">Upload Cover Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              uploadFileWithProgress(e.target.files[0], "cover");
                            }
                          }}
                        />
                      </label>
                    )}
                    <input
                      type="text"
                      placeholder="Paste cover image URL..."
                      value={coverImage}
                      onChange={(e) => { setCoverImage(e.target.value); setHasChanges(true); }}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-border/50 text-[11px] text-foreground font-mono focus:outline-none focus:border-primary/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Author configuration */}
                <div className="glass-card p-5 space-y-4">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-2">
                    Author configuration
                  </h3>

                  <div className="flex items-center gap-3">
                    {authorImage ? (
                      <div className="relative shrink-0 w-12 h-12 rounded-full overflow-hidden border border-border">
                        <img src={authorImage} alt="Author Preview" className="w-full h-full object-cover" />
                        <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition-opacity text-white">
                          <Upload className="w-3 h-3" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                uploadFileWithProgress(e.target.files[0], "author");
                              }
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center shrink-0 w-12 h-12 rounded-full border-2 border-dashed border-border/60 bg-surface cursor-pointer hover:bg-surface-hover">
                        <UserIcon className="w-4 h-4 text-muted-foreground/60" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              uploadFileWithProgress(e.target.files[0], "author");
                            }
                          }}
                        />
                      </label>
                    )}
                    <div className="space-y-1 flex-1">
                      <label className="text-[10px] text-muted-foreground">Author Image URL</label>
                      <input
                        type="text"
                        placeholder="Image URL..."
                        value={authorImage}
                        onChange={(e) => { setAuthorImage(e.target.value); setHasChanges(true); }}
                        className="w-full px-2.5 py-1.5 bg-surface border border-border/50 text-[10px] rounded-lg focus:outline-none text-foreground font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-semibold">Author Name</label>
                      <input
                        type="text"
                        required
                        value={authorName}
                        onChange={(e) => { setAuthorName(e.target.value); setHasChanges(true); }}
                        className="w-full px-3 py-2 bg-surface border border-border/50 rounded-xl focus:outline-none focus:border-primary/50 text-foreground"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-semibold">Author Designation</label>
                      <input
                        type="text"
                        required
                        value={authorDesignation}
                        onChange={(e) => { setAuthorDesignation(e.target.value); setHasChanges(true); }}
                        className="w-full px-3 py-2 bg-surface border border-border/50 rounded-xl focus:outline-none focus:border-primary/50 text-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* SEO Configurations */}
                <div className="glass-card p-5 space-y-4">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-2">
                    SEO configuration
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">SEO Title</label>
                      <input
                        type="text"
                        placeholder={title || "Article SEO Title"}
                        value={seoTitle}
                        onChange={(e) => { setSeoTitle(e.target.value); setHasChanges(true); }}
                        className="w-full px-3 py-2 bg-surface border border-border/50 rounded-xl focus:outline-none focus:border-primary/50 text-foreground"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">SEO Description</label>
                      <textarea
                        rows={2}
                        placeholder={excerpt || "Search engine description..."}
                        value={seoDescription}
                        onChange={(e) => { setSeoDescription(e.target.value); setHasChanges(true); }}
                        className="w-full px-3 py-2 bg-surface border border-border/50 rounded-xl focus:outline-none focus:border-primary/50 text-foreground resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Canonical URL</label>
                      <div className="relative">
                        <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="url"
                          placeholder="https://starox.space/blog/slug"
                          value={canonicalUrl}
                          onChange={(e) => { setCanonicalUrl(e.target.value); setHasChanges(true); }}
                          className="w-full pl-9 pr-3 py-2 bg-surface border border-border/50 rounded-xl focus:outline-none focus:border-primary/50 text-foreground font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">Keywords (Comma-separated)</label>
                      <input
                        type="text"
                        placeholder="llm, pipeline, edge computing"
                        value={metaKeywords}
                        onChange={(e) => { setMetaKeywords(e.target.value); setHasChanges(true); }}
                        className="w-full px-3 py-2 bg-surface border border-border/50 rounded-xl focus:outline-none focus:border-primary/50 text-foreground"
                      />
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </form>
        )}
      </div>

      {/* 1. Reusable Media Library Modal (Part 7 & 11) */}
      {mediaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setMediaModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div className="relative w-full max-w-4xl h-[85vh] glass-card p-6 z-10 flex flex-col justify-between overflow-hidden shadow-2xl border border-border/40">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-border/30 pb-4 mb-4 select-none shrink-0">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-primary" /> Reusable Asset Manager
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">Select any uploaded file to insert it at your current cursor.</p>
              </div>
              <button type="button" onClick={() => setMediaModalOpen(false)} className="text-muted-foreground hover:text-white p-1 hover:bg-surface rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter, Search & Upload Control Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4 select-none shrink-0">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search file name..."
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-surface border border-border/50 text-xs rounded-xl focus:outline-none text-foreground"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
                {["all", "images", "videos", "audio", "documents"].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMediaFilter(type)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold border uppercase tracking-wider transition-colors shrink-0 ${
                      mediaFilter === type 
                        ? "border-primary bg-primary/10 text-primary" 
                        : "border-border bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Direct Upload Trigger */}
              <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg gradient-starox text-white text-[10px] font-semibold hover:opacity-90 transition-opacity cursor-pointer shrink-0">
                <Upload className="w-3.5 h-3.5" /> Upload File
                <input
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.zip,.txt"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      uploadFileWithProgress(e.target.files[0], "inline");
                    }
                  }}
                />
              </label>
            </div>

            {/* Grid list container */}
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin select-text">
              {mediaLoading ? (
                <div className="flex flex-col h-48 items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">Indexing assets from Cloudinary...</p>
                </div>
              ) : filteredMedia.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-border/30 rounded-xl bg-surface/10">
                  <ImageIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <h4 className="text-xs font-bold">No assets found</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Upload new files or modify search query.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredMedia.map(item => {
                    const isImg = item.name.match(/\.(png|jpg|jpeg|gif|webp)$/i) !== null;
                    const isVid = item.name.match(/\.(mp4|webm|mov|mkv)$/i) !== null;
                    const isAud = item.name.match(/\.(mp3|wav|ogg|aac)$/i) !== null;

                    return (
                      <div key={item.id} className="glass-card p-2 flex flex-col justify-between hover:border-primary/30 transition-all group relative overflow-hidden">
                        
                        {/* Preview Frame */}
                        <div className="rounded-lg aspect-video bg-surface overflow-hidden relative mb-2 flex items-center justify-center border border-border/30">
                          {isImg ? (
                            <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                          ) : isVid ? (
                            <div className="relative w-full h-full bg-slate-950 flex items-center justify-center text-blue-400">
                              <Play className="w-8 h-8 fill-current" />
                              <span className="absolute bottom-1 right-1 text-[8px] bg-black/60 px-1 py-0.5 rounded text-white uppercase">Video</span>
                            </div>
                          ) : isAud ? (
                            <div className="relative w-full h-full bg-slate-950 flex items-center justify-center text-indigo-400">
                              <Music className="w-8 h-8" />
                              <span className="absolute bottom-1 right-1 text-[8px] bg-black/60 px-1 py-0.5 rounded text-white uppercase">Audio</span>
                            </div>
                          ) : (
                            <div className="relative w-full h-full bg-slate-950 flex items-center justify-center text-muted-foreground">
                              <FileText className="w-8 h-8" />
                              <span className="absolute bottom-1 right-1 text-[8px] bg-black/60 px-1 py-0.5 rounded text-white uppercase">Doc</span>
                            </div>
                          )}
                        </div>

                        {/* Filename details */}
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold truncate font-mono text-foreground/90">{item.name}</p>
                          <p className="text-[9px] text-muted-foreground">{(item.size / 1024).toFixed(1)} KB</p>
                        </div>

                        {/* Hover Overlay actions */}
                        <div className="flex gap-1 mt-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              let insertStr = `![${item.name}](${item.url})`;
                              if (isVid) {
                                insertStr = `\n<video controls width="100%">\n  <source src="${item.url}" type="video/mp4">\n</video>\n`;
                              } else if (isAud) {
                                insertStr = `\n<audio controls className="w-full mt-4">\n  <source src="${item.url}" type="audio/mp3">\n</audio>\n`;
                              } else if (item.name.match(/\.pdf$/i)) {
                                insertStr = `\n<iframe src="${item.url}" width="100%" height="450px"></iframe>\n[Download PDF](${item.url})\n`;
                              } else if (!isImg) {
                                insertStr = `[Download File](${item.url})`;
                              }
                              insertTextAtCursor(insertStr);
                              setMediaModalOpen(false);
                            }}
                            className="flex-1 py-1 rounded bg-primary text-white text-[9px] font-bold hover:opacity-90"
                          >
                            Insert
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteMedia(item.id, item.name)}
                            className="p-1 rounded bg-surface border border-red-500/20 hover:bg-red-500/10 text-red-400"
                            title="Delete Asset from CDN"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-4 border-t border-border/30 pt-3 select-none shrink-0 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-mono">CDN Provider: Cloudinary</span>
              <button 
                type="button" 
                onClick={() => setMediaModalOpen(false)} 
                className="px-4 py-1.5 bg-surface border border-border rounded-xl text-xs font-semibold hover:bg-surface-hover"
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. Paste URL Prompt Modal */}
      {pasteUrlOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          <div onClick={() => setPasteUrlOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <form onSubmit={handlePasteUrlSubmit} className="relative w-full max-w-sm glass-card p-5 z-10 space-y-4 border border-border/40">
            <div className="flex justify-between items-center border-b border-border/30 pb-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Clipboard className="w-4 h-4 text-primary" /> Embed Public URL
              </h3>
              <button type="button" onClick={() => setPasteUrlOpen(false)} className="text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-semibold">Media Type</label>
              <select
                value={pasteUrlType}
                onChange={(e: any) => setPasteUrlType(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-surface border border-border text-xs rounded-lg text-foreground focus:outline-none"
              >
                <option value="image">Image / GIF</option>
                <option value="video">Video Player</option>
                <option value="audio">Audio Player</option>
                <option value="file">Generic Download Link</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-semibold">Asset URL</label>
              <input
                type="url"
                required
                placeholder="https://example.com/asset.mp4"
                value={pasteUrlInput}
                onChange={(e) => setPasteUrlInput(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border text-xs rounded-xl focus:outline-none focus:border-primary/50 text-foreground font-mono"
              />
            </div>

            <button type="submit" className="w-full py-2 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-90">
              Insert Media
            </button>
          </form>
        </div>
      )}

    </div>
  );
}

// Export with page ErrorBoundary
export default function AdminBlogEditorWithErrorBoundary() {
  return (
    <PageErrorBoundary>
      <AdminBlogEditor />
    </PageErrorBoundary>
  );
}
