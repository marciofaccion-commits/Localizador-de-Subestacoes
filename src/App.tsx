/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Settings, 
  ChevronRight, 
  List, 
  Plus, 
  Trash2, 
  Edit3, 
  Navigation, 
  ExternalLink, 
  Scan, 
  ArrowLeft,
  Check,
  X
} from 'lucide-react';
import { SUBESTACOES } from './data';
import { Subestacao } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'list' | 'settings'>('search');
  const [search, setSearch] = useState('');
  const [gpsPreference, setGpsPreference] = useState<'ask' | 'waze' | 'maps'>(() => {
    return (localStorage.getItem('gps_preference') as 'ask' | 'waze' | 'maps') || 'ask';
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load and merge subestações with support for new defaults
  const [subestacoes, setSubestacoes] = useState<Subestacao[]>(() => {
    const saved = localStorage.getItem('subestacoes_v4');
    if (saved) {
      try {
        const savedList: Subestacao[] = JSON.parse(saved);
        if (savedList.length >= SUBESTACOES.length) {
          return savedList;
        }
      } catch (e) {
        console.error(e);
      }
    }
    // Check older versions to migrate any custom added ones
    const oldSaved = localStorage.getItem('subestacoes_v3') || localStorage.getItem('subestacoes_v2') || localStorage.getItem('subestacoes');
    if (oldSaved) {
      try {
        const oldList: Subestacao[] = JSON.parse(oldSaved);
        const defaultIds = new Set(SUBESTACOES.map(s => s.id));
        const customItems = oldList.filter(s => !defaultIds.has(s.id));
        return [...SUBESTACOES, ...customItems];
      } catch (e) {
        console.error(e);
      }
    }
    return SUBESTACOES;
  });

  useEffect(() => {
    localStorage.setItem('subestacoes_v4', JSON.stringify(subestacoes));
  }, [subestacoes]);

  const handleResetToDefault = () => {
    if (window.confirm('Deseja recarregar toda a lista oficial de subestações atualizada?')) {
      setSubestacoes(SUBESTACOES);
      localStorage.setItem('subestacoes_v4', JSON.stringify(SUBESTACOES));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  // Modal / Form state for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formSigla, setFormSigla] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formEndereco, setFormEndereco] = useState('');
  const [formBairro, setFormBairro] = useState('');
  const [formMunicipio, setFormMunicipio] = useState('');

  const [selectedSubestacao, setSelectedSubestacao] = useState<Subestacao | null>(null);

  const normalizeStr = (str: string) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  };

  const filtered = subestacoes.filter(s => {
    const q = normalizeStr(search.trim());
    if (!q) return false;
    return (
      normalizeStr(s.sigla).includes(q) ||
      normalizeStr(s.nome).includes(q) ||
      normalizeStr(s.endereco).includes(q) ||
      (s.bairro && normalizeStr(s.bairro).includes(q)) ||
      (s.municipio && normalizeStr(s.municipio).includes(q))
    );
  });

  const navigateTo = (s: Subestacao, app: 'waze' | 'maps') => {
    const fullQuery = s.endereco;
    let url = '';
    if (app === 'waze') {
      url = `https://www.waze.com/ul?q=${encodeURIComponent(fullQuery)}&navigate=yes`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullQuery)}`;
    }
    window.open(url, '_blank');
  };

  const handleSubestacaoClick = (s: Subestacao) => {
    if (gpsPreference === 'waze') {
      navigateTo(s, 'waze');
    } else if (gpsPreference === 'maps') {
      navigateTo(s, 'maps');
    } else {
      setSelectedSubestacao(s);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormSigla('');
    setFormNome('');
    setFormEndereco('');
    setFormBairro('');
    setFormMunicipio('');
    setIsModalOpen(true);
  };

  const openEditModal = (s: Subestacao) => {
    setEditingId(s.id);
    setFormSigla(s.sigla);
    setFormNome(s.nome);
    setFormEndereco(s.endereco);
    setFormBairro(s.bairro || '');
    setFormMunicipio(s.municipio || '');
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSigla.trim() || !formNome.trim() || !formEndereco.trim()) return;

    let fullAddress = formEndereco.trim();
    if (formBairro.trim() && !fullAddress.toUpperCase().includes(formBairro.trim().toUpperCase())) {
      fullAddress += ` - ${formBairro.trim()}`;
    }
    if (formMunicipio.trim() && !fullAddress.toUpperCase().includes(formMunicipio.trim().toUpperCase())) {
      fullAddress += ` - ${formMunicipio.trim()}`;
    }

    if (editingId) {
      // Edit
      setSubestacoes(prev =>
        prev.map(item =>
          item.id === editingId
            ? {
                ...item,
                sigla: formSigla.trim().toUpperCase(),
                nome: formNome.trim().toUpperCase(),
                endereco: fullAddress,
                bairro: formBairro.trim().toUpperCase() || undefined,
                municipio: formMunicipio.trim().toUpperCase() || undefined
              }
            : item
        )
      );
    } else {
      // Create
      const newSub: Subestacao = {
        id: `${formSigla.trim().toUpperCase()}_${Date.now()}`,
        sigla: formSigla.trim().toUpperCase(),
        nome: formNome.trim().toUpperCase(),
        endereco: fullAddress,
        bairro: formBairro.trim().toUpperCase() || undefined,
        municipio: formMunicipio.trim().toUpperCase() || undefined
      };
      setSubestacoes(prev => [newSub, ...prev]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string, nome: string) => {
    if (window.confirm(`Deseja realmente excluir a subestação ${nome}?`)) {
      setSubestacoes(prev => prev.filter(s => s.id !== id));
      if (selectedSubestacao?.id === id) {
        setSelectedSubestacao(null);
      }
    }
  };

  const handleSavePreference = () => {
    localStorage.setItem('gps_preference', gpsPreference);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1E1E1E] flex flex-col font-sans max-w-lg mx-auto shadow-xl">
      {/* Top Header */}
      <header className="px-5 py-4 bg-[#FDFBF7] border-b border-stone-200 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h1 className="text-xl font-black tracking-widest text-[#1B1B1B]">ACESSA</h1>
          <p className="text-[11px] font-bold tracking-wider text-[#C82A2A]">SUBESTAÇÃO / CAMPO</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#C82A2A] font-semibold">
          <Navigation className="w-4 h-4 fill-current rotate-45" />
          <span className="text-stone-400 font-normal">v1.0</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-5 py-6 pb-24 overflow-y-auto">
        {selectedSubestacao ? (
          /* Confirmation / Route Selection View */
          <div className="space-y-6 animate-fadeIn">
            <button
              onClick={() => setSelectedSubestacao(null)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone-600 hover:text-stone-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar à busca
            </button>

            <div>
              <p className="text-xs font-extrabold tracking-wider uppercase text-[#C82A2A]">
                CONFIRMAÇÃO DE ROTA
              </p>
              <h2 className="text-3xl font-extrabold text-stone-900 mt-1">
                {selectedSubestacao.nome}
              </h2>
            </div>

            {/* Address Card */}
            <div className="bg-white border-l-4 border-l-[#C82A2A] border border-stone-200 rounded-r-xl p-5 shadow-sm space-y-2">
              <p className="text-[10px] font-bold tracking-wider text-stone-400 uppercase">
                ENDEREÇO COMPLETO
              </p>
              <p className="text-base font-bold text-stone-900 leading-snug">
                {selectedSubestacao.endereco}
              </p>
              <p className="text-xs font-extrabold text-[#C82A2A] pt-1">
                SIGLA: {selectedSubestacao.sigla}
              </p>
            </div>

            {/* Navigation Options */}
            <div className="space-y-3 pt-2">
              <h3 className="text-lg font-bold text-stone-900">Abrir navegação com</h3>
              <p className="text-sm text-stone-500">Escolha uma opção para esta rota.</p>

              <button
                onClick={() => navigateTo(selectedSubestacao, 'waze')}
                className="w-full bg-white border border-stone-200 rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-stone-400 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center text-sky-600">
                    <Navigation className="w-5 h-5 fill-current" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-stone-900 text-base">Waze</p>
                    <p className="text-xs text-stone-500">Abrir rota no aplicativo</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-stone-400" />
              </button>

              <button
                onClick={() => navigateTo(selectedSubestacao, 'maps')}
                className="w-full bg-white border border-stone-200 rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-stone-400 active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-[#C82A2A]">
                    <span className="font-bold text-lg leading-none">🗺️</span>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-stone-900 text-base">Google Maps</p>
                    <p className="text-xs text-stone-500">Abrir rota no aplicativo</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-stone-400" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* TAB: SEARCH */}
            {activeTab === 'search' && (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-extrabold tracking-wider uppercase text-[#C82A2A]">
                    LOCALIZADOR DE REDE
                  </p>
                  <h2 className="text-3xl font-extrabold text-stone-900 mt-1">
                    Onde você vai hoje?
                  </h2>
                  <p className="text-sm text-stone-600 mt-1">
                    Busque pelo nome ou pela sigla da subestação.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Ex.: BPN ou Brás de Pina"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-white pl-11 pr-10 py-3.5 border border-stone-300 rounded-xl text-stone-900 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C82A2A] focus:border-transparent placeholder:text-stone-400 transition"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Search Results or Empty State */}
                {search.trim().length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                      {filtered.length} {filtered.length === 1 ? 'RESULTADO' : 'RESULTADOS'}
                    </p>

                    {filtered.length > 0 ? (
                      <div className="space-y-2.5">
                        {filtered.map(s => (
                          <div
                            key={s.id}
                            onClick={() => handleSubestacaoClick(s)}
                            className="bg-white border border-stone-200 hover:border-stone-400 rounded-xl p-4 flex items-center justify-between gap-3 cursor-pointer shadow-sm active:scale-[0.99] transition-all"
                          >
                            <div className="flex items-center gap-3.5 overflow-hidden">
                              <div className="w-12 h-12 shrink-0 bg-[#1C2331] text-[#F3B749] font-black text-sm flex items-center justify-center rounded-lg shadow-inner">
                                {s.sigla}
                              </div>
                              <div className="overflow-hidden">
                                <h4 className="font-bold text-stone-900 text-base truncate">
                                  {s.nome}
                                </h4>
                                <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                                  {s.endereco}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-[#C82A2A] shrink-0" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white border border-stone-200 rounded-xl p-8 text-center space-y-2">
                        <p className="font-bold text-stone-800">Nenhuma subestação encontrada</p>
                        <p className="text-xs text-stone-500">
                          Verifique a digitação da sigla ou nome da subestação.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-8 text-center space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-[#C82A2A] flex items-center justify-center">
                      <Scan className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-stone-900 text-lg">Digite para começar</h3>
                      <p className="text-xs text-stone-500 max-w-xs mx-auto">
                        A lista contém mais de 130 subestações da operação Rio, Grande Rio, Sul Fluminense e Vale do Café.
                      </p>
                    </div>
                    <div className="pt-6 border-t border-stone-200">
                      <p className="text-[10px] font-bold tracking-widest text-stone-400 uppercase">
                        SELECIONE UMA LINHA PARA VER O ENDEREÇO COMPLETO
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: LIST */}
            {activeTab === 'list' && (
              <div className="space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-extrabold tracking-wider uppercase text-[#C82A2A]">
                      BASE LOCAL
                    </p>
                    <h2 className="text-3xl font-extrabold text-stone-900 mt-1">
                      Subestações
                    </h2>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {subestacoes.length} registros disponíveis para busca.
                    </p>
                  </div>
                  <button
                    onClick={openAddModal}
                    className="bg-[#C82A2A] hover:bg-[#a62222] text-white text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </button>
                </div>

                {/* Subestação Cards List */}
                <div className="space-y-2.5">
                  {subestacoes.map(s => (
                    <div
                      key={s.id}
                      className="bg-white border border-stone-200 rounded-xl p-4 flex items-center justify-between gap-3 shadow-sm hover:border-stone-300 transition"
                    >
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => handleSubestacaoClick(s)}
                      >
                        <p className="text-xs font-black tracking-wider text-[#D97706]">
                          {s.sigla}
                        </p>
                        <h4 className="font-bold text-stone-900 text-base leading-tight mt-0.5">
                          {s.nome}
                        </h4>
                        <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">
                          {s.endereco}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => openEditModal(s)}
                          title="Editar"
                          className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id, s.nome)}
                          title="Excluir"
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-extrabold tracking-wider uppercase text-[#C82A2A]">
                    PREFERÊNCIAS
                  </p>
                  <h2 className="text-3xl font-extrabold text-stone-900 mt-1">
                    Configurações
                  </h2>
                  <p className="text-sm text-stone-600 mt-1">
                    Defina o comportamento padrão do encaminhamento GPS.
                  </p>
                </div>

                <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-4">
                  <p className="text-[10px] font-bold tracking-wider text-stone-400 uppercase">
                    APLICATIVO GPS PADRÃO
                  </p>

                  <div className="space-y-3 divide-y divide-stone-100">
                    <label className="flex items-start gap-3.5 pt-3 first:pt-0 cursor-pointer">
                      <input
                        type="radio"
                        name="gps_pref"
                        value="ask"
                        checked={gpsPreference === 'ask'}
                        onChange={() => setGpsPreference('ask')}
                        className="mt-1 w-4 h-4 text-[#C82A2A] focus:ring-[#C82A2A]"
                      />
                      <div>
                        <p className="font-bold text-stone-900 text-sm">Perguntar sempre</p>
                        <p className="text-xs text-stone-500">Escolher na confirmação</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3.5 pt-3 cursor-pointer">
                      <input
                        type="radio"
                        name="gps_pref"
                        value="waze"
                        checked={gpsPreference === 'waze'}
                        onChange={() => setGpsPreference('waze')}
                        className="mt-1 w-4 h-4 text-[#C82A2A] focus:ring-[#C82A2A]"
                      />
                      <div>
                        <p className="font-bold text-stone-900 text-sm">Waze</p>
                        <p className="text-xs text-stone-500">Abrir diretamente no Waze</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3.5 pt-3 cursor-pointer">
                      <input
                        type="radio"
                        name="gps_pref"
                        value="maps"
                        checked={gpsPreference === 'maps'}
                        onChange={() => setGpsPreference('maps')}
                        className="mt-1 w-4 h-4 text-[#C82A2A] focus:ring-[#C82A2A]"
                      />
                      <div>
                        <p className="font-bold text-stone-900 text-sm">Google Maps</p>
                        <p className="text-xs text-stone-500">Abrir diretamente no Google Maps</p>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleSavePreference}
                  className="w-full bg-[#C82A2A] hover:bg-[#a62222] text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99]"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-5 h-5" />
                      Preferência salva com sucesso!
                    </>
                  ) : (
                    <>
                      Salvar preferência
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-4 border-t border-stone-200">
                  <button
                    onClick={handleResetToDefault}
                    className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3 px-4 rounded-xl text-sm transition"
                  >
                    Restaurar / Recarregar todas as subestações padrão ({SUBESTACOES.length})
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Add / Edit Subestação Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-900">
                {editingId ? 'Editar Subestação' : 'Nova Subestação'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  SIGLA *
                </label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  placeholder="Ex: CEN"
                  value={formSigla}
                  onChange={e => setFormSigla(e.target.value.toUpperCase())}
                  className="w-full p-2.5 border border-stone-300 rounded-lg text-stone-900 uppercase font-mono font-bold focus:ring-2 focus:ring-[#C82A2A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  NOME DA SUBESTAÇÃO *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: CENTENÁRIO"
                  value={formNome}
                  onChange={e => setFormNome(e.target.value.toUpperCase())}
                  className="w-full p-2.5 border border-stone-300 rounded-lg text-stone-900 uppercase font-bold focus:ring-2 focus:ring-[#C82A2A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">
                  LOGRADOURO / ENDEREÇO *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: RUA JOSÉ DO PATROCÍNIO, 578"
                  value={formEndereco}
                  onChange={e => setFormEndereco(e.target.value)}
                  className="w-full p-2.5 border border-stone-300 rounded-lg text-stone-900 focus:ring-2 focus:ring-[#C82A2A] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    BAIRRO
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: CARVALHEIRA"
                    value={formBairro}
                    onChange={e => setFormBairro(e.target.value)}
                    className="w-full p-2.5 border border-stone-300 rounded-lg text-stone-900 focus:ring-2 focus:ring-[#C82A2A] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    MUNICÍPIO
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: VASSOURAS"
                    value={formMunicipio}
                    onChange={e => setFormMunicipio(e.target.value)}
                    className="w-full p-2.5 border border-stone-300 rounded-lg text-stone-900 focus:ring-2 focus:ring-[#C82A2A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-2.5 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#C82A2A] hover:bg-[#a62222] text-white font-bold py-2.5 rounded-xl transition shadow-sm"
                >
                  {editingId ? 'Salvar Alterações' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-stone-200 py-2.5 px-6 flex justify-around items-center z-30 shadow-md">
        <button
          onClick={() => {
            setActiveTab('search');
            setSelectedSubestacao(null);
          }}
          className={`flex flex-col items-center gap-1 text-xs font-bold transition-colors ${
            activeTab === 'search' ? 'text-[#C82A2A]' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          <Search className="w-5 h-5" />
          <span>Buscar</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('list');
            setSelectedSubestacao(null);
          }}
          className={`flex flex-col items-center gap-1 text-xs font-bold transition-colors ${
            activeTab === 'list' ? 'text-[#C82A2A]' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          <List className="w-5 h-5" />
          <span>Subestações</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('settings');
            setSelectedSubestacao(null);
          }}
          className={`flex flex-col items-center gap-1 text-xs font-bold transition-colors ${
            activeTab === 'settings' ? 'text-[#C82A2A]' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span>Ajustes</span>
        </button>
      </nav>
    </div>
  );
}
