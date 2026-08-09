import LegalLayout from "@/components/legal/LegalLayout";
import { LegalSection, LegalSubheading, LegalList } from "@/components/legal/LegalSection";

const LAST_UPDATED = "July 30, 2026";

const PrivacyPage = () => {
  return (
    <LegalLayout
      title="Privacy Policy"
      subtitle="How STAROX collects, uses, and protects your information."
      lastUpdated={LAST_UPDATED}
      seoTitle="Privacy Policy"
      seoDescription="Read the STAROX Privacy Policy to understand what information we collect, how we use it, how AI features process your data, and the rights you have over your information."
      path="/privacy"
    >
      <p className="text-[15px] leading-relaxed text-foreground/80">
        STAROX ("STAROX," "we," "us," or "our") provides an AI-powered product intelligence and
        automation platform, including STAROX PMX, STAROX BUILD, STAROX AUTOMATION, and STAROX
        TEAMS (collectively, the "Services"). This Privacy Policy explains what information we
        collect when you visit our website or use the Services, how we use and protect that
        information, and the choices and rights available to you. By accessing or using the
        Services, you agree to the collection and use of information as described in this policy.
      </p>

      <LegalSection id="information-we-collect" title="1. Information We Collect">
        <p>
          We collect information that you provide directly, information generated through your use
          of the Services, and information received from third parties you choose to connect. The
          categories of information we collect include:
        </p>

        <LegalSubheading>Account information</LegalSubheading>
        <p>
          When you create a STAROX account, we collect your name, email address, password or
          authentication credentials (managed through our authentication provider), organization
          or company name, and billing details where applicable.
        </p>

        <LegalSubheading>Profile information</LegalSubheading>
        <p>
          Information you add to your profile, such as your job title, role, avatar, location,
          website, and biography, is used to personalize your workspace and displayed to your
          teammates within shared projects.
        </p>

        <LegalSubheading>Connected integrations</LegalSubheading>
        <p>
          When you connect a third-party service to STAROX (for example GitHub, Slack, Notion,
          HubSpot, or Google), we receive access tokens and the specific account, workspace, or
          repository data you authorize us to read or write, so that STAROX can sync data, surface
          insights, and automate workflows on your behalf.
        </p>

        <LegalSubheading>Usage analytics</LegalSubheading>
        <p>
          We collect information about how you interact with the Services, including pages viewed,
          features used, session duration, click patterns, device and browser type, IP address, and
          referring URLs. This data helps us understand product usage and improve reliability and
          performance.
        </p>

        <LegalSubheading>Uploaded files and documents</LegalSubheading>
        <p>
          Files, documents, spreadsheets, screenshots, and other materials you upload to STAROX
          (for example, product requirement documents, user research, or review exports) are stored
          so that they can be analyzed, referenced, and retrieved within your workspace.
        </p>

        <LegalSubheading>AI prompts and generated outputs</LegalSubheading>
        <p>
          We collect the prompts, instructions, and source content you submit to STAROX's AI
          features, along with the outputs generated in response (such as insights, summaries, PRDs,
          and code), so that the Services can process your requests, maintain history, and improve
          reliability.
        </p>
      </LegalSection>

      <LegalSection id="how-we-use-information" title="2. How We Use Information">
        <p>We use the information we collect to operate, maintain, and improve the Services, including to:</p>
        <LegalList>
          <li><strong className="text-foreground">Improve STAROX products</strong> — analyze usage patterns and feedback to fix issues, prioritize features, and improve performance and reliability.</li>
          <li><strong className="text-foreground">Provide AI-powered features</strong> — process the content you submit so that our AI models can generate the insights, documents, and automations you request.</li>
          <li><strong className="text-foreground">Generate insights</strong> — analyze connected data sources, uploaded files, and usage signals to surface product, market, and workflow recommendations within your workspace.</li>
          <li><strong className="text-foreground">Authenticate users</strong> — verify your identity, secure your account, and maintain your session across the Services.</li>
          <li><strong className="text-foreground">Customer support</strong> — respond to your questions, troubleshoot issues, and communicate important account or service updates.</li>
          <li><strong className="text-foreground">Security</strong> — detect, investigate, and prevent fraudulent activity, abuse, and security incidents, and enforce our Terms of Service.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="ai-processing" title="3. AI Processing">
        <p>
          STAROX's core features rely on artificial intelligence models to analyze content and
          generate requested outputs. When you submit a prompt, upload a document, or connect a data
          source, that content may be processed by first-party or third-party AI models in order to
          produce the analysis, recommendation, document, or code you requested.
        </p>
        <p>
          You retain ownership of the data you submit to STAROX and of the outputs generated for you,
          unless otherwise specified in a separate written agreement (for example, an enterprise or
          reseller agreement). We do not claim ownership over your content or your generated outputs.
          We do not sell your prompts or generated content to third parties, and we do not use
          customer content to train AI models made available to other customers unless you explicitly
          opt in.
        </p>
      </LegalSection>

      <LegalSection id="third-party-integrations" title="4. Third-Party Integrations">
        <p>
          STAROX integrates with a number of third-party services to power authentication, analytics,
          billing, communication, and connected data sources, including GitHub, Google Analytics,
          Mixpanel, Stripe, Slack, Notion, HubSpot, Microsoft Clarity, Intercom, Amplitude, and Canny.
        </p>
        <p>
          STAROX only accesses data from these services that you have explicitly authorized through
          each provider's consent or OAuth flow. You can review and revoke access to any connected
          integration at any time from your STAROX account settings or directly through the
          third-party provider's own settings. Each integration's use of your data is also governed
          by that provider's own privacy policy and terms.
        </p>
      </LegalSection>

      <LegalSection id="data-security" title="5. Data Security">
        <p>
          We apply industry-standard security practices to protect your information, including
          encryption of data in transit using TLS and encryption of data at rest. Access to customer
          data within STAROX is restricted on a least-privilege basis, meaning only personnel and
          systems that require access to perform their function are granted it, and all such access
          is logged and monitored.
        </p>
        <p>
          Our infrastructure runs on reputable cloud providers with strong physical and network
          security controls. While no method of transmission or storage is 100% secure, we
          continuously review and update our security practices to protect your information against
          unauthorized access, alteration, disclosure, or destruction.
        </p>
      </LegalSection>

      <LegalSection id="cookies-analytics" title="6. Cookies & Analytics">
        <p>
          We use cookies and similar technologies (such as local storage) to keep you signed in,
          remember your preferences, and understand how the Services are used. We also use analytics
          tools, including Google Analytics, Mixpanel, Amplitude, and Microsoft Clarity, to collect
          aggregated and pseudonymized usage data that helps us understand engagement and improve the
          product experience. You can control cookies through your browser settings; disabling
          cookies may limit some functionality of the Services.
        </p>
      </LegalSection>

      <LegalSection id="data-retention" title="7. Data Retention">
        <p>
          We retain your information for as long as your account remains active or as needed to
          provide the Services to you. If you close your account, we will delete or anonymize your
          personal information within a commercially reasonable period, except where we are required
          to retain certain information to comply with legal obligations, resolve disputes, enforce
          our agreements, or maintain security and audit logs.
        </p>
      </LegalSection>

      <LegalSection id="user-rights" title="8. User Rights">
        <p>
          Depending on your location, you may have certain rights regarding the personal information
          we hold about you. Where applicable, these rights include the ability to:
        </p>
        <LegalList>
          <li><strong className="text-foreground">Access</strong> — request a copy of the personal information we hold about you.</li>
          <li><strong className="text-foreground">Correction</strong> — request that we correct inaccurate or incomplete information in your account.</li>
          <li><strong className="text-foreground">Deletion</strong> — request that we delete your personal information and account data, subject to certain legal exceptions.</li>
          <li><strong className="text-foreground">Export</strong> — request an export of your data in a portable, commonly used format.</li>
        </LegalList>
        <p>
          To exercise any of these rights, please contact us using the information below. We will
          respond to verified requests within a reasonable timeframe and in accordance with
          applicable law.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="9. Contact Information">
        <p>
          If you have questions, concerns, or requests regarding this Privacy Policy or how your
          information is handled, please contact us at{" "}
          <a href="mailto:support@starox.space" className="text-primary hover:underline">
            support@starox.space
          </a>
          . We aim to respond to all privacy-related inquiries promptly.
        </p>
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices or
          for legal, operational, or regulatory reasons. If we make material changes, we will update
          the "Last Updated" date above and, where appropriate, provide additional notice.
        </p>
      </LegalSection>
    </LegalLayout>
  );
};

export default PrivacyPage;
