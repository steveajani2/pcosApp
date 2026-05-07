import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type CheckIn = {
  id: string;
  date: string;
  energy: number;
  mood: number;
  cravings: number;
  bloating: number;
  stress: number;
  acne: number;
  hasPeriod: boolean;
  notes: string;
};

export type Settings = {
  name: string;
  cycleStartDate: string;
  cycleLength: number;
  onboarded: boolean;
};

export type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal" | "unknown";

export type Insight = {
  id: string;
  title: string;
  description: string;
  type: "pattern" | "correlation" | "milestone";
};

export type GuidanceItem = {
  id: string;
  category: "meals" | "movement" | "recovery";
  title: string;
  description: string;
};

type AppContextType = {
  checkIns: CheckIn[];
  settings: Settings;
  isLoading: boolean;
  addCheckIn: (checkIn: Omit<CheckIn, "id">) => Promise<void>;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  getTodayCheckIn: () => CheckIn | null;
  getStreak: () => number;
  getCycleDay: () => number;
  getCyclePhase: () => CyclePhase;
  getTodayGuidance: () => GuidanceItem[];
  getInsights: () => Insight[];
};

const defaultSettings: Settings = {
  name: "",
  cycleStartDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  cycleLength: 35,
  onboarded: false,
};

const CHECKINS_KEY = "@elara/checkins";
const SETTINGS_KEY = "@elara/settings";

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [rawCheckIns, rawSettings] = await Promise.all([
          AsyncStorage.getItem(CHECKINS_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
        ]);
        if (rawCheckIns) setCheckIns(JSON.parse(rawCheckIns));
        if (rawSettings) setSettings({ ...defaultSettings, ...JSON.parse(rawSettings) });
      } catch {}
      setIsLoading(false);
    }
    load();
  }, []);

  const addCheckIn = useCallback(async (data: Omit<CheckIn, "id">) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const checkIn: CheckIn = { id, ...data };
    setCheckIns((prev) => {
      const filtered = prev.filter((c) => c.date !== data.date);
      const updated = [checkIn, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
      AsyncStorage.setItem(CHECKINS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateSettings = useCallback(async (partial: Partial<Settings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getTodayCheckIn = useCallback((): CheckIn | null => {
    const today = new Date().toISOString().split("T")[0];
    return checkIns.find((c) => c.date === today) ?? null;
  }, [checkIns]);

  const getStreak = useCallback((): number => {
    if (checkIns.length === 0) return 0;
    const sorted = [...checkIns].sort((a, b) => b.date.localeCompare(a.date));
    let streak = 0;
    let current = new Date();
    current.setHours(0, 0, 0, 0);
    for (const c of sorted) {
      const d = new Date(c.date + "T00:00:00");
      const diff = Math.round((current.getTime() - d.getTime()) / 86400000);
      if (diff === streak) streak++;
      else break;
    }
    return streak;
  }, [checkIns]);

  const getCycleDay = useCallback((): number => {
    const start = new Date(settings.cycleStartDate + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - start.getTime()) / 86400000);
    return ((diff % settings.cycleLength) + settings.cycleLength) % settings.cycleLength + 1;
  }, [settings]);

  const getCyclePhase = useCallback((): CyclePhase => {
    const day = getCycleDay();
    const len = settings.cycleLength;
    if (day <= 5) return "menstrual";
    if (day <= Math.round(len * 0.4)) return "follicular";
    if (day <= Math.round(len * 0.45)) return "ovulation";
    if (day <= len) return "luteal";
    return "unknown";
  }, [getCycleDay, settings.cycleLength]);

  const getTodayGuidance = useCallback((): GuidanceItem[] => {
    const today = getTodayCheckIn();
    const phase = getCyclePhase();
    const items: GuidanceItem[] = [];

    if (today) {
      if (today.bloating >= 3) {
        items.push({ id: "m1", category: "meals", title: "Anti-inflammatory focus", description: "Reach for ginger tea, leafy greens, and omega-3-rich foods like salmon or walnuts. These calm the gut inflammation that worsens PCOS bloating." });
      } else if (today.cravings >= 4) {
        items.push({ id: "m2", category: "meals", title: "Protein-first meals", description: "Anchor every meal with 25-30g protein — eggs, chicken, legumes — before adding carbs. This stabilizes blood sugar and reduces cravings within 48 hours." });
      } else {
        items.push({ id: "m3", category: "meals", title: "Low-glycemic plate", description: "Half your plate as non-starchy vegetables, one quarter quality protein, one quarter complex carbs like quinoa or sweet potato." });
      }

      if (today.stress >= 4) {
        items.push({ id: "m4", category: "meals", title: "Magnesium-rich foods", description: "Dark chocolate (85%+), pumpkin seeds, and spinach are high in magnesium — a mineral depleted by cortisol that helps calm the nervous system and reduce cravings." });
      }

      if (today.energy <= 2) {
        items.push({ id: "mv1", category: "movement", title: "Gentle walk (20-30 min)", description: "Low-intensity walking improves insulin sensitivity without spiking cortisol. Aim for 10 minutes after each meal if you have time." });
      } else if (today.energy >= 4) {
        items.push({ id: "mv2", category: "movement", title: "Strength training", description: "High energy days are ideal for resistance training. Building muscle improves insulin sensitivity long-term — one of the most effective tools for PCOS management." });
      } else {
        items.push({ id: "mv3", category: "movement", title: "Yoga or pilates", description: "Moderate movement that builds strength without overstimulating the adrenal system. Especially effective during the luteal phase." });
      }

      if (today.stress >= 3) {
        items.push({ id: "r1", category: "recovery", title: "Box breathing before bed", description: "Inhale 4 counts, hold 4, exhale 4, hold 4. Do this for 5 minutes before sleep to lower cortisol, which directly affects PCOS hormone balance." });
      }
    }

    if (phase === "menstrual") {
      items.push({ id: "ph1", category: "recovery", title: "Rest and restore", description: "Your body is doing significant work. Honor lower energy by protecting sleep, reducing intense exercise, and prioritizing warmth and nourishment." });
    } else if (phase === "follicular") {
      items.push({ id: "ph2", category: "movement", title: "Build momentum", description: "Rising estrogen gives you more energy and resilience. This is an excellent time to challenge yourself physically and tackle demanding tasks." });
    } else if (phase === "ovulation") {
      items.push({ id: "ph3", category: "meals", title: "Support detoxification", description: "Cruciferous vegetables (broccoli, cabbage, kale) support estrogen metabolism — especially important if you have estrogen dominance with PCOS." });
    } else if (phase === "luteal") {
      items.push({ id: "ph4", category: "recovery", title: "Progesterone support", description: "Vitamin B6 (bananas, chicken, sunflower seeds) and zinc (pumpkin seeds, beef) support progesterone production, which is often low with PCOS." });
    }

    if (!today) {
      items.push(
        { id: "d1", category: "meals", title: "Complete today's check-in", description: "Log how you're feeling to get personalized nutrition and movement guidance tailored to your symptoms right now." },
        { id: "d2", category: "movement", title: "Gentle movement daily", description: "Even 20 minutes of walking improves insulin sensitivity — one of the core mechanisms underlying PCOS symptoms." },
        { id: "d3", category: "recovery", title: "Prioritize sleep quality", description: "Cortisol spikes from poor sleep directly worsen PCOS symptoms including cravings, mood, and androgen levels." }
      );
    }

    return items;
  }, [getTodayCheckIn, getCyclePhase]);

  const getInsights = useCallback((): Insight[] => {
    const insights: Insight[] = [];
    if (checkIns.length === 0) return insights;

    const streak = getStreak();
    if (streak >= 7) {
      insights.push({ id: "i_streak7", title: `${streak}-day logging streak`, description: "Consistent tracking is the foundation of understanding your body. The patterns are starting to form.", type: "milestone" });
    }

    if (checkIns.length >= 7) {
      const recent = checkIns.slice(0, 14);
      const highStressEntries = recent.filter((c) => c.stress >= 4);
      const highCravingAfterStress = highStressEntries.filter((c) => c.cravings >= 4);
      if (highCravingAfterStress.length > 2) {
        insights.push({ id: "i_stress_cravings", title: "Stress drives your cravings", description: `On ${highCravingAfterStress.length} of your recent high-stress days, cravings also spiked. Cortisol directly elevates blood sugar, triggering carb cravings — a core PCOS cycle to break.`, type: "correlation" });
      }

      const lowEnergyEntries = recent.filter((c) => c.energy <= 2);
      const bloatingWithLowEnergy = lowEnergyEntries.filter((c) => c.bloating >= 3);
      if (bloatingWithLowEnergy.length > 2) {
        insights.push({ id: "i_energy_bloating", title: "Bloating dampens your energy", description: `Low energy and bloating appeared together ${bloatingWithLowEnergy.length} times recently. Gut inflammation is a known energy drain — an anti-inflammatory food focus may help.`, type: "correlation" });
      }

      const weekdays = recent.reduce<Record<number, number[]>>((acc, c) => {
        const day = new Date(c.date + "T00:00:00").getDay();
        acc[day] = acc[day] ?? [];
        acc[day].push(c.mood);
        return acc;
      }, {});
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      let worstDay = -1;
      let worstAvg = 5;
      for (const [day, moods] of Object.entries(weekdays)) {
        const avg = moods.reduce((a, b) => a + b, 0) / moods.length;
        if (avg < worstAvg && moods.length >= 2) { worstAvg = avg; worstDay = Number(day); }
      }
      if (worstDay >= 0 && worstAvg < 3) {
        insights.push({ id: "i_mood_day", title: `${dayNames[worstDay]}s tend to be harder`, description: `Your mood consistently dips on ${dayNames[worstDay]}s. Planning lighter commitments and extra self-care on this day could meaningfully change your week.`, type: "pattern" });
      }
    }

    if (checkIns.length >= 3) {
      const recent3 = checkIns.slice(0, 3);
      const avgAcne = recent3.reduce((a, c) => a + c.acne, 0) / 3;
      if (avgAcne >= 3.5) {
        insights.push({ id: "i_acne", title: "Acne tracking active", description: "You've been experiencing elevated acne. This often corresponds to androgen spikes in PCOS. Tracking what precedes breakouts can reveal food, sleep, or stress triggers.", type: "pattern" });
      }
    }

    if (checkIns.length >= 30) {
      insights.push({ id: "i_30days", title: "30 days of data", description: "You now have a full month of symptom data. This is enough for a meaningful summary to bring to your next doctor's appointment.", type: "milestone" });
    }

    if (insights.length === 0) {
      insights.push({ id: "i_early", title: "Keep logging to see patterns", description: "Insights appear after 7 days of check-ins. The patterns Elara surfaces are based on your unique symptom history — not generic PCOS data.", type: "pattern" });
    }

    return insights;
  }, [checkIns, getStreak]);

  return (
    <AppContext.Provider value={{ checkIns, settings, isLoading, addCheckIn, updateSettings, getTodayCheckIn, getStreak, getCycleDay, getCyclePhase, getTodayGuidance, getInsights }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
