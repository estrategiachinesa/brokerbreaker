import { AlertTriangle, ShieldAlert, ExternalLink, X } from 'lucide-react';

interface WithdrawWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  brokerName: string;
}

export default function WithdrawWarningModal({
  isOpen,
  onClose,
  onConfirm,
  brokerName,
}: WithdrawWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      <div 
        id="withdraw-warning-container"
        className="relative w-full max-w-lg bg-[#0c0600] border-2 border-amber-500/40 rounded-2xl p-6 md:p-8 shadow-[0_0_40px_rgba(245,158,11,0.2)] overflow-hidden"
      >
        {/* Glowing Top Amber bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse"></div>

        {/* Decorative corner grid or elements */}
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-amber-500/50 hover:text-amber-400 transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-amber-500/10"
          title="Fechar"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center space-y-6">
          {/* Cyberpunk Alerte Icon container */}
          <div className="relative">
            <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30 animate-pulse">
              <ShieldAlert size={36} className="text-amber-500" />
            </div>
            <div className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-display font-black text-lg md:text-xl tracking-wider text-amber-500 uppercase flex items-center justify-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              ALERTA DE RETIRADA (SAQUE)
            </h3>
            <p className="font-mono text-[10px] text-amber-500/60 uppercase tracking-widest">
              PROTOCOLO DE SEGURANÇA DE TITULARIDADE
            </p>
          </div>

          {/* Warning Content */}
          <div className="w-full font-mono text-xs text-zinc-300 leading-relaxed bg-zinc-950/70 border border-amber-500/20 p-5 rounded-xl text-left space-y-4">
            <p className="text-zinc-400 font-sans text-sm border-b border-amber-500/15 pb-3">
              Antes de prosseguir para a página de retirada da <strong className="text-amber-400 font-semibold">{brokerName}</strong>, certifique-se de compreender a regra de limite de transferências de segurança do sistema:
            </p>
            
            <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-lg text-amber-200 text-sm leading-relaxed font-sans space-y-1">
              <strong className="text-amber-400 block font-semibold mb-1">Aviso Importante de Titularidade:</strong>
              <p>
                Atenção: você só pode fazer uma retirada por mês para o seu nome. Para outras retiradas adicionais, faça em nome de outros titulares (parentes ou amigos). Cada nome utilizado entra em período de espera de exatamente 1 mês antes de poder voltar a realizar novas retiradas na plataforma.
              </p>
            </div>

            <p className="text-[10px] text-zinc-500 text-center uppercase tracking-wider pt-2">
              CONEXÃO ATIVA COM O GATEWAY DE SAQUE DA {brokerName.toUpperCase()}
            </p>
          </div>

          {/* Confirmation button and action */}
          <div className="w-full pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 font-mono text-xs uppercase rounded-xl transition-all cursor-pointer active:scale-95"
            >
              Cancelar
            </button>
            <button
              id="confirm-withdraw-warning-btn"
              onClick={onConfirm}
              className="flex-2 py-3 px-6 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-display font-black text-xs uppercase rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Entendi e Fazer Retirada</span>
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
