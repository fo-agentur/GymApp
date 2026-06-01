"use client";
import React from "react";
import { useApp } from "../app-context";
import {
  addFoodLog,
  cacheFood,
  searchFoodsCache,
  offSearch,
  offByBarcode,
  analyzeMealPhoto,
  type NewFoodLog,
  type OffFood,
} from "@/lib/data";
import type { Food } from "@/lib/supabase/types";
import { TOK, TYPE, Tnum, Sheet, Segmented, Btn, I } from "@/lib/design";

// Meals + a time-of-day default guess.
const MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
type Meal = (typeof MEALS)[number];
function guessMeal(): Meal {
  const h = new Date().getHours();
  if (h < 11) return "Breakfast";
  if (h < 15) return "Lunch";
  if (h < 18) return "Snack";
  return "Dinner";
}

const r2 = (n: number) => Math.round(n * 10) / 10;

// Shared input style (>=16px font to avoid iOS zoom on focus).
const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  height: 48,
  padding: "0 14px",
  borderRadius: 12,
  background: TOK.surface3,
  border: `1px solid ${TOK.border}`,
  color: TOK.text,
  fontSize: 16,
  fontWeight: 500,
  fontFamily: "inherit",
  outline: "none",
};

// A merged search result (cache or OFF). Macros are per 100 g.
type Result = {
  key: string;
  name: string;
  brand: string | null;
  per100: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  serving_g: number | null;
  source: "off" | "custom";
  food_id?: string | null;
  barcode?: string | null;
};

function fromOff(f: OffFood): Result {
  return {
    key: "off:" + (f.barcode || f.name),
    name: f.name,
    brand: f.brand,
    per100: { kcal: f.kcal, protein_g: f.protein_g, carbs_g: f.carbs_g, fat_g: f.fat_g },
    serving_g: f.serving_g,
    source: "off",
    barcode: f.barcode,
  };
}
function fromCache(f: Food): Result {
  return {
    key: "cache:" + f.id,
    name: f.name,
    brand: f.brand,
    per100: { kcal: f.kcal, protein_g: f.protein_g, carbs_g: f.carbs_g, fat_g: f.fat_g },
    serving_g: f.serving_g,
    source: "custom",
    food_id: f.id,
  };
}

export default function FoodAddSheet({
  open,
  onClose,
  onAdded,
  loggedOn,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  loggedOn: string;
}) {
  const { db, userId, accent } = useApp();
  const [tab, setTab] = React.useState("search");
  const [meal, setMeal] = React.useState<Meal>(guessMeal());
  const [saving, setSaving] = React.useState(false);

  // Reset transient state each time the sheet opens.
  React.useEffect(() => {
    if (open) {
      setTab("search");
      setMeal(guessMeal());
      setSaving(false);
    }
  }, [open]);

  async function commit(e: NewFoodLog) {
    if (saving) return;
    setSaving(true);
    try {
      await addFoodLog(db, userId, loggedOn, e);
      onAdded();
      onClose();
    } catch {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} label="Add to day" title="Log food">
      <div style={{ padding: "4px 16px 8px" }}>
        <Segmented
          accent={accent}
          value={tab}
          onChange={setTab}
          options={[
            { value: "search", label: "Search" },
            { value: "barcode", label: "Barcode" },
            { value: "photo", label: "Photo" },
            { value: "manual", label: "Manual" },
          ]}
        />
      </div>

      <div style={{ padding: "8px 16px 0" }}>
        <div style={{ ...TYPE.eyebrow, color: TOK.dim, marginBottom: 8 }}>Meal</div>
        <Segmented accent={accent} value={meal} onChange={(v) => setMeal(v as Meal)} options={MEALS as unknown as string[]} />
      </div>

      <div style={{ padding: "16px 16px 8px" }}>
        {tab === "search" && <SearchTab meal={meal} saving={saving} onCommit={commit} />}
        {tab === "barcode" && <BarcodeTab open={open && tab === "barcode"} meal={meal} saving={saving} onCommit={commit} />}
        {tab === "photo" && <PhotoTab meal={meal} saving={saving} onCommit={commit} />}
        {tab === "manual" && <ManualTab meal={meal} saving={saving} onCommit={commit} />}
      </div>
    </Sheet>
  );
}

