import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { useSidebarStore } from "@/lib/sidebarStore";
import { useAuthStore } from "@/lib/authStore";
import {
  ArrowLeft,
  Upload,
  Copy,
  Check,
  Trash2,
  Database,
  Loader2,
  Calendar,
  Image as ImageIcon,
  Inbox
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

export default function AdminMediaLibrary() {
  const { user } = useAuthStore();
  const { collapsed } = useSidebarStore();
  const isMobile = useIsMobile();

  const [uploads, setUploads] = useState<any[]>([]);
  const [storageUsage, setStorageUsage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const token = await (window as any).Clerk?.session?.getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const res = await fetch(`${API_URL}/admin/stats`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUploads(data.recentUploads || []);
        setStorageUsage(data.summary?.storageUsage || 0);
      }
    } catch (err) {
      console.error("Failed to load media assets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleCopyLink = (url: string, name: string) => {
    navigator.clipboard.writeText(url);
    setCopiedName(name);
    setTimeout(() => setCopiedName(null), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = await (window as any).Clerk?.session?.getToken();
      const res = await fetch(`${API_URL}/media/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        fetchMedia();
      } else {
        const data = await res.json();
        alert(data.error || "File upload failed");
      }
    } catch (err) {
      console.error(err);
      alert("File upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from storage CDN?`)) {
      return;
    }
    setDeleteLoading(id);
    try {
      const token = await (window as any).Clerk?.session?.getToken();
      const res = await fetch(`${API_URL}/media/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setUploads(uploads.filter(file => file.id !== id));
        fetchMedia();
      } else {
        alert("Failed to delete media asset");
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
        <div className="max-w-6xl mx-auto px-6 py-10 w-full text-foreground relative z-10 space-y-6">

          {/* Breadcrumbs */}
          <Link
            to="/admin/blog"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>

          {/* Page Title */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-xl font-display font-bold">
                CMS Asset Library
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload and copy public URLs of your images to use inside blog markdown.
              </p>
            </div>

            <label className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl gradient-starox text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50">
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  Upload Asset
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {loading ? (
            <div className="flex flex-col h-96 items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Indexing asset storage library...</p>
            </div>
          ) : (
            <div className="space-y-6">

              {/* Storage usage overview */}
              <div className="glass-card p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Cloudinary CDN Usage
                    </h3>
                    <p className="text-base font-bold mt-1 text-foreground">
                      {formatStorageSize(storageUsage)}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  CDN Engine: <span className="font-mono bg-surface px-2 py-0.5 rounded border border-border/50">cloudinary</span>
                </div>
              </div>

              {uploads.length === 0 ? (
                <div className="glass-card text-center py-20">
                  <Inbox className="w-12 h-12 text-muted-foreground/35 mx-auto mb-4" />
                  <h3 className="font-semibold text-sm">No media files found</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload images to copy their public URLs and paste them inside article editors.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {uploads.map(file => (
                    <div key={file.id} className="glass-card p-3 flex flex-col justify-between hover:border-primary/20 transition-all overflow-hidden group">
                      
                      <div className="rounded-lg aspect-video bg-surface overflow-hidden relative mb-3 border border-border/40">
                        <img 
                          src={file.url} 
                          alt={file.name} 
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform"
                        />
                        <a 
                          href={file.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold uppercase tracking-wider"
                        >
                          View Full
                        </a>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold truncate text-foreground/90 font-mono">
                          {file.name}
                        </p>
                        
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                          <span>{formatStorageSize(file.size)}</span>
                          <span className="font-mono flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(file.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopyLink(file.url, file.name)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border/60 bg-surface/50 hover:bg-surface text-[10px] font-semibold transition-colors"
                          >
                            {copiedName === file.name ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-green-400" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-primary" />
                                Copy URL
                              </>
                            )}
                          </button>
                          <button
                            disabled={deleteLoading === file.id}
                            onClick={() => handleDeleteMedia(file.id, file.name)}
                            className="p-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 text-red-400 transition-colors"
                          >
                            {deleteLoading === file.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
