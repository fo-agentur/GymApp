# MacroFactor Workouts — Umbau-Plan

> Ziel (vom Nutzer): Die aktuelle GymApp **komplett zur MacroFactor-Workouts-App umbauen** —
> exaktes Design, volle Funktionalität, Daten in Supabase. Ordner + Repo umbenennen.
> Dieses Dokument ist der Plan **vor** dem Bauen: was die App ausmacht, welche Features sie
> hat, und wie das Design aussieht.

Quellen-Recherche (Original-App):
[MacroFactor Workouts](https://macrofactor.com/workouts/) ·
[New Look / Pentagram-Branding](https://macrofactor.com/new-look/) ·
[Feature-Analyse (dr-muscle)](https://dr-muscle.com/macrofactor-workouts/) ·
[Workouts-Beta / Roadmap](https://macrofactor.com/mm-sept-2025/)

---

## 0. Zentrale Entscheidung (bitte bestätigen oder korrigieren)

Der echte **MacroFactor Workouts** ist eine **reine Trainings-App**. Ernährung ist die
*separate* MacroFactor-App; geteilt/synchronisiert werden nur **Körpergewicht, Körpermaße,
Gewichtstrend und Fortschrittsfotos**.

Die aktuelle GymApp ist dagegen eine **Fusion** beider Apps (eigener „Essen"-Tab,
Open-Food-Facts-Suche, Barcode, KI-Foto→Makros, adaptiver Ernährungscoach).

**Mein Plan / Default:** Ich baue **training-first**, exakt wie das Original:
- Trainings-Erlebnis wird der gesamte Kern (neue IA, neues Home, neue Navigation).
- **Ernährung wird nicht gelöscht** (es gibt echte Nutzerdaten — harte Regel aus `AGENTS.md`),
  sondern aus der Hauptnavigation **herausgenommen** und als optionaler Unterbereich
  „aufbewahrt". Damit ist nichts zerstört und reversibel.
- Synchronisierte Körperdaten (Gewicht/Trend/Maße/Fotos) bleiben — sie gehören laut Original
  **auch** in die Workouts-App.

→ Falls du die Ernährung **komplett behalten** willst (Fusion wie bisher), sag Bescheid;
dann bleibt der „Essen"-Tab in der Navigation. Default ohne Gegenmeldung = training-first.

---

## 1. Was die App ausmacht (Kern-DNA)

MacroFactor Workouts = **wissenschaftlich fundierter, regelbasierter Trainings-Coach**.
Drei Versprechen prägen jede Design- und Feature-Entscheidung:

1. **Programmierung, die sich anpasst** — Programme von Experten, regelbasiert (keine
   generative KI). Gewicht/Wdh. werden nach klaren Regeln angepasst, „wie ein Coach es täte".
2. **Tiefe, schnelle Protokollierung** — jedes Detail loggbar (RIR, Drop-Sets, Failure,
   Teilwdh., Myoreps, Pausen, einseitig L/R, Supersätze) ohne dass das Loggen langsam wird.
3. **Ein vereintes Ökosystem** — Trainings- und Körperdaten leben zusammen; Body-Metriken,
   Waage, Trend und Fotos synchronisieren mit der Ernährungs-App.

Haltung: **privacy-first** (keine Werbung, Daten gehören dem Nutzer, Export möglich),
**„power and simplicity"** (Tiefe für Profis, aber einfache Oberfläche).

---

## 2. Feature-Set (1:1-Referenz, vollständig)

### A) Onboarding & Programmierung
- **Onboarding-Fragebogen**: Ziel (Kraft / Hypertrophie), Erfahrungslevel, verfügbares
  Equipment, Trainingstage/Woche, Session-Länge.
- **Personalisierte Programm-Erstellung** (regelbasiert) aus den Antworten.
- **Custom Program Builder** — eigene Programme vollständig selbst bauen.
- **Vorlagen / Import** — fertige Programm-Templates (eigene, lizenzfreie Vorlagen — keine
  fremden urheberrechtlich geschützten Programme).
- **Periodisierung** — Mesozyklen, Progressions-/Deload-Logik.

### B) Aktives Training (Logging)
- **Pausen-Timer** (anpassbar, Auto-Start nach Satz).
- **RIR** (Reps in Reserve) — primäre Intensitäts-Metrik (RPE optional).
- **Set-Typen**: Normal, **Warm-up (smart warm-ups)**, **Drop-Set**, **Failure**,
  **Partial Reps**, **Myoreps**.
- **Unilateral** — getrennte Werte für links/rechts.
- **Supersätze** — Übungen gruppiert.
- **Custom Exercises** — eigene Übungen anlegen.
- **Übungs-Notizen** pro Übung.
- **Plate Calculator** — Hantelscheiben-Rechner aus dem aktiven Gym-Profil.
- **Satz-Zeilen** mit Ziel-Wdh.-Bereich, RIR-Pill, Set-Typ-Marker, „erledigt"-Check.

### C) Smart Auto-Progression
- Pro Übung **e1RM-Trend** + **Double Progression**: bei Ziel-RIR und oberem Wdh.-Ende →
  Gewicht rauf; sonst Wdh. rauf.
- **Lernt die Progressionsrate** und passt künftige Ziele automatisch an.
- Programm-Ziele entwickeln sich aus den geloggten Sätzen — **Coach-Vorschlag pro Satz**.

### D) Übungs-Datenbank & Anleitung
- **900+ Übungen** (aktuell 873 vorhanden) mit Technik-Notizen / How-to-Guides.
- **Demo-Medien** (eigene/lizenzfreie — **keine** fremden Übungsvideos).
- **Anatomische Muskelkarte** (vorhanden: `MuscleMap.tsx`).

### E) Gym-Profile & Equipment
- **Mehrere Gym-Profile** (Home / Studio / unterwegs) mit Equipment + verfügbaren Scheiben.
- **Plate Calculator** pro Profil.

### F) Analytics & Dashboard
- **Volumen-/Fortschritts-Charts pro Muskelgruppe** (Sätze/Woche vs. Landmarks).
- **PR-Tracker** (Bestleistungen je Übung).
- **Volumen-Tracker**.
- **Anpassbares Dashboard**.
- **Trainings-Historie** (Liste + Detail + Filter).

### G) Körper & Sync
- **Waage-Gewicht** + geglätteter **True-Weight-Trend** (vorhanden in `lib/coach.ts`).
- **Körpermaße** (Taille, Arm, …) — Tabelle `body_metrics` existiert.
- **Fortschrittsfotos** — Bucket + Tabelle `progress_photos` existieren.
- **Sync-Konzept**: diese Körperdaten sind die geteilte Brücke zur Ernährungs-App.

### H) Account & Datenschutz
- Multi-User (Florian + ~10 Freunde), **Username + Passwort**, RLS-isoliert.
- Keine Werbung, kein Paywall, **Daten-Export**.

---

## 3. Design (neuer Pentagram-„New Look")

Das Original wurde mit **Pentagram** (u. a. Reddit-Rebrand) überarbeitet. Belegte Merkmale:
- **Custom-Headline-Schrift „Macro Sans"** — kräftig, klar, „authority and confidence".
- **Neue, präzise Logo-Marken**, „instantly recognizable".
- **Adventurous, space-themed** Illustrationen & Animationen, die komplexe Ideen vereinfachen
  und „a touch of delight" geben.
- **Light + Dark** Mode.

Exakte Hex-Werte sind **nicht öffentlich** → ich definiere eine eigene, kohärente Palette
im selben Geist (wissenschaftlich, ruhig, „space", mit energetischem Akzent). **Keine
Reproduktion** der proprietären Schrift/Illustrationen/Logos — eigene, gleichwertige Assets.

### 3.1 Visual Identity (Vorschlag, dark-first)
- **Basis (dark)**: tiefes Space-Indigo/Near-Black statt reinem OLED-Schwarz, leichte
  „Tiefe" (subtiler Verlauf) — wirkt wie der Original-„space" Hintergrund.
- **Akzent/Primary**: neutral (weiß auf dunkel / schwarz auf hell) für Buttons & aktive
  States — plus **ein** Signatur-Akzent (Space-Blau/Indigo) für Markenmomente (Onboarding,
  Coach-Hinweise, aktiver Satz).
- **Daten-Viz-Semantik (Training):** Volumen, Stärke/e1RM, und **Set-Typ-Farben**
  (Warm-up, Normal, Drop, Failure, Myorep, Partial) als feste Tokens. Muskelgruppen-Skala
  für die Heatmap.
- **Typografie**: Geist (geometrisch, passt) + **kräftige Display-Stufe** für Headlines als
  Pendant zu „Macro Sans"; **Tabular Numbers** für alle Stats.
- **Form**: Karten ~18 px Radius, Pills, großzügige Abstände.
- **Illustrationen**: eigenes **space-themed Illustration-Kit** (Planet/Orbit/Rakete/
  Konstellation) als Inline-SVG für Onboarding & Empty-States. (Optional: Original-Assets via
  Bild-Generator-MCP.)

### 3.2 Informationsarchitektur / Navigation (training-first)
Bottom-Nav mit 5 Slots + zentralem runden **+** (bestehende `TabBar` umbauen):

| Slot | Screen | Inhalt |
|---|---|---|
| **Home** | Today | Heutige/​nächste Einheit, Wochen-Volumen-Ringe, Coach-Hinweis, „Zuletzt" |
| **Train** | Programs | Aktives Programm, Programm-Builder, Vorlagen, Übungs-Bibliothek |
| **+** (FAB) | Quick-Start | Leeres Training · aus Programm starten · Gewicht/​Maß/​Foto loggen |
| **Stats** | Analytics | Volumen/Muskel, Stärke/e1RM, PRs, Muskel-Heatmap, Historie |
| **Profile** | More | Körper (Gewicht/Maße/Fotos), Gym-Profile, Settings, Export, (Essen: optional) |

### 3.3 Screen-Liste (Soll)
Neu/umzubauen: **Onboarding** (Fragebogen), **Program** (Übersicht aktives Programm),
**ProgramBuilder/Editor**, **Templates**, **Workout** (aktiv, erweiterte Set-Typen),
**Today/Home** (training-first), **Stats** (Analytics-Hub), **Body** (Gewicht/Maße/Fotos),
**GymProfiles**, **Export**.
Bestehend & weiterverwenden: **Workout**, **Library**, **ExercisePicker**,
**ExerciseDetail**, **History**, **SessionDetail**, **Routines**(→ Programs),
**RoutineEditor**(→ Builder), **Progress**(→ Stats/Body), **Profile**, **Settings**,
**MuscleMap**, Chart-Kit (`lib/charts.tsx`).

---

## 4. Datenmodell (Supabase, Projekt `aiptokxagqthzhpmtjyk`)

**Vorhanden** (Migrationen 0001–0006): `exercises`, `routines`/`routine_exercises`,
`workout_sessions`, `sets` (inkl. `set_type`, `rir`, `partial_reps`, `side`),
`profiles` (Onboarding-Felder), `weight_logs`, `body_metrics`, `progress_photos`,
`gym_profiles` (bar/plates), `habits`, sowie Nutrition-Tabellen. `program_exercises` wird in
0006 erweitert → eine Programm-Struktur existiert bereits (Phase 5/6).

**Zu ergänzen (neue Migration 0007+):**
- **Programm-Modell** verifizieren/vervollständigen: `programs`, `program_weeks`/`mesocycles`,
  `program_days`, `program_exercises` (Ziel-Sätze/Wdh./RIR, Superset-Gruppe, Progressionsregel).
- **Progression-State** pro Übung (e1RM-Trend, aktuelle Ziele) — persistierte Coach-Ausgabe.
- **`set_type`-Enum erweitern**: `myorep` ist da; `myorep_match`/`top_set` bei Bedarf.
- **Onboarding-Antworten** auf `profiles` (experience, days_per_week, session_minutes, goal).
- **Exercise-Demo-Medien**-Feld (eigene/lizenzfreie Quelle).
- Alle neuen Tabellen **RLS-on**; nach DDL `get_advisors(security)` prüfen.

---

## 5. Gap-Analyse (Ist → Soll)

| Bereich | Ist | Lücke bis „Workouts 1:1" |
|---|---|---|
| Branding/Name | „GymApp", lime/neutral | Rebrand „MacroFactor Workouts", Pentagram-Look, Display-Font, Illustrationen |
| Navigation | Home/Essen/Training/Mehr | training-first 5-Slot-Nav, Essen demoten |
| Onboarding | — | Fragebogen → Programm-Generator fehlt |
| Programme | Routinen + erste Programm-Struktur | echtes Programm-Modell, Builder, Periodisierung, Templates |
| Auto-Progression | Engine spezifiziert (`AGENTS.md`) | implementieren + pro Satz/Session anwenden |
| Logging | Sets + RIR/Partial/Side im Schema | UI für Drop/Myorep/Failure/Superset/smart Warm-up/L-R |
| Gym-Profile | Tabelle da | UI + Plate-Calc-Anbindung |
| Analytics | Progress-Screen + Chart-Kit | Volumen/Muskel, e1RM-Stärke, PR-Tracker, anpassbares Dashboard |
| Körper | Gewicht/Maße/Fotos im Schema | eigene „Body"-Screens + Foto-Vergleich |
| Export | — | JSON/CSV-Export |

---

## 6. Rebrand & Rename

**Was ich selbst mache (in-Repo, sicher/reversibel):**
- `package.json` name → `macrofactor-workouts`.
- `app/manifest.ts` + Layout-Metadaten → Anzeigename „MacroFactor Workouts", neues Icon.
- `README.md` neu, `app/icon.svg` + Wordmark (eigenes, originales Design).
- Design-Tokens/Theme in `app/globals.css` + `lib/design.tsx`.

**Outward-facing / nicht ohne dich (hard to reverse):**
- **GitHub-Repo umbenennen** `fo-agentur/GymApp` → z. B. `macrofactor-workouts`.
  `gh` CLI ist hier nicht installiert → bitte einmal im GitHub-UI umbenennen (Settings →
  Rename) **oder** sag mir, ob ich `gh` einrichten/nutzen soll. Git-Remote-URL passe ich
  danach an.
- **OneDrive-Ordner** `…\AI_LAB\GymApp` umbenennen: geht nicht aus dem laufenden Worktree
  heraus (würde Pfade brechen). Mache ich am Ende oder du benennst ihn um — danach Worktree
  neu verlinken. (Empfehlung: zuletzt, nach Merge.)

Hinweis: „MacroFactor" ist eine Marke. Für dein **privates** Projekt nutze ich den Namen wie
gewünscht, baue aber **eigene** Assets (Logo/Font/Illustrationen) statt Marken-IP zu kopieren.

---

## 7. Roadmap (Phasen, je mit Verifikation; Commit-Schema `feat: phase X — …`)

> Aufbauend auf den bereits gebauten Phasen 1–6. `pnpm build` + `pnpm typecheck` müssen am
> Ende jeder Phase grün sein; Visual-Check bei 390 px.

- **Phase 7 — Rebrand & Theme**: Rename (in-Repo), Pentagram-Palette + Light/Dark-Tokens,
  Display-Font, space-themed Illustration-Kit, neues Icon/Wordmark.
  *Verify:* App startet, Theme-Swap dark/light, Build grün.
- **Phase 8 — Training-first IA**: neue 5-Slot-Nav, Essen demoten, neues Home (heute/nächste
  Einheit, Wochen-Volumen-Ringe, Coach-Hinweis, Zuletzt).
  *Verify:* Navigation + Home visuell bei 390 px korrekt.
- **Phase 9 — Onboarding & Programm-Generator**: Fragebogen-Flow → regelbasiertes Programm;
  Programm-Modell-Migration; speichert aktives Programm.
  *Verify:* Neuer Nutzer → Programm wird generiert & gespeichert.
- **Phase 10 — Program Builder + Periodisierung**: voller Custom-Builder, Bearbeiten,
  Mesozyklen/Deload, Vorlagen-Bibliothek.
  *Verify:* Programm anlegen/bearbeiten, Wochenstruktur stimmt.
- **Phase 11 — Advanced Logging**: Set-Typ-UI (Drop/Myorep/Failure/Partial/L-R/Superset/
  smart Warm-up), Pausen-Timer-Politur, Übungs-Notizen, Plate-Calculator.
  *Verify:* Jeder Set-Typ loggbar; Werte korrekt in `sets`.
- **Phase 12 — Auto-Progression**: e1RM-Trend + Double-Progression, Coach-Vorschlag pro Satz,
  Ziele für nächste Session.
  *Verify:* Nach Session ändern sich Ziele regelkonform.
- **Phase 13 — Gym-Profile**: mehrere Profile, Equipment/Scheiben, Plate-Calc je Profil.
  *Verify:* Profilwechsel ändert Plate-Calc.
- **Phase 14 — Analytics & Dashboard**: Volumen/Muskel, e1RM-Stärke-Linien, PR-Tracker,
  Heatmap, Historie-Filter, anpassbares Dashboard.
  *Verify:* Charts mit echten Daten korrekt.
- **Phase 15 — Body & Fortschritt**: Gewicht/Trend, Körpermaße, Fotos + Vergleich.
  *Verify:* Loggen + Charts + Foto-Upload (RLS) ok.
- **Phase 16 — Politur, Export & Final-Verify**: Daten-Export (JSON/CSV), Settings (Einheiten,
  RIR/RPE, Defaults, Theme), A11y, Final-Build + Playwright-Pass.
  *Verify:* Export lädt; alles grün.

---

## 8. Annahmen & offene Punkte
- **Annahme (Default):** training-first; Ernährung demoten, nicht löschen (siehe §0).
- **Annahme:** Name „MacroFactor Workouts" wie gewünscht; eigene Assets statt Marken-IP.
- **GitHub-Repo-Rename** brauche ich von dir (oder `gh`-Setup) — siehe §6.
- **Live-Deploy** bleibt unangetastet, bis du einen Deploy ausdrücklich freigibst.
