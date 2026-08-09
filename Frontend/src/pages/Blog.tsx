import { useEffect, useState, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/lib/authStore";
import { useClerk } from "@clerk/clerk-react";
import AuthModal from "@/components/AuthModal";
import { 
  Folder, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  Settings, 
  User as UserIcon,
  X,
  Loader2,
  Calendar,
  Clock,
  ArrowRight
} from "lucide-react";
import {
  ThemeCycleButton,
  UserAvatar,
  SharedMegaMenu
} from "./StaroxIntelligence";
import Footer from "@/components/Footer";

const CATEGORIES = ["All", "Engineering", "ML/AI", "Product", "Design", "Updates", "Guides"];
const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

export default function Blog() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Distraction-free navbar states
  const [isDesktop, setIsDesktop] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const [hoveringHeader, setHoveringHeader] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Sync default state on desktop
  useEffect(() => {
    if (isDesktop) {
      setShowHeader(false); // Hide on load for desktop
    } else {
      setShowHeader(true); // Always show on mobile
    }
  }, [isDesktop]);

  // Scroll and Mouse Move listeners for desktop
  useEffect(() => {
    if (!isDesktop) return;

    let lastScrollY = window.scrollY;
    let hideTimeout: number | null = null;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // If user scrolls upward, reveal navbar
      if (currentScrollY < lastScrollY) {
        setShowHeader(true);
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
      } 
      // If user scrolls downward, hide navbar (unless hovering)
      else if (currentScrollY > lastScrollY && currentScrollY > 10) {
        if (!hoveringHeader) {
          setShowHeader(false);
        }
      }
      
      lastScrollY = currentScrollY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      // If cursor reaches top 15px, show header
      if (e.clientY <= 15) {
        setShowHeader(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, [isDesktop, hoveringHeader]);

  const handleHeaderMouseLeave = () => {
    setHoveringHeader(false);
    if (isDesktop) {
      // Hide after 350ms delay to prevent flickering
      setTimeout(() => {
        const headerEl = document.querySelector("header");
        const isHovered = headerEl && headerEl.matches(":hover");
        if (!isHovered && window.scrollY > 50) {
          setShowHeader(false);
        }
      }, 350);
    }
  };

  // Shared Mega Menu states
  const [activeTab, setActiveTab] = useState<"solutions" | "products" | null>(null);
  const [dir, setDir] = useState<"left" | "right">("right");
  const closeTimeoutRef = useRef<number | null>(null);

  const handleTabChange = (newTab: "solutions" | "products" | null) => {
    if (newTab && activeTab) {
      if (activeTab === "solutions" && newTab === "products") {
        setDir("right");
      } else if (activeTab === "products" && newTab === "solutions") {
        setDir("left");
      }
    }
    setActiveTab(newTab);
  };

  const handleNavMouseLeave = () => {
    if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = window.setTimeout(() => {
      const hoverEl = document.querySelector(".shared-megamenu-container:hover");
      if (!hoverEl) {
        handleTabChange(null);
      }
    }, 180);
  };

  const handleMenuMouseEnter = () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleMenuMouseLeave = () => {
    if (closeTimeoutRef.current) window.clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = window.setTimeout(() => {
      handleTabChange(null);
    }, 180);
  };

  const handleNavBlur = (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      handleTabChange(null);
    }
  };

  // Blog states
  const [posts, setPosts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTag, setSelectedTag] = useState("");
  const [page, setPage] = useState(1);

  // Authentication & Promotion states
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoUsername, setPromoUsername] = useState("");
  const [promoPassword, setPromoPassword] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Access denied banner
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (searchParams.get("denied") === "true") {
      setAccessDenied(true);
      setTimeout(() => setAccessDenied(false), 5000);
    }
  }, [searchParams]);

  // Fetch blogs from API
  const fetchBlogs = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/blogs?page=${page}&limit=9`;
      if (selectedCategory && selectedCategory !== "All") {
        url += `&category=${encodeURIComponent(selectedCategory)}`;
      }
      if (selectedTag) {
        url += `&tag=${encodeURIComponent(selectedTag)}`;
      }
      
      const token = await (window as any).Clerk?.session?.getToken();
      const headers: any = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch blogs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, [page, selectedCategory, selectedTag]);

  const handlePromoteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoLoading(true);
    setPromoError(null);
    try {
      const token = await (window as any).Clerk?.session?.getToken();
      const res = await fetch(`${API_URL}/admin/promote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          adminUsername: promoUsername,
          adminPassword: promoPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (user) {
          setUser({ ...user, role: "admin" });
        }
        setPromoteOpen(false);
        setPromoUsername("");
        setPromoPassword("");
      } else {
        setPromoError(data.error || "Invalid promotion credentials");
      }
    } catch (err) {
      setPromoError("Failed to verify admin promotion");
    } finally {
      setPromoLoading(false);
    }
  };

  const featuredPost = posts.find(p => p.featured && p.status === "published");
  const regularPosts = posts.filter(p => p._id !== (featuredPost?._id || ""));

  return (
    <div className={`min-h-screen bg-background text-foreground flex flex-col font-sans transition-all duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${isDesktop ? "pt-0" : "pt-16"}`}>
      
      {/* ── Top Navigation Bar ───────────────────────────────────── */}
      <header 
        onMouseEnter={() => setHoveringHeader(true)}
        onMouseLeave={handleHeaderMouseLeave}
        className={`fixed top-0 left-0 w-full z-50 border-b border-border/60 bg-background/95 backdrop-blur-xl shrink-0 transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isDesktop && !showHeader ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="flex h-16 w-full items-center gap-4 px-6 sm:px-10">
          {/* Logo — left edge */}
          <Link to="/starox-intelligence" className="flex shrink-0 items-center gap-3 mr-3">
            <img
              src="/assets/images/strx.png"
              alt="STAROX"
              className="h-10 w-10 object-contain drop-shadow-[0_0_8px_rgba(56,189,248,0.55)]"
            />
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              STAROX
            </span>
          </Link>
          {/* Nav links — centre-left */}
          <nav 
            className="hidden md:flex items-center gap-0.5 relative"
            onMouseLeave={handleNavMouseLeave}
            onBlur={handleNavBlur}
          >
            <button
              onMouseEnter={() => handleTabChange("solutions")}
              onFocus={() => handleTabChange("solutions")}
              onClick={(e) => { e.preventDefault(); handleTabChange(activeTab === "solutions" ? null : "solutions"); }}
              aria-haspopup="true"
              aria-expanded={activeTab === "solutions"}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                activeTab === "solutions" ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Solutions
            </button>

            <button
              onMouseEnter={() => handleTabChange("products")}
              onFocus={() => handleTabChange("products")}
              onClick={(e) => { e.preventDefault(); handleTabChange(activeTab === "products" ? null : "products"); }}
              aria-haspopup="true"
              aria-expanded={activeTab === "products"}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                activeTab === "products" ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              Products
            </button>

            <Link
              to="/starox-intelligence/community"
              onMouseEnter={() => handleTabChange(null)}
              onFocus={() => handleTabChange(null)}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Community
            </Link>

            <Link
              to="/pricing"
              onMouseEnter={() => handleTabChange(null)}
              onFocus={() => handleTabChange(null)}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Pricing
            </Link>

            <Link
              to="/blog"
              onMouseEnter={() => handleTabChange(null)}
              onFocus={() => handleTabChange(null)}
              className="rounded-lg px-3 py-1.5 text-sm text-foreground bg-muted font-semibold transition-colors"
            >
              Blog
            </Link>

            <Link
              to="/help"
              onMouseEnter={() => handleTabChange(null)}
              onFocus={() => handleTabChange(null)}
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Help
            </Link>

            <AnimatePresence>
              {activeTab && (
                <SharedMegaMenu 
                  activeTab={activeTab} 
                  dir={dir} 
                  onClose={() => handleTabChange(null)}
                  handleMenuMouseEnter={handleMenuMouseEnter}
                  handleMenuMouseLeave={handleMenuMouseLeave}
                />
              )}
            </AnimatePresence>
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            <ThemeCycleButton />
            <UserAvatar onSignIn={() => setAuthModalOpen(true)} />
          </div>
        </div>
      </header>

      {/* ── Access Denied Banner ─────────────────────────────────── */}
      {accessDenied && (
        <div className="mx-6 sm:mx-10 mt-6 max-w-6xl md:mx-auto w-full p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl flex items-center justify-between animate-pulse">
          <span>Access Denied: You do not have permissions to access the Admin CMS panel.</span>
          <button onClick={() => setAccessDenied(false)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Hero Section ─────────────────────────────────────────── */}
      <section className="bg-muted/10 py-16 px-6 sm:px-10 border-b border-border/40">
        <div className="max-w-6xl mx-auto space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">STAROX Engineering & Research</p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            STAROX Blog
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed">
            Engineering updates, AI research, product launches, tutorials and company insights.
          </p>
        </div>
      </section>

      {/* ── Category Filters (Sticky) ────────────────────────────── */}
      <div className={`sticky z-40 border-b border-border/60 bg-background/95 backdrop-blur-xl shrink-0 transition-all duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isDesktop ? (showHeader ? "top-16" : "top-0") : "top-16"
      }`}>
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-3 flex items-center justify-between overflow-x-auto scrollbar-none gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => { setSelectedCategory(category); setPage(1); }}
                className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all shrink-0 ${
                  selectedCategory === category
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Admin CMS Access */}
          {user && (
            <div className="shrink-0 pl-4 border-l border-border/40 hidden sm:block">
              {user.role === "admin" ? (
                <Link
                  to="/admin/blog"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Admin CMS
                </Link>
              ) : (
                <button
                  onClick={() => setPromoteOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-muted/50 text-foreground hover:bg-muted text-xs font-semibold transition-colors"
                >
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  Become Admin
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Editorial Main Content ────────────────────────────────── */}
      <main className="flex-1 max-w-6xl mx-auto px-6 sm:px-10 py-12 w-full space-y-16">
        
        {loading ? (
          <div className="flex flex-col h-96 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Loading publications...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-muted/20 text-center p-16">
            <Folder className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-lg text-foreground">No articles found</h3>
            <p className="text-sm text-muted-foreground mt-2">
              We couldn't find any articles matching this category.
            </p>
            {selectedCategory !== "All" && (
              <button
                onClick={() => { setSelectedCategory("All"); setPage(1); }}
                className="mt-5 px-5 py-2 rounded-full border border-border bg-background text-xs font-semibold hover:bg-muted transition-colors"
              >
                Reset filter
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Featured Article Node */}
            {featuredPost && page === 1 && selectedCategory === "All" && (
              <section className="space-y-6">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Featured Article
                </h2>
                
                <div 
                  onClick={() => navigate(`/blog/${featuredPost.slug}`)}
                  className="group grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 p-6 sm:p-8 rounded-3xl border border-border/40 bg-card/40 hover:border-border/80 hover:bg-card/60 transition-all duration-300 cursor-pointer shadow-sm overflow-hidden"
                >
                  {/* Metadata & Summary */}
                  <div className="flex flex-col justify-between py-2 space-y-6">
                    <div className="space-y-4">
                      <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
                        {featuredPost.category}
                      </span>
                      
                      <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors leading-tight">
                        {featuredPost.title}
                      </h3>
                      
                      <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                        {featuredPost.excerpt}
                      </p>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/40">
                      {/* Author */}
                      <div className="flex items-center gap-3">
                        {featuredPost.authorImage ? (
                          <img 
                            src={featuredPost.authorImage} 
                            alt={featuredPost.authorName} 
                            className="w-10 h-10 rounded-full object-cover border border-border/40"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center border border-border/40 text-muted-foreground">
                            <UserIcon className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-bold text-foreground">{featuredPost.authorName}</h4>
                          <p className="text-[10px] text-muted-foreground">{featuredPost.authorDesignation}</p>
                        </div>
                      </div>

                      {/* Date & Read metrics */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {new Date(featuredPost.publishedAt || featuredPost.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{featuredPost.readingTime} min read</span>
                        </div>
                      </div>

                      {/* CTA label */}
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:underline pt-2">
                        <span>Read article</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>

                  {/* Cover Image container */}
                  <div className="rounded-2xl overflow-hidden aspect-video lg:aspect-auto w-full bg-muted border border-border/30 relative min-h-[260px] sm:min-h-[340px] shadow-inner group-hover:scale-[1.01] transition-transform duration-300">
                    {featuredPost.coverImage ? (
                      <img 
                        src={featuredPost.coverImage} 
                        alt={featuredPost.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted/40 flex items-center justify-center text-muted-foreground text-xs font-medium">
                        No cover image
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Grid publications section */}
            <section className="space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Latest Publications
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(featuredPost && page === 1 && selectedCategory === "All" ? regularPosts : posts).map(post => (
                  <div 
                    key={post._id} 
                    onClick={() => navigate(`/blog/${post.slug}`)}
                    className="group flex flex-col justify-between p-4 rounded-2xl border border-border/40 bg-card/30 hover:border-border/80 hover:bg-card/50 transition-all duration-300 cursor-pointer overflow-hidden h-[410px]"
                  >
                    <div>
                      {/* Cover Image */}
                      <div className="rounded-xl overflow-hidden aspect-video w-full bg-muted mb-4 relative shadow-sm">
                        {post.coverImage ? (
                          <img 
                            src={post.coverImage} 
                            alt={post.title} 
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted/40 flex items-center justify-center text-muted-foreground text-xs font-medium">
                            No Cover Image
                          </div>
                        )}
                      </div>

                      {/* Category metadata */}
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] text-primary font-bold uppercase tracking-wider">
                          {post.category}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{post.readingTime} min read</span>
                        </div>
                      </div>

                      {/* Content block */}
                      <h3 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-2">
                        {post.title}
                      </h3>
                      <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2 mb-4">
                        {post.excerpt}
                      </p>
                    </div>

                    {/* Author footer */}
                    <div className="flex items-center gap-2 border-t border-border/40 pt-3 mt-auto">
                      {post.authorImage ? (
                        <img 
                          src={post.authorImage} 
                          alt={post.authorName} 
                          className="w-8 h-8 rounded-full object-cover border border-border/40"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center border border-border/40 text-muted-foreground">
                          <UserIcon className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div className="overflow-hidden flex-1">
                        <h4 className="text-[11px] font-bold text-foreground truncate">{post.authorName}</h4>
                        <p className="text-[9px] text-muted-foreground truncate leading-none mt-0.5">{post.authorDesignation}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                        {new Date(post.publishedAt || post.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric"
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8 pt-4">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-2 rounded-xl border border-border bg-muted/40 text-foreground disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted-foreground font-semibold">
                  Page {page} of {pagination.pages}
                </span>
                <button
                  disabled={page === pagination.pages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-2 rounded-xl border border-border bg-muted/40 text-foreground disabled:opacity-40 hover:bg-muted transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Social Footer ────────────────────────────────────────── */}
      <Footer />

      {/* ── Become Admin Modal ────────────────────────────────────── */}
      {promoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setPromoteOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm glass-card p-6 z-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> Promote to Admin
              </h2>
              <button onClick={() => setPromoteOpen(false)} className="text-muted-foreground hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {promoError && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl mb-4">
                {promoError}
              </div>
            )}

            <form onSubmit={handlePromoteAdmin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Admin Username</label>
                <input
                  type="text"
                  required
                  value={promoUsername}
                  onChange={(e) => setPromoUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border/50 text-xs rounded-xl focus:outline-none focus:border-primary/50 text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Admin Password</label>
                <input
                  type="password"
                  required
                  value={promoPassword}
                  onChange={(e) => setPromoPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border/50 text-xs rounded-xl focus:outline-none focus:border-primary/50 text-foreground"
                />
              </div>

              <button
                type="submit"
                disabled={promoLoading}
                className="w-full py-2.5 rounded-xl gradient-starox text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {promoLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Promote Session
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal for Login trigger */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
