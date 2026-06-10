"use client";
import React from "react";
import { useApp } from "../app-context";
import { fetchProfile, fetchStats, type Stats } from "@/lib/data";
import type { Profile as ProfileRow } from "@/lib/supabase/types";
import { EQUIPMENT_OPTIONS } from "@/lib/equipment";
import { TOK, TYPE, ScreenHeader, SectionHeader, Card, Row, Divider, MetricStat, Btn, I, fmtVol, hmm } from "@/lib/design";

export default function Profile() {
  const { db, userId, username, myEquipment, goto, signOut } = useApp();
  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [stats, setStats] = React.useState<Stats | null>(null);

  React.useEffect(() => {
    (async () => {
      const [p, s] = await Promise.all([fetchProfile(db, userId), fetchStats(db)]);
      setProfile(p);
      setStats(s);
    })();
  }, [db, userId]);

  const initials = username.slice(0, 2).toUpperCase();
  const memberSince = profile ? new Date(profile.created_at).toLocaleDateString("de-DE", { month: "short", year: "numeric" }) : "—";
  const equipLabel = myEquipment.length
    ? myEquipment.map((id) => EQUIPMENT_OPTIONS.find((o) => o.id === id)?.title ?? id).join(", ")
    : "Noch nicht ausgewählt";

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 96 }}>
      <ScreenHeader large title="Profil" />

      <div style={{ padding: "0 16px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: 999, background: TOK.surface, border: `1px solid ${TOK.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: TOK.text, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...TYPE.cardTitle, color: TOK.text }}>{profile?.display_name || username}</div>
          <div style={{ fontSize: 12, color: TOK.dim, marginTop: 4 }}>Mitglied seit {memberSince}</div>
        </div>
      </div>

      <SectionHeader title="Bilanz" />
      <div style={{ padding: "0 12px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <MetricStat label="Workouts" value={stats?.totalSessions ?? 0} />
        <MetricStat label="Volumen" value={fmtVol(stats?.totalVolume ?? 0)} unit="kg" />
        <MetricStat label="Sätze" value={stats?.totalSets ?? 0} />
        <MetricStat label="Ø Dauer" value={stats?.avgDuration ? hmm(stats.avgDuration) : "—"} />
      </div>

      <SectionHeader title="Auswertung" />
      <Card style={{ margin: "0 12px 20px" }}>
        <Row label="Statistik & Muskeln" chevron onTap={() => goto("progress")} />
        <Divider />
        <Row label="Historie" sublabel="Alle Workouts" chevron onTap={() => goto("history")} />
        <Divider />
        <Row label="Übungs-Bibliothek" chevron onTap={() => goto("library")} />
      </Card>

      <SectionHeader title="Konto" />
      <Card style={{ margin: "0 12px 20px" }}>
        <Row label="Benutzername" sublabel={username} />
        <Divider />
        <Row label="Mein Equipment" sublabel={equipLabel} chevron onTap={() => goto("settings")} />
        <Divider />
        <Row label="Einstellungen" chevron onTap={() => goto("settings")} />
      </Card>

      <div style={{ padding: "8px 12px 0" }}>
        <Btn variant="danger" full leadIcon={<I.Logout size={16} color={TOK.fail} />} onClick={signOut}>Abmelden</Btn>
      </div>
    </div>
  );
}
