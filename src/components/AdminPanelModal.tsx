/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { 
  X, 
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Check, 
  Key,
  Database,
  Loader2,
  Eye,
  EyeOff,
  Copy
} from 'lucide-react';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

interface ApprovedId {
  id: string;
  active: boolean;
  broker: 'IQ Option' | 'Exnova';
}

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSystemActive: boolean;
  onToggleSystemActive: (active: boolean) => void;
  enableSecretShortcut: boolean;
  onToggleSecretShortcut: (enabled: boolean) => void;
  isDepositFlexible: boolean;
  onToggleDepositFlexible: (flexible: boolean) => void;
}

export default function AdminPanelModal({ 
  isOpen, 
  onClose,
  isSystemActive,
  onToggleSystemActive,
  enableSecretShortcut,
  onToggleSecretShortcut,
  isDepositFlexible,
  onToggleDepositFlexible
}: AdminPanelModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [newId, setNewId] = useState('');
  const [newBroker, setNewBroker] = useState<'IQ Option' | 'Exnova'>('IQ Option');
  const [approvedIds, setApprovedIds] = useState<ApprovedId[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ids' | 'telegram' | 'alerts' | 'security'>('ids');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.warn('Failed to copy using clipboard API, trying fallback...', err);
      try {
        const textarea = document.createElement('textarea');
        textarea.value = id;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (e) {
        console.error('Fallback copy failed:', e);
      }
    }
  };

  // Admin credentials states (load from Firestore with default fallback)
  const [dbUsername, setDbUsername] = useState('chines');
  const [dbPassword, setDbPassword] = useState('325325');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');

  // Telegram settings states
  const [iqLink, setIqLink] = useState('https://iqoption.com/pt/counting');
  const [exnovaLink, setExnovaLink] = useState('https://trade.exnova.com/pt/counting');
  const [welcomeMsg, setWelcomeMsg] = useState('👋 *Olá, {name}! Bem-vindo ao bot de liberação do BugBreaker!*\n\nPara liberar seu acesso na plataforma, siga os passos abaixo:\n\n1️⃣ Cadastre-se em uma de nossas corretoras parceiras:\n👉 [Clique aqui para se cadastrar na IQ Option]({iq_link})\n👉 [Clique aqui para se cadastrar na Exnova]({exnova_link})\n\n2️⃣ Após criar sua conta, envie-me o seu **ID de Usuário** (somente números, com no mínimo 8 dígitos).\n\nAssim que você enviar seu ID, ele será enviado para análise e liberação imediata! 🚀');
  const [approvedMsg, setApprovedMsg] = useState('🎉 *Seu acesso foi LIBERADO com sucesso!*\n\nSeu ID `{id}` agora está ativo no sistema. Volte ao site, insira o ID e clique em *Verificar Conexão* para começar! 🚀');
  const [rejectedMsg, setRejectedMsg] = useState('⚠️ *Seu ID {id} não foi aprovado pela nossa equipe.*\n\nCertifique-se de que se cadastrou corretamente através de nossos links indicados e envie o ID correto novamente para análise.');
  const [pendingMsg, setPendingMsg] = useState('🎉 *Seu ID {id} da {broker} foi enviado ao painel de controle!*\n\nSeu ID foi registrado com sucesso, mas a opção está desativada no momento. Ele será ativado assim que o depósito qualificatório for validado. 🚀');
  const [botToken, setBotToken] = useState('8936249204:AAHLPkYRW2kHmLvLqU9R1VvjpNFNgOisl8Q');
  const [adminChatId, setAdminChatId] = useState('5328007859');
  const [botLink, setBotLink] = useState('https://t.me/BugBreakerBot');
  const [alertMsg, setAlertMsg] = useState('DEPÓSITO NECESSÁRIO NÃO CONSTATADO: O sistema de validação não detectou o depósito de ativação qualificatório nos registros da corretora para o ID do usuário conectado. Efetue o depósito na sua conta da corretora para ativar o ID e repita o processo para executar o bug com sucesso.');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);

  // Load bot config from Firestore
  const fetchTelegramConfig = async () => {
    try {
      const docRef = doc(db, 'system_settings', 'telegram_bot');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.iq_link) setIqLink(data.iq_link);
        if (data.exnova_link) setExnovaLink(data.exnova_link);
        if (data.welcome_msg) setWelcomeMsg(data.welcome_msg);
        if (data.approved_msg) setApprovedMsg(data.approved_msg);
        if (data.rejected_msg) setRejectedMsg(data.rejected_msg);
        if (data.pending_msg) setPendingMsg(data.pending_msg);
        if (data.bot_token) setBotToken(data.bot_token);
        if (data.admin_chat_id) setAdminChatId(data.admin_chat_id);
        if (data.bot_link) setBotLink(data.bot_link);
        if (data.alert_msg) setAlertMsg(data.alert_msg);
        if (data.enable_secret_shortcut !== undefined) onToggleSecretShortcut(data.enable_secret_shortcut);
        if (data.admin_username) setDbUsername(data.admin_username);
        if (data.admin_password) setDbPassword(data.admin_password);
      }
    } catch (err) {
      console.error('Error fetching telegram bot settings:', err);
    }
  };

  // Load configuration on modal opening
  useEffect(() => {
    if (isOpen) {
      fetchTelegramConfig();
    }
  }, [isOpen]);

  // Load approved IDs on authentication
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      const fetchApprovedIds = async () => {
        setIsLoading(true);
        setErrorMessage('');
        try {
          const querySnapshot = await getDocs(collection(db, 'approved_ids'));
          const ids: ApprovedId[] = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            ids.push({
              id: docSnap.id,
              active: data.active !== false,
              broker: data.broker || 'IQ Option',
            });
          });

          setApprovedIds(ids);
        } catch (error) {
          console.error('Error fetching approved IDs from Firestore:', error);
          try {
            handleFirestoreError(error, OperationType.LIST, 'approved_ids');
          } catch (e) {
            setErrorMessage('Erro ao carregar dados do banco de dados.');
          }
        } finally {
          setIsLoading(false);
        }
      };

      fetchApprovedIds();
    }
  }, [isOpen, isAuthenticated]);

  const handleToggleSecretShortcut = async () => {
    const nextVal = !enableSecretShortcut;
    onToggleSecretShortcut(nextVal);
    try {
      const docRef = doc(db, 'system_settings', 'telegram_bot');
      await updateDoc(docRef, {
        enable_secret_shortcut: nextVal
      });
    } catch (err) {
      console.error("Error toggling secret shortcut:", err);
    }
  };

  if (!isOpen) return null;

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (username === dbUsername && password === dbPassword) {
      setIsAuthenticated(true);
      setErrorMessage('');
      setNewAdminUsername(dbUsername);
      setNewAdminPassword(dbPassword);
    } else {
      setErrorMessage('Acesso Negado: Usuário ou senha incorretos.');
    }
  };

  const handleAddId = async (e: FormEvent) => {
    e.preventDefault();
    const cleanId = newId.trim().replace(/\D/g, '');
    
    if (cleanId.length < 8) {
      setErrorMessage('O ID deve ter pelo menos 8 dígitos numéricos.');
      return;
    }

    if (approvedIds.some(item => item.id === cleanId)) {
      setErrorMessage('Este ID já está na lista de aprovados.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      await setDoc(doc(db, 'approved_ids', cleanId), {
        active: false,
        broker: newBroker,
        createdAt: new Date().toISOString()
      });

      const updated = [...approvedIds, { id: cleanId, active: false, broker: newBroker }];
      setApprovedIds(updated);
      setNewId('');
      setErrorMessage('');
      setSuccessMessage(`ID ${cleanId} (${newBroker}) adicionado com sucesso como desativado!`);
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error adding ID to Firestore:', error);
      try {
        handleFirestoreError(error, OperationType.WRITE, `approved_ids/${cleanId}`);
      } catch (e) {
        setErrorMessage('Erro ao salvar o ID no banco de dados.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (idToToggle: string) => {
    const matchedItem = approvedIds.find(item => item.id === idToToggle);
    if (!matchedItem) return;

    const newActive = !matchedItem.active;

    // Optimistic UI update
    setApprovedIds(prev => prev.map(item => 
      item.id === idToToggle ? { ...item, active: newActive } : item
    ));

    try {
      await updateDoc(doc(db, 'approved_ids', idToToggle), {
        active: newActive
      });
    } catch (error) {
      console.error('Error updating ID in Firestore:', error);
      // Revert optimistic UI
      setApprovedIds(prev => prev.map(item => 
        item.id === idToToggle ? { ...item, active: !newActive } : item
      ));
      try {
        handleFirestoreError(error, OperationType.UPDATE, `approved_ids/${idToToggle}`);
      } catch (e) {
        setErrorMessage('Erro ao atualizar o ID no banco de dados.');
      }
    }
  };

  const handleRemoveId = async (idToRemove: string) => {
    const originalList = [...approvedIds];
    // Optimistic UI update
    setApprovedIds(prev => prev.filter(item => item.id !== idToRemove));

    try {
      await deleteDoc(doc(db, 'approved_ids', idToRemove));
      setSuccessMessage(`ID ${idToRemove} removido.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting ID from Firestore:', error);
      // Revert optimistic UI
      setApprovedIds(originalList);
      try {
        handleFirestoreError(error, OperationType.DELETE, `approved_ids/${idToRemove}`);
      } catch (e) {
        setErrorMessage('Erro ao remover o ID do banco de dados.');
      }
    }
  };

  const handleLogoutAdmin = () => {
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    setErrorMessage('');
    setSuccessMessage('');
    setActiveTab('ids');
  };

  const handleSaveTelegramConfig = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await setDoc(doc(db, 'system_settings', 'telegram_bot'), {
        iq_link: iqLink,
        exnova_link: exnovaLink,
        welcome_msg: welcomeMsg,
        approved_msg: approvedMsg,
        rejected_msg: rejectedMsg,
        pending_msg: pendingMsg,
        bot_token: botToken,
        admin_chat_id: adminChatId,
        bot_link: botLink,
        alert_msg: alertMsg,
        enable_secret_shortcut: enableSecretShortcut,
        is_deposit_flexible: isDepositFlexible,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setSuccessMessage('Configurações do robô salvas com sucesso!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Error saving telegram config:', err);
      const errStr = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Erro ao salvar as configurações no Firestore: ${errStr}`);
      try {
        handleFirestoreError(err, OperationType.WRITE, 'system_settings/telegram_bot');
      } catch (fErr) {
        console.error('Detailed firestore error logged:', fErr);
      }
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSaveSecurityConfig = async (e: FormEvent) => {
    e.preventDefault();
    const cleanUser = newAdminUsername.trim();
    const cleanPass = newAdminPassword.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMessage('Usuário e senha não podem estar em branco.');
      return;
    }

    setIsSavingConfig(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await setDoc(doc(db, 'system_settings', 'telegram_bot'), {
        admin_username: cleanUser,
        admin_password: cleanPass,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setDbUsername(cleanUser);
      setDbPassword(cleanPass);
      setSuccessMessage('Credenciais do administrador alteradas com sucesso!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Error saving security config:', err);
      setErrorMessage('Erro ao atualizar as credenciais de segurança.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className={`relative w-full ${isAuthenticated ? 'max-w-xl' : 'max-w-md'} bg-black border-2 border-emerald-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden transition-all duration-300`}>
        
        {/* Aesthetic scanline effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,0)_50%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0.3))] bg-[length:100%_4px]"></div>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-900/40 mb-6 relative z-10">
          <div className="flex items-center gap-2">
            <Database className="text-emerald-400 w-5 h-5 animate-pulse" />
            <h3 className="font-display font-extrabold text-sm tracking-wider text-emerald-400 uppercase">
              ACESSO INTERNO
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/5 text-emerald-500/60 hover:text-emerald-400 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10">
          {!isAuthenticated ? (
            /* Admin Password Prompt */
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-emerald-500/60 uppercase">Usuário</label>
                <input
                  type="text"
                  required
                  placeholder="DIGITE O USUÁRIO..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-emerald-950/10 border border-emerald-500/30 rounded-xl py-3 px-4 font-mono text-emerald-400 placeholder:text-emerald-950 focus:outline-none focus:ring-1 ring-emerald-500 text-xs tracking-wider"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-emerald-500/60 uppercase">Senha</label>
                <div className="relative flex items-center">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    placeholder="DIGITE A SENHA..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-emerald-950/10 border border-emerald-500/30 rounded-xl py-3 pl-4 pr-10 font-mono text-emerald-400 placeholder:text-emerald-950 focus:outline-none focus:ring-1 ring-emerald-500 text-xs tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 text-emerald-500/50 hover:text-emerald-400 transition-colors p-1 rounded-md focus:outline-none cursor-pointer"
                    title={showLoginPassword ? "Ocultar senha" : "Exibir senha"}
                  >
                    {showLoginPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="text-xs font-mono text-red-400 bg-red-950/10 border border-red-500/20 rounded-xl p-3">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-emerald-500 text-black font-display font-extrabold text-xs uppercase rounded-xl hover:bg-emerald-400 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Unlock size={14} />
                <span>Autenticar Central</span>
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex border-b border-emerald-950/60 pb-2 mb-2 gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('ids')}
                  className={`pb-1 px-1 font-mono text-[10px] font-extrabold tracking-wider transition-all uppercase cursor-pointer ${
                    activeTab === 'ids'
                      ? 'border-b-2 border-emerald-400 text-emerald-400'
                      : 'text-emerald-500/40 hover:text-emerald-400'
                  }`}
                >
                  IDs Liberados
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('telegram')}
                  className={`pb-1 px-1 font-mono text-[10px] font-extrabold tracking-wider transition-all uppercase cursor-pointer ${
                    activeTab === 'telegram'
                      ? 'border-b-2 border-emerald-400 text-emerald-400'
                      : 'text-emerald-500/40 hover:text-emerald-400'
                  }`}
                >
                  BOT
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('alerts')}
                  className={`pb-1 px-1 font-mono text-[10px] font-extrabold tracking-wider transition-all uppercase cursor-pointer ${
                    activeTab === 'alerts'
                      ? 'border-b-2 border-emerald-400 text-emerald-400'
                      : 'text-emerald-500/40 hover:text-emerald-400'
                  }`}
                >
                  Alertas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  className={`pb-1 px-1 font-mono text-[10px] font-extrabold tracking-wider transition-all uppercase cursor-pointer ${
                    activeTab === 'security'
                      ? 'border-b-2 border-emerald-400 text-emerald-400'
                      : 'text-emerald-500/40 hover:text-emerald-400'
                  }`}
                >
                  Segurança
                </button>
              </div>

              {activeTab === 'ids' ? (
                /* Admin list and insertion */
                <div className="space-y-5">
                  {/* Global System Status Section */}
                  <div className="bg-emerald-950/15 border border-emerald-500/20 rounded-xl p-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono font-bold text-emerald-500/60 uppercase">Status Global do Sistema</span>
                        <span className={`text-[11px] font-mono font-extrabold mt-0.5 ${isSystemActive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isSystemActive ? '● EXPLORAÇÃO ATIVA' : '○ SISTEMA DESATIVADO'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleSystemActive(!isSystemActive)}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isSystemActive ? 'bg-emerald-500/85 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-950/60 border border-red-500/20'
                        }`}
                        title={isSystemActive ? "Desativar Sistema" : "Ativar Sistema"}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                            isSystemActive ? 'translate-x-5 bg-white' : 'translate-x-0 bg-red-400'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Secret Shortcut Toggle Section */}
                  <div className="bg-emerald-950/15 border border-emerald-500/20 rounded-xl p-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col pr-4">
                        <span className="text-[10px] font-mono font-bold text-emerald-500/60 uppercase">Tecla Secreta "Ç"</span>
                        <span className={`text-[11px] font-mono font-extrabold mt-0.5 ${enableSecretShortcut ? 'text-emerald-400' : 'text-red-400'}`}>
                          {enableSecretShortcut ? '● ATIVADO (USUÁRIO PODE DECIDIR)' : '○ DESATIVADO'}
                        </span>
                        <span className="text-[9px] text-emerald-500/40 font-mono mt-1 leading-tight">
                          Permite que usuários usem o atalho "Ç" ou botão secreto para forçar Sucesso ou erro de Depósito.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleSecretShortcut}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          enableSecretShortcut ? 'bg-emerald-500/85 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-950/60 border border-red-500/20'
                        }`}
                        title="Alternar Atalho Secreto"
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                            enableSecretShortcut ? 'translate-x-5 bg-white' : 'translate-x-0 bg-red-400'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Deposit Amount Mode Toggle Section */}
                  <div className="bg-emerald-950/15 border border-emerald-500/20 rounded-xl p-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col pr-4">
                        <span className="text-[10px] font-mono font-bold text-emerald-500/60 uppercase">Valor de Depósito do Bug</span>
                        <span className={`text-[11px] font-mono font-extrabold mt-0.5 ${isDepositFlexible ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {isDepositFlexible ? '● FLEXÍVEL (R$ 100 A R$ 1.000)' : '● FIXADO EM R$ 1.000,00'}
                        </span>
                        <span className="text-[9px] text-emerald-500/40 font-mono mt-1 leading-tight">
                          Define se o usuário terá um valor flexível de depósito de R$ 100 em R$ 100 até R$ 1.000, ou se o valor será fixado em R$ 1.000,00 padrão.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleDepositFlexible(!isDepositFlexible)}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isDepositFlexible ? 'bg-amber-500/85 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-emerald-500/85 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        }`}
                        title="Alternar Modo de Depósito"
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                            isDepositFlexible ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Add New ID Form */}
                  <form onSubmit={handleAddId} className="space-y-3">
                    <label className="text-[10px] font-mono font-bold text-emerald-500/60 uppercase block">Cadastrar Novo ID Liberado</label>
                    
                    {/* Broker Selector */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewBroker('IQ Option')}
                        className={`py-2 px-3 rounded-xl border font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer text-center ${
                          newBroker === 'IQ Option'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : 'bg-black border-emerald-950 text-emerald-600/60 hover:text-emerald-500/80'
                        }`}
                      >
                        IQ Option
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewBroker('Exnova')}
                        className={`py-2 px-3 rounded-xl border font-mono text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer text-center ${
                          newBroker === 'Exnova'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : 'bg-black border-emerald-950 text-emerald-600/60 hover:text-emerald-500/80'
                        }`}
                      >
                        Exnova
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          maxLength={12}
                          placeholder="ID EX: 12345678"
                          value={newId}
                          onChange={(e) => setNewId(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-emerald-950/10 border border-emerald-500/30 rounded-xl py-2.5 px-4 font-mono text-emerald-400 placeholder:text-emerald-950 focus:outline-none focus:ring-1 ring-emerald-500 text-xs tracking-wider"
                        />
                        <Key size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500/40" />
                      </div>
                      <button
                        type="submit"
                        className="px-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl transition-all font-bold flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>ADD</span>
                      </button>
                    </div>
                  </form>

                  {errorMessage && (
                    <div className="text-[10px] font-mono text-red-400 bg-red-950/10 border border-red-500/20 rounded-lg p-2.5">
                      {errorMessage}
                    </div>
                  )}

                  {successMessage && (
                    <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-2.5 flex items-center gap-1.5">
                      <Check size={12} />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  {/* ID List */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-mono font-bold text-emerald-500/60 uppercase">IDs Liberados ({approvedIds.length})</label>
                      <button
                        onClick={handleLogoutAdmin}
                        className="text-[9px] font-mono text-red-400/70 hover:text-red-400 uppercase tracking-wider"
                      >
                        Desconectar Painel
                      </button>
                    </div>

                    <div className="max-h-[180px] overflow-y-auto border border-emerald-950 rounded-xl bg-black divide-y divide-emerald-950/30 scrollbar-thin">
                      {isLoading && approvedIds.length === 0 ? (
                        <div className="p-6 flex flex-col items-center justify-center gap-2 font-mono text-xs text-emerald-500/60">
                          <Loader2 size={16} className="animate-spin text-emerald-400" />
                          <span>Sincronizando Firestore...</span>
                        </div>
                      ) : approvedIds.length === 0 ? (
                        <div className="p-4 text-center font-mono text-xs text-emerald-500/30 italic">
                          Nenhum ID liberado. Todos falharão na verificação.
                        </div>
                      ) : (
                        approvedIds.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 hover:bg-emerald-950/10 transition-colors">
                            <div 
                              onClick={() => handleCopyId(item.id)}
                              className="flex flex-col cursor-pointer group select-none"
                              title="Clique para copiar o ID"
                            >
                              <span className="font-mono text-xs text-emerald-400 font-bold tracking-wider flex items-center gap-1.5 group-hover:text-emerald-300 transition-colors">
                                <span>ID: {item.id}</span>
                                {copiedId === item.id ? (
                                  <span className="text-[8px] bg-emerald-500 text-black px-1 rounded font-sans uppercase font-extrabold tracking-tight animate-bounce">Copiado!</span>
                                ) : (
                                  <Copy size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500/70" />
                                )}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-mono px-1 py-0.2 bg-emerald-950 border border-emerald-500/30 rounded text-emerald-400 uppercase font-black">
                                  {item.broker}
                                </span>
                                <span className={`text-[9px] font-mono font-semibold ${item.active ? 'text-emerald-500' : 'text-red-400/80'}`}>
                                  {item.active ? '● ATIVO' : '○ BLOQUEADO'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {/* Modern Switch Toggle */}
                              <button
                                onClick={() => handleToggleActive(item.id)}
                                disabled={isLoading}
                                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  item.active ? 'bg-emerald-500/85 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-950/60 border border-red-500/20'
                                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={item.active ? "Desativar ID (Gerar Erro)" : "Ativar ID (Sucesso)"}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                                    item.active ? 'translate-x-5 bg-white' : 'translate-x-0 bg-red-400'
                                  }`}
                                />
                              </button>
                              <button
                                onClick={() => handleRemoveId(item.id)}
                                disabled={isLoading}
                                className={`p-1 hover:bg-red-950/30 text-emerald-500/40 hover:text-red-400 rounded transition-colors cursor-pointer ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Remover ID"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="text-[9px] font-mono text-emerald-500/40 text-center">
                    Banco de dados sincronizado em tempo real com o Firebase Firestore.
                  </div>
                </div>
              ) : activeTab === 'telegram' ? (
                /* Telegram bot configuration form */
                <form onSubmit={handleSaveTelegramConfig} className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                  <div className="bg-emerald-950/15 border border-emerald-500/10 rounded-xl p-3 text-[10px] font-mono text-emerald-500/70 leading-relaxed space-y-1">
                    <div>
                      💡 <span className="text-emerald-400 font-bold">Instruções:</span> Use <code className="text-emerald-300">{"{name}"}</code> para o nome, <code className="text-emerald-300">{"{iq_link}"}</code> e <code className="text-emerald-300">{"{exnova_link}"}</code> para os links afiliados, e <code className="text-emerald-300">{"{id}"}</code> para o ID do usuário.
                    </div>
                    {botLink && (
                      <div className="pt-1 border-t border-emerald-500/10">
                        🤖 <span className="text-emerald-400 font-bold">Link do Bot:</span> <a href={botLink} target="_blank" rel="noopener noreferrer" className="text-emerald-300 underline hover:text-emerald-200">{botLink}</a>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono font-bold text-emerald-500/60 uppercase">Token do Telegram (Bot)</label>
                      <input
                        type="text"
                        required
                        value={botToken}
                        onChange={(e) => setBotToken(e.target.value)}
                        className="w-full bg-emerald-950/10 border border-emerald-500/30 rounded-xl py-2 px-3 font-mono text-emerald-400 placeholder:text-emerald-950 focus:outline-none focus:ring-1 ring-emerald-500 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono font-bold text-emerald-500/60 uppercase">ID Admin (Chat ID)</label>
                      <input
                        type="text"
                        required
                        value={adminChatId}
                        onChange={(e) => setAdminChatId(e.target.value)}
                        className="w-full bg-emerald-950/10 border border-emerald-500/30 rounded-xl py-2 px-3 font-mono text-emerald-400 placeholder:text-emerald-950 focus:outline-none focus:ring-1 ring-emerald-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono font-bold text-emerald-500/60 uppercase">Link do Bot (Telegram)</label>
                    <input
                      type="url"
                      required
                      value={botLink}
                      onChange={(e) => setBotLink(e.target.value)}
                      className="w-full bg-emerald-950/10 border border-emerald-500/30 rounded-xl py-2 px-3 font-mono text-emerald-400 placeholder:text-emerald-950 focus:outline-none focus:ring-1 ring-emerald-500 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono font-bold text-emerald-500/60 uppercase">Link de Afiliado IQ Option</label>
                      <input
                        type="url"
                        required
                        value={iqLink}
                        onChange={(e) => setIqLink(e.target.value)}
                        className="w-full bg-emerald-950/10 border border-emerald-500/30 rounded-xl py-2 px-3 font-mono text-emerald-400 placeholder:text-emerald-950 focus:outline-none focus:ring-1 ring-emerald-500 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono font-bold text-emerald-500/60 uppercase">Link de Afiliado Exnova</label>
                      <input
                        type="url"
                        required
                        value={exnovaLink}
                        onChange={(e) => setExnovaLink(e.target.value)}
                        className="w-full bg-emerald-950/10 border border-emerald-500/30 rounded-xl py-2 px-3 font-mono text-emerald-400 placeholder:text-emerald-950 focus:outline-none focus:ring-1 ring-emerald-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono font-bold text-emerald-500/60 uppercase">Mensagem de Boas-vindas (/start)</label>
                    <textarea
                      rows={4}
                      required
                      value={welcomeMsg}
                      onChange={(e) => setWelcomeMsg(e.target.value)}
                      className="w-full bg-emerald-950/10 border border-emerald-500/30 rounded-xl py-2 px-3 font-mono text-emerald-400 focus:outline-none focus:ring-1 ring-emerald-500 text-xs leading-normal scrollbar-thin"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono font-bold text-emerald-500/60 uppercase">Mensagem de Aprovação (ID Ativo)</label>
                    <textarea
                      rows={3}
                      required
                      value={approvedMsg}
                      onChange={(e) => setApprovedMsg(e.target.value)}
                      className="w-full bg-emerald-950/10 border border-emerald-500/30 rounded-xl py-2 px-3 font-mono text-emerald-400 focus:outline-none focus:ring-1 ring-emerald-500 text-xs leading-normal scrollbar-thin"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono font-bold text-emerald-500/60 uppercase">Mensagem de ID Registrado mas Desativado</label>
                    <textarea
                      rows={3}
                      required
                      value={pendingMsg}
                      onChange={(e) => setPendingMsg(e.target.value)}
                      className="w-full bg-emerald-950/10 border border-emerald-500/30 rounded-xl py-2 px-3 font-mono text-emerald-400 focus:outline-none focus:ring-1 ring-emerald-500 text-xs leading-normal scrollbar-thin"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono font-bold text-emerald-500/60 uppercase">Mensagem de Recusa (ID Bloqueado)</label>
                    <textarea
                      rows={3}
                      required
                      value={rejectedMsg}
                      onChange={(e) => setRejectedMsg(e.target.value)}
                      className="w-full bg-emerald-950/10 border border-emerald-500/30 rounded-xl py-2 px-3 font-mono text-emerald-400 focus:outline-none focus:ring-1 ring-emerald-500 text-xs leading-normal scrollbar-thin"
                    />
                  </div>

                  {errorMessage && (
                    <div className="text-[10px] font-mono text-red-400 bg-red-950/10 border border-red-500/20 rounded-lg p-2.5">
                      {errorMessage}
                    </div>
                  )}

                  {successMessage && (
                    <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-2.5 flex items-center gap-1.5">
                      <Check size={12} />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-1.5">
                    <button
                      type="submit"
                      disabled={isSavingConfig}
                      className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-display font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {isSavingConfig ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      <span>Salvar Configuração</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLogoutAdmin}
                      className="px-4 border border-red-500/30 hover:border-red-500/60 text-red-400 font-mono text-xs uppercase rounded-xl transition-colors cursor-pointer"
                    >
                      Sair
                    </button>
                  </div>
                </form>
              ) : activeTab === 'alerts' ? (
                /* Alertas custom message configuration form */
                <form onSubmit={handleSaveTelegramConfig} className="space-y-4">
                  <div className="bg-emerald-950/15 border border-emerald-500/10 rounded-xl p-3 text-[10px] font-mono text-emerald-500/70 leading-relaxed">
                    💡 <span className="text-emerald-400 font-bold">Instruções:</span> Aqui você pode alterar a mensagem de alerta mostrada ao usuário quando o ID não estiver ativo ou necessitar de depósito.
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono font-bold text-emerald-500/60 uppercase">Mensagem do Alerta de Depósito</label>
                    <textarea
                      rows={6}
                      required
                      value={alertMsg}
                      onChange={(e) => setAlertMsg(e.target.value)}
                      className="w-full bg-emerald-950/10 border border-emerald-500/30 rounded-xl py-2 px-3 font-mono text-emerald-400 focus:outline-none focus:ring-1 ring-emerald-500 text-xs leading-normal scrollbar-thin"
                      placeholder="Digite a mensagem do alerta..."
                    />
                  </div>

                  {errorMessage && (
                    <div className="text-[10px] font-mono text-red-400 bg-red-950/10 border border-red-500/20 rounded-lg p-2.5">
                      {errorMessage}
                    </div>
                  )}

                  {successMessage && (
                    <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-2.5 flex items-center gap-1.5">
                      <Check size={12} />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-1.5">
                    <button
                      type="submit"
                      disabled={isSavingConfig}
                      className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-display font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {isSavingConfig ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      <span>Salvar Alerta</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLogoutAdmin}
                      className="px-4 border border-red-500/30 hover:border-red-500/60 text-red-400 font-mono text-xs uppercase rounded-xl transition-colors cursor-pointer"
                    >
                      Sair
                    </button>
                  </div>
                </form>
              ) : (
                /* Security and admin credentials form */
                <form onSubmit={handleSaveSecurityConfig} className="space-y-4">
                  <div className="bg-emerald-950/15 border border-emerald-500/10 rounded-xl p-3 text-[10px] font-mono text-emerald-500/70 leading-relaxed">
                    💡 <span className="text-emerald-400 font-bold">Segurança:</span> Altere os dados de login de acesso à Central de Controle interna do sistema.
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono font-bold text-emerald-500/60 uppercase">Novo Usuário Administrador</label>
                      <input
                        type="text"
                        required
                        value={newAdminUsername}
                        onChange={(e) => setNewAdminUsername(e.target.value)}
                        className="w-full bg-emerald-950/10 border border-emerald-500/30 rounded-xl py-2.5 px-4 font-mono text-emerald-400 focus:outline-none focus:ring-1 ring-emerald-500 text-xs"
                        placeholder="Ex: admin"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-mono font-bold text-emerald-500/60 uppercase">Nova Senha Administradora</label>
                      <div className="relative flex items-center">
                        <input
                          type={showNewAdminPassword ? "text" : "password"}
                          required
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          className="w-full bg-emerald-950/10 border border-emerald-500/30 rounded-xl py-2.5 pl-4 pr-10 font-mono text-emerald-400 focus:outline-none focus:ring-1 ring-emerald-500 text-xs"
                          placeholder="Nova senha..."
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewAdminPassword(!showNewAdminPassword)}
                          className="absolute right-3 text-emerald-500/50 hover:text-emerald-400 transition-colors p-1 rounded-md focus:outline-none cursor-pointer"
                          title={showNewAdminPassword ? "Ocultar senha" : "Exibir senha"}
                        >
                          {showNewAdminPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="text-[10px] font-mono text-red-400 bg-red-950/10 border border-red-500/20 rounded-lg p-2.5">
                      {errorMessage}
                    </div>
                  )}

                  {successMessage && (
                    <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-2.5 flex items-center gap-1.5">
                      <Check size={12} />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-1.5">
                    <button
                      type="submit"
                      disabled={isSavingConfig}
                      className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-display font-extrabold text-xs uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {isSavingConfig ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      <span>Salvar Credenciais</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLogoutAdmin}
                      className="px-4 border border-red-500/30 hover:border-red-500/60 text-red-400 font-mono text-xs uppercase rounded-xl transition-colors cursor-pointer"
                    >
                      Sair
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
