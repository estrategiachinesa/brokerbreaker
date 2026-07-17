import { useState, useEffect } from 'react';
import { ShieldAlert, Check } from 'lucide-react';

interface LgpdBannerProps {
  onAccept: () => void;
}

export default function LgpdBanner({ onAccept }: LgpdBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if the user has already consented
    const consent = localStorage.getItem('lgpd-consent-v2');
    if (!consent) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, 1500); // Small delay to look natural
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    localStorage.setItem('lgpd-consent-v2', 'true');
    setVisible(false);
    onAccept();
  };

  return (
    <div 
      id="lgpd-consent-banner"
      className="fixed bottom-12 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-xs z-40 animate-fade-in"
    >
      <div className="bg-[#020503] border border-emerald-950/60 p-3 rounded-xl flex flex-col gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
        <div className="flex items-start gap-2">
          <ShieldAlert size={12} className="text-emerald-950 mt-0.5 shrink-0" />
          <p className="text-[9px] font-mono text-zinc-600 leading-relaxed">
            We use localized session cookies and process account identifiers to ensure compliance with privacy guidelines (LGPD / GDPR). By proceeding, you agree to our policies.
          </p>
        </div>
        <div className="flex justify-end gap-1.5 border-t border-emerald-950/20 pt-1.5">
          <button
            onClick={() => setVisible(false)}
            className="px-2 py-1 text-[8px] font-mono text-zinc-700 hover:text-zinc-500 uppercase cursor-pointer"
          >
            Learn More
          </button>
          <button
            onClick={handleAccept}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950/10 hover:bg-emerald-950/30 text-emerald-800 hover:text-emerald-600 border border-emerald-950 text-[8px] font-mono font-bold uppercase rounded-md cursor-pointer transition-colors"
          >
            <Check size={8} />
            <span>Accept & Continue</span>
          </button>
        </div>
      </div>
    </div>
  );
}
