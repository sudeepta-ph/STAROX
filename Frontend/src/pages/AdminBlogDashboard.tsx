import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { useSidebarStore } from "@/lib/sidebarStore";
import { useAuthStore } from "@/lib/authStore";
import {
  FileText,
  Eye,
  Plus,
  Edit2,
  Trash2,
  FolderOpen,
  Image as ImageIcon,
  Database,
  Loader2,
  CheckCircle,
  ArrowLeft,
  TrendingUp,
  Inbox,
  Mail,
  UserMinus
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

const API_URL = (import.meta as any).env.VITE_API_URL || "http://localhost:8080/api";

export default function AdminBlogDashboard() {
  const { user } = useAuthStore();
  const { collapsed } = useSidebarStore();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [stats, setStats] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const [subscriberSummary, setSubscriberSummary] = useState<{ total: number; active: number; unsubscribed: number } | null>(null);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [subscriberActionLoading, setSubscriberActionLoading] = useState<string | null>(null);

  const fetchSubscribers = async () => {
    try {
      const token = await (window as any).Clerk?.session?.getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_URL}/admin/blog-subscribers?limit=10`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSubscriberSummary(data.summary);
        setSubscribers(data.subscribers || []);
      }
    } catch (err) {
      console.error("Failed to load blog subscribers:", err);
    }
  };

  const handleUnsubscribe = async (id: string) => {
    setSubscriberActionLoading(id);
    try {
      const token = await (window as any).Clerk?.session?.getToken();
      const res = await fetch(`${API_URL}/admin/blog-subscribers/${id}/unsubscribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchSubscribers();
    } catch (err) {
      console.error("Failed to unsubscribe:", err);
    } finally {
      setSubscriberActionLoading(null);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = await (window as any).Clerk?.session?.getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const statsRes = await fetch(`${API_URL}/admin/stats`, { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      const postsRes = await fetch(`${API_URL}/blogs?limit=50&status=`, { headers });
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData.posts || []);
      }

      await fetchSubscribers();
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDeletePost = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    setDeleteLoading(id);
    try {
      const token = await (window as any).Clerk?.session?.getToken();
      const res = await fetch(`${API_URL}/blogs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setPosts(posts.filter(p => p._id !== id));
        fetchDashboardData();
      } else {
        alert("Failed to delete blog post");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(null);
    }
  };

  const formatStorageSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-background flex text-foreground relative z-10 font-sans">
      <Sidebar />
      <div
        className="flex-1 w-full text-foreground relative z-10 font-sans transition-all duration-[220ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: isMobile ? 0 : collapsed ? 56 : 224, paddingTop: isMobile ? 56 : 0 }}
      >
        <div className="max-w-6xl mx-auto px-6 py-10 w-full text-foreground relative z-10">

          {/* Breadcrumb / Back Navigation */}
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Public Blog
          </Link>

          {/* Page Title Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Blog CMS Workspace
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage publications, drafts, storage, and performance metrics.
              </p>
            </div>
            
            <div className="flex gap-2">
              <Link
                to="/admin/blog/media"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface text-foreground hover:bg-surface-hover text-xs font-semibold transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Media Library
              </Link>
              <Link
                to="/admin/blog/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl gradient-starox text-white text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                Write Post
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col h-96 items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Aggregating workspace analytics...</p>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* Analytics Summary Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5 relative overflow-hidden bg-gradient-to-b from-primary/5 to-transparent">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                        Total Posts
                      </p>
                      <h3 className="text-2xl font-bold mt-2">
                        {stats?.summary?.totalPosts || 0}
                      </h3>
                    </div>
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground border-t border-border/40 pt-2.5">
                    <span>{stats?.summary?.published || 0} Pubs</span>
                    <span>{stats?.summary?.drafts || 0} Drafts</span>
                  </div>
                </div>

                <div className="glass-card p-5 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                        Total Views
                      </p>
                      <h3 className="text-2xl font-bold mt-2">
                        {stats?.summary?.totalViews || 0}
                      </h3>
                    </div>
                    <Eye className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-[10px] text-emerald-400 border-t border-border/40 pt-2.5">
                    <TrendingUp className="w-3 h-3" />
                    Accumulated views
                  </div>
                </div>

                <div className="glass-card p-5 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                        CMS Storage
                      </p>
                      <h3 className="text-2xl font-bold mt-2">
                        {formatStorageSize(stats?.summary?.storageUsage || 0)}
                      </h3>
                    </div>
                    <Database className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-[10px] text-muted-foreground border-t border-border/40 pt-2.5">
                    Cloudinary CDN
                  </div>
                </div>

                <div className="glass-card p-5 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                        Other Statuses
                      </p>
                      <h3 className="text-2xl font-bold mt-2">
                        {(stats?.summary?.scheduled || 0) + (stats?.summary?.archived || 0)}
                      </h3>
                    </div>
                    <CheckCircle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex gap-4 mt-3 text-[10px] text-muted-foreground border-t border-border/40 pt-2.5">
                    <span>{stats?.summary?.scheduled || 0} Scheduled</span>
                    <span>{stats?.summary?.archived || 0} Archived</span>
                  </div>
                </div>
              </div>

              {/* Middle Section: Top Posts & Recent uploads */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-5">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">
                    Most Viewed Articles
                  </h3>
                  <div className="divide-y divide-border/30">
                    {stats?.mostViewed?.length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        No articles viewed yet
                      </div>
                    ) : (
                      stats?.mostViewed?.map((post: any) => (
                        <div key={post.slug} className="py-2.5 flex items-center justify-between text-xs">
                          <Link to={`/blog/${post.slug}`} className="hover:text-primary transition-colors font-medium truncate max-w-[280px]">
                            {post.title}
                          </Link>
                          <div className="flex items-center gap-1 font-semibold bg-surface/50 px-2 py-0.5 border border-border/40 rounded-lg text-muted-foreground">
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            {post.views || 0}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="glass-card p-5">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">
                    Recent Media Uploads
                  </h3>
                  <div className="divide-y divide-border/30">
                    {stats?.recentUploads?.length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        No uploaded assets in CDN
                      </div>
                    ) : (
                      stats?.recentUploads?.map((file: any) => (
                        <div key={file.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <ImageIcon className="w-4 h-4 text-primary shrink-0" />
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors font-medium truncate max-w-[200px]">
                              {file.name}
                            </a>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatStorageSize(file.size)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Blog Subscribers */}
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    Blog Subscribers
                  </h3>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="font-semibold text-foreground">{subscriberSummary?.total ?? 0} subscribers</span>
                    <span className="text-emerald-400">{subscriberSummary?.active ?? 0} active</span>
                    <span className="text-muted-foreground">{subscriberSummary?.unsubscribed ?? 0} unsubscribed</span>
                  </div>
                </div>
                {subscribers.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">No subscribers yet</div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {subscribers.map((sub) => (
                      <div key={sub._id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                        <span className="truncate max-w-[280px] font-medium">{sub.email}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(sub.subscribedAt).toLocaleDateString()}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            sub.status === "active"
                              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                              : "text-muted-foreground bg-muted border-border"
                          }`}>
                            {sub.status === "active" ? "Active" : "Unsubscribed"}
                          </span>
                          {sub.status === "active" && (
                            <button
                              onClick={() => handleUnsubscribe(sub._id)}
                              disabled={subscriberActionLoading === sub._id}
                              title="Unsubscribe"
                              className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Section: Full Posts Table */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6">
                  Published & Draft Publications
                </h3>

                {posts.length === 0 ? (
                  <div className="text-center py-16">
                    <Inbox className="w-12 h-12 text-muted-foreground/35 mx-auto mb-3" />
                    <p className="text-xs text-muted-foreground">No blog posts found in workspace database.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border/40 text-muted-foreground font-bold">
                          <th className="pb-3 pr-4">Title</th>
                          <th className="pb-3 px-4">Status</th>
                          <th className="pb-3 px-4">Category</th>
                          <th className="pb-3 px-4">Views</th>
                          <th className="pb-3 px-4">Published Date</th>
                          <th className="pb-3 pl-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {posts.map(post => (
                          <tr key={post._id} className="hover:bg-surface/20">
                            <td className="py-3.5 pr-4 font-semibold max-w-xs truncate">
                              <Link to={`/blog/${post.slug}`} className="hover:text-primary transition-colors">
                                {post.title}
                              </Link>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                post.status === "published" 
                                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                  : post.status === "draft"
                                  ? "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                                  : post.status === "scheduled"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-red-500/10 text-red-400 border border-red-500/20"
                              }`}>
                                {post.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-muted-foreground">
                              {post.category}
                            </td>
                            <td className="py-3.5 px-4 font-medium">
                              {post.views || 0}
                            </td>
                            <td className="py-3.5 px-4 text-muted-foreground">
                              {post.publishedAt 
                                ? new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                : "N/A"
                              }
                            </td>
                            <td className="py-3.5 pl-4 text-right space-x-1 shrink-0">
                              <button
                                onClick={() => navigate(`/admin/blog/edit/${post._id}`)}
                                className="p-1.5 rounded-lg border border-border/50 hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                disabled={deleteLoading === post._id}
                                onClick={() => handleDeletePost(post._id, post.title)}
                                className="p-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors"
                              >
                                {deleteLoading === post._id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
