import type { SectionType } from "./types";
import { SECTION_TYPE_LABELS } from "./types";

/**
 * Schemas dos editores de seção (painel admin) — portados do MVP.
 *
 * O editor é 100% guiado por estes schemas: adicionar um campo a uma seção =
 * adicionar uma entrada em `fields` (e usá-lo no componente da seção);
 * adicionar um tipo de seção = nova entrada aqui + componente no registry.
 * Nenhum formulário é escrito à mão por tipo.
 */

export interface BaseField {
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
}

export interface TextField extends BaseField {
  kind: "text";
}

export interface TextareaField extends BaseField {
  kind: "textarea";
  rows?: number;
}

/** Campo de imagem: referência {url, alt_text} escolhida do acervo. */
export interface ImageField extends BaseField {
  kind: "image";
}

export interface CheckboxField extends BaseField {
  kind: "checkbox";
}

/** Campos permitidos dentro de itens de lista e blocos de richcontent. */
export type SimpleField = TextField | TextareaField | ImageField | CheckboxField;

/** Lista de strings curtas (ex.: infos rápidas da localização). */
export interface PillsField extends BaseField {
  kind: "pills";
  maxItems?: number;
  itemMaxLength?: number;
}

/** Lista de itens estruturados (cards, eventos, marcos da timeline). */
export interface ListField extends BaseField {
  kind: "list";
  itemLabel: string;
  itemFields: SimpleField[];
  itemDefault: Record<string, unknown>;
  maxItems?: number;
}

/** Blocos editoriais livres (parágrafo, subtítulo, imagem, citação). */
export interface RichContentField extends BaseField {
  kind: "richcontent";
  blocks: RichBlockDef[];
}

export interface RichBlockDef {
  type: string;
  label: string;
  fields: SimpleField[];
  defaultValue: Record<string, unknown>;
}

export type SectionField =
  | TextField
  | TextareaField
  | ImageField
  | CheckboxField
  | PillsField
  | ListField
  | RichContentField;

export interface SectionSchema {
  type: SectionType;
  label: string;
  description: string;
  fields: SectionField[];
  defaultContent: Record<string, unknown>;
}

const EMPTY_IMAGE = { url: null, alt_text: "" };

const kicker = (placeholder: string): TextField => ({
  kind: "text",
  key: "kicker",
  label: "Chapéu",
  placeholder,
  hint: "Linha pequena acima do título.",
  maxLength: 60,
});

const title = (placeholder: string): TextField => ({
  kind: "text",
  key: "title",
  label: "Título",
  placeholder,
  required: true,
  maxLength: 100,
});

