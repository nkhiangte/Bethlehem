import React from 'react';
import { ShieldAlert, ShieldCheck, Mail, MapPin, AlertTriangle, FileCheck, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ShareButton } from '../components/ShareButton';

export default function ChildSafetyStandards() {
  const lastUpdated = "September 1, 2026";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-10 border border-[#e0e0d5] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 text-[#5A5A40] mb-3">
              <ShieldAlert className="w-6 h-6 text-red-600" />
              <span className="text-xs uppercase font-bold tracking-widest font-sans text-stone-600">
                Google Play Child Safety Standards Compliance
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-[#2d2d2a] mb-2">
              Child Safety Standards & CSAM / CSAE Prevention Policy
            </h1>
            <p className="text-xs text-stone-500 font-sans">
              Application & Developer: <strong>Bethlehem Kohhran</strong> | Effective Date: <strong>{lastUpdated}</strong>
            </p>
          </div>
          <ShareButton
            title="Child Safety Standards - Bethlehem Kohhran"
            summary="Child Safety Standards and CSAM / CSAE Prevention Policy for Bethlehem Kohhran."
            url="/child-safety-standards"
            variant="button"
            buttonText="Share"
            className="shrink-0"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl p-6 sm:p-10 border border-[#e0e0d5] shadow-sm space-y-8 font-sans text-sm text-[#2d2d2a] leading-relaxed">
        
        {/* Section 1: Zero Tolerance Statement */}
        <section className="space-y-3">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-red-800 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              Strict Zero-Tolerance Policy
            </div>
            <p className="text-xs leading-normal">
              <strong>Bethlehem Kohhran</strong> strictly and unequivocally prohibits <strong>Child Sexual Abuse Material (CSAM)</strong> and <strong>Child Sexual Abuse and Exploitation (CSAE)</strong> across all platforms, features, user-generated content, member interactions, and communications.
            </p>
          </div>

          <h2 className="text-lg font-serif italic text-[#5A5A40] border-b border-[#ecece0] pb-2 pt-2">
            1. Purpose and Scope
          </h2>
          <p>
            This Child Safety Standards document outlines the standards, measures, and procedures implemented by <strong>Bethlehem Kohhran</strong> (Developer & App: Bethlehem Kohhran) to protect children and minors from any form of sexual abuse, exploitation, grooming, harm, or endangerment.
          </p>
          <p>
            These standards apply to all users, registered members, administrators, and contributors using the Bethlehem Kohhran application and web portal.
          </p>
        </section>

        {/* Section 2: Prohibited Conduct */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif italic text-[#5A5A40] border-b border-[#ecece0] pb-2">
            2. Explicitly Prohibited Conduct & Content
          </h2>
          <p>The following activities and materials are strictly banned on our platform without exception:</p>
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li>
              <strong>Child Sexual Abuse Material (CSAM):</strong> Generating, uploading, sharing, storing, transmitting, or linking to any visual, audio, or textual depiction of sexual abuse or exploitation involving minors.
            </li>
            <li>
              <strong>Child Sexual Exploitation and Abuse (CSAE):</strong> Any solicitation of minors for sexual purposes, online grooming, commercial sexual exploitation, sexual extortion, or distribution of sexually explicit content involving a child.
            </li>
            <li>
              <strong>Child Endangerment & Harm:</strong> Any content promoting child labor, physical abuse, psychological harm, trafficking, or endangerment of minors.
            </li>
            <li>
              <strong>Inappropriate Communication with Minors:</strong> Unsolicited private messaging, predatory behavior, or inappropriate interactions with individuals under 18 years of age.
            </li>
          </ul>
        </section>

        {/* Section 3: Prevention & Moderation */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif italic text-[#5A5A40] border-b border-[#ecece0] pb-2">
            3. Prevention, Monitoring & Content Moderation
          </h2>
          <p>To uphold child safety and prevent abuse, Bethlehem Kohhran enforces multiple layers of safeguards:</p>
          <ul className="list-disc pl-5 space-y-2 text-stone-700">
            <li>
              <strong>Administrative Access Control:</strong> Only vetted church administrators and verified church officials have permissions to publish official media, youth programs, and community updates.
            </li>
            <li>
              <strong>Content Review:</strong> Any images or records uploaded to church archives, galleries, or directory profiles undergo manual review by authorized church administrators.
            </li>
            <li>
              <strong>Automated Input Filtering:</strong> Registration forms feature CAPTCHA security verification to block automated spam bots and malicious bad actors.
            </li>
            <li>
              <strong>Prompt Removal:</strong> Any suspected or flagged violating content is immediately quarantined and permanently removed within 24 hours of identification.
            </li>
          </ul>
        </section>

        {/* Section 4: Reporting & Law Enforcement Coordination */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif italic text-[#5A5A40] border-b border-[#ecece0] pb-2">
            4. Reporting Mechanism & Enforcement Actions
          </h2>
          <p>
            We take immediate and decisive action upon receiving any report or finding any evidence of child safety violations:
          </p>
          <div className="space-y-3">
            <div className="p-3.5 bg-[#fcfaf7] border border-[#ecece0] rounded-xl">
              <p className="font-semibold text-stone-800 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-[#5A5A40]" /> Immediate Response Protocol:
              </p>
              <ol className="list-decimal pl-5 space-y-1 text-xs text-stone-600">
                <li>Immediate removal and permanent deletion of the offensive content.</li>
                <li>Instant, irreversible banning and termination of the responsible user account.</li>
                <li>Preservation of forensic log records strictly for legal reporting.</li>
                <li>Mandatory escalation to law enforcement authorities and reporting to relevant child protection bodies (including National Center for Missing & Exploited Children - NCMEC and local cyber crime divisions).</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Section 5: Child Safety Point of Contact */}
        <section className="space-y-3">
          <h2 className="text-lg font-serif italic text-[#5A5A40] border-b border-[#ecece0] pb-2">
            5. Dedicated Child Safety Point of Contact
          </h2>
          <p>
            In compliance with Google Play Child Safety Standards, <strong>Bethlehem Kohhran</strong> has designated a dedicated Child Safety point of contact prepared to address child protection matters, receive abuse reports, and collaborate with authorities and regulatory bodies.
          </p>

          <div className="p-5 bg-[#fbfaf8] border border-[#d8d8ce] rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-[#5A5A40] font-bold text-sm uppercase tracking-wider">
              <ShieldCheck className="w-5 h-5 text-[#5A5A40]" />
              Official Child Safety Contact Information
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-stone-500 font-bold uppercase tracking-widest text-[10px]">App / Organization Name</span>
                <p className="font-semibold text-stone-800">Bethlehem Kohhran (Presbyterian Church)</p>
              </div>

              <div className="space-y-1">
                <span className="text-stone-500 font-bold uppercase tracking-widest text-[10px]">Dedicated Child Safety Email</span>
                <p>
                  <a href="mailto:kohhranb@gmail.com" className="font-bold text-[#5A5A40] hover:underline text-sm">
                    kohhranb@gmail.com
                  </a>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-stone-500 font-bold uppercase tracking-widest text-[10px]">Physical Address</span>
                <p className="text-stone-700">
                  Bethlehem Kohhran, Bethlehem Veng, Aizawl, Mizoram - 796001, India
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-stone-500 font-bold uppercase tracking-widest text-[10px]">Response Time</span>
                <p className="text-stone-700 font-medium">Within 24 hours of notification</p>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-stone-500 border-t border-[#ecece0]">
              To submit an urgent child safety or CSAM concern, please email <a href="mailto:kohhranb@gmail.com" className="text-[#5A5A40] underline font-bold">kohhranb@gmail.com</a> with the subject line <strong>&quot;URGENT: Child Safety Report&quot;</strong>.
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
