import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/lib/authStore";
import Sidebar from "@/components/Sidebar";
import { useSidebarStore } from "@/lib/sidebarStore";
import { 
  Search, 
  Folder, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  Settings, 
  User as UserIcon,
  X,
  Loader2,
  Calendar,
  Clock
} from "lucide-react";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
}

const CATEGORIES = ["All", "Engineering", "ML/AI", "Product", "Design", "Updates", "Guides"];
const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

export default function Blog() {
  const { user, setUser } = useAuthStore();
  const { collapsed } = useSidebarStore();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Blog states
  const [posts, setPosts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTag, setSelectedTag] = useState("");
  const [page, setPage] = useState(1);

  // Promotion states
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoUsername, setPromoUsername] = useState("");
  const [promoPassword, setPromoPassword] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Access denied notification
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (searchParams.get("denied") === "true") {
      setAccessDenied(true);
      setTimeout(() => setAccessDenied(false), 5000);
    }
  }, [searchParams]);

  // Fetch blogs
  const fetchBlogs = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/blogs?page=${page}&limit=9`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (selectedCategory && selectedCategory !== "All") url += `&category=${encodeURIComponent(selectedCategory)}`;
      if (selectedTag) url += `&tag=${encodeURIComponent(selectedTag)}`;
      
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBlogs();
  };

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
    <div className="min-h-screen bg-background flex text-foreground relative z-10 font-sans">
      <Sidebar />
      <div
        className="flex-1 w-full text-foreground relative z-10 font-sans transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: isMobile ? 0 : collapsed ? 56 : 224, paddingTop: isMobile ? 56 : 0 }}
      >
        <div className="max-w-6xl mx-auto px-6 py-10 w-full text-foreground relative z-10">
          
          {/* Access Denied Banner */}
          {accessDenied && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl flex items-center justify-between animate-pulse">
              <span>Access Denied: You do not have permissions to access the Admin CMS panel.</span>
              <button onClick={() => setAccessDenied(false)} className="text-red-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Page Title & Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 border-b border-border/50 pb-6">
            <div>
              <h1 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-foreground/90 to-muted-foreground">
                STAROX Intellect Blog
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Latest updates, guides, and expert perspectives from our engineering and ML teams.
              </p>
            </div>

            {user && (
              <div className="shrink-0">
                {user.role === "admin" ? (
                  <Link
                    to="/admin/blog"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-starox text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Go to Admin Dashboard
                  </Link>
                ) : (
                  <button
                    onClick={() => setPromoteOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface text-foreground hover:bg-surface-hover text-xs font-semibold transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    Become Admin
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Search, Categories, Tags Row */}
          <div className="flex flex-col lg:flex-row gap-6 mb-10">
            <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search articles, keywords, or authors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </form>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none flex-1">
              {CATEGORIES.map(category => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
                    selectedCategory === category 
                      ? "border-primary bg-primary/10 text-primary shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                      : "border-border/50 bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col h-96 items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Loading blog publications...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="glass-card text-center p-16">
              <Folder className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="font-semibold text-lg">No articles found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We couldn't find any articles matching your filters. Try checking back later or modifying your search.
              </p>
              {(search || selectedCategory !== "All" || selectedTag) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("All");
                    setSelectedTag("");
                    setPage(1);
                  }}
                  className="mt-4 px-4 py-2 rounded-xl border border-border bg-surface text-xs font-semibold hover:bg-surface-hover"
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <>
              {featuredPost && page === 1 && !search && selectedCategory === "All" && (
                <div className="glass-card overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 mb-10 hover:border-primary/30 transition-colors">
                  <div className="rounded-xl overflow-hidden aspect-video lg:aspect-auto w-full bg-surface relative min-h-[300px]">
                    {featuredPost.coverImage ? (
                      <img 
                        src={featuredPost.coverImage} 
                        alt={featuredPost.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-hover flex items-center justify-center text-muted-foreground">
                        No cover image
                      </div>
                    )}
                    <span className="absolute top-4 left-4 bg-primary text-white text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-md">
                      Featured
                    </span>
                  </div>
                  <div className="flex flex-col justify-between py-2">
                    <div className="space-y-3">
                      <span className="text-xs text-primary font-semibold tracking-wide">
                        {featuredPost.category}
                      </span>
                      <h2 className="text-2xl font-bold font-display hover:text-primary transition-colors">
                        <Link to={`/blog/${featuredPost.slug}`}>{featuredPost.title}</Link>
                      </h2>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {featuredPost.excerpt}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {featuredPost.tags?.map((t: string) => (
                          <span key={t} className="text-[10px] bg-surface border border-border/50 text-muted-foreground px-2 py-0.5 rounded-md">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-6 border-t border-border/50 pt-4">
                      {featuredPost.authorImage ? (
                        <img 
                          src={featuredPost.authorImage} 
                          alt={featuredPost.authorName} 
                          className="w-10 h-10 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center border border-border">
                          <UserIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-semibold">{featuredPost.authorName}</h4>
                        <p className="text-[10px] text-muted-foreground">{featuredPost.authorDesignation}</p>
                      </div>
                      <div className="ml-auto text-right text-[10px] text-muted-foreground space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(featuredPost.publishedAt || featuredPost.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </div>
                        <div className="flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" />
                          {featuredPost.readingTime} min read
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(featuredPost && page === 1 && !search && selectedCategory === "All" ? regularPosts : posts).map(post => (
                  <div key={post._id} className="glass-card overflow-hidden flex flex-col justify-between hover:border-primary/30 transition-colors p-4">
                    <div>
                      <div className="rounded-xl overflow-hidden aspect-video w-full bg-surface mb-4">
                        {post.coverImage ? (
                          <img 
                            src={post.coverImage} 
                            alt={post.title} 
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-surface flex items-center justify-center text-muted-foreground text-xs">
                            No Cover Image
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[11px] text-primary font-semibold">
                          {post.category}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {post.readingTime} min read
                        </div>
                      </div>
                      <h3 className="font-bold text-base mb-2 hover:text-primary transition-colors line-clamp-2">
                        <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                        {post.excerpt}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 border-t border-border/50 pt-3 mt-4">
                      {post.authorImage ? (
                        <img 
                          src={post.authorImage} 
                          alt={post.authorName} 
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center border border-border">
                          <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="overflow-hidden">
                        <h4 className="text-[11px] font-semibold truncate">{post.authorName}</h4>
                        <p className="text-[9px] text-muted-foreground truncate">{post.authorDesignation}</p>
                      </div>
                      <span className="ml-auto text-[9px] text-muted-foreground">
                        {new Date(post.publishedAt || post.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric"
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {pagination.pages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-12">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-2 rounded-xl border border-border bg-surface text-foreground disabled:opacity-50 hover:bg-surface-hover transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-muted-foreground font-semibold">
                    Page {page} of {pagination.pages}
                  </span>
                  <button
                    disabled={page === pagination.pages}
                    onClick={() => setPage(p => p + 1)}
                    className="p-2 rounded-xl border border-border bg-surface text-foreground disabled:opacity-50 hover:bg-surface-hover transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* Become Admin Secure Modal */}
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
    </div>
  );
}