// ── Grams → macros confirm panel (shared by Search & Barcode) ──────
function PortionConfirm({
  result,
  meal,
  saving,
  onCommit,
  onBack,
}: {
  result: Result;
  meal: Meal;
  saving: boolean;
  onCommit: (e: NewFoodLog) => void;
  onBack: () => void;
}) {
  const { db } = useApp();
  const [grams, setGrams] = React.useState<number>(result.serving_g && result.serving_g > 0 ? result.serving_g : 100);
  const f = grams / 100;
  const kcal = Math.round(result.per100.kcal * f);
  const protein = r2(result.per100.protein_g * f);
  const carbs = r2(result.per100.carbs_g * f);
  const fat = r2(result.per100.fat_g * f);

  async function add() {
    let foodId = result.food_id ?? null;
    if (result.source === "off") {
      // Best-effort cache of the OFF product (per-100g macros).
      foodId =
        (await cacheFood(db, {
          source: "off",
          barcode: result.barcode ?? null,
          name: result.name,
          brand: result.brand ?? null,
          serving_g: result.serving_g ?? null,
          kcal: result.per100.kcal,
          protein_g: result.per100.protein_g,
          carbs_g: result.per100.carbs_g,
          fat_g: result.per100.fat_g,
        })) ?? null;
    }
    onCommit({
      name: result.name,
      meal,
      food_id: foodId,
      qty_g: grams,
      kcal,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      source: result.source === "off" ? "search" : "custom",
    });
  }

  return (
    <div>
      <button
        onClick={onBack}
        style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: TOK.muted, fontFamily: "inherit", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 12 }}
      >
        <I.ChevL size={16} color={TOK.muted} /> Back to results
      </button>

      <div style={{ ...TYPE.cardTitle, color: TOK.text }}>{result.name}</div>
      {result.brand && <div style={{ fontSize: 12, color: TOK.dim, marginTop: 2 }}>{result.brand}</div>}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
        <span style={{ ...TYPE.body, color: TOK.muted }}>Amount</span>
        <GramsInput value={grams} onChange={setGrams} />
      </div>

      <MacroPreview kcal={kcal} protein={protein} carbs={carbs} fat={fat} />

      <Btn full size="lg" onClick={add} disabled={saving} style={{ marginTop: 18 }} leadIcon={<I.Plus size={18} color={TOK.bg} />}>
        Add to {meal}
      </Btn>
    </div>
  );
}

function GramsInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="number"
        inputMode="numeric"
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
        style={{ ...inputStyle, width: 96, textAlign: "right", height: 44 }}
        className="tnum"
      />
      <span style={{ fontSize: 14, color: TOK.muted }}>g</span>
    </div>
  );
}

function MacroPreview({ kcal, protein, carbs, fat }: { kcal: number; protein: number; carbs: number; fat: number }) {
  const cell = (label: string, val: React.ReactNode, color: string) => (
    <div style={{ flex: 1, padding: "10px 8px", background: TOK.surface, borderRadius: 10, textAlign: "center" }}>
      <Tnum style={{ fontSize: 18, fontWeight: 600, color }}>{val}</Tnum>
      <div style={{ ...TYPE.col, color: TOK.dim, marginTop: 2 }}>{label}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
      {cell("kcal", kcal, TOK.text)}
      {cell("Protein", `${protein}g`, "#f87171")}
      {cell("Carbs", `${carbs}g`, "#fbbf24")}
      {cell("Fat", `${fat}g`, "#60a5fa")}
    </div>
  );
}

// ── Search tab ─────────────────────────────────────────────────────
function SearchTab({ meal, saving, onCommit }: { meal: Meal; saving: boolean; onCommit: (e: NewFoodLog) => void }) {
  const { db } = useApp();
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<Result[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [chosen, setChosen] = React.useState<Result | null>(null);
  const reqId = React.useRef(0);

  React.useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      const [cache, off] = await Promise.all([
        searchFoodsCache(db, term).catch(() => [] as Food[]),
        offSearch(term).catch(() => [] as OffFood[]),
      ]);
      if (id !== reqId.current) return; // stale response
      const merged: Result[] = [...cache.map(fromCache), ...off.map(fromOff)];
      // Dedupe by lowercased name + brand.
      const seen = new Set<string>();
      const deduped = merged.filter((r) => {
        const k = (r.name + "|" + (r.brand ?? "")).toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      setResults(deduped);
      setLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, [q, db]);

  if (chosen) return <PortionConfirm result={chosen} meal={meal} saving={saving} onCommit={onCommit} onBack={() => setChosen(null)} />;

  return (
    <div>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 14, top: 0, bottom: 0, display: "flex", alignItems: "center", pointerEvents: "none" }}>
          <I.Search size={18} color={TOK.dim} />
        </span>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search foods…"
          style={{ ...inputStyle, paddingLeft: 42 }}
        />
      </div>

      <div style={{ marginTop: 12, minHeight: 80 }}>
        {loading && <div style={{ padding: "16px 4px", color: TOK.dim, fontSize: 13 }}>Searching…</div>}
        {!loading && q.trim().length >= 2 && results.length === 0 && (
          <div style={{ padding: "16px 4px", color: TOK.dim, fontSize: 13 }}>No matches. Try Manual entry.</div>
        )}
        {!loading &&
          results.map((r) => (
            <button
              key={r.key}
              onClick={() => setChosen(r)}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 4px", background: "none", border: "none", borderBottom: `1px solid ${TOK.border}`, cursor: "pointer", textAlign: "left", fontFamily: "inherit", WebkitTapHighlightColor: "transparent" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...TYPE.body, color: TOK.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                <div style={{ fontSize: 12, color: TOK.dim, marginTop: 2 }}>
                  {r.brand ? r.brand + " · " : ""}
                  <Tnum>{r.per100.kcal}</Tnum> kcal/100g
                </div>
              </div>
              <I.Plus size={18} color={TOK.muted} />
            </button>
          ))}
      </div>
    </div>
  );
}

