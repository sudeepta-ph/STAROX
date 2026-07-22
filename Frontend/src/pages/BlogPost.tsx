import React, { useEffect, useState, useRef, Component, ErrorInfo, ReactNode } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
  Calendar,
  Clock,
  User as UserIcon,
  ChevronLeft,
  Share2,
  Check,
  Twitter,
  Linkedin,
  Eye,
  Loader2,
  BookOpen,
  Link as LinkIcon,
  Copy,
  ArrowLeft
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

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

// Page-Level Error Boundary for robust workspace crash recovery
class PageErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  public state = { hasError: false, error: null };
  public static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[PageErrorBoundary] Blog page crashed:", error, errorInfo);
  }
  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center text-foreground p-6">
          <div className="max-w-md w-full glass-card p-6 text-center space-y-4 border border-red-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <h2 className="text-lg font-bold text-red-400">Rendering Error</h2>
            <p className="text-xs text-muted-foreground leading-normal">
              An error occurred while displaying this blog post.
            </p>
            <pre className="text-[10px] p-4 bg-black/40 rounded-xl border border-red-500/20 overflow-x-auto text-left font-mono max-h-40 overflow-y-auto">
              {this.state.error?.stack || this.state.error?.message}
            </pre>
            <div className="pt-2">
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface text-xs font-semibold hover:bg-surface-hover text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Feed
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") 
    .replace(/&/g, "-and-") 
    .replace(/[^\w\-]+/g, "") 
    .replace(/\-\-+/g, "-") 
    .replace(/^-+/, "") 
    .replace(/-+$/, "");
};

export const getInnerText = (node: any): string => {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getInnerText).join("");
  if (node.props && node.props.children) return getInnerText(node.props.children);
  return "";
};

const extractHeadings = (markdown: string): TocItem[] => {
  if (!markdown) return [];
  const headingRegex = /^(##|###|####)\s+(.+)$/gm;
  const headings: TocItem[] = [];
  let match;
  
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length; 
    const text = match[2].trim(); 
    const id = slugify(text);
    headings.push({ id, text, level });
  }
  return headings;
};

const HeadingWithAnchor = ({ level, children, showToast }: any) => {
  const HeadingTag = `h${level}` as any;
  const text = getInnerText(children);
  const id = slugify(text);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url);
    window.history.replaceState(null, "", `#${id}`);
    showToast("Heading link copied to clipboard");
  };

  const getHeadingStyles = () => {
    switch (level) {
      case 1:
        return "text-[2.5rem] font-bold font-display leading-[1.2] mt-12 mb-6 text-foreground bg-clip-text text-transparent bg-gradient-to-b from-white to-foreground/80";
      case 2:
        return "text-[1.85rem] font-bold font-display leading-[1.3] mt-10 mb-5 border-b border-border/30 pb-2 text-foreground scroll-mt-24";
      case 3:
        return "text-[1.4rem] font-bold font-display leading-[1.4] mt-8 mb-4 text-foreground scroll-mt-24";
      case 4:
        return "text-[1.15rem] font-semibold leading-[1.5] mt-6 mb-3 text-foreground scroll-mt-24";
      default:
        return "font-semibold text-foreground scroll-mt-24";
    }
  };

  return (
    <HeadingTag id={id} className={`group relative flex items-center ${getHeadingStyles()}`}>
      {children}
      <button
        type="button"
        onClick={handleCopyLink}
        className="opacity-0 group-hover:opacity-100 transition-opacity ml-2.5 p-1 rounded-lg hover:bg-surface/50 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        title="Copy anchor link"
      >
        <LinkIcon className="w-3.5 h-3.5" />
      </button>
    </HeadingTag>
  );
};

