import React, { useState } from 'react';
import { 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  Facebook, 
  Twitter, 
  Mail, 
  Link2, 
  X, 
  Send 
} from 'lucide-react';
import { useBackButton } from '../hooks/useBackButton';

export interface ShareButtonProps {
  title: string;
  summary?: string;
  url?: string;
  variant?: 'button' | 'icon' | 'pill' | 'subtle';
  size?: 'sm' | 'md';
  buttonText?: string;
  className?: string;
  showCount?: boolean;
}

export function ShareButton({
  title,
  summary,
  url,
  variant = 'button',
  size = 'md',
  buttonText = 'Share',
  className = '',
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useBackButton(isOpen, () => setIsOpen(false));

  // Determine the full share URL
  const getShareUrl = () => {
    if (!url) {
      return typeof window !== 'undefined' ? window.location.href : '';
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const shareUrl = getShareUrl();

  // Create clean plain text from summary if it has HTML
  const cleanSummary = summary ? summary.replace(/<[^>]*>?/gm, '').trim().slice(0, 160) : '';

  const handleCopyLink = async () => {
    let success = false;
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        success = true;
      } catch (e) {
        success = false;
      }
    }

    if (!success && typeof document !== 'undefined') {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (err) {
        success = false;
      }
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: cleanSummary ? `${title} - ${cleanSummary}` : title,
          url: shareUrl,
        });
      } catch (err: any) {
        // User aborted or error
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    }
  };

  // Pre-formatted social share links
  const whatsappText = `${title ? `*${title}*\n` : ''}${cleanSummary ? `${cleanSummary}...\n\n` : '\n'}Chhiar chhunzawmna: ${shareUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;
  const emailSubject = encodeURIComponent(title || 'Bethlehem Kohhran Article');
  const emailBody = encodeURIComponent(`${title}\n\n${cleanSummary ? `${cleanSummary}\n\n` : ''}Read here: ${shareUrl}`);
  const mailtoUrl = `mailto:?subject=${emailSubject}&body=${emailBody}`;

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  // Render button trigger based on variant
  const renderTrigger = () => {
    if (variant === 'icon') {
      return (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`p-2 text-stone-500 hover:text-[#5A5A40] hover:bg-stone-100 rounded-full transition-colors flex items-center justify-center ${className}`}
          title="Share Article"
          aria-label="Share Article"
        >
          <Share2 className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </button>
      );
    }

    if (variant === 'pill') {
      return (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs uppercase font-bold tracking-wider text-stone-600 hover:text-[#5A5A40] bg-stone-100 hover:bg-stone-200/80 transition-colors font-sans ${className}`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{buttonText}</span>
        </button>
      );
    }

    if (variant === 'subtle') {
      return (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-[#5A5A40] transition-colors font-sans uppercase font-bold tracking-wider ${className}`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{buttonText}</span>
        </button>
      );
    }

    // Default 'button' variant
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 bg-white border border-[#ecece0] text-stone-700 hover:text-[#5A5A40] hover:border-[#5A5A40]/30 hover:bg-stone-50/80 px-3.5 py-2 rounded-xl text-xs uppercase font-bold tracking-wider transition shadow-2xs font-sans ${className}`}
      >
        <Share2 className="w-3.5 h-3.5 text-[#5A5A40]" />
        <span>{buttonText}</span>
      </button>
    );
  };

  return (
    <>
      {renderTrigger()}

      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-[#ecece0] flex items-center justify-between bg-[#fcfaf7]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40]">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-semibold text-[#2d2d2a] leading-tight">
                    Share Article
                  </h3>
                  <p className="text-[10px] text-stone-400 uppercase font-bold tracking-widest mt-0.5">
                    Bethlehem Kohhran
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Article Preview Card */}
            <div className="p-5 border-b border-[#ecece0] bg-stone-50/50">
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#5A5A40] block mb-1">
                Selected Article
              </span>
              <h4 className="text-sm font-serif font-medium text-stone-800 line-clamp-2 leading-snug">
                {title}
              </h4>
              {cleanSummary && (
                <p className="text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">
                  {cleanSummary}
                </p>
              )}
            </div>

            {/* Share Destinations Grid */}
            <div className="p-5 space-y-4">
              <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block">
                Share To Social Media & Apps
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* WhatsApp */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-800 transition group text-center"
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold">WhatsApp</span>
                </a>

                {/* Facebook */}
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-3 rounded-2xl border border-blue-100 bg-blue-50/60 hover:bg-blue-100/70 text-blue-800 transition group text-center"
                >
                  <div className="w-9 h-9 rounded-full bg-[#1877F2] text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
                    <Facebook className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold">Facebook</span>
                </a>

                {/* X / Twitter */}
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-3 rounded-2xl border border-stone-200 bg-stone-100/80 hover:bg-stone-200 text-stone-800 transition group text-center"
                >
                  <div className="w-9 h-9 rounded-full bg-stone-900 text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
                    <Twitter className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold">X (Twitter)</span>
                </a>

                {/* Email */}
                <a
                  href={mailtoUrl}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl border border-amber-100 bg-amber-50/60 hover:bg-amber-100/70 text-amber-800 transition group text-center"
                >
                  <div className="w-9 h-9 rounded-full bg-[#5A5A40] text-white flex items-center justify-center mb-1.5 shadow-xs group-hover:scale-105 transition-transform">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold">Email</span>
                </a>
              </div>

              {/* Native System Share if supported */}
              {hasNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[#ecece0] bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold uppercase tracking-wider transition shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5 text-[#5A5A40]" />
                  <span>More Apps (Device Share)</span>
                </button>
              )}

              {/* Copy Link Section */}
              <div className="pt-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block mb-1.5">
                  Shareable Link
                </span>
                <div className="flex items-center gap-2 bg-[#fcfaf7] border border-[#ecece0] rounded-xl p-1.5 pl-3">
                  <Link2 className="w-4 h-4 text-stone-400 shrink-0" />
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="w-full bg-transparent text-xs text-stone-700 outline-none select-all truncate font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition shrink-0 ${
                      copied 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-[#5A5A40] hover:bg-[#4a4a35] text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#fcfaf7] border-t border-[#ecece0] flex items-center justify-between">
              <span className="text-[11px] text-stone-400 italic">
                Share with church members & family
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-stone-500 hover:text-stone-800 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg hover:bg-stone-100 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
