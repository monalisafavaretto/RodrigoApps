import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Trash2, Edit2, ShieldAlert, Wifi, Search, 
  X, Check, AlertCircle, RefreshCw, Calendar, Mail, FileText, 
  CheckCircle, Plus, Eye, History, Shield, Globe
} from 'lucide-react';

const safeJson = (res: Response) => {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res.text().then(text => {
    throw new Error(`Resposta inesperada do servidor: ${text.substring(0, 100)}`);
  });
};

interface AdminPanelProps {
  onClose: () => void;
  adminEmail: string;
}

interface User {
  email: string;
  active: number;
  status: string;
  source: string;
  plan_key: string;
  plan_name: string;
  plan_limit: number;
  is_recurring: number;
  access_start: string;
  access_end: string;
  no_access_end: number;
  purchase_count: number;
  generated_count: number;
  total_generated_count: number;
  last_generated_at: string;
  billing_cycle_start: string;
  billing_cycle_end: string;
  next_reset_at: string;
  updated_at: string;
}

interface WebhookLog {
  id: string;
  date: string;
  source: string;
  email: string;
  status: string;
  plan_detected: string;
  payload: any;
}

interface BlockedLog {
  date: string;
  email: string;
  reason: string;
  ip: string;
  userAgent: string;
}

export default function AdminPanel({ onClose, adminEmail }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [blockedLogs, setBlockedLogs] = useState<BlockedLog[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'inactive' | 'recurrent'>('all');
  
  // Edit Form Fields
  const [isEditing, setIsEditing] = useState(false);
  const [editingEmail, setEditingEmail] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formStatus, setFormStatus] = useState('approved');
  const [formSource, setFormSource] = useState('manual');
  const [formPlanKey, setFormPlanKey] = useState('unlimited');
  const [formIsRecurring, setFormIsRecurring] = useState(true);
  const [formAccessStart, setFormAccessStart] = useState('');
  const [formAccessEnd, setFormAccessEnd] = useState('');
  const [formNoAccessEnd, setFormNoAccessEnd] = useState(true);
  const [formPurchaseCount, setFormPurchaseCount] = useState(1);
  const [formGeneratedCount, setFormGeneratedCount] = useState(0);
  const [formTotalGeneratedCount, setFormTotalGeneratedCount] = useState(0);
  
  // Notification states
  const [toastMessage, setToastMessage] = useState('');
  const [selectedLogPayload, setSelectedLogPayload] = useState<any | null>(null);

  const fetchAdminData = () => {
    setIsLoading(true);
    fetch(`/api/admin/data?admin_email=${encodeURIComponent(adminEmail)}`)
      .then(safeJson)
      .then(data => {
        setUsers(data.users || []);
        setWebhookLogs((data.webhookLogs || []).reverse()); // newest first
        setBlockedLogs((data.blockedLogs || []).reverse());
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        showToast('Erro ao carregar dados administrativos.');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchAdminData();
  }, [adminEmail]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Pre-fill form to add new or edit existing user
  const handleStartAddUser = () => {
    setIsEditing(true);
    setEditingEmail('');
    setFormEmail('');
    setFormActive(true);
    setFormStatus('approved');
    setFormSource('manual');
    setFormPlanKey('unlimited');
    setFormIsRecurring(false); // Default is false to enforce set expiry
    
    const todayStr = new Date().toISOString().split('T')[0];
    setFormAccessStart(todayStr);

    const baseDate = new Date();
    baseDate.setFullYear(baseDate.getFullYear() + 1);
    const oneYearLaterStr = baseDate.toISOString().split('T')[0];
    
    setFormAccessEnd(oneYearLaterStr);
    setFormNoAccessEnd(false); // Will respect default 1 year end date
    setFormPurchaseCount(1);
    setFormGeneratedCount(0);
    setFormTotalGeneratedCount(0);
  };

  const handleStartEditUser = (user: User) => {
    setIsEditing(true);
    setEditingEmail(user.email);
    setFormEmail(user.email);
    setFormActive(user.active === 1);
    setFormStatus(user.status || 'approved');
    setFormSource(user.source || 'manual');
    setFormPlanKey(user.plan_key || 'unlimited');
    setFormIsRecurring(user.is_recurring === 1);
    setFormAccessStart(user.access_start || new Date().toISOString().split('T')[0]);
    setFormAccessEnd(user.access_end || '');
    setFormNoAccessEnd(user.no_access_end === 1 || user.is_recurring === 1);
    setFormPurchaseCount(user.purchase_count || 1);
    setFormGeneratedCount(user.generated_count || 0);
    setFormTotalGeneratedCount(user.total_generated_count || 0);
  };

  const handleDeleteUser = (email: string) => {
    if (!confirm(`Tem certeza que deseja remover o acesso para o e-mail: ${email}?`)) {
      return;
    }
    fetch(`/api/admin/users/${encodeURIComponent(email)}?admin_email=${encodeURIComponent(adminEmail)}`, {
      method: 'DELETE'
    })
      .then(safeJson)
      .then(data => {
        if (data.success) {
          showToast('Usuário removido com sucesso!');
          fetchAdminData();
          if (isEditing && editingEmail === email) {
            setIsEditing(false);
          }
        }
      })
      .catch(err => {
        console.error(err);
        showToast('Falha ao deletar usuário.');
      });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim()) {
      alert('Por favor, informe o e-mail do usuário.');
      return;
    }

    const payloadUser = {
      email: formEmail.trim().toLowerCase(),
      active: formActive ? 1 : 0,
      status: formStatus,
      source: formSource,
      plan_key: formPlanKey,
      is_recurring: formIsRecurring ? 1 : 0,
      access_start: formAccessStart,
      access_end: (formIsRecurring || formNoAccessEnd) ? '' : formAccessEnd,
      no_access_end: (formIsRecurring || formNoAccessEnd) ? 1 : 0,
      purchase_count: Number(formPurchaseCount),
      generated_count: Number(formGeneratedCount),
      total_generated_count: Math.max(Number(formTotalGeneratedCount), Number(formGeneratedCount))
    };

    fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admin_email: adminEmail,
        user: payloadUser
      })
    })
      .then(safeJson)
      .then(data => {
        if (data.success) {
          showToast(editingEmail ? 'Usuário atualizado!' : 'Novo usuário adicionado!');
          setIsEditing(false);
          fetchAdminData();
        } else {
          alert('Erro ao salvar usuário.');
        }
      })
      .catch(err => {
        console.error(err);
        alert('Erro ao conectar com o servidor para salvar.');
      });
  };

  // Sync dates input logic like the wordpress snippet.
  useEffect(() => {
    if (formIsRecurring) {
      setFormNoAccessEnd(true);
      setFormAccessEnd('');
    }
  }, [formIsRecurring]);

  // Calculations for stats layout
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.active === 1).length;
  const disabledUsers = users.filter(u => u.active === 0).length;
  const basicCount = users.filter(u => u.plan_key === 'basic').length;
  const starterCount = users.filter(u => u.plan_key === 'starter').length;
  const unlimitedCount = users.filter(u => u.plan_key === 'unlimited').length;

  const filteredUsers = users.filter(u => {
    const searchMatch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (u.plan_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (u.source || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!searchMatch) return false;
    
    if (filterMode === 'active') return u.active === 1;
    if (filterMode === 'inactive') return u.active === 0;
    if (filterMode === 'recurrent') return u.is_recurring === 1;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0c10] text-zinc-100 overflow-hidden font-sans">
      
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-indigo-600 border border-indigo-400 text-white px-5 py-3 rounded-xl shadow-2xl z-55 flex items-center gap-2 duration-300 animate-bounce text-sm font-semibold">
          <CheckCircle className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Admin Header */}
      <header className="h-16 bg-[#12131a] border-b border-zinc-800 flex items-center justify-between px-6 shrink-0 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-tr from-pink-600 to-indigo-600 text-white flex items-center justify-center rounded-xl font-black shadow-md rotate-3">
            AD
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider text-white">
              Painel de Licenças & Segurança
            </h1>
            <p className="text-[10px] text-zinc-450 font-mono">
              admin123@resina.com • Webhook sincronizado
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAdminData}
            title="Atualizar dados"
            className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 hover:text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Fechar Painel</span>
          </button>
        </div>
      </header>

      {/* Main Panel Content Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Webhook Connection Success Notification Card */}
        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">
                Webhook Receptador Pronto para Uso (Lowify)
              </h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                Configure esta URL no painel de checkout do seu integrador (Lowify). Qualquer compra aprovada cria e ativa o acesso do e-mail do cliente automaticamente por 1 ano. 
              </p>
              <div className="mt-3.5 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider w-20">Link Vercel:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-zinc-900 px-3 py-1.5 border border-zinc-800 rounded-lg select-all text-white font-bold leading-none">
                      https://resinapp-mu.vercel.app/api/webhook
                    </span>
                    <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-full font-mono uppercase">
                      Vercel Prod
                    </span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider w-20">Link Atual:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-zinc-950 px-3 py-1.5 border border-zinc-850 rounded-lg select-all text-zinc-300 font-semibold leading-none">
                      {window.location.origin}/api/webhook
                    </span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full font-mono uppercase">
                      Ativo
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Admin Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#12131a] border border-zinc-850 p-4.5 rounded-xl">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-mono font-bold">Total de Membros</span>
            <div className="text-2xl font-black text-white mt-1">{totalUsers}</div>
            <p className="text-[9px] text-zinc-500 mt-1">E-mails cadastrados</p>
          </div>
          
          <div className="bg-[#12131a] border border-zinc-850 p-4.5 rounded-xl border-l-4 border-l-emerald-600">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-mono font-bold">Acessos Ativos</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">{activeUsers}</div>
            <p className="text-[9px] text-emerald-500/80 mt-1">Sincronizados e liberados</p>
          </div>

          <div className="bg-[#12131a] border border-zinc-850 p-4.5 rounded-xl border-l-4 border-l-rose-500">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-mono font-bold">Inativos / Expirados</span>
            <div className="text-2xl font-zinc-200 mt-1 font-black text-zinc-400">{disabledUsers}</div>
            <p className="text-[9px] text-zinc-500 mt-1">Acesso suspenso ou vencido</p>
          </div>

          <div className="bg-[#12131a] border border-zinc-850 p-4.5 rounded-xl border-l-4 border-l-amber-500">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-mono font-bold flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              Tentativas Recusadas
            </span>
            <div className="text-2xl font-black text-amber-450 mt-1">{blockedLogs.length}</div>
            <p className="text-[9px] text-zinc-500 mt-1">IPs e acessos bloqueados</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main User List Section (Takes up 2/3 of grid space) */}
          <section className="lg:col-span-2 bg-[#12131a] border border-zinc-850 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-[#a5b4fc] flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-indigo-400" />
                Membros Cadastrados ({filteredUsers.length})
              </h2>
              
              <button
                onClick={handleStartAddUser}
                className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Registrar Acesso Manual</span>
              </button>
            </div>

            {/* User Filters & Search Toolbar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Pesquisar e-mail, plano ou origem..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0a0b0d] border border-zinc-800 focus:border-indigo-505 rounded-lg pl-9.5 pr-4 py-2 text-xs outline-none text-zinc-100 transition-all placeholder-zinc-600"
                />
              </div>

              <div className="flex bg-[#0a0b0d] p-0.5 border border-zinc-800 rounded-lg gap-0.5 select-none">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-colors cursor-pointer ${filterMode === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilterMode('active')}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-colors cursor-pointer ${filterMode === 'active' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Ativos
                </button>
                <button
                  onClick={() => setFilterMode('inactive')}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-colors cursor-pointer ${filterMode === 'inactive' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Exp/Inat
                </button>
                <button
                  onClick={() => setFilterMode('recurrent')}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-colors cursor-pointer ${filterMode === 'recurrent' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Recorrente
                </button>
              </div>
            </div>

            {/* Main Users Table Layout */}
            <div className="overflow-x-auto min-h-60 border border-zinc-850/60 rounded-lg bg-[#0a0b0d]">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="bg-zinc-900/80 border-b border-zinc-850 text-zinc-400 font-mono text-[9px] uppercase tracking-wider">
                    <th className="py-3 px-4">Usuário / Email</th>
                    <th className="py-3 px-3">Plano</th>
                    <th className="py-3 px-2 text-center">Status</th>
                    <th className="py-3 px-2">Histórico</th>
                    <th className="py-3 px-2">Validade</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-90 w-full">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-zinc-500">
                        <div className="w-6 h-6 border-2 border-indigo-500/25 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                        Carregando registros...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-zinc-500">
                        Nenhum membro encontrado correspondente aos filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isExpired = user.access_end && !user.no_access_end && (new Date().toISOString().split('T')[0] > user.access_end);
                      return (
                        <tr key={user.email} className={`hover:bg-zinc-900/40 transition-colors ${user.email === 'admin123@resina.com' ? 'bg-indigo-950/10' : ''}`}>
                          <td className="py-3.5 px-4 font-semibold text-zinc-200">
                            <span className="block truncate max-w-[170px]" title={user.email}>{user.email}</span>
                            <span className="text-[10px] text-zinc-550 font-mono font-normal">Origem: {user.source || 'Não identificada'}</span>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2 py-0.5 rounded-full font-bold text-[9px] font-mono leading-none bg-indigo-550/10 text-[#818cf8] border border-indigo-500/20">
                              Acesso Total
                            </span>
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            {user.active === 1 && !isExpired ? (
                              <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">Ativo</span>
                            ) : (
                              <span className="bg-rose-500/15 text-rose-400 text-[10px] font-black px-2 py-0.5 rounded-md uppercase">Expirado</span>
                            )}
                          </td>
                          <td className="py-3.5 px-2 text-zinc-400 font-mono font-medium text-[10px]">
                            <span>{user.generated_count || 0} / Total: {user.total_generated_count || 0}</span>
                          </td>
                          <td className="py-3.5 px-2 font-mono text-[10px] text-zinc-400 leading-tight">
                            {user.no_access_end === 1 || user.is_recurring === 1 ? (
                              <span className="text-emerald-500 font-bold uppercase text-[9px]">S/ Fim</span>
                            ) : (
                              <span className="block text-zinc-450">{user.access_end || 'Indefinido'}</span>
                            )}
                            <span className="text-[8px] text-zinc-600 block">Início: {user.access_start || '-'}</span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleStartEditUser(user)}
                                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 rounded text-zinc-400 hover:text-[#818cf8] transition-colors cursor-pointer border border-transparent"
                                title="Editar Licença"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              
                              {/* Keep admin account deletion disabled to prevent self lock out */}
                              {user.email !== 'admin123@resina.com' ? (
                                <button
                                  onClick={() => handleDeleteUser(user.email)}
                                  className="p-1.5 bg-zinc-900 hover:bg-rose-950/30 rounded text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer border border-transparent"
                                  title="Remover Acesso"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <div className="w-7 text-center shrink-0" />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Form Action Side panel / Context Block (Takes up 1/3 of grid) */}
          <section className="bg-[#12131a] border border-zinc-850 rounded-xl p-5 space-y-4">
            
            {!isEditing ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500 space-y-3">
                <Shield className="w-12 h-12 text-zinc-700 animate-pulse" />
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Ações Administrativas</h4>
                  <p className="text-[11px] text-zinc-550 max-w-[200px] mt-1 mx-auto leading-relaxed">
                    Selecione um usuário para editar suas credenciais de acesso ou adicione um novo licitante manual.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveForm} className="space-y-4 font-sans">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-850/60">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4" />
                    {editingEmail ? 'Editar Membro' : 'Acesso Manual'}
                  </h3>
                  <button 
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-550 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3.5 text-xs text-zinc-300">
                  
                  {/* Email block */}
                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1 tracking-wider font-mono">E-mail do Usuário</label>
                    <input
                      type="email"
                      required
                      disabled={!!editingEmail} // Cannot rename email
                      className="w-full bg-[#0a0b0d] border border-zinc-800 focus:border-indigo-505 rounded-lg p-2 text-xs outline-none text-zinc-200 disabled:opacity-50"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                    />
                  </div>

                  {/* Plan / Subscription Display (Unified) */}
                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1 tracking-wider font-mono">Plano de Cadastro</label>
                    <div className="w-full bg-[#0d0e14] border border-zinc-850/80 rounded-lg p-2.5 text-xs text-zinc-300 flex items-center justify-between">
                      <span className="font-bold text-[#818cf8]">Plano Único - Acesso Total</span>
                      <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono uppercase font-bold">Ilimitado</span>
                    </div>
                  </div>

                  {/* Source trigger select */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1 tracking-wider font-mono">Origem</label>
                      <select
                        className="w-full bg-[#0a0b0d] border border-zinc-800 rounded-lg p-2 text-xs outline-none text-zinc-200"
                        value={formSource}
                        onChange={(e) => setFormSource(e.target.value)}
                      >
                        <option value="manual">Manual</option>
                        <option value="lowify">Lowify</option>
                        <option value="wordpress">WordPress</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1 tracking-wider font-mono">Status Compra</label>
                      <select
                        className="w-full bg-[#0a0b0d] border border-zinc-800 rounded-lg p-2 text-xs outline-none text-zinc-200"
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value)}
                      >
                        <option value="approved">Approved</option>
                        <option value="active">Active</option>
                        <option value="refunded">Refunded</option>
                        <option value="expired">Expired</option>
                      </select>
                    </div>
                  </div>

                  {/* Active Toggle Switch */}
                  <div className="flex items-center justify-between p-2.5 bg-[#0a0b0d] border border-zinc-850 rounded-lg">
                    <div>
                      <h4 className="text-[11px] font-bold text-zinc-200">Acesso Ativo</h4>
                      <p className="text-[9px] text-zinc-500">Impedir login imediatamente se desmarcado</p>
                    </div>
                    <label className="inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formActive}
                        onChange={(e) => setFormActive(e.target.checked)}
                      />
                      <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 peer-checked:after:bg-indigo-500 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600/35 relative"></div>
                    </label>
                  </div>

                  {/* Recurring Access vs Standard Access */}
                  <div className="flex items-center justify-between p-2.5 bg-[#0a0b0d] border border-zinc-850 rounded-lg">
                    <div>
                      <h4 className="text-[11px] font-bold text-zinc-200">Acesso Sem Fim / Recorrente</h4>
                      <p className="text-[9px] text-zinc-500 font-sans">Sem bloqueio compulsório de validade por ano</p>
                    </div>
                    <label className="inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={formIsRecurring}
                        onChange={(e) => {
                          setFormIsRecurring(e.target.checked);
                          if (e.target.checked) setFormNoAccessEnd(true);
                        }}
                      />
                      <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 peer-checked:after:bg-indigo-500 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600/35 relative"></div>
                    </label>
                  </div>

                  {/* Access validity Dates setup */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-zinc-550 uppercase font-black mb-1 font-mono">Data Início</label>
                      <input
                        type="date"
                        className="w-full bg-[#0a0b0d] border border-zinc-800/80 rounded-lg p-2 text-xs text-zinc-300 outline-none focus:border-indigo-505"
                        value={formAccessStart}
                        onChange={(e) => setFormAccessStart(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-zinc-550 uppercase font-black mb-1 font-mono">Data Vencimento</label>
                      <input
                        type="date"
                        disabled={formIsRecurring || formNoAccessEnd}
                        className="w-full bg-[#0a0b0d] border border-zinc-805 rounded-lg p-2 text-xs text-zinc-300 outline-none focus:border-indigo-505 disabled:opacity-30 disabled:cursor-not-allowed"
                        value={formAccessEnd}
                        onChange={(e) => setFormAccessEnd(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Quick Preset validity buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#090a0f] border border-zinc-850 rounded-lg bg-indigo-950/5">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono mr-1">Vencimento Rápido:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const baseDate = formAccessStart ? new Date(formAccessStart + 'T12:00:00') : new Date();
                        baseDate.setMonth(baseDate.getMonth() + 1);
                        setFormAccessEnd(baseDate.toISOString().split('T')[0]);
                        setFormNoAccessEnd(false);
                        setFormIsRecurring(false);
                      }}
                      className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-bold text-zinc-300 hover:text-indigo-400 transition-all cursor-pointer"
                    >
                      +1 Mês
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const baseDate = formAccessStart ? new Date(formAccessStart + 'T12:00:00') : new Date();
                        baseDate.setFullYear(baseDate.getFullYear() + 1);
                        setFormAccessEnd(baseDate.toISOString().split('T')[0]);
                        setFormNoAccessEnd(false);
                        setFormIsRecurring(false);
                      }}
                      className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-bold text-zinc-300 hover:text-emerald-400 transition-all cursor-pointer"
                    >
                      +1 Ano
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormNoAccessEnd(true);
                        setFormIsRecurring(true);
                        setFormAccessEnd('');
                      }}
                      className="px-2.5 py-1 bg-indigo-950/40 text-indigo-300 border border-indigo-900/30 rounded text-[10px] font-bold transition-all cursor-pointer"
                    >
                      Sem Vencimento
                    </button>
                  </div>

                  {/* Non-recurrent date switch */}
                  {!formIsRecurring && (
                    <div className="flex items-center gap-1.5 px-1">
                      <input
                        type="checkbox"
                        id="no-access-end-chk"
                        className="accent-indigo-600 rounded cursor-pointer"
                        checked={formNoAccessEnd}
                        onChange={(e) => {
                          setFormNoAccessEnd(e.target.checked);
                          if (e.target.checked) setFormAccessEnd('');
                        }}
                      />
                      <label htmlFor="no-access-end-chk" className="text-[10px] text-zinc-450 cursor-pointer select-none">
                        Não bloquear por data final (Manual/S prazo)
                      </label>
                    </div>
                  )}

                  {/* Counter Adjustments */}
                  <div className="border-t border-zinc-850/60 pt-3 mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase font-semibold font-mono mb-1">Gerações Atuais/Ciclo</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-[#0a0b0d] border border-zinc-800 rounded-lg p-2 text-xs outline-none text-zinc-200 text-center font-mono"
                        value={formGeneratedCount}
                        onChange={(e) => setFormGeneratedCount(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase font-semibold font-mono mb-1">Histórico Total</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full bg-[#0a0b0d] border border-zinc-800 rounded-lg p-2 text-xs outline-none text-zinc-200 text-center font-mono"
                        value={formTotalGeneratedCount}
                        onChange={(e) => setFormTotalGeneratedCount(Number(e.target.value))}
                      />
                    </div>
                  </div>

                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-zinc-850/60">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-[#818cf8] hover:bg-[#6366f1] text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Salvar Mudanças
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="py-2 px-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
            
          </section>

        </div>

        {/* Webhook History & Invasion logs tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Webhook logs */}
          <section className="bg-[#12131a] border border-zinc-850 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#a5b4fc] flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-indigo-400" />
              Últimos Webhooks Recebidos (Debugging)
            </h3>
            
            <div className="overflow-y-auto max-h-72 border border-zinc-850 bg-[#0a0b0d] rounded-lg divide-y divide-zinc-90 text-[11px]">
              {webhookLogs.length === 0 ? (
                <p className="text-center py-10 text-zinc-650">Nenhum webhook recebido do Lowify ainda.</p>
              ) : (
                webhookLogs.map((log) => (
                  <div key={log.id} className="p-3 hover:bg-zinc-900/40 transition-colors flex items-center justify-between gap-3">
                    <div className="space-y-0.5 max-w-[80%]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-200">{log.email}</span>
                        <span className="text-[9px] bg-indigo-500/10 text-indigo-400 font-mono font-bold px-1.5 py-0.5 rounded leading-none">
                          {log.plan_detected}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono">
                        Data: {new Date(log.date).toLocaleString('pt-BR')} • Status: {log.status}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => setSelectedLogPayload(log)}
                      className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-md flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspecionar</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Failed Login Block Logs */}
          <section className="bg-[#12131a] border border-zinc-850 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-rose-450 flex items-center gap-2">
              <Shield className="w-4.5 h-4.5 text-rose-500" />
              Logs de Tentativas Recusadas (Segurança)
            </h3>
            
            <div className="overflow-y-auto max-h-72 border border-zinc-850 bg-[#0a0b0d] rounded-lg divide-y divide-zinc-90 text-[11px]">
              {blockedLogs.length === 0 ? (
                <p className="text-center py-10 text-zinc-600">Nenhuma tentativa de acesso não autorizado detectada.</p>
              ) : (
                blockedLogs.map((log, index) => (
                  <div key={index} className="p-3 hover:bg-zinc-900/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-400 font-mono">{log.email || "Sem e-mail"}</span>
                      <span className="text-[9px] bg-rose-500/10 text-rose-300 font-mono font-bold px-1.5 py-0.5 rounded uppercase">
                        {log.reason}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1 leading-relaxed">
                      IP: <span className="text-zinc-400">{log.ip}</span> • {new Date(log.date).toLocaleString('pt-BR')}
                    </p>
                    <p className="text-[9px] text-zinc-600 truncate mt-0.5" title={log.userAgent}>
                      user_agent: {log.userAgent}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

      </div>

      {/* Webhook Payload Debug Inspect Modal Overlay */}
      {selectedLogPayload && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-[#020203]/90 backdrop-blur-xs font-sans">
          <div className="w-full max-w-2xl bg-[#111217] border border-zinc-800 rounded-2xl shadow-3xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="h-14 bg-[#16171e] px-5 border-b border-zinc-800/80 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Inspecionar Payload Recebido
                </h3>
                <p className="text-[10px] text-zinc-500 truncate max-w-sm mt-0.5">{selectedLogPayload.email}</p>
              </div>
              <button
                onClick={() => setSelectedLogPayload(null)}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 bg-[#0a0c0f]">
              <pre className="text-[11px] font-mono text-indigo-300 leading-relaxed whitespace-pre-wrap select-all">
                {JSON.stringify(selectedLogPayload.payload, null, 2)}
              </pre>
            </div>
            
            <div className="h-14 bg-[#111217] px-5 border-t border-zinc-850 flex items-center justify-end">
              <button
                onClick={() => setSelectedLogPayload(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-550 text-white rounded-lg text-xs font-bold shadow transition-colors cursor-pointer"
              >
                Retornar ao Painel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