const MermaidDiagram = ({ code }: { code: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const renderChart = async () => {
      try {
        const mermaid = (window as any).mermaid;
        if (!mermaid) {
          if (!document.getElementById("mermaid-script-cdn")) {
            const script = document.createElement("script");
            script.id = "mermaid-script-cdn";
            script.src = "https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js";
            script.async = true;
            script.onload = () => {
              if (active) initAndRender();
            };
            document.body.appendChild(script);
          } else {
            const checkInterval = setInterval(() => {
              if ((window as any).mermaid) {
                clearInterval(checkInterval);
                if (active) initAndRender();
              }
            }, 100);
          }
        } else {
          initAndRender();
        }
      } catch (err: any) {
        console.error("Mermaid script load error:", err);
        setError("Failed to load rendering engine");
      }
    };

    const initAndRender = async () => {
      try {
        const mermaid = (window as any).mermaid;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
        });
        if (containerRef.current) {
          containerRef.current.innerHTML = `<div class="mermaid">${code}</div>`;
          await mermaid.run({
            nodes: containerRef.current.querySelectorAll(".mermaid"),
          });
          setRendered(true);
        }
      } catch (err: any) {
        console.error("Mermaid parsing crashed:", err);
        setError("Invalid diagram syntax");
      }
    };

    renderChart();
    return () => {
      active = false;
    };
  }, [code]);

  if (error) {
    return (
      <div className="p-4 text-xs font-mono bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl my-4">
        <strong>Mermaid:</strong> {error}
      </div>
    );
  }

  return (
    <div className="flex justify-center bg-surface/20 border border-border/40 rounded-xl p-4 my-6 overflow-x-auto">
      <div ref={containerRef} className="w-full flex justify-center" />
      {!rendered && <div className="text-xs text-muted-foreground animate-pulse">Parsing chart...</div>}
    </div>
  );
};

