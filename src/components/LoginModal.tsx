import React, { useState } from 'react';
import { Mail, Shield, Sparkles, LogIn, Key } from 'lucide-react';

interface LoginModalProps {
  onLogin: (email: string) => void;
  defaultEmail?: string;
}

export default function LoginModal({ onLogin, defaultEmail = '' }: LoginModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCheckoutCard, setShowCheckoutCard] = useState(false);

  const isAdminEmail = email.trim().toLowerCase() === 'admin123@resina.com';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Por favor, insira seu e-mail.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }

    if (isAdminEmail && !password) {
      setError('Este e-mail exige inserção de senha administrativa.');
      return;
    }

    setError('');
    setIsLoading(true);
    setShowCheckoutCard(false);

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password: isAdminEmail ? password : undefined
      })
    })
    .then(async res => {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return res.json();
      }
      const text = await res.text();
      throw new Error(`Resposta inesperada do servidor: ${text.substring(0, 100)}`);
    })
    .then(data => {
      setIsLoading(false);
      if (data.success) {
        onLogin(email.trim().toLowerCase());
      } else {
        setError(data.message || 'Seu acesso expirou ou está inativo.');
        if (data.errorType === 'expired' || data.errorType === 'non_existent' || data.errorType === 'inactive') {
          setShowCheckoutCard(true);
        }
      }
    })
    .catch(err => {
      console.error(err);
      setIsLoading(false);
      setError('Erro de comunicação com o servidor de acessos.');
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0b0d]/95 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#18191d] rounded-2xl border border-zinc-800 shadow-2xl p-8 overflow-hidden relative">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#4f46e5]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#ec4899]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center mb-8 text-center relative z-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/10 mb-4 transform rotate-3">
            <Sparkles className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent font-space">
            ResinApp
          </h1>
          <p className="text-xs text-zinc-400 mt-2 max-w-xs">
            Crie, ajuste e imprima moldes de chaveiro em tamanho exato de forma simples e rápida!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10" id="login-form">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2 font-mono">
              Seu E-mail de Trabalho (Membro)
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 font-normal" />
              <input
                id="email-input"
                type="email"
                required
                disabled={isLoading}
                className="w-full pl-11 pr-4 py-3.5 bg-zinc-900 border border-zinc-850 focus:border-indigo-505 rounded-xl text-white text-sm placeholder-zinc-650 outline-none transition-all duration-200"
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) {
                    setError('');
                    setShowCheckoutCard(false);
                  }
                }}
              />
            </div>
          </div>

          {/* Reveal Admin password only if email is admin123@resina.com */}
          {isAdminEmail && (
            <div className="animate-in fade-in slide-in-from-top-3 duration-200">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2 font-mono">
                Senha de Administrador (Admin Password)
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 font-normal" />
                <input
                  id="password-input"
                  type="password"
                  required
                  disabled={isLoading}
                  className="w-full pl-11 pr-4 py-3.5 bg-zinc-900 border border-zinc-850 focus:border-indigo-550 rounded-xl text-white text-sm outline-none transition-all duration-200 font-mono"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-xs flex items-start gap-1 font-sans leading-relaxed">
                <span className="shrink-0 mt-0.5">⚠</span>
                <span>{error}</span>
              </p>
            </div>
          )}

          {/* Lowify Checkout Promotion for expired or inactive user accounts */}
          {showCheckoutCard && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <p className="text-[11px] text-emerald-400 leading-relaxed font-sans">
                Seu acesso expirou ou não está cadastrado em nosso sistema de vendas. Compre agora ou renove o seu plano anual de 1 ano pelo Checkout Oficial Lowify:
              </p>
              <a
                href="https://pay.lowify.com.br/go.php?offer=s38yxvz"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-center block text-xs py-2.5 px-3 rounded-xl transition-all shadow-md shadow-emerald-600/10"
              >
                Adquirir Plano de 1 Ano (Checkout Lowify)
              </a>
            </div>
          )}

          <button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>Entrar no Editor</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800/80 text-center relative z-10">
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
            <Shield className="w-4 h-4 text-zinc-405" />
            <span>Seus moldes são guardados online associados ao seu e-mail.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
