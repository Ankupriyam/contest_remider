import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [{ title: "Privacy Policy — Contest Reminder" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-black text-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <header className="mx-auto flex max-w-4xl items-center px-6 py-6">
        <Link to="/" className="text-sm text-white/60 hover:text-white transition-colors">
          &larr; Back to Home
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 pb-32">
        <h1 className="mb-8 text-4xl font-medium tracking-tight">Privacy Policy</h1>
        
        <div className="space-y-6 text-sm leading-relaxed text-white/80">
          <p>Last updated: June 2026</p>

          <h2 className="text-xl font-medium text-white mt-8 mb-4">1. Information We Collect</h2>
          <p>
            When you sign in using Google, we collect basic profile information (such as your name and email address) 
            to create and manage your account. We also request permission to manage your Google Calendar events 
            specifically to add and remove contest reminders on your behalf.
          </p>

          <h2 className="text-xl font-medium text-white mt-8 mb-4">2. How We Use Your Information</h2>
          <p>
            The information we collect is used solely to provide the Contest Reminder service. Your calendar permissions 
            are only used to create, update, and delete events related to competitive programming contests that you 
            have opted into via your dashboard. We do not read or access any other events on your calendar.
          </p>

          <h2 className="text-xl font-medium text-white mt-8 mb-4">3. Data Retention and Security</h2>
          <p>
            We retain your profile data and user preferences as long as your account is active. If you choose to 
            revoke access or delete your account, we will remove your associated data from our servers. We use 
            industry-standard security practices to protect your data.
          </p>

          <h2 className="text-xl font-medium text-white mt-8 mb-4">4. Third-Party Services</h2>
          <p>
            Our service integrates with Google Calendar API to provide functionality. Your data is not shared with, 
            sold to, or otherwise transferred to any other third parties.
          </p>

          <h2 className="text-xl font-medium text-white mt-8 mb-4">5. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact the maintainers via the project repository.
          </p>
        </div>
      </main>
    </div>
  );
}
