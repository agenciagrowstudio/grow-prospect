import {
  Scissors, Scale, Coffee, Palette, UtensilsCrossed, Dumbbell, PawPrint, Home,
  Calculator, Pill, Croissant, ShoppingCart, Wrench, Camera, GraduationCap,
  Stethoscope, Building2, Car, Hammer, Truck, Church, Shirt, Music, Hotel,
  Store, Briefcase, HeartPulse, Smile, Flower2, SprayCan, Pizza, Beer, Bike,
  Landmark, BookOpen, Brush,
} from 'lucide-react';

/**
 * Ícone e tom de cada nicho.
 *
 * A cor aqui carrega significado: é a categoria do negócio, não enfeite. Todos
 * os tons são pastéis claros e a tinta é sempre escura, que é a regra do
 * sistema para esse tipo de fundo.
 *
 * A ordem importa: o primeiro termo que casar vence. Por isso "clínica
 * odontológica" precisa vir antes de "clínica", e "salão de beleza" antes de
 * "beleza".
 */
const NICHOS = [
  { termos: ['barbearia', 'barber', 'barbeiro'], Icone: Scissors, tom: '#dbeafe' },
  { termos: ['odonto', 'dentist', 'ortodont', 'aparelho'], Icone: Smile, tom: '#cffafe' },
  { termos: ['salao de beleza', 'salão de beleza', 'cabeleireir', 'hair salon'], Icone: SprayCan, tom: '#fce7f3' },
  { termos: ['manicure', 'esmalteria', 'unha', 'nail'], Icone: Brush, tom: '#fce7f3' },
  { termos: ['estetica', 'estética', 'depilacao', 'depilação', 'spa'], Icone: Flower2, tom: '#f5d0fe' },
  { termos: ['advoc', 'advogad', 'lawyer', 'imigrac', 'imigraç', 'immigration'], Icone: Scale, tom: '#e0e7ff' },
  { termos: ['contab', 'contador', 'accounting'], Icone: Calculator, tom: '#e0e7ff' },
  { termos: ['despachante', 'seguro', 'insurance', 'remessa'], Icone: Briefcase, tom: '#e0e7ff' },
  { termos: ['cafeteria', 'cafe', 'café', 'coffee'], Icone: Coffee, tom: '#fed7aa' },
  { termos: ['padaria', 'bakery', 'pao de queijo', 'pão de queijo', 'salgado', 'empada'], Icone: Croissant, tom: '#fed7aa' },
  { termos: ['pizza'], Icone: Pizza, tom: '#fecaca' },
  { termos: ['bar', 'boteco', 'botequim', 'pub', 'cervej'], Icone: Beer, tom: '#fef08a' },
  { termos: ['restaurante', 'restaurant', 'churrascaria', 'comida', 'lanchonete', 'hamburgueria', 'acai', 'açaí', 'feijoada'], Icone: UtensilsCrossed, tom: '#fecaca' },
  { termos: ['mercado', 'mercadinho', 'quitanda', 'grocery', 'loja de produtos'], Icone: ShoppingCart, tom: '#dcfce7' },
  { termos: ['academia', 'crossfit', 'personal', 'gym', 'fitness'], Icone: Dumbbell, tom: '#dcfce7' },
  { termos: ['pet', 'veterin'], Icone: PawPrint, tom: '#dcfce7' },
  { termos: ['imobili', 'corretor', 'real estate'], Icone: Home, tom: '#e0f2fe' },
  { termos: ['arquitet', 'construt', 'construcao', 'construção', 'construction', 'handyman', 'pintor', 'piso', 'landscaping'], Icone: Hammer, tom: '#fde68a' },
  { termos: ['limpeza', 'cleaning', 'faxina'], Icone: SprayCan, tom: '#ccfbf1' },
  { termos: ['mudanca', 'mudança', 'transporte', 'moving'], Icone: Truck, tom: '#fde68a' },
  { termos: ['oficina', 'auto repair', 'mecanic', 'lava jato', 'lava-jato'], Icone: Wrench, tom: '#e2e8f0' },
  { termos: ['autoescola', 'auto escola'], Icone: Car, tom: '#e2e8f0' },
  { termos: ['farmacia', 'farmácia', 'pharmacy', 'drogaria'], Icone: Pill, tom: '#cffafe' },
  { termos: ['clinica', 'clínica', 'medic', 'laborator', 'fisioterap', 'psicolog'], Icone: Stethoscope, tom: '#cffafe' },
  { termos: ['escola', 'curso', 'school', 'aula'], Icone: GraduationCap, tom: '#ede9fe' },
  { termos: ['igreja', 'church'], Icone: Church, tom: '#ede9fe' },
  { termos: ['design', 'marketing', 'agencia', 'agência'], Icone: Palette, tom: '#f5d0fe' },
  { termos: ['fotograf', 'photograph'], Icone: Camera, tom: '#f5d0fe' },
  { termos: ['musica', 'música', 'music'], Icone: Music, tom: '#ede9fe' },
  { termos: ['hotel', 'pousada', 'hostel'], Icone: Hotel, tom: '#e0f2fe' },
  { termos: ['viagem', 'travel', 'turismo'], Icone: Landmark, tom: '#e0f2fe' },
  { termos: ['roupa', 'moda', 'boutique', 'clothing'], Icone: Shirt, tom: '#fce7f3' },
  { termos: ['bicicl', 'bike'], Icone: Bike, tom: '#dcfce7' },
  { termos: ['livraria', 'papelaria', 'book'], Icone: BookOpen, tom: '#ede9fe' },
];

const PADRAO = { Icone: Store, tom: '#eef2f6' };

function normaliza(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

/**
 * Devolve sempre algo desenhável. Categoria vazia ou desconhecida cai na loja
 * genérica, porque um espaço em branco no lugar do ícone quebra o alinhamento
 * da lista inteira.
 */
export function iconeDoNicho(categoria) {
  const alvo = normaliza(categoria);
  if (!alvo) return PADRAO;
  const achado = NICHOS.find((n) => n.termos.some((t) => alvo.includes(normaliza(t))));
  return achado || PADRAO;
}

export { NICHOS, PADRAO };
