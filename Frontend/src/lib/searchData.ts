export interface SearchItem {
  title: string;
  description: string;
  category: "Products" | "Pages" | "Tools" | "Documentation" | "Settings" | "Support";
  keywords: string[];
  route: string;
  iconName: string; // Stored as a string identifier so it is serializable and easy to import dynamically
}

export const SEARCH_ITEMS: SearchItem[] = [
  // Products
  {
    title: "STAROX PMX",
    description: "Project Intelligence & Execution workspace.",
    category: "Products",
    keywords: ["pmx", "project", "management", "execution", "tasks", "board"],
    route: "/products/pmx",
    iconName: "LayoutDashboard"
  },
  {
    title: "STAROX BUILD",
    description: "Generate complete software from ideas.",
    category: "Products",
    keywords: ["build", "software", "development", "generate", "code"],
    route: "/products/build",
    iconName: "Code2"
  },
  {
    title: "STAROX AUTOMATION",
    description: "AI-powered business workflows.",
    category: "Products",
    keywords: ["automation", "workflows", "zapier", "triggers", "actions"],
    route: "/products/automation",
    iconName: "Zap"
  },
  {
    title: "STAROX TEAMS",
    description: "Collaborative AI workspaces.",
    category: "Products",
    keywords: ["teams", "collab", "workspaces", "organizations", "members"],
    route: "/products/teams",
    iconName: "Users"
  },

  // Pages
  {
    title: "Products",
    description: "Browse the complete STAROX product intelligence suite.",
    category: "Pages",
    keywords: ["products", "suite", "features", "directory"],
    route: "/starox-intelligence",
    iconName: "Folder"
  },
  {
    title: "Pricing",
    description: "Simple, transparent pricing plans for teams of all sizes.",
    category: "Pages",
    keywords: ["pricing", "plans", "starter", "pro", "free", "credits"],
    route: "/pricing",
    iconName: "CreditCard"
  },
  {
    title: "Blog",
    description: "Latest news, articles, and product guides from the STAROX team.",
    category: "Pages",
    keywords: ["blog", "posts", "updates", "guides", "articles"],
    route: "/blog",
    iconName: "BookOpen"
  },
  {
    title: "Community",
    description: "Join the STAROX developer and founder community space.",
    category: "Pages",
    keywords: ["community", "connect", "early access", "builders"],
    route: "/starox-intelligence/community",
    iconName: "MessageSquare"
  },
  {
    title: "Help Center",
    description: "Browse documentations, search answers, and contact support.",
    category: "Pages",
    keywords: ["help", "support", "ticket", "faq"],
    route: "/help",
    iconName: "HelpCircle"
  },

  // Tools
  {
    title: "Analytics",
    description: "Inspect performance metrics and dashboard insights.",
    category: "Tools",
    keywords: ["analytics", "charts", "metrics", "reports", "insights"],
    route: "/analytics",
    iconName: "BarChart3"
  },
  {
    title: "Connectors",
    description: "Connect your workspace to GitHub, Slack, Jira, and more.",
    category: "Tools",
    keywords: ["connectors", "integrations", "slack", "github", "jira"],
    route: "/connectors",
    iconName: "Plug"
  },

  // Documentation
  {
    title: "Docs",
    description: "Getting started guides and architectural definitions.",
    category: "Documentation",
    keywords: ["docs", "documentation", "getting started", "introduction"],
    route: "/help#docs",
    iconName: "FileText"
  },
  {
    title: "API Reference",
    description: "Public API developer references and client schemas.",
    category: "Documentation",
    keywords: ["api", "endpoints", "reference", "schemas", "developer"],
    route: "/help#api",
    iconName: "Terminal"
  },
  {
    title: "Guides",
    description: "Step-by-step product walkthroughs and optimization guides.",
    category: "Documentation",
    keywords: ["guides", "walkthrough", "tutorial", "sprint"],
    route: "/help#guides",
    iconName: "ClipboardList"
  },

  // Settings
  {
    title: "Account",
    description: "Manage your user profile and active subscriptions.",
    category: "Settings",
    keywords: ["account", "profile", "user", "subscription", "clerk"],
    route: "/profile",
    iconName: "User"
  },
  {
    title: "Preferences",
    description: "Customize layout themes and global warning options.",
    category: "Settings",
    keywords: ["preferences", "theme", "dark", "light", "settings"],
    route: "/settings",
    iconName: "Sliders"
  },

  // Support
  {
    title: "Contact",
    description: "Get in touch with the STAROX technical support team.",
    category: "Support",
    keywords: ["contact", "email", "support", "helpdesk"],
    route: "/help#contact",
    iconName: "Mail"
  },
  {
    title: "FAQ",
    description: "Frequently asked questions and product quick-helps.",
    category: "Support",
    keywords: ["faq", "questions", "answers", "troubleshoot"],
    route: "/help#faq",
    iconName: "AlertCircle"
  }
];
