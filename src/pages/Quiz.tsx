import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, BookOpen, Check, HelpCircle, Lightbulb, ListOrdered, RotateCcw, Sparkles, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, EmptyState, Input, Progress } from "@/components/ui/primitives";
import { MasteryBadge, SubjectTag } from "@/components/bits";
import {
  applyResult, checkAnswer, DIFFICULTY_LABEL, generateQuestion, nextConceptId, startSession, type QuizSession,
} from "@/engine/quizAgent";
import { atRisk, effectiveScore } from "@/engine/memoryAgent";
import { getAI, type ExplainStyle } from "@/services/ai/provider";
import type { Concept, Question, QuestionType } from "@/types";
import { cn, todayISO } from "@/lib/utils";

type Difficulty = Question["difficulty"];

export default function Quiz() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { concepts, documents, subjects, mastery, profile, recordAttempt, updateEvent, replan } = useStore();

  // ── sélection des notions selon les paramètres ──
  const pool = useMemo<Concept[]>(() => {
    const today = todayISO();
    const subject = params.get("subject");
    const doc = params.get("doc");
    const ids = params.get("concepts")?.split(",").filter(Boolean);
    const focus = params.get("focus");
    let list = concepts;
    if (subject) list = list.filter((c) => c.subjectId === subject);
    if (doc) list = list.filter((c) => c.documentId === doc);
    if (ids?.length) {
      const chosen = list.filter((c) => ids.includes(c.id));
      if (chosen.length) list = chosen;
    }
    if (focus === "weak") list = list.filter((c) => effectiveScore(mastery[c.id], today) < 60).sort((a, b) => effectiveScore(mastery[a.id], today) - effectiveScore(mastery[b.id], today));
    if (focus === "new") list = list.filter((c) => !mastery[c.id]?.attempts);
    if (focus === "risk") {
      const risky = atRisk(list.map((c) => c.id), mastery, today);
      list = risky.map((id) => list.find((c) => c.id === id)!);
    }
    return list.slice(0, 12);
    // la sélection est figée au démarrage de la session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const types = params.get("types")?.split(",") as QuestionType[] | undefined;
  const startDiff = Math.min(5, Math.max(1, Number(params.get("difficulty") ?? 2))) as Difficulty;

  const [session, setSession] = useState<QuizSession>(() => startSession(pool.map((c) => c.id), startDiff));
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<null | { correct: boolean; given: string }>(null);
  const [help, setHelp] = useState<{ title: string; body: string } | null>(null);
  const [showMethod, setShowMethod] = useState(false);
  const [loadingHelp, setLoadingHelp] = useState(false);
  const shownAt = useRef(Date.now());
  const conceptOf = (id?: string) => concepts.find((c) => c.id === id);
  const current = conceptOf(question?.conceptId);
  const discipline = (c?: Concept) => subjects.find((s) => s.id === c?.subjectId)?.discipline ?? "generique";

  const ask = (s: QuizSession) => {
    const cid = nextConceptId(s, mastery);
    if (!cid) {
      setQuestion(null);
      return;
    }
    const c = conceptOf(cid)!;
    setQuestion(generateQuestion(c, concepts.filter((x) => x.subjectId === c.subjectId), discipline(c), s.difficulty, s.variants[cid] ?? 0, types));
    setAnswer("");
    setResult(null);
    setHelp(null);
    setShowMethod(false);
    shownAt.current = Date.now();
  };

  useEffect(() => {
    if (pool.length) ask(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (given: string) => {
    if (!question || result) return;
    const correct = checkAnswer(question, given);
    setResult({ correct, given });
    recordAttempt({ questionId: question.id, conceptId: question.conceptId, correct, difficulty: question.difficulty, responseMs: Date.now() - shownAt.current });
    setSession((s) => applyResult(s, question.conceptId, correct));
  };

  const next = () => ask(session);

  const explain = async (style: ExplainStyle, title: string) => {
    if (!current) return;
    setLoadingHelp(true);
    const doc = documents.find((d) => d.id === current.documentId);
    const body = await getAI().explain(current, doc, style, profile!.level, discipline(current));
    setHelp({ title, body });
    setLoadingHelp(false);
  };

  const notUnderstood = async () => {
    // on reproposera la notion plus tard, avec une autre formulation
    if (question && result?.correct) setSession((s) => ({ ...s, retry: [...s.retry, { conceptId: question.conceptId, after: s.asked + 2 }] }));
    await explain("detail", "Reprenons depuis le cours");
  };

  const finished = pool.length > 0 && !question;
  const eventId = params.get("event");
  useEffect(() => {
    if (finished && eventId) {
      updateEvent(eventId, { status: "fait" });
    }
    if (finished) replan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  if (!pool.length) {
    return (
      <EmptyState icon="🎉" title="Rien à réviser ici pour le moment">
        Aucune notion ne correspond à cette sélection. <Link to="/reviser" className="font-semibold text-primary">Choisir un autre cours</Link>
      </EmptyState>
    );
  }

  if (finished) {
    const ok = session.history.filter((h) => h.correct).length;
    const wrongIds = [...new Set(session.history.filter((h) => !h.correct).map((h) => h.conceptId))];
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="p-8 text-center">
          <div className="text-5xl">{ok / session.history.length >= 0.8 ? "🏆" : ok / session.history.length >= 0.5 ? "💪" : "🌱"}</div>
          <h1 className="mt-3 text-3xl font-extrabold">{ok}/{session.history.length} bonnes réponses</h1>
          <p className="mt-2 text-muted-foreground">
            Niveau atteint : <b>{DIFFICULTY_LABEL[session.difficulty]}</b>. {wrongIds.length ? "Je reprogramme les notions ratées pour les revoir au bon moment." : "Bravo, tout est solide pour aujourd'hui !"}
          </p>
        </Card>
        <Card>
          <CardContent className="divide-y p-5">
            {[...new Set(session.history.map((h) => h.conceptId))].map((id) => {
              const c = conceptOf(id)!;
              return (
                <div key={id} className="flex items-center justify-between gap-2 py-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {session.history.filter((h) => h.conceptId === id).every((h) => h.correct) ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-destructive" />}
                    {c.label}
                  </span>
                  <MasteryBadge state={mastery[id]} />
                </div>
              );
            })}
          </CardContent>
        </Card>
        <div className="flex flex-wrap justify-center gap-2">
          {wrongIds.length > 0 && (
            <Button onClick={() => navigate(`/quiz?concepts=${wrongIds.join(",")}&difficulty=1`, { replace: true })} variant="secondary">
              <RotateCcw /> Retravailler mes erreurs
            </Button>
          )}
          <Button onClick={() => navigate("/")}>Retour à mon espace <ArrowRight /></Button>
        </div>
      </div>
    );
  }

  if (!question || !current) return null;
  const doc = documents.find((d) => d.id === current.documentId);
  const chunk = doc?.chunks.find((c) => c.id === current.chunkId);
  const subject = subjects.find((s) => s.id === current.subjectId);
  const scientific = ["maths", "physique-chimie", "informatique", "svt", "ses"].includes(discipline(current));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <SubjectTag subject={subject} />
        <Badge tone="muted">{DIFFICULTY_LABEL[question.difficulty]}</Badge>
      </div>
      <Progress value={(session.asked / session.max) * 100} />
      {session.feedback && <p className="text-center text-sm font-semibold text-primary">{session.feedback}</p>}

      <Card className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Question {session.asked + (result ? 0 : 1)} / {session.max}</p>
        <h2 className="mt-2 text-xl font-bold leading-snug">{question.prompt}</h2>

        {question.choices ? (
          <div className="mt-5 grid gap-2">
            {question.choices.map((c) => {
              const isAnswer = c.toLowerCase() === question.answer.toLowerCase();
              const picked = result?.given === c;
              return (
                <button
                  key={c}
                  disabled={!!result}
                  onClick={() => submit(c)}
                  className={cn(
                    "rounded-xl border p-3 text-left text-sm font-medium transition",
                    !result && "hover:border-primary hover:bg-primary/5",
                    result && isAnswer && "border-success bg-success/10",
                    result && picked && !isAnswer && "border-destructive bg-destructive/10",
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>
        ) : (
          <form className="mt-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(answer); }}>
            <Input autoFocus value={answer} disabled={!!result} onChange={(e) => setAnswer(e.target.value)} placeholder="Ta réponse" />
            <Button type="submit" disabled={!answer.trim() || !!result}>Valider</Button>
          </form>
        )}

        {/* Mode apprentissage : la méthode sans la réponse, avant de répondre */}
        {!result && profile?.learningMode && scientific && question.method && (
          <Button variant="link" size="sm" className="mt-3" onClick={() => setShowMethod(!showMethod)}>
            <Lightbulb /> {showMethod ? "Masquer la méthode" : "Besoin d'un coup de pouce ? Voir la méthode"}
          </Button>
        )}
        {(showMethod || (result && !result.correct && scientific)) && question.method && (
          <div className="mt-3 rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">
            <p className="mb-2 flex items-center gap-2 font-semibold"><ListOrdered className="h-4 w-4" /> La méthode</p>
            <ol className="list-decimal space-y-1 pl-5">{question.method.map((m) => <li key={m}>{m}</li>)}</ol>
          </div>
        )}
      </Card>

      {result && (
        <Card className={cn("p-5", result.correct ? "border-success/40" : "border-destructive/40")}>
          <p className={cn("flex items-center gap-2 text-lg font-bold", result.correct ? "text-success" : "text-destructive")}>
            {result.correct ? <Check /> : <X />} {result.correct ? "Bonne réponse !" : "Pas tout à fait."}
          </p>
          {!result.correct && <p className="mt-1 text-sm">Réponse attendue : <b>{question.answer}</b></p>}
          <p className="mt-3 text-sm text-muted-foreground">{question.explanation}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge>Notion testée : {current.label}</Badge>
            {doc && (
              <Badge tone="outline">
                <BookOpen className="h-3 w-3" /> {doc.title}{chunk ? ` · ${chunk.section} · p. ${chunk.page}` : ""}
              </Badge>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={notUnderstood} disabled={loadingHelp}><HelpCircle /> Je n'ai pas compris</Button>
            <Button size="sm" variant="outline" onClick={() => explain("simple", "Plus simplement")} disabled={loadingHelp}>Explique plus simplement</Button>
            <Button size="sm" variant="outline" onClick={() => explain("exemple", "Un exemple")} disabled={loadingHelp}>Donne-moi un exemple</Button>
            {question.method && <Button size="sm" variant="outline" onClick={() => setShowMethod(true)}><Lightbulb /> Montre-moi la méthode</Button>}
          </div>
          {help && (
            <div className="mt-4 rounded-xl bg-muted p-4 text-sm">
              <p className="mb-1 flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" /> {help.title}</p>
              <p className="whitespace-pre-line">{help.body.replace(/\*\*/g, "")}</p>
            </div>
          )}
          <Button className="mt-5 w-full" size="lg" onClick={next}>Question suivante <ArrowRight /></Button>
        </Card>
      )}
    </div>
  );
}
