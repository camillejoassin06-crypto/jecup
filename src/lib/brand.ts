// Identité visuelle JecUp (by Jeca Solutions).
const base = import.meta.env.BASE_URL;

export const BRAND = {
  name: "JecUp",
  company: "Jeca Solutions",
  tagline: "Apprends, révise, réussis !",
  /** logo complet (mascotte, slogan, nom) */
  logo: `${base}logo.jpg`,
  /** visage de la mascotte, pour les petites tailles */
  avatar: `${base}avatar.png`,
} as const;
