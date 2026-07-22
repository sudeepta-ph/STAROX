import { ArrowLeft, Mail, MessageCircle, FileText, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Help = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 text-foreground">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card/50 px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:bg-card"
      >
        <ArrowLeft className="h-4 w-4" />
        Go back
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Help &amp; Support</h1>
        <p className="text-muted-foreground text-sm">
          Need help? We're here for you. Reach out through any of the channels below.
        </p>
      </div>

      {/* Contact by email */}
      <div className="rounded-xl border border-border bg-card p-6 mb-4 flex items-start gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold mb-1">Email Support</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Send us an email and we'll get back to you within 24 hours.
          </p>
          <a
            href="mailto:support@starox.ai"
            className="text-sm font-medium text-primary hover:underline"
          >
            support@starox.ai
          </a>
        </div>
      </div>

      {/* FAQ placeholder */}
      <div className="rounded-xl border border-border bg-card p-6 mb-4 flex items-start gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
          <HelpCircle className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold mb-1">FAQ</h2>
          <p className="text-sm text-muted-foreground">
            Browse frequently asked questions to find quick answers about STAROX features and usage.
          </p>
        </div>
      </div>

      {/* Documentation placeholder */}
      <div className="rounded-xl border border-border bg-card p-6 flex items-start gap-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold mb-1">Documentation</h2>
          <p className="text-sm text-muted-foreground">
            Detailed guides and API references to help you get the most out of STAROX Product Intelligence.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Help;
