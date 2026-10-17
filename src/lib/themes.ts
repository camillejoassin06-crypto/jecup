// Thèmes visuels : chaque thème redéfinit les jetons de couleur (HSL) en clair et en sombre.

export type ThemeId = "classique" | "ocean" | "foret" | "soleil" | "bonbon" | "nuit" | "contraste";

type Tokens = Record<string, string>;

export interface ThemeDef {
  id: ThemeId;
  label: string;
  emoji: string;
  description: string;
  light: Tokens;
  dark: Tokens;
  /** couleurs d'aperçu (fond, carte, principale, secondaire) */
  swatch: [string, string, string, string];
}

export const THEMES: ThemeDef[] = [
  {
    id: "classique",
    label: "Classique",
    emoji: "💜",
    description: "Indigo et violet, le thème d'origine.",
    light: {},
    dark: {},
    swatch: ["#faf9f6", "#ffffff", "#5b4de0", "#8b45d6"],
  },
  {
    id: "ocean",
    label: "Océan",
    emoji: "🌊",
    description: "Bleu profond et turquoise, calme et concentré.",
    light: {
      "--background": "200 40% 98%", "--primary": "205 85% 45%", "--primary-2": "180 70% 40%", "--ring": "205 85% 45%",
      "--secondary": "200 70% 94%", "--secondary-foreground": "205 70% 25%", "--accent": "180 60% 92%", "--accent-foreground": "185 70% 22%",
    },
    dark: {
      "--background": "210 40% 8%", "--card": "210 35% 12%", "--primary": "195 85% 60%", "--primary-2": "175 70% 45%", "--ring": "195 85% 60%",
      "--secondary": "205 40% 20%", "--secondary-foreground": "195 80% 85%", "--accent": "185 40% 18%", "--accent-foreground": "180 70% 80%", "--muted": "210 30% 17%", "--border": "210 25% 22%",
    },
    swatch: ["#f5fafc", "#ffffff", "#117ac4", "#1fa6a6"],
  },
  {
    id: "foret",
    label: "Forêt",
    emoji: "🌿",
    description: "Verts doux et naturels, reposant pour les yeux.",
    light: {
      "--background": "90 25% 97%", "--primary": "152 60% 33%", "--primary-2": "95 45% 42%", "--ring": "152 60% 33%",
      "--secondary": "140 40% 93%", "--secondary-foreground": "152 55% 20%", "--accent": "45 80% 92%", "--accent-foreground": "35 70% 25%",
    },
    dark: {
      "--background": "150 25% 8%", "--card": "150 20% 12%", "--primary": "145 55% 52%", "--primary-2": "90 45% 45%", "--ring": "145 55% 52%",
      "--secondary": "150 25% 18%", "--secondary-foreground": "140 50% 82%", "--accent": "45 35% 18%", "--accent-foreground": "45 80% 78%", "--muted": "150 18% 16%", "--border": "150 15% 22%",
    },
    swatch: ["#f6f8f3", "#ffffff", "#227a50", "#6a9a3a"],
  },
  {
    id: "soleil",
    label: "Coucher de soleil",
    emoji: "🌅",
    description: "Orange et corail, chaleureux et motivant.",
    light: {
      "--background": "30 50% 97%", "--primary": "16 85% 52%", "--primary-2": "340 75% 55%", "--ring": "16 85% 52%",
      "--secondary": "25 90% 94%", "--secondary-foreground": "16 70% 30%", "--accent": "45 95% 90%", "--accent-foreground": "30 80% 28%",
    },
    dark: {
      "--background": "15 25% 8%", "--card": "15 20% 12%", "--primary": "20 90% 62%", "--primary-2": "340 75% 60%", "--ring": "20 90% 62%",
      "--secondary": "15 35% 20%", "--secondary-foreground": "25 90% 85%", "--accent": "35 40% 18%", "--accent-foreground": "40 90% 78%", "--muted": "15 18% 16%", "--border": "15 15% 22%",
    },
    swatch: ["#fcf8f4", "#ffffff", "#ea5a1f", "#e03e74"],
  },
  {
    id: "bonbon",
    label: "Bonbon",
    emoji: "🍬",
    description: "Rose et lilas, pétillant et coloré.",
    light: {
      "--background": "320 40% 98%", "--primary": "325 75% 55%", "--primary-2": "270 65% 62%", "--ring": "325 75% 55%",
      "--secondary": "320 80% 95%", "--secondary-foreground": "325 60% 30%", "--accent": "270 80% 95%", "--accent-foreground": "270 50% 32%",
    },
    dark: {
      "--background": "300 20% 9%", "--card": "300 18% 13%", "--primary": "325 80% 68%", "--primary-2": "270 70% 70%", "--ring": "325 80% 68%",
      "--secondary": "320 30% 21%", "--secondary-foreground": "320 80% 88%", "--accent": "270 30% 20%", "--accent-foreground": "270 80% 86%", "--muted": "300 15% 17%", "--border": "300 12% 23%",
    },
    swatch: ["#fcf6fa", "#ffffff", "#de3d97", "#9b6ae0"],
  },
  {
    id: "nuit",
    label: "Nuit étoilée",
    emoji: "🌌",
    description: "Bleu nuit et cyan néon, pour réviser le soir.",
    light: {
      "--background": "230 30% 96%", "--primary": "232 60% 35%", "--primary-2": "190 80% 42%", "--ring": "232 60% 35%",
      "--secondary": "230 40% 92%", "--secondary-foreground": "232 55% 25%", "--accent": "190 70% 92%", "--accent-foreground": "195 70% 24%",
    },
    dark: {
      "--background": "235 45% 6%", "--card": "235 38% 10%", "--primary": "190 95% 58%", "--primary-2": "265 85% 66%", "--ring": "190 95% 58%",
      "--secondary": "235 35% 18%", "--secondary-foreground": "190 90% 82%", "--accent": "265 35% 18%", "--accent-foreground": "265 90% 85%", "--muted": "235 30% 14%", "--border": "235 25% 20%",
    },
    swatch: ["#0a0c1f", "#11142a", "#2ad4f5", "#9a6bf2"],
  },
  {
    id: "contraste",
    label: "Contraste élevé",
    emoji: "◐",
    description: "Noir et blanc francs, bordures marquées : lecture facilitée.",
    light: {
      "--background": "0 0% 100%", "--foreground": "0 0% 0%", "--card": "0 0% 100%", "--card-foreground": "0 0% 0%",
      "--primary": "240 100% 30%", "--primary-2": "240 100% 30%", "--ring": "240 100% 30%",
      "--secondary": "240 30% 92%", "--secondary-foreground": "240 100% 18%", "--muted": "0 0% 93%", "--muted-foreground": "0 0% 20%",
      "--accent": "50 100% 85%", "--accent-foreground": "0 0% 0%", "--border": "0 0% 35%", "--input": "0 0% 30%",
    },
    dark: {
      "--background": "0 0% 0%", "--foreground": "0 0% 100%", "--card": "0 0% 6%", "--card-foreground": "0 0% 100%",
      "--primary": "55 100% 55%", "--primary-foreground": "0 0% 0%", "--primary-2": "55 100% 55%", "--ring": "55 100% 55%",
      "--secondary": "0 0% 16%", "--secondary-foreground": "55 100% 75%", "--muted": "0 0% 12%", "--muted-foreground": "0 0% 82%",
      "--accent": "55 60% 18%", "--accent-foreground": "55 100% 80%", "--border": "0 0% 60%", "--input": "0 0% 65%",
    },
    swatch: ["#ffffff", "#ffffff", "#000099", "#000000"],
  },
];

