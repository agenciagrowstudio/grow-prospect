import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import MapaPreviaLocal from './MapaPreviaLocal';

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

const POP_CITIES_BR = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Brasília', 'Curitiba', 'Porto Alegre', 'Salvador', 'Recife', 'Fortaleza', 'Goiânia'];

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

const POP_CITIES_US = ['Framingham', 'Pompano Beach', 'Orlando', 'Newark', 'Danbury', 'Marietta', 'Boston', 'Miami'];

const CATALOGO = {
  BR: { nichos: NICHOS_BR, cidades: CIDADES_BR, estados: ESTADOS_BR, populares: POP_CITIES_BR, rotuloEstado: 'Estado', rotuloCidade: 'Municipio' },
  US: { nichos: NICHOS_US, cidades: CIDADES_US, estados: ESTADOS_US, populares: POP_CITIES_US, rotuloEstado: 'Estado', rotuloCidade: 'Cidade' },
};

function norm(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export default function NewExtractionModal({
  isOpen,
  onClose,
  onStartExtraction,
  onAddToQueue,
  isProcessing
}) {
  const [step, setStep] = useState(1);
  // O pais escolhido troca nichos, cidades e o filtro da geocodificacao.
  const [pais, setPais] = useState('BR');
  const [nicho, setNicho] = useState('');
  const [nichoError, setNichoError] = useState(false);
  const [nichoSuggestions, setNichoSuggestions] = useState([]);
  const [showNichoList, setShowNichoList] = useState(false);

  const [cidadeObj, setCidadeObj] = useState(null);
  const [cidadeInput, setCidadeInput] = useState('');
  const [cidadeError, setCidadeError] = useState(false);
  const [locSuggestions, setLocSuggestions] = useState([]);
  const [showLocList, setShowLocList] = useState(false);

  const [bairroInput, setBairroInput] = useState('');
  const [bairros, setBairros] = useState([]);

  const carViewRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setNicho('');
      setNichoError(false);
      setCidadeObj(null);
      setCidadeInput('');
      setCidadeError(false);
      setBairroInput('');
      setBairros([]);
      setPais('BR');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cat = CATALOGO[pais] || CATALOGO.BR;

  const wzTitles = {
    1: 'Qual nicho você quer pesquisar?',
    2: pais === 'US' ? 'Em qual cidade dos Estados Unidos?' : 'Em qual cidade?',
    3: pais === 'US' ? 'Quais bairros ou regiões?' : 'Quais bairros?'
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
    cat.nichos.forEach((t) => {
      const nt = norm(t);
      if (nt.indexOf(nq) === 0) pre.push(t);
      else if (nt.indexOf(nq) >= 0) mid.push(t);
    });
    const results = pre.concat(mid).slice(0, 7);
    setNichoSuggestions(results);
    setShowNichoList(results.length > 0);
  };

  const trocaPais = (sigla) => {
    if (sigla === pais) return;
    setPais(sigla);
    // Cidade de um pais nao existe no outro, e bairro muito menos. Os dois
    // voltam ao inicio. O nicho fica: se o usuario digitou, foi de proposito,
    // e nome em portugues e justamente o que acha negocio brasileiro la.
    setCidadeObj(null);
    setCidadeInput('');
    setCidadeError(false);
    setLocSuggestions([]);
    setShowLocList(false);
    setBairros([]);
    setBairroInput('');
  };

  const pickNicho = (val) => {
    setNicho(val);
    setNichoError(false);
    setShowNichoList(false);
    setStep(2);
  };

  const handleLocChange = (val) => {
    setCidadeInput(val);
    setCidadeObj(null);
    setCidadeError(false);
    const nq = norm(val).trim();
    if (!nq) {
      setLocSuggestions([]);
      setShowLocList(false);
      return;
    }
    const all = cat.cidades.concat(cat.estados);
    const scored = [];
    all.forEach((c) => {
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
    const results = scored.slice(0, 7).map((r) => r.c);
    setLocSuggestions(results);
    setShowLocList(results.length > 0);
  };

  const pickLoc = (item) => {
    setCidadeObj(item);
    setCidadeInput(item.estado ? `${item.n} · Estado` : `${item.n} — ${item.uf}`);
    setCidadeError(false);
    setShowLocList(false);
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

  const cidadeLabel = () => {
    if (!cidadeObj) return cidadeInput;
    return cidadeObj.estado ? `${cidadeObj.n} · Estado` : `${cidadeObj.n} — ${cidadeObj.uf}`;
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
      if (!cidadeInput.trim() && !cidadeObj) {
        setCidadeError(true);
        return;
      }
      setCidadeError(false);
      setStep(3);
      return;
    }
    // Step 3 - Start extraction!
    const neigh = bairros.length > 0 ? bairros.join(', ') : '';
    const city = cidadeObj ? (cidadeObj.estado ? cidadeObj.n : `${cidadeObj.n}, ${cidadeObj.uf}`) : cidadeInput;
    onStartExtraction?.({
      niche: nicho.trim(),
      neigh,
      city,
      pais,
      limit: 1000
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

          {/* STEP 1: NICHO */}
          {step === 1 && (
            <div className="wz-step">
              {/* Vem antes do nicho porque a lista de nichos depende dele. */}
              <div className="wz-pais" role="group" aria-label="Onde prospectar">
                <button
                  type="button"
                  className={`wz-pais-btn${pais === 'BR' ? ' on' : ''}`}
                  aria-pressed={pais === 'BR'}
                  onClick={() => trocaPais('BR')}
                >
                  Brasil
                </button>
                <button
                  type="button"
                  className={`wz-pais-btn${pais === 'US' ? ' on' : ''}`}
                  aria-pressed={pais === 'US'}
                  onClick={() => trocaPais('US')}
                >
                  Brasileiros nos EUA
                </button>
              </div>

              <div className={`field ${nichoError ? 'invalid' : ''}`}>
                <label htmlFor="wzNicho">Nicho</label>
                <div className="ac-wrap">
                  <input
                    id="wzNicho"
                    placeholder={pais === 'US' ? 'Ex.: restaurante brasileiro, limpeza, despachante' : 'Ex.: dentistas, advogados, pizzarias'}
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
                        <button
                          key={item}
                          type="button"
                          className="ac-item"
                          onClick={() => pickNicho(item)}
                        >
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
                  {cat.nichos.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="chip"
                      onClick={() => pickNicho(t)}
                    >
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

          {/* STEP 2: CIDADE */}
          {step === 2 && (
            <div className="wz-step wz-2col">
             <div className="wz-2col-form">
              <div className={`field ${cidadeError ? 'invalid' : ''}`}>
                <label htmlFor="wzCidade">Cidade ou estado</label>
                <div className="ac-wrap">
                  <input
                    id="wzCidade"
                    placeholder={pais === 'US' ? 'Ex.: Framingham, Pompano Beach, Newark' : 'Ex.: Rio de Janeiro, São Paulo, Curitiba'}
                    autoComplete="off"
                    value={cidadeInput}
                    onChange={(e) => handleLocChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleNext();
                      }
                    }}
                    autoFocus
                  />
                  {showLocList && locSuggestions.length > 0 && (
                    <div className="ac-list" role="listbox">
                      {locSuggestions.map((c) => (
                        <button
                          key={`${c.n}-${c.uf}`}
                          type="button"
                          className="ac-item"
                          onClick={() => {
                            pickLoc(c);
                            setStep(3);
                          }}
                        >
                          <span>
                            <span>{c.n} — {c.uf}</span>
                            <small>{c.estado ? cat.rotuloEstado : cat.rotuloCidade}</small>
                          </span>
                          <span className="t">{c.estado ? cat.rotuloEstado : cat.rotuloCidade}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {cidadeError && <span className="field-err" style={{ display: 'block' }}>Escolha uma localização para continuar.</span>}
              </div>

              <div className="ex-chips" style={{ marginTop: '12px' }}>
                {cat.populares.map((name) => {
                  const hit = cat.cidades.find((c) => c.n === name);
                  if (!hit) return null;
                  return (
                    <button
                      key={name}
                      type="button"
                      className="chip"
                      onClick={() => {
                        pickLoc(hit);
                        setStep(3);
                      }}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
             </div>

              {/* Confere o lugar antes de gastar uma extracao. */}
              <MapaPreviaLocal pais={pais} local={cidadeObj} textoLivre={cidadeInput} bairros={[]} />
            </div>
          )}

          {/* STEP 3: BAIRROS */}
          {step === 3 && (
            <div className="wz-step wz-2col">
             <div className="wz-2col-form">
              <div className="field">
                <label htmlFor="wzBairro">
                  {pais === 'US'
                    ? 'Bairros ou regiões (opcional: em branco busca a cidade inteira)'
                    : 'Bairros (opcional: em branco busca o município inteiro)'}
                </label>
                <div className="hood-add">
                  <input
                    id="wzBairro"
                    placeholder={pais === 'US' ? 'Ex.: Downtown, Saxonville, Nobscot' : 'Ex.: Copacabana, Pinheiros, Centro'}
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
              </div>

              <div className="hood-list">
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

              {/* Com bairros na lista o mapa enquadra todos; sem nenhum, mostra
                  o municipio inteiro, que e exatamente o que sera extraido. */}
              <MapaPreviaLocal pais={pais} local={cidadeObj} textoLivre={cidadeInput} bairros={bairros} />

              <div className="wz-review wz-2col-full">
                <b>{nicho || '—'}</b>
                <span> · {cidadeLabel()} · {bairros.length ? `${bairros.length} bairro(s)` : (pais === 'US' ? 'cidade inteira' : 'município inteiro')}</span>
                {pais === 'US' && <span className="wz-review-pais"> · Estados Unidos</span>}
              </div>
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
          <button type="button" className="btn btn-primary" disabled={isProcessing} onClick={handleNext}>
            {isProcessing ? 'Extração em andamento…' : (step === 3 ? 'Iniciar extração' : 'Continuar')}
          </button>
        </div>
      </div>
    </div>
  );
}
