import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, MapPinned, Loader, Search } from 'lucide-react';
import MapaPreviaLocal from './MapaPreviaLocal';
import MapaRaio from './MapaRaio';
import {
  lerLocalColado, paisDaCoordenada, paisDoTexto, buscaLocais, ROTULO_TIPO, ROTULO_PAIS,
} from '../localBusca';

const NICHOS_BR = [
  'Dentistas', 'Clínica odontológica', 'Ortodontista', 'Odontologia', 'Aparelho ortodôntico',
  'Academias', 'Personal trainer', 'Crossfit', 'Restaurantes', 'Pizzarias', 'Hamburguerias',
  'Comida japonesa', 'Escritório de advocacia', 'Advogados', 'Advocacia trabalhista',
  'Advocacia empresarial', 'Contabilidade', 'Escritório de contabilidade', 'Imobiliárias',
  'Corretores de imóveis', 'Clínicas de estética', 'Salão de beleza', 'Barbearias',
  'Pet shops', 'Veterinários', 'Autoescolas', 'Oficinas mecânicas', 'Escolas',
  'Cursos profissionalizantes', 'Psicólogos', 'Fisioterapeutas', 'Arquitetos', 'Designers',
  'Agências de marketing', 'Padarias', 'Farmácias', 'Hotéis', 'Lava-jatos', 'Clínicas médicas', 'Laboratórios'
];

const CIDADES_BR = [
  ['São Paulo', 'SP'], ['Guarulhos', 'SP'], ['Campinas', 'SP'], ['São Bernardo do Campo', 'SP'],
  ['Santo André', 'SP'], ['São José dos Campos', 'SP'], ['Osasco', 'SP'], ['Ribeirão Preto', 'SP'],
  ['Sorocaba', 'SP'], ['Santos', 'SP'], ['Mauá', 'SP'], ['São José do Rio Preto', 'SP'],
  ['Diadema', 'SP'], ['Jundiaí', 'SP'], ['Mogi das Cruzes', 'SP'], ['Piracicaba', 'SP'],
  ['Rio de Janeiro', 'RJ'], ['São Gonçalo', 'RJ'], ['Duque de Caxias', 'RJ'], ['Nova Iguaçu', 'RJ'],
  ['Niterói', 'RJ'], ['Belford Roxo', 'RJ'], ['São João de Meriti', 'RJ'], ['Petrópolis', 'RJ'],
  ['Belo Horizonte', 'MG'], ['Contagem', 'MG'], ['Uberlândia', 'MG'], ['Juiz de Fora', 'MG'],
  ['Curitiba', 'PR'], ['Londrina', 'PR'], ['Maringá', 'PR'],
  ['Porto Alegre', 'RS'], ['Caxias do Sul', 'RS'], ['Canoas', 'RS'],
  ['Salvador', 'BA'], ['Feira de Santana', 'BA'],
  ['Florianópolis', 'SC'], ['Joinville', 'SC'], ['Blumenau', 'SC'],
  ['Goiânia', 'GO'], ['Aparecida de Goiânia', 'GO'],
  ['Recife', 'PE'], ['Jaboatão dos Guararapes', 'PE'], ['Olinda', 'PE'],
  ['Fortaleza', 'CE'], ['Belém', 'PA'], ['São Luís', 'MA'], ['Maceió', 'AL'],
  ['Natal', 'RN'], ['João Pessoa', 'PB'], ['Aracaju', 'SE'], ['Teresina', 'PI'],
  ['Vitória', 'ES'], ['Vila Velha', 'ES'], ['Campo Grande', 'MS'], ['Cuiabá', 'MT'],
  ['Palmas', 'TO'], ['Porto Velho', 'RO'], ['Rio Branco', 'AC'], ['Manaus', 'AM'],
  ['Boa Vista', 'RR'], ['Macapá', 'AP'], ['Brasília', 'DF']
].map(([n, uf]) => ({ n, uf, estado: false }));

