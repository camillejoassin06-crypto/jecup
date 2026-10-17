import { useEffect, useState } from "react";
import { usePrefs } from "@/store/usePrefs";
import { FONTS, RADII, TEXT_SIZES, THEMES } from "@/lib/themes";

/** Mode effectif : suit le système si l'élève a choisi « Automatique ». */
export function useResolvedDark() {
  const mode = usePrefs((s) => s.mode);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return mode === "dark" || (mode === "system" && systemDark);
}

/** Applique thème, mode, police, taille et arrondis sur <html> via les variables CSS. */
export default function ThemeApplier() {
  const { theme, font, textSize, radius, reduceMotion } = usePrefs();
  const dark = useResolvedDark();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.classList.toggle("reduce-motion", reduceMotion);
    root.dataset.theme = theme;

    // on retire les jetons du thème précédent avant d'appliquer le nouveau
    const all = new Set(THEMES.flatMap((t) => [...Object.keys(t.light), ...Object.keys(t.dark)]));
    all.forEach((k) => root.style.removeProperty(k));
    const def = THEMES.find((t) => t.id === theme) ?? THEMES[0];
    Object.entries(dark ? def.dark : def.light).forEach(([k, v]) => root.style.setProperty(k, v));

    const f = FONTS.find((x) => x.id === font) ?? FONTS[0];
    root.style.setProperty("--font-body", f.body);
    root.style.setProperty("--font-display", f.display);
    root.style.setProperty("--radius", (RADII.find((r) => r.id === radius) ?? RADII[0]).value);
    root.style.fontSize = `${16 * (TEXT_SIZES.find((t) => t.id === textSize) ?? TEXT_SIZES[0]).scale}px`;

    const meta = document.querySelector('meta[name="theme-color"]') ?? Object.assign(document.createElement("meta"), { name: "theme-color" });
    meta.setAttribute("content", getComputedStyle(root).getPropertyValue("--background").trim() ? `hsl(${getComputedStyle(root).getPropertyValue("--background").trim()})` : "#ffffff");
    if (!meta.parentNode) document.head.appendChild(meta);
  }, [theme, dark, font, textSize, radius, reduceMotion]);

  return null;
}
