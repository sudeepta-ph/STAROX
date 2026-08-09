import LegalLayout from "@/components/legal/LegalLayout";
import { LegalSection, LegalList } from "@/components/legal/LegalSection";

const LAST_UPDATED = "July 30, 2026";

const TermsPage = () => {
  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="Terms governing the use of STAROX."
      lastUpdated={LAST_UPDATED}
      seoTitle="Terms of Service"
      seoDescription="Read the STAROX Terms of Service governing use of the STAROX platform, including account rules, acceptable use, AI generated content, billing, and liability."
      path="/terms"
    >
      <p className="text-[15px] leading-relaxed text-foreground/80">
        These Terms of Service ("Terms") govern your access to and use of STAROX, including our
        website, applications, and AI-powered products such as STAROX PMX, STAROX BUILD, STAROX
        AUTOMATION, and STAROX TEAMS (collectively, the "Services"), provided by STAROX ("STAROX,"
        "we," "us," or "our"). Please read these Terms carefully before using the Services.
      </p>

      <LegalSection id="acceptance" title="1. Acceptance of Terms">
        <p>
          By creating an account, accessing, or using the Services, you agree to be bound by these
          Terms and by our{" "}
          <a href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </a>
          . If you are using the Services on behalf of an organization, you represent that you have
          the authority to bind that organization to these Terms, in which case "you" refers to that
          organization. If you do not agree to these Terms, you may not access or use the Services.
        </p>
      </LegalSection>

      <LegalSection id="user-accounts" title="2. User Accounts">
        <p>
          To use most features of the Services, you must create an account. You agree to provide
          accurate, current, and complete information during registration and to keep that
          information up to date. You are responsible for safeguarding your account credentials and
          for all activity that occurs under your account. You must notify us promptly at{" "}
          <a href="mailto:support@starox.space" className="text-primary hover:underline">
            support@starox.space
          </a>{" "}
          if you become aware of any unauthorized use of your account.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="3. Acceptable Use">
        <p>You agree not to use the Services to:</p>
        <LegalList>
          <li>Violate any applicable law, regulation, or third party's rights, including intellectual property or privacy rights.</li>
          <li>Upload or generate content that is unlawful, harmful, defamatory, fraudulent, or infringing.</li>
          <li>Attempt to gain unauthorized access to any account, system, or network connected to the Services.</li>
          <li>Interfere with, disrupt, or place undue load on the Services' infrastructure, including through automated scraping or denial-of-service activity.</li>
          <li>Reverse engineer, decompile, or attempt to extract the source code of the Services, except where permitted by law.</li>
          <li>Use the Services to build a directly competing product using data or outputs obtained from the Services.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="ai-generated-content" title="4. AI Generated Content">
        <p>
          The Services use artificial intelligence to generate insights, documents, summaries, code,
          and other outputs based on the content you provide ("AI Generated Content"). AI Generated
          Content is produced automatically and may contain inaccuracies, omissions, or errors. You
          are responsible for reviewing, verifying, and independently validating any AI Generated
          Content before relying on it for business, technical, legal, or financial decisions.
        </p>
        <p>
          Subject to your compliance with these Terms, you own the AI Generated Content produced from
          your inputs, and you may use it for your own business purposes. STAROX makes no guarantee
          that AI Generated Content is unique, accurate, complete, or free of similarity to outputs
          generated for other users.
        </p>
      </LegalSection>

      <LegalSection id="user-responsibilities" title="5. User Responsibilities">
        <p>
          You are solely responsible for the content, files, and data you upload or connect to the
          Services, and for ensuring you have the necessary rights and permissions to do so. You must
          not upload content that you do not have the right to share, including confidential
          information belonging to third parties without authorization. You are responsible for
          maintaining appropriate backups of your data outside the Services.
        </p>
      </LegalSection>

      <LegalSection id="intellectual-property" title="6. Intellectual Property">
        <p>
          STAROX and its licensors retain all right, title, and interest in and to the Services,
          including the underlying software, models, designs, trademarks, and documentation. Nothing
          in these Terms transfers ownership of the Services to you. You retain ownership of the
          content you upload and, as described above, of the AI Generated Content produced from your
          inputs. You grant STAROX a limited, non-exclusive license to host, process, and display your
          content solely as necessary to operate and provide the Services to you.
        </p>
      </LegalSection>

      <LegalSection id="subscription-billing" title="7. Subscription & Billing">
        <p>
          Certain features of the Services require a paid subscription. By subscribing to a paid
          plan, you agree to pay the fees described at checkout, which are billed in advance on a
          recurring basis (monthly or annually) unless otherwise stated. Payments are processed
          securely through Stripe. Fees are non-refundable except where required by applicable law or
          expressly stated otherwise. We may change our pricing with prior notice; continued use of
          the Services after a price change takes effect constitutes acceptance of the new pricing.
          You may cancel your subscription at any time, effective at the end of the current billing
          period.
        </p>
      </LegalSection>

      <LegalSection id="third-party-services" title="8. Third-Party Services">
        <p>
          The Services allow you to connect third-party platforms such as GitHub, Google, Slack,
          Notion, and HubSpot. Your use of these integrations is subject to the respective third
          party's own terms and privacy policy. STAROX is not responsible for the availability,
          content, or practices of third-party services, and connecting an integration is done at
          your discretion and under your authorization.
        </p>
      </LegalSection>

      <LegalSection id="availability" title="9. Availability">
        <p>
          We strive to keep the Services available and performant, but we do not guarantee
          uninterrupted or error-free operation. The Services may be temporarily unavailable due to
          maintenance, updates, third-party outages, or circumstances beyond our reasonable control.
          We will make reasonable efforts to provide advance notice of planned maintenance where
          practical.
        </p>
      </LegalSection>

      <LegalSection id="limitation-of-liability" title="10. Limitation of Liability">
        <p>
          To the maximum extent permitted by applicable law, STAROX and its officers, employees, and
          affiliates will not be liable for any indirect, incidental, special, consequential, or
          punitive damages, or any loss of profits, revenue, data, or goodwill, arising out of or
          related to your use of the Services, even if advised of the possibility of such damages.
          Our total aggregate liability arising out of or relating to these Terms or the Services will
          not exceed the amount you paid to STAROX in the twelve (12) months preceding the event
          giving rise to the claim.
        </p>
      </LegalSection>

      <LegalSection id="disclaimer-of-warranties" title="11. Disclaimer of Warranties">
        <p>
          The Services, including all AI Generated Content, are provided "as is" and "as available"
          without warranties of any kind, whether express, implied, or statutory, including implied
          warranties of merchantability, fitness for a particular purpose, non-infringement, and
          accuracy. STAROX does not warrant that the Services will be uninterrupted, secure, or
          error-free, or that any AI Generated Content will be accurate, complete, or suitable for any
          particular purpose.
        </p>
      </LegalSection>

      <LegalSection id="account-suspension" title="12. Account Suspension">
        <p>
          We may suspend or restrict your access to the Services, with or without notice, if we
          reasonably believe you have violated these Terms, engaged in fraudulent or abusive
          behavior, posed a security risk, or if required to do so by law. Where practical, we will
          make reasonable efforts to notify you of the reason for suspension and any steps required to
          restore access.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="13. Termination">
        <p>
          You may stop using the Services and close your account at any time. We may terminate or
          suspend your access to the Services if you materially breach these Terms and fail to cure
          such breach within a reasonable period after notice, or immediately in cases of severe
          violations, security threats, or as required by law. Upon termination, your right to use the
          Services will cease, and we will handle your data in accordance with our{" "}
          <a href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="changes-to-terms" title="14. Changes to Terms">
        <p>
          We may update these Terms from time to time to reflect changes in our Services, legal
          requirements, or business practices. If we make material changes, we will update the "Last
          Updated" date above and, where appropriate, provide additional notice. Your continued use of
          the Services after changes take effect constitutes acceptance of the revised Terms.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" title="15. Governing Law">
        <p>
          These Terms are governed by the laws of the jurisdiction in which STAROX operates, without
          regard to conflict-of-law principles, except where applicable local law requires otherwise.
          Any dispute arising out of or relating to these Terms or the Services will be resolved
          through good-faith negotiation in the first instance, and thereafter through the courts or
          arbitration forum applicable to that jurisdiction.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="16. Contact Information">
        <p>
          If you have questions about these Terms, please contact us at{" "}
          <a href="mailto:support@starox.space" className="text-primary hover:underline">
            support@starox.space
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
};

export default TermsPage;
