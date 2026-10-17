import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Attempt, ChatMessage, Concept, CourseDocument, MasteryState, PlannerEvent, StudentProfile, Subject, Task,
} from "@/types";
import { buildDemo, type AppData } from "@/data/demo";
import { emptyMastery, updateMastery } from "@/engine/memoryAgent";
import { generatePlan, missedSessions } from "@/engine/plannerAgent";
import { todayISO, uid } from "@/lib/utils";
import { supabase } from "@/services/supabase";

const snapshot = (s: State): Snapshot => ({
  profile: s.profile!,
  subjects: s.subjects,
  documents: s.documents,
  concepts: s.concepts,
  attempts: s.attempts,
  mastery: s.mastery,
  events: s.events,
  tasks: s.tasks,
  chat: s.chat,
});

/** Données d'un élève, mises de côté pendant une démo. */
type Snapshot = Omit<AppData, "profile"> & { profile: StudentProfile; chat: ChatMessage[] };

interface State {
  profile?: StudentProfile;
  subjects: Subject[];
  documents: CourseDocument[];
  concepts: Concept[];
  attempts: Attempt[];
  mastery: Record<string, MasteryState>;
  events: PlannerEvent[];
  tasks: Task[];
  chat: ChatMessage[];
  /** false après « Se déconnecter » : les données restent sur l'appareil */
  signedIn: boolean;
  /** profil réel conservé pendant qu'une démo est ouverte */
  backup?: Snapshot;

  completeOnboarding: (profile: StudentProfile, subjects: Subject[]) => void;
  loadDemo: (key: string) => void;
  /** quitte la démo et restaure le profil réel s'il y en avait un */
  quitDemo: () => void;
  signIn: () => void;
  signOut: () => Promise<void>;
  /** efface toutes les données de l'appareil */
  reset: () => void;
  updateProfile: (patch: Partial<StudentProfile>) => void;

  addSubject: (s: Subject) => void;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  removeSubject: (id: string) => void;

  addDocument: (doc: CourseDocument, concepts: Concept[]) => void;
  updateDocument: (id: string, patch: Partial<CourseDocument>) => void;
  removeDocument: (id: string) => void;

  recordAttempt: (a: Omit<Attempt, "id" | "at">) => MasteryState;

  addEvent: (e: Omit<PlannerEvent, "id">) => void;
  updateEvent: (id: string, patch: Partial<PlannerEvent>) => void;
  removeEvent: (id: string) => void;
  /** recalcule les sessions générées à partir d'aujourd'hui */
  replan: () => number;

  addTask: (t: Omit<Task, "id" | "createdAt" | "done">) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;

  addChat: (m: Omit<ChatMessage, "id" | "at">) => void;
  clearChat: () => void;
}

const empty = {
  profile: undefined,
  subjects: [],
  documents: [],
  concepts: [],
  attempts: [],
  mastery: {},
  events: [],
  tasks: [],
  chat: [],
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...empty,

      signedIn: true,
      backup: undefined,

      completeOnboarding: (profile, subjects) => {
        set({ ...empty, profile, subjects, signedIn: true, backup: undefined });
        get().replan();
      },
      loadDemo: (key) => {
        const s = get();
        // un vrai profil n'est jamais écrasé par la démo : on le met de côté
        const backup = s.profile && !s.profile.isDemo ? snapshot(s) : s.backup;
        set({ ...empty, ...buildDemo(key), signedIn: true, backup });
      },
      quitDemo: () => {
        const b = get().backup;
        // retour à l'accueil ; le profil réel restauré attend une reconnexion
        set(b ? { ...empty, ...b, signedIn: false, backup: undefined } : { ...empty, signedIn: true, backup: undefined });
      },
      signIn: () => set({ signedIn: true }),
      signOut: async () => {
        if (get().profile?.isDemo) {
          get().quitDemo();
        } else {
          set({ signedIn: false });
        }
        if (supabase) await supabase.auth.signOut();
      },
      reset: () => set({ ...empty, signedIn: true, backup: undefined }),
      updateProfile: (patch) => set((s) => ({ profile: s.profile ? { ...s.profile, ...patch } : s.profile })),

      addSubject: (sub) => set((s) => ({ subjects: [...s.subjects, sub] })),
      updateSubject: (id, patch) => set((s) => ({ subjects: s.subjects.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeSubject: (id) =>
        set((s) => {
          const docIds = new Set(s.documents.filter((d) => d.subjectId === id).map((d) => d.id));
          return {
            subjects: s.subjects.filter((x) => x.id !== id),
            documents: s.documents.filter((d) => !docIds.has(d.id)),
            concepts: s.concepts.filter((c) => c.subjectId !== id),
            events: s.events.filter((e) => e.subjectId !== id),
            tasks: s.tasks.map((t) => (t.subjectId === id ? { ...t, subjectId: undefined } : t)),
          };
        }),

      addDocument: (doc, concepts) => {
        set((s) => ({ documents: [doc, ...s.documents], concepts: [...s.concepts, ...concepts] }));
        get().replan();
      },
      updateDocument: (id, patch) => set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      removeDocument: (id) =>
        set((s) => {
          const removed = new Set(s.concepts.filter((c) => c.documentId === id).map((c) => c.id));
          const mastery = { ...s.mastery };
          removed.forEach((cid) => delete mastery[cid]);
          return {
            documents: s.documents.filter((d) => d.id !== id),
            concepts: s.concepts.filter((c) => c.documentId !== id),
            attempts: s.attempts.filter((a) => !removed.has(a.conceptId)),
            mastery,
          };
        }),

      recordAttempt: (input) => {
        const attempt: Attempt = { ...input, id: uid("a_"), at: new Date().toISOString() };
        const s = get();
        const prev = s.mastery[attempt.conceptId] ?? emptyMastery(attempt.conceptId);
        const next = updateMastery(prev, attempt, s.attempts);
        set({ attempts: [...s.attempts, attempt], mastery: { ...s.mastery, [attempt.conceptId]: next } });
        return next;
      },

      addEvent: (e) => set((s) => ({ events: [...s.events, { ...e, id: uid("ev_") }] })),
      updateEvent: (id, patch) => set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
      replan: () => {
        const s = get();
        if (!s.profile) return 0;
        const today = todayISO();
        const missed = missedSessions(s.events, today);
        const kept = s.events
          .filter((e) => !(e.generated && e.status === "prevu" && e.date >= today))
          .map((e) => (missed.some((m) => m.id === e.id) ? { ...e, status: "manque" as const } : e));
        const plan = generatePlan({
          profile: s.profile,
          subjects: s.subjects,
          concepts: s.concepts,
          mastery: s.mastery,
          events: kept,
          tasks: s.tasks,
          today,
          boost: missed.map((m) => m.subjectId!).filter(Boolean),
        });
        set({ events: [...kept, ...plan] });
        return plan.length;
      },

      addTask: (t) => set((s) => ({ tasks: [...s.tasks, { ...t, id: uid("t_"), done: false, createdAt: new Date().toISOString() }] })),
      updateTask: (id, patch) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      addChat: (m) => set((s) => ({ chat: [...s.chat, { ...m, id: uid("m_"), at: new Date().toISOString() }] })),
      clearChat: () => set({ chat: [] }),
    }),
    {
      name: "jecup-state-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

export const subjectById = (subjects: Subject[], id?: string) => subjects.find((s) => s.id === id);