const ESTADOS_BR = [
  ['Acre', 'AC'], ['Alagoas', 'AL'], ['Amapá', 'AP'], ['Amazonas', 'AM'], ['Bahia', 'BA'],
  ['Ceará', 'CE'], ['Espírito Santo', 'ES'], ['Goiás', 'GO'], ['Maranhão', 'MA'],
  ['Mato Grosso', 'MT'], ['Mato Grosso do Sul', 'MS'], ['Minas Gerais', 'MG'], ['Pará', 'PA'],
  ['Paraíba', 'PB'], ['Paraná', 'PR'], ['Pernambuco', 'PE'], ['Piauí', 'PI'],
  ['Rio de Janeiro', 'RJ'], ['Rio Grande do Norte', 'RN'], ['Rio Grande do Sul', 'RS'],
  ['Rondônia', 'RO'], ['Roraima', 'RR'], ['Santa Catarina', 'SC'], ['São Paulo', 'SP'],
  ['Sergipe', 'SE'], ['Tocantins', 'TO'], ['Distrito Federal', 'DF']
].map(([n, uf]) => ({ n, uf, estado: true }));


/**
 * Nichos e cidades da prospeccao de brasileiros nos Estados Unidos.
 *
 * A lista de nichos e diferente da brasileira de proposito. O alvo aqui nao e
 * o mercado americano em geral, e o negocio que atende a comunidade
 * brasileira: restaurante, padaria, mercado, salao, limpeza, construcao,
 * despachante. Buscar "Dentistas" em Framingham devolveria consultorio
 * americano, que nao e o cliente.
 */
const NICHOS_US = [
  'Restaurante brasileiro', 'Churrascaria', 'Padaria brasileira', 'Acai', 'Salgados brasileiros',
  'Mercado brasileiro', 'Loja de produtos brasileiros', 'Salao de beleza brasileiro',
  'Barbearia brasileira', 'Manicure brasileira', 'Estetica brasileira', 'Depilacao',
  'Limpeza residencial', 'Cleaning service brasileiro', 'Construcao civil', 'Handyman brasileiro',
  'Pintor brasileiro', 'Instalacao de piso', 'Landscaping brasileiro', 'Mudanca e transporte',
  'Despachante brasileiro', 'Advogado de imigracao', 'Contador brasileiro', 'Remessa de dinheiro',
  'Seguro para brasileiros', 'Auto repair brasileiro', 'Personal trainer brasileiro',
  'Buffet e festa brasileira', 'Fotografo brasileiro', 'Igreja brasileira',
  'Escola de portugues', 'Agencia de viagem brasileira',
];

/**
 * Cidades com concentracao conhecida de brasileiros, mais as metropoles
 * grandes. Vale confirmar cidade por cidade com uma extracao pequena antes de
 * montar lista longa: a concentracao muda com o tempo.
 */
const CIDADES_US = [
  ['Framingham', 'MA'], ['Everett', 'MA'], ['Somerville', 'MA'], ['Boston', 'MA'],
  ['Marlborough', 'MA'], ['Brockton', 'MA'], ['Lowell', 'MA'], ['Revere', 'MA'],
  ['Pompano Beach', 'FL'], ['Deerfield Beach', 'FL'], ['Orlando', 'FL'], ['Kissimmee', 'FL'],
  ['Boca Raton', 'FL'], ['Miami', 'FL'], ['Fort Lauderdale', 'FL'], ['Tampa', 'FL'],
  ['Newark', 'NJ'], ['Harrison', 'NJ'], ['Kearny', 'NJ'], ['Elizabeth', 'NJ'],
  ['Danbury', 'CT'], ['Bridgeport', 'CT'], ['Stamford', 'CT'],
  ['Marietta', 'GA'], ['Atlanta', 'GA'], ['Smyrna', 'GA'],
  ['New York', 'NY'], ['Mount Vernon', 'NY'], ['Yonkers', 'NY'],
  ['Los Angeles', 'CA'], ['San Francisco', 'CA'], ['San Diego', 'CA'],
  ['Houston', 'TX'], ['Dallas', 'TX'], ['Austin', 'TX'],
  ['Chicago', 'IL'], ['Philadelphia', 'PA'], ['Washington', 'DC'],
  ['Las Vegas', 'NV'], ['Phoenix', 'AZ'], ['Denver', 'CO'],
  ['Seattle', 'WA'], ['Portland', 'OR'], ['Charlotte', 'NC'], ['Nashville', 'TN'],
].map(([n, uf]) => ({ n, uf, estado: false }));

