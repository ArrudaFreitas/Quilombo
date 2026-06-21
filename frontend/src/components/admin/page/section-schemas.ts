/**
 * Definição declarativa de cada tipo de seção — porte fiel do
 * `tabs/sectionSchemas.js` do MVP. É a fonte única que dirige **o editor** (este
 * admin) e **o renderizador** público (Fase 2). O conteúdo é JSON livre no banco;
 * o schema dá a forma. As chaves de conteúdo seguem o MVP (snake_case).
 *
 * Tipos de campo:
 *   text        — input linha única
 *   textarea    — textarea multi-linha
 *   checkbox    — booleano
 *   pills       — array de strings simples
 *   image       — { url, alt_text }
 *   cards/events/timeline — array de objetos com `itemSchema` próprio
 *   richcontent — array de blocos tipados (paragraph | heading | image | quote)
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'checkbox'
  | 'pills'
  | 'image'
  | 'cards'
  | 'events'
  | 'timeline'
  | 'richcontent'

export interface BlockType {
  type: string
  label: string
  fields: SectionField[]
  defaultValue: Record<string, unknown>
}

export interface SectionField {
  key: string
  type: FieldType
  label: string
  hint?: string
  placeholder?: string
  required?: boolean
  maxLength?: number
  minItems?: number
  maxItems?: number
  /** para cards/events/timeline */
  itemSchema?: SectionField[]
  defaultItem?: Record<string, unknown>
  /** para richcontent */
  blockTypes?: BlockType[]
}

export interface SectionSchema {
  type: string
  label: string
  description: string
  fields: SectionField[]
  defaultContent: Record<string, unknown>
}

