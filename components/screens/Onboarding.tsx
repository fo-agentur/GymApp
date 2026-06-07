"use client";
import React from "react";
import type { DB } from "@/lib/data";
import { completeOnboarding, createWorkoutProgram } from "@/lib/data";
import type { Exercise } from "@/lib/supabase/types";
import { generateProgram, type Goal, type Experience, type EquipmentKind, type OnboardingAnswers } from "@/lib/program-gen";
import { TOK, TYPE, I, Btn, FONT_DISPLAY } from "@/lib/design";
import { IllOrbit, IllRocket, IllPlanet } from "@/lib/illustrations";

type Props = { db: DB; userId: string; exercises: Exercise[]; onComplete: () => void };

const GOALS: { id: Goal; title: string; sub: string }[] = [
  { id: "hypertrophy", title: "Muskelaufbau", sub: "Hypertrophie — Größe & Form" },
  { id: "strength", title: "Kraft", sub: "Schwerer, niedrigere Wiederholungen" },
];
const LEVELS: { id: Experience; title: string; sub: string }[] = [
  { id: "beginner", title: "Anfänger", sub: "< 1 Jahr, Technik im Fokus" },
  { id: "intermediate", title: "Fortgeschritten", sub: "1–3 Jahre, stabile Routine" },
  { id: "advanced", title: "Profi", sub: "3+ Jahre, hohes Volumen" },
];
const EQUIP: { id: EquipmentKind; title: string; sub: string }[] = [
  { id: "full_gym", title: "Voll ausgestattetes Studio", sub: "Langhantel, Maschinen, Kabel" },
  { id: "barbell_home", title: "Heim-Studio", sub: "Langhantel, Rack & Kurzhanteln" },
  { id: "dumbbell", title: "Nur Kurzhanteln", sub: "Kurzhanteln + Körpergewicht" },
  { id: "bodyweight", title: "Körpergewicht", sub: "Ohne Geräte, überall" },
];

