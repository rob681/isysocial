import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Isysocial",
  description: "Terms of Service for Isysocial social media management platform",
};

export default function TermsOfServicePage() {
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
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-gray-400 mb-10">
          Last updated: March 14, 2026
        </p>

        <div className="space-y-10">
          {/* Acceptance */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-300 leading-relaxed">
              By accessing or using the Isysocial platform (&quot;Service&quot;), you agree to be
              bound by these Terms of Service (&quot;Terms&quot;). If you are using the Service on
              behalf of an organization (such as a marketing agency), you represent that you have the
              authority to bind that organization to these Terms. If you do not agree to these Terms,
              you may not use the Service.
            </p>
          </section>

          {/* Description of Service */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              2. Description of Service
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Isysocial is a social media management platform designed for agencies. The Service
              allows agencies to manage content creation, client approval workflows, scheduling, and
              publishing of social media content across multiple platforms including Facebook,
              Instagram, LinkedIn, TikTok, and X (formerly Twitter). Features include team
              collaboration, client portals, AI-assisted content generation, and analytics.
            </p>
          </section>

          {/* Account Registration */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              3. Account Registration
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  You must provide accurate and complete information when creating an account.
                </li>
                <li>
                  You are responsible for maintaining the confidentiality of your account credentials.
                </li>
                <li>
                  You are responsible for all activity that occurs under your account.
                </li>
                <li>
                  You must notify us immediately of any unauthorized use of your account.
                </li>
                <li>
                  Agency administrators are responsible for managing their team members&apos; access
                  and permissions.
                </li>
              </ul>
            </div>
          </section>

          {/* Social Media Integration */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              4. Social Media Account Integration
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>When you connect social media accounts to Isysocial:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  You authorize Isysocial to access and manage your connected social media accounts
                  on your behalf, including publishing and scheduling content.
                </li>
                <li>
                  You represent that you have the necessary rights and permissions to connect and
                  manage those accounts.
                </li>
                <li>
                  You may disconnect any social media account at any time through the platform
                  settings.
                </li>
                <li>
                  You remain subject to the terms of service and policies of each social media
                  platform you connect.
                </li>
              </ul>
            </div>
          </section>

          {/* User Content */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              5. User Content
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                You retain ownership of all content you create or upload to the Service, including
                posts, images, videos, brand assets, and ideas. By using the Service, you grant
                Isysocial a limited, non-exclusive license to store, display, and transmit your
                content solely for the purpose of providing the Service (including publishing to
                connected social media platforms).
              </p>
              <p>You are responsible for ensuring that your content:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Does not violate any applicable laws or regulations.</li>
                <li>Does not infringe on third-party intellectual property rights.</li>
                <li>
                  Complies with the content policies of the social media platforms where it is
                  published.
                </li>
              </ul>
            </div>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              6. Acceptable Use
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the Service for any illegal or unauthorized purpose.</li>
                <li>Attempt to gain unauthorized access to the Service or its related systems.</li>
                <li>Interfere with or disrupt the integrity or performance of the Service.</li>
                <li>
                  Use the Service to distribute spam, malware, or other harmful content.
                </li>
                <li>
                  Reverse engineer, decompile, or disassemble any part of the Service.
                </li>
                <li>
                  Share your account credentials or allow unauthorized users to access the Service.
                </li>
              </ul>
            </div>
          </section>

          {/* Billing & Subscription */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              7. Billing & Subscription
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  The Service is offered under subscription plans with varying features and limits.
                </li>
                <li>
                  Free trial periods may be offered. At the end of a trial, you must subscribe to a
                  paid plan to continue using the Service.
                </li>
                <li>
                  Subscription fees are billed in advance on a monthly or annual basis.
                </li>
                <li>
                  We reserve the right to modify pricing with 30 days&apos; notice.
                </li>
                <li>
                  Refunds are handled on a case-by-case basis at our discretion.
                </li>
              </ul>
            </div>
          </section>

          {/* Disclaimer */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              8. Disclaimer of Warranties
            </h2>
            <p className="text-gray-300 leading-relaxed">
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without
              warranties of any kind, either express or implied. We do not guarantee that the Service
              will be uninterrupted, error-free, or secure. We are not responsible for any content
              published to third-party platforms through the Service, or for changes to third-party
              platform APIs that may affect the Service&apos;s functionality.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              9. Limitation of Liability
            </h2>
            <p className="text-gray-300 leading-relaxed">
              To the maximum extent permitted by applicable law, Isysocial and its officers,
              employees, and agents shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages, including but not limited to loss of profits, data,
              or business opportunities, arising out of or related to your use of the Service.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              10. Termination
            </h2>
            <div className="space-y-3 text-gray-300 leading-relaxed">
              <p>
                Either party may terminate the use of the Service at any time. We may suspend or
                terminate your access if you violate these Terms or engage in activities that may
                harm the Service or other users. Upon termination:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your right to use the Service will immediately cease.</li>
                <li>
                  Your data will be retained for 30 days to allow for export, after which it will be
                  permanently deleted.
                </li>
                <li>Connected social media account tokens will be revoked.</li>
              </ul>
            </div>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              11. Changes to These Terms
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We reserve the right to update these Terms at any time. We will notify registered users
              of material changes via email or through the platform. Continued use of the Service
              after changes become effective constitutes acceptance of the updated Terms.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              12. Governing Law
            </h2>
            <p className="text-gray-300 leading-relaxed">
              These Terms shall be governed by and construed in accordance with applicable laws. Any
              disputes arising from these Terms or the use of the Service shall be resolved through
              good-faith negotiation first, and if necessary, through binding arbitration.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">
              13. Contact Us
            </h2>
            <div className="text-gray-300 leading-relaxed space-y-2">
              <p>
                If you have questions about these Terms, please contact us:
              </p>
              <ul className="list-none space-y-1 mt-3">
                <li>
                  Email:{" "}
                  <a
                    href="mailto:legal@isysocial.com"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    legal@isysocial.com
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
