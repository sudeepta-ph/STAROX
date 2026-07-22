import { motion } from "framer-motion";
import { Shield, Lock, Eye, Server, Users, Mail } from "lucide-react";

const sections = [
  {
    icon: Eye,
    title: "Data Collection",
    content:
      "Starox collects information you provide directly — such as website URLs, uploaded review files, product descriptions, and account details. We also collect usage data (pages visited, features used, analysis frequency) to improve our services. We do not collect data from your end-users or track visitors to your websites.",
  },
  {
    icon: Server,
    title: "How We Use Your Data",
    content:
      "Your data is used to power AI analyses (Product Intelligence, UX Audits, Documentation Generation), personalize your dashboard experience, and improve our AI models. Uploaded review data and website URLs are processed by our AI agents to generate insights and recommendations specific to your products.",
  },
  {
    icon: Lock,
    title: "Data Storage & Security",
    content:
      "All data is stored securely using industry-standard encryption at rest (AES-256) and in transit (TLS 1.3). Our infrastructure is hosted on SOC 2 compliant providers. Analysis results and uploaded files are stored in isolated, project-specific containers. You can request full data deletion at any time.",
  },
  {
    icon: Users,
    title: "Third-Party Sharing",
    content:
      "We do not sell your data. We share data only with the services required to deliver our product — including AI model providers (for analysis processing), cloud infrastructure providers (for hosting), and payment processors (for billing). All third-party providers are bound by data processing agreements.",
  },
  {
    icon: Shield,
    title: "Your Rights",
    content:
      "You have the right to access, correct, or delete your personal data at any time. You can export all your project data, analysis results, and account information from the Settings page. If you wish to close your account, all associated data will be permanently deleted within 30 days.",
  },
  {
    icon: Mail,
    title: "Contact Us",
    content:
      "If you have questions about this privacy policy or how your data is handled, reach out to us at support@starox.ai. We aim to respond to all privacy-related inquiries within 48 hours.",
  },
];

const PrivacyPage = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-display font-bold text-foreground mb-2"
        >
          Privacy Policy
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-sm"
        >
          Last updated: March 15, 2026 · How Starox handles your data.
        </motion.p>
      </div>

      {/* Intro */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-6 mb-6"
      >
        <p className="text-sm text-foreground/80 leading-relaxed">
          At Starox, we take your privacy seriously. This policy describes what data we collect,
          why we collect it, how it's stored, and what rights you have. We are committed to
          transparency and to giving you full control over your information.
        </p>
      </motion.div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, i) => (
          <motion.section
            key={section.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.07 }}
            className="glass-card p-6"
          >
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                <section.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-2">{section.title}</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">{section.content}</p>
              </div>
            </div>
          </motion.section>
        ))}
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-8 text-center text-xs text-muted-foreground/60"
      >
        <p>
          © {new Date().getFullYear()} Starox. All rights reserved. ·{" "}
          <span className="text-primary/60">support@starox.ai</span>
        </p>
      </motion.div>
    </div>
  );
};

export default PrivacyPage;
