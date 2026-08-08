/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Search, MapPin, Settings, ChevronRight, Map, Plus, Trash2 } from 'lucide-react';
import { SUBESTACOES } from './data';
import { Subestacao } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'list' | 'settings'>('search');
  const [search, setSearch] = useState('');
  const [gpsPreference, setGpsPreference] = useState<'ask' | 'waze' | 'maps'>('ask');

  const [subestacoes, setSubestacoes] = useState<Subestacao[]>(() => {
    const saved = localStorage.getItem('subestacoes');
    return saved ? JSON.parse(saved) : SUBESTACOES;
  });

  useEffect(() => {
    localStorage.setItem('subestacoes', JSON.stringify(subestacoes));
  }, [subestacoes]);

  const [novaSigla, setNovaSigla] = useState('');
  const [novaNome, setNovaNome] = useState('');
  const [novaEndereco, setNovaEndereco] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const addSubestacao = () => {
    if (!novaSigla || !novaNome || !novaEndereco) return;
    const nova: Subestacao = {
      id: novaSigla.toUpperCase(),
      sigla: novaSigla.toUpperCase(),
      nome: novaNome,
      endereco: novaEndereco
    };
    setSubestacoes([...subestacoes, nova]);
    setNovaSigla('');
    setNovaNome('');
    setNovaEndereco('');
    setIsAdding(false);
  };

  const deleteSubestacao = (id: string) => {
    setSubestacoes(subestacoes.filter(s => s.id !== id));
  };

  const filtered = subestacoes.filter(s => 
    s.nome.toLowerCase().includes(search.toLowerCase()) || 
    s.sigla.toLowerCase().includes(search.toLowerCase())
  );

  const [selectedSubestacao, setSelectedSubestacao] = useState<Subestacao | null>(null);

  const navigate = (s: Subestacao, app: 'waze' | 'maps') => {
    let url = '';
    if (app === 'waze') {
      url = `waze://?q=${encodeURIComponent(s.endereco)}`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.endereco)}`;
    }
    window.open(url, '_blank');
    setSelectedSubestacao(null);
  };

  const openGPS = (s: Subestacao) => {
    if (gpsPreference === 'ask') {
      setSelectedSubestacao(s);
    } else if (gpsPreference === 'waze') {
      navigate(s, 'waze');
    } else {
      navigate(s, 'maps');
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col">
      <header className="p-4 border-b border-stone-200">
        <h1 className="text-2xl font-bold text-red-700">ACESSA</h1>
        <p className="text-xs text-stone-500 font-medium">SUBESTAÇÃO / CAMPO</p>
      </header>

      <main className="flex-1 p-4">
        {selectedSubestacao ? (
          <div className="space-y-4">
            <button onClick={() => setSelectedSubestacao(null)} className="text-sm text-stone-500 flex items-center gap-1">← Voltar à busca</button>
            <h2 className="text-2xl font-bold">Confirmação de Rota</h2>
            <h3 className="text-xl font-bold">{selectedSubestacao.nome}</h3>
            <div className="bg-white p-4 border border-stone-100 rounded-lg">
              <div className="text-sm text-stone-500">ENDEREÇO COMPLETO</div>
              <div className="font-bold">{selectedSubestacao.endereco}</div>
              <div className="text-red-700 text-xs font-bold">{selectedSubestacao.sigla}</div>
            </div>
            <div className="space-y-2">
              <button className="w-full p-4 bg-white border border-stone-200 rounded-lg flex items-center gap-3" onClick={() => navigate(selectedSubestacao, 'waze')}>
                <MapPin className="text-red-700" /> Waze
              </button>
              <button className="w-full p-4 bg-white border border-stone-200 rounded-lg flex items-center gap-3" onClick={() => navigate(selectedSubestacao, 'maps')}>
                <MapPin className="text-red-700" /> Google Maps
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'search' && (
              <div className="space-y-4">
                <h2 className="text-3xl font-bold">Onde você vai hoje?</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-stone-400" />
                  <input 
                    type="text" 
                    placeholder="Ex.: BPN ou Brás de Pena" 
                    className="w-full p-3 pl-10 border border-stone-200 rounded-lg"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                {search && filtered.map(s => (
                  <div key={s.id} className="bg-white p-4 border border-stone-100 rounded-lg flex items-center justify-between" onClick={() => openGPS(s)}>
                    <div>
                      <div className="font-bold">{s.nome}</div>
                      <div className="text-sm text-stone-500">{s.endereco}</div>
                    </div>
                    <ChevronRight />
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'list' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Subestações</h2>
                  <button onClick={() => setIsAdding(!isAdding)} className="bg-red-700 text-white p-2 rounded-full"><Plus /></button>
                </div>
                
                {isAdding && (
                  <div className="bg-white p-4 border border-stone-100 rounded-lg space-y-2">
                    <input type="text" placeholder="Sigla" className="w-full p-2 border border-stone-200 rounded" value={novaSigla} onChange={e => setNovaSigla(e.target.value)} />
                    <input type="text" placeholder="Nome" className="w-full p-2 border border-stone-200 rounded" value={novaNome} onChange={e => setNovaNome(e.target.value)} />
                    <input type="text" placeholder="Endereço" className="w-full p-2 border border-stone-200 rounded" value={novaEndereco} onChange={e => setNovaEndereco(e.target.value)} />
                    <button onClick={addSubestacao} className="w-full bg-red-700 text-white p-2 rounded">Adicionar</button>
                  </div>
                )}

                {subestacoes.map(s => (
                  <div key={s.id} className="bg-white p-3 border border-stone-100 rounded flex justify-between items-center">
                    <div>
                      <span className="font-bold text-red-700">{s.sigla}</span> {s.nome}
                      <div className="text-xs text-stone-500">{s.endereco}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trash2 className="text-stone-400" onClick={() => deleteSubestacao(s.id)} />
                      <MapPin className="text-stone-400" onClick={() => openGPS(s)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Configurações</h2>
                <p>Defina o comportamento padrão do encaminhamento GPS.</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2"><input type="radio" name="gps" checked={gpsPreference === 'ask'} onChange={() => setGpsPreference('ask')} /> Perguntar sempre</label>
                  <label className="flex items-center gap-2"><input type="radio" name="gps" checked={gpsPreference === 'waze'} onChange={() => setGpsPreference('waze')} /> Waze</label>
                  <label className="flex items-center gap-2"><input type="radio" name="gps" checked={gpsPreference === 'maps'} onChange={() => setGpsPreference('maps')} /> Google Maps</label>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <nav className="border-t border-stone-200 bg-white p-2 flex justify-around">
        <button className={`p-2 ${activeTab === 'search' ? 'text-red-700' : ''}`} onClick={() => setActiveTab('search')}><Search /> Buscar</button>
        <button className={`p-2 ${activeTab === 'list' ? 'text-red-700' : ''}`} onClick={() => setActiveTab('list')}><Map /> Subestações</button>
        <button className={`p-2 ${activeTab === 'settings' ? 'text-red-700' : ''}`} onClick={() => setActiveTab('settings')}><Settings /> Ajustes</button>
      </nav>
    </div>
  );
}