export default function Onboarding({ db, userId, exercises, onComplete }: Props) {
  const [step, setStep] = React.useState(0);
  const [goal, setGoal] = React.useState<Goal>("hypertrophy");
  const [experience, setExperience] = React.useState<Experience>("intermediate");
  const [daysPerWeek, setDaysPerWeek] = React.useState(4);
  const [sessionMinutes, setSessionMinutes] = React.useState(60);
  const [equipment, setEquipment] = React.useState<EquipmentKind>("full_gym");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const STEPS = 7;
  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const generate = async () => {
    if (!exercises.length) {
      setError("Übungen werden noch geladen — kurz warten und erneut versuchen.");
      return;
    }
    setBusy(true);
    setError(null);
    const answers: OnboardingAnswers = { goal, experience, daysPerWeek, sessionMinutes, equipment };
    try {
      const spec = generateProgram(answers, exercises);
      await createWorkoutProgram(db, userId, spec);
      await completeOnboarding(db, userId, {
        equipment: { kind: equipment },
        default_rest_seconds: goal === "strength" ? 150 : 90,
      });
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Programm konnte nicht erstellt werden.");
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: TOK.bg, display: "flex", flexDirection: "column" }}>
      {/* progress + back */}
      <div style={{ padding: "52px 20px 8px", display: "flex", alignItems: "center", gap: 12 }}>
        {step > 0 && step < STEPS - 1 ? (
          <button onClick={back} style={{ background: "transparent", border: "none", cursor: "pointer", color: TOK.text, padding: 4, display: "flex" }}>
            <I.ChevL size={22} color={TOK.text} />
          </button>
        ) : <div style={{ width: 30 }} />}
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: TOK.surface2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${((step + 1) / STEPS) * 100}%`, background: TOK.accent, borderRadius: 2, transition: "width 280ms cubic-bezier(0.22,1,0.36,1)" }} />
        </div>
        <div style={{ width: 30 }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 24px 24px" }}>
        {step === 0 && (
          <Center>
            <IllOrbit size={120} />
            <div style={{ ...TYPE.eyebrow, color: TOK.accent, marginTop: 22 }}>MACROFACTOR WORKOUTS</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 700, color: TOK.text, letterSpacing: "-0.03em", marginTop: 8, lineHeight: 1.1 }}>
              Dein Coach,<br />der mitlernt.
            </div>
            <p style={{ ...TYPE.body, color: TOK.muted, marginTop: 14, maxWidth: 300 }}>
              Beantworte ein paar Fragen — wir bauen dir ein wissenschaftlich fundiertes
              Trainingsprogramm, das sich mit jedem Satz anpasst.
            </p>
          </Center>
        )}

        {step === 1 && (
          <Question title="Was ist dein Ziel?" sub="Bestimmt Wiederholungen, RIR und Volumen.">
            {GOALS.map((g) => <Choice key={g.id} title={g.title} sub={g.sub} selected={goal === g.id} onTap={() => setGoal(g.id)} />)}
          </Question>
        )}

        {step === 2 && (
          <Question title="Wie viel Erfahrung hast du?" sub="Steuert Übungsauswahl und Satzzahl.">
            {LEVELS.map((l) => <Choice key={l.id} title={l.title} sub={l.sub} selected={experience === l.id} onTap={() => setExperience(l.id)} />)}
          </Question>
        )}

        {step === 3 && (
          <Question title="Wie oft pro Woche?" sub="Wählt deinen Split (Ganzkörper · Ober/Unter · PPL).">
            <PickerGrid value={daysPerWeek} options={[2, 3, 4, 5, 6]} suffix="×" onChange={setDaysPerWeek} />
            <div style={{ ...TYPE.caption, color: TOK.dim, marginTop: 14, textAlign: "center" }}>{splitLabel(daysPerWeek)}</div>
          </Question>
        )}

        {step === 4 && (
          <Question title="Wie lang pro Einheit?" sub="Begrenzt die Übungen pro Workout.">
            <PickerGrid value={sessionMinutes} options={[45, 60, 75, 90]} suffix=" min" onChange={setSessionMinutes} />
          </Question>
        )}

        {step === 5 && (
          <Question title="Welches Equipment hast du?" sub="Filtert die Übungsauswahl.">
            {EQUIP.map((e) => <Choice key={e.id} title={e.title} sub={e.sub} selected={equipment === e.id} onTap={() => setEquipment(e.id)} />)}
          </Question>
        )}

        {step === 6 && (
          <Center>
            {busy ? <IllRocket size={120} /> : <IllPlanet size={120} />}
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700, color: TOK.text, letterSpacing: "-0.02em", marginTop: 18 }}>
              {busy ? "Programm wird gebaut…" : "Bereit!"}
            </div>
            <div style={{ width: "100%", marginTop: 18, background: TOK.surface, borderRadius: 16, padding: 16, textAlign: "left" }}>
              <SummaryRow label="Ziel" value={GOALS.find((g) => g.id === goal)!.title} />
              <SummaryRow label="Level" value={LEVELS.find((l) => l.id === experience)!.title} />
              <SummaryRow label="Frequenz" value={`${daysPerWeek}× / Woche`} />
              <SummaryRow label="Dauer" value={`${sessionMinutes} min`} />
              <SummaryRow label="Equipment" value={EQUIP.find((e) => e.id === equipment)!.title} last />
            </div>
            {error && <div style={{ ...TYPE.caption, color: TOK.fail, marginTop: 12 }}>{error}</div>}
          </Center>
        )}
      </div>

      {/* footer CTA */}
      <div style={{ padding: "8px 24px max(24px, env(safe-area-inset-bottom))" }}>
        {step < STEPS - 1 ? (
          <Btn variant="primary" size="lg" full onClick={next}>
            {step === 0 ? "Los geht's" : "Weiter"}
          </Btn>
        ) : (
          <Btn variant="primary" size="lg" full onClick={generate} disabled={busy}>
            {busy ? "Erstelle…" : "Programm erstellen"}
          </Btn>
        )}
      </div>
    </div>
  );
}

function splitLabel(days: number): string {
  return ({ 2: "Ganzkörper A/B", 3: "Ganzkörper A/B/C", 4: "Ober-/Unterkörper-Split", 5: "Ober/Unter + Push/Pull/Beine", 6: "Push/Pull/Beine ×2" } as Record<number, string>)[days] ?? "";
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 24 }}>{children}</div>;
}

function Question({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ ...TYPE.h1, color: TOK.text }}>{title}</div>
      {sub && <div style={{ ...TYPE.body, color: TOK.muted, marginTop: 8 }}>{sub}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 22 }}>{children}</div>
    </div>
  );
}

function Choice({ title, sub, selected, onTap }: { title: string; sub: string; selected: boolean; onTap: () => void }) {
  return (
    <button onClick={onTap} style={{
      display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "16px 16px", textAlign: "left",
      background: selected ? TOK.accentSoft : TOK.surface,
      border: `1.5px solid ${selected ? TOK.accent : "transparent"}`,
      borderRadius: 16, cursor: "pointer", fontFamily: "inherit", WebkitTapHighlightColor: "transparent",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...TYPE.bodyEm, color: TOK.text }}>{title}</div>
        <div style={{ fontSize: 12, color: TOK.dim, marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ width: 22, height: 22, borderRadius: 999, flexShrink: 0, border: `1.5px solid ${selected ? TOK.accent : TOK.dim}`, background: selected ? TOK.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {selected && <I.Check size={13} color={TOK.accentInk} />}
      </span>
    </button>
  );
}

function PickerGrid({ value, options, suffix, onChange }: { value: number; options: number[]; suffix: string; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
      {options.map((o) => {
        const sel = o === value;
        return (
          <button key={o} onClick={() => onChange(o)} style={{
            minWidth: 76, height: 64, borderRadius: 16, cursor: "pointer", fontFamily: "inherit",
            background: sel ? TOK.accentSoft : TOK.surface, border: `1.5px solid ${sel ? TOK.accent : "transparent"}`,
            color: TOK.text, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent",
          }}>
            <span className="tnum" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{o}</span>
            <span style={{ fontSize: 11, color: TOK.muted }}>{suffix.trim()}</span>
          </button>
        );
      })}
    </div>
  );
}

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: last ? "none" : `1px solid ${TOK.border}` }}>
      <span style={{ ...TYPE.caption, color: TOK.dim }}>{label}</span>
      <span style={{ ...TYPE.bodyEm, color: TOK.text }}>{value}</span>
    </div>
  );
}