const CodeBlock = ({ children, className, inline }: any) => {
  const match = /language-(\w+)/.exec(className || "");
  const lang = match ? match[1] : "";
  const codeText = String(children).replace(/\n$/, "");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (lang === "mermaid") {
    return <MermaidDiagram code={codeText} />;
  }

  if (inline) {
    return (
      <code className="bg-surface px-1.5 py-0.5 rounded font-mono text-[13px] text-primary border border-border/30">
        {children}
      </code>
    );
  }

  return (
    <div className="relative border border-border/40 rounded-xl overflow-hidden my-6 bg-[#0d1117] font-mono group shadow-lg">
      <div className="flex justify-between items-center bg-surface/50 px-4 py-2 border-b border-border/30 text-xs text-muted-foreground">
        <span className="uppercase text-[10px] font-bold tracking-wider">{lang || "code"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-foreground transition-colors text-[11px]"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
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
};

interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
class BlogErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };
  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[BlogErrorBoundary] Markdown compilation crashed:", error, errorInfo);
  }
  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl my-8">
          <h2 className="text-base font-bold mb-2">Markdown Compilation Error</h2>
          <p className="text-xs text-muted-foreground mb-4">
            An issue occurred while parsing this article's syntax code block tree.
          </p>
          <pre className="text-[10px] p-4 bg-black/45 rounded-xl border border-border/30 overflow-x-auto text-left font-mono">
            {this.state.error?.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const SkeletonLoader = () => (
  <div className="animate-pulse space-y-6 w-full max-w-[750px]">
    <div className="h-5 bg-surface-hover w-20 rounded-md" />
    <div className="h-10 bg-surface-hover w-3/4 rounded-xl" />
    <div className="flex items-center gap-4 border-y border-border/40 py-4">
      <div className="w-11 h-11 rounded-full bg-surface-hover" />
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-surface-hover w-32 rounded" />
        <div className="h-3 bg-surface-hover w-24 rounded" />
      </div>
    </div>
    <div className="rounded-2xl aspect-video w-full bg-surface-hover shadow" />
    <div className="space-y-3 pt-4">
      <div className="h-4 bg-surface-hover w-full rounded" />
      <div className="h-4 bg-surface-hover w-full rounded" />
      <div className="h-4 bg-surface-hover w-5/6 rounded" />
      <div className="h-4 bg-surface-hover w-2/3 rounded" />
    </div>
  </div>
);

function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { collapsed } = useSidebarStore();
  const isMobile = useIsMobile();

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState("");

  // Subscribed tracker (hides newsletter widget if already subscribed)
  const [isSubscribed, setIsSubscribed] = useState(() => localStorage.getItem("starox_subscribed") === "true");

  const articleContentRef = useRef<HTMLDivElement>(null);
  const tocContainerRef = useRef<HTMLDivElement>(null);

  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        setScrollProgress((window.scrollY / scrollHeight) * 100);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    console.log(`[Blog Reader] Slug parameter from useParams(): "${slug}"`);
    
    const fetchPost = async () => {
      setLoading(true);
      try {
        const token = await (window as any).Clerk?.session?.getToken();
        const headers: any = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/blogs/${slug}`, { headers });
        console.log(`[Blog Reader] Fetched response status: ${res.status}`);
        
        if (res.ok) {
          const data = await res.json();
          console.log("[Blog Reader] Fetched blog document data:", data);
          setPost(data);
          const parsedHeadings = extractHeadings(data?.contentMarkdown || "");
          setHeadings(parsedHeadings);
        } else {
          setPost(null);
        }
      } catch (err) {
        console.error("[Blog Reader] Fetch error:", err);
        setPost(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  // Scroll Spy distance calculation
  useEffect(() => {
    if (headings.length === 0) return;

    const visibleHeadings = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleHeadings.add(entry.target.id);
          } else {
            visibleHeadings.delete(entry.target.id);
          }
        });
        updateActiveHeading();
      },
      {
        root: null,
        rootMargin: "-80px 0px -50% 0px", 
        threshold: 0
      }
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    const updateActiveHeading = () => {
      if (isScrollingRef.current) return;

      const ACTIVATION_OFFSET = 100;
      let closestId = "";
      let minDistance = Infinity;

      const candidateHeadings = visibleHeadings.size > 0 
        ? Array.from(visibleHeadings) 
        : headings.map(h => h.id);

      console.log(`[TOC Debug] Activation Line: 100px`);
      console.log(`[TOC Debug] Observer Visible Headings:`, Array.from(visibleHeadings));

      candidateHeadings.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          const distance = Math.abs(rect.top - ACTIVATION_OFFSET);

          console.log(`[TOC Debug] Heading: "${id}", Heading Top: ${rect.top}px, Distance to Activation Line: ${distance.toFixed(1)}px`);

          if (distance < minDistance) {
            minDistance = distance;
            closestId = id;
          }
        }
      });

      if (closestId) {
        console.log(`[TOC Debug] Chosen Active Heading: "${closestId}"`);
        if (closestId !== activeId) {
          setActiveId(closestId);
          window.history.replaceState(null, "", `#${closestId}`);
        }
      }
    };

    let frameId: number;
    const handleScroll = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateActiveHeading);
    };

    window.addEventListener("scroll", handleScroll);
    updateActiveHeading();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(frameId);
    };
  }, [headings, activeId, loading]);

  useEffect(() => {
    if (!activeId || !tocContainerRef.current) return;
    
    const activeLink = tocContainerRef.current.querySelector(`a[href="#${activeId}"]`) as HTMLElement;
    if (activeLink) {
      activeLink.scrollIntoView({
        block: "nearest",
        behavior: "smooth"
      });
    }
  }, [activeId]);

  useEffect(() => {
    if (loading || !post || !slug) return;
    
    const handleScrollSave = () => {
      sessionStorage.setItem(`starox_scroll_pos_${slug}`, window.scrollY.toString());
    };
    
    let timeoutId: any;
    const throttledScroll = () => {
      if (timeoutId) return;
      timeoutId = setTimeout(() => {
        handleScrollSave();
        timeoutId = null;
      }, 500);
    };

    window.addEventListener("scroll", throttledScroll);
    return () => {
      window.removeEventListener("scroll", throttledScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [slug, loading, post]);

  useEffect(() => {
    if (loading || !post || !slug) return;

    const hash = window.location.hash;
    const savedPos = sessionStorage.getItem(`starox_scroll_pos_${slug}`);

    const timer = setTimeout(() => {
      if (hash) {
        const id = hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) {
          const absoluteTop = element.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({
            top: absoluteTop - 100,
            behavior: "smooth"
          });
          setActiveId(id);
        }
      } else if (savedPos) {
        const y = parseFloat(savedPos);
        window.scrollTo({
          top: y,
          behavior: "instant" as any
        });
      }
    }, 280); 

    return () => clearTimeout(timer);
  }, [loading, post, slug]);

  useEffect(() => {
    if (loading) return;

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        const id = hash.replace("#", "");
        const element = document.getElementById(id);
        if (element) {
          const absoluteTop = element.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({
            top: absoluteTop - 100,
            behavior: "smooth"
          });
          setActiveId(id);
        }
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [loading]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast("Article share link copied to clipboard");
  };

  const handleTocClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);

    if (element) {
      isScrollingRef.current = true;
      setActiveId(id); 

      const absoluteTop = element.getBoundingClientRect().top + window.scrollY;
      const targetScrollTop = absoluteTop - 100;

      window.scrollTo({
        top: targetScrollTop,
        behavior: "smooth"
      });

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
        window.history.replaceState(null, "", `#${id}`);
      }, 800);
    }
  };

  const CustomMarkdownRenderersWithRaw = {
    code: CodeBlock,
    video: ({ src, className, ...props }: any) => (
      <div className="my-6 rounded-2xl overflow-hidden border border-border/40 shadow-lg bg-black/60 max-w-[70ch]">
        <video controls className="w-full h-auto aspect-video rounded-2xl" src={src} {...props} />
      </div>
    ),
    audio: ({ src, ...props }: any) => (
      <div className="my-4 p-3 bg-surface border border-border/40 rounded-xl flex items-center justify-center max-w-[70ch]">
        <audio controls className="w-full" src={src} {...props} />
      </div>
    ),
    iframe: ({ src, className, ...props }: any) => (
      <div className="my-6 rounded-2xl overflow-hidden border border-border/40 shadow-lg max-w-[70ch]">
        <iframe src={src} className="w-full h-[450px]" {...props} />
      </div>
    ),
    h1: (props: any) => <HeadingWithAnchor level={1} showToast={showToast} {...props} />,
    h2: (props: any) => <HeadingWithAnchor level={2} showToast={showToast} {...props} />,
    h3: (props: any) => <HeadingWithAnchor level={3} showToast={showToast} {...props} />,
    h4: (props: any) => <HeadingWithAnchor level={4} showToast={showToast} {...props} />,
    
    p: ({ children }: any) => (
      <p className="text-[17px] md:text-[18px] text-foreground/80 leading-[1.8] max-w-[70ch] mb-6 font-sans font-normal">
        {children}
      </p>
    ),

    a: ({ href, children }: any) => {
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
      <blockquote className="border-l-4 border-primary bg-surface/30 pl-4 py-1.5 my-4 italic text-muted-foreground max-w-[70ch]">
        {children}
      </blockquote>
    ),

    img: ({ src, alt }: any) => (
      <figure className="my-8 flex flex-col items-center justify-center max-w-[70ch]">
        <img 
          src={src} 
          alt={alt} 
          loading="lazy" 
          className="max-w-full h-auto rounded-2xl border border-border/40 shadow-lg object-cover" 
        />
        {alt && <figcaption className="text-xs text-muted-foreground mt-3 italic">{alt}</figcaption>}
      </figure>
    ),

    ul: ({ children }: any) => (
      <ul className="list-disc pl-6 space-y-2 mb-6 text-[17px] md:text-[18px] text-foreground/80 max-w-[70ch]">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal pl-6 space-y-2 mb-6 text-[17px] md:text-[18px] text-foreground/80 max-w-[70ch]">
        {children}
      </ol>
    ),
    li: ({ children, className }: any) => {
      const isTask = className === "task-list-item";
      return (
        <li className={`${isTask ? "list-none flex items-start gap-2.5 -ml-6" : "leading-relaxed"}`}>
          {children}
        </li>
      );
    },
    
    hr: () => <hr className="my-10 border-t border-border/40 max-w-[70ch]" />,

    table: ({ children }: any) => (
      <div className="overflow-x-auto my-6 border border-border/40 rounded-xl max-w-[70ch]">
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

  console.log("[Blog Reader] State before rendering:", {
    slug,
    loading,
    postExists: !!post,
    postTitle: post?.title,
    headingsCount: headings.length
  });

  // Check login and local storage subscription state to hide newsletter card
  const clerkUser = (window as any).Clerk?.user;
  const isUserSubscribedOrLoggedIn = !!clerkUser || isSubscribed;

  return (
    <div className="min-h-screen bg-background flex text-foreground relative z-10 font-sans">
      <style>{`
        .toc-scrollable {
          max-height: calc(100vh - 120px);
          overflow-y: auto;
          position: sticky;
          top: 100px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .toc-scrollable::-webkit-scrollbar {
          width: 4px;
          display: none;
        }
        .toc-scrollable:hover::-webkit-scrollbar {
          display: block;
        }
        .toc-scrollable::-webkit-scrollbar-track {
          background: transparent;
        }
        .toc-scrollable::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 4px;
        }
        .toc-scrollable::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.5);
        }
      `}</style>
      
      <div 
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-500 z-50 transition-all duration-75"
        style={{ width: `${scrollProgress}%`, marginLeft: isMobile ? 0 : collapsed ? 56 : 224 }}
      />

      <Sidebar />
      
      <div
        className="flex-1 w-full text-foreground relative z-10 font-sans transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: isMobile ? 0 : collapsed ? 56 : 224, paddingTop: isMobile ? 56 : 0 }}
      >
        <div className="max-w-6xl mx-auto px-6 py-10 w-full text-foreground relative z-10">
          
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Feed
          </Link>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <aside className="hidden lg:block lg:col-span-3">
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-surface-hover w-24 rounded" />
                  <div className="h-3 bg-surface-hover w-full rounded" />
                  <div className="h-3 bg-surface-hover w-5/6 rounded" />
                  <div className="h-3 bg-surface-hover w-4/5 rounded" />
                </div>
              </aside>
              <main className="lg:col-span-9 w-full max-w-[950px]">
                <SkeletonLoader />
              </main>
            </div>
          ) : !post ? (
            <div className="max-w-md mx-auto my-24 p-8 glass-card text-center space-y-4">
              <h2 className="text-2xl font-display font-bold text-foreground">404 - Article Not Found</h2>
              <p className="text-sm text-muted-foreground leading-normal">
                The article slug you requested could not be resolved.
              </p>
              <div className="pt-2">
                <Link
                  to="/blog"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-starox text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <ArrowLeft className="w-4 h-4" /> Return to Feed
                </Link>
              </div>
            </div>
          ) : (
            /* Main two-column page grid: Left independent TOC, Right content */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              
              {/* 1. Left Sticky TOC (collapses in tablet/mobile) */}
              <aside className="hidden lg:block lg:col-span-3">
                <div 
                  ref={tocContainerRef}
                  className="toc-scrollable space-y-4 pr-1"
                >
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/30 pb-2">
                    Table of Contents
                  </h4>
                  {headings.length === 0 ? (
                    <p className="text-xs italic text-muted-foreground">No sections listed</p>
                  ) : (
                    <nav className="space-y-1 text-xs font-semibold">
                      {headings.map(h => (
                        <a
                          key={h.id}
                          href={`#${h.id}`}
                          onClick={(e) => handleTocClick(e, h.id)}
                          className={`block py-1.5 pr-3 text-xs leading-relaxed transition-all duration-200 border-l border-transparent hover:text-foreground truncate rounded-r-xl ${
                            h.level === 3 
                              ? "pl-5 text-muted-foreground/80 text-[11px]" 
                              : h.level === 4
                              ? "pl-9 text-muted-foreground/60 text-[10px]"
                              : "pl-3 text-muted-foreground font-medium"
                          } ${
                            activeId === h.id 
                              ? "text-primary hover:text-primary font-semibold bg-primary/10 border-l-4 border-primary rounded-r-xl animate-in fade-in" 
                              : "hover:bg-surface/20"
                          }`}
                        >
                          {h.text}
                        </a>
                      ))}
                    </nav>
                  )}
                </div>
              </aside>

              {/* 2. Expanded Article Layout: width max-w-[950px] (No right sidebar) */}
              <div className="lg:col-span-9 max-w-[950px] w-full space-y-8">
                
                {/* Cover Image */}
                {post.coverImage && (
                  <div className="rounded-2xl overflow-hidden aspect-video w-full bg-surface/50 border border-border/40 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                    <img 
                      src={post.coverImage} 
                      alt={post.title || ""} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Header Grid Row: LEFT Metadata + Title, RIGHT Compact Widgets */}
                <div className="flex flex-col md:flex-row gap-8 justify-between items-start border-b border-border/40 pb-8">
                  
                  {/* Left Column: Metadata & Description */}
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-primary/10 border border-primary/20 text-primary text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md">
                        {post.category || "Engineering"}
                      </span>
                      {post.status !== "published" && (
                        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md animate-pulse">
                          {post.status || "draft"}
                        </span>
                      )}
                    </div>
                    
                    <h1 className="text-3xl md:text-[2.6rem] font-display font-bold leading-[1.2] bg-clip-text text-transparent bg-gradient-to-b from-white to-foreground/80">
                      {post.title || ""}
                    </h1>

                    {post.excerpt && (
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-[65ch]">
                        {post.excerpt}
                      </p>
                    )}

                    {/* Author block details */}
                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <div className="flex items-center gap-3">
                        {post.authorImage ? (
                          <img 
                            src={post.authorImage} 
                            alt={post.authorName} 
                            className="w-10 h-10 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center border border-border">
                            <UserIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <h3 className="text-xs font-semibold text-foreground">{post.authorName || "Mayur Shashidhar"}</h3>
                          <p className="text-[10px] text-muted-foreground">{post.authorDesignation || "Chief Technology Officer"}</p>
                        </div>
                      </div>

                      <div className="w-px h-6 bg-border/40 hidden sm:block" />

                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(post.publishedAt || post.createdAt || Date.now()).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {post.readingTime || 1} min read
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          {post.views || 0} views
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Compact Cards */}
                  <div className="w-full md:w-[280px] shrink-0 space-y-4">
                    
                    {/* Compact Share Card */}
                    <div className="glass-card p-4 space-y-3 border border-border/40">
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/30 pb-1.5">
                        Share
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="flex flex-col items-center justify-center p-2 rounded-lg bg-surface border border-border/50 hover:bg-surface-hover transition-colors text-[10px] font-semibold text-foreground/90 gap-1 cursor-pointer"
                          title="Copy link"
                        >
                          <Copy className="w-3.5 h-3.5 text-primary" />
                          <span>Link</span>
                        </button>
                        <a
                          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title || "")}&url=${encodeURIComponent(window.location.href)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center p-2 rounded-lg bg-surface border border-border/50 hover:bg-surface-hover transition-colors text-[10px] font-semibold text-foreground/90 gap-1"
                        >
                          <Twitter className="w-3.5 h-3.5 text-[#1DA1F2]" />
                          <span>X</span>
                        </a>
                        <a
                          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col items-center justify-center p-2 rounded-lg bg-surface border border-border/50 hover:bg-surface-hover transition-colors text-[10px] font-semibold text-foreground/90 gap-1"
                        >
                          <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                          <span>LinkedIn</span>
                        </a>
                      </div>
                    </div>

                    {/* Compact Newsletter (hidden for logged in users or completed subscribers) */}
                    {!isUserSubscribedOrLoggedIn && (
                      <div className="glass-card p-4 space-y-3 bg-gradient-to-b from-primary/5 to-transparent border border-border/40">
                        <div className="flex items-center gap-1.5 border-b border-border/30 pb-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-primary" />
                          <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Intellect Digest
                          </h4>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-normal">
                          Receive expert articles on AI modeling and metrics.
                        </p>
                        <div className="space-y-2">
                          <input 
                            type="email" 
                            required
                            placeholder="you@email.com" 
                            className="w-full px-2.5 py-1.5 bg-surface border border-border/50 text-[11px] rounded-lg focus:outline-none focus:border-primary/50 text-foreground"
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              localStorage.setItem("starox_subscribed", "true");
                              setIsSubscribed(true);
                              showToast("Thank you for subscribing!");
                            }}
                            className="w-full py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            Subscribe
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Article content (Up to 950px wide) */}
                <main className="w-full">
                  <article className="prose prose-invert max-w-none">
                    <BlogErrorBoundary>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight, rehypeSlug, rehypeAutolinkHeadings, rehypeRaw]}
                        components={CustomMarkdownRenderersWithRaw}
                      >
                        {post.contentMarkdown || ""}
                      </ReactMarkdown>
                    </BlogErrorBoundary>
                  </article>
                </main>

              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// Wrap with Root page level boundary
export default function BlogPostWithErrorBoundary() {
  return (
    <PageErrorBoundary>
      <BlogPost />
    </PageErrorBoundary>
  );
}