export const SECTION_SCHEMAS: SectionSchema[] = [
  // ── HERO ──────────────────────────────────────────────────────────────────
  {
    type: 'hero',
    label: 'Hero',
    description:
      'Primeira seção da página. Apresenta a comunidade com título, subtítulo e imagem de destaque.',
    fields: [
      {
        key: 'kicker',
        type: 'text',
        label: 'Etiqueta',
        placeholder: 'Ex: Memória viva · litoral do Ceará',
        hint: 'Texto pequeno acima do título. Serve como contexto rápido — localização, tema ou lema.',
        required: false,
        maxLength: 80,
      },
      {
        key: 'title',
        type: 'text',
        label: 'Título principal',
        placeholder: 'Ex: A nossa história continua, e a porteira fica aberta.',
        hint: 'O título mais importante da página. Seja marcante e verdadeiro.',
        required: true,
        maxLength: 120,
      },
      {
        key: 'tagline',
        type: 'textarea',
        label: 'Subtítulo',
        placeholder:
          'Ex: Entre a duna e o mangue, uma comunidade negra cuida da terra e de quem chega.',
        hint: 'Uma ou duas frases que ampliam o título. Fale da essência da comunidade.',
        required: false,
        maxLength: 300,
      },
      {
        key: 'image',
        type: 'image',
        label: 'Imagem de fundo / destaque',
        hint: 'Imagem principal do hero. Formato paisagem (16:9 ou mais largo).',
        required: false,
      },
      {
        key: 'cta_primary',
        type: 'text',
        label: 'Botão principal (texto)',
        placeholder: 'Ex: Conhecer a comunidade',
        hint: 'Texto do botão de destaque. Opcional — se vazio, o botão não aparece.',
        required: false,
        maxLength: 50,
      },
      {
        key: 'cta_secondary',
        type: 'text',
        label: 'Botão secundário (texto)',
        placeholder: 'Ex: Ver os encontros',
        hint: 'Texto do botão secundário. Opcional.',
        required: false,
        maxLength: 50,
      },
      {
        key: 'selo',
        type: 'text',
        label: 'Selo / carimbo',
        placeholder: 'Ex: cuidar é resistir',
        hint: 'Texto curto que aparece como um selo girado sobre a imagem. Use uma frase marcante da comunidade.',
        required: false,
        maxLength: 40,
      },
    ],
    defaultContent: {
      kicker: '',
      title: '',
      tagline: '',
      image: { url: null, alt_text: '' },
      cta_primary: 'Conhecer a comunidade',
      cta_secondary: '',
      selo: '',
    },
  },

  // ── DESCRIÇÃO CURTA ───────────────────────────────────────────────────────
  {
    type: 'description_short',
    label: 'Descrição curta',
    description:
      'Painel de destaque com uma citação ou frase marcante sobre a comunidade.',
    fields: [
      {
        key: 'label',
        type: 'text',
        label: 'Etiqueta',
        placeholder: 'Ex: A comunidade',
        hint: 'Pequena tag acima do texto. Identifica o tema da seção.',
        required: false,
        maxLength: 60,
      },
      {
        key: 'body',
        type: 'textarea',
        label: 'Texto de destaque',
        placeholder:
          'Ex: Somos cento e oitenta famílias que herdaram o mar, a terra e o nome.',
        hint: 'Frase ou parágrafo curto que resume a identidade da comunidade. Será exibido em fonte grande.',
        required: true,
        maxLength: 400,
      },
      {
        key: 'portrait',
        type: 'image',
        label: 'Retrato (imagem circular, opcional)',
        hint: 'Foto de uma pessoa ou símbolo da comunidade. Aparece em formato circular acima do texto.',
        required: false,
      },
    ],
    defaultContent: {
      label: 'A comunidade',
      body: '',
      portrait: { url: null, alt_text: '' },
    },
  },

  // ── DESCRIÇÃO LONGA ───────────────────────────────────────────────────────
  {
    type: 'description_long',
    label: 'Descrição longa',
    description:
      'Seção editorial com texto longo, subtítulos, imagens e citações. Ideal para a história da comunidade.',
    fields: [
      {
        key: 'kicker',
        type: 'text',
        label: 'Etiqueta',
        placeholder: 'Ex: Nossa história',
        required: false,
        maxLength: 80,
      },
      {
        key: 'title',
        type: 'text',
        label: 'Título da seção',
        placeholder: 'Ex: Antes da estrada, já havia gente',
        required: true,
        maxLength: 120,
      },
      {
        key: 'blocks',
        type: 'richcontent',
        label: 'Conteúdo',
        hint: 'Adicione parágrafos, subtítulos, imagens com legenda e citações em qualquer ordem.',
        required: true,
        blockTypes: [
          {
            type: 'paragraph',
            label: 'Parágrafo',
            fields: [
              {
                key: 'text',
                type: 'textarea',
                label: 'Texto',
                placeholder: 'Escreva um parágrafo...',
                required: true,
              },
            ],
            defaultValue: { type: 'paragraph', text: '' },
          },
          {
            type: 'heading',
            label: 'Subtítulo',
            fields: [
              {
                key: 'text',
                type: 'text',
                label: 'Subtítulo',
                placeholder: 'Ex: O reconhecimento',
                required: true,
                maxLength: 100,
              },
            ],
            defaultValue: { type: 'heading', text: '' },
          },
          {
            type: 'image',
            label: 'Imagem com legenda',
            fields: [
              { key: 'image', type: 'image', label: 'Imagem', required: true },
              {
                key: 'caption',
                type: 'text',
                label: 'Legenda',
                placeholder:
                  'Ex: O encontro dos mais velhos sob o juazeiro · arquivo da comunidade',
                required: false,
                maxLength: 200,
              },
            ],
            defaultValue: {
              type: 'image',
              image: { url: null, alt_text: '' },
              caption: '',
            },
          },
          {
            type: 'quote',
            label: 'Citação',
            fields: [
              {
                key: 'text',
                type: 'textarea',
                label: 'Citação',
                placeholder:
                  'Ex: A terra não foi dada. Ela foi lembrada até virar documento.',
                required: true,
                maxLength: 400,
              },
              {
                key: 'cite',
                type: 'text',
                label: 'Fonte / autoria',
                placeholder: 'Ex: Seu Antônio, pescador, 79 anos',
                required: false,
                maxLength: 120,
              },
            ],
            defaultValue: { type: 'quote', text: '', cite: '' },
          },
        ],
      },
    ],
    defaultContent: {
      kicker: 'Nossa história',
      title: '',
      blocks: [{ type: 'paragraph', text: '' }],
    },
  },

  // ── CARROSSEL ─────────────────────────────────────────────────────────────
  {
    type: 'carousel',
    label: 'Carrossel',
    description: 'Galeria horizontal de cards com imagem, título e legenda.',
    fields: [
      {
        key: 'kicker',
        type: 'text',
        label: 'Etiqueta',
        placeholder: 'Ex: Memória em imagens',
        required: false,
        maxLength: 80,
      },
      {
        key: 'title',
        type: 'text',
        label: 'Título da seção',
        placeholder: 'Ex: O dia a dia do Batoque',
        required: true,
        maxLength: 120,
      },
      {
        key: 'cards',
        type: 'cards',
        label: 'Cards',
        hint: 'Cada card tem imagem, título e uma legenda curta. Mínimo 2, máximo 12.',
        required: true,
        minItems: 2,
        maxItems: 12,
        itemSchema: [
          {
            key: 'title',
            type: 'text',
            label: 'Título',
            placeholder: 'Ex: A frota volta antes do meio-dia',
            required: true,
            maxLength: 100,
          },
          {
            key: 'subtitle',
            type: 'text',
            label: 'Legenda',
            placeholder: 'Ex: Praia do Batoque · 2025',
            required: false,
            maxLength: 80,
          },
          { key: 'image', type: 'image', label: 'Imagem', required: false },
        ],
        defaultItem: {
          title: '',
          subtitle: '',
          image: { url: null, alt_text: '' },
        },
      },
    ],
    defaultContent: {
      kicker: '',
      title: '',
      cards: [
        { title: '', subtitle: '', image: { url: null, alt_text: '' } },
        { title: '', subtitle: '', image: { url: null, alt_text: '' } },
      ],
    },
  },

  // ── EVENTOS ───────────────────────────────────────────────────────────────
  {
    type: 'events',
    label: 'Eventos / Encontros',
    description:
      'Lista de eventos com data, título e descrição. Ideal para festas, reuniões e mutirões.',
    fields: [
      {
        key: 'kicker',
        type: 'text',
        label: 'Etiqueta',
        placeholder: 'Ex: Próximos encontros',
        required: false,
        maxLength: 80,
      },
      {
        key: 'title',
        type: 'text',
        label: 'Título da seção',
        placeholder: 'Ex: Quando a comunidade se reúne',
        required: true,
        maxLength: 120,
      },
      {
        key: 'events',
        type: 'events',
        label: 'Eventos',
        hint: 'Adicione os eventos em qualquer ordem. Máximo 20 eventos.',
        required: true,
        minItems: 1,
        maxItems: 20,
        itemSchema: [
          {
            key: 'day',
            type: 'text',
            label: 'Dia',
            placeholder: 'Ex: 29',
            required: true,
            maxLength: 2,
          },
          {
            key: 'month',
            type: 'text',
            label: 'Mês (abrev)',
            placeholder: 'Ex: Jun',
            required: true,
            maxLength: 3,
          },
          {
            key: 'datetime',
            type: 'text',
            label: 'Data (AAAA-MM-DD)',
            placeholder: 'Ex: 2026-06-29',
            required: false,
            maxLength: 10,
          },
          {
            key: 'title',
            type: 'text',
            label: 'Título do evento',
            placeholder: 'Ex: Festa de São Pedro',
            required: true,
            maxLength: 100,
          },
          {
            key: 'description',
            type: 'textarea',
            label: 'Descrição',
            placeholder: 'Ex: A procissão de barcos abençoa a maré.',
            required: false,
            maxLength: 300,
          },
        ],
        defaultItem: {
          day: '',
          month: '',
          datetime: '',
          title: '',
          description: '',
        },
      },
    ],
    defaultContent: {
      kicker: 'Próximos encontros',
      title: '',
      events: [
        { day: '', month: '', datetime: '', title: '', description: '' },
      ],
    },
  },

  // ── CRONOLOGIA / TIMELINE ─────────────────────────────────────────────────
  {
    type: 'timeline',
    label: 'Cronologia',
    description: 'Linha do tempo com marcos históricos da comunidade.',
    fields: [
      {
        key: 'kicker',
        type: 'text',
        label: 'Etiqueta',
        placeholder: 'Ex: Nosso caminho',
        required: false,
        maxLength: 80,
      },
      {
        key: 'title',
        type: 'text',
        label: 'Título da seção',
        placeholder: 'Ex: Marcos que nos trouxeram até aqui',
        required: true,
        maxLength: 120,
      },
      {
        key: 'entries',
        type: 'timeline',
        label: 'Marcos históricos',
        hint: 'Adicione os marcos em ordem cronológica. Máximo 20 entradas. O último pode ser marcado como "recente" para receber destaque visual.',
        required: true,
        minItems: 1,
        maxItems: 20,
        itemSchema: [
          {
            key: 'year',
            type: 'text',
            label: 'Ano / Período',
            placeholder: 'Ex: 1888  ou  Séc. XVIII',
            required: true,
            maxLength: 20,
          },
          {
            key: 'title',
            type: 'text',
            label: 'Título do marco',
            placeholder: 'Ex: A permanência',
            required: true,
            maxLength: 100,
          },
          {
            key: 'description',
            type: 'textarea',
            label: 'Descrição',
            placeholder: 'Ex: Famílias negras já viviam da pesca...',
            required: false,
            maxLength: 400,
          },
          {
            key: 'is_recent',
            type: 'checkbox',
            label: 'Marcar como recente / destaque',
            required: false,
          },
        ],
        defaultItem: { year: '', title: '', description: '', is_recent: false },
      },
    ],
    defaultContent: {
      kicker: 'Nosso caminho',
      title: '',
      entries: [{ year: '', title: '', description: '', is_recent: false }],
    },
  },

  // ── LOCALIZAÇÃO ───────────────────────────────────────────────────────────
  {
    type: 'location',
    label: 'Localização',
    description:
      'Seção com mapa visual, endereço, informações práticas e botão de direções.',
    fields: [
      {
        key: 'kicker',
        type: 'text',
        label: 'Etiqueta',
        placeholder: 'Ex: Onde estamos',
        required: false,
        maxLength: 80,
      },
      {
        key: 'title',
        type: 'text',
        label: 'Título da seção',
        placeholder: 'Ex: Venha com tempo e respeito',
        required: true,
        maxLength: 120,
      },
      {
        key: 'place_name',
        type: 'text',
        label: 'Nome do lugar',
        placeholder: 'Ex: Praia do Batoque',
        hint: 'Nome que aparece como cabeçalho do card de endereço.',
        required: true,
        maxLength: 100,
      },
      {
        key: 'address',
        type: 'textarea',
        label: 'Endereço',
        placeholder: 'Ex: Aquiraz — Ceará\nCEP 61700-000',
        hint: 'Endereço completo. Pode usar quebras de linha.',
        required: false,
        maxLength: 300,
      },
      {
        key: 'pills',
        type: 'pills',
        label: 'Informações rápidas',
        hint: 'Pequenas etiquetas com dados práticos: distância, como visitar, melhor época. Máximo 6.',
        required: false,
        maxItems: 6,
        placeholder: 'Ex: ≈ 50 km de Fortaleza',
      },
      {
        key: 'cta_label',
        type: 'text',
        label: 'Texto do botão de direções',
        placeholder: 'Ex: Como chegar',
        hint: 'Opcional — se vazio, o botão não aparece.',
        required: false,
        maxLength: 50,
      },
      {
        key: 'map_image',
        type: 'image',
        label: 'Imagem do mapa / local (opcional)',
        hint: 'Foto aérea, mapa desenhado ou imagem representativa da localização.',
        required: false,
      },
    ],
    defaultContent: {
      kicker: 'Onde estamos',
      title: '',
      place_name: '',
      address: '',
      pills: [],
      cta_label: 'Como chegar',
      map_image: { url: null, alt_text: '' },
    },
  },
]

/** Map rápido: type → schema. */
export const SCHEMA_BY_TYPE: Record<string, SectionSchema> = Object.fromEntries(
  SECTION_SCHEMAS.map((s) => [s.type, s]),
)

/** Clona o `defaultContent` de um tipo, pronto para uma seção nova. */
export function getDefaultContent(
  sectionType: string,
): Record<string, unknown> {
  const schema = SCHEMA_BY_TYPE[sectionType]
  if (!schema) return {}
  return structuredClone(schema.defaultContent)
}