export const FONTS = [
  { id: "moderne", label: "Moderne", sample: "Inter", body: "'Inter', system-ui, 'Segoe UI', sans-serif", display: "'Bricolage Grotesque', 'Inter', system-ui, sans-serif" },
  { id: "arrondie", label: "Arrondie", sample: "Nunito", body: "'Nunito', system-ui, 'Segoe UI', sans-serif", display: "'Nunito', system-ui, sans-serif" },
  { id: "lisible", label: "Très lisible", sample: "Atkinson Hyperlegible", body: "'Atkinson Hyperlegible', Verdana, system-ui, sans-serif", display: "'Atkinson Hyperlegible', Verdana, system-ui, sans-serif" },
] as const;
export type FontId = (typeof FONTS)[number]["id"];

export const TEXT_SIZES = [
  { id: "normal", label: "Normal", scale: 1 },
  { id: "grand", label: "Grand", scale: 1.125 },
  { id: "tres-grand", label: "Très grand", scale: 1.25 },
] as const;
export type TextSizeId = (typeof TEXT_SIZES)[number]["id"];

export const RADII = [
  { id: "arrondi", label: "Arrondis", value: "0.9rem" },
  { id: "doux", label: "Doux", value: "0.5rem" },
  { id: "droit", label: "Droits", value: "0.15rem" },
] as const;
export type RadiusId = (typeof RADII)[number]["id"];

export type ColorMode = "system" | "light" | "dark";
