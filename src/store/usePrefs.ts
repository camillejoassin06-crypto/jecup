import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ColorMode, FontId, RadiusId, TextSizeId, ThemeId } from "@/lib/themes";

/** Préférences d'affichage : propres à l'appareil, indépendantes du profil scolaire. */
interface Prefs {
  theme: ThemeId;
  mode: ColorMode;
  font: FontId;
  textSize: TextSizeId;
  radius: RadiusId;
  reduceMotion: boolean;
  set: (patch: Partial<Omit<Prefs, "set" | "reset">>) => void;
  reset: () => void;
}

const legacyMode = (): ColorMode => {
  try {
    const old = localStorage.getItem("jecup-theme");
    return old === "dark" || old === "light" ? old : "system";
  } catch {
    return "system";
  }
};

const defaults = {
  theme: "classique" as ThemeId,
  mode: legacyMode(),
  font: "moderne" as FontId,
  textSize: "normal" as TextSizeId,
  radius: "arrondi" as RadiusId,
  reduceMotion: false,
};

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      ...defaults,
      set: (patch) => set(patch),
      reset: () => set({ ...defaults, mode: "system" }),
    }),
    {
      name: "jecup-prefs-v1",
      // le stockage peut être indisponible (navigation privée) : l'appli fonctionne quand même
      storage: createJSONStorage(() => {
        try {
          localStorage.setItem("__t", "1");
          localStorage.removeItem("__t");
          return localStorage;
        } catch {
          const mem = new Map<string, string>();
          return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
        }
      }),
    },
  ),
);