const ESTADOS_US = [
  ['Massachusetts', 'MA'], ['Florida', 'FL'], ['New Jersey', 'NJ'], ['Connecticut', 'CT'],
  ['Georgia', 'GA'], ['New York', 'NY'], ['California', 'CA'], ['Texas', 'TX'],
  ['Illinois', 'IL'], ['Pennsylvania', 'PA'], ['Maryland', 'MD'], ['Virginia', 'VA'],
  ['North Carolina', 'NC'], ['Arizona', 'AZ'], ['Nevada', 'NV'], ['Colorado', 'CO'],
  ['Washington', 'WA'], ['Utah', 'UT'], ['Ohio', 'OH'], ['Michigan', 'MI'],
].map(([n, uf]) => ({ n, uf, estado: true }));


// Nichos dos dois públicos numa lista só: o país sai do local, não de um seletor.
const NICHOS = [...new Set([...NICHOS_BR, ...NICHOS_US])];

// Catálogo local para sugestão instantânea, antes da resposta do mapa.
const CATALOGO_LOCAL = [
  ...CIDADES_BR.map((c) => ({ ...c, pais: 'BR' })),
  ...ESTADOS_BR.map((c) => ({ ...c, pais: 'BR' })),
  ...CIDADES_US.map((c) => ({ ...c, pais: 'US' })),
  ...ESTADOS_US.map((c) => ({ ...c, pais: 'US' })),
];

const POPULARES = [
  ['São Paulo', 'SP', 'BR'], ['Rio de Janeiro', 'RJ', 'BR'], ['Belo Horizonte', 'MG', 'BR'],
  ['Orlando', 'FL', 'US'], ['Boston', 'MA', 'US'], ['Framingham', 'MA', 'US'], ['Miami', 'FL', 'US'], ['Newark', 'NJ', 'US'],
];

const RAIOS = [5, 10, 30, 50];

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function doCatalogo(c) {
  return {
    nome: c.n,
    detalhe: c.uf,
    cidade: c.estado ? '' : c.n,
    uf: c.uf,
    pais: c.pais,
    tipo: c.estado ? 'estado' : 'cidade',
    chave: `cat-${c.pais}-${c.n}-${c.uf}`,
  };
}

/** Texto que vai para a busca do Maps quando não é por raio. */
function textoDoLocal(local) {
  if (!local) return '';
  if (local.tipo === 'estado') return local.nome;
  if (local.tipo === 'bairro') return [local.nome, local.cidade, local.uf].filter(Boolean).join(', ');
  return [local.cidade || local.nome, local.uf].filter(Boolean).join(', ');
}

function rotuloDoLocal(local) {
  if (!local) return '';
  if (local.tipo === 'ponto') return `${local.lat.toFixed(4)}, ${local.lng.toFixed(4)}`;
  return [local.nome, local.detalhe].filter(Boolean).join(', ');
}

