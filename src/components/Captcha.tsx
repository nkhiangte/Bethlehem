import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';

export interface CaptchaRef {
  validate: (input: string) => boolean;
  refresh: () => void;
  getCode: () => string;
}

interface CaptchaProps {
  onValidated?: (isValid: boolean) => void;
  className?: string;
}

// Generate random characters omitting easily confused characters like O, 0, I, l, 1
const CAPTCHA_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';

function generateRandomCode(length = 6): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CAPTCHA_CHARS.charAt(Math.floor(Math.random() * CAPTCHA_CHARS.length));
  }
  return result;
}

export const Captcha = forwardRef<CaptchaRef, CaptchaProps>(({ className = '' }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [code, setCode] = useState<string>('');
  const [isRotating, setIsRotating] = useState(false);

  const drawCaptcha = (text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background gradient matching warm neutral / olive aesthetic
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#f9f8f5');
    bgGradient.addColorStop(0.5, '#f0efe9');
    bgGradient.addColorStop(1, '#e8e7df');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Add noise background dots
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = `rgba(${Math.floor(Math.random() * 80 + 90)}, ${Math.floor(
        Math.random() * 80 + 90
      )}, ${Math.floor(Math.random() * 60 + 60)}, ${Math.random() * 0.35 + 0.1})`;
      ctx.beginPath();
      ctx.arc(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 2 + 0.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Add noise interference lines
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 60 + 90)}, ${Math.floor(
        Math.random() * 60 + 90
      )}, ${Math.floor(Math.random() * 50 + 60)}, ${Math.random() * 0.4 + 0.2})`;
      ctx.lineWidth = Math.random() * 1.5 + 0.8;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.bezierCurveTo(
        Math.random() * width,
        Math.random() * height,
        Math.random() * width,
        Math.random() * height,
        Math.random() * width,
        Math.random() * height
      );
      ctx.stroke();
    }

    // Palette of ink colors for characters
    const charColors = [
      '#4A4A32',
      '#5A5A40',
      '#3C4A3E',
      '#5C4033',
      '#2C3E50',
      '#6B5B3E',
      '#3D3D3D',
      '#4E5D4E'
    ];

    // Draw characters with distinct rotations and offsets
    const charSpacing = (width - 24) / text.length;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      ctx.save();
      const x = 14 + i * charSpacing + (Math.random() * 4 - 2);
      const y = height / 2 + (Math.random() * 6 - 3);

      const angle = ((Math.random() - 0.5) * 35 * Math.PI) / 180;
      ctx.translate(x, y);
      ctx.rotate(angle);

      // Random font style
      const fontSize = Math.floor(Math.random() * 6 + 22);
      const fontFamilies = ['serif', 'sans-serif', 'monospace'];
      const fontFamily = fontFamilies[i % fontFamilies.length];
      const isBold = Math.random() > 0.3 ? 'bold ' : '';
      const isItalic = Math.random() > 0.5 ? 'italic ' : '';
      ctx.font = `${isItalic}${isBold}${fontSize}px ${fontFamily}`;
      ctx.fillStyle = charColors[i % charColors.length];
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      ctx.shadowBlur = 1;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  };

  const refreshCaptcha = () => {
    setIsRotating(true);
    const newCode = generateRandomCode(6);
    setCode(newCode);
    setTimeout(() => {
      drawCaptcha(newCode);
      setIsRotating(false);
    }, 150);
  };

  useEffect(() => {
    const initialCode = generateRandomCode(6);
    setCode(initialCode);
    drawCaptcha(initialCode);
  }, []);

  useImperativeHandle(ref, () => ({
    validate: (userInput: string) => {
      if (!userInput || !code) return false;
      // Case-insensitive matching for friendly usability
      return userInput.trim().toLowerCase() === code.trim().toLowerCase();
    },
    refresh: refreshCaptcha,
    getCode: () => code,
  }));

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase font-bold text-stone-500 tracking-widest flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#5A5A40]" />
          Security Verification (CAPTCHA)
        </label>
        <button
          type="button"
          onClick={refreshCaptcha}
          className="text-[10px] text-stone-500 hover:text-[#5A5A40] flex items-center gap-1 font-semibold transition py-0.5 px-1.5 rounded hover:bg-stone-100"
          title="Generate a new CAPTCHA challenge"
        >
          <RefreshCw className={`w-3 h-3 ${isRotating ? 'animate-spin' : ''}`} />
          <span>New Code</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div 
          onClick={refreshCaptcha}
          className="cursor-pointer border border-[#ecece0] rounded-xl overflow-hidden shadow-inner shrink-0 bg-[#f9f8f5] select-none group relative"
          title="Click to refresh image"
        >
          <canvas
            ref={canvasRef}
            width={180}
            height={44}
            className="block"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
            <RefreshCw className="w-4 h-4 text-stone-700/80 drop-shadow-sm" />
          </div>
        </div>
        <div className="flex-1 text-[10px] text-stone-400 leading-tight">
          Click image or refresh button if hard to read.
        </div>
      </div>
    </div>
  );
});

Captcha.displayName = 'Captcha';
