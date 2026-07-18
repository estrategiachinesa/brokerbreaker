/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, 
  RefreshCw, 
  ShieldCheck, 
  Globe, 
  UserCheck,
  Eye,
  EyeOff,
  Lock,
  ArrowDown,
  ArrowUp,
  Coins,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clipboard
} from 'lucide-react';
import { getDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './lib/firebase';
import MatrixBackground from './components/MatrixBackground';
import HackerOverlay from './components/HackerOverlay';
import WithdrawModal from './components/WithdrawModal';
import WithdrawWarningModal from './components/WithdrawWarningModal';
import AdminPanelModal from './components/AdminPanelModal';
import TypewriterText from './components/TypewriterText';
import LgpdModal from './components/LgpdModal';
import LgpdBanner from './components/LgpdBanner';
import QuadcodeOauthModal from './components/QuadcodeOauthModal';
import { BrokerType, AppState } from './types';
import { HudButton } from './components/ui/hud-button';
import { HyperText } from './components/ui/hyper-text';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  // Application State - Persistent via localStorage
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('broker_breaker_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.depositAmount !== 'number' || parsed.depositAmount > 1000 || parsed.depositAmount < 100) {
          parsed.depositAmount = 100;
        }
        // Force certain runtime animation-only flags to false on load
        return {
          depositAmount: 100,
          ...parsed,
          isInjecting: false,
          showPixModal: false,
        };
      }
    } catch (e) {
      console.error("Error reading from localStorage:", e);
    }
    return {
      currentStep: 1,
      broker: null,
      userId: '',
      isUserIdVerified: false,
      depositStatus: 'idle',
      depositAmount: 100,
      balance: 0,
      isInjecting: false,
      injectionProgress: 0,
      exploitLogs: [],
      showPixModal: false,
      pixKey: '',
      pixType: 'cpf',
      pixStatus: 'idle',
    };
  });

  // Verification Logs for Step 2
  const [verificationLogs, setVerificationLogs] = useState<string[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState(false);
  const [exploitError, setExploitError] = useState<string | null>(null);
  const [showUserId, setShowUserId] = useState(false);
  const [withdrawClicked, setWithdrawClicked] = useState(false);
  const [showWithdrawWarningModal, setShowWithdrawWarningModal] = useState<boolean>(false);

  // Admin panel trigger
  const [logoClicks, setLogoClicks] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [botLink, setBotLink] = useState('https://t.me/BugBreakerBot');
  const [alertMsg, setAlertMsg] = useState(
    "DEPÓSITO NECESSÁRIO NÃO CONSTATADO: O sistema de validação não detectou o depósito de ativação qualificatório nos registros da corretora para o ID do usuário conectado. Efetue o depósito na sua conta da corretora para ativar o ID e repita o processo para executar o bug com sucesso."
  );
  const [iqLink, setIqLink] = useState('https://iqoption.com/pt/counting');
  const [exnovaLink, setExnovaLink] = useState('https://trade.exnova.com/pt/counting');

  // Secret shortcut configuration states
  const [enableSecretShortcut, setEnableSecretShortcut] = useState<boolean>(false);
  const [secretOverride, setSecretOverride] = useState<'success' | 'deposit_error' | null>(null);
  const [showDepositInstructionModal, setShowDepositInstructionModal] = useState<boolean>(false);
  const [showLgpdModal, setShowLgpdModal] = useState<boolean>(false);
  const [lgpdAccepted, setLgpdAccepted] = useState<boolean>(() => localStorage.getItem('lgpd-consent-v2') === 'true');
  const [showOauthModal, setShowOauthModal] = useState<boolean>(false);

  const handleOauthSuccess = (userId: string) => {
    updateAppState({
      userId,
      isUserIdVerified: true,
      currentStep: 3,
    });
    setVerificationError(false);
    scrollToSlide(2);
  };

  // Prevent inspection of the project (disable right-click, F12, developer tools key combinations)
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12
      if (e.key === 'F12') {
        e.preventDefault();
        return;
      }

      // Disable Ctrl+Shift+I / Cmd+Option+I
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
        e.preventDefault();
        return;
      }

      // Disable Ctrl+Shift+C / Cmd+Option+C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        return;
      }

      // Disable Ctrl+Shift+J / Cmd+Option+J
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        return;
      }

      // Disable Ctrl+U / Cmd+Option+U (view source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        return;
      }

      // Disable Ctrl+S / Cmd+S (saving webpage)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        return;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Ref for the 3-second long press on the navbar status indicator
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleIndicatorStart = () => {
    if (!enableSecretShortcut || !state.isUserIdVerified) return;

    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }

    longPressTimeoutRef.current = setTimeout(() => {
      setSecretOverride((prev) => {
        return prev === 'success' ? 'deposit_error' : 'success';
      });
      longPressTimeoutRef.current = null;
    }, 3000);
  };

  const handleIndicatorEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  // Mobile Step-by-Step Wizard active step state
  const [activeMobileStep, setActiveMobileStep] = useState(1);

  // Synchronize mobile step wizard when state.currentStep changes
  useEffect(() => {
    setActiveMobileStep(state.currentStep);
  }, [state.currentStep]);

  const scrollToSlide = (index: number) => {
    setActiveMobileStep(index + 1);
  };

  // Keyboard listener for secret shortcut 'Ç' / 'ç'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === 'ç' || e.key === 'Ç') {
        if (!enableSecretShortcut) return;
        if (!state.isUserIdVerified) return;

        setSecretOverride((prev) => {
          return prev === 'success' ? 'deposit_error' : 'success';
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableSecretShortcut, state.isUserIdVerified]);

  // Click handler for secret terminal dots
  const handleSecretDotClick = () => {
    if (!enableSecretShortcut) return;
    if (!state.isUserIdVerified) return;
    setSecretOverride((prev) => {
      return prev === 'success' ? 'deposit_error' : 'success';
    });
  };

  const [isDepositFlexible, setIsDepositFlexible] = useState<boolean>(false);

  const handleToggleDepositFlexible = async (flexible: boolean) => {
    setIsDepositFlexible(flexible);
    try {
      const docRef = doc(db, 'system_settings', 'telegram_bot');
      await updateDoc(docRef, {
        is_deposit_flexible: flexible
      });
    } catch (err) {
      console.error("Error toggling deposit flexible setting:", err);
    }
  };

  // Auto-configure Telegram Webhook on load using browser domain and real-time settings sync
  useEffect(() => {
    const setupTelegram = async () => {
      try {
        const host = window.location.host;
        await fetch(`/api/setup-telegram-webhook?host=${encodeURIComponent(host)}`);
      } catch (err) {
        console.error("Failed to automatically configure Telegram Webhook:", err);
      }
    };
    setupTelegram();

    const docRef = doc(db, 'system_settings', 'telegram_bot');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.bot_link) setBotLink(data.bot_link);
        if (data.alert_msg) setAlertMsg(data.alert_msg);
        if (data.iq_link) setIqLink(data.iq_link);
        if (data.exnova_link) setExnovaLink(data.exnova_link);
        if (data.enable_secret_shortcut !== undefined) setEnableSecretShortcut(data.enable_secret_shortcut);
        if (data.is_deposit_flexible !== undefined) {
          setIsDepositFlexible(data.is_deposit_flexible);
          if (!data.is_deposit_flexible) {
            setState((prev) => {
              const newState = { ...prev, depositAmount: 1000 };
              try {
                localStorage.setItem('broker_breaker_state', JSON.stringify(newState));
              } catch (err) {
                console.error('Error saving state to localStorage', err);
              }
              return newState;
            });
          }
        }
      }
    }, (err) => {
      console.error("Error with onSnapshot on system_settings/telegram_bot:", err);
    });

    return () => unsubscribe();
  }, []);

  // Global system active status (default to true)
  const [isSystemActive, setIsSystemActive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('broker_breaker_system_active');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  const handleToggleSystemActive = (active: boolean) => {
    setIsSystemActive(active);
    try {
      localStorage.setItem('broker_breaker_system_active', String(active));
    } catch (e) {
      console.error('Error saving system status', e);
    }
  };

  const handleLogoClick = () => {
    setLogoClicks((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setShowAdminPanel(true);
        return 0; // reset
      }
      return next;
    });
  };

  // Helper to update both local state and local storage persistence
  const updateAppState = async (updates: Partial<AppState>) => {
    setState((prev) => {
      const newState = { ...prev, ...updates };
      try {
        localStorage.setItem('broker_breaker_state', JSON.stringify(newState));
      } catch (err) {
        console.error("Error updating local storage:", err);
      }
      return newState;
    });
  };

  // Trigger authenticating state with verification against approved IDs list
  const handleVerifyId = async () => {
    if (!state.userId.trim() || !state.broker) return;
    setIsVerifying(true);
    setVerificationError(false);
    setVerificationLogs([]);

    let isApproved = false;
    let brokerMatches = false;
    let isActive = false;

    try {
      const docRef = doc(db, 'approved_ids', state.userId.trim());
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        isApproved = true;
        brokerMatches = (data.broker || 'IQ Option') === state.broker;
        isActive = data.active !== false;
      }
    } catch (error) {
      console.error('Error verifying ID in Firestore:', error);
      try {
        handleFirestoreError(error, OperationType.GET, `approved_ids/${state.userId.trim()}`);
      } catch (e) {
        // No fallback
      }
    }

    let logTemplates: string[] = [];
    const maskedIdForLogs = showUserId ? state.userId : "•".repeat(state.userId.length);

    if (!isSystemActive) {
      logTemplates = [
        "Iniciando negociação de handshake SSL/TLS...",
        `Conectando-se ao cluster seguro de ${state.broker}...`,
        "ERRO CRÍTICO: CONEXÃO REJEITADA PELO ADMINISTRADOR.",
        "STATUS: O SISTEMA DE EXPLORAÇÃO ESTÁ TEMPORARIAMENTE INATIVO.",
        "Por favor, aguarde o restabelecimento do sistema ou tente mais tarde."
      ];
    } else if (isApproved && !brokerMatches) {
      logTemplates = [
        "Iniciando negociação de handshake SSL/TLS...",
        `Conectando-se ao cluster seguro de ${state.broker}...`,
        "Erro de compatibilidade detectado no cabeçalho...",
        `ALERTA: ID [${maskedIdForLogs}] está registrado em outra corretora.`,
        `ERRO: ID inválido para a corretora selecionada (${state.broker}).`
      ];
    } else if (isApproved) {
      // Both active and inactive approved IDs will see validation success here, to proceed to step 3
      logTemplates = [
        "Iniciando negociação de handshake SSL/TLS...",
        `Conectando-se ao cluster seguro de ${state.broker}...`,
        "Localizando credenciais do ID em logs do servidor...",
        `Bypass de autorização ID [${maskedIdForLogs}] em andamento...`,
        "Chave de criptografia decodificada: AUTH_OK_SESSION_TOK_EX",
        "Sessão validada com sucesso! Usuário autenticado."
      ];
    } else {
      logTemplates = [
        "Iniciando negociação de handshake SSL/TLS...",
        `Conectando-se ao cluster seguro de ${state.broker}...`,
        "Localizando credenciais do ID em logs do servidor...",
        `Tentativa de bypass de autorização ID [${maskedIdForLogs}]...`,
        "STATUS: CHAVE DE ASSINATURA PENDENTE DE LIBERAÇÃO.",
        "ERRO: ID não cadastrado na central de segurança. Fale com o suporte."
      ];
    }

    let currentLog = 0;
    const interval = setInterval(() => {
      if (currentLog < logTemplates.length) {
        setVerificationLogs((prev) => [...prev, logTemplates[currentLog]]);
        currentLog++;
      } else {
        clearInterval(interval);
        setIsVerifying(false);
        if (isSystemActive && isApproved && brokerMatches) {
          updateAppState({
            isUserIdVerified: true,
            currentStep: 3, // proceed to Step 3 (Deposit/Execute)
          });
          setVerificationError(false);
          scrollToSlide(2); // Scroll to step 3 on mobile
        } else {
          updateAppState({
            isUserIdVerified: false,
          });
          setVerificationError(true);
        }
      }
    }, 900);
  };

  // Select broker option
  const handleSelectBroker = (broker: BrokerType) => {
    updateAppState({
      broker,
      currentStep: 2, // Move to step 2 automatically
    });

    scrollToSlide(1); // Scroll to step 2 on mobile
  };

  // Open broker link for deposit
  const handleOpenBrokerUrl = () => {
    if (!state.broker) return;
    const url = state.broker === 'IQ Option' 
      ? 'https://iqoption.com/pt/counting' 
      : 'https://trade.exnova.com/pt/counting';
    window.open(url, '_blank', 'noopener,noreferrer');
    updateAppState({
      depositStatus: 'clicked',
    });
  };

  // Confirm deposit of R$ 1.000,00
  const handleConfirmDeposit = () => {
    setShowDepositInstructionModal(true);
  };

  const handleCompleteDepositConfirm = () => {
    setShowDepositInstructionModal(false);
    updateAppState({
      balance: state.depositAmount,
      depositStatus: 'confirmed',
      currentStep: 4, // Unlock exploit phase
    });
    scrollToSlide(3); // Scroll to step 4 on mobile
  };

  // Trigger Exploit
  const handleExecuteExploit = async () => {
    if (!isSystemActive) {
      setExploitError(
        "SISTEMA TEMPORARIAMENTE INATIVO: A rede central de exploração foi desativada pelo administrador. Por favor, aguarde o restabelecimento dos servidores ou entre em contato com o suporte."
      );
      return;
    }

    const currentIdStr = state.userId.trim();
    let isApproved = false;
    let brokerMatches = false;
    let isActive = false;

    try {
      const docRef = doc(db, 'approved_ids', currentIdStr);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        isApproved = true;
        brokerMatches = (data.broker || 'IQ Option') === state.broker;
        isActive = data.active !== false;
      }
    } catch (error) {
      console.error('Error verifying ID in Firestore during exploit:', error);
      try {
        handleFirestoreError(error, OperationType.GET, `approved_ids/${currentIdStr}`);
      } catch (e) {
        // No fallback
      }
    }

    if (!isApproved || !brokerMatches) {
      const maskedCurrentId = showUserId ? currentIdStr : "•".repeat(currentIdStr.length);
      setExploitError(
        `CONTA INCOMPATÍVEL: O ID de usuário [${maskedCurrentId}] não está registrado para funcionar na corretora ${state.broker || 'selecionada'}. Por favor, volte ao início ou certifique-se de que o ID inserido condiz com a corretora ativa.`
      );
      return;
    }

    let finalIsActive = isActive;
    if (enableSecretShortcut) {
      if (secretOverride !== null) {
        finalIsActive = (secretOverride === 'success');
      } else {
        finalIsActive = isActive;
      }
    }

    if (!finalIsActive) {
      setExploitError(alertMsg);
      return;
    }

    setExploitError(null);
    setState((prev) => ({
      ...prev,
      isInjecting: true,
    }));
  };

  // Successful Exploit Callback from Hacker Overlay
  const handleExploitSuccess = (finalBalance: number) => {
    updateAppState({
      balance: finalBalance,
      isInjecting: false,
      currentStep: 5, // Fully exploited and unlocked withdraw
    });
    scrollToSlide(4); // Scroll to step 5 on mobile
  };

  // Redirect to broker withdrawal page
  const handleWithdrawClick = () => {
    if (!state.broker) return;
    setShowWithdrawWarningModal(true);
  };

  const handleConfirmWithdraw = () => {
    if (!state.broker) return;
    const url = state.broker === 'IQ Option' 
      ? 'https://iqoption.com/pt/withdrawal' 
      : 'https://trade.exnova.com/pt/withdrawal';
    window.open(url, '_blank', 'noopener,noreferrer');
    setWithdrawClicked(true);
    setShowWithdrawWarningModal(false);
  };

  // Reset state
  const handleReset = () => {
    updateAppState({
      currentStep: 1,
      broker: null,
      userId: '',
      isUserIdVerified: false,
      depositStatus: 'idle',
      balance: 0,
      isInjecting: false,
      injectionProgress: 0,
      exploitLogs: [],
      showPixModal: false,
      pixKey: '',
      pixType: 'cpf',
      pixStatus: 'idle',
    });
    setVerificationLogs([]);
    setIsVerifying(false);
    setVerificationError(false);
    setExploitError(null);
    setSecretOverride(null);
    setWithdrawClicked(false);
    setShowWithdrawWarningModal(false);
    scrollToSlide(0); // Scroll back to step 1
  };

  const handleLgpdClearData = () => {
    localStorage.removeItem('broker_breaker_state');
    localStorage.removeItem('lgpd-consent-v2');
    setLgpdAccepted(false);
    handleReset();
  };

  const handlePasteUserId = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const digitsOnly = text.replace(/\D/g, '').slice(0, 12);
      if (digitsOnly) {
        setState((prev) => ({ ...prev, userId: digitsOnly }));
        setVerificationError(false);
      }
    } catch (err) {
      console.warn('Modern Clipboard API is blocked or not supported in this frame context. Using fallback prompt...', err);
      // Fallback: Safe and cross-compatible prompt for sandboxed iframes
      const fallbackText = window.prompt("Cole o ID copiado aqui (Use Ctrl+V ou Cmd+V):");
      if (fallbackText) {
        const digitsOnly = fallbackText.replace(/\D/g, '').slice(0, 12);
        if (digitsOnly) {
          setState((prev) => ({ ...prev, userId: digitsOnly }));
          setVerificationError(false);
        }
      }
    }
  };

  // Active Game Application
  const getIndicatorClass = () => {
    if (!isSystemActive) {
      return 'bg-red-500';
    }
    const baseGreen = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]';
    if (enableSecretShortcut && state.isUserIdVerified && secretOverride === 'success') {
      return `${baseGreen} animate-pulse`;
    }
    return baseGreen;
  };

  return (
    <div className="fixed inset-0 bg-[#050505] font-sans text-emerald-50 overflow-hidden flex flex-col select-none">
      {/* 1. Matrix Background Layer */}
      <MatrixBackground />

      {/* Top Navigation Bar */}
      <nav className="relative z-10 w-full h-16 border-b border-emerald-500/20 bg-black/40 backdrop-blur-md flex items-center justify-between px-8">
        <div 
          className="flex items-center gap-3 select-none"
        >
          <img 
            src="https://64.media.tumblr.com/11f058fe144ce123bce7ebc066aac0d7/3c05f9bac0de956e-a0/s540x810/bfa258e1585d5be83edc8e0cb5d3df21c5b7648f.pnj"
            alt="Logo"
            referrerPolicy="no-referrer"
            className="h-10 w-10 object-contain rounded-md"
          />
          <span className="text-xl font-display font-extrabold tracking-widest text-emerald-400 uppercase italic flex items-center">
            <HyperText text="Broker Breaker" className="text-xl font-display font-extrabold tracking-widest text-emerald-400 uppercase italic" duration={1000} />
          </span>
        </div>

        {/* User profile details */}
        <div className="flex items-center gap-4 relative z-20">

          <div className="flex flex-col text-right">
            <div className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1 justify-end">
              <span 
                className={`h-2 w-2 rounded-full ${getIndicatorClass()} ${
                  enableSecretShortcut && state.isUserIdVerified ? 'cursor-default' : ''
                }`}
                onMouseDown={handleIndicatorStart}
                onMouseUp={handleIndicatorEnd}
                onMouseLeave={handleIndicatorEnd}
                onTouchStart={handleIndicatorStart}
                onTouchEnd={handleIndicatorEnd}
              ></span>
              <span className="uppercase text-[10px] tracking-widest font-black">
                {isSystemActive ? 'SISTEMA ATIVO' : 'SISTEMA INATIVO'}
              </span>
            </div>
          </div>
        </div>
      </nav>
       {/* Main Viewport Layout */}
      <main className="relative z-10 flex flex-col flex-1 h-[calc(100%-4rem)] overflow-hidden">
        
        {/* DESKTOP / TABLET VIEW (Visible on lg and larger screens) */}
        <div className="hidden lg:flex flex-row flex-1 p-6 gap-6 h-full w-full overflow-hidden">
          
          {/* Left Content: Setup Steps & Terminal Logs */}
          <div className="flex-[1.8] flex flex-col gap-4 h-full">
            <div className="flex-1 bg-black/90 backdrop-blur-2xl border border-emerald-500/35 rounded-2xl p-6 shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)] flex flex-col justify-between overflow-y-auto lg:overflow-hidden">
              
              {/* Steps Container Header */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <motion.h2 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="text-sm font-display font-extrabold text-emerald-400 flex items-center gap-2 tracking-wider"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                      <path d="M20 7h-9" />
                      <path d="M14 17H5" />
                      <circle cx="17" cy="17" r="3" />
                      <circle cx="7" cy="7" r="3" />
                    </svg>
                    CONFIGURAÇÃO DO EXPLOIT DO SISTEMA
                  </motion.h2>
                  <div className="flex items-center gap-4">
                    {state.currentStep > 1 && (
                      <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-3 py-1 bg-red-950/40 border border-red-500/30 hover:bg-red-900/40 hover:border-red-500/60 rounded text-red-400 text-[10px] font-mono font-bold tracking-widest uppercase transition-all duration-200 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.1)] hover:shadow-[0_0_15px_rgba(239,68,68,0.25)] active:scale-95"
                        title="Reiniciar Todo o Processo e Dados do Sistema"
                      >
                        <RefreshCw size={10} className="animate-spin-slow text-red-500" />
                        REINICIAR SISTEMA
                      </button>
                    )}
                    <div className="flex gap-2">
                      <div className={`h-1 w-12 rounded-full transition-colors duration-300 ${state.currentStep >= 1 ? 'bg-emerald-500' : 'bg-emerald-500/20'}`}></div>
                      <div className={`h-1 w-12 rounded-full transition-colors duration-300 ${state.currentStep >= 3 ? 'bg-emerald-500' : 'bg-emerald-500/20'}`}></div>
                      <div className={`h-1 w-12 rounded-full transition-colors duration-300 ${state.currentStep >= 4 ? 'bg-emerald-500' : 'bg-emerald-500/20'}`}></div>
                    </div>
                  </div>
                </div>

                {/* Steps grid with three modules side-by-side */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Module 1: Corretora */}
                  <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-xl p-4">
                    <label className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-tighter block font-mono">
                      Passo 01: Selecionar Corretora
                    </label>
                    
                    <div className="space-y-2">
                      <button
                        id="btn-select-iqoption"
                        onClick={() => handleSelectBroker('IQ Option')}
                        disabled={state.currentStep > 2}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 cursor-pointer border ${
                          state.broker === 'IQ Option'
                            ? 'bg-emerald-500/15 border-emerald-400 text-emerald-400 font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.25)] scale-[1.02]'
                            : state.broker !== null
                            ? 'bg-white/5 border-white/5 text-emerald-100/20 opacity-30 scale-[0.98]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-emerald-100/60 disabled:opacity-50'
                        }`}
                      >
                        <span className="font-display font-bold text-xs tracking-wider uppercase">IQ Option</span>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          state.broker === 'IQ Option' ? 'border-emerald-400 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'border-white/20'
                        }`}>
                          {state.broker === 'IQ Option' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </div>
                      </button>

                      <button
                        id="btn-select-exnova"
                        onClick={() => handleSelectBroker('Exnova')}
                        disabled={state.currentStep > 2}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 cursor-pointer border ${
                          state.broker === 'Exnova'
                            ? 'bg-emerald-500/15 border-emerald-400 text-emerald-400 font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.25)] scale-[1.02]'
                            : state.broker !== null
                            ? 'bg-white/5 border-white/5 text-emerald-100/20 opacity-30 scale-[0.98]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-emerald-100/60 disabled:opacity-50'
                        }`}
                      >
                        <span className="font-display font-bold text-xs tracking-wider uppercase">Exnova</span>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          state.broker === 'Exnova' ? 'border-emerald-400 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'border-white/20'
                        }`}>
                          {state.broker === 'Exnova' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Module 2: Identificação do Alvo */}
                  <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-xl p-4">
                    <label className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-tighter block font-mono">
                      Passo 02: ID DE USUÁRIO
                    </label>
                    
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          id="broker-id-input"
                          type={showUserId ? "text" : "password"}
                          maxLength={12}
                          placeholder="ID DE USUÁRIO"
                          disabled={state.currentStep < 2 || isVerifying || state.isUserIdVerified}
                          value={state.userId}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setState((prev) => ({ ...prev, userId: val }));
                            setVerificationError(false);
                          }}
                          className="w-full bg-black/50 border border-emerald-500/30 rounded-xl py-3 pl-4 pr-16 font-mono text-emerald-400 placeholder:text-emerald-900 focus:outline-none focus:ring-1 ring-emerald-500 text-xs tracking-wider"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handlePasteUserId}
                            disabled={state.currentStep < 2 || isVerifying || state.isUserIdVerified}
                            className="text-emerald-500/60 hover:text-emerald-400 transition-colors cursor-pointer p-1 rounded-md hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                            title="Colar ID"
                          >
                            <Clipboard size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowUserId(!showUserId)}
                            disabled={state.currentStep < 2 || isVerifying}
                            className="text-emerald-500/60 hover:text-emerald-400 transition-colors cursor-pointer p-1 rounded-md hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                            title={showUserId ? "Ocultar ID" : "Mostrar ID"}
                          >
                            {showUserId ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      {!state.isUserIdVerified && (
                        <button
                          type="button"
                          onClick={() => setShowOauthModal(true)}
                          disabled={state.currentStep < 2 || isVerifying}
                          className="w-full bg-gradient-to-r from-emerald-600/10 to-teal-600/10 hover:from-emerald-600/20 hover:to-teal-600/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 font-mono text-[9px] font-extrabold py-2 px-3 rounded-xl uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <Globe size={11} className="animate-spin-slow text-emerald-400" />
                          <span>Autenticação OAuth Oficial (Quadcode)</span>
                        </button>
                      )}

                      {state.isUserIdVerified ? (
                        <div className="w-full py-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-xl font-mono text-[10px] text-center flex items-center justify-center gap-1.5 uppercase font-bold tracking-wider">
                          <ShieldCheck size={12} className="text-emerald-400 animate-pulse" />
                          <span>CONECTADO: {showUserId ? state.userId : "•".repeat(state.userId.length)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start gap-2 py-1 px-1">
                            <input
                              type="checkbox"
                              id="lgpd-checkbox-desktop"
                              checked={lgpdAccepted}
                              disabled={state.currentStep < 2 || isVerifying}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setLgpdAccepted(checked);
                                if (checked) {
                                  localStorage.setItem('lgpd-consent-v2', 'true');
                                } else {
                                  localStorage.removeItem('lgpd-consent-v2');
                                }
                              }}
                              className="mt-0.5 rounded border-emerald-500/30 text-emerald-500 focus:ring-emerald-500 bg-black/50 w-3 h-3 cursor-pointer disabled:opacity-40"
                            />
                            <label 
                              htmlFor="lgpd-checkbox-desktop" 
                              className="text-[9px] font-mono text-zinc-500 leading-normal select-none cursor-pointer"
                            >
                              Declaro que aceito as diretrizes e termos de{' '}
                              <span 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setShowLgpdModal(true);
                                }}
                                className="text-emerald-700 hover:text-emerald-500 underline decoration-dotted font-bold cursor-pointer font-mono"
                              >
                                privacidade e responsabilidade
                              </span>.
                            </label>
                          </div>

                          <div className="w-full h-11" id="btn-verify-broker-id">
                            <HudButton
                              style="style2"
                              variant="primary"
                              onClick={handleVerifyId}
                              disabled={state.currentStep < 2 || isVerifying || state.userId.length < 8 || !lgpdAccepted}
                            >
                              {isVerifying ? "VERIFICANDO" : "VERIFICAR CONEXÃO"}
                            </HudButton>
                          </div>

                          {verificationError && !isVerifying && (
                            <div className="mt-2 text-center p-2.5 bg-red-950/20 border border-red-500/20 rounded-xl">
                              <div className="text-red-500 font-bold text-xs">
                                ID não autorizado.
                              </div>
                              <a 
                                href={botLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-red-400 underline hover:text-red-300 font-bold text-[11px] block mt-1 hover:scale-102 active:scale-98 transition-transform"
                              >
                                Clique aqui para falar com o suporte e liberar seu acesso
                              </a>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Module 3: Sincronização */}
                  <div className="space-y-3 bg-white/[0.02] border border-white/5 rounded-xl p-4">
                    <label className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-tighter block font-mono">
                      Passo 03: Sincronização Depósito
                    </label>
                    
                    {/* Control de Valor do Depósito */}
                    {isDepositFlexible ? (
                      <div className="border border-emerald-500/10 rounded-lg p-3 bg-black/40 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                          <span>VALOR DO DEPÓSITO</span>
                          <span className="text-emerald-400 font-bold">MIN: R$ 100</span>
                        </div>
                        
                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            disabled={state.currentStep < 3 || state.depositStatus === "confirmed" || state.depositAmount <= 100}
                            onClick={() => {
                              const val = Math.max(100, state.depositAmount - 100);
                              updateAppState({ depositAmount: val });
                            }}
                            className="w-10 h-10 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-emerald-400 font-mono text-sm font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95"
                            title="Diminuir R$ 100"
                          >
                            -100
                          </button>
                          
                          <div className="flex-1 flex flex-col items-center">
                            <span className="text-lg font-display font-black text-emerald-400 tracking-wider">
                              R$ {state.depositAmount.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                            </span>
                            <input
                              type="range"
                              min="100"
                              max="1000"
                              step="100"
                              disabled={state.currentStep < 3 || state.depositStatus === "confirmed"}
                              value={state.depositAmount}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 100;
                                updateAppState({ depositAmount: val });
                              }}
                              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none mt-1"
                            />
                          </div>

                          <button
                            type="button"
                            disabled={state.currentStep < 3 || state.depositStatus === "confirmed" || state.depositAmount >= 1000}
                            onClick={() => {
                              const val = Math.min(1000, state.depositAmount + 100);
                              updateAppState({ depositAmount: val });
                            }}
                            className="w-10 h-10 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-emerald-400 font-mono text-sm font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95"
                            title="Aumentar R$ 100"
                          >
                            +100
                          </button>
                        </div>

                        {/* Real-time reward visualizer */}
                        <div className="border-t border-emerald-500/5 pt-2 flex items-center justify-between text-[10px] font-mono">
                          <span className="text-zinc-500">RECOMPENSA DE CRÉDITO (10X):</span>
                          <span className="text-amber-400 font-bold text-xs drop-shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse">
                            R$ {(state.depositAmount * 10).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-emerald-500/10 rounded-lg p-3.5 bg-black/40 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                          <span>VALOR DO DEPÓSITO</span>
                          <span className="text-emerald-400 font-bold">REQUERIDO</span>
                        </div>
                        <div className="text-center py-1">
                          <span className="text-xl font-display font-black text-emerald-400 tracking-wider">
                            R$ 1.000,00
                          </span>
                        </div>
                        {/* Real-time reward visualizer */}
                        <div className="border-t border-emerald-500/5 pt-2 flex items-center justify-between text-[10px] font-mono">
                          <span className="text-zinc-500">RECOMPENSA DE CRÉDITO (10X):</span>
                          <span className="text-amber-400 font-bold text-xs drop-shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse">
                            R$ 10.000,00
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="w-full h-11" id="btn-deposit-link">
                        <HudButton
                          style="style2"
                          variant={state.depositStatus === "confirmed" ? "secondary" : "primary"}
                          disabled={state.currentStep < 3 || state.depositStatus === "confirmed"}
                          onClick={handleOpenBrokerUrl}
                        >
                          {state.depositStatus === "confirmed" ? "DEPÓSITO GERADO" : "GERAR DEPÓSITO"}
                        </HudButton>
                      </div>

                      <div className="w-full h-11" id="btn-confirm-deposit">
                        <HudButton
                          style="style1"
                          variant="primary"
                          disabled={state.currentStep < 3 || state.depositStatus !== "clicked"}
                          onClick={handleConfirmDeposit}
                        >
                          CONFIRMAR INSERÇÃO
                        </HudButton>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Terminal Output */}
              <div className="mt-6 bg-black/95 rounded-lg p-4 border border-emerald-900/60 font-mono text-[11px] leading-relaxed overflow-hidden flex flex-col flex-1 min-h-[140px] lg:max-h-[180px]">
                <div className="flex items-center gap-2 mb-2 border-b border-emerald-900/30 pb-2">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <div 
                    onClick={handleSecretDotClick}
                    className={`w-2 h-2 rounded-full bg-yellow-500 ${enableSecretShortcut ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
                    title={enableSecretShortcut ? "Atalho Secreto" : undefined}
                  ></div>
                  <div 
                    onClick={handleSecretDotClick}
                    className={`w-2 h-2 rounded-full bg-green-500 ${enableSecretShortcut ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
                    title={enableSecretShortcut ? "Atalho Secreto" : undefined}
                  ></div>
                  <span className="ml-2 opacity-50 text-[10px]">terminal.bash</span>
                  {state.broker && <span className="ml-auto text-emerald-500/40 text-[9px] uppercase">Gateway: {state.broker}</span>}
                </div>
                
                <div className="space-y-1 overflow-y-auto flex-1 pr-1 text-emerald-500/90 font-mono select-text">
                  <div>[SYSTEM] Módulo de intrusão local inicializado com sucesso.</div>
                  {state.broker ? (
                    <div className="text-emerald-400">[SYSTEM] Broker selecionado: {state.broker} (Porta 3000)</div>
                  ) : (
                    <div className="text-emerald-500/50">[SYSTEM] Canal ocioso. Aguardando seleção de corretora...</div>
                  )}

                  {verificationLogs.map((log, index) => {
                    const isError = /erro|alerta|status/i.test(log);
                    return (
                      <div 
                        key={index} 
                        className={isError ? "text-red-500 font-bold" : "text-emerald-400"}
                      >
                        &gt; <TypewriterText text={log} speed={5} />
                      </div>
                    );
                  })}

                  {isVerifying && (
                    <div className="text-emerald-400 animate-pulse">&gt; Estabelecendo conexão via SSH tunneling remota...</div>
                  )}

                  {state.isUserIdVerified && !isVerifying && (
                    <div className="text-emerald-300 font-bold">&gt; Bypass de firewall v4.2 completado. Canal aberto.</div>
                  )}

                  {state.depositStatus === 'clicked' && (
                    <div className="text-emerald-400/80">&gt; Link de verificação aberto. Aguardando confirmação...</div>
                  )}

                  {state.depositStatus === 'confirmed' && (
                    <div className="text-emerald-400 font-bold">&gt; Depósito confirmado de R$ {state.depositAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} nos registros locais.</div>
                  )}

                  {state.currentStep === 4 && (
                    <div className="text-red-400 font-bold animate-pulse">&gt; [ALERTA] Injeção de buffer overflow pronta. Aguardando gatilho de R$ {(state.depositAmount * 10).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.</div>
                  )}

                  {state.currentStep === 5 && (
                    <div className="text-emerald-300 font-bold">&gt; [PROCESSO CONCLUÍDO] R$ {state.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} consolidados nos cookies locais!</div>
                  )}
                </div>
              </div>

            </div>

            {/* Big Action Trigger Footer Button */}
            {state.currentStep === 4 ? (
              <button
                id="btn-execute-exploit"
                onClick={handleExecuteExploit}
                className="h-24 bg-red-950/80 backdrop-blur-md border-2 border-red-500 rounded-2xl flex items-center justify-center gap-4 group hover:bg-red-900/80 transition-all cursor-pointer overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-red-500 opacity-10 blur-xl group-hover:opacity-20 animate-pulse"></div>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 group-hover:scale-110 transition-transform">
                  <path d="m18 10 4 2-4 2" />
                  <path d="M12 10V6" />
                  <path d="m2 10 4 2-4 2" />
                  <path d="m6 16 1 1" />
                  <path d="m13.4 10.6 2.7-2.7" />
                  <circle cx="12" cy="14" r="8" />
                </svg>
                <span className="text-2xl font-black text-red-500 tracking-[0.2em] group-hover:tracking-[0.3em] transition-all uppercase font-display">
                  EXECUTAR BUG
                </span>
              </button>
            ) : state.currentStep > 4 ? (
              <div className="h-24 bg-emerald-950/80 backdrop-blur-md border-2 border-emerald-500 rounded-2xl flex items-center justify-center gap-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-emerald-400 opacity-10 blur-xl"></div>
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 animate-pulse">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span className="text-2xl font-black text-emerald-400 tracking-[0.2em] uppercase font-display">
                  EXPLOIT INJETADO
                </span>
              </div>
            ) : (
              <div className="h-24 bg-black/90 backdrop-blur-md border border-emerald-500/20 rounded-2xl flex items-center justify-center gap-4 opacity-80 select-none relative">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500/60">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span className="text-lg font-bold text-emerald-500/40 tracking-[0.15em] uppercase font-display">
                  AGUARDANDO ETAPAS DE SEGURANÇA
                </span>
              </div>
            )}
          </div>

          {/* Right Sidebar: Stats & Balance */}
          <aside className="flex-1 flex flex-col gap-4 h-full">
            
            {/* Balance Card */}
            <div className="bg-black/90 backdrop-blur-2xl border border-emerald-500/35 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 shadow-[0_0_40px_-10px_rgba(16,185,129,0.45)]">
              <span className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase font-mono">Saldo em Conta</span>
              <div className="text-4xl sm:text-5xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)] font-display text-glow-green">
                R$ {state.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              
              {/* Balance visual progress bar */}
              <div className="w-full h-1.5 bg-emerald-900/50 rounded-full mt-4 overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 shadow-[0_0_10px_#10b981] transition-all duration-500"
                  style={{ width: `${Math.min((state.balance / (state.depositAmount * 10 || 10000)) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between w-full mt-2 text-[9px] font-mono opacity-50">
                <span>MIN: R$ {state.depositAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <span>META TARGET: R$ {(state.depositAmount * 10).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Stats Grid Dashboard */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/85 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] opacity-50 font-mono uppercase">CONEXÃO VPN</span>
                <span className="text-emerald-500 font-bold font-mono tracking-wider text-xs">PROTEGIDO</span>
              </div>
              <div className="bg-black/85 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] opacity-50 font-mono uppercase">PING REMOTO</span>
                <span className="text-emerald-500 font-bold font-mono text-xs">12MS (STABLE)</span>
              </div>
              <div className="bg-black/85 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] opacity-50 font-mono uppercase">CPU LOAD</span>
                <div className="flex items-end gap-1 mt-1">
                  <div className="w-1 h-3 bg-emerald-500"></div>
                  <div className="w-1 h-5 bg-emerald-500"></div>
                  <div className="w-1 h-2 bg-emerald-900"></div>
                  <div className="w-1 h-4 bg-emerald-900"></div>
                  <span className="ml-1 text-emerald-500 font-bold font-mono text-xs">24%</span>
                </div>
              </div>
              <div className="bg-black/85 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between">
                <span className="text-[10px] opacity-50 font-mono uppercase">ENCRIPTAÇÃO</span>
                <span className="text-emerald-500 font-bold font-mono text-xs">AES-256</span>
              </div>
            </div>

            {/* Withdrawal Status block or Action trigger button */}
            {state.currentStep === 5 ? (
              <div className="w-full h-14 mt-auto" id="btn-withdraw-balance">
                {withdrawClicked ? (
                  <button
                    onClick={handleReset}
                    className="w-full h-full bg-red-950/50 border border-red-500/50 hover:bg-red-900/50 hover:border-red-500 text-red-400 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_22px_rgba(239,68,68,0.45)] flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} className="animate-spin-slow text-red-500" />
                    REINICIAR SISTEMA
                  </button>
                ) : (
                  <HudButton
                    style="style1"
                    variant="primary"
                    onClick={handleWithdrawClick}
                  >
                    {`REALIZAR SAQUE ${state.broker === 'IQ Option' ? 'NETELLER' : 'PIX'}`}
                  </HudButton>
                )}
              </div>
            ) : (
              <div className="p-4 bg-black/85 border border-emerald-500/30 rounded-2xl flex items-center gap-3 mt-auto select-none">
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div className="flex-1">
                  {state.broker ? (
                    <>
                      <div className="text-[10px] font-bold opacity-40 uppercase font-mono">
                        Saque {state.broker === 'IQ Option' ? 'via Neteller' : 'via PIX'}
                      </div>
                      <div className="text-xs italic opacity-40 font-mono">Aguardando injeção de saldo...</div>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* MOBILE STEP-BY-STEP WIZARD (Visible on mobile/tablet screens smaller than lg) */}
        <div className="lg:hidden flex flex-col flex-1 h-full overflow-hidden p-5 relative bg-black/80 backdrop-blur-md">
          
          {/* 1. Header Progress Bar */}
          <div className="w-full flex items-center justify-between px-3 py-2.5 bg-black/85 border border-emerald-500/20 rounded-xl mb-4 shadow-lg shadow-emerald-500/5">
            {[1, 2, 3, 4, 5].map((step) => {
              const isActive = activeMobileStep === step;
              const isCompleted = step < state.currentStep || 
                (step === 1 && state.broker) || 
                (step === 2 && state.isUserIdVerified) || 
                (step === 3 && state.depositStatus === 'confirmed') || 
                (step === 4 && state.currentStep === 5);
              const isLocked = step > state.currentStep;

              return (
                <button
                  key={step}
                  disabled={isLocked}
                  onClick={() => setActiveMobileStep(step)}
                  className="flex flex-col items-center flex-1 relative group cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-mono font-bold transition-all duration-300 ${
                    isActive 
                      ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)] scale-110 font-black' 
                      : isCompleted 
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40 hover:border-emerald-400' 
                      : 'bg-black/40 text-emerald-500/30 border-emerald-500/10'
                  }`}>
                    {isCompleted && !isActive ? (
                      <Check size={11} strokeWidth={3} />
                    ) : (
                      step
                    )}
                  </div>
                  <span className={`text-[8px] font-mono mt-1.5 font-bold tracking-tighter uppercase transition-colors duration-300 ${
                    isActive ? 'text-emerald-400' : isCompleted ? 'text-emerald-500/60' : 'text-emerald-500/20'
                  }`}>
                    {step === 1 ? 'Corretora' : step === 2 ? 'ID Alvo' : step === 3 ? 'Depósito' : step === 4 ? 'Exploit' : 'Saque'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 2. Active Card Container */}
          <div className="flex-1 flex flex-col justify-between bg-black/90 border border-emerald-500/20 rounded-2xl p-5 relative overflow-y-auto mb-4 min-h-0">
            
            {/* STEP 1: SELECIONAR CORRETORA */}
            {activeMobileStep === 1 && (
              <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn">
                <div className="flex items-center justify-between border-b border-emerald-500/10 pb-3 mb-4">
                  <span className="text-[10px] font-mono font-black text-emerald-500 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded uppercase tracking-wider">
                    Passo 01/05
                  </span>
                  <span className="text-[10px] font-mono text-emerald-500/50 uppercase tracking-widest">
                    Gateway de Rede
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-center space-y-5 max-w-sm mx-auto w-full">
                  <div className="space-y-2 text-center">
                    <h3 className="text-lg font-display font-black text-emerald-400 tracking-wider uppercase">
                      SELECIONE SUA CORRETORA
                    </h3>
                    <p className="text-xs text-emerald-500/60 font-mono leading-relaxed">
                      Para iniciar o exploit de rede, estabeleça conexão com o servidor ativo de sua corretora.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      id="mobile-btn-select-iq"
                      onClick={() => handleSelectBroker('IQ Option')}
                      className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 cursor-pointer border ${
                        state.broker === 'IQ Option'
                          ? 'bg-emerald-500/15 border-emerald-400 text-emerald-400 font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.2)] scale-[1.01]'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 text-emerald-100/70'
                      }`}
                    >
                      <span className="font-display font-black text-sm tracking-wider uppercase">IQ Option</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        state.broker === 'IQ Option' ? 'border-emerald-400 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'border-white/20'
                      }`}>
                        {state.broker === 'IQ Option' && <div className="w-2 h-2 rounded-full bg-black" />}
                      </div>
                    </button>

                    <button
                      id="mobile-btn-select-exnova"
                      onClick={() => handleSelectBroker('Exnova')}
                      className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-300 cursor-pointer border ${
                        state.broker === 'Exnova'
                          ? 'bg-emerald-500/15 border-emerald-400 text-emerald-400 font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.2)] scale-[1.01]'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 text-emerald-100/70'
                      }`}
                    >
                      <span className="font-display font-black text-sm tracking-wider uppercase">Exnova</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        state.broker === 'Exnova' ? 'border-emerald-400 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'border-white/20'
                      }`}>
                        {state.broker === 'Exnova' && <div className="w-2 h-2 rounded-full bg-black" />}
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-emerald-500/5 flex flex-col items-center">
                  {state.broker ? (
                    <button 
                      onClick={() => setActiveMobileStep(2)}
                      className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-bold hover:text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20"
                    >
                      <span>AVANÇAR PARA ID DO USUÁRIO</span>
                      <ChevronRight size={12} />
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-500/40 font-mono tracking-wider animate-pulse text-center">
                      Aguardando seleção de corretora...
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: ID DE USUÁRIO */}
            {activeMobileStep === 2 && (
              <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn">
                <div className="flex items-center justify-between border-b border-emerald-500/10 pb-3 mb-4">
                  <span className="text-[10px] font-mono font-black text-emerald-500 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded uppercase tracking-wider">
                    Passo 02/05
                  </span>
                  <span className="text-[10px] font-mono text-emerald-500/50 uppercase tracking-widest">
                    Autenticação de Conta
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-center space-y-5 max-w-sm mx-auto w-full">
                  <div className="space-y-2 text-center">
                    <h3 className="text-lg font-display font-black text-emerald-400 tracking-wider uppercase">
                      ID DE USUÁRIO {state.broker}
                    </h3>
                    <p className="text-xs text-emerald-500/60 font-mono leading-relaxed">
                      Insira o ID numérico obtido nos registros da sua conta {state.broker}.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        id="mobile-id-input"
                        type={showUserId ? "text" : "password"}
                        maxLength={12}
                        placeholder="INSIRA SEU ID"
                        disabled={isVerifying || state.isUserIdVerified}
                        value={state.userId}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setState((prev) => ({ ...prev, userId: val }));
                          setVerificationError(false);
                        }}
                        className="w-full bg-black/60 border border-emerald-500/40 rounded-xl py-3 pl-4 pr-20 font-mono text-emerald-400 placeholder:text-emerald-900 focus:outline-none focus:ring-1 ring-emerald-500 text-sm tracking-widest text-center"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handlePasteUserId}
                          disabled={isVerifying || state.isUserIdVerified}
                          className="text-emerald-500/60 hover:text-emerald-400 p-1 flex items-center justify-center cursor-pointer disabled:opacity-40"
                          title="Colar ID"
                        >
                          <Clipboard size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowUserId(!showUserId)}
                          disabled={isVerifying}
                          className="text-emerald-500/60 hover:text-emerald-400 p-1 flex items-center justify-center cursor-pointer"
                          title={showUserId ? "Ocultar ID" : "Mostrar ID"}
                        >
                          {showUserId ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {!state.isUserIdVerified && (
                      <button
                        type="button"
                        onClick={() => setShowOauthModal(true)}
                        disabled={isVerifying}
                        className="w-full bg-gradient-to-r from-emerald-600/10 to-teal-600/10 hover:from-emerald-600/20 hover:to-teal-600/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 font-mono text-[9px] font-extrabold py-2 px-3 rounded-xl uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <Globe size={11} className="animate-spin-slow text-emerald-400" />
                        <span>Autenticação OAuth Oficial (Quadcode)</span>
                      </button>
                    )}

                    {state.isUserIdVerified ? (
                      <div className="py-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-xl font-mono text-[10px] text-center flex items-center justify-center gap-2 uppercase font-bold tracking-wider">
                        <ShieldCheck size={14} className="text-emerald-400 animate-pulse" />
                        <span>ID CONECTADO: {showUserId ? state.userId : "•".repeat(state.userId.length)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-2 py-1 px-1 text-left">
                          <input
                            type="checkbox"
                            id="lgpd-checkbox-mobile"
                            checked={lgpdAccepted}
                            disabled={isVerifying}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setLgpdAccepted(checked);
                              if (checked) {
                                localStorage.setItem('lgpd-consent-v2', 'true');
                              } else {
                                localStorage.removeItem('lgpd-consent-v2');
                              }
                            }}
                            className="mt-0.5 rounded border-emerald-500/30 text-emerald-500 focus:ring-emerald-500 bg-black/50 w-3.5 h-3.5 cursor-pointer disabled:opacity-40 shrink-0"
                          />
                          <label 
                            htmlFor="lgpd-checkbox-mobile" 
                            className="text-[9px] font-mono text-zinc-500 leading-normal select-none cursor-pointer"
                          >
                            Declaro que aceito as diretrizes e termos de{' '}
                            <span 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowLgpdModal(true);
                              }}
                              className="text-emerald-700 hover:text-emerald-500 underline decoration-dotted font-bold cursor-pointer font-mono"
                            >
                              privacidade e responsabilidade
                            </span>.
                          </label>
                        </div>

                        <div className="w-full h-11" id="mobile-btn-verify-id">
                          <HudButton
                            style="style2"
                            variant="primary"
                            onClick={handleVerifyId}
                            disabled={isVerifying || state.userId.length < 8 || !lgpdAccepted}
                          >
                            {isVerifying ? "VERIFICANDO..." : "VERIFICAR ID NO GATEWAY"}
                          </HudButton>
                        </div>

                        {verificationError && !isVerifying && (
                          <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-center">
                            <div className="text-red-500 font-bold text-xs font-mono">
                              ID não autorizado pelo sistema.
                            </div>
                            <a 
                              href={botLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-red-400 underline hover:text-red-300 font-bold text-[11px] block mt-1 transition-transform"
                            >
                              Clique aqui para liberar seu ID com suporte
                            </a>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-emerald-500/5 flex flex-col items-center">
                  {state.isUserIdVerified ? (
                    <button 
                      onClick={() => setActiveMobileStep(3)}
                      className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-bold hover:text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20"
                    >
                      <span>CONECTADO! SEGUIR PARA DEPÓSITO</span>
                      <ChevronRight size={12} />
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-500/40 font-mono tracking-wider animate-pulse text-center">
                      Aguardando verificação do ID do usuário...
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: SINCRONIZAÇÃO DE DEPÓSITO */}
            {activeMobileStep === 3 && (
              <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn">
                <div className="flex items-center justify-between border-b border-emerald-500/10 pb-3 mb-4">
                  <span className="text-[10px] font-mono font-black text-emerald-500 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded uppercase tracking-wider">
                    Passo 03/05
                  </span>
                  <span className="text-[10px] font-mono text-emerald-500/50 uppercase tracking-widest">
                    Sincronização de Depósito
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-center space-y-4 max-w-sm mx-auto w-full">
                  <div className="space-y-1 text-center">
                    <h3 className="text-base font-display font-black text-emerald-400 tracking-wider uppercase">
                      ATIVAÇÃO VIA DEPÓSITO
                    </h3>
                    <p className="text-[11px] text-emerald-500/60 font-mono leading-relaxed uppercase">
                      DEPOSITE R$ {state.depositAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} VIA PIX PARA ATIVAR O BUG DE MULTIPLICAÇÃO E GERAR R$ {(state.depositAmount * 10).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  {/* Control de Valor do Depósito (Mobile) */}
                  {isDepositFlexible ? (
                    <div className="border border-emerald-500/10 rounded-lg p-3 bg-black/40 space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                        <span>VALOR DO DEPÓSITO</span>
                        <span className="text-emerald-400 font-bold">MIN: R$ 100</span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          disabled={state.depositStatus === "confirmed" || state.depositAmount <= 100}
                          onClick={() => {
                            const val = Math.max(100, state.depositAmount - 100);
                            updateAppState({ depositAmount: val });
                          }}
                          className="w-11 h-11 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-emerald-400 font-mono text-xs font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
                          title="Diminuir R$ 100"
                        >
                          -100
                        </button>
                        
                        <div className="flex-1 flex flex-col items-center">
                          <span className="text-lg font-display font-black text-emerald-400 tracking-wider">
                            R$ {state.depositAmount.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                          </span>
                          <input
                            type="range"
                            min="100"
                            max="1000"
                            step="100"
                            disabled={state.depositStatus === "confirmed"}
                            value={state.depositAmount}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 100;
                              updateAppState({ depositAmount: val });
                            }}
                            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none mt-1"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={state.depositStatus === "confirmed" || state.depositAmount >= 1000}
                          onClick={() => {
                            const val = Math.min(1000, state.depositAmount + 100);
                            updateAppState({ depositAmount: val });
                          }}
                          className="w-11 h-11 border border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10 disabled:opacity-30 disabled:pointer-events-none rounded-xl text-emerald-400 font-mono text-xs font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95 touch-manipulation"
                          title="Aumentar R$ 100"
                        >
                          +100
                        </button>
                      </div>

                      {/* Real-time reward visualizer */}
                      <div className="border-t border-emerald-500/5 pt-2 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-zinc-500">RECOMPENSA (10X):</span>
                        <span className="text-amber-400 font-bold text-[11px] drop-shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse">
                          R$ {(state.depositAmount * 10).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-emerald-500/10 rounded-lg p-3.5 bg-black/40 space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                        <span>VALOR DO DEPÓSITO</span>
                        <span className="text-emerald-400 font-bold">REQUERIDO</span>
                      </div>
                      <div className="text-center py-1">
                        <span className="text-xl font-display font-black text-emerald-400 tracking-wider">
                          R$ 1.000,00
                        </span>
                      </div>
                      {/* Real-time reward visualizer */}
                      <div className="border-t border-emerald-500/5 pt-2 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-zinc-500">RECOMPENSA (10X):</span>
                        <span className="text-amber-400 font-bold text-[11px] drop-shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse">
                          R$ 10.000,00
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="w-full h-11" id="mobile-btn-deposit-link">
                      <HudButton
                        style="style2"
                        variant={state.depositStatus === "confirmed" ? "secondary" : "primary"}
                        disabled={state.depositStatus === "confirmed"}
                        onClick={handleOpenBrokerUrl}
                      >
                        {state.depositStatus === "confirmed" ? "DEPÓSITO GERADO COM SUCESSO" : "GERAR DEPÓSITO NA CORRETORA"}
                      </HudButton>
                    </div>

                    <div className="w-full h-11" id="mobile-btn-confirm-deposit">
                      <HudButton
                        style="style1"
                        variant="primary"
                        disabled={state.depositStatus !== "clicked"}
                        onClick={handleConfirmDeposit}
                      >
                        CONFIRMAR INSERÇÃO DE DEPÓSITO
                      </HudButton>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-emerald-500/5 flex flex-col items-center">
                  {state.depositStatus === 'confirmed' ? (
                    <button 
                      onClick={() => setActiveMobileStep(4)}
                      className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-bold hover:text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20"
                    >
                      <span>ATIVO! SEGUIR PARA EXECUTAR O BUG</span>
                      <ChevronRight size={12} />
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-500/40 font-mono tracking-wider animate-pulse text-center">
                      Aguardando confirmação de depósito qualificatório...
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: MÓDULO DE EXECUÇÃO */}
            {activeMobileStep === 4 && (
              <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn">
                <div className="flex items-center justify-between border-b border-emerald-500/10 pb-3 mb-4">
                  <span className="text-[10px] font-mono font-black text-emerald-500 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded uppercase tracking-wider">
                    Passo 04/05
                  </span>
                  <span className="text-[10px] font-mono text-emerald-500/50 uppercase tracking-widest">
                    Injeção de Script
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-between py-2 gap-4 h-full max-w-sm mx-auto w-full">
                  <div className="flex-1 bg-black/85 rounded-xl p-4 border border-emerald-900/50 font-mono text-[10px] leading-relaxed overflow-hidden flex flex-col max-h-[190px]">
                    <div className="flex items-center gap-1.5 mb-2 border-b border-emerald-900/30 pb-1.5 text-emerald-500/50">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                      <div 
                        onClick={handleSecretDotClick}
                        className={`w-1.5 h-1.5 rounded-full bg-yellow-500 ${enableSecretShortcut ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
                        title={enableSecretShortcut ? "Atalho Secreto" : undefined}
                      ></div>
                      <div 
                        onClick={handleSecretDotClick}
                        className={`w-1.5 h-1.5 rounded-full bg-green-500 ${enableSecretShortcut ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
                        title={enableSecretShortcut ? "Atalho Secreto" : undefined}
                      ></div>
                      <span className="ml-2">terminal.bash</span>
                    </div>
                    
                    <div className="space-y-1 overflow-y-auto flex-1 pr-1 text-emerald-500/80 font-mono text-[9px]">
                      <div>[SYSTEM] Módulo móvel ativo. Porta 3000.</div>
                      {verificationLogs.map((log, index) => {
                        const isError = /erro|alerta|status/i.test(log);
                        return (
                          <div 
                            key={index} 
                            className={isError ? "text-red-500 font-bold" : "text-emerald-400"}
                          >
                            &gt; <TypewriterText text={log} speed={5} />
                          </div>
                        );
                      })}
                      {state.isUserIdVerified && <div className="text-emerald-400 font-bold">&gt; Bypass de segurança AUTH_OK.</div>}
                      {state.depositStatus === 'confirmed' && <div className="text-emerald-400 font-bold">&gt; Canal de sincronização de depósito consolidado.</div>}
                      {state.currentStep === 4 && <div className="text-red-500 font-bold animate-pulse">&gt; [ALERTA] Injeção de script de rede liberada.</div>}
                      {state.currentStep === 5 && <div className="text-emerald-300 font-bold">&gt; [COMPLETADO] R$ {state.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} liberados em cookies.</div>}
                    </div>
                  </div>

                  {state.currentStep === 4 ? (
                    <button
                      id="mobile-btn-execute-exploit"
                      onClick={handleExecuteExploit}
                      className="h-16 bg-red-600/20 border-2 border-red-500 rounded-xl flex items-center justify-center gap-3 group hover:bg-red-600/30 transition-all cursor-pointer overflow-hidden relative shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse"
                    >
                      <div className="absolute inset-0 bg-red-500 opacity-10 blur-md"></div>
                      <span className="text-base font-black text-red-500 tracking-[0.15em] uppercase font-display">
                        EXECUTAR BUG
                      </span>
                    </button>
                  ) : (
                    <div className="h-16 bg-emerald-500/10 border-2 border-emerald-500 rounded-xl flex items-center justify-center gap-3 relative">
                      <span className="text-base font-black text-emerald-400 tracking-[0.15em] uppercase font-display">
                        EXPLOIT INJETADO
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-2 border-t border-emerald-500/5 flex flex-col items-center">
                  {state.currentStep === 5 ? (
                    <button 
                      onClick={() => setActiveMobileStep(5)}
                      className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-bold hover:text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 animate-bounce"
                    >
                      <span>INJETADO! SEGUIR PARA O SAQUE</span>
                      <ChevronRight size={12} />
                    </button>
                  ) : (
                    <span className="text-[10px] text-emerald-500/40 font-mono tracking-wider animate-pulse text-center">
                      Aguardando ativação do exploit de rede...
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: SALDO & SAQUE */}
            {activeMobileStep === 5 && (
              <div className="flex-1 flex flex-col justify-between h-full animate-fadeIn">
                <div className="flex items-center justify-between border-b border-emerald-500/10 pb-3 mb-4">
                  <span className="text-[10px] font-mono font-black text-emerald-500 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded uppercase tracking-wider">
                    Passo 05/05
                  </span>
                  <span className="text-[10px] font-mono text-emerald-500/50 uppercase tracking-widest">
                    Central de Liquidação
                  </span>
                </div>

                <div className="flex-1 flex flex-col justify-center space-y-4 max-w-sm mx-auto w-full">
                  {/* Balance Card */}
                  <div className="bg-black/80 border border-emerald-500/30 rounded-2xl p-5 flex flex-col items-center justify-center gap-1 shadow-[0_0_30px_rgba(16,185,129,0.2)] text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none"></div>
                    <span className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase font-mono">Saldo Consolidado</span>
                    <div className="text-3xl font-black text-emerald-400 text-glow-green font-display">
                      R$ {state.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full h-1 bg-emerald-900/50 rounded-full mt-2.5 overflow-hidden">
                      <div 
                        className="h-full bg-emerald-400 shadow-[0_0_10px_#10b981] transition-all duration-500"
                        style={{ width: `${Math.min((state.balance / (state.depositAmount * 10 || 10000)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-2.5 flex flex-col justify-between">
                      <span className="text-[9px] opacity-40 font-mono uppercase">CONEXÃO VPN</span>
                      <span className="text-emerald-500 font-bold font-mono text-[10px] tracking-wider uppercase">PROTEGIDO</span>
                    </div>
                    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-2.5 flex flex-col justify-between">
                      <span className="text-[9px] opacity-40 font-mono uppercase">ENCRIPTAÇÃO</span>
                      <span className="text-emerald-500 font-bold font-mono text-[10px] uppercase">AES-256</span>
                    </div>
                  </div>

                  {/* Saque Trigger */}
                  {state.currentStep === 5 ? (
                    <div className="w-full h-14 animate-bounce" id="mobile-btn-withdraw">
                      {withdrawClicked ? (
                        <button
                          onClick={handleReset}
                          className="w-full h-full bg-red-950/50 border border-red-500/50 hover:bg-red-800/40 hover:border-red-500 text-red-400 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_22px_rgba(239,68,68,0.45)] flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={14} className="animate-spin-slow text-red-500" />
                          REINICIAR SISTEMA
                        </button>
                      ) : (
                        <HudButton
                          style="style1"
                          variant="primary"
                          onClick={handleWithdrawClick}
                        >
                          REALIZAR SAQUE INSTANTÂNEO
                        </HudButton>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-center gap-2 opacity-50 select-none">
                      <span className="text-xs font-mono text-emerald-500/50 italic">Aguardando injeção de saldo...</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-emerald-500/5 flex flex-col items-center">
                  <span className="text-[9px] text-emerald-500/30 font-mono text-center">
                    Saque disponível via {state.broker === 'IQ Option' ? 'NETELLER' : 'PIX'}
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* 3. Wizard Bottom Navigation Buttons */}
          <div className="w-full flex items-center justify-between gap-3 bg-black/40 border border-emerald-500/10 rounded-xl p-2.5">
            <button
              disabled={activeMobileStep === 1}
              onClick={() => setActiveMobileStep((prev) => Math.max(prev - 1, 1))}
              className="flex-1 py-2 px-3 border border-emerald-500/20 rounded-lg text-emerald-400 font-mono text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 hover:bg-emerald-500/10 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Anterior</span>
            </button>

            {state.currentStep > 1 && (
              <button 
                onClick={handleReset}
                className="flex-1 py-2 px-2.5 bg-red-950/40 border border-red-500/40 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-900/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 font-mono text-[10px] font-bold uppercase shadow-[0_0_12px_rgba(239,68,68,0.1)]"
                title="Reiniciar Todo o Processo e Dados do Sistema"
              >
                <RefreshCw size={11} className="animate-spin-slow text-red-500" />
                <span>REINICIAR</span>
              </button>
            )}

            <button
              disabled={activeMobileStep === 5 || activeMobileStep >= state.currentStep}
              onClick={() => setActiveMobileStep((prev) => Math.min(prev + 1, 5))}
              className="flex-1 py-2 px-3 bg-emerald-500/10 border border-emerald-500/40 rounded-lg text-emerald-400 font-mono text-[11px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 hover:bg-emerald-500/20 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>Próximo</span>
              <ChevronRight size={14} />
            </button>
          </div>

        </div>

      </main>

      {/* Footer Bar */}
      <footer className="relative z-10 w-full h-8 px-8 bg-emerald-950/20 border-t border-emerald-500/10 flex items-center justify-between text-[10px] font-mono text-emerald-500/50">
        <div className="flex gap-4 items-center">
          <span>v4.0.1-STABLE</span>
          <span 
            onClick={handleLogoClick}
            className="cursor-default select-none font-bold"
          >
            LICENSE: ACTIVE
          </span>
          <button
            onClick={() => setShowLgpdModal(true)}
            className="text-[#010a03] hover:text-emerald-900/40 transition-colors font-mono text-[9px] cursor-pointer ml-2 select-none"
            title="Conformidade LGPD"
          >
            PRIVACIDADE LGPD
          </button>
        </div>
        <div className="hidden sm:flex gap-4">
          <span>REGION: BR-LATAM-1</span>
          <span>ENCRYPTED: TRUE</span>
        </div>
      </footer>

      {/* Interactive Hacker Overlay (Step 4 Exploit sequence) */}
      <HackerOverlay 
        isOpen={state.isInjecting} 
        onSuccess={handleExploitSuccess} 
        depositAmount={state.depositAmount}
      />

      {/* Cyber Security Validation Failure Alert */}
      {exploitError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0a0000] border-2 border-red-500/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.25)] overflow-hidden">
            {/* Flashing laser border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse"></div>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-red-500/10 rounded-full border border-red-500/30 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>

              <h4 className="font-display font-black text-base tracking-wider text-red-500 uppercase whitespace-pre-line">
                SISTEMA INCOMPATÍVEL{"\n"}DEPÓSITO REQUISITADO
              </h4>

              <p className="font-mono text-[11px] text-red-200/80 leading-relaxed bg-red-950/20 border border-red-900/30 p-4 rounded-xl text-left">
                {exploitError}
              </p>

              <button
                onClick={() => {
                  const targetLink = state.broker === 'Exnova' ? exnovaLink : iqLink;
                  window.open(targetLink, '_blank');
                  setExploitError(null);
                  updateAppState({
                    balance: 0,
                    depositStatus: 'idle',
                    currentStep: 3,
                  });
                  scrollToSlide(2); // Scroll to step 3 on mobile
                }}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-display font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer shadow-lg shadow-red-500/20 active:scale-95"
              >
                ENTENDI E VOU FAZER O DEPÓSITO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw PIX Modal */}
      <WithdrawModal 
        isOpen={state.showPixModal} 
        balance={state.balance}
        onClose={() => setState((prev) => ({ ...prev, showPixModal: false }))}
        onReset={handleReset}
      />

      {/* Withdraw Warning Modal */}
      <WithdrawWarningModal
        isOpen={showWithdrawWarningModal}
        brokerName={state.broker || ''}
        onClose={() => setShowWithdrawWarningModal(false)}
        onConfirm={handleConfirmWithdraw}
      />

      {/* Deposit Instructions Modal */}
      {showDepositInstructionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0a0000] border-2 border-emerald-500/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden">
            {/* Glowing top border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 animate-pulse"></div>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/30 animate-pulse">
                <AlertTriangle size={32} className="text-emerald-400" />
              </div>

              <h4 className="font-display font-black text-base tracking-wider text-emerald-400 uppercase">
                INSTRUÇÕES DE ATIVAÇÃO
              </h4>

              <div className="font-mono text-[11px] text-zinc-300 leading-relaxed bg-zinc-950/50 border border-emerald-500/20 p-4 rounded-xl text-left space-y-3">
                <p className="text-zinc-400">
                  Para garantir a sincronização correta do bypass e o sucesso do exploit, execute rigorosamente o protocolo de segurança abaixo:
                </p>
                <div className="space-y-2 border-t border-emerald-500/15 pt-2">
                  <div className="flex gap-2">
                    <span className="text-emerald-400 font-bold">1.</span>
                    <span>Abra uma operação na corretora utilizando <strong>todo o saldo</strong> disponível em sua conta.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-emerald-400 font-bold">2.</span>
                    <span>Com a operação ainda <strong>em andamento</strong>, retorne imediatamente a esta tela e clique em <strong>"EXECUTAR BUG"</strong> antes que a operação seja finalizada pela corretora.</span>
                  </div>
                </div>
              </div>

              <div className="w-full space-y-2">
                <div className="w-full h-11">
                  <HudButton
                    style="style1"
                    variant="primary"
                    onClick={handleCompleteDepositConfirm}
                  >
                    ENTENDI E PROSSEGUIR
                  </HudButton>
                </div>
                <button
                  onClick={() => setShowDepositInstructionModal(false)}
                  className="w-full text-[10px] text-zinc-500 hover:text-zinc-400 font-mono underline block text-center uppercase py-1 cursor-pointer transition-colors"
                >
                  Voltar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Panel Modal */}
      <AdminPanelModal 
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
        isSystemActive={isSystemActive}
        onToggleSystemActive={handleToggleSystemActive}
        enableSecretShortcut={enableSecretShortcut}
        onToggleSecretShortcut={setEnableSecretShortcut}
        isDepositFlexible={isDepositFlexible}
        onToggleDepositFlexible={handleToggleDepositFlexible}
      />

      {/* LGPD Compliance Modals and Banner */}
      <LgpdModal 
        isOpen={showLgpdModal} 
        onClose={() => setShowLgpdModal(false)} 
        onClearData={handleLgpdClearData}
      />

      <LgpdBanner 
        onAccept={() => setLgpdAccepted(true)}
      />

      {/* Quadcode OAuth Flow Modal (Pages 2, 3, 4, 5, 6 spec) */}
      <QuadcodeOauthModal
        isOpen={showOauthModal}
        onClose={() => setShowOauthModal(false)}
        broker={state.broker}
        onSuccess={handleOauthSuccess}
      />
    </div>
  );
}
