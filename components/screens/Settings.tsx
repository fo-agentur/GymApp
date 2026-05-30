"use client";
import React from "react";
import { useApp } from "../app-context";
import { fetchProfile, updateProfile } from "@/lib/data";
import { TOK, ScreenHeader, SectionHeader, Card, Row, Divider, Segmented, MiniStepper, Tnum } from "@/lib/design";

export default function Settings() {
  const { db, userId, accent, goto } = useApp();
  const [units, setUnits] = React.useState("metric");
  const [bar, setBar] = React.useState(20);
  const [rest, setRest] = React.useState(120);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const p = await fetchProfile(db, userId);
      if (p) {
        setUnits(p.units);
        setBar(Number(p.bar_weight_kg));
        setRest(p.default_rest_seconds);
      }
    })();
  }, [db, userId]);

  async function persist(patch: { units?: string; bar_weight_kg?: number; default_rest_seconds?: number }) {
    try {
      await updateProfile(db, userId, patch);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch {
      /* ignore */
    }
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 32 }}>
      <ScreenHeader back onBack={() => goto("profile")} title="Settings" trailing={saved ? <Tnum style={{ fontSize: 12, color: accent.hex, paddingRight: 8 }}>Saved</Tnum> : undefined} />

      <SectionHeader title="Preferences" style={{ padding: "12px 16px 8px" }} />
      <Card style={{ margin: "0 12px 20px" }}>
        <Row
          label="Units"
          trailing={
            <div style={{ minWidth: 170, flexShrink: 0 }}>
              <Segmented accent={accent} value={units} onChange={(v) => { setUnits(v); persist({ units: v }); }} options={[{ value: "metric", label: "Metric" }, { value: "imperial", label: "Imperial" }]} />
            </div>
          }
        />
        <Divider />
        <Row label="Default bar weight" sublabel="Used in the plate calculator" trailing={<MiniStepper value={bar} min={0} step={2.5} unit="kg" onChange={(v) => { setBar(v); persist({ bar_weight_kg: v }); }} />} />
        <Divider />
        <Row label="Default rest time" sublabel="Per new exercise" trailing={<MiniStepper value={rest} min={0} step={15} unit="s" onChange={(v) => { setRest(v); persist({ default_rest_seconds: v }); }} />} />
      </Card>

      <SectionHeader title="About" />
      <Card style={{ margin: "0 12px 20px" }}>
        <Row label="Version" trailing={<Tnum style={{ color: TOK.dim, fontSize: 13 }}>1.0.0</Tnum>} />
      </Card>
    </div>
  );
}
