import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Isysocial",
  description: "Privacy Policy for Isysocial social media management platform",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[hsl(222,35%,7%)] text-gray-200">
      {/* Header */}
      <header className="border-b border-white/10 bg-[hsl(222,30%,11%)]">
        <div className="mx-auto max-w-4xl px-6 py-6 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">IS</span>
          </div>
          <span className="text-xl font-semibold text-white">Isysocial</span>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-400 mb-10">
          Last updated: March 14, 2026
        </p>

        <div className="space-y-10">
          {/* Intro */}
          <section>
            <p className="text-gray-300 leading-relaxed">
              Isysocial (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is a social media
              management platform that helps agencies manage content creation, scheduling, and
              publishing for their clients. This Privacy Policy explains how we collect, use, store,
              and protect your information when you use our platform.
            </p>
          </section>

          {/* What Data We Collect */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              1. What Data We Collect
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>We collect the following types of information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-white">Account Information:</strong> Name, email address,
                  and password when you create an account.
                </li>
                <li>
                  <strong className="text-white">Agency & Client Data:</strong> Company names, logos,
                  brand assets, and content you create within the platform.
                </li>
                <li>
                  <strong className="text-white">Social Media Data:</strong> When you connect social
                  media accounts (Facebook, Instagram, LinkedIn, TikTok, X), we receive OAuth access
                  tokens, account identifiers (such as Page IDs and business account IDs), profile
                  names, and profile pictures from those platforms.
                </li>
                <li>
                  <strong className="text-white">Usage Data:</strong> Information about how you
                  interact with the platform, including pages visited and features used.
                </li>
              </ul>
            </div>
          </section>

          {/* How We Store It */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              2. How We Store Your Data
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>Your data is stored securely using industry-standard practices:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  All data is stored in secure, encrypted PostgreSQL databases hosted on Supabase
                  with TLS encryption in transit.
                </li>
                <li>
                  <strong className="text-white">OAuth tokens</strong> obtained from social media
                  platforms (Facebook, Instagram, etc.) are stored encrypted and associated with your
                  agency account. Tokens are never exposed in client-side code or logs.
                </li>
                <li>
                  Uploaded media and brand assets are stored in secure cloud storage with
                  access-controlled buckets.
                </li>
                <li>
                  Passwords are hashed using bcrypt and are never stored in plain text.
                </li>
              </ul>
            </div>
          </section>

          {/* How We Use It */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              3. How We Use Your Data
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide and maintain the Isysocial platform and its features.</li>
                <li>
                  Publish, schedule, and manage social media content on your behalf through connected
                  social media accounts.
                </li>
                <li>
                  Authenticate your identity and manage access to your agency workspace.
                </li>
                <li>Send notifications about post approvals, comments, and status changes.</li>
                <li>Improve the platform based on usage patterns (aggregated, non-personal data).</li>
              </ul>
              <p>
                We do <strong className="text-white">not</strong> sell your personal data to third
                parties. We do not use your social media data for advertising or profiling purposes.
              </p>
            </div>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              4. Data Sharing
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>We share data only in the following limited circumstances:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-white">Social Media Platforms:</strong> When you publish
                  content, we send that content to the respective platform (Facebook, Instagram, etc.)
                  via their official APIs.
                </li>
                <li>
                  <strong className="text-white">Service Providers:</strong> We use third-party
                  services for hosting (Vercel, Supabase), email (Resend), and AI features (OpenAI),
                  which process data only as needed to provide their services.
                </li>
                <li>
                  <strong className="text-white">Legal Requirements:</strong> If required by law or
                  legal process.
                </li>
              </ul>
            </div>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              5. Data Retention
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We retain your data for as long as your account is active. When an agency account is
              deactivated, associated data (posts, media, client information) is retained for 30 days
              before permanent deletion. Social media tokens are revoked immediately upon
              disconnection of an account.
            </p>
          </section>

          {/* Data Deletion */}
          <section id="data-deletion">
            <h2 className="text-xl font-semibold text-white mb-4">
              6. Data Deletion
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>You have the right to request deletion of your data at any time:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-white">Disconnect Social Accounts:</strong> You can
                  disconnect any social media account from the platform settings. This immediately
                  revokes and deletes the stored OAuth tokens.
                </li>
                <li>
                  <strong className="text-white">Delete Your Account:</strong> Contact us to request
                  full deletion of your account and all associated data.
                </li>
                <li>
                  <strong className="text-white">Facebook/Instagram Data:</strong> You can also
                  remove Isysocial&apos;s access to your data through your Facebook or Instagram
                  account settings under Apps and Websites.
                </li>
              </ul>
              <p>
                To request data deletion, email us at{" "}
                <a
                  href="mailto:privacy@isysocial.com"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  privacy@isysocial.com
                </a>{" "}
                with the subject line &quot;Data Deletion Request&quot;. We will process your request
                within 30 days.
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              7. Your Rights
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>Depending on your location, you may have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access the personal data we hold about you.</li>
                <li>Correct inaccurate or incomplete data.</li>
                <li>Request deletion of your data (see Data Deletion above).</li>
                <li>Object to or restrict certain processing of your data.</li>
                <li>Export your data in a portable format.</li>
              </ul>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              8. Contact Us
            </h2>
            <div className="text-gray-300 leading-relaxed space-y-2">
              <p>
                If you have questions about this Privacy Policy or wish to exercise your data rights,
                please contact us:
              </p>
              <ul className="list-none space-y-1 mt-3">
                <li>
                  Email:{" "}
                  <a
                    href="mailto:privacy@isysocial.com"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    privacy@isysocial.com
                  </a>
                </li>
                <li>
                  Website:{" "}
                  <a
                    href="https://isysocial.com"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    isysocial.com
                  </a>
                </li>
              </ul>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-white/10 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Isysocial. All rights reserved.
        </div>
      </main>
    </div>
  );
}
