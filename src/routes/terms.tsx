import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [{ title: "Terms of Service — Contest Reminder" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="relative min-h-screen bg-black text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <header className="mx-auto flex max-w-4xl items-center px-6 py-6">
        <Link to="/" className="text-sm text-white/60 hover:text-white transition-colors">
          &larr; Back to Home
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 pb-32">
        <h1 className="mb-8 text-4xl font-medium tracking-tight">Terms of Service</h1>
        
        <div className="space-y-6 text-sm leading-relaxed text-white/80">
          <p>Last updated: June 2026</p>

          <h2 className="text-xl font-medium text-white mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing and using Contest Reminder, you accept and agree to be bound by the terms and provision of this agreement. 
            If you do not agree to abide by these terms, please do not use this service.
          </p>

          <h2 className="text-xl font-medium text-white mt-8 mb-4">2. Description of Service</h2>
          <p>
            Contest Reminder provides an automated synchronization service that adds upcoming competitive programming contests 
            (from supported platforms) directly to your connected Google Calendar. The service is provided "as is" and is 
            free to use.
          </p>

          <h2 className="text-xl font-medium text-white mt-8 mb-4">3. Account Responsibilities</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials (handled via Google OAuth) 
            and for all activities that occur under your account. You agree to notify us immediately of any unauthorized 
            use of your account.
          </p>

          <h2 className="text-xl font-medium text-white mt-8 mb-4">4. Disclaimers</h2>
          <p>
            While we strive to keep contest schedules accurate and up to date, we do not guarantee the absolute accuracy 
            of the times and dates provided. The service relies on third-party data sources, which may occasionally change 
            or experience downtime. We are not responsible for any missed contests resulting from incorrect data or service downtime.
          </p>

          <h2 className="text-xl font-medium text-white mt-8 mb-4">5. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. We do so by posting and drawing attention to the updated 
            terms on this site. Your decision to continue to visit and make use of the site after such changes have been made 
            constitutes your formal acceptance of the new Terms of Service.
          </p>
        </div>
      </main>
    </div>
  );
}
