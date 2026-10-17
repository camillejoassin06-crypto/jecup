import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Card, Input, PageHeader, Select } from "@/components/ui/primitives";
import { Ring } from "@/components/bits";
import { BASE_FOLDERS, DISCIPLINES } from "@/data/academic";
import { subjectProgress } from "@/lib/stats";
import { nextExamFor } from "@/engine/plannerAgent";
import { relativeDay, todayISO, uid } from "@/lib/utils";
import type { DisciplineId } from "@/types";

export default function Subjects() {
  const { subjects, concepts, mastery, documents, events, addSubject } = useStore();
  const [name, setName] = useState("");
  const [disc, setDisc] = useState<DisciplineId>("generique");
  const today = todayISO();

  return (
    <div>
      <PageHeader title="Mes matières" subtitle="Chaque matière a son espace, organisé selon la façon dont elle s'apprend." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s) => {
          const p = subjectProgress(s, concepts, mastery, today);
          const docs = documents.filter((d) => d.subjectId === s.id).length;
          const exam = nextExamFor(s.id, events, today);
          return (
            <Link key={s.id} to={`/matieres/${s.id}`}>
              <Card className="h-full p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-2xl">{DISCIPLINES[s.discipline].emoji}</div>
                    <h3 className="mt-2 text-lg font-bold">{s.name}</h3>
                    <p className="text-xs text-muted-foreground">{DISCIPLINES[s.discipline].label}</p>
                  </div>
                  <Ring value={p.avg} color={s.color} />
                </div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{docs} document{docs > 1 ? "s" : ""}</span>
                  <span>{p.count} notions</span>
                  {p.fragile > 0 && <span className="font-semibold text-destructive">{p.fragile} fragile{p.fragile > 1 ? "s" : ""}</span>}
                </div>
                {exam && <p className="mt-2 text-xs font-semibold text-primary">📝 {exam.title} — {relativeDay(exam.date, today)}</p>}
              </Card>
            </Link>
          );
        })}
        <Card className="flex flex-col gap-3 border-dashed p-5">
          <h3 className="font-bold">Ajouter une matière</h3>
          <Input placeholder="Nom (ex. Latin, Option théâtre)" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={disc} onChange={(e) => setDisc(e.target.value as DisciplineId)}>
            {Object.values(DISCIPLINES).map((d) => (
              <option key={d.id} value={d.id}>{d.emoji} {d.label}</option>
            ))}
          </Select>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              addSubject({
                id: uid("s_"),
                name: name.trim(),
                discipline: disc,
                color: DISCIPLINES[disc].color,
                weight: 3,
                folders: [...new Set([...BASE_FOLDERS, ...DISCIPLINES[disc].folders])],
              });
              setName("");
            }}
          >
            <Plus /> Ajouter
          </Button>
        </Card>
      </div>
    </div>
  );
}
