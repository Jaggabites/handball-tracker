# 🤾 Handball E-Jugend Tracker — Deployment Anleitung

## Was du brauchst (alles kostenlos)
- GitHub Account: https://github.com
- Supabase Account: https://supabase.com  
- Vercel Account: https://vercel.com

---

## Schritt 1 — Supabase Datenbank einrichten

1. Gehe zu https://supabase.com und logge dich ein
2. Klicke **"New Project"**
3. Gib einen Namen ein z.B. `handball-tracker`, wähle eine Region (z.B. Frankfurt) und ein Passwort
4. Warte ~1 Minute bis das Projekt bereit ist
5. Klicke links auf **"SQL Editor"**
6. Kopiere den gesamten Inhalt der Datei `supabase-setup.sql` und füge ihn ein
7. Klicke **"Run"** — du solltest keine Fehler sehen
8. Gehe zu **"Project Settings" → "API"**
9. Kopiere dir:
   - **Project URL** (sieht aus wie: `https://abc123.supabase.co`)
   - **anon public** Key (langer String unter "Project API keys")

---

## Schritt 2 — Code auf GitHub hochladen

1. Gehe zu https://github.com und logge dich ein
2. Klicke oben rechts auf **"+" → "New repository"**
3. Name: `handball-tracker`, stelle es auf **Private**, klicke **"Create repository"**
4. Lade den gesamten Projektordner hoch:
   - Klicke **"uploading an existing file"**
   - Ziehe alle Dateien aus dem Ordner `handball-tracker` rein (NICHT den Ordner selbst, sondern seinen Inhalt)
   - Wichtig: Auch Unterordner `src/` mit hochladen
   - Klicke **"Commit changes"**

---

## Schritt 3 — Auf Vercel deployen

1. Gehe zu https://vercel.com und logge dich mit GitHub ein
2. Klicke **"Add New → Project"**
3. Wähle dein `handball-tracker` Repository aus
4. Vercel erkennt automatisch dass es ein Vite/React Projekt ist
5. Bevor du auf Deploy klickst: Klicke auf **"Environment Variables"**
6. Füge zwei Variablen hinzu:
   ```
   Name: VITE_SUPABASE_URL
   Value: (deine Project URL aus Schritt 1)
   
   Name: VITE_SUPABASE_ANON_KEY  
   Value: (dein anon key aus Schritt 1)
   ```
7. Klicke **"Deploy"**
8. Nach ~1 Minute bekommst du eine URL wie: `https://handball-tracker-xyz.vercel.app`

---

## Schritt 4 — Fertig! 🎉

- Teile die Vercel-URL mit allen Trainern
- Jeder kann von jedem Gerät (Handy, Tablet, PC) darauf zugreifen
- Daten werden in Echtzeit synchronisiert — kein Neuladen nötig
- Excel Export funktioniert direkt im Browser

---

## Probleme?

**"Fehler beim Laden"** → Prüfe ob die Environment Variables in Vercel korrekt eingetragen sind

**"Keine Daten"** → Prüfe ob das SQL-Script in Supabase erfolgreich ausgeführt wurde

**Neue URL nach Update** → Bei Änderungen am Code einfach die Dateien auf GitHub aktualisieren, Vercel deployed automatisch neu
