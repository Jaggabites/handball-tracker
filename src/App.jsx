import { useState, useEffect, useCallback } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend } from "recharts"
import * as XLSX from "xlsx"
import { supabase } from "./supabase.js"

const HSG_BLUE  = "#00a0e3"
const HSG_BLACK = "#111111"
const HSG_DARK  = "#0a0a0a"

const KPI_CATEGORIES = [
  { key: "ausdauer",      label: "Ausdauer",      color: "#00a0e3", emoji: "🫁" },
  { key: "kraft",         label: "Kraft",          color: "#e33a00", emoji: "💪" },
  { key: "technik",       label: "Technik",        color: "#00c896", emoji: "🎯" },
  { key: "schnelligkeit", label: "Schnelligkeit",  color: "#f0b400", emoji: "⚡" },
  { key: "erholung",      label: "Erholung",       color: "#7c5cbf", emoji: "😴" },
  { key: "motivation",    label: "Motivation",     color: "#e3006e", emoji: "🔥" },
  { key: "teamgeist",     label: "Teamgeist",      color: "#00d4aa", emoji: "🤝" },
  { key: "stimmung",      label: "Stimmung",       color: "#f59e0b", emoji: "😊" },
]

const GOAL_RATING = [
  { value: 1, label: "Nicht erreicht", color: "#e33a00" },
  { value: 2, label: "Teilweise",      color: "#f0b400" },
  { value: 3, label: "Gut",            color: "#7c5cbf" },
  { value: 4, label: "Sehr gut",       color: "#00c896" },
  { value: 5, label: "Übertroffen",    color: "#00a0e3" },
]

const emptyForm = () => ({
  trainerName:   "",
  anzahlKinder:  "",
  anzahlTrainer: "",
  kpis:          Object.fromEntries(KPI_CATEGORIES.map(c => [c.key, 3])),
  goalRatings:   [null, null, null],
  positivKinder: "",
  negativKinder: "",
  beobachtung:   "",
  verbesserung:  "",
  sonstiges:     "",
})

function ScoreSlider({ value, onChange, color }) {
  const labels = ["", "Sehr schlecht", "Schlecht", "Okay", "Gut", "Ausgezeichnet"]
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <input type="range" min="1" max="5" value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: color, cursor: "pointer" }} />
        <div style={{
          minWidth: "32px", height: "32px", borderRadius: "4px", background: color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: "900", fontSize: "15px", color: "#fff", flexShrink: 0,
          fontFamily: "'Barlow Condensed', sans-serif",
        }}>{value}</div>
      </div>
      <div style={{ fontSize: "10px", color, fontWeight: "700", letterSpacing: "0.5px", fontFamily: "'Barlow Condensed', sans-serif" }}>
        {labels[value].toUpperCase()}
      </div>
    </div>
  )
}

function GoalRatingPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
      {GOAL_RATING.map(r => (
        <button key={r.value} onClick={() => onChange(r.value)} style={{
          padding: "6px 12px", borderRadius: "3px", fontSize: "11px", cursor: "pointer",
          border: `2px solid ${value === r.value ? r.color : "#2a2a2a"}`,
          background: value === r.value ? r.color : "transparent",
          color: value === r.value ? "#fff" : "#666",
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: "700",
          letterSpacing: "0.5px", textTransform: "uppercase", transition: "all 0.15s",
        }}>{r.label}</button>
      ))}
    </div>
  )
}

