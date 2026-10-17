import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import Layout from "@/components/Layout";
import { useStore } from "@/store/useStore";
import { supabase } from "@/services/supabase";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Subjects from "@/pages/Subjects";
import SubjectDetail from "@/pages/SubjectDetail";
import ImportScan from "@/pages/ImportScan";
import CourseView from "@/pages/CourseView";
import RevisionStudio from "@/pages/RevisionStudio";
import Quiz from "@/pages/Quiz";
import Memory from "@/pages/Memory";
import Planner from "@/pages/Planner";
import Tasks from "@/pages/Tasks";
import Assistant from "@/pages/Assistant";
import Login from "@/pages/Login";

function RequireProfile({ children }: { children: ReactNode }) {
  const profile = useStore((s) => s.profile);
  const location = useLocation();
  if (!profile) return <Navigate to="/bienvenue" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

/** Une nouvelle session de quiz repart de zéro quand les paramètres changent. */
function QuizRoute() {
  const location = useLocation();
  return <Quiz key={location.search} />;
}

/** Avec Supabase configuré, une session est obligatoire (Supabase Auth). Sinon : mode local. */
function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (!supabase) return <>{children}</>;
  if (session === undefined) return null;
  if (!session) return <Login />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route path="/bienvenue" element={<Onboarding />} />
        <Route
          element={
            <RequireProfile>
              <Layout />
            </RequireProfile>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="matieres" element={<Subjects />} />
          <Route path="matieres/:id" element={<SubjectDetail />} />
          <Route path="import" element={<ImportScan />} />
          <Route path="cours/:id" element={<CourseView />} />
          <Route path="reviser" element={<RevisionStudio />} />
          <Route path="quiz" element={<QuizRoute />} />
          <Route path="memoire" element={<Memory />} />
          <Route path="planning" element={<Planner />} />
          <Route path="taches" element={<Tasks />} />
          <Route path="assistant" element={<Assistant />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthGate>
  );
}
