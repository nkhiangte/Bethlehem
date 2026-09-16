import React from 'react';
import { FileText, Shield, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ShareButton } from '../components/ShareButton';

export default function TermsOfService() {
  const lastUpdated = "September 1, 2026";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-10 border border-[#e0e0d5] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-[#5A5A40] mb-3">
              <FileText className="w-6 h-6" />
              <span className="text-xs uppercase font-bold tracking-widest font-sans">Legal Terms</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-[#2d2d2a] mb-2">
              Terms of Service for Bethlehem Kohhran
            </h1>
            <p className="text-xs text-stone-500 font-sans">
              Effective Date & Last Updated: <strong>{lastUpdated}</strong>
            </p>
          </div>
          <ShareButton
            title="Terms of Service - Bethlehem Kohhran"
            summary="Official Terms of Service for Bethlehem Kohhran mobile app and web services."
            url="/terms-of-service"
            variant="button"
            buttonText="Share"
            className="shrink-0"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl p-6 sm:p-10 border border-[#e0e0d5] shadow-sm space-y-8 font-sans text-sm text-[#2d2d2a] leading-relaxed">
        
        <section className="space-y-3">
          <h2 className="text-lg font-serif italic text-[#5A5A40] border-b border-[#ecece0] pb-2">
            1. Acceptance of Terms
          </h2>
          <p>
            By downloading, installing, or accessing the <strong>Bethlehem Kohhran</strong> application or website, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-serif italic text-[#5A5A40] border-b border-[#ecece0] pb-2">
            2. Purpose of the Application
          </h2>
          <p>
            The Bethlehem Kohhran application is designed to facilitate church communication, weekly worship schedules, elder contacts, fellowship programs, member directory lookup, and digital church archives for Bethlehem Kohhran (Presbyterian Church of India, Mizoram Synod).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-serif italic text-[#5A5A40] border-b border-[#ecece0] pb-2">
            3. User Conduct & Community Guidelines
          </h2>
          <p>Users must adhere to church ethics, respectful conduct, and community standards:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-stone-700">
            <li>You agree not to misuse church directory information for unauthorized commercial advertising, spam, or harassment.</li>
            <li>You agree not to upload harmful, offensive, hateful, or abusive content.</li>
            <li>
              You agree to strictly comply with our <Link to="/child-safety-standards" className="text-[#5A5A40] underline font-bold">Child Safety Standards</Link> prohibiting CSAM and CSAE.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-serif italic text-[#5A5A40] border-b border-[#ecece0] pb-2">
            4. Privacy & Child Protection
          </h2>
          <p>
            Your privacy is of vital importance to us. Please read our <Link to="/privacy-policy" className="text-[#5A5A40] underline font-bold">Privacy Policy</Link> and <Link to="/child-safety-standards" className="text-[#5A5A40] underline font-bold">Child Safety Standards</Link> which govern how personal data is protected.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-serif italic text-[#5A5A40] border-b border-[#ecece0] pb-2">
            5. Contact Information
          </h2>
          <p>For any legal or service inquiries, please contact:</p>
          <div className="p-4 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-xs space-y-1">
            <p><strong>Organization:</strong> Bethlehem Kohhran</p>
            <p><strong>Email:</strong> <a href="mailto:kohhranb@gmail.com" className="text-[#5A5A40] underline">kohhranb@gmail.com</a></p>
            <p><strong>Address:</strong> Bethlehem Kohhran, Bethlehem Veng, Aizawl, Mizoram - 796001, India</p>
          </div>
        </section>

      </div>
    </div>
  );
}