// ── Barcode tab ────────────────────────────────────────────────────
function BarcodeTab({ open, meal, saving, onCommit }: { open: boolean; meal: Meal; saving: boolean; onCommit: (e: NewFoodLog) => void }) {
  const [scanning, setScanning] = React.useState(false);
  const [manualCode, setManualCode] = React.useState("");
  const [status, setStatus] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Result | null>(null);
  const [looking, setLooking] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const controlsRef = React.useRef<{ stop: () => void } | null>(null);

  const hasCamera = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  const stopScan = React.useCallback(() => {
    try {
      controlsRef.current?.stop();
    } catch {
      /* ignore */
    }
    controlsRef.current = null;
    const v = videoRef.current;
    if (v && v.srcObject) {
      (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      v.srcObject = null;
    }
    setScanning(false);
  }, []);

  // Always tear the camera down when the tab/sheet closes or unmounts.
  React.useEffect(() => {
    if (!open) stopScan();
    return () => stopScan();
  }, [open, stopScan]);

  async function lookup(code: string) {
    const c = code.trim();
    if (!c) return;
    setLooking(true);
    setStatus(null);
    try {
      const f = await offByBarcode(c);
      if (f) {
        setResult(fromOff(f));
      } else {
        setStatus(`No product found for ${c}. Try Manual entry.`);
      }
    } catch {
      setStatus("Lookup failed. Check your connection.");
    } finally {
      setLooking(false);
    }
  }

  async function startScan() {
    setStatus(null);
    setScanning(true);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (res, _err, ctrl) => {
        if (res) {
          ctrl.stop();
          controlsRef.current = null;
          const v = videoRef.current;
          if (v && v.srcObject) {
            (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
            v.srcObject = null;
          }
          setScanning(false);
          lookup(res.getText());
        }
      });
      controlsRef.current = controls;
    } catch {
      setScanning(false);
      setStatus("Camera unavailable — enter the barcode below.");
    }
  }

  if (result) return <PortionConfirm result={result} meal={meal} saving={saving} onCommit={onCommit} onBack={() => setResult(null)} />;

  return (
    <div>
      {scanning ? (
        <div>
          <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", background: "#000", borderRadius: 14, overflow: "hidden" }}>
            <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
            <div style={{ position: "absolute", inset: "30% 12%", border: "2px solid rgba(255,255,255,0.6)", borderRadius: 10 }} />
          </div>
          <Btn full variant="secondary" onClick={stopScan} style={{ marginTop: 12 }}>
            Stop scanning
          </Btn>
        </div>
      ) : (
        <div>
          {hasCamera && (
            <Btn full size="lg" onClick={startScan} leadIcon={<I.Scan size={18} color={TOK.bg} />}>
              Scan barcode
            </Btn>
          )}

          <div style={{ marginTop: hasCamera ? 16 : 0 }}>
            <div style={{ ...TYPE.eyebrow, color: TOK.dim, marginBottom: 8 }}>{hasCamera ? "Or enter manually" : "Enter barcode"}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                placeholder="e.g. 4006040000000"
                style={{ ...inputStyle, flex: 1 }}
                className="tnum"
              />
              <Btn onClick={() => lookup(manualCode)} disabled={looking || !manualCode.trim()}>
                {looking ? "…" : "Find"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {looking && <div style={{ marginTop: 12, color: TOK.dim, fontSize: 13 }}>Looking up…</div>}
      {status && <div style={{ marginTop: 12, color: TOK.muted, fontSize: 13 }}>{status}</div>}
    </div>
  );
}

// ── Photo tab ──────────────────────────────────────────────────────
async function fileToDataUrl(file: File, max = 1024, quality = 0.7): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no ctx");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function PhotoTab({ meal, saving, onCommit }: { meal: Meal; saving: boolean; onCommit: (e: NewFoodLog) => void }) {
  const { db } = useApp();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<{ name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number } | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const alive = React.useRef(true);
  React.useEffect(() => () => { alive.current = false; }, []);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setDraft(null);
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await analyzeMealPhoto(db, dataUrl);
      if (!alive.current) return;
      if (res.ok) {
        const d = res.data;
        setDraft({ name: d.name, grams: d.serving_g, kcal: d.kcal, protein: d.protein_g, carbs: d.carbs_g, fat: d.fat_g });
      } else {
        setError(res.error);
      }
    } catch {
      if (alive.current) setError("Could not read that image. Try Manual entry.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  function add() {
    if (!draft) return;
    onCommit({
      name: draft.name || "Meal",
      meal,
      qty_g: draft.grams || null,
      kcal: Math.round(draft.kcal),
      protein_g: r2(draft.protein),
      carbs_g: r2(draft.carbs),
      fat_g: r2(draft.fat),
      source: "photo",
    });
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPick} style={{ display: "none" }} />

      {!draft && (
        <Btn full size="lg" onClick={() => fileRef.current?.click()} disabled={busy} leadIcon={<I.Camera size={18} color={TOK.bg} />}>
          {busy ? "Estimating…" : "Take or pick a photo"}
        </Btn>
      )}

      {busy && <div style={{ marginTop: 14, color: TOK.dim, fontSize: 13, textAlign: "center" }}>Analyzing your meal…</div>}

      {error && (
        <div style={{ marginTop: 14, padding: 12, background: TOK.surface, borderRadius: 12 }}>
          <div style={{ fontSize: 13, color: TOK.muted, lineHeight: 1.4 }}>{error}</div>
        </div>
      )}

      {draft && (
        <div>
          <LabeledText label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
            <span style={{ ...TYPE.body, color: TOK.muted }}>Amount</span>
            <GramsInput value={draft.grams} onChange={(v) => setDraft({ ...draft, grams: v })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <LabeledNum label="kcal" value={draft.kcal} onChange={(v) => setDraft({ ...draft, kcal: v })} />
            <LabeledNum label="Protein (g)" value={draft.protein} onChange={(v) => setDraft({ ...draft, protein: v })} />
            <LabeledNum label="Carbs (g)" value={draft.carbs} onChange={(v) => setDraft({ ...draft, carbs: v })} />
            <LabeledNum label="Fat (g)" value={draft.fat} onChange={(v) => setDraft({ ...draft, fat: v })} />
          </div>
          <Btn full size="lg" onClick={add} disabled={saving} style={{ marginTop: 16 }} leadIcon={<I.Plus size={18} color={TOK.bg} />}>
            Add to {meal}
          </Btn>
        </div>
      )}
    </div>
  );
}

// ── Manual tab ─────────────────────────────────────────────────────
function ManualTab({ meal, saving, onCommit }: { meal: Meal; saving: boolean; onCommit: (e: NewFoodLog) => void }) {
  const [name, setName] = React.useState("");
  const [grams, setGrams] = React.useState(0);
  const [kcal, setKcal] = React.useState(0);
  const [protein, setProtein] = React.useState(0);
  const [carbs, setCarbs] = React.useState(0);
  const [fat, setFat] = React.useState(0);

  function add() {
    onCommit({
      name: name.trim() || "Custom food",
      meal,
      qty_g: grams > 0 ? grams : null,
      kcal: Math.round(kcal),
      protein_g: r2(protein),
      carbs_g: r2(carbs),
      fat_g: r2(fat),
      source: "manual",
    });
  }

  const ok = name.trim().length > 0 && kcal > 0;

  return (
    <div>
      <LabeledText label="Name" value={name} onChange={setName} placeholder="e.g. Overnight oats" autoFocus />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
        <LabeledNum label="kcal" value={kcal} onChange={setKcal} />
        <LabeledNum label="Amount (g)" value={grams} onChange={setGrams} />
        <LabeledNum label="Protein (g)" value={protein} onChange={setProtein} />
        <LabeledNum label="Carbs (g)" value={carbs} onChange={setCarbs} />
        <LabeledNum label="Fat (g)" value={fat} onChange={setFat} />
      </div>
      <Btn full size="lg" onClick={add} disabled={saving || !ok} style={{ marginTop: 16 }} leadIcon={<I.Plus size={18} color={TOK.bg} />}>
        Add to {meal}
      </Btn>
    </div>
  );
}

// ── Small labeled inputs ───────────────────────────────────────────
function LabeledText({ label, value, onChange, placeholder, autoFocus }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ ...TYPE.eyebrow, color: TOK.dim, marginBottom: 6 }}>{label}</div>
      <input autoFocus={autoFocus} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </label>
  );
}

function LabeledNum({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ ...TYPE.eyebrow, color: TOK.dim, marginBottom: 6 }}>{label}</div>
      <input
        type="number"
        inputMode="decimal"
        value={value === 0 ? "" : value}
        placeholder="0"
        onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
        style={inputStyle}
        className="tnum"
      />
    </label>
  );
}
