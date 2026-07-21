import { ShieldAlert, ExternalLink, ArrowRight, CheckCircle, Users } from 'lucide-react';

interface AccountWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  botLink: string;
}

export default function AccountWarningModal({
  isOpen,
  onClose,
  botLink,
}: AccountWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fade-in">
      {/* Laser line background scan or subtle radial background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08)_0%,transparent_70%)] pointer-events-none"></div>
      
      {/* Subtle digital grid */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,0)_50%,rgba(0,0,0,0.4)_50%,rgba(0,0,0,0.4))] bg-[length:100%_4px] opacity-30"></div>

      <div 
        id="account-warning-container"
        className="relative w-full max-w-lg bg-[#040906] border-2 border-emerald-500/40 rounded-3xl p-6 md:p-8 shadow-[0_0_60px_rgba(16,185,129,0.25)] overflow-hidden transition-all duration-300"
      >
        {/* Pulsing emerald bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse"></div>

        <div className="flex flex-col items-center text-center space-y-6 relative z-10">
          
          {/* Cyberpunk warning shield */}
          <div className="relative">
            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 animate-pulse flex items-center justify-center">
              <ShieldAlert size={38} className="text-emerald-400" />
            </div>
            {/* Glowing dots */}
            <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-black animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Ação Necessária • Bypass de Servidor
            </div>
            
            <h3 className="font-display font-black text-xl md:text-2xl tracking-wider text-emerald-400 uppercase leading-snug">
              AVISO DE PROTOCOLO!
            </h3>
            <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
              Sincronização de ID requerida para injeção de script
            </p>
          </div>

          {/* Main notification block */}
          <div className="w-full bg-black/60 border border-emerald-500/15 rounded-2xl p-4 md:p-5 text-left space-y-4">
            <p className="font-sans text-[12px] md:text-[13px] text-emerald-200/90 leading-relaxed font-medium">
              ⚠️ <strong className="text-white">IMPORTANTE:</strong> Para que o algoritmo <strong className="text-emerald-400">Broker Breaker</strong> funcione com sucesso e mapeie os bugs em tempo real, é <strong className="text-emerald-400 underline decoration-emerald-500/40">obrigatório</strong> criar a sua conta da corretora através do nosso robô oficial de cadastro.
            </p>

            {/* Checklist items to make the idea highly professional & premium */}
            <div className="space-y-2.5 border-t border-emerald-500/10 pt-3.5">
              <div className="flex items-start gap-2.5">
                <CheckCircle size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-[11px] font-mono text-zinc-200 font-bold uppercase tracking-wide">Registro Vinculado</h4>
                  <p className="text-[10px] text-zinc-400 leading-snug">Vincula seu ID de usuário à chave da API de bypass, evitando filtragem de segurança ou erros de IP.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-[11px] font-mono text-zinc-200 font-bold uppercase tracking-wide">Proteção Anti-Ban</h4>
                  <p className="text-[10px] text-zinc-400 leading-snug">O bot cria uma conta calibrada que simula transações de volume normal para as corretoras.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="w-full space-y-3 pt-2">
            <button
              onClick={() => {
                window.open(botLink, '_blank');
              }}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-display font-black text-xs md:text-sm uppercase rounded-xl transition-all duration-300 cursor-pointer shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.45)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group"
            >
              <Users size={16} className="text-white group-hover:scale-110 transition-transform" />
              CRIAR CONTA
              <ExternalLink size={14} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-6 bg-transparent hover:bg-emerald-500/5 text-zinc-400 hover:text-emerald-400 font-mono text-[10px] tracking-widest uppercase rounded-xl border border-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
            >
              JÁ TENHO CONTA ATIVADA
              <ArrowRight size={12} className="opacity-50" />
            </button>
          </div>

          {/* Security stamp footer detail */}
          <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest">
            SISTEMA DE SEGURANÇA CRIPTOGRÁFICA END-TO-END • BROKER BREAKER v2.0
          </span>
        </div>
      </div>
    </div>
  );
}