export const SECTION_SCHEMAS: Record<SectionType, SectionSchema> = {
  hero: {
    type: "hero",
    label: SECTION_TYPE_LABELS.hero,
    description: "Abertura da página: título grande, frase e imagem de destaque.",
    fields: [
      kicker("Ex.: Comunidade quilombola"),
      title("Ex.: Kalunga"),
      {
        kind: "textarea",
        key: "tagline",
        label: "Frase de apresentação",
        placeholder: "Ex.: Há mais de 200 anos guardando a Chapada.",
        maxLength: 200,
        rows: 2,
      },
      { kind: "image", key: "image", label: "Imagem de destaque" },
      {
        kind: "text",
        key: "selo",
        label: "Selo",
        placeholder: "Ex.: Território certificado",
        hint: "Etiqueta curta de destaque, opcional.",
        maxLength: 60,
      },
    ],
    defaultContent: {
      kicker: "",
      title: "",
      tagline: "",
      image: EMPTY_IMAGE,
      selo: "",
    },
  },

  description_short: {
    type: "description_short",
    label: SECTION_TYPE_LABELS.description_short,
    description: "Frase de destaque em letras grandes, com retrato opcional.",
    fields: [
      {
        kind: "text",
        key: "label",
        label: "Rótulo",
        placeholder: "Ex.: Quem somos",
        maxLength: 60,
      },
      {
        kind: "textarea",
        key: "body",
        label: "Texto de destaque",
        placeholder: "Ex.: Somos guardiões das águas e do cerrado.",
        required: true,
        maxLength: 300,
        rows: 3,
      },
      { kind: "image", key: "portrait", label: "Retrato" },
    ],
    defaultContent: { label: "", body: "", portrait: EMPTY_IMAGE },
  },

  description_long: {
    type: "description_long",
    label: SECTION_TYPE_LABELS.description_long,
    description:
      "Narrativa longa com blocos livres: parágrafos, subtítulos, imagens e citações.",
    fields: [
      kicker("Ex.: Nossa história"),
      title("Ex.: Do refúgio ao território"),
      {
        kind: "richcontent",
        key: "blocks",
        label: "Conteúdo",
        blocks: [
          {
            type: "paragraph",
            label: "Parágrafo",
            fields: [
              {
                kind: "textarea",
                key: "text",
                label: "Texto",
                placeholder: "Escreva um parágrafo…",
                required: true,
                rows: 4,
              },
            ],
            defaultValue: { type: "paragraph", text: "" },
          },
          {
            type: "heading",
            label: "Subtítulo",
            fields: [
              {
                kind: "text",
                key: "text",
                label: "Subtítulo",
                placeholder: "Ex.: O reconhecimento",
                required: true,
                maxLength: 100,
              },
            ],
            defaultValue: { type: "heading", text: "" },
          },
          {
            type: "image",
            label: "Imagem",
            fields: [
              { kind: "image", key: "image", label: "Imagem", required: true },
              {
                kind: "text",
                key: "caption",
                label: "Legenda",
                placeholder: "Ex.: O encontro dos mais velhos · arquivo da comunidade",
                maxLength: 200,
              },
            ],
            defaultValue: { type: "image", image: EMPTY_IMAGE, caption: "" },
          },
          {
            type: "quote",
            label: "Citação",
            fields: [
              {
                kind: "textarea",
                key: "text",
                label: "Citação",
                placeholder: "Ex.: A terra não foi dada. Ela foi lembrada até virar documento.",
                required: true,
                maxLength: 400,
                rows: 3,
              },
              {
                kind: "text",
                key: "cite",
                label: "Fonte / autoria",
                placeholder: "Ex.: Seu Antônio, pescador, 79 anos",
                maxLength: 120,
              },
            ],
            defaultValue: { type: "quote", text: "", cite: "" },
          },
        ],
      },
    ],
    defaultContent: {
      kicker: "",
      title: "",
      blocks: [{ type: "paragraph", text: "" }],
    },
  },

  carousel: {
    type: "carousel",
    label: SECTION_TYPE_LABELS.carousel,
    description: "Cartões com imagem e legenda que deslizam na horizontal.",
    fields: [
      kicker("Ex.: Dia a dia"),
      title("Ex.: A vida na comunidade"),
      {
        kind: "list",
        key: "cards",
        label: "Cartões",
        itemLabel: "Cartão",
        maxItems: 12,
        itemFields: [
          {
            kind: "text",
            key: "title",
            label: "Título",
            placeholder: "Ex.: A frota volta antes do meio-dia",
            required: true,
            maxLength: 100,
          },
          {
            kind: "text",
            key: "subtitle",
            label: "Legenda",
            placeholder: "Ex.: Praia do Batoque · 2025",
            maxLength: 80,
          },
          { kind: "image", key: "image", label: "Imagem" },
        ],
        itemDefault: { title: "", subtitle: "", image: EMPTY_IMAGE },
      },
    ],
    defaultContent: { kicker: "", title: "", cards: [] },
  },

  events: {
    type: "events",
    label: SECTION_TYPE_LABELS.events,
    description: "Agenda de festas, reuniões e mutirões.",
    fields: [
      kicker("Ex.: Agenda"),
      title("Ex.: Próximos encontros"),
      {
        kind: "list",
        key: "events",
        label: "Eventos",
        itemLabel: "Evento",
        maxItems: 12,
        itemFields: [
          {
            kind: "text",
            key: "day",
            label: "Dia",
            placeholder: "Ex.: 29",
            required: true,
            maxLength: 2,
          },
          {
            kind: "text",
            key: "month",
            label: "Mês (abreviado)",
            placeholder: "Ex.: Jun",
            required: true,
            maxLength: 3,
          },
          {
            kind: "text",
            key: "datetime",
            label: "Data (AAAA-MM-DD)",
            placeholder: "Ex.: 2026-06-29",
            maxLength: 10,
          },
          {
            kind: "text",
            key: "title",
            label: "Título do evento",
            placeholder: "Ex.: Festa de São Pedro",
            required: true,
            maxLength: 100,
          },
          {
            kind: "textarea",
            key: "description",
            label: "Descrição",
            placeholder: "Ex.: A procissão de barcos abençoa a maré.",
            maxLength: 300,
            rows: 2,
          },
        ],
        itemDefault: {
          day: "",
          month: "",
          datetime: "",
          title: "",
          description: "",
        },
      },
    ],
    defaultContent: { kicker: "", title: "", events: [] },
  },

  timeline: {
    type: "timeline",
    label: SECTION_TYPE_LABELS.timeline,
    description: "Marcos da história da comunidade em ordem cronológica.",
    fields: [
      kicker("Ex.: Memória"),
      title("Ex.: Nossa caminhada"),
      {
        kind: "list",
        key: "entries",
        label: "Marcos",
        itemLabel: "Marco",
        maxItems: 20,
        itemFields: [
          {
            kind: "text",
            key: "year",
            label: "Ano / período",
            placeholder: "Ex.: 1888 ou Séc. XVIII",
            required: true,
            maxLength: 20,
          },
          {
            kind: "text",
            key: "title",
            label: "Título do marco",
            placeholder: "Ex.: A permanência",
            required: true,
            maxLength: 100,
          },
          {
            kind: "textarea",
            key: "description",
            label: "Descrição",
            placeholder: "Ex.: Famílias negras já viviam da pesca…",
            maxLength: 400,
            rows: 2,
          },
          {
            kind: "checkbox",
            key: "is_recent",
            label: "Marcar como recente / destaque",
          },
        ],
        itemDefault: { year: "", title: "", description: "", is_recent: false },
      },
    ],
    defaultContent: { kicker: "", title: "", entries: [] },
  },

  location: {
    type: "location",
    label: SECTION_TYPE_LABELS.location,
    description: "Endereço, informações rápidas e mapa de como chegar.",
    fields: [
      kicker("Ex.: Visite-nos"),
      title("Ex.: Onde estamos"),
      {
        kind: "text",
        key: "place_name",
        label: "Nome do lugar",
        placeholder: "Ex.: Sítio Histórico Kalunga",
        maxLength: 100,
      },
      {
        kind: "textarea",
        key: "address",
        label: "Endereço / como chegar",
        placeholder: "Ex.: Cavalcante – GO, Chapada dos Veadeiros",
        maxLength: 300,
        rows: 2,
        hint: "Também é usado no botão “Como chegar” (mapa).",
      },
      {
        kind: "pills",
        key: "pills",
        label: "Informações rápidas",
        hint: "Etiquetas curtas, ex.: “Visitas guiadas”, “Acesso por estrada de terra”.",
        maxItems: 6,
        itemMaxLength: 40,
      },
      {
        kind: "text",
        key: "cta_label",
        label: "Texto do botão de rota",
        placeholder: "Ex.: Como chegar",
        maxLength: 40,
      },
      { kind: "image", key: "map_image", label: "Imagem do mapa" },
    ],
    defaultContent: {
      kicker: "",
      title: "",
      place_name: "",
      address: "",
      pills: [],
      cta_label: "",
      map_image: EMPTY_IMAGE,
    },
  },
};

/** Conteúdo inicial de um tipo, pronto para clonar ao criar a seção. */
export function defaultContentFor(type: SectionType): Record<string, unknown> {
  return structuredClone(SECTION_SCHEMAS[type].defaultContent);
}
