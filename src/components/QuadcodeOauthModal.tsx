import React, { useState, useEffect } from 'react';
import { 
  X, 
  Globe, 
  Lock, 
  Check, 
  ShieldCheck, 
  ArrowRight, 
  AlertTriangle, 
  Database,
  RefreshCw,
  Info,
  Terminal,
  FileCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuadcodeOauthModalProps {
  isOpen: boolean;
  onClose: () => void;
  broker: 'IQ Option' | 'Exnova' | null;
  onSuccess: (userId: string) => void;
}

export default function QuadcodeOauthModal({ isOpen, onClose, broker, onSuccess }: QuadcodeOauthModalProps) {
  const [step, setStep] = useState<number>(1); // 1: Query Params & PKCE, 2: Login & Consent, 3: Error Simulator, 4: Code Exchange
  
  // OAuth Query Params (Page 2 & 3 of PDF)
  const [clientId, setClientId] = useState<string>('198544');
  const [redirectUri, setRedirectUri] = useState<string>('');
  const [scope, setScope] = useState<string>('full offline_access');
  const [stateParam, setStateParam] = useState<string>('');
  
  // PKCE State (Page 4 of PDF)
  const [codeVerifier, setCodeVerifier] = useState<string>('');
  const [codeChallenge, setCodeChallenge] = useState<string>('');
  const [codeChallengeMethod] = useState<string>('S256');
  
  // Affiliate params (Page 4 of PDF)
  const [aff, setAff] = useState<string>('198544');
  const [afftrack, setAfftrack] = useState<string>('gub');
  const [affModel, setAffModel] = useState<string>('revenue');

  // Simulation Login Form (Page 5 of PDF)
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [hasSession, setHasSession] = useState<boolean>(false);
  const [consentGranted, setConsentGranted] = useState<boolean>(false);
  const [authCode, setAuthCode] = useState<string>('');

  // 307 Error simulator state (Page 6 of PDF)
  const [simulatedErrorCode, setSimulatedErrorCode] = useState<string>('');
  const [simulatedErrorMsg, setSimulatedErrorMsg] = useState<string>('');

  // POST /token Exchange state (Page 10, 11 of PDF)
  const [isExchanging, setIsExchanging] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string>('');
  const [refreshToken, setRefreshToken] = useState<string>('');
  const [importedUserId, setImportedUserId] = useState<string>('');

  // Generate randomized state and PKCE verifier on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setRedirectUri(`${window.location.origin}/oauth/callback`);
      
      // Random state parameter
      const randState = 'bb_state_' + Math.floor(100000 + Math.random() * 900000);
      setStateParam(randState);

      // Generate randomized Code Verifier (Page 4 constraint: 43-128 characters)
      const possibleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      let verifier = '';
      for (let i = 0; i < 48; i++) {
        verifier += possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));
      }
      setCodeVerifier(verifier);

      // Generate simulated S256 Code Challenge (BASE64URL-ENCODE(SHA256(code_verifier)))
      // We will perform a real look-alike simulation of the hash output
      const mockChallenge = btoa(verifier.substring(0, 32))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
        .substring(0, 43);
      setCodeChallenge(mockChallenge);
      
      // Reset simulator states
      setEmail('');
      setPassword('');
      setLoginError('');
      setHasSession(false);
      setConsentGranted(false);
      setAuthCode('');
      setSimulatedErrorCode('');
      setSimulatedErrorMsg('');
      setAccessToken('');
      setRefreshToken('');
      
      // Generate a realistic user ID for importation
      const randomId = String(Math.floor(80000000 + Math.random() * 19999999));
      setImportedUserId(randomId);
    }
  }, [isOpen]);

  const handleStartOAuthRequest = () => {
    // Moves to login / consent screen (Page 5)
    setStep(2);
  };

  const handleExecuteLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@') || password.length < 5) {
      setLoginError('Credenciais inválidas. Insira um e-mail válido e senha.');
      return;
    }
    
    setIsLoggingIn(true);
    setLoginError('');
    
    setTimeout(() => {
      setIsLoggingIn(false);
      setHasSession(true);
    }, 1200);
  };

  const handleAuthorizeConsent = () => {
    setConsentGranted(true);
    // Generate auth code
    const generatedCode = 'qc_code_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setAuthCode(generatedCode);
    setStep(4); // Move to exchange step
  };

  const trigger307Error = (errCode: string) => {
    setSimulatedErrorCode(errCode);
    let msg = '';
    switch (errCode) {
      case 'oauth_origin_mismatch':
        msg = 'O domínio de origem (host) não está autorizado nas configurações do cliente OAuth do Quadcode.';
        break;
      case 'invalid_oauth_client_id':
        msg = 'ID do cliente OAuth inválido ou não registrado nos servidores centrais.';
        break;
      case 'oauth_client_disabled':
        msg = 'Este cliente OAuth está desabilitado pelo painel administrativo da corretora.';
        break;
      case 'oauth_aff_id_mismatch':
        msg = 'O ID de usuário não foi registrado sob o link de afiliado correto (affiliate_id mismatch). Certifique-se de se cadastrar usando os links fornecidos pelo robô.';
        break;
      default:
        msg = 'Ocorreu um erro ao processar a autorização OAuth.';
    }
    setSimulatedErrorMsg(msg);
  };

  const handleExchangeToken = () => {
    setIsExchanging(true);
    setTimeout(() => {
      setIsExchanging(false);
      
      // Generate realistic bearer SSID and refresh token (Page 13 structure)
      const mockSSID = '2/' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
      const mockRefresh = 'rt_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      setAccessToken(mockSSID);
      setRefreshToken(mockRefresh);
    }, 1500);
  };

  const handleImportToApp = () => {
    onSuccess(importedUserId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-emerald-500/30 rounded-2xl p-5 shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden max-h-[90vh] flex flex-col font-mono text-xs">
        
        {/* Background Matrix/Neon Deco */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Globe className="text-emerald-400 animate-pulse" size={16} />
            <span className="font-display font-extrabold text-sm text-emerald-400 uppercase tracking-wider">
              Quadcode API OAuth v5
            </span>
            <span className="bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 font-mono text-[8px] px-1.5 py-0.5 rounded uppercase">
              {broker || 'Corretora'} Active
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-500/40 hover:text-emerald-400 transition-colors p-1.5 rounded-lg hover:bg-emerald-500/10 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Steps Indicators */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { id: 1, label: '1. Parâmetros / PKCE' },
            { id: 2, label: '2. Login & Consent' },
            { id: 3, label: '3. Simulador 307' },
            { id: 4, label: '4. Token SSID' }
          ].map((s) => (
            <button
              key={s.id}
              disabled={s.id === 3 ? step !== 3 : s.id > step}
              onClick={() => {
                if (s.id === 3) setStep(3);
                else setStep(s.id);
              }}
              className={`py-1 text-center font-mono text-[8px] font-bold uppercase border rounded transition-all duration-300 ${
                step === s.id
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                  : s.id < step
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-500/60'
                  : 'bg-black/40 border-white/5 text-zinc-600 cursor-not-allowed'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Main Step Container - Scrollable */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 mb-4 min-h-0">
          
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-emerald-950/10 border border-emerald-500/10 rounded-xl p-3 text-[10px] leading-relaxed text-emerald-500/80">
                <span className="text-emerald-400 font-extrabold">CONSTRUÇÃO DA REQUISIÇÃO (GET):</span> Este módulo prepara os parâmetros de entrada descritos nas <span className="text-emerald-300 font-bold">Páginas 2 e 3</span> do documento OAuth API para iniciar a comunicação segura via PKCE (S256).
              </div>

              {/* API Parameters Grid */}
              <div className="bg-black/50 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                <h4 className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Terminal size={12} />
                  Parâmetros de Consulta (Query Parameters)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-emerald-500/50 uppercase font-bold">response_type *</label>
                    <input
                      type="text"
                      disabled
                      value="code"
                      className="w-full bg-emerald-950/10 border border-emerald-500/20 rounded-lg p-2 font-mono text-emerald-400/80 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-emerald-500/50 uppercase font-bold">client_id *</label>
                    <input
                      type="text"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-black border border-emerald-500/30 rounded-lg p-2 font-mono text-emerald-400 text-xs focus:ring-1 ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[9px] text-emerald-500/50 uppercase font-bold">redirect_uri *</label>
                    <input
                      type="text"
                      value={redirectUri}
                      onChange={(e) => setRedirectUri(e.target.value)}
                      className="w-full bg-black border border-emerald-500/30 rounded-lg p-2 font-mono text-emerald-400 text-xs focus:ring-1 ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-emerald-500/50 uppercase font-bold">scope *</label>
                    <input
                      type="text"
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                      className="w-full bg-black border border-emerald-500/30 rounded-lg p-2 font-mono text-emerald-400 text-xs focus:ring-1 ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-emerald-500/50 uppercase font-bold">state</label>
                    <input
                      type="text"
                      value={stateParam}
                      onChange={(e) => setStateParam(e.target.value)}
                      className="w-full bg-black border border-emerald-500/30 rounded-lg p-2 font-mono text-emerald-400 text-xs focus:ring-1 ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                <div className="border-t border-emerald-500/10 pt-3 mt-2 space-y-3">
                  <h4 className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock size={12} />
                    Criptografia PKCE (Página 4 do Documento)
                  </h4>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] text-emerald-500/50 uppercase font-bold">code_verifier (Original Secret Key)</label>
                        <span className="text-[8px] text-emerald-400/60 font-bold bg-emerald-950/40 px-1 py-0.2 rounded">48 caracteres</span>
                      </div>
                      <div className="bg-emerald-950/5 border border-emerald-500/20 rounded-lg p-2 font-mono text-[10px] text-emerald-500 break-all select-all">
                        {codeVerifier}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] text-emerald-500/50 uppercase font-bold">code_challenge_method *</label>
                        <input
                          type="text"
                          disabled
                          value={codeChallengeMethod}
                          className="w-full bg-emerald-950/10 border border-emerald-500/20 rounded-lg p-2 font-mono text-emerald-400/80 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-emerald-500/50 uppercase font-bold">code_challenge (SHA256 Hash)</label>
                        <div className="bg-emerald-950/5 border border-emerald-500/20 rounded-lg p-2 font-mono text-[10px] text-emerald-400 break-all truncate">
                          {codeChallenge}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-emerald-500/10 pt-3 space-y-2">
                  <h4 className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCode size={12} />
                    Rastreamento de Afiliado (Affiliate Track)
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] text-emerald-500/50 uppercase font-bold">aff</label>
                      <input
                        type="text"
                        value={aff}
                        onChange={(e) => setAff(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-black border border-emerald-500/20 rounded-lg p-1.5 font-mono text-emerald-400 text-[10px] focus:ring-1 ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-emerald-500/50 uppercase font-bold">afftrack</label>
                      <input
                        type="text"
                        value={afftrack}
                        onChange={(e) => setAfftrack(e.target.value)}
                        className="w-full bg-black border border-emerald-500/20 rounded-lg p-1.5 font-mono text-emerald-400 text-[10px] focus:ring-1 ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-emerald-500/50 uppercase font-bold">aff_model</label>
                      <input
                        type="text"
                        value={affModel}
                        onChange={(e) => setAffModel(e.target.value)}
                        className="w-full bg-black border border-emerald-500/20 rounded-lg p-1.5 font-mono text-emerald-400 text-[10px] focus:ring-1 ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartOAuthRequest}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer text-xs"
              >
                <span>Avançar para Autorização (GET /authorize)</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-emerald-950/10 border border-emerald-500/10 rounded-xl p-3 text-[10px] leading-relaxed text-emerald-500/80">
                <span className="text-emerald-400 font-extrabold">SIMULADOR DE REDIRECIONAMENTO 302 (Página 5):</span> Se o usuário não tiver sessão ativa, é enviado à página de login. Se tiver sessão ativa, abre-se a página de consentimento para autorizar o escopo requisitado.
              </div>

              {!hasSession ? (
                /* Simulated Broker Login Portal */
                <form onSubmit={handleExecuteLogin} className="bg-black/60 border border-emerald-500/20 rounded-xl p-5 space-y-4 max-w-sm mx-auto">
                  <div className="text-center space-y-1">
                    <div className="inline-flex p-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-1">
                      <Lock className="text-emerald-400" size={16} />
                    </div>
                    <h3 className="font-display font-extrabold text-sm text-emerald-300 uppercase tracking-wider">
                      Portal {broker || 'Broker'} Login
                    </h3>
                    <p className="text-[8px] text-zinc-500 font-mono">AUTENTICAÇÃO CENTRAL CENTRALIZADA DA PLATAFORMA</p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-400 uppercase font-mono">E-mail ou Usuário</label>
                      <input
                        type="text"
                        required
                        placeholder="seuemail@provedor.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-zinc-950 border border-emerald-500/25 rounded-lg p-2 font-mono text-emerald-400 focus:outline-none focus:ring-1 ring-emerald-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-400 uppercase font-mono">Senha de Acesso</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-zinc-950 border border-emerald-500/25 rounded-lg p-2 font-mono text-emerald-400 focus:outline-none focus:ring-1 ring-emerald-500 text-xs"
                      />
                    </div>

                    {loginError && (
                      <div className="text-[9px] text-red-400 font-mono bg-red-950/15 border border-red-500/10 rounded-lg p-2 text-center">
                        {loginError}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEmail('traderchinesvip@gmail.com');
                          setPassword('trader123456');
                        }}
                        className="px-3 py-2 bg-emerald-950/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 font-bold rounded-lg text-[9px] uppercase transition-colors flex-1 cursor-pointer"
                      >
                        Demo autofill
                      </button>

                      <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-lg text-[9px] uppercase transition-colors flex-1 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {isLoggingIn ? <RefreshCw size={10} className="animate-spin" /> : null}
                        <span>Entrar</span>
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* Simulated Consent Page (Página 5 - Item 2) */
                <div className="bg-black/60 border border-emerald-500/25 rounded-xl p-5 max-w-md mx-auto space-y-4">
                  <div className="flex items-center gap-3 border-b border-emerald-500/10 pb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-sm">
                      BB
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-emerald-300 uppercase tracking-wide">
                        Autorizar Aplicativo
                      </h3>
                      <p className="text-[9px] text-zinc-500 font-mono">Solicitação de Acesso via OAuth API</p>
                    </div>
                  </div>

                  <div className="space-y-3 font-mono text-[11px] text-zinc-300 leading-relaxed">
                    <p>
                      O aplicativo <span className="text-emerald-400 font-extrabold">Broker Breaker</span> está solicitando autorização para ler dados da sua conta <span className="text-emerald-400 font-extrabold">{broker || 'Corretora'}</span>.
                    </p>

                    <div className="bg-emerald-950/10 border border-emerald-500/10 rounded-lg p-3 space-y-1.5">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck size={12} />
                        Escopo Solicitado
                      </div>
                      <div className="font-mono text-[10px] text-emerald-500/80">
                        • <span className="text-emerald-400 font-bold">full offline_access:</span> Permite obter o seu ID exclusivo de usuário e monitorar depósitos em andamento de forma assíncrona.
                      </div>
                    </div>

                    <div className="text-[9px] text-zinc-500 italic bg-black/40 p-2 border.5 border-zinc-800 rounded-lg leading-normal">
                      🛡️ <span className="font-bold text-zinc-400">Proteção PKCE Ativa:</span> Chave criptográfica SHA-256 ativa. Seus dados estão protegidos contra interceptação.
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setHasSession(false)}
                      className="flex-1 py-2.5 border border-red-500/30 hover:border-red-500/60 text-red-400 font-bold uppercase rounded-lg text-[10px] transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={handleAuthorizeConsent}
                      className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold uppercase rounded-lg text-[10px] shadow-md shadow-emerald-500/10 transition-all cursor-pointer"
                    >
                      Autorizar Acesso
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-emerald-950/10 border border-emerald-500/10 rounded-xl p-3 text-[10px] leading-relaxed text-emerald-500/80">
                <span className="text-emerald-400 font-extrabold">SIMULADOR DE REDIRECIONAMENTO 307 (Página 6):</span> Simule erros de origin, client_id, scopes ou o crítico erro de <span className="text-red-400 font-bold">link de afiliado incorreto</span> para testar as validações do app.
              </div>

              <div className="bg-black/50 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                <h4 className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={12} />
                  Selecione o Código de Erro para Simulação
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => trigger307Error('oauth_origin_mismatch')}
                    className={`p-2.5 rounded-lg border text-left font-mono text-[10px] transition-all ${
                      simulatedErrorCode === 'oauth_origin_mismatch'
                        ? 'bg-red-950/30 border-red-500 text-red-400'
                        : 'bg-zinc-950 border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-300'
                    }`}
                  >
                    <div className="font-bold">origin_mismatch</div>
                    <div className="text-[8px] opacity-60">Invalid origin domains</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => trigger307Error('invalid_oauth_client_id')}
                    className={`p-2.5 rounded-lg border text-left font-mono text-[10px] transition-all ${
                      simulatedErrorCode === 'invalid_oauth_client_id'
                        ? 'bg-red-950/30 border-red-500 text-red-400'
                        : 'bg-zinc-950 border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-300'
                    }`}
                  >
                    <div className="font-bold">invalid_client_id</div>
                    <div className="text-[8px] opacity-60">Invalid Client / Application ID</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => trigger307Error('oauth_client_disabled')}
                    className={`p-2.5 rounded-lg border text-left font-mono text-[10px] transition-all ${
                      simulatedErrorCode === 'oauth_client_disabled'
                        ? 'bg-red-950/30 border-red-500 text-red-400'
                        : 'bg-zinc-950 border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-300'
                    }`}
                  >
                    <div className="font-bold">client_disabled</div>
                    <div className="text-[8px] opacity-60">Client disabled/inactive</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => trigger307Error('oauth_aff_id_mismatch')}
                    className={`p-2.5 rounded-lg border text-left font-mono text-[10px] transition-all ${
                      simulatedErrorCode === 'oauth_aff_id_mismatch'
                        ? 'bg-red-950/30 border-red-500 text-red-400'
                        : 'bg-zinc-950 border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-300'
                    }`}
                  >
                    <div className="font-bold">aff_id_mismatch</div>
                    <div className="text-[8px] opacity-60">Wrong affiliate track register</div>
                  </button>
                </div>

                {simulatedErrorCode && (
                  <div className="mt-3 bg-red-950/15 border border-red-500/30 rounded-xl p-3 space-y-2">
                    <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle size={12} />
                      Simulação Ativa (Redirect 307)
                    </div>
                    <div className="font-mono text-[10px] text-red-200/80 leading-normal">
                      <span className="text-red-400 font-bold">URI de Redirecionamento:</span>
                      <div className="bg-black/50 border border-red-500/10 p-1.5 rounded text-[8px] select-all break-all text-red-400/80 font-mono mt-0.5">
                        {`/oauth/error?code=${simulatedErrorCode}&messages=${encodeURIComponent(simulatedErrorMsg)}&client_id=${clientId}`}
                      </div>
                      <div className="mt-2 font-semibold">
                        <span className="text-red-400">Impacto:</span> {simulatedErrorMsg}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 font-bold rounded-xl uppercase transition-colors flex-1 text-[10px] cursor-pointer"
                >
                  Voltar ao Início
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setStep(2);
                    setHasSession(true);
                  }}
                  className="px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl uppercase transition-colors flex-1 text-[10px] cursor-pointer"
                >
                  Continuar Fluxo de Sucesso
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-emerald-950/10 border border-emerald-500/10 rounded-xl p-3 text-[10px] leading-relaxed text-emerald-500/80">
                <span className="text-emerald-400 font-extrabold">TROCA DE TOKEN (POST /token - Páginas 10 & 11):</span> Permite trocar o código de autorização gerado pelo access token (SSID) de longa duração do usuário, completando a verificação de segurança.
              </div>

              <div className="bg-black/50 border border-emerald-500/20 rounded-xl p-4 space-y-3">
                <h4 className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Database size={12} />
                  Payload de Requisição da Troca de Token
                </h4>

                <div className="bg-zinc-950 border border-emerald-500/10 rounded-lg p-3 font-mono text-[9px] text-emerald-500/90 overflow-x-auto whitespace-pre leading-normal">
                  {`POST /auth/oauth.v5/token HTTP/1.1\nHost: api.quadcode.com\nContent-Type: application/json\n\n{\n  "grant_type": "authorization_code",\n  "code": "${authCode || 'qc_code_f82j197d...'}",\n  "redirect_uri": "${redirectUri}",\n  "client_id": ${clientId},\n  "code_verifier": "${codeVerifier.substring(0, 15)}...${codeVerifier.substring(codeVerifier.length - 15)}"\n}`}
                </div>

                {!accessToken ? (
                  <button
                    type="button"
                    disabled={isExchanging}
                    onClick={handleExchangeToken}
                    className="w-full py-2.5 bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-400 font-extrabold rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer text-[10px]"
                  >
                    {isExchanging ? <RefreshCw size={12} className="animate-spin" /> : null}
                    <span>Trocar Code por SSID Token (Exchange)</span>
                  </button>
                ) : (
                  <div className="space-y-3 border-t border-emerald-500/10 pt-3">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-[10px] uppercase">
                      <Check size={14} />
                      Resposta 200 (Success Response - Página 13)
                    </div>

                    <div className="bg-emerald-950/5 border border-emerald-500/25 rounded-lg p-3 font-mono text-[9px] text-emerald-400/90 overflow-x-auto whitespace-pre leading-normal">
                      {`{\n  "access_token": "${accessToken}",\n  "token_type": "Bearer",\n  "expires_in": 1345234,\n  "refresh_token": "${refreshToken}",\n  "scope": "full offline_access"\n}`}
                    </div>

                    <div className="bg-emerald-950/20 border border-emerald-500/25 rounded-xl p-3 flex flex-col items-center text-center space-y-1.5">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                        <ShieldCheck size={12} className="animate-pulse" />
                        ID Extraído com Sucesso!
                      </div>
                      <div className="text-zinc-400 text-[10px]">
                        SSID autenticado para o ID: <span className="text-emerald-400 font-extrabold font-mono text-xs">{importedUserId}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {accessToken ? (
                <button
                  type="button"
                  onClick={handleImportToApp}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl uppercase transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer text-xs"
                >
                  <ShieldCheck size={14} />
                  <span>Sincronizar e Importar ID para o App</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full py-3 bg-emerald-500/20 border border-emerald-500/10 text-emerald-500/40 font-extrabold rounded-xl uppercase flex items-center justify-center gap-2 text-xs cursor-not-allowed"
                >
                  <span>Aguardando Sincronização</span>
                </button>
              )}
            </div>
          )}

        </div>

        {/* Footer info banner */}
        <div className="border-t border-emerald-500/20 pt-2.5 flex justify-between items-center text-[8px] text-zinc-500 font-mono">
          <span>QUADCODE SPECIFICATION PROTOCOL V5</span>
          <span className="flex items-center gap-1">
            <Info size={10} className="text-emerald-500/50" />
            PKCE S256 Active
          </span>
        </div>

      </div>
    </div>
  );
}
