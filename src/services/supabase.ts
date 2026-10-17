import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Client Supabase, ou null en mode local (aucune variable d'environnement). */
export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon) : null;

export const isCloudEnabled = () => supabase !== null;
