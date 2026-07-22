import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Can I cancel anytime?",
    answer: "Yes, you can cancel your subscription at any time. Once canceled, you will continue to have access to your plan's benefits until the end of your current billing cycle.",
  },
  {
    question: "What are Agent Runs?",
    answer: "An Agent Run is counted whenever an AI Agent executes a task, analyzes a webpage/repo, or runs an automated workflow step. Standard chats and messaging interactions do not count as runs.",
  },
  {
    question: "Can I switch plans?",
    answer: "Absolutely. You can upgrade or downgrade your plan at any time. If you upgrade, the change takes effect immediately and we will prorate the price. Downgrades take effect at the start of your next billing cycle.",
  },
  {
    question: "Do unused Agent Runs roll over?",
    answer: "No. Unused Agent Runs do not roll over to the next day or month. Your run limits reset daily at 00:00 UTC to ensure system reliability and prompt execution queues.",
  },
  {
    question: "Is my data used for training?",
    answer: "No. We respect your privacy and code ownership. STAROX does not use your code bases, repository signals, customer reviews, or private chat histories for training models. All integrations are fully isolated.",
  },
  {
    question: "Can I buy additional credits?",
    answer: "Yes. If you hit your daily limits on Pro or Team plans, you can buy add-on credit packs directly from your billing settings dashboard to keep your agents executing continuously.",
  },
  {
    question: "Is there a student discount?",
    answer: "Yes, we offer a 50% discount on the Pro plan for verified students, educators, and open-source maintainers. Reach out to support with your academic credentials to activate it.",
  },
  {
    question: "How do Team plans work?",
    answer: "Team plans charge per user/month. They give your team a shared memory context, shared workspace templates, access to role permissions (Admin, Member, Viewer), and unified billing credits.",
  },
  {
    question: "What payment methods are supported?",
    answer: "We support all major credit cards, UPI, Net Banking, Apple Pay, Google Pay, and bank transfers. All invoices are generated and handled securely through Stripe.",
  },
];

export default function FAQ() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 mt-20">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold font-display text-foreground sm:text-3xl">
          Frequently Asked Questions
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Everything you need to know about STAROX pricing, billing, and agent capabilities.
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-3">
        {FAQ_ITEMS.map((item, idx) => (
          <AccordionItem
            key={idx}
            value={`faq-${idx}`}
            className="border border-border/50 bg-card/40 backdrop-blur-xl rounded-xl px-5 py-0.5 overflow-hidden transition-all duration-200 hover:border-primary/20"
          >
            <AccordionTrigger className="text-xs font-semibold text-foreground/95 hover:text-primary hover:no-underline py-4">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground/80 leading-relaxed pb-4 pt-1">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
