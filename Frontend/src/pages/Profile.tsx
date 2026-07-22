import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { 
  User, 
  Mail, 
  Building2, 
  MapPin,
  Link as LinkIcon,
  Camera,
  Save,
  Calendar,
  Briefcase
} from "lucide-react";
import { useAuthStore } from "@/lib/authStore";
import { getUsage, LIMITS } from "@/lib/usageLimit";

const ProfilePage = () => {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState({
    name: user?.displayName ?? "",
    email: user?.email ?? "",
    company: "",
    role: "",
    location: "",
    website: "",
    bio: "",
  });
  const [analysisUsage, setAnalysisUsage] = useState<{ used: number } | null>(null);
  const [pdfUsage, setPdfUsage] = useState<{ used: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getUsage(user.uid, "analysis"),
      getUsage(user.uid, "pdf"),
    ]).then(([a, p]) => {
      setAnalysisUsage({ used: a.used });
      setPdfUsage({ used: p.used });
    });
  }, [user]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-display font-bold text-foreground mb-2"
        >
          Profile
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-sm"
        >
          Manage your personal information and public profile.
        </motion.p>
      </div>

      <div className="space-y-6">
        {/* Avatar section */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-6">
            <div className="relative">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={profile.name}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full gradient-starox flex items-center justify-center text-white text-2xl font-display font-bold">
                  {profile.name ? profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?"}
                </div>
              )}
              <button className="absolute bottom-0 right-0 p-2 rounded-full bg-surface border border-border/50 text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h2 className="text-lg font-medium text-foreground">{profile.name}</h2>
              <p className="text-sm text-muted-foreground">{profile.role} at {profile.company}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {profile.location || "Location not set"}
                </span>
                {user?.metadata?.creationTime && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Member since {new Date(user.metadata.creationTime).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Personal Info */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h2 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Personal Information
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Full Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full p-3 rounded-xl bg-surface border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full p-3 pl-10 rounded-xl bg-surface border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Company</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={profile.company}
                  onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                  className="w-full p-3 pl-10 rounded-xl bg-surface border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Role</label>
              <div className="relative">
                <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={profile.role}
                  onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                  className="w-full p-3 pl-10 rounded-xl bg-surface border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Location</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  className="w-full p-3 pl-10 rounded-xl bg-surface border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Website</label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="url"
                  value={profile.website}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  className="w-full p-3 pl-10 rounded-xl bg-surface border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Bio */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <h2 className="text-sm font-medium text-foreground mb-4">Bio</h2>
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            rows={4}
            className="w-full p-3 rounded-xl bg-surface border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/50 resize-none"
            placeholder="Tell us about yourself..."
          />
          <p className="text-xs text-muted-foreground mt-2">
            {profile.bio.length}/200 characters
          </p>
        </motion.section>

        {/* Usage Stats */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <h2 className="text-sm font-medium text-foreground mb-4">Usage</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-xl bg-surface">
              <p className="text-2xl font-display font-bold gradient-text">{analysisUsage?.used ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">Analyses used</p>
              <p className="text-[10px] text-muted-foreground/60">of {LIMITS.analysis} free</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-surface">
              <p className="text-2xl font-display font-bold gradient-text">{pdfUsage?.used ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">PDFs exported</p>
              <p className="text-[10px] text-muted-foreground/60">of {LIMITS.pdf} free</p>
            </div>
          </div>
        </motion.section>

        {/* Save button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-end"
        >
          <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-starox text-white text-sm font-medium hover:opacity-90 transition-opacity">
            <Save className="w-4 h-4" />
            Save Profile
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
