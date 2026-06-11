"use client";
import React from "react";
import { useApp } from "../app-context";
import { fetchProfile, updateProfile } from "@/lib/data";
import { EQUIPMENT_OPTIONS, parseEquipment, type EquipmentId } from "@/lib/equipment";
import { applyTheme, storedTheme, normalizeTheme, type ThemePref } from "@/lib/theme";
import { TOK, TYPE, ScreenHeader, SectionHeader, Card, Row, Divider, MiniStepper, Segmented, Tnum, I } from "@/lib/design";

export default function Settings() {
  const { db, userId, accent, goBack, reloadProfile } = useApp();
  const [bar, setBar] = React.useState(20);
  const [rest, setRest] = React.useState(120);
  const [equipment, setEquipment] = React.useState<EquipmentId[]>([]);
  // init in an effect (not the initializer) — localStorage is unavailable
  // during SSR and a mismatch would trip hydration.
  const [theme, setTheme] = React.useState<ThemePref>("system");
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setTheme(storedTheme());
  }, []);

  React.useEffect(() => {
    (async () => {
      const p = await fetchProfile(db, userId);
      if (p) {
        setBar(Number(p.bar_weight_kg));
        setRest(p.default_rest_seconds);
        setEquipment(parseEquipment(p.equipment));
        // since migration 0008 the server value is trustworthy (default 'system')
        setTheme(normalizeTheme(p.theme));
      }
    })();
  }, [db, userId]);

  function changeTheme(v: string) {
    const pref = normalizeTheme(v);
    setTheme(pref);
    applyTheme(pref); // instant + localStorage
    persist({ theme: pref });
  }

  async function persist(patch: { bar_weight_kg?: number; default_rest_seconds?: number; equipment?: { items: EquipmentId[] }; theme?: string }) {
    try {
      await updateProfile(db, userId, patch);
      if (patch.equipment) await reloadProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch {
      /* offline — values stay local */
    }
  }

  function toggleEquipment(id: EquipmentId) {
    setEquipment((cur) => {
      const next = cur.includes(id) ? cur.filter((e) => e !== id) : [...cur, id];
      persist({ equipment: { items: next } });
      return next;
    });
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 96 }}>
      <ScreenHeader back onBack={goBack} title="Einstellungen" trailing={saved ? <Tnum style={{ fontSize: 12, color: accent.hex, paddingRight: 8 }}>Gespeichert</Tnum> : undefined} />

      <SectionHeader title="Mein Equipment" style={{ padding: "12px 16px 4px" }} />
      <div style={{ padding: "0 16px 8px", fontSize: 12, color: TOK.dim, lineHeight: 1.5 }}>
        Bestimmt, welche Übungen dir in der Bibliothek und beim Erstellen von Routinen vorgeschlagen werden.
      </div>
      <Card style={{ margin: "0 12px 20px" }}>
        {EQUIPMENT_OPTIONS.map((opt, i) => {
          const sel = equipment.includes(opt.id);
          return (
            <React.Fragment key={opt.id}>
              {i > 0 && <Divider />}
              <Row
                label={opt.title}
                sublabel={opt.sub}
                onTap={() => toggleEquipment(opt.id)}
                trailing={
                  <span style={{ width: 24, height: 24, borderRadius: 999, flexShrink: 0, border: `1.5px solid ${sel ? accent.hex : TOK.dim}`, background: sel ? accent.hex : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {sel && <I.Check size={14} color={accent.ink} />}
                  </span>
                }
              />
            </React.Fragment>
          );
        })}
      </Card>

      <SectionHeader title="Darstellung" />
      <Card style={{ margin: "0 12px 20px" }}>
        <Row
          label="Design"
          sublabel="System folgt der Geräte-Einstellung"
          trailing={
            <div style={{ minWidth: 196, flexShrink: 0 }}>
              <Segmented
                accent={accent}
                value={theme}
                onChange={changeTheme}
                options={[
                  { value: "light", label: "Hell" },
                  { value: "dark", label: "Dunkel" },
                  { value: "system", label: "System" },
                ]}
              />
            </div>
          }
        />
      </Card>

      <SectionHeader title="Training" />
      <Card style={{ margin: "0 12px 20px" }}>
        <Row label="Standard-Stangengewicht" sublabel="Für den Scheibenrechner" trailing={<MiniStepper value={bar} min={0} step={2.5} unit="kg" onChange={(v) => { setBar(v); persist({ bar_weight_kg: v }); }} />} />
        <Divider />
        <Row label="Standard-Pause" sublabel="Für neue Übungen ohne eigene Pause" trailing={<MiniStepper value={rest} min={0} step={15} unit="s" onChange={(v) => { setRest(v); persist({ default_rest_seconds: v }); }} />} />
      </Card>

      <SectionHeader title="App" />
      <Card style={{ margin: "0 12px 20px" }}>
        <Row label="Version" trailing={<Tnum style={{ color: TOK.dim, fontSize: 13 }}>2.1.0</Tnum>} />
      </Card>
      <div style={{ padding: "0 16px", fontSize: 11.5, color: TOK.dim, lineHeight: 1.5, ...TYPE.caption }}>
        Deine Daten werden pro Benutzer getrennt in der Cloud gespeichert (Supabase, Row Level Security).
      </div>
    </div>
  );
}
