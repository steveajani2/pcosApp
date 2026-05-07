import { Feather } from "@expo/vector-icons";
import * as Print from "expo-print";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function scoreLabel(val: number): string {
  if (val >= 4.5) return "Very high";
  if (val >= 3.5) return "High";
  if (val >= 2.5) return "Moderate";
  if (val >= 1.5) return "Low";
  return "Very low";
}

function trend(vals: number[]): "improving" | "worsening" | "stable" {
  if (vals.length < 4) return "stable";
  const half = Math.floor(vals.length / 2);
  const early = avg(vals.slice(0, half));
  const recent = avg(vals.slice(half));
  if (recent - early > 0.4) return "improving";
  if (early - recent > 0.4) return "worsening";
  return "stable";
}

function trendIcon(t: "improving" | "worsening" | "stable"): string {
  if (t === "improving") return "↑";
  if (t === "worsening") return "↓";
  return "→";
}

function trendColor(t: "improving" | "worsening" | "stable", isGood: boolean): string {
  if (t === "stable") return "#888";
  const good = t === "improving" ? isGood : !isGood;
  return good ? "#4CAF50" : "#E57373";
}

export default function ReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { checkIns, settings, getStreak, getCyclePhase } = useApp();
  const [exporting, setExporting] = useState(false);

  const last30 = checkIns.slice(0, 30);
  const last7 = checkIns.slice(0, 7);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const metrics = [
    { key: "energy" as const, label: "Energy", higherIsBetter: true },
    { key: "mood" as const, label: "Mood", higherIsBetter: true },
    { key: "stress" as const, label: "Stress", higherIsBetter: false },
    { key: "bloating" as const, label: "Bloating", higherIsBetter: false },
    { key: "cravings" as const, label: "Cravings", higherIsBetter: false },
    { key: "acne" as const, label: "Acne", higherIsBetter: false },
  ];

  const stats = metrics.map((m) => {
    const vals = last30.map((c) => c[m.key]);
    const allVals = checkIns.map((c) => c[m.key]);
    const weekVals = last7.map((c) => c[m.key]);
    const t = trend(allVals);
    return {
      ...m,
      avg: avg(vals),
      weekAvg: avg(weekVals),
      trend: t,
      periods: last30.filter((c) => c.hasPeriod).length,
    };
  });

  const periodDays = last30.filter((c) => c.hasPeriod).length;
  const notesEntries = last30.filter((c) => c.notes.trim().length > 0);
  const streak = getStreak();
  const phase = getCyclePhase();
  const userName = settings.name || "Patient";
  const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const cycleLen = settings.cycleLength;
  const cycleStart = new Date(settings.cycleStartDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  async function handleExport() {
    setExporting(true);
    try {
      const html = buildHTML({ userName, reportDate, stats, last30, notesEntries, periodDays, streak, phase, cycleLen, cycleStart, settings });
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Share Symptom Report" });
      } else {
        await Print.printAsync({ html });
      }
    } catch {}
    setExporting(false);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Doctor's Report</Text>
        <Pressable
          onPress={handleExport}
          disabled={exporting}
          style={({ pressed }) => [styles.exportBtn, { backgroundColor: colors.primary, opacity: pressed || exporting ? 0.8 : 1 }]}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="share" size={16} color="#fff" />
              <Text style={[styles.exportBtnText, { fontFamily: "Inter_600SemiBold" }]}>Export PDF</Text>
            </>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>PATIENT</Text>
          <Text style={[styles.patientName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{userName}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Report generated: {reportDate}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Based on {last30.length} check-in{last30.length !== 1 ? "s" : ""} over the last {Math.min(30, checkIns.length)} days
          </Text>
          <Text style={[styles.meta, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Current cycle phase: {phase.charAt(0).toUpperCase() + phase.slice(1)} · Cycle length: {cycleLen} days · Last cycle start: {cycleStart}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Symptom averages (30 days)</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 0, overflow: "hidden" }]}>
          {stats.map((s, i) => {
            const t = trend(checkIns.map((c) => c[s.key]));
            const tc = trendColor(t, s.higherIsBetter);
            return (
              <View key={s.key} style={[styles.statRow, i < stats.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <Text style={[styles.statLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>{s.label}</Text>
                <View style={styles.statRight}>
                  <View style={[styles.scoreBar, { backgroundColor: colors.muted }]}>
                    <View style={[styles.scoreBarFill, { width: `${(s.avg / 5) * 100}%`, backgroundColor: colors.primary }]} />
                  </View>
                  <Text style={[styles.statAvg, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{s.avg.toFixed(1)}/5</Text>
                  <Text style={[styles.statScore, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{scoreLabel(s.avg)}</Text>
                  <Text style={[styles.trendIcon, { color: tc }]}>{trendIcon(t)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Cycle & period</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoKey, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Period days logged (30d)</Text>
            <Text style={[styles.infoVal, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{periodDays} days</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoKey, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Tracking streak</Text>
            <Text style={[styles.infoVal, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{streak} days</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoKey, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Estimated cycle length</Text>
            <Text style={[styles.infoVal, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{cycleLen} days</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.infoKey, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>Current phase</Text>
            <Text style={[styles.infoVal, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>{phase.charAt(0).toUpperCase() + phase.slice(1)}</Text>
          </View>
        </View>

        {notesEntries.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>Personal notes ({notesEntries.length})</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {notesEntries.slice(0, 5).map((c) => (
                <View key={c.id} style={styles.noteEntry}>
                  <Text style={[styles.noteDate, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{new Date(c.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Text>
                  <Text style={[styles.noteText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{c.notes}</Text>
                </View>
              ))}
              {notesEntries.length > 5 && (
                <Text style={[styles.moreNotes, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>+ {notesEntries.length - 5} more in the full PDF export</Text>
              )}
            </View>
          </>
        )}

        <View style={[styles.disclaimerCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.disclaimer, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            This report is a self-tracked symptom summary intended to support conversations with your healthcare provider. It is not a medical diagnosis.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function buildHTML({ userName, reportDate, stats, last30, notesEntries, periodDays, streak, phase, cycleLen, cycleStart, settings }: {
  userName: string; reportDate: string; stats: ReturnType<typeof Array.prototype.map>; last30: ReturnType<typeof Array.prototype.slice>;
  notesEntries: ReturnType<typeof Array.prototype.filter>; periodDays: number; streak: number; phase: string; cycleLen: number; cycleStart: string;
  settings: { name: string; cycleStartDate: string; cycleLength: number };
}): string {
  const metricRows = (stats as { key: string; label: string; avg: number; higherIsBetter: boolean }[]).map((s) => {
    const bar = Math.round((s.avg / 5) * 100);
    return `
      <tr>
        <td style="padding:10px 0; color:#333; font-weight:500">${s.label}</td>
        <td style="padding:10px 0;">
          <div style="background:#eee; border-radius:4px; height:8px; width:120px; display:inline-block; vertical-align:middle; margin-right:10px;">
            <div style="background:#B97A8D; border-radius:4px; height:8px; width:${bar}%;"></div>
          </div>
          ${s.avg.toFixed(1)}/5
        </td>
        <td style="padding:10px 0; color:#777">${scoreLabel(s.avg)}</td>
      </tr>`;
  }).join("");

  const notesHtml = (notesEntries as { id: string; date: string; notes: string }[]).map((c) =>
    `<div style="margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid #f0eae6;">
      <div style="color:#B97A8D; font-size:12px; margin-bottom:4px; font-weight:600">${new Date(c.date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
      <div style="color:#444; font-size:14px; line-height:1.5">${c.notes}</div>
    </div>`
  ).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 40px; background: #FAF8F5; }
    .header { background: #B97A8D; color: white; padding: 32px 40px; border-radius: 16px; margin-bottom: 32px; }
    .header h1 { margin: 0 0 4px; font-size: 28px; font-weight: 700; }
    .header p { margin: 0; opacity: 0.85; font-size: 14px; }
    .section { background: white; border-radius: 14px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.07); }
    .section h2 { margin: 0 0 16px; font-size: 17px; color: #B97A8D; font-weight: 600; border-bottom: 2px solid #f7f0f3; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f5f0f0; font-size: 14px; }
    .info-row:last-child { border-bottom: none; }
    .info-key { color: #888; }
    .info-val { font-weight: 600; color: #333; }
    .disclaimer { background: #f9f5f0; border-radius: 10px; padding: 16px; font-size: 12px; color: #888; line-height: 1.5; margin-top: 16px; }
    .badge { display: inline-block; background: #f7edf2; color: #B97A8D; font-weight: 600; font-size: 12px; border-radius: 20px; padding: 3px 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>PCOS Symptom Report</h1>
    <p>${userName} &nbsp;·&nbsp; ${reportDate} &nbsp;·&nbsp; Based on ${last30.length} check-ins</p>
  </div>

  <div class="section">
    <h2>Patient Overview</h2>
    <div class="info-row"><span class="info-key">Name</span><span class="info-val">${userName}</span></div>
    <div class="info-row"><span class="info-key">Current cycle phase</span><span class="info-val">${phase.charAt(0).toUpperCase() + phase.slice(1)} <span class="badge">${phase}</span></span></div>
    <div class="info-row"><span class="info-key">Estimated cycle length</span><span class="info-val">${cycleLen} days</span></div>
    <div class="info-row"><span class="info-key">Last cycle start</span><span class="info-val">${cycleStart}</span></div>
    <div class="info-row"><span class="info-key">Period days logged (30d)</span><span class="info-val">${periodDays} days</span></div>
    <div class="info-row"><span class="info-key">Tracking streak</span><span class="info-val">${streak} consecutive days</span></div>
  </div>

  <div class="section">
    <h2>Symptom Averages — Last 30 Days (Scale 1–5)</h2>
    <table>
      <thead><tr><th style="text-align:left;color:#999;font-size:12px;padding-bottom:8px">SYMPTOM</th><th style="text-align:left;color:#999;font-size:12px">SCORE</th><th style="text-align:left;color:#999;font-size:12px">LEVEL</th></tr></thead>
      <tbody>${metricRows}</tbody>
    </table>
  </div>

  ${notesEntries.length > 0 ? `
  <div class="section">
    <h2>Patient Notes</h2>
    ${notesHtml}
  </div>` : ""}

  <div class="disclaimer">
    <strong>Note to provider:</strong> This report was self-generated by the patient using the Elara PCOS Wellness Companion app. All data is self-reported. Symptom scores are on a 1–5 scale. This document is intended to support clinical conversations and is not a diagnostic tool.
  </div>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, gap: 10 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 17 },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  exportBtnText: { color: "#fff", fontSize: 14 },
  scroll: { padding: 20, gap: 0 },
  card: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 14 },
  sectionLabel: { fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 },
  patientName: { fontSize: 22, marginBottom: 6 },
  meta: { fontSize: 13, lineHeight: 20, marginBottom: 2 },
  sectionTitle: { fontSize: 16, marginBottom: 10, marginTop: 6 },
  statRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  statLabel: { fontSize: 14, width: 76 },
  statRight: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, justifyContent: "flex-end" },
  scoreBar: { height: 6, width: 60, borderRadius: 3, overflow: "hidden" },
  scoreBarFill: { height: "100%", borderRadius: 3 },
  statAvg: { fontSize: 14, minWidth: 34 },
  statScore: { fontSize: 12, minWidth: 56, textAlign: "right" },
  trendIcon: { fontSize: 16, minWidth: 16 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  infoKey: { fontSize: 13 },
  infoVal: { fontSize: 14 },
  noteEntry: { paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1 },
  noteDate: { fontSize: 12, marginBottom: 4 },
  noteText: { fontSize: 14, lineHeight: 20 },
  moreNotes: { fontSize: 13, textAlign: "center", paddingTop: 4 },
  disclaimerCard: { flexDirection: "row", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 6, alignItems: "flex-start" },
  disclaimer: { flex: 1, fontSize: 12, lineHeight: 18 },
});