export default function NewExtractionModal({
  isOpen,
  onClose,
  onStartExtraction,
  isProcessing
}) {
  const [step, setStep] = useState(1);
  const [nicho, setNicho] = useState('');
  const [nichoError, setNichoError] = useState(false);
  const [nichoSuggestions, setNichoSuggestions] = useState([]);
  const [showNichoList, setShowNichoList] = useState(false);

  const [busca, setBusca] = useState('');
  const [local, setLocal] = useState(null);
  const [sugestoes, setSugestoes] = useState([]);
  const [mostraSugestoes, setMostraSugestoes] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [erroLocal, setErroLocal] = useState('');
  const [raio, setRaio] = useState('inteiro');

  const [bairroInput, setBairroInput] = useState('');
  const [bairros, setBairros] = useState([]);
  const [sugerindo, setSugerindo] = useState(null);
  const [erroSugestao, setErroSugestao] = useState('');

  const carViewRef = useRef(null);
  const pedidoRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setNicho('');
      setNichoError(false);
      setBusca('');
      setLocal(null);
      setSugestoes([]);
      setErroLocal('');
      setRaio('inteiro');
      setBairroInput('');
      setBairros([]);
    }
  }, [isOpen]);

  // Sugestões do mapa, com espera curta para não consultar a cada letra.
  useEffect(() => {
    if (!isOpen || step !== 2) return undefined;
    const texto = busca.trim();
    if (local || texto.length < 3 || lerLocalColado(texto)) return undefined;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const remotas = await buscaLocais(texto, { signal: ctrl.signal });
        setSugestoes((atuais) => {
          const vistos = new Set(atuais.map((s) => norm(`${s.nome}|${s.uf}`)));
          return [...atuais, ...remotas.filter((s) => !vistos.has(norm(`${s.nome}|${s.uf}`)))].slice(0, 8);
        });
        setMostraSugestoes(true);
      } catch { /* sem internet: fica a lista local */ }
    }, 450);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [busca, local, isOpen, step]);

  if (!isOpen) return null;

  const pais = local?.pais || paisDoTexto(busca);
  const podeInteiro = !local || ['cidade', 'estado', 'bairro'].includes(local.tipo);
  const raioKm = raio === 'inteiro' ? null : raio;
  const dividePorBairro = raio === 'inteiro' && (!local || local.tipo === 'cidade');
  // Nos EUA o Google entende melhor serviço em inglês; nicho "brasileiro"
  // continua em português de propósito, porque é assim que se acha a comunidade.
  const nichoEmPortugues = /[ãõçáéíóúâêô]|\b(limpeza|faxina|restaurante|salao|construcao|advogad|dentista|pintor|mudanca|oficina|padaria)/i.test(nicho)
    && !/brasil|brazil/i.test(nicho);
  const avisoIdioma = pais === 'US' && nichoEmPortugues;
  const rotuloInteiro = local?.tipo === 'estado' ? 'Estado inteiro' : local?.tipo === 'bairro' ? 'Bairro inteiro' : 'Cidade inteira';

  const wzTitles = {
    1: 'Qual nicho você quer pesquisar?',
    2: 'Onde?',
    3: dividePorBairro ? 'Quer dividir por bairros?' : 'Revise e inicie',
  };

  const handleNichoChange = (val) => {
    setNicho(val);
    setNichoError(false);
    const nq = norm(val).trim();
    if (!nq) {
      setNichoSuggestions([]);
      setShowNichoList(false);
      return;
    }
    const pre = [];
    const mid = [];
    NICHOS.forEach((t) => {
      const nt = norm(t);
      if (nt.indexOf(nq) === 0) pre.push(t);
      else if (nt.indexOf(nq) >= 0) mid.push(t);
    });
    const results = pre.concat(mid).slice(0, 7);
    setNichoSuggestions(results);
    setShowNichoList(results.length > 0);
  };

  const pickNicho = (val) => {
    setNicho(val);
    setNichoError(false);
    setShowNichoList(false);
    setStep(2);
  };

  const escolheLocal = (item) => {
    setLocal(item);
    setBusca(rotuloDoLocal(item));
    setMostraSugestoes(false);
    setErroLocal('');
    // Bairro e endereço pedem raio; cidade e estado começam inteiros.
    if (['ponto', 'lugar'].includes(item.tipo)) setRaio((r) => (r === 'inteiro' ? 10 : r));
    else setRaio('inteiro');
  };

  // Item do catálogo local não tem coordenada: pergunta ao mapa antes de usar.
  const escolheSugestao = async (item) => {
    if (Number.isFinite(item.lat)) {
      escolheLocal(item);
      return;
    }
    setLocalizando(true);
    setMostraSugestoes(false);
    setBusca(rotuloDoLocal(item));
    const pedido = Symbol('pedido');
    pedidoRef.current = pedido;
    try {
      const achados = await buscaLocais(`${item.nome}, ${item.uf}, ${item.pais === 'US' ? 'USA' : 'Brasil'}`);
      if (pedidoRef.current !== pedido) return;
      const melhor = achados.find((a) => a.pais === item.pais) || achados[0];
      escolheLocal(melhor ? { ...item, lat: melhor.lat, lng: melhor.lng } : item);
    } catch {
      escolheLocal(item);
    } finally {
      setLocalizando(false);
    }
  };

  const handleBuscaChange = (val) => {
    setBusca(val);
    setLocal(null);
    setErroLocal('');
    pedidoRef.current = null;
    const ponto = lerLocalColado(val);
    if (ponto) {
      escolheLocal({
        ...ponto,
        nome: 'Ponto colado',
        detalhe: '',
        cidade: '',
        uf: '',
        tipo: 'ponto',
        pais: paisDaCoordenada(ponto.lat, ponto.lng) || paisDoTexto(val),
        chave: 'ponto',
      });
      setBusca(val);
      return;
    }
    const nq = norm(val).trim();
    if (!nq) {
      setSugestoes([]);
      setMostraSugestoes(false);
      return;
    }
    const scored = [];
    CATALOGO_LOCAL.forEach((c) => {
      const nn = norm(c.n);
      let s = -1;
      if (nn === nq) s = 0;
      else if (nn.indexOf(nq) === 0) s = 1;
      else if (nn.indexOf(nq) >= 0) s = 2;
      if (s < 0) return;
      if (c.estado) s += 0.5;
      scored.push({ c, s });
    });
    scored.sort((a, b) => a.s - b.s || a.c.n.localeCompare(b.c.n, 'pt-BR'));
    const locais = scored.slice(0, 4).map((r) => doCatalogo(r.c));
    setSugestoes(locais);
    setMostraSugestoes(locais.length > 0);
  };

  const addBairro = () => {
    const v = bairroInput.trim();
    if (!v) return;
    if (!bairros.some((b) => b.toLowerCase() === v.toLowerCase())) {
      setBairros([...bairros, v]);
    }
    setBairroInput('');
  };

  const removeBairro = (index) => {
    setBairros(bairros.filter((_, i) => i !== index));
  };

  // Lê os bairros da cidade no OpenStreetMap e junta com os já digitados.
  const sugerirBairros = async () => {
    if (sugerindo || !window.electronAPI?.sugerirBairros) return;
    setErroSugestao('');
    setSugerindo({ atual: 0, total: 0 });
    const off = window.electronAPI.onBairrosProgress?.((p) => setSugerindo(p));
    try {
      const r = await window.electronAPI.sugerirBairros(textoDoLocal(local) || busca, pais);
      if (!r?.success) throw new Error(r?.error || 'Não foi possível consultar o mapa.');
      if (!r.bairros.length) {
        setErroSugestao('O mapa não tem bairros marcados para essa cidade. A busca vai cobrir a cidade inteira.');
        return;
      }
      setBairros((atuais) => {
        const vistos = new Set(atuais.map((b) => b.toLowerCase()));
        return [...atuais, ...r.bairros.filter((b) => !vistos.has(b.toLowerCase()))];
      });
    } catch (e) {
      setErroSugestao(e.message);
    } finally {
      if (typeof off === 'function') off();
      setSugerindo(null);
    }
  };

  const handleNext = () => {
    if (isProcessing) return;
    if (step === 1) {
      if (!nicho.trim()) {
        setNichoError(true);
        return;
      }
      setNichoError(false);
      setStep(2);
      return;
    }
    if (step === 2) {
      if (localizando) return;
      // Digitou e não escolheu: usa a primeira sugestão, se houver.
      if (!local && sugestoes.length) {
        escolheSugestao(sugestoes[0]);
        return;
      }
      if (!local && busca.trim().length < 2) {
        setErroLocal('Diga onde buscar: cidade, bairro, endereço, coordenadas ou link do Google Maps.');
        return;
      }
      if (raioKm && !local) {
        setErroLocal('Para buscar por raio, escolha um local da lista ou cole um ponto.');
        return;
      }
      setStep(3);
      return;
    }
    // Etapa 3: inicia.
    const usaRaio = Boolean(raioKm && local);
    onStartExtraction?.({
      niche: nicho.trim(),
      neigh: dividePorBairro && bairros.length ? bairros.join(', ') : '',
      bairros: dividePorBairro ? bairros : [],
      city: usaRaio ? '' : (textoDoLocal(local) || busca.trim()),
      pais,
      limit: 1000,
      area: usaRaio ? { lat: local.lat, lng: local.lng, raioKm } : null,
      localLabel: rotuloDoLocal(local) || busca.trim(),
    });
    onClose();
  };

  return (
    <div className="overlay on modal-overlay" onClick={onClose} style={{ display: 'grid' }}>
      {/* A largura e a grade das etapas vivem no CSS, nao aqui: estilo em linha
          vence media query e travava o card em uma coluna de 558px. */}
      <div className="modal modal-content modal-extracao" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="eyebrow">Etapa {step} de 3</div>
          <h2 id="mTitle" style={{ fontSize: '20px', fontWeight: 600, marginTop: '4px' }}>
            {wzTitles[step]}
          </h2>
        </div>

        <div className="modal-body wz-corpo">
          <div className="wz-dots" aria-hidden="true">
            <i className={step >= 1 ? 'on' : ''} />
            <i className={step >= 2 ? 'on' : ''} />
            <i className={step >= 3 ? 'on' : ''} />
          </div>

          {/* ETAPA 1: NICHO */}
          {step === 1 && (
            <div className="wz-step">
              <div className={`field ${nichoError ? 'invalid' : ''}`}>
                <label htmlFor="wzNicho">Nicho</label>
                <div className="ac-wrap">
                  <input
                    id="wzNicho"
                    placeholder="Ex.: dentistas, limpeza residencial, restaurante brasileiro"
                    autoComplete="off"
                    value={nicho}
                    onChange={(e) => handleNichoChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleNext();
                      }
                    }}
                    autoFocus
                  />
                  {showNichoList && nichoSuggestions.length > 0 && (
                    <div className="ac-list" role="listbox">
                      {nichoSuggestions.map((item) => (
                        <button key={item} type="button" className="ac-item" onClick={() => pickNicho(item)}>
                          <span><span>{item}</span></span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {nichoError && <span className="field-err" style={{ display: 'block' }}>Diga o nicho para continuar.</span>}
              </div>

              <div className="car" style={{ marginTop: '14px' }}>
                <button
                  type="button"
                  className="car-nav"
                  onClick={() => carViewRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
                  aria-label="Sugestões anteriores"
                >
                  <ChevronLeft size={16} strokeWidth={1.5} />
                </button>
                <div className="car-view" ref={carViewRef} role="list">
                  {NICHOS.map((t) => (
                    <button key={t} type="button" className="chip" onClick={() => pickNicho(t)}>
                      {t}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="car-nav"
                  onClick={() => carViewRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
                  aria-label="Próximas sugestões"
                >
                  <ChevronRight size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 2: ONDE */}
          {step === 2 && (
            <div className="wz-step wz-2col">
              <div className="wz-2col-form">
                <div className={`field ${erroLocal ? 'invalid' : ''}`}>
                  <label htmlFor="wzOnde">Cidade, bairro, endereço ou ponto</label>
                  <div className="ac-wrap">
                    <span className="onde-icone" aria-hidden="true">
                      {localizando ? <Loader size={16} strokeWidth={1.75} className="cfg-girando" /> : <Search size={16} strokeWidth={1.75} />}
                    </span>
                    <input
                      id="wzOnde"
                      className="onde-input"
                      placeholder="Ex.: Orlando, FL · Copacabana · cole um link do Google Maps"
                      autoComplete="off"
                      value={busca}
                      onChange={(e) => handleBuscaChange(e.target.value)}
                      onFocus={() => sugestoes.length && !local && setMostraSugestoes(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleNext();
                        }
                      }}
                      autoFocus
                    />
                    {mostraSugestoes && sugestoes.length > 0 && (
                      <div className="ac-list" role="listbox">
                        {sugestoes.map((s) => (
                          <button key={s.chave} type="button" className="ac-item" onClick={() => escolheSugestao(s)}>
                            <span className={`onde-bandeira onde-${s.pais}`}>{ROTULO_PAIS[s.pais]}</span>
                            <span>
                              <span>{s.nome}</span>
                              {s.detalhe && <small>{s.detalhe}</small>}
                            </span>
                            <span className="t">{ROTULO_TIPO[s.tipo]}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {erroLocal
                    ? <span className="field-err" style={{ display: 'block' }}>{erroLocal}</span>
                    : <span className="cfg-dica">Aceita coordenadas ("28.538, -81.379") ou link de um lugar no Google Maps. O país é reconhecido sozinho.</span>}
                </div>

                {!local && (
                  <div className="ex-chips" style={{ marginTop: '4px' }}>
                    {POPULARES.map(([n, uf, p]) => (
                      <button
                        key={`${n}-${uf}`}
                        type="button"
                        className="chip"
                        onClick={() => escolheSugestao(doCatalogo({ n, uf, pais: p, estado: false }))}
                      >
                        {n} <small className="chip-pais">{ROTULO_PAIS[p]}</small>
                      </button>
                    ))}
                  </div>
                )}

                {local && (
                  <div className="onde-escolhido">
                    <span className={`onde-bandeira onde-${local.pais}`}>{ROTULO_PAIS[local.pais]}</span>
                    <span><b>{rotuloDoLocal(local)}</b><small>{ROTULO_TIPO[local.tipo]}</small></span>
                  </div>
                )}

                <div className="field" style={{ marginTop: 14 }}>
                  <label>Área da busca</label>
                  <div className="wz-raios" role="group" aria-label="Área da busca">
                    <button
                      type="button"
                      className={`chip${raio === 'inteiro' ? ' on' : ''}`}
                      aria-pressed={raio === 'inteiro'}
                      disabled={!podeInteiro}
                      onClick={() => setRaio('inteiro')}
                    >
                      {rotuloInteiro}
                    </button>
                    {RAIOS.map((km) => (
                      <button
                        key={km}
                        type="button"
                        className={`chip${raio === km ? ' on' : ''}`}
                        aria-pressed={raio === km}
                        onClick={() => setRaio(km)}
                      >
                        {km} km
                      </button>
                    ))}
                  </div>
                  <span className="cfg-dica">
                    {raioKm
                      ? `Busca em volta do ponto e descarta o que ficar a mais de ${raioKm} km.`
                      : 'Busca pelo nome do lugar. Na próxima etapa dá para dividir a cidade por bairros.'}
                  </span>
                </div>
              </div>

              <MapaRaio local={Number.isFinite(local?.lat) ? local : null} raioKm={raioKm} />
            </div>
          )}

          {/* ETAPA 3: BAIRROS (cidade inteira) OU REVISÃO (raio) */}
          {step === 3 && dividePorBairro && (
            <div className="wz-step wz-2col">
              <div className="wz-2col-form">
                <div className="field">
                  <label htmlFor="wzBairro">Bairros (opcional: em branco busca a cidade inteira)</label>
                  <div className="hood-add">
                    <input
                      id="wzBairro"
                      placeholder={pais === 'US' ? 'Ex.: Downtown, Conway, Lake Nona' : 'Ex.: Copacabana, Pinheiros, Centro'}
                      autoComplete="off"
                      value={bairroInput}
                      onChange={(e) => setBairroInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addBairro();
                        }
                      }}
                      autoFocus
                    />
                    <button type="button" className="btn btn-sm" onClick={addBairro}>
                      <Plus size={15} strokeWidth={1.5} />
                      Adicionar
                    </button>
                  </div>
                  <button type="button" className="btn btn-sm btn-ghost hood-sugerir" onClick={sugerirBairros} disabled={!!sugerindo}>
                    {sugerindo ? <Loader size={15} strokeWidth={1.5} className="cfg-girando" /> : <MapPinned size={15} strokeWidth={1.5} />}
                    {sugerindo
                      ? `Lendo o mapa${sugerindo.total ? ` (${sugerindo.atual}/${sugerindo.total})` : ''}…`
                      : 'Sugerir bairros da cidade'}
                  </button>
                  <span className="cfg-dica">
                    {sugerindo
                      ? 'Leva cerca de 40 segundos. Na próxima vez, para a mesma cidade, é na hora.'
                      : 'Cada bairro vira uma busca separada, e os resultados são somados sem repetição. É assim que se passa do limite de cerca de 120 resultados por busca do Google Maps.'}
                  </span>
                  {erroSugestao && <span className="field-err" style={{ display: 'block' }}>{erroSugestao}</span>}
                </div>

                <div className="hood-list hood-list-rolavel">
                  {bairros.map((h, idx) => (
                    <div key={h} className="hood-row">
                      <span>{h}</span>
                      <button type="button" onClick={() => removeBairro(idx)} aria-label={`Remover ${h}`}>
                        <X size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <MapaPreviaLocal
                pais={pais}
                local={local ? { n: local.cidade || local.nome, uf: local.uf, estado: false } : null}
                textoLivre={busca}
                bairros={bairros}
              />

              <div className="wz-review wz-2col-full">
                <b>{nicho || '—'}</b>
                <span> · {rotuloDoLocal(local) || busca} · {bairros.length ? `${bairros.length} bairro(s), ${bairros.length} busca(s)` : 'cidade inteira'}</span>
                <span className="wz-review-pais"> · {ROTULO_PAIS[pais]}</span>
                {avisoIdioma && (
                  <div className="wz-aviso" style={{ marginTop: 8 }}>
                    <b>Dica para os EUA:</b> o nicho em inglês traz mais resultados da área (ex.: "house cleaning").
                    Para negócio brasileiro, mantenha em português.
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && !dividePorBairro && (
            <div className="wz-step wz-2col">
              <div className="wz-2col-form">
                <ul className="wz-resumo">
                  <li><span>Nicho</span><b>{nicho}</b></li>
                  <li><span>Onde</span><b>{rotuloDoLocal(local) || busca}</b></li>
                  <li><span>Área</span><b>{raioKm ? `Raio de ${raioKm} km` : rotuloInteiro}</b></li>
                  <li><span>País</span><b>{ROTULO_PAIS[pais]}</b></li>
                </ul>
                {avisoIdioma && (
                  <div className="wz-aviso">
                    <b>Dica para os EUA:</b> o nicho em inglês traz mais resultados da área (ex.: "house cleaning" em vez de
                    "limpeza residencial"). Para achar negócio brasileiro, mantenha em português, como "restaurante brasileiro".
                  </div>
                )}
                <span className="cfg-dica">
                  {raioKm
                    ? 'O Google Maps devolve no máximo uns 120 resultados por busca. Para áreas grandes, prefira a cidade dividida por bairros.'
                    : 'Confira e clique em Iniciar extração.'}
                </span>
              </div>
              <MapaRaio local={Number.isFinite(local?.lat) ? local : null} raioKm={raioKm} />
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" id="mCancel" onClick={onClose}>
            Cancelar
          </button>
          <span style={{ flex: 1 }} />
          {step > 1 && (
            <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>
              Voltar
            </button>
          )}
          <button type="button" className="btn btn-primary" disabled={isProcessing || (step === 2 && localizando)} onClick={handleNext}>
            {isProcessing ? 'Extração em andamento…' : (step === 3 ? 'Iniciar extração' : 'Continuar')}
          </button>
        </div>
      </div>
    </div>
  );
}
