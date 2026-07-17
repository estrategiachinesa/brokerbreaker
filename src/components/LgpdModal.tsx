import { useState } from 'react';
import { Shield, X, Trash2, CheckCircle } from 'lucide-react';
import { HudButton } from './ui/hud-button';

interface LgpdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearData: () => void;
}

export default function LgpdModal({ isOpen, onClose, onClearData }: LgpdModalProps) {
  const [erasureStatus, setErasureStatus] = useState<'idle' | 'confirming' | 'done'>('idle');

  if (!isOpen) return null;

  const handleErasure = () => {
    setErasureStatus('done');
    setTimeout(() => {
      onClearData();
      setErasureStatus('idle');
      onClose();
    }, 2000);
  };

  return (
    <div 
      id="lgpd-modal-container"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-y-auto"
    >
      <div className="bg-[#050c08] border border-emerald-950/80 rounded-2xl w-full max-w-lg p-6 relative overflow-hidden shadow-2xl">
        {/* Glowing sub-border */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-950"></div>

        {/* Close Button */}
        <button 
          id="btn-close-lgpd"
          onClick={onClose} 
          className="absolute top-4 right-4 text-zinc-700 hover:text-zinc-500 cursor-pointer transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-4 border-b border-emerald-950/60 pb-3">
          <Shield size={18} className="text-emerald-700" />
          <h3 className="text-xs font-display font-black text-emerald-600 uppercase tracking-widest font-mono">
            PRIVACY & SECURITY STATEMENT (LGPD / GDPR COMPLIANCE)
          </h3>
        </div>

        {erasureStatus === 'done' ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-950/30 border border-red-500/30 flex items-center justify-center text-red-500 animate-pulse">
              <Trash2 size={24} />
            </div>
            <h4 className="text-sm font-mono font-bold text-red-500 uppercase tracking-wider">
              CONSENT REVOKED & DATA PURGED
            </h4>
            <p className="text-[10px] font-mono text-zinc-500 max-w-xs leading-relaxed">
              All identifiers, active session cookies, bypass transaction logs, and locally persisted state structures have been permanently purged from our sandbox records.
            </p>
            <div className="flex items-center gap-1.5 text-[9px] text-zinc-600 font-mono">
              <CheckCircle size={12} className="text-emerald-600" />
              <span>DATA PURGED SUCCESSFULLY</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="font-mono text-[10px] text-zinc-400 leading-relaxed space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-emerald-950">
              <p>
                This gateway operates in strict compliance with the <strong>Brazilian General Personal Data Protection Law (LGPD - Law No. 13.709/2018)</strong> and conforms to global <strong>GDPR guidelines</strong>, ensuring absolute transparency, data minimisation, and data subject sovereignty.
              </p>

              <div>
                <h4 className="font-bold text-emerald-700 uppercase mb-1">1. Data Controller & Collection Scope</h4>
                <p>
                  The only data elements processed throughout your session are your <strong>Broker Account ID</strong> and <strong>Selected Platform</strong>. This information is processed locally and mapped to our encrypted Firestore database to establish the secure bypass emulation.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-emerald-700 uppercase mb-1">2. Purpose of Data Processing</h4>
                <p>
                  Your ID is processed solely to validate credentials against authorized access lists, establish websocket connections, and simulate sandbox wallet allocations. No real passwords, trade assets, or account credentials are requested, stored, or transmitted.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-emerald-700 uppercase mb-1">3. Legal Ground (User Consent)</h4>
                <p>
                  In compliance with <strong>Article 7, Section I of the LGPD</strong>, all processing activities are based on your explicit, informed, and unequivocal consent, provided when agreeing to these terms before activating the gateway.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-emerald-700 uppercase mb-1">4. Rights of the Data Subject</h4>
                <p>
                  You retain complete, unimpeded sovereignty over your data at any moment:
                  <br />- Confirm processing existence and audit session logs.
                  <br />- Access and extract currently stored local records.
                  <br />- Request immediate data correction or update.
                  <br />- Revoke your consent and execute the <strong>Right to be Forgotten</strong> (instant local/remote database purge).
                </p>
              </div>

              <div>
                <h4 className="font-bold text-emerald-700 uppercase mb-1">5. Security, Transit & Encryption</h4>
                <p>
                  All database handshakes and locally cached states are secured using symmetric AES-256 encryption. Network transit is safeguarded under strict HTTPS and TLS 1.3 protocol standards to prevent unauthorized access or intercept leaks.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-emerald-700 uppercase mb-1">6. Investment Disclaimer & User Responsibility</h4>
                <p>
                  This system is designed exclusively as an entertainment simulation sandbox showing potential exploits or automated bypass behaviors. Under no circumstances does this constitute financial advice, investment recommendations, or an endorsement of any binary options, forex, or trading activities. <strong>You bear absolute and sole responsibility for your actions, trades, decisions, and any real-world financial consequences thereof.</strong> Trading involves extreme risk of capital loss.
                </p>
              </div>
            </div>

            {/* Consent Revocation action block */}
            <div className="border-t border-emerald-950/40 pt-4">
              {erasureStatus === 'confirming' ? (
                <div className="bg-red-950/10 border border-red-900/30 rounded-xl p-3 text-center space-y-3">
                  <p className="text-[10px] font-mono text-red-400">
                    <strong>Are you absolutely sure?</strong> This will erase your ID, reset your simulated wallet balance, and revoke your consent credentials immediately.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleErasure}
                      className="flex-1 py-1.5 bg-red-900/40 hover:bg-red-800 text-red-200 border border-red-500/30 text-[10px] font-mono font-bold uppercase rounded-lg cursor-pointer transition-colors"
                    >
                      Yes, Purge All Data
                    </button>
                    <button
                      onClick={() => setErasureStatus('idle')}
                      className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-[10px] font-mono font-bold uppercase rounded-lg cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-950/10 border border-emerald-950/50 rounded-xl p-3">
                  <div className="text-left font-mono">
                    <div className="text-[9px] text-zinc-500 uppercase">Manage Privacy Consent</div>
                    <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Right to be Forgotten</div>
                  </div>
                  <button
                    onClick={() => setErasureStatus('confirming')}
                    className="flex items-center gap-1.5 py-2 px-3 border border-red-950/40 hover:bg-red-950/10 hover:border-red-500/20 text-red-700 hover:text-red-500 text-[9px] font-mono font-bold uppercase rounded-lg cursor-pointer transition-all"
                  >
                    <Trash2 size={12} />
                    <span>Erase My Data</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <div className="w-24 h-9">
                <HudButton
                  style="style2"
                  variant="primary"
                  onClick={onClose}
                >
                  CLOSE
                </HudButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
