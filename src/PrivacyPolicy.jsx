import React from 'react';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPolicy({ onBack }) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center shadow-md sticky top-0 z-50">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 hover:text-orange-400 transition-colors font-medium"
        >
          <ChevronLeft size={20} />
          Back
        </button>
        <h1 className="text-xl font-bold ml-6">Privacy Policy</h1>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-6">
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-3xl font-black mb-6 text-slate-900">Privacy Policy for Vaidik Dharm Inter College</h2>
          <p className="text-slate-500 mb-8">Last updated: March 31, 2026</p>

          <div className="space-y-8 text-slate-700 leading-relaxed">
            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-3">1. Introduction</h3>
              <p>
                Welcome to the Vaidik Dharm Inter College (VDIC) ERP system. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website or use our application and tell you about your privacy rights and how the law protects you.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-3">2. The Data We Collect About You</h3>
              <p className="mb-2">We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier, marital status, title, date of birth and gender.</li>
                <li><strong>Contact Data</strong> includes billing address, delivery address, email address and telephone numbers.</li>
                <li><strong>Academic Data</strong> includes enrollment details, grades, attendance records, and behavioral reports.</li>
                <li><strong>Technical Data</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-3">3. How We Use Your Personal Data</h3>
              <p className="mb-2">We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Where we need to perform the contract we are about to enter into or have entered into with you (e.g., providing educational services).</li>
                <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
                <li>Where we need to comply with a legal or regulatory obligation.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-3">4. Data Security</h3>
              <p>
                We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-3">5. Data Retention</h3>
              <p>
                We will only retain your personal data for as long as necessary to fulfill the purposes we collected it for, including for the purposes of satisfying any legal, accounting, or reporting requirements.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-3">6. Your Legal Rights</h3>
              <p>
                Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, restriction, transfer, to object to processing, to portability of data and (where the lawful ground of processing is consent) to withdraw consent.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-900 mb-3">7. Contact Us</h3>
              <p>
                If you have any questions about this privacy policy or our privacy practices, please contact us at:
                <br /><br />
                <strong>Email:</strong> info@vaidikdharmintercollege.in<br />
                <strong>Address:</strong> Dumri Nivas, Pali, Gorakhpur, Uttar Pradesh – 273209
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="bg-black text-slate-400 text-center py-8 border-t border-slate-800">
        <p className="font-medium">© 2026 Vaidik Dharm Inter College | Designed with ❤️</p>
      </footer>
    </div>
  );
}
