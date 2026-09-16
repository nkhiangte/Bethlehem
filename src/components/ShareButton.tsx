import React, { useState, useEffect } from 'react';
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
  Send,
  FileText
} from 'lucide-react';
import { useBackButton } from '../hooks/useBackButton';

export interface ShareButtonProps {
  title: string;
  summary?: string;
  content?: string;
  imageUrl?: string;
  url?: string;
  variant?: 'button' | 'icon' | 'pill' | 'subtle';
  size?: 'sm' | 'md';
  buttonText?: string;
  className?: string;
  showCount?: boolean;
}

/**
 * Extracts embedded image from HTML/markdown or uses explicit imageUrl,
 * falling back to `/logo.png`
 */
export function extractThumbnail(content?: string, imageUrl?: string): { url: string; isEmbeddedOrCustom: boolean } {
  if (imageUrl && imageUrl.trim()) {
    return { url: imageUrl.trim(), isEmbeddedOrCustom: true };
  }
  if (content) {
    // 1. Check HTML <img> tag with src
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      return { url: imgMatch[1], isEmbeddedOrCustom: true };
    }
    // 2. Check Markdown ![alt](url)
    const mdMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s\)]+|\/[^\s\)]+)\)/i);
    if (mdMatch && mdMatch[1]) {
      return { url: mdMatch[1], isEmbeddedOrCustom: true };
    }
  }
  return { url: '/logo.png', isEmbeddedOrCustom: false };
}

/**
 * Extracts at least two complete sentences from rich text or markdown.
 */
export function extractSentences(content: string = '', minSentences: number = 2): {
  sentences: string;
  hasMore: boolean;
} {
  if (!content) return { sentences: '', hasMore: false };

  // Convert HTML linebreaks, paragraphs, headings, etc. into natural sentence-ending periods
  const text = content
    .replace(/([.!?…])\s*<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, '$1 ')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, '. ')
    .replace(/<(br|hr)\s*\/?>/gi, '. ')
    .replace(/<[^>]+>/g, ' ')
    // HTML entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    // Deduplicate punctuation e.g. !. or .. or ?..
    .replace(/([.!?…])(?:\s*[.!?…])+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return { sentences: '', hasMore: false };

  // Match sentences ending in punctuation (. ! ? …) followed by space/end of string, or end of string
  const sentenceRegex = /([^.!?…]+[.!?…]+)(?:\s+|$)|([^.!?…]+$)/g;
  const matches: string[] = [];
  let m;
  while ((m = sentenceRegex.exec(text)) !== null) {
    const s = (m[1] || m[2] || '').trim();
    if (s.length > 0) {
      matches.push(s);
    }
  }

  if (matches.length === 0) {
    const fallback = text.slice(0, 200).trim();
    return { sentences: fallback, hasMore: text.length > fallback.length };
  }

  // Take at least minSentences (2)
  const count = Math.min(matches.length, Math.max(minSentences, 2));
  let chosen = matches.slice(0, count);

  // If the 2 sentences are unusually brief (< 65 chars total) and there is a 3rd sentence available, include it
  const totalLength = chosen.reduce((acc, curr) => acc + curr.length, 0);
  if (totalLength < 65 && matches.length > count) {
    chosen.push(matches[count]);
  }

  const resultSentences = chosen.join(' ').trim();
  const hasMore = text.length > resultSentences.length + 5;

  return {
    sentences: resultSentences,
    hasMore,
  };
}