export default function App() {
  const [view, setView]             = useState("log")
  const [sessions, setSessions]     = useState([])
  const [goals, setGoals]           = useState(["", "", ""])
  const [form, setForm]             = useState(emptyForm())
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [goalsSaved, setGoalsSaved] = useState(false)
  const [activeKpi, setActiveKpi]   = useState("technik")
  const [error, setError]           = useState("")

  const loadData = useCallback(async () => {
    setLoading(true)
    setError("")
    const { data: sd, error: sErr } = await supabase
      .from("sessions")
      .select("*")
      .order("created_at", { ascending: false })
    if (sErr) { setError("Fehler beim Laden: " + sErr.message) }
    else setSessions(sd || [])

    const { data: gd } = await supabase.from("goals").select("*").order("position")
    if (gd?.length > 0) {
      const g = ["", "", ""]
      gd.forEach(row => { if (row.position < 3) g[row.position] = row.text })
      setGoals(g)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const ch = supabase.channel("realtime-hsg")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, loadData)
      .on("postgres_changes", { event: "*", schema: "public", table: "goals" }, loadData)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [loadData])

  const today    = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
  const todayISO = new Date().toISOString().split("T")[0]

  const saveSession = async () => {
    if (!form.trainerName.trim()) { alert("Bitte Trainernamen eingeben."); return }
    setSaving(true)
    const { error: err } = await supabase.from("sessions").insert([{
      trainer_name:   form.trainerName,
      anzahl_kinder:  form.anzahlKinder,
      anzahl_trainer: form.anzahlTrainer,
      date_label:     today,
      date_iso:       todayISO,
      kpis:           form.kpis,
      goal_ratings:   form.goalRatings,
      positiv_kinder: form.positivKinder,
      negativ_kinder: form.negativKinder,
      beobachtung:    form.beobachtung,
      verbesserung:   form.verbesserung,
      sonstiges:      form.sonstiges,
    }])
    setSaving(false)
    if (err) { alert("Fehler beim Speichern: " + err.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    setForm(emptyForm())
  }

  const saveGoals = async () => {
    await supabase.from("goals").delete().neq("id", 0)
    await supabase.from("goals").insert(goals.map((text, position) => ({ text, position })))
    setGoalsSaved(true)
    setTimeout(() => setGoalsSaved(false), 2000)
  }

  const sessionsByDate = sessions.reduce((acc, s) => {
    if (!acc[s.date_iso]) acc[s.date_iso] = []
    acc[s.date_iso].push(s)
    return acc
  }, {})

  const avgSessions = Object.entries(sessionsByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date_iso, group]) => {
      const avg = {}
      KPI_CATEGORIES.forEach(c => {
        avg[c.label] = Math.round((group.reduce((s, x) => s + x.kpis[c.key], 0) / group.length) * 10) / 10
      })
      const kinderVals  = group.map(s => Number(s.anzahl_kinder)).filter(n => n > 0)
      const trainerVals = group.map(s => Number(s.anzahl_trainer)).filter(n => n > 0)
      return {
        date:       group[0].date_label,
        date_iso,
        feedbacks:  group.length,
        avgKinder:  kinderVals.length  ? Math.round(kinderVals.reduce((a,b)=>a+b,0)/kinderVals.length)   : null,
        avgTrainer: trainerVals.length ? Math.round(trainerVals.reduce((a,b)=>a+b,0)/trainerVals.length) : null,
        ...avg,
      }
    })

  const radarData = KPI_CATEGORIES.map(c => {
    const all  = sessions.map(s => s.kpis[c.key])
    const last = avgSessions.length > 0 ? sessionsByDate[avgSessions.at(-1).date_iso].map(s => s.kpis[c.key]) : []
    return {
      subject:          c.label,
      "Ø Gesamt":       all.length  ? Math.round(all.reduce((a,b)=>a+b,0)/all.length*10)/10   : 0,
      "Letzte Einheit": last.length ? Math.round(last.reduce((a,b)=>a+b,0)/last.length*10)/10 : 0,
    }
  })

  const exportExcel = () => {
    if (!sessions.length) { alert("Keine Daten."); return }
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sessions.map(s => ({
      Datum: s.date_label, Trainer: s.trainer_name,
      "Anzahl Kinder": s.anzahl_kinder, "Anzahl Trainer": s.anzahl_trainer,
      ...Object.fromEntries(KPI_CATEGORIES.map(c => [c.label, s.kpis[c.key]])),
      "Ziel 1": s.goal_ratings?.[0]??"", "Ziel 2": s.goal_ratings?.[1]??"", "Ziel 3": s.goal_ratings?.[2]??"",
      "Positiv aufgefallen": s.positiv_kinder, "Negativ aufgefallen": s.negativ_kinder,
      Beobachtung: s.beobachtung, Verbesserung: s.verbesserung, Sonstiges: s.sonstiges,
    }))), "Einheiten")
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(avgSessions.map(a => ({
      Datum: a.date, Feedbacks: a.feedbacks, "Ø Kinder": a.avgKinder, "Ø Trainer": a.avgTrainer,
      ...Object.fromEntries(KPI_CATEGORIES.map(c => [c.label, a[c.label]])),
    }))), "Durchschnitte")
    XLSX.writeFile(wb, `HSG-Neckartal-${todayISO}.xlsx`)
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const card       = { background: HSG_BLACK, border: "1px solid #222", borderRadius: "6px", padding: "20px", marginBottom: "12px" }
  const secTitle   = { fontFamily: "'Barlow Condensed',sans-serif", fontSize: "11px", letterSpacing: "2px", color: "#999", fontWeight: "700", marginBottom: "16px", textTransform: "uppercase" }
  const fieldLabel = { fontFamily: "'Barlow Condensed',sans-serif", fontSize: "10px", letterSpacing: "2px", color: "#999", fontWeight: "700", display: "block", marginBottom: "6px", textTransform: "uppercase" }
  const textInput  = { width: "100%", padding: "11px 13px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "4px", color: "#ddd", fontSize: "14px", fontFamily: "'Barlow',sans-serif", outline: "none", boxSizing: "border-box" }
  const badge      = (c) => ({ background: `${c}20`, color: c, padding: "2px 8px", borderRadius: "3px", fontSize: "10px", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: "700", letterSpacing: "0.5px", display: "inline-block" })
  const primaryBtn = (bg=HSG_BLUE, disabled=false) => ({ padding: "13px 26px", background: bg, border: "none", borderRadius: "4px", color: disabled ? "#555" : "#fff", cursor: disabled ? "wait" : "pointer", fontFamily: "'Barlow Condensed',sans-serif", fontWeight: "900", fontSize: "14px", letterSpacing: "2px", textTransform: "uppercase" })

  if (loading) return (
    <div style={{ minHeight: "100vh", background: HSG_DARK, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
      <div style={{ width: "36px", height: "36px", border: "3px solid #1a1a1a", borderTop: `3px solid ${HSG_BLUE}`, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <div style={{ color: HSG_BLUE, fontFamily: "'Barlow Condensed',sans-serif", fontSize: "13px", letterSpacing: "4px" }}>LADE DATEN</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: HSG_DARK, color: "#ddd", fontFamily: "'Barlow',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800;900&display=swap');
        *{box-sizing:border-box}
        input::placeholder,textarea::placeholder{color:#555}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .fi{animation:fadeIn 0.25s ease forwards}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0a0a0a}::-webkit-scrollbar-thumb{background:#222;border-radius:2px}
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: HSG_BLACK, borderBottom: `3px solid ${HSG_BLUE}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 20px 12px" }}>
          <div style={{ width: "44px", height: "44px", background: HSG_BLUE, borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: "22px" }}>🤾</span>
          </div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: "900", fontSize: "clamp(15px,4vw,22px)", color: "#fff", letterSpacing: "-0.5px", lineHeight: 1.1 }}>HSG NECKARTAL</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: "600", fontSize: "10px", color: HSG_BLUE, letterSpacing: "3px", marginTop: "2px" }}>E-JUGEND TRAINING</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "10px", color: "#444", letterSpacing: "1px" }}>{sessions.length} EINTRÄGE</div>
            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "10px", color: "#444", letterSpacing: "1px" }}>{Object.keys(sessionsByDate).length} TAGE</div>
          </div>
        </div>
        <div style={{ display: "flex", borderTop: "1px solid #1a1a1a" }}>
          {[["log","📝 FEEDBACK"],["goals","🎯 ZIELE"],["history","📈 VERLAUF"]].map(([id,lbl]) => (
            <button key={id} onClick={() => setView(id)} style={{
              flex: 1, padding: "11px 4px", background: "none", border: "none",
              borderBottom: view===id ? `3px solid ${HSG_BLUE}` : "3px solid transparent",
              color: view===id ? HSG_BLUE : "#555", cursor: "pointer",
              fontFamily: "'Barlow Condensed',sans-serif", fontWeight: "700",
              fontSize: "clamp(10px,2.5vw,13px)", letterSpacing: "1px", transition: "all 0.15s",
            }}>{lbl}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
        {error && (
          <div style={{ background: "#1a0800", border: "1px solid #e33a00", borderRadius: "4px", padding: "12px", marginBottom: "12px", fontSize: "12px", color: "#e33a00", fontFamily: "'Barlow Condensed',sans-serif" }}>
            ⚠ {error}
          </div>
        )}

        {/* ── FEEDBACK ── */}
        {view==="log" && (
          <div className="fi">
            <div style={{ background: HSG_BLUE, padding: "10px 16px", borderRadius: "4px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: "900", fontSize: "15px", color: "#fff", letterSpacing: "1px" }}>NEUE TRAININGSEINHEIT</span>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: "700", fontSize: "13px", color: "rgba(255,255,255,0.8)" }}>{today}</span>
            </div>

            <div style={card}>
              <div style={secTitle}>TRAINER & TEILNAHME</div>
              <label style={fieldLabel}>TRAINER NAME *</label>
              <input style={{ ...textInput, borderColor: !form.trainerName ? "#2a2a2a" : HSG_BLUE, marginBottom: "14px" }}
                placeholder="Vollständiger Name des Trainers"
                value={form.trainerName}
                onChange={e => setForm(f => ({...f, trainerName: e.target.value}))} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={fieldLabel}>ANZAHL KINDER</label>
                  <input type="number" min="0" style={textInput} placeholder="z.B. 14"
                    value={form.anzahlKinder} onChange={e => setForm(f => ({...f, anzahlKinder: e.target.value}))} />
                </div>
                <div>
                  <label style={fieldLabel}>ANZAHL TRAINER</label>
                  <input type="number" min="0" style={textInput} placeholder="z.B. 3"
                    value={form.anzahlTrainer} onChange={e => setForm(f => ({...f, anzahlTrainer: e.target.value}))} />
                </div>
              </div>
              <p style={{ fontSize: "11px", color: "#888", marginTop: "10px" }}>Mehrere Trainer geben unabhängig Feedback — Werte werden gemittelt.</p>
            </div>

            <div style={card}>
              <div style={secTitle}>KPI BEWERTUNG (1 = Sehr schlecht · 5 = Ausgezeichnet)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {KPI_CATEGORIES.map(cat => (
                  <div key={cat.key}>
                    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: "700", fontSize: "14px", color: "#ccc", letterSpacing: "0.5px", marginBottom: "8px" }}>
                      {cat.emoji} {cat.label.toUpperCase()}
                    </div>
                    <ScoreSlider value={form.kpis[cat.key]}
                      onChange={v => setForm(f => ({...f, kpis:{...f.kpis,[cat.key]:v}}))}
                      color={cat.color} />
                  </div>
                ))}
              </div>
            </div>

            {goals.some(Boolean) && (
              <div style={card}>
                <div style={secTitle}>ZIELBEWERTUNG</div>
                {goals.map((g, i) => g ? (
                  <div key={i} style={{ marginBottom: "18px" }}>
                    <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "12px", color: HSG_BLUE, fontWeight: "700", marginBottom: "8px" }}>
                      ZIEL {i+1}: {g.toUpperCase()}
                    </div>
                    <GoalRatingPicker value={form.goalRatings[i]} onChange={v => {
                      const gr = [...form.goalRatings]; gr[i] = v; setForm(f => ({...f, goalRatings: gr}))
                    }} />
                  </div>
                ) : null)}
              </div>
            )}

            <div style={card}>
              <div style={secTitle}>BEOBACHTUNGEN & NOTIZEN</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={fieldLabel}>✅ POSITIV AUFGEFALLEN</label>
                  <input style={{ ...textInput, borderColor: "#1a3a1a" }} placeholder="Namen oder Beschreibung..."
                    value={form.positivKinder} onChange={e => setForm(f => ({...f, positivKinder: e.target.value}))} />
                </div>
                <div>
                  <label style={fieldLabel}>⚠ NEGATIV AUFGEFALLEN</label>
                  <input style={{ ...textInput, borderColor: "#3a1a1a" }} placeholder="Namen oder Beschreibung..."
                    value={form.negativKinder} onChange={e => setForm(f => ({...f, negativKinder: e.target.value}))} />
                </div>
              </div>
              {[
                ["beobachtung",  "BEOBACHTUNGEN",          "Was ist aufgefallen? Verhalten, Konzentration, Dynamik..."],
                ["verbesserung", "VERBESSERUNGSVORSCHLÄGE", "Was sollte beim nächsten Mal anders sein?"],
              ].map(([key, lbl, ph]) => (
                <div key={key} style={{ marginBottom: "14px" }}>
                  <label style={fieldLabel}>{lbl}</label>
                  <input style={textInput} placeholder={ph} value={form[key]}
                    onChange={e => setForm(f => ({...f,[key]:e.target.value}))} />
                </div>
              ))}
              <label style={fieldLabel}>SONSTIGES</label>
              <textarea style={{ ...textInput, minHeight: "70px", resize: "vertical" }}
                placeholder="Weitere Anmerkungen, Verletzungen, besondere Ereignisse..."
                value={form.sonstiges} onChange={e => setForm(f => ({...f, sonstiges: e.target.value}))} />
            </div>

            <button onClick={saveSession} disabled={saving} style={{
              ...primaryBtn(saved ? "#00c896" : HSG_BLUE, saving),
              width: "100%", padding: "16px", fontSize: "15px",
              boxShadow: `0 4px 20px ${HSG_BLUE}30`,
            }}>
              {saving ? "WIRD GESPEICHERT…" : saved ? "✓ FEEDBACK GESPEICHERT" : "FEEDBACK SPEICHERN"}
            </button>
          </div>
        )}

        {/* ── ZIELE ── */}
        {view==="goals" && (
          <div className="fi" style={card}>
            <div style={secTitle}>TRAININGSZIELE</div>
            <p style={{ fontSize: "13px", color: "#888", marginBottom: "22px", lineHeight: "1.6" }}>
              Bis zu 3 konkrete Ziele. Trainer bewerten diese nach jeder Einheit qualitativ.
            </p>
            {[0,1,2].map(i => (
              <div key={i} style={{ marginBottom: "14px" }}>
                <label style={{ ...fieldLabel, color: HSG_BLUE }}>ZIEL {i+1}</label>
                <input style={textInput}
                  placeholder={["z.B. Dribbling mit beiden Händen beherrschen","z.B. Teamwork im Angriffsspiel verbessern","z.B. Regelkenntnisse festigen"][i]}
                  value={goals[i]} onChange={e => { const g=[...goals]; g[i]=e.target.value; setGoals(g) }} />
              </div>
            ))}
            <button onClick={saveGoals} style={primaryBtn(goalsSaved ? "#00c896" : HSG_BLUE)}>
              {goalsSaved ? "✓ GESPEICHERT" : "ZIELE SPEICHERN"}
            </button>
          </div>
        )}

        {/* ── VERLAUF ── */}
        {view==="history" && (
          <div className="fi">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "11px", color: "#555", letterSpacing: "1px" }}>
                {sessions.length===0 ? "NOCH KEINE DATEN" : `${sessions.length} EINTRÄGE · ${Object.keys(sessionsByDate).length} TRAININGSTAGE`}
              </span>
              <button onClick={exportExcel} style={primaryBtn("#00c896")}>⬇ EXCEL</button>
            </div>

            {sessions.length===0 ? (
              <div style={{ ...card, textAlign: "center", padding: "48px" }}>
                <div style={{ fontSize: "44px", marginBottom: "12px" }}>📭</div>
                <p style={{ color: "#444", fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: "2px", fontSize: "13px" }}>NOCH KEIN FEEDBACK</p>
              </div>
            ) : (<>

              <div style={card}>
                <div style={secTitle}>KPI-VERLAUF (Ø ALLER TRAINER PRO TAG)</div>
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "14px" }}>
                  {KPI_CATEGORIES.map(c => (
                    <button key={c.key} onClick={() => setActiveKpi(c.key)} style={{
                      padding: "5px 11px", borderRadius: "3px", fontSize: "11px", cursor: "pointer",
                      border: `2px solid ${activeKpi===c.key ? c.color : "#222"}`,
                      background: activeKpi===c.key ? `${c.color}20` : "transparent",
                      color: activeKpi===c.key ? c.color : "#555",
                      fontFamily: "'Barlow Condensed',sans-serif", fontWeight: "700", letterSpacing: "0.5px", transition: "all 0.15s",
                    }}>{c.emoji} {c.label.toUpperCase()}</button>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={avgSessions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                    <XAxis dataKey="date" tick={{ fontSize:9, fill:"#555", fontFamily:"'Barlow Condensed',sans-serif" }} />
                    <YAxis domain={[0,5]} ticks={[1,2,3,4,5]} tick={{ fontSize:9, fill:"#555" }} />
                    <Tooltip contentStyle={{ background:"#111", border:`1px solid ${HSG_BLUE}40`, borderRadius:"4px", fontSize:"11px" }} />
                    {KPI_CATEGORIES.filter(c=>c.key===activeKpi).map(c=>(
                      <Line key={c.key} type="monotone" dataKey={c.label} stroke={c.color} strokeWidth={2.5}
                        dot={{ fill:c.color, r:4, strokeWidth:0 }} activeDot={{ r:6, strokeWidth:0 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={card}>
                <div style={secTitle}>Ø PROFIL — GESAMT VS. LETZTE EINHEIT</div>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#222" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize:10, fill:"#555", fontFamily:"'Barlow Condensed',sans-serif" }} />
                    <Radar name="Ø Gesamt" dataKey="Ø Gesamt" stroke={HSG_BLUE} fill={HSG_BLUE} fillOpacity={0.15} />
                    <Radar name="Letzte Einheit" dataKey="Letzte Einheit" stroke="#f0b400" fill="#f0b400" fillOpacity={0.1} />
                    <Legend wrapperStyle={{ fontSize:"11px", color:"#555", fontFamily:"'Barlow Condensed',sans-serif" }} />
                    <Tooltip contentStyle={{ background:"#111", border:`1px solid ${HSG_BLUE}40`, borderRadius:"4px", fontSize:"11px" }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div style={card}>
                <div style={secTitle}>ALLE EINHEITEN</div>
                {Object.entries(sessionsByDate).sort(([a],[b])=>b.localeCompare(a)).map(([date_iso, group]) => {
                  const dayAvg = avgSessions.find(a => a.date_iso === date_iso)
                  return (
                    <div key={date_iso} style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: "1px solid #1a1a1a" }}>
                      <div style={{ background: "#1a1a1a", borderRadius: "6px", padding: "12px 14px", marginBottom: "10px", borderLeft: `4px solid ${HSG_BLUE}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: "900", fontSize: "16px", color: "#fff" }}>{group[0].date_label}</span>
                          <span style={badge(HSG_BLUE)}>{group.length} TRAINER-FEEDBACKS</span>
                        </div>
                        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                          {dayAvg?.avgKinder != null && (
                            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "12px", color: "#aaa" }}>
                              👦 <strong style={{ color: "#fff" }}>{dayAvg.avgKinder}</strong> Kinder
                            </span>
                          )}
                          {dayAvg?.avgTrainer != null && (
                            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "12px", color: "#aaa" }}>
                              👤 <strong style={{ color: "#fff" }}>{dayAvg.avgTrainer}</strong> Trainer
                            </span>
                          )}
                          {dayAvg?.["Stimmung"] != null && (
                            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "12px", color: "#aaa" }}>
                              😊 Stimmung Ø <strong style={{ color: "#f59e0b" }}>{dayAvg["Stimmung"]}/5</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {group.map(t => (
                        <div key={t.id} style={{ background: "#161616", borderRadius: "4px", padding: "12px", marginBottom: "8px", borderLeft: "2px solid #2a2a2a", marginLeft: "8px" }}>
                          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: "700", fontSize: "13px", color: HSG_BLUE, marginBottom: "8px" }}>
                            👤 {t.trainer_name.toUpperCase()}
                          </div>
                          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "6px" }}>
                            {KPI_CATEGORIES.map(c => <span key={c.key} style={badge(c.color)}>{c.label.toUpperCase()} {t.kpis[c.key]}/5</span>)}
                          </div>
                          {goals.some(Boolean) && t.goal_ratings?.some(r=>r!==null) && (
                            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "6px" }}>
                              {goals.map((g,i) => g && t.goal_ratings?.[i] ? (
                                <span key={i} style={badge(GOAL_RATING.find(r=>r.value===t.goal_ratings[i])?.color||"#888")}>
                                  Z{i+1}: {GOAL_RATING.find(r=>r.value===t.goal_ratings[i])?.label?.toUpperCase()}
                                </span>
                              ) : null)}
                            </div>
                          )}
                          {t.positiv_kinder && <p style={{ fontSize: "12px", color: "#00c896", margin: "4px 0 0" }}>✅ {t.positiv_kinder}</p>}
                          {t.negativ_kinder && <p style={{ fontSize: "12px", color: "#e33a00", margin: "3px 0 0" }}>⚠ {t.negativ_kinder}</p>}
                          {t.beobachtung    && <p style={{ fontSize: "12px", color: "#888", margin: "3px 0 0" }}>🔍 {t.beobachtung}</p>}
                          {t.verbesserung   && <p style={{ fontSize: "12px", color: "#888", margin: "3px 0 0" }}>💡 {t.verbesserung}</p>}
                          {t.sonstiges      && <p style={{ fontSize: "12px", color: "#888", margin: "3px 0 0" }}>📝 {t.sonstiges}</p>}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            </>)}
          </div>
        )}

        <div style={{ textAlign: "center", padding: "20px 0 4px", fontFamily: "'Barlow Condensed',sans-serif", fontSize: "10px", color: "#1a1a1a", letterSpacing: "2px" }}>
          HSG NECKARTAL · E-JUGEND TRAINING TRACKER
        </div>
      </div>
    </div>
  )
}
