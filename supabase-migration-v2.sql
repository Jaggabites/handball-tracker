-- ============================================================
-- Migration: Stimmung als KPI + neue Felder
-- Führe dieses Script im Supabase SQL Editor aus
-- ============================================================

-- Neue Spalten zur sessions-Tabelle hinzufügen
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS anzahl_kinder  text DEFAULT '',
  ADD COLUMN IF NOT EXISTS anzahl_trainer text DEFAULT '',
  ADD COLUMN IF NOT EXISTS positiv_kinder text DEFAULT '',
  ADD COLUMN IF NOT EXISTS negativ_kinder text DEFAULT '';

-- Stimmung ist jetzt Teil des kpis JSONB-Feldes (kein Schema-Change nötig)
-- Bestehende Sessions erhalten automatisch stimmung:3 beim nächsten Speichern

-- Realtime sicherstellen (falls noch nicht aktiv)
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE goals;