export function ShareButton({
  title,
  summary,
  content,
  imageUrl,
  url,
  variant = 'button',
  size = 'md',
  buttonText = 'Share',
  className = '',
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Determine effective content
  const effectiveContent = content || summary || '';

  // Extract thumbnail and sentences
  const initialThumb = extractThumbnail(effectiveContent, imageUrl);
  const [thumbnailUrl, setThumbnailUrl] = useState(initialThumb.url);
  const [isDefaultLogo, setIsDefaultLogo] = useState(!initialThumb.isEmbeddedOrCustom);

  // Update thumbnail if props change
  useEffect(() => {
    const extracted = extractThumbnail(effectiveContent, imageUrl);
    setThumbnailUrl(extracted.url);
    setIsDefaultLogo(!extracted.isEmbeddedOrCustom);
  }, [effectiveContent, imageUrl]);

  useBackButton(isOpen, () => setIsOpen(false));

  // Determine full share URL
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

  // Extract at least two sentences
  const { sentences, hasMore } = extractSentences(effectiveContent, 2);
  const snippet = sentences ? (hasMore ? `${sentences}...` : sentences) : '';

  // Formatted share message:
  // "Also share atleast two sentences of the article and then read more and show link"
  const shareMessage = `${title ? `*${title}*\n\n` : ''}${snippet ? `${snippet}\n\n` : ''}Read more: ${shareUrl}`;

  // Copy URL only
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
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Copy Full Share Text (Title + 2 Sentences + Read More link)
  const handleCopyFullText = async () => {
    let success = false;
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareMessage);
        success = true;
      } catch (e) {
        success = false;
      }
    }

    if (!success && typeof document !== 'undefined') {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = shareMessage;
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
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    }
  };

  // Native mobile/device share
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${snippet ? `${snippet}\n\n` : ''}Read more: ${shareUrl}`,
          url: shareUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    }
  };

  // Social share URLs
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareMessage)}`;
  
  // Twitter limit 280 chars
  const tweetSnippet = snippet.length > 150 ? `${snippet.slice(0, 147)}...` : snippet;
  const tweetText = `${title ? `${title}\n\n` : ''}${tweetSnippet ? `${tweetSnippet}\n\n` : ''}Read more:`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;

  const emailSubject = encodeURIComponent(title || 'Bethlehem Kohhran Article');
  const emailBody = encodeURIComponent(
    `${title ? `${title}\n\n` : ''}${snippet ? `${snippet}\n\n` : ''}Read more: ${shareUrl}`
  );
  const mailtoUrl = `mailto:?subject=${emailSubject}&body=${emailBody}`;

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  // Render trigger button based on variant
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
            <div className="p-4 sm:p-5 border-b border-[#ecece0] flex items-center justify-between bg-[#fcfaf7]">
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

            {/* Article Preview Card with Thumbnail */}
            <div className="p-4 sm:p-5 border-b border-[#ecece0] bg-stone-50/50">
              <div className="flex gap-3.5 sm:gap-4 items-start">
                {/* Thumbnail Image: embedded image if present, otherwise logo */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-white border border-[#ecece0] shrink-0 flex items-center justify-center p-1 shadow-2xs">
                  <img
                    src={thumbnailUrl}
                    alt={title || 'Bethlehem Kohhran'}
                    className={`w-full h-full rounded-xl transition-all duration-300 ${
                      isDefaultLogo ? 'object-contain p-1' : 'object-cover'
                    }`}
                    referrerPolicy="no-referrer"
                    onError={() => {
                      if (thumbnailUrl !== '/logo.png') {
                        setThumbnailUrl('/logo.png');
                        setIsDefaultLogo(true);
                      }
                    }}
                  />
                </div>

                {/* Text excerpt preview */}
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[#5A5A40] block mb-0.5">
                    {isDefaultLogo ? 'Bethlehem Kohhran' : 'Article Thumbnail'}
                  </span>
                  <h4 className="text-sm font-serif font-semibold text-stone-900 line-clamp-2 leading-snug">
                    {title}
                  </h4>
                  {snippet && (
                    <p className="text-xs text-stone-600 line-clamp-2 mt-1 leading-relaxed font-sans">
                      {snippet}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-[#5A5A40]">
                    <span>Read more:</span>
                    <span className="text-stone-400 font-mono text-[10px] truncate max-w-[120px] sm:max-w-[180px]">
                      {shareUrl}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Share Destinations Grid */}
            <div className="p-4 sm:p-5 space-y-4">
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

              {/* Copy Links / Message Section */}
              <div className="pt-2 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 block">
                    Copy To Clipboard
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyFullText}
                    className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition px-2 py-1 rounded-md ${
                      copiedText 
                        ? 'text-emerald-700 bg-emerald-50' 
                        : 'text-[#5A5A40] hover:bg-[#5A5A40]/10'
                    }`}
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Text & Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-3 h-3" />
                        <span>Copy Text & Link</span>
                      </>
                    )}
                  </button>
                </div>

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
                      copiedLink 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-[#5A5A40] hover:bg-[#4a4a35] text-white'
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#fcfaf7] border-t border-[#ecece0] flex items-center justify-between">
              <span className="text-[11px] text-stone-400 italic">
                Bethlehem Kohhran News & Updates
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
