import React from 'react';
import { Phone, MessageCircle } from 'lucide-react';

interface PhoneLinkProps {
  phone: string;
  className?: string;
  showIcon?: boolean;
}

export function getPhoneCallUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function getWhatsAppUrl(phone: string): string {
  let cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = `91${cleaned.substring(1)}`;
  }
  return `https://wa.me/${cleaned}`;
}

export const PhoneLink: React.FC<PhoneLinkProps> = ({ phone, className = '', showIcon = true }) => {
  if (!phone || !phone.trim()) {
    return <span className="text-stone-400 italic">Nil</span>;
  }

  const trimmedPhone = phone.trim();

  return (
    <div className={`inline-flex items-center gap-1.5 font-sans ${className}`} onClick={(e) => e.stopPropagation()}>
      {showIcon && <Phone className="w-3.5 h-3.5 text-[#5A5A40] shrink-0" />}
      <span className="font-medium text-[#2d2d2a] tracking-wide">{trimmedPhone}</span>
      <div className="flex items-center gap-0.5 ml-1">
        <a
          href={getPhoneCallUrl(trimmedPhone)}
          className="p-1 hover:text-[#5A5A40] text-stone-400 hover:bg-stone-100 rounded-lg transition-colors"
          title={`Call ${trimmedPhone}`}
        >
          <Phone className="w-3 h-3" />
        </a>
        <a
          href={getWhatsAppUrl(trimmedPhone)}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 hover:text-green-600 text-stone-400 hover:bg-green-50 rounded-lg transition-colors"
          title={`WhatsApp ${trimmedPhone}`}
        >
          <MessageCircle className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};
