import React from 'react';
import { Shield, Lock, Eye, FileText, Mail, MapPin, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ShareButton } from '../components/ShareButton';

export default function PrivacyPolicy() {
  const lastUpdated = "September 1, 2026";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-10 border border-[#e0e0d5] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-[#5A5A40] mb-3">
              <Shield className="w-6 h-6" />
              <span className="text-xs uppercase font-bold tracking-widest font-sans">Official Policy Document</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-[#2d2d2a] mb-2">
              Privacy Policy for Bethlehem Kohhran
            </h1>
            <p className="text-xs text-stone-500 font-sans">
              Effective Date & Last Updated: <strong>{lastUpdated}</strong>
            </p>
          </div>
          <ShareButton
            title="Privacy Policy - Bethlehem Kohhran"
            summary="Official Privacy Policy document for Bethlehem Kohhran mobile app and web portal."
            url="/privacy-policy"
            variant="button"
            buttonText="Share"
            className="shrink-0"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl p-6 sm:p-10 border border-[#e0e0d5] shadow-sm space-y-8 font-sans text-sm text-[#2d2d2a] leading-relaxed">
        
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif italic text-[#5A5A40] border-b border-[#ecece0] pb-2">
            1. Introduction & Overview
          </h2>
          <p>
            Welcome to the <strong>Bethlehem Kohhran</strong> application (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). 
            Bethlehem Kohhran is a Presbyterian Church located in Bethlehem Veng, Aizawl, Mizoram, India. 
            We are dedicated to safeguarding the privacy and personal data of our church members, visitors, and application users.
          </p>
          <p>
            This Privacy Policy explains how our mobile application and web portal collect, use, store, share, and protect your information when you use our services.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif italic text-[#5A5A40] border-b border-[#ecece0] pb-2">
            2. Information We Collect
          </h2>
          <p>
            We only collect personal information necessary to deliver church community features, member directory services, program schedules, and official church communication:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li>
              <strong>Account & Profile Information:</strong> When you register or sign in, we may collect your name, email address, phone number, and authentication credentials through Google Firebase Authentication.
            </li>
            <li>
              <strong>Church Directory & Member Records:</strong> For verified church members, administrative profiles may store directory information such as house number, Upa Bial (elder section), fellowship affiliation, and family roll information as authorized by church administration.
            </li>
            <li>
              <strong>User-Submitted Content:</strong> Information submitted via official feedback forms, prayer requests, committee reports, or church archive documents.
            </li>
            <li>
              <strong>Technical & Device Data:</strong> Basic technical logs, device identifiers, and anonymous aggregate visitor counts to ensure app stability and security.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif italic text-[#5A5A40] border-b border-[#ecece0] pb-2">
            3. How We Use Your Information
          </h2>
          <p>The collected information is used strictly for legitimate church administration and community purposes, including:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-700">
            <li>Providing access to weekly church service programs, announcements, and prayer topics.</li>
            <li>Facilitating the internal church member directory and Upa Bial pastoral care.</li>
            <li>Authenticating authorized church committee leaders and administrators.</li>
            <li>Maintaining historical church archives, newsletters, and milestone records.</li>
            <li>Ensuring application integrity, preventing unauthorized access, and securing user accounts.</li>
          </ul>
          <p className="font-semibold text-stone-800">
            We do NOT sell, rent, monetize, or trade any personal information to advertisers or commercial third parties.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif italic text-[#5A5A40] border-b border-[#ecece0] pb-2">
            4. Third-Party Service Providers & Data Storage
          </h2>
          <p>
            To provide high reliability and industry-standard security, our application utilizes trusted cloud infrastructure providers:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li>
              <strong>Google Firebase (Google LLC):</strong> Used for secure cloud authentication and encrypted database storage (Firestore). Data transmitted is encrypted in transit via SSL/TLS and at rest.
            </li>
            <li>
              <strong>Cloud Hosting:</strong> Cloud Run / Cloud Storage infrastructure to deliver responsive web and API performance.
            </li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif italic text-[#5A5A40] border-b border-[#ecece0] pb-2">
            5. Children&apos;s Privacy & Protection
          </h2>
          <p>
            Bethlehem Kohhran upholds strict child protection standards. We do not knowingly collect personal data directly from children under the age of 13 without parental consent. Any youth or Sunday school information published is strictly supervised by authorized church elders and guardians.
          </p>
          <p>
            Please review our dedicated <Link to="/child-safety-standards" className="text-[#5A5A40] underline font-bold">Child Safety Standards Policy</Link> for full details on our zero-tolerance policy against Child Sexual Abuse Material (CSAM) and Child Sexual Abuse and Exploitation (CSAE).
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif italic text-[#5A5A40] border-b border-[#ecece0] pb-2">
            6. Data Retention and Account Deletion
          </h2>
          <p>
            Users have the right to request access to, correction of, or deletion of their personal data and user accounts at any time.
          </p>
          <div className="bg-[#fcfaf7] p-4 rounded-xl border border-[#ecece0] space-y-2">
            <p className="font-semibold text-stone-800">How to request data or account deletion:</p>
            <p className="text-xs text-stone-600">
              Send an email to <a href="mailto:kohhranb@gmail.com" className="text-[#5A5A40] underline font-bold">kohhranb@gmail.com</a> with the subject <em>&quot;Account & Data Deletion Request&quot;</em>. Our administrative team will process the request and permanently purge your account credentials and personal records within 7 business days.
            </p>
          </div>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif italic text-[#5A5A40] border-b border-[#ecece0] pb-2">
            7. Contact Information
          </h2>
          <p>If you have any questions, concerns, or inquiries regarding this Privacy Policy, please contact our administrative team:</p>
          
          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <div className="p-4 bg-[#fcfaf7] border border-[#ecece0] rounded-xl flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#5A5A40] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Email Address</p>
                <a href="mailto:kohhranb@gmail.com" className="text-sm font-semibold text-[#5A5A40] hover:underline">
                  kohhranb@gmail.com
                </a>
              </div>
            </div>

            <div className="p-4 bg-[#fcfaf7] border border-[#ecece0] rounded-xl flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#5A5A40] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Church Location</p>
                <p className="text-sm text-stone-700 font-medium">
                  Bethlehem Kohhran, Bethlehem Veng, Aizawl, Mizoram - 796001, India
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
