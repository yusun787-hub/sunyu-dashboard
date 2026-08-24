import React, { CSSProperties, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  dailyBookRecommendations,
  defaultBookNotes,
  defaultDiaries,
  defaultFocusEntries,
  defaultFocusLogs,
  defaultFocusNotebook,
  defaultLifeDailyTasks,
  defaultLifeHabits,
  defaultProjects,
  defaultStockNotes,
  defaultWorkDailyTasks,
  defaultWorkHabits,
  defaultWorkouts,
  quoteCards,
  vintageIllustrationUrls,
} from './data';
import { useLocalStorage } from './hooks';
import { createCustomMoodOption, createMorandiMoodOption, getMorandiHueWheelGradient, normalizeMoodOptions, resolveMoodHue, updateMoodHue } from './mood';
import { fetchDanxiangliCard, fetchMarketIndices, fetchYangpuWeather, weatherIcon, weatherText, windLevel } from './services';
import type {
  BookNote,
  DailyTask,
  DanxiangliCard,
  Diary,
  FocusEntry,
  FocusLog,
  FocusNotebook,
  Habit,
  MarketIndex,
  MoodKey,
  MoodOption,
  Project,
  ProjectStep,
  StockNote,
  WeatherDay,
  Workout,
} from './types';

const defaultMoodOptions: MoodOption[] = [
  createMorandiMoodOption({ id: 'bright', label: '元气满满', emoji: '🌞', hint: '适合进攻型任务，把最难的事放到上午。', hue: 38 }),
  createMorandiMoodOption({ id: 'focused', label: '专注稳定', emoji: '🧭', hint: '进入深度工作，减少切换。', hue: 238 }),
  createMorandiMoodOption({ id: 'calm', label: '平静温和', emoji: '🌿', hint: '稳稳推进，给自己留呼吸空间。', hue: 170 }),
  createMorandiMoodOption({ id: 'warm', label: '柔软治愈', emoji: '☕', hint: '适合整理、复盘和照顾生活秩序。', hue: 345 }),
  createMorandiMoodOption({ id: 'tired', label: '有点疲惫', emoji: '🌙', hint: '降低颗粒度，只完成最关键的一步。', hue: 232 }),
];

function getMoodPageStyle(mood: MoodOption): CSSProperties {
  return {
    '--accent': mood.accent,
    '--accent-strong': mood.accentStrong,
    background: mood.background,
  } as CSSProperties;
}

const quotePalettes = [
  { overlay: 'from-slate-950/72 via-slate-900/62 to-slate-800/60', inkClass: 'text-white', mutedClass: 'text-white/72', borderClass: 'border-white/25', actionClass: 'bg-white/12 text-white hover:bg-white/20', hueRotate: 0 },
  { overlay: 'from-white/54 via-white/36 to-slate-100/28', inkClass: 'text-slate-900', mutedClass: 'text-slate-600', borderClass: 'border-slate-200/80', actionClass: 'bg-slate-950/6 text-slate-700 hover:bg-slate-950/10', hueRotate: 0 },
];

const quoteImageIsDark = [true, true, true, false];

type ViewerKey = 'workBoard' | 'lifeBoard' | 'focus' | 'diaries' | 'workouts' | 'bookNotes' | 'stockNotes' | null;
type CardVisual = (typeof quotePalettes)[number];
type QuoteBundle = {
  backgroundUrl: string;
  date: string;
  dayLabel: string;
  imageIsDark: boolean;
  isFallback?: boolean;
  lunarLabel: string;
  monthLabel: string;
  palette: CardVisual;
  quoteText: string;
  recommendation: string;
  taboo: string;
  sourceMeta: string;
  sourceTitle: string;
};

type WorkoutSummary = {
  activeDays: number;
  totalSessions: number;
  totalMinutes: number;
  todayWeight?: number;
  goalWeight: number;
  distance: number;
  dayGroups: Array<{ date: string; minutes: number; count: number; label: string }>;
  weeklyBars: Array<{ label: string; value: number }>;
  weightBars: Array<{ label: string; value: number }>;
};

const MAX_CARD_RECORDS = 10;
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const today = () => formatDateKey(new Date());
const WEREAD_URL = 'https://weread.qq.com/';

export default function App() {
  const currentDate = useMemo(() => today(), []);
  const [moodOptions, setMoodOptions] = useLocalStorage<MoodOption[]>('sunyu-dashboard-mood-options', defaultMoodOptions);
  const [mood, setMood] = useLocalStorage<MoodKey>('sunyu-dashboard-mood', defaultMoodOptions[1].id);
  const [moodNote, setMoodNote] = useLocalStorage<string>('sunyu-dashboard-mood-note', '');
  const [todayStatusText, setTodayStatusText] = useLocalStorage<string>('sunyu-dashboard-today-status-text', '');
  const [moodModalOpen, setMoodModalOpen] = useState(true);

  const [workHabits, setWorkHabits] = useLocalStorage<Habit[]>('sunyu-work-habits', defaultWorkHabits);
  const [lifeHabits, setLifeHabits] = useLocalStorage<Habit[]>('sunyu-life-habits', defaultLifeHabits);
  const [workDailyTasks, setWorkDailyTasks] = useLocalStorage<DailyTask[]>('sunyu-work-daily-tasks', defaultWorkDailyTasks);
  const [lifeDailyTasks, setLifeDailyTasks] = useLocalStorage<DailyTask[]>('sunyu-life-daily-tasks', defaultLifeDailyTasks);
  const [rawProjects, setRawProjects] = useLocalStorage<Project[]>('sunyu-projects', defaultProjects);
  const [focusLogs, setFocusLogs] = useLocalStorage<FocusLog[]>('sunyu-focus-logs', defaultFocusLogs);
  const [focusNotebook, setFocusNotebook] = useLocalStorage<FocusNotebook>('sunyu-focus-notebook', defaultFocusNotebook);
  const [focusEntries, setFocusEntries] = useLocalStorage<FocusEntry[]>('sunyu-focus-entries', defaultFocusEntries);
  const [diaries, setDiaries] = useLocalStorage<Diary[]>('sunyu-diaries', defaultDiaries);
  const [workouts, setWorkouts] = useLocalStorage<Workout[]>('sunyu-workouts', defaultWorkouts);
  const [goalWeight, setGoalWeight] = useLocalStorage<number>('sunyu-goal-weight', 52);
  const [bookNotes, setBookNotes] = useLocalStorage<BookNote[]>('sunyu-book-notes', defaultBookNotes);
  const [stockNotes, setStockNotes] = useLocalStorage<StockNote[]>('sunyu-stock-notes', defaultStockNotes);

  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [weatherError, setWeatherError] = useState('');
  const [marketError, setMarketError] = useState('');
  const [marketRefreshing, setMarketRefreshing] = useState(false);
  const [marketUpdatedToastVisible, setMarketUpdatedToastVisible] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [viewer, setViewer] = useState<ViewerKey>(null);
  const [quoteOffset, setQuoteOffset] = useState(0);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [dailyQuoteCard, setDailyQuoteCard] = useState<DanxiangliCard | null>(null);
  const [dailyQuoteError, setDailyQuoteError] = useState('');
  const [dailyQuoteLoading, setDailyQuoteLoading] = useState(true);

  const availableMoodOptions = useMemo(() => {
    const source = moodOptions.length ? moodOptions : defaultMoodOptions;
    return normalizeMoodOptions(source);
  }, [moodOptions]);
  const activeMood = useMemo(() => availableMoodOptions.find((item) => item.id === mood) || availableMoodOptions[0], [availableMoodOptions, mood]);
  const projects = useMemo(() => rawProjects.map((project) => normalizeProject(project)), [rawProjects]);
  const workTodayTasks = useMemo(() => workDailyTasks.filter((item) => item.date === currentDate), [workDailyTasks, currentDate]);
  const lifeTodayTasks = useMemo(() => lifeDailyTasks.filter((item) => item.date === currentDate), [lifeDailyTasks, currentDate]);
  const quoteDate = useMemo(() => shiftDate(currentDate, quoteOffset), [currentDate, quoteOffset]);
  const fallbackQuoteBundle = useMemo(() => getFallbackQuoteBundle(quoteDate), [quoteDate]);
  const quoteBundle = useMemo(() => buildQuoteBundle(quoteDate, dailyQuoteCard) ?? fallbackQuoteBundle, [dailyQuoteCard, fallbackQuoteBundle, quoteDate]);
  const quoteVisual = quoteBundle.palette;
  const completion = useMemo(() => getCompletionRate(workHabits, workTodayTasks, currentDate), [workHabits, workTodayTasks, currentDate]);
  const totalFocus = useMemo(() => focusLogs.filter((item) => item.date === currentDate).reduce((sum, item) => sum + Number(item.minutes || 0), 0), [focusLogs, currentDate]);
  const workoutSummary = useMemo(() => getWorkoutSummary(workouts, currentDate, goalWeight), [workouts, currentDate, goalWeight]);
  const dailyBookPick = useMemo(() => getDailyBookPick(currentDate), [currentDate]);
  const activeProject = projects.find((item) => item.id === activeProjectId) || null;

  const recordFocusLog = useCallback((minutes = 25) => {
    const topic = focusNotebook.currentTopic.trim() || '番茄钟专注';
    setFocusLogs((current) => {
      const latest = current[0];
      if (latest && latest.title === topic && latest.date === currentDate) {
        return current.map((item, index) => (index === 0 ? { ...item, minutes: item.minutes + minutes } : item));
      }
      return [{ id: uid(), title: topic, minutes, date: currentDate }, ...current];
    });
  }, [currentDate, focusNotebook.currentTopic, setFocusLogs]);

  const updateMoodColor = (optionId: string, hue: number) => {
    setMoodOptions((current) => current.map((item) => (item.id === optionId ? updateMoodHue(item, hue) : item)));
  };

  const deleteMoodOption = (optionId: string) => {
    setMoodOptions((current) => {
      if (current.length <= 1) return current;
      return current.filter((item) => item.id !== optionId);
    });
  };

  const refreshMarket = useCallback((showToast = false) => {
    setMarketError('');
    if (showToast) setMarketUpdatedToastVisible(false);
    setMarketRefreshing(true);
    fetchMarketIndices()
      .then((data) => {
        setIndices(data);
        if (showToast) setMarketUpdatedToastVisible(true);
      })
      .catch((err) => setMarketError((err as Error).message))
      .finally(() => setMarketRefreshing(false));
  }, []);

  useEffect(() => {
    fetchYangpuWeather().then(setWeather).catch((err) => setWeatherError((err as Error).message));
    refreshMarket();
  }, [refreshMarket]);

  useEffect(() => {
    if (!marketUpdatedToastVisible) return undefined;
    const timer = window.setTimeout(() => setMarketUpdatedToastVisible(false), 1600);
    return () => window.clearTimeout(timer);
  }, [marketUpdatedToastVisible]);

  useEffect(() => {
    let cancelled = false;
    setDailyQuoteLoading(true);
    setDailyQuoteError('');
    fetchDanxiangliCard(quoteDate)
      .then((card) => {
        if (cancelled) return;
        setDailyQuoteCard(card);
      })
      .catch((err) => {
        if (cancelled) return;
        setDailyQuoteCard(null);
        setDailyQuoteError((err as Error).message || '单向历同步失败');
      })
      .finally(() => {
        if (!cancelled) setDailyQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [quoteDate]);

  useEffect(() => {
    if (!moodOptions.length) return;
    const normalized = normalizeMoodOptions(moodOptions);
    if (JSON.stringify(normalized) !== JSON.stringify(moodOptions)) {
      setMoodOptions(normalized);
    }
  }, [moodOptions, setMoodOptions]);

  useEffect(() => {
    if (!availableMoodOptions.some((item) => item.id === mood)) {
      setMood(availableMoodOptions[0].id);
    }
  }, [availableMoodOptions, mood, setMood]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => setTimerSeconds((current) => Math.max(current - 1, 0)), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    if (timerSeconds !== 0 || !timerRunning) return;
    setTimerRunning(false);
    recordFocusLog(25);
  }, [recordFocusLog, timerRunning, timerSeconds]);

  useEffect(() => {
    const topic = focusNotebook.currentTopic.trim();
    if (!topic) return;
    setFocusEntries((current) => {
      if (!current.length) {
        return [{ id: uid(), topic, leftPage: focusNotebook.leftPage, rightPage: focusNotebook.rightPage, date: currentDate }];
      }
      const latest = current[0];
      if (latest.topic === topic) {
        return current.map((entry, index) => (index === 0 ? { ...entry, leftPage: focusNotebook.leftPage, rightPage: focusNotebook.rightPage, date: currentDate } : entry));
      }
      return [{ id: uid(), topic, leftPage: focusNotebook.leftPage, rightPage: focusNotebook.rightPage, date: currentDate }, ...current];
    });
  }, [focusNotebook, currentDate, setFocusEntries]);

  const viewerMeta = getViewerMeta(viewer, {
    currentDate,
    workHabits,
    lifeHabits,
    workDailyTasks,
    lifeDailyTasks,
    focusLogs,
    focusNotebook,
    focusEntries,
    diaries,
    workouts,
    setWorkouts,
    bookNotes,
    stockNotes,
  });

  const updateProjects = (updater: (items: Project[]) => Project[]) => {
    setRawProjects((current) => updater(current.map((item) => normalizeProject(item))));
  };

  const updateProjectSteps = (projectId: string, updater: (steps: ProjectStep[]) => ProjectStep[]) => {
    updateProjects((items) =>
      items.map((item) => {
        if (item.id !== projectId) return item;
        const nextSteps = updater(item.steps || []);
        return applyProjectStepMeta({ ...item, steps: nextSteps });
      }),
    );
  };

  const selectMood = (key: MoodKey, note: string) => {
    setMood(key);
    setMoodNote(note.trim());
    setMoodModalOpen(false);
  };

  const appendMood = (option: MoodOption) => {
    setMoodOptions((current) => [...current, option]);
  };

  return (
    <main className="zh-ui min-h-screen" style={getMoodPageStyle(activeMood)}>
      {marketUpdatedToastVisible ? <div className="fixed right-6 top-6 z-40 rounded-full bg-slate-950/88 px-4 py-2 text-sm text-white shadow-lg shadow-slate-900/20">已更新</div> : null}
      {moodModalOpen ? (
        <MoodModal
          moodOptions={availableMoodOptions}
          defaultMood={mood}
          defaultNote={moodNote}
          onConfirm={selectMood}
          onAddMood={appendMood}
          onUpdateMoodColor={updateMoodColor}
          onDeleteMood={deleteMoodOption}
        />
      ) : null}
      {viewerMeta ? <BookViewerModal title={viewerMeta.title} visual={quoteVisual} backgroundUrl={quoteBundle.backgroundUrl} onClose={() => setViewer(null)}>{viewerMeta.content}</BookViewerModal> : null}
      {activeProject ? (
        <ProjectStepsModal
          project={activeProject}
          visual={quoteVisual}
          backgroundUrl={quoteBundle.backgroundUrl}
          onClose={() => setActiveProjectId(null)}
          onToggle={(stepId) => updateProjectSteps(activeProject.id, (steps) => steps.map((step) => (step.id === stepId ? { ...step, done: !step.done } : step)))}
          onDelete={(stepId) => updateProjectSteps(activeProject.id, (steps) => steps.filter((step) => step.id !== stepId))}
          onAdd={(title) => updateProjectSteps(activeProject.id, (steps) => [...steps, { id: uid(), title, done: false }])}
          onMove={(stepId, direction) => updateProjectSteps(activeProject.id, (steps) => {
            const index = steps.findIndex((step) => step.id === stepId);
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (index < 0 || targetIndex < 0 || targetIndex >= steps.length) return steps;
            const next = [...steps];
            [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
            return next;
          })}
        />
      ) : null}

      <div className="mx-auto max-w-[1500px] px-5 py-6 lg:px-8">
        <Hero
          mood={activeMood}
          statusText={todayStatusText || activeMood.label}
          onSaveStatus={setTodayStatusText}
          quoteBundle={quoteBundle}
          quoteOffset={quoteOffset}
          setQuoteOffset={setQuoteOffset}
          quoteLoading={dailyQuoteLoading}
          quoteError={dailyQuoteError}
          completion={completion}
          totalFocus={totalFocus}
          weather={weather}
          weatherError={weatherError}
        />

        <section className="grid items-stretch gap-5 xl:grid-cols-[1.1fr_1fr]">
          <Card title="今日待办" eyebrow="WORK" action="查看过往" onAction={() => setViewer('workBoard')}>
            <TodoBoard area="work" habits={workHabits} setHabits={setWorkHabits} todayTasks={workTodayTasks} allTasks={workDailyTasks} setAllTasks={setWorkDailyTasks} currentDate={currentDate} />
          </Card>
          <Card title="项目进展" eyebrow="PROJECTS" action="点击查看步骤" onAction={() => setActiveProjectId(projects[0]?.id || null)}>
            <ProjectPanel projects={projects} setProjects={updateProjects} onOpen={setActiveProjectId} />
          </Card>
        </section>

        <section className="mt-5 grid items-stretch gap-5">
          <Card title="专注本" eyebrow="FOCUS NOTEBOOK" action="查看展开" onAction={() => setViewer('focus')}>
            <FocusNotebookPanel book={focusNotebook} setBook={setFocusNotebook} logs={focusLogs} setLogs={setFocusLogs} seconds={timerSeconds} setSeconds={setTimerSeconds} running={timerRunning} setRunning={setTimerRunning} visual={quoteVisual} backgroundUrl={quoteBundle.backgroundUrl} onRecord={recordFocusLog} />
          </Card>
        </section>

        <section className="mt-5 grid items-stretch gap-5 xl:grid-cols-[1fr_1fr]">
          <Card title="生活待办区" eyebrow="LIFE" action="查看过往" onAction={() => setViewer('lifeBoard')}>
            <TodoBoard area="life" habits={lifeHabits} setHabits={setLifeHabits} todayTasks={lifeTodayTasks} allTasks={lifeDailyTasks} setAllTasks={setLifeDailyTasks} currentDate={currentDate} />
          </Card>
          <Card title="运动记录区" eyebrow="HEALTH" action="点击查看" onAction={() => setViewer('workouts')}>
            <WorkoutPanel workouts={workouts} setWorkouts={setWorkouts} summary={workoutSummary} goalWeight={goalWeight} setGoalWeight={setGoalWeight} currentDate={currentDate} />
          </Card>
        </section>

        <section className="mt-5 grid items-stretch gap-5 xl:grid-cols-[1fr_1fr]">
          <Card title="成功日记本" eyebrow="WIN LOG" action="给努力留证据 · 点击查看" onAction={() => setViewer('diaries')}>
            <DiaryPanel diaries={diaries} setDiaries={setDiaries} currentDate={currentDate} />
          </Card>
          <Card title="读书笔记区" eyebrow="READING" action="查看历史" onAction={() => setViewer('bookNotes')}>
            <BookPanel notes={bookNotes} setNotes={setBookNotes} currentDate={currentDate} recommendation={dailyBookPick} />
          </Card>
        </section>

        <section className="mt-5 grid items-stretch gap-5 xl:grid-cols-[1fr_1fr]">
          <Card title="今日股市指数" eyebrow="MARKET" action={<button type="button" disabled={marketRefreshing} onClick={() => refreshMarket(true)} aria-label="刷新行情" className={`grid h-8 w-8 place-items-center rounded-full bg-white/85 text-sm text-[var(--accent-strong)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-wait disabled:opacity-80 ${marketRefreshing ? 'animate-spin' : ''}`}>↻</button>}>
            <MarketPanel indices={indices} error={marketError} />
          </Card>
          <Card title="炒股日记" eyebrow="INVEST" action="点击查看" onAction={() => setViewer('stockNotes')}>
            <StockDiaryPanel notes={stockNotes} setNotes={setStockNotes} currentDate={currentDate} />
          </Card>
        </section>
      </div>
    </main>
  );
}

function normalizeProject(project: Project): Project {
  const rawSteps = Array.isArray(project.steps) ? project.steps.filter((item) => item && typeof item.title === 'string') : [];
  const steps = rawSteps.length ? rawSteps : [{ id: `${project.id}-step-1`, title: project.next || '填写第一步', done: false }];
  return applyProjectStepMeta({ ...project, steps });
}

function applyProjectStepMeta(project: Project): Project {
  const steps = project.steps || [];
  const nextStep = steps.find((item) => !item.done)?.title || '已完成';
  const progress = steps.length ? Math.round((steps.filter((item) => item.done).length / steps.length) * 100) : project.progress;
  return { ...project, steps, progress, next: nextStep };
}

function getCompletionRate(habits: Habit[], tasks: DailyTask[], currentDate: string) {
  const total = habits.length + tasks.length;
  if (!total) return 0;
  const done = habits.filter((item) => item.completedDates.includes(currentDate)).length + tasks.filter((item) => item.done).length;
  return Math.round((done / total) * 100);
}

function getWorkoutSummary(workouts: Workout[], currentDate: string, goalWeight: number): WorkoutSummary {
  const motionEntries = workouts.filter((item) => item.type !== '体重记录');
  const groupsMap = motionEntries.reduce<Record<string, { date: string; minutes: number; count: number }>>((acc, item) => {
    const current = acc[item.date] || { date: item.date, minutes: 0, count: 0 };
    acc[item.date] = { date: item.date, minutes: current.minutes + item.minutes, count: current.count + 1 };
    return acc;
  }, {});
  const dayGroups = Object.values(groupsMap).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).map((item) => ({ ...item, label: formatShortDate(item.date) }));
  const lastSevenDates = Array.from({ length: 7 }, (_, index) => shiftDate(currentDate, -(6 - index)));
  const weeklyBars = lastSevenDates.map((date) => ({ label: formatShortDate(date), value: groupsMap[date]?.minutes || 0 }));
  const latestWeightByDate = workouts.reduce<Record<string, number>>((acc, item) => {
    if (typeof item.weight === 'number') {
      acc[item.date] = Number(item.weight || 0);
    }
    return acc;
  }, {});
  const weightBars = Object.entries(latestWeightByDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7)
    .map(([date, value]) => ({ label: formatShortDate(date), value }));
  const sortedWeightDates = Object.keys(latestWeightByDate).sort((a, b) => a.localeCompare(b));
  const latestWeight = sortedWeightDates.length ? latestWeightByDate[sortedWeightDates[sortedWeightDates.length - 1]] : undefined;
  const todayWeight = latestWeightByDate[currentDate] ?? latestWeight;
  return {
    activeDays: new Set(motionEntries.map((item) => item.date)).size,
    totalSessions: motionEntries.length,
    totalMinutes: motionEntries.reduce((sum, item) => sum + item.minutes, 0),
    todayWeight,
    goalWeight,
    distance: todayWeight ? Math.max(0, Number((todayWeight - goalWeight).toFixed(1))) : 0,
    dayGroups,
    weeklyBars,
    weightBars,
  };
}

function getQuoteBackground(date: string) {
  const artworkIndex = hashDate(date) % vintageIllustrationUrls.length;
  const imageIsDark = quoteImageIsDark[artworkIndex] ?? false;
  return {
    backgroundUrl: vintageIllustrationUrls[artworkIndex],
    imageIsDark,
    palette: quotePalettes[imageIsDark ? 0 : 1],
  };
}

function getFallbackQuoteBundle(date: string): QuoteBundle {
  const index = hashDate(date);
  const fallbackQuote = quoteCards[index % quoteCards.length];
  const background = getQuoteBackground(date);
  return {
    backgroundUrl: background.backgroundUrl,
    date,
    dayLabel: date.slice(-2).replace(/^0/, '') || date.slice(-2),
    imageIsDark: background.imageIsDark,
    isFallback: true,
    lunarLabel: '农历信息同步中',
    monthLabel: `${Number(date.slice(5, 7))}月`,
    palette: background.palette,
    quoteText: fallbackQuote.text,
    recommendation: '宜认真生活',
    taboo: '',
    sourceMeta: fallbackQuote.author,
    sourceTitle: fallbackQuote.title,
  };
}

function buildQuoteBundle(date: string, card: DanxiangliCard | null): QuoteBundle | null {
  if (!card || card.date !== date) return null;
  const background = getQuoteBackground(date);
  return {
    backgroundUrl: background.backgroundUrl,
    date,
    dayLabel: card.day_label,
    imageIsDark: background.imageIsDark,
    lunarLabel: card.lunar_label,
    monthLabel: card.month_label,
    palette: background.palette,
    quoteText: card.quote,
    recommendation: card.recommendation,
    taboo: card.taboo,
    sourceMeta: card.source_meta,
    sourceTitle: card.source_title,
  };
}

function getDailyBookPick(date: string) {
  return dailyBookRecommendations[hashDate(date) % dailyBookRecommendations.length];
}

function hashDate(date: string) {
  return date.replaceAll('-', '').split('').reduce((sum, current) => sum + Number(current), 0);
}

function shiftDate(base: string, diff: number) {
  const date = new Date(`${base}T00:00:00`);
  date.setDate(date.getDate() + diff);
  return formatDateKey(date);
}

function formatDateLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' });
}

function formatShortDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function uniqueDates(dates: string[]) {
  return Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
}

function getViewerMeta(
  viewer: ViewerKey,
  data: {
    currentDate: string;
    workHabits: Habit[];
    lifeHabits: Habit[];
    workDailyTasks: DailyTask[];
    lifeDailyTasks: DailyTask[];
    focusLogs: FocusLog[];
    focusNotebook: FocusNotebook;
    focusEntries: FocusEntry[];
    diaries: Diary[];
    workouts: Workout[];
    setWorkouts: React.Dispatch<React.SetStateAction<Workout[]>>;
    bookNotes: BookNote[];
    stockNotes: StockNote[];
  },
) {
  switch (viewer) {
    case 'workBoard':
      return { title: '今日待办 · 过往 list', content: <TodoHistoryViewer areaLabel="工作" habits={data.workHabits} tasks={data.workDailyTasks} currentDate={data.currentDate} /> };
    case 'lifeBoard':
      return { title: '生活待办区 · 过往 list', content: <TodoHistoryViewer areaLabel="生活" habits={data.lifeHabits} tasks={data.lifeDailyTasks} currentDate={data.currentDate} /> };
    case 'focus':
      return { title: '专注本 · 历史记录', content: <FocusViewer book={data.focusNotebook} logs={data.focusLogs} entries={data.focusEntries} /> };
    case 'diaries':
      return { title: '成功日记本 · 全部记录', content: <div className="space-y-3">{data.diaries.map((item) => <ViewerItem key={item.id} title={item.title} meta={formatDateLabel(item.date)} body={item.content} />)}</div> };
    case 'workouts':
      return { title: '运动记录区 · 全部记录', content: <WorkoutHistoryViewer workouts={data.workouts} setWorkouts={data.setWorkouts} /> };
    case 'bookNotes':
      return { title: '读书笔记区 · 历史记录', content: <div className="space-y-3">{data.bookNotes.map((item) => <ViewerItem key={item.id} title={item.book} meta={formatDateLabel(item.date)} body={item.note} extra={<a href={item.link || WEREAD_URL} target="_blank" rel="noreferrer" className="text-sm text-[var(--accent-strong)]">打开微信读书</a>} />)}</div> };
    case 'stockNotes':
      return { title: '炒股日记 · 全部记录', content: <div className="space-y-3">{data.stockNotes.map((item) => <ViewerItem key={item.id} title={item.symbol} meta={`${formatDateLabel(item.date)} · ${item.action}`} body={item.thought} />)}</div> };
    default:
      return null;
  }
}

function Hero({ mood, statusText, onSaveStatus, quoteBundle, quoteOffset, setQuoteOffset, quoteLoading, quoteError, completion, totalFocus, weather, weatherError }: { mood: MoodOption; statusText: string; onSaveStatus: (value: string) => void; quoteBundle: QuoteBundle; quoteOffset: number; setQuoteOffset: React.Dispatch<React.SetStateAction<number>>; quoteLoading: boolean; quoteError: string; completion: number; totalFocus: number; weather: WeatherDay[]; weatherError: string }) {
  const [editingStatus, setEditingStatus] = useState(false);
  const [draftStatus, setDraftStatus] = useState(statusText);

  useEffect(() => {
    setDraftStatus(statusText);
  }, [statusText]);

  const saveStatus = () => {
    const next = draftStatus.trim() || mood.label;
    onSaveStatus(next);
    setDraftStatus(next);
    setEditingStatus(false);
  };

  return (
    <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-white/55 bg-white/55 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl lg:p-8">
      <div className="absolute right-8 top-8 h-40 w-40 rounded-full bg-[var(--accent)] opacity-20 blur-3xl" />
      <div className="relative">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            {editingStatus ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-white/88 px-4 py-2 shadow-sm">
                <span className="text-sm text-slate-500">{mood.emoji}</span>
                <input value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)} onBlur={saveStatus} onKeyDown={(event) => { if (event.key === 'Enter') saveStatus(); if (event.key === 'Escape') { setDraftStatus(statusText); setEditingStatus(false); } }} autoFocus className="min-w-[12rem] bg-transparent text-sm text-slate-700 outline-none" />
              </div>
            ) : (
              <button type="button" onClick={() => setEditingStatus(true)} className="inline-flex rounded-full bg-white/75 px-4 py-2 text-sm text-slate-600 shadow-sm transition hover:bg-white">{mood.emoji} 今日状态：{statusText}</button>
            )}
            <h1 className="mood-script mt-4 text-[52px] leading-[0.95] text-[var(--accent-strong)] lg:text-[78px]">Sunyu&apos;s Work & Life Dashboard</h1>
          </div>
          <p className="max-w-md text-sm leading-7 text-slate-500">{mood.hint}</p>
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.55fr_0.95fr] xl:items-stretch">
          <QuoteCalendarCard quoteBundle={quoteBundle} quoteOffset={quoteOffset} setQuoteOffset={setQuoteOffset} loading={quoteLoading} error={quoteError} />
          <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="今日待办完成" value={`${completion}%`} />
              <Metric label="累计专注" value={`${totalFocus} min`} />
            </div>
            <WeatherPreviewCard weather={weather} error={weatherError} />
          </div>
        </div>
      </div>
    </section>
  );
}

function QuoteCalendarCard({ quoteBundle, quoteOffset, setQuoteOffset, loading, error }: { quoteBundle: QuoteBundle; quoteOffset: number; setQuoteOffset: React.Dispatch<React.SetStateAction<number>>; loading: boolean; error: string }) {
  const isToday = quoteOffset === 0;
  return (
    <div className={`relative h-full overflow-hidden rounded-[2rem] border ${quoteBundle.palette.borderClass} shadow-xl`}>
      <img src={quoteBundle.backgroundUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(15,23,42,0.05))]" />
      <div className={`absolute inset-0 bg-gradient-to-br ${quoteBundle.palette.overlay} opacity-30`} />
      <div className="absolute left-6 top-4 flex gap-2"><span className="h-3 w-3 rounded-full bg-white/60" /><span className="h-3 w-3 rounded-full bg-white/60" /><span className="h-3 w-3 rounded-full bg-white/60" /></div>
      <div className="relative flex h-full flex-col p-6 pb-20 lg:p-7 lg:pb-20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-xs uppercase tracking-[0.24em] ${quoteBundle.palette.mutedClass}`}>OWSPACE DAILY</p>
            <div className={`mt-4 flex items-end gap-4 ${quoteBundle.palette.inkClass}`}>
              <div>
                <p className="text-sm tracking-[0.22em]">{quoteBundle.monthLabel}</p>
                <p className="mt-2 text-6xl leading-none">{quoteBundle.dayLabel}</p>
              </div>
              <div className="space-y-1 pb-1">
                <p className="text-sm">{quoteBundle.recommendation || '宜认真生活'}</p>
                {quoteBundle.taboo ? <p className={`text-sm ${quoteBundle.palette.mutedClass}`}>{quoteBundle.taboo}</p> : null}
                <p className={`text-sm ${quoteBundle.palette.mutedClass}`}>{quoteBundle.lunarLabel}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {loading ? <span className={`rounded-full border px-3 py-1 text-xs ${quoteBundle.palette.borderClass} ${quoteBundle.palette.mutedClass}`}>正在同步单向历…</span> : null}
          {error ? <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs text-white/80">同步失败，当前展示备用排版</span> : null}
        </div>
        <div className="mt-5 flex flex-1 flex-col justify-between rounded-[1.8rem] border border-white/12 bg-white/10 px-6 py-6 backdrop-blur-sm">
          <p className={`text-[1.95rem] leading-[1.6] lg:text-[2.35rem] ${quoteBundle.palette.inkClass}`}>“{quoteBundle.quoteText}”</p>
          <div className={`mt-5 border-t border-white/12 pt-4 ${quoteBundle.palette.inkClass}`}>
            <p className="text-base">{quoteBundle.sourceTitle}</p>
            {quoteBundle.sourceMeta ? <p className={`mt-2 text-sm ${quoteBundle.palette.mutedClass}`}>{quoteBundle.sourceMeta}</p> : null}
          </div>
        </div>
      </div>
      <div className="absolute inset-x-6 bottom-5 flex items-center justify-end gap-2 lg:inset-x-7">
        <button type="button" onClick={() => setQuoteOffset((current) => current - 1)} aria-label="前一天" className={`grid h-9 w-9 place-items-center rounded-full border border-white/30 bg-white/12 text-lg backdrop-blur-sm transition hover:bg-white/20 ${quoteBundle.palette.inkClass}`}>
          ‹
        </button>
        <button type="button" onClick={() => setQuoteOffset((current) => current + 1)} aria-label="后一天" className={`grid h-9 w-9 place-items-center rounded-full border border-white/30 bg-white/12 text-lg backdrop-blur-sm transition hover:bg-white/20 ${quoteBundle.palette.inkClass}`}>
          ›
        </button>
        {!isToday ? (
          <button type="button" onClick={() => setQuoteOffset(0)} className={`rounded-full border border-white/30 bg-white/12 px-3 py-2 text-xs backdrop-blur-sm transition hover:bg-white/20 ${quoteBundle.palette.inkClass}`}>
            回到今天
          </button>
        ) : null}
      </div>
    </div>
  );
}

function WeatherPreviewCard({ weather, error }: { weather: WeatherDay[]; error: string }) {
  const previewWeather = weather.slice(0, 3);
  const overflowWeather = weather.slice(3);
  return (
    <div className="flex h-full min-h-0 flex-col rounded-3xl bg-white/65 p-4 shadow-sm" style={{ border: '1px solid color-mix(in oklab, var(--accent) 24%, white)' }}>
      <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
        <p>上海 · 杨浦区</p>
        <h3 className="text-base text-slate-950">未来 7 天天气</h3>
      </div>
      {error ? (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</p>
      ) : (
        <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
          {previewWeather.length ? (
            <div className="space-y-3">
              {previewWeather.map((day) => <WeatherDayCard key={day.date} day={day} />)}
            </div>
          ) : (
            <EmptyState text="天气信息同步中…" />
          )}
          {overflowWeather.length ? (
            <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="space-y-3">
                {overflowWeather.map((day) => <WeatherDayCard key={day.date} day={day} />)}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function WeatherDayCard({ day }: { day: WeatherDay }) {
  return (
    <div className="rounded-2xl bg-slate-950/[0.04] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">{weatherIcon(day.code)}</span>
          <div>
            <p className="text-sm text-slate-900">{formatDateLabel(day.date)}</p>
            <p className="text-xs text-slate-500">{weatherText(day.code)}</p>
          </div>
        </div>
        <p className="text-sm text-slate-800">{day.min}° / {day.max}°</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
        <span className="rounded-full bg-white px-2 py-1">风力 {windLevel(day.windSpeed)}</span>
        <span className="rounded-full bg-white px-2 py-1">风速 {day.windSpeed} km/h</span>
        <span className="rounded-full bg-white px-2 py-1">降雨 {day.precipitation}%</span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-3xl bg-white/65 px-4 py-3 shadow-sm" style={{ border: '1px solid color-mix(in oklab, var(--accent) 26%, white)' }}><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl text-slate-950">{value}</p></div>;
}

function Card({ title, eyebrow, action, onAction, children }: { title: string; eyebrow: string; action?: React.ReactNode; onAction?: () => void; children: React.ReactNode }) {
  return <section className="flex h-full min-h-0 flex-col rounded-[1.75rem] bg-white/70 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl" style={{ border: '1px solid color-mix(in oklab, var(--accent) 22%, white)' }}><div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs tracking-[0.25em] text-[var(--accent-strong)]">{eyebrow}</p><h2 className="mt-1 text-2xl text-slate-950">{title}</h2></div>{typeof action === 'string' ? (onAction ? <button type="button" onClick={onAction} className="rounded-full bg-white/85 px-3 py-1 text-xs text-[var(--accent-strong)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white">{action}</button> : <span className="rounded-full bg-slate-950/5 px-3 py-1 text-xs text-slate-500">{action}</span>) : action || null}</div><div className="flex-1 min-h-0">{children}</div></section>;
}

function MoodModal({
  moodOptions,
  defaultMood,
  defaultNote,
  onConfirm,
  onAddMood,
  onUpdateMoodColor,
  onDeleteMood,
}: {
  moodOptions: MoodOption[];
  defaultMood: MoodKey;
  defaultNote: string;
  onConfirm: (key: MoodKey, note: string) => void;
  onAddMood: (option: MoodOption) => void;
  onUpdateMoodColor: (optionId: string, hue: number) => void;
  onDeleteMood: (optionId: string) => void;
}) {
  const [selectedMood, setSelectedMood] = useState<MoodKey>(defaultMood);
  const [note, setNote] = useState(defaultNote);
  const [adding, setAdding] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');
  const hueWheelGradient = useMemo(() => getMorandiHueWheelGradient(), []);
  const selectedOption = moodOptions.find((item) => item.id === selectedMood) || moodOptions[0];
  const selectedHue = selectedOption ? resolveMoodHue(selectedOption) : 0;
  const canDeleteMood = moodOptions.length > 1;

  useEffect(() => {
    setSelectedMood(defaultMood);
    setNote(defaultNote);
  }, [defaultMood, defaultNote]);

  useEffect(() => {
    if (moodOptions.length && !moodOptions.some((item) => item.id === selectedMood)) {
      setSelectedMood(moodOptions[0].id);
    }
  }, [moodOptions, selectedMood]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const confirmAddMood = () => {
    if (!customLabel.trim()) return;
    const nextMood = createCustomMoodOption(customLabel, customEmoji);
    onAddMood(nextMood);
    setSelectedMood(nextMood.id);
    setCustomLabel('');
    setCustomEmoji('');
    setAdding(false);
  };

  const handleDeleteMood = (optionId: string) => {
    if (!canDeleteMood) return;
    onDeleteMood(optionId);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-md">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white/94 p-6 shadow-2xl lg:p-7">
        <h2 className="mood-script text-center text-[56px] leading-none text-[var(--accent-strong)] lg:text-[72px]">How do you feel today?</h2>
        <p className="mt-3 text-center text-sm text-slate-500">选择一个情绪，或者新增一个属于你的当下状态。</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {moodOptions.map((item) => {
            const active = selectedMood === item.id;
            return (
              <div key={item.id} className="group relative">
                <button
                  type="button"
                  onClick={() => setSelectedMood(item.id)}
                  style={{ borderColor: active ? item.accentStrong : 'rgba(226,232,240,1)', background: active ? 'white' : 'rgba(248,250,252,0.92)' }}
                  className={`w-full rounded-3xl border p-4 text-center transition hover:-translate-y-1 hover:bg-white hover:shadow-xl ${active ? 'shadow-lg' : ''}`}
                >
                  <span className="text-3xl">{item.emoji}</span>
                  <span className="mt-2 block text-sm text-slate-700">{item.label}</span>
                  <span className="mx-auto mt-3 block h-2.5 w-12 rounded-full" style={{ background: item.background }} />
                </button>
                <button
                  type="button"
                  aria-label={`删除${item.label}`}
                  disabled={!canDeleteMood}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteMood(item.id);
                  }}
                  className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full bg-white/92 text-base leading-none text-slate-400 opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-rose-500 disabled:cursor-not-allowed disabled:hover:text-slate-400"
                >
                  −
                </button>
              </div>
            );
          })}
          <button type="button" onClick={() => setAdding((current) => !current)} className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500 transition hover:border-[var(--accent-strong)] hover:bg-white hover:text-[var(--accent-strong)]">+ 新增情绪</button>
        </div>
        {selectedOption ? (
          <div className="mt-4 rounded-3xl bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-700">为「{selectedOption.label}」调一下主题色</p>
              </div>
              <span className="rounded-full px-3 py-1 text-xs text-white shadow-sm" style={{ backgroundColor: selectedOption.accentStrong }}>{selectedHue}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={359}
              value={selectedHue}
              onChange={(event) => onUpdateMoodColor(selectedOption.id, Number(event.target.value))}
              style={{ background: hueWheelGradient }}
              className="mt-4 h-4 w-full cursor-pointer appearance-none rounded-full border border-white/70 bg-transparent px-1 shadow-inner accent-[var(--accent-strong)]"
            />
          </div>
        ) : null}
        {adding ? (
          <div className="mt-4 grid gap-3 rounded-3xl bg-slate-50 p-4 lg:grid-cols-[1fr_120px_auto]">
            <input value={customLabel} onChange={(event) => setCustomLabel(event.target.value)} placeholder="情绪名称，比如：松弛一下" className="input" />
            <input value={customEmoji} onChange={(event) => setCustomEmoji(event.target.value)} placeholder="emoji 可选" className="input" />
            <button type="button" onClick={confirmAddMood} className="btn">确认新增</button>
          </div>
        ) : null}
        <div className="mt-5 rounded-3xl bg-slate-50 p-4">
          <p className="text-sm text-slate-700">也可以自己写一句</p>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="比如：今天想慢一点，但也想把最重要的事做好。" className="input handwrite-textarea mt-3 min-h-24 resize-none text-[20px]" />
        </div>
        <div className="mt-5 flex justify-end"><button type="button" onClick={() => onConfirm(selectedOption?.id || defaultMood, note)} className="btn">进入面板</button></div>
      </div>
    </div>
  );
}

function HoverDeleteButton({ onClick, label = '删除', disabled = false }: { onClick: () => void; label?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full bg-white/92 text-base leading-none text-slate-400 opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-rose-500 disabled:cursor-not-allowed disabled:hover:text-slate-400"
    >
      −
    </button>
  );
}

function TodoBoard({ area, habits, setHabits, todayTasks, allTasks, setAllTasks, currentDate }: { area: 'work' | 'life'; habits: Habit[]; setHabits: React.Dispatch<React.SetStateAction<Habit[]>>; todayTasks: DailyTask[]; allTasks: DailyTask[]; setAllTasks: React.Dispatch<React.SetStateAction<DailyTask[]>>; currentDate: string }) {
  const [habitText, setHabitText] = useState('');
  const [taskText, setTaskText] = useState('');
  const previewHabits = habits.slice(0, MAX_CARD_RECORDS);
  const previewTasks = todayTasks.slice(0, MAX_CARD_RECORDS);
  const addHabit = (event: FormEvent) => { event.preventDefault(); if (!habitText.trim()) return; setHabits([{ id: uid(), title: habitText.trim(), area, completedDates: [] }, ...habits]); setHabitText(''); };
  const addTask = (event: FormEvent) => { event.preventDefault(); if (!taskText.trim()) return; setAllTasks([{ id: uid(), title: taskText.trim(), area, date: currentDate, done: false }, ...allTasks]); setTaskText(''); };
  const toggleHabitToday = (habitId: string) => setHabits(habits.map((item) => item.id !== habitId ? item : item.completedDates.includes(currentDate) ? { ...item, completedDates: item.completedDates.filter((date) => date !== currentDate) } : { ...item, completedDates: [currentDate, ...item.completedDates] }));
  const deleteHabit = (habitId: string) => setHabits(habits.filter((item) => item.id !== habitId));
  const toggleTask = (taskId: string) => setAllTasks(allTasks.map((item) => item.id === taskId ? { ...item, done: !item.done } : item));
  const deleteTask = (taskId: string) => setAllTasks(allTasks.filter((item) => item.id !== taskId));
  return (
    <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[1fr_1fr]">
      <BoardPanel title="坚持区" subtitle="">
        <form onSubmit={addHabit} className="flex gap-2"><input value={habitText} onChange={(event) => setHabitText(event.target.value)} placeholder="新增一个坚持项目" className="input" /><button className="btn">添加</button></form>
        <PreviewViewport className="mt-4 min-h-0 flex-1" heightClass="h-full">
          {previewHabits.map((habit) => (
            <div key={habit.id} className="group relative rounded-[1.4rem] bg-slate-950/[0.035] p-4">
              <HoverDeleteButton onClick={() => deleteHabit(habit.id)} label={`删除${habit.title}`} />
              <div className="flex items-start justify-between gap-3 pr-10">
                <div>
                  <p className="font-medium text-slate-900">{habit.title}</p>
                  <p className="mt-2 text-xs text-[var(--accent-strong)]">已完成 {habit.completedDates.length} 次</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => toggleHabitToday(habit.id)} style={habit.completedDates.includes(currentDate) ? { backgroundColor: 'color-mix(in oklab, var(--accent) 18%, white)', color: 'var(--accent-strong)' } : undefined} className="rounded-full px-3 py-1 text-xs text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-white">{habit.completedDates.includes(currentDate) ? '已打卡' : '去打卡'}</button>
                </div>
              </div>
            </div>
          ))}
        </PreviewViewport>
        <PreviewHint currentCount={habits.length} />
      </BoardPanel>
      <BoardPanel title="日常区" subtitle="">
        <form onSubmit={addTask} className="flex gap-2"><input value={taskText} onChange={(event) => setTaskText(event.target.value)} placeholder="新增一个事项" className="input" /><button className="btn">添加</button></form>
        <PreviewViewport className="mt-4 min-h-0 flex-1" heightClass="h-full">
          {previewTasks.map((task) => (
            <div key={task.id} className="group relative flex items-center gap-3 rounded-[1.4rem] bg-slate-950/[0.035] p-4 pr-11">
              <input checked={task.done} onChange={() => toggleTask(task.id)} type="checkbox" className="h-5 w-5 accent-[var(--accent-strong)]" />
              <span className={`flex-1 text-sm ${task.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</span>
              <HoverDeleteButton onClick={() => deleteTask(task.id)} label={`删除${task.title}`} />
            </div>
          ))}
        </PreviewViewport>
        <PreviewHint currentCount={todayTasks.length} />
      </BoardPanel>
    </div>
  );
}

function BoardPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <div className="flex h-full min-h-0 flex-col rounded-[1.6rem] bg-white/78 p-5 shadow-sm"><div><p className="text-base text-slate-900">{title}</p>{subtitle ? <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p> : null}</div><div className="mt-4 flex min-h-0 flex-1 flex-col">{children}</div></div>;
}

function TodoHistoryViewer({ areaLabel, habits, tasks, currentDate }: { areaLabel: string; habits: Habit[]; tasks: DailyTask[]; currentDate: string }) {
  const dates = useMemo(() => uniqueDates([currentDate, ...tasks.map((item) => item.date), ...habits.flatMap((item) => item.completedDates)]), [currentDate, tasks, habits]);
  const [selectedDate, setSelectedDate] = useState(dates[0] || currentDate);
  const selectedTasks = tasks.filter((item) => item.date === selectedDate);
  return <div><div className="rounded-3xl bg-slate-50 p-4"><p className="text-sm font-medium text-slate-700">选择日期</p><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{dates.map((date) => <button key={date} type="button" onClick={() => setSelectedDate(date)} className={`rounded-full px-3 py-2 text-sm whitespace-nowrap transition ${selectedDate === date ? 'bg-[var(--accent-strong)] text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>{formatDateLabel(date)}</button>)}</div></div><div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]"><div className="rounded-3xl bg-slate-950/[0.035] p-4"><p className="text-sm font-semibold text-slate-900">{areaLabel} · 坚持区</p><div className="mt-3 space-y-3">{habits.length ? habits.map((habit) => <ViewerItem key={habit.id} title={habit.title} meta={`${habit.completedDates.includes(selectedDate) ? '当日已打卡' : '当日未打卡'} · 累计已完成 ${habit.completedDates.length} 次`} />) : <EmptyState text="这一天还没有坚持区记录。" />}</div></div><div className="rounded-3xl bg-slate-950/[0.035] p-4"><p className="text-sm font-semibold text-slate-900">{areaLabel} · 日常区</p><div className="mt-3 space-y-3">{selectedTasks.length ? selectedTasks.map((task) => <ViewerItem key={task.id} title={task.title} meta={task.done ? '已完成' : '未完成'} />) : <EmptyState text="这一天还没有日常区事项。" />}</div></div></div></div>;
}

function ProjectPanel({ projects, setProjects, onOpen }: { projects: Project[]; setProjects: (updater: (items: Project[]) => Project[]) => void; onOpen: (id: string) => void }) {
  const [name, setName] = useState('');
  const previewProjects = projects.slice(0, MAX_CARD_RECORDS);
  const add = (event: FormEvent) => { event.preventDefault(); if (!name.trim()) return; setProjects((items) => [...items, applyProjectStepMeta({ id: uid(), name: name.trim(), stage: '进行中', progress: 0, next: '填写第一步', steps: [{ id: uid(), title: '填写第一步', done: false }] })]); setName(''); };
  return <div><form onSubmit={add} className="flex gap-2"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="新增项目" /><button className="btn">添加</button></form><PreviewViewport className="mt-4" heightClass="max-h-[16rem]">{previewProjects.map((project) => <div key={project.id} className="group relative rounded-3xl bg-slate-950/[0.035] p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"><HoverDeleteButton onClick={() => setProjects((items) => items.filter((item) => item.id !== project.id))} label={`删除项目${project.name}`} /><div className="flex justify-between gap-3 pr-10"><button type="button" onClick={() => onOpen(project.id)} className="flex-1 text-left"><p className="font-semibold text-slate-900">{project.name}</p><p className="text-sm text-slate-500">{project.stage} · 下一步：{project.next}</p></button><div className="flex flex-col items-end gap-2"><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">{project.progress}%</span></div></div></div>)}</PreviewViewport><PreviewHint currentCount={projects.length} /></div>;
}

function FocusNotebookPanel({ book, setBook, logs, setLogs, seconds, setSeconds, running, setRunning, visual, backgroundUrl, onRecord }: { book: FocusNotebook; setBook: React.Dispatch<React.SetStateAction<FocusNotebook>>; logs: FocusLog[]; setLogs: React.Dispatch<React.SetStateAction<FocusLog[]>>; seconds: number; setSeconds: React.Dispatch<React.SetStateAction<number>>; running: boolean; setRunning: React.Dispatch<React.SetStateAction<boolean>>; visual: CardVisual; backgroundUrl: string; onRecord: (minutes?: number) => void }) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const sec = (seconds % 60).toString().padStart(2, '0');
  const previewLogs = logs.slice(0, MAX_CARD_RECORDS);
  const updateBook = (patch: Partial<FocusNotebook>) => setBook({ ...book, ...patch });
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <NotebookPage title="左页 · 当下专注" subtitle="左页主题是唯一 key，主题不变就持续覆盖更新。" visual={visual} backgroundUrl={backgroundUrl}>
          <label className="block text-xs text-slate-500">此刻主题</label>
          <input value={book.currentTopic} onChange={(event) => updateBook({ currentTopic: event.target.value })} placeholder="写下现在最想专注的事" className="input handwrite-textarea mt-2 text-[20px]" />
          <label className="mt-4 block text-xs text-slate-500">左页拆解</label>
          <textarea value={book.leftPage} onChange={(event) => updateBook({ leftPage: event.target.value })} placeholder="把任务拆小，像在纸页上慢慢写。" className="handwrite-textarea mt-2 min-h-44 w-full resize-none rounded-[1.4rem] border border-amber-100 bg-[#fffdf7]/90 px-4 py-4 text-[20px] outline-none" />
        </NotebookPage>
        <NotebookPage title="右页 · 灵感与复盘" subtitle="右页内容自动和左页主题绑定，同主题只更新不新增。" visual={visual} backgroundUrl={backgroundUrl}>
          <label className="block text-xs text-slate-500">右页手记</label>
          <textarea value={book.rightPage} onChange={(event) => updateBook({ rightPage: event.target.value })} placeholder="写下卡住点、临时灵感或结束后的复盘。" className="handwrite-textarea mt-2 min-h-[14rem] w-full resize-none rounded-[1.4rem] border border-amber-100 bg-[#fffdf7]/90 px-4 py-4 text-[20px] outline-none" />
        </NotebookPage>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="rounded-[1.8rem] bg-white/75 p-5 shadow-sm">
          <div className="rounded-[1.5rem] bg-slate-950 px-5 py-5 text-center text-white shadow-lg shadow-slate-950/10">
            <p className="text-sm text-white/50">番茄钟</p>
            <p className="mt-2 text-5xl tabular-nums">{minutes}:{sec}</p>
            <div className="mt-4 flex justify-center gap-2">
              <button type="button" onClick={() => {
                if (running) {
                  setRunning(false);
                  return;
                }
                if (seconds === 0) {
                  setSeconds(25 * 60);
                }
                setRunning(true);
              }} className="btn light">{running ? '暂停' : '开始'}</button>
              <button type="button" onClick={() => { setRunning(false); setSeconds(25 * 60); }} className="btn ghost">重置</button>
              <button type="button" onClick={() => onRecord(25)} className="btn">记录</button>
            </div>
          </div>
        </div>
        <div className="rounded-[1.8rem] bg-white/75 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent-strong)]">Recent Focus Logs</p>
          <PreviewViewport className="mt-4" heightClass="max-h-[12rem]">
            {previewLogs.length ? previewLogs.map((log) => (
              <div key={log.id} className="group relative rounded-[1.4rem] bg-slate-950/[0.035] p-4">
                <HoverDeleteButton onClick={() => setLogs((current) => current.filter((item) => item.id !== log.id))} label={`删除${log.title}记录`} />
                <div className="flex items-start justify-between gap-3 pr-10">
                  <div>
                    <p className="text-slate-900">{log.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateLabel(log.date)} · {log.minutes}min</p>
                  </div>
                </div>
              </div>
            )) : <EmptyState text="还没有专注时长记录。" />}
          </PreviewViewport>
          <PreviewHint currentCount={logs.length} />
        </div>
      </div>
    </div>
  );
}

function NotebookPage({ title, subtitle, visual, backgroundUrl, children }: { title: string; subtitle: string; visual: CardVisual; backgroundUrl: string; children: React.ReactNode }) {
  return <div className="notebook-page relative overflow-hidden rounded-[2rem] px-5 py-5 shadow-inner" style={{ borderColor: 'color-mix(in oklab, var(--accent) 24%, white)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 0 0 1px color-mix(in oklab, var(--accent) 14%, white)' }}><div className="absolute inset-0 bg-cover bg-center opacity-14" style={{ backgroundImage: `url(${backgroundUrl})`, filter: `hue-rotate(${visual.hueRotate}deg)` }} /><div className={`absolute inset-0 bg-gradient-to-br ${visual.overlay} opacity-10`} /><div className="relative"><div className="mb-4 border-b pb-4" style={{ borderColor: 'color-mix(in oklab, var(--accent) 20%, white)' }}><p className="text-xs uppercase tracking-[0.25em] text-[var(--accent-strong)]">Focus Spread</p><h3 className="mt-2 text-2xl text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p></div>{children}</div></div>;
}

function FocusViewer({ book, logs, entries }: { book: FocusNotebook; logs: FocusLog[]; entries: FocusEntry[] }) {
  const dates = uniqueDates(entries.map((entry) => entry.date));
  const [selectedDate, setSelectedDate] = useState(dates[0] || today());
  const topics = entries.filter((entry) => entry.date === selectedDate).map((entry) => entry.topic);
  const [selectedTopic, setSelectedTopic] = useState(topics[0] || book.currentTopic);
  useEffect(() => {
    if (topics.length && !topics.includes(selectedTopic)) setSelectedTopic(topics[0]);
  }, [topics, selectedTopic]);
  const currentEntry = entries.find((entry) => entry.date === selectedDate && entry.topic === selectedTopic) || entries[0];
  return (
    <div>
      <div className="rounded-3xl bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-700">先选日期，再选主题</p>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{dates.map((date) => <button key={date} type="button" onClick={() => setSelectedDate(date)} className={`rounded-full px-3 py-2 text-sm whitespace-nowrap transition ${selectedDate === date ? 'bg-[var(--accent-strong)] text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>{formatDateLabel(date)}</button>)}</div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{topics.map((topic) => <button key={topic} type="button" onClick={() => setSelectedTopic(topic)} className={`rounded-full px-3 py-2 text-sm whitespace-nowrap transition ${selectedTopic === topic ? 'bg-[var(--accent)] text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>{topic}</button>)}</div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <ViewerItem title="左页内容" body={currentEntry?.leftPage || book.leftPage} meta={`主题：${currentEntry?.topic || book.currentTopic}`} />
        <ViewerItem title="右页内容" body={currentEntry?.rightPage || book.rightPage} meta={currentEntry ? formatDateLabel(currentEntry.date) : '当前内容'} />
      </div>
      <div className="mt-5 space-y-3">{logs.map((log) => <ViewerItem key={log.id} title={log.title} meta={`${formatDateLabel(log.date)} · ${log.minutes}min`} />)}</div>
    </div>
  );
}

function WorkoutHistoryViewer({ workouts, setWorkouts }: { workouts: Workout[]; setWorkouts: React.Dispatch<React.SetStateAction<Workout[]>> }) {
  const sortedWorkouts = [...workouts]
    .filter((item) => item.minutes > 0 && item.type !== '体重记录')
    .reverse();
  return (
    <div className="space-y-3">
      {sortedWorkouts.length ? sortedWorkouts.map((item) => (
        <ViewerItem
          key={item.id}
          title={item.type}
          meta={`${formatDateLabel(item.date)} · ${item.minutes} 分钟`}
          onDelete={() => setWorkouts((current) => current.filter((entry) => entry.id !== item.id))}
          deleteLabel={`删除${item.type}`}
        />
      )) : <EmptyState text="还没有运动记录。" />}
    </div>
  );
}

function DiaryPanel({ diaries, setDiaries, currentDate }: { diaries: Diary[]; setDiaries: React.Dispatch<React.SetStateAction<Diary[]>>; currentDate: string }) {
  const [content, setContent] = useState('');
  const previewDiaries = diaries.slice(0, MAX_CARD_RECORDS);
  const add = () => { if (!content.trim()) return; setDiaries([{ id: uid(), title: '今天的小成功', content: content.trim(), date: currentDate }, ...diaries]); setContent(''); };
  return <div className="flex h-full min-h-0 flex-col"><textarea className="input min-h-24 resize-none" value={content} onChange={(e) => setContent(e.target.value)} placeholder="写下今天做成的一件小事" /><button type="button" onClick={add} className="btn mt-2 w-full">存入日记</button><PreviewViewport className="mt-4 min-h-0 flex-1" heightClass="h-full">{previewDiaries.map((diary) => <article key={diary.id} className="group relative rounded-3xl bg-slate-950/[0.035] p-4 pr-11"><HoverDeleteButton onClick={() => setDiaries((current) => current.filter((item) => item.id !== diary.id))} label={`删除${diary.title}`} /><p className="text-xs text-slate-400">{formatDateLabel(diary.date)}</p><p className="mt-1 font-medium text-slate-800">{diary.content}</p></article>)}</PreviewViewport><PreviewHint currentCount={diaries.length} /></div>;
}

function WorkoutPanel({ workouts, setWorkouts, summary, goalWeight, setGoalWeight, currentDate }: { workouts: Workout[]; setWorkouts: React.Dispatch<React.SetStateAction<Workout[]>>; summary: WorkoutSummary; goalWeight: number; setGoalWeight: React.Dispatch<React.SetStateAction<number>>; currentDate: string }) {
  const [type, setType] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [weightDraft, setWeightDraft] = useState(summary.todayWeight ? String(summary.todayWeight) : '');

  useEffect(() => {
    setWeightDraft(summary.todayWeight ? String(summary.todayWeight) : '');
  }, [summary.todayWeight, currentDate]);

  const addWorkout = (event: FormEvent) => {
    event.preventDefault();
    if (!type.trim()) return;
    setWorkouts([...workouts, { id: uid(), type: type.trim(), minutes: Number(minutes), date: currentDate }]);
    setType('');
    setMinutes('30');
  };

  const saveTodayWeight = () => {
    const normalized = weightDraft.trim();
    setWorkouts((current) => {
      const withoutTodayWeight = current.filter((item) => !(item.date === currentDate && item.type === '体重记录'));
      if (!normalized) return withoutTodayWeight;
      return [...withoutTodayWeight, { id: uid(), type: '体重记录', minutes: 0, weight: Number(normalized), date: currentDate }];
    });
  };

  return <div className="grid gap-4"><div className="rounded-[1.5rem] bg-white/72 p-4 shadow-sm"><div className="grid gap-3"><div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-950/[0.035] px-3 py-2"><span className="text-sm text-slate-500">目标体重：</span><input type="number" value={goalWeight} onChange={(event) => setGoalWeight(Number(event.target.value) || 0)} className="input h-9 max-w-[6.5rem] px-3 py-1.5" /><span className="text-sm text-slate-500">kg</span><span className="ml-auto text-sm text-[var(--accent-strong)]">距离理想体重还有 {summary.distance.toFixed(1)}kg</span></div><div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-950/[0.035] px-3 py-2"><span className="text-sm text-slate-500">今日体重：</span><input type="number" value={weightDraft} onChange={(event) => setWeightDraft(event.target.value)} onBlur={saveTodayWeight} onKeyDown={(event) => { if (event.key === 'Enter') saveTodayWeight(); }} className="input h-9 max-w-[6.5rem] px-3 py-1.5" /><span className="text-sm text-slate-500">kg</span></div></div><form onSubmit={addWorkout} className="mt-4 grid gap-2 sm:grid-cols-[1fr_120px_auto]"><input className="input" value={type} onChange={(e) => setType(e.target.value)} placeholder="新增运动记录" /><input className="input" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="分钟" /><button className="btn">记录</button></form><div><p className="mt-4 text-sm text-slate-900">按周累计小图表</p><MiniBars bars={summary.weeklyBars} unit="min" color="var(--accent-strong)" emptyText="还没有足够的运动记录" /></div><div><p className="mt-4 text-sm text-slate-900">体重趋势</p><MiniBars bars={summary.weightBars} unit="kg" color="var(--accent-strong)" emptyText="还没有足够的体重记录" /></div></div></div>;
}

function BookPanel({ notes, setNotes, currentDate, recommendation }: { notes: BookNote[]; setNotes: React.Dispatch<React.SetStateAction<BookNote[]>>; currentDate: string; recommendation: { title: string; author: string; excerpt: string } }) {
  const [book, setBook] = useState('');
  const [note, setNote] = useState('');
  const add = () => { if (!book.trim() || !note.trim()) return; setNotes([{ id: uid(), book, note, link: WEREAD_URL, date: currentDate }, ...notes]); setBook(''); setNote(''); };
  return <div className="grid gap-4"><div className="rounded-[1.5rem] bg-slate-950/[0.035] p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-slate-900">读书摘抄</p><p className="mt-1 text-xs text-slate-500">先记下今天想留下来的句子和想法</p></div><a href={WEREAD_URL} target="_blank" rel="noreferrer" className="rounded-full bg-white/85 px-3 py-1 text-xs text-[var(--accent-strong)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white">打开微信读书登录版</a></div><div className="mt-4 grid gap-2"><input className="input" value={book} onChange={(e) => setBook(e.target.value)} placeholder="书名" /><textarea className="input handwrite-textarea min-h-20 resize-none" value={note} onChange={(e) => setNote(e.target.value)} placeholder="摘抄或想法" /><button type="button" onClick={add} className="btn">添加笔记</button></div></div><div className="rounded-[1.5rem] bg-slate-950/[0.035] p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-slate-900">今日好书推荐</p><p className="mt-1 text-xs text-slate-500">只保留一个推荐板块，直接展示原文摘抄</p></div><a href={WEREAD_URL} target="_blank" rel="noreferrer" className="rounded-full bg-white/85 px-3 py-1 text-xs text-[var(--accent-strong)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white">继续阅读</a></div><div className="mt-4 rounded-[1.4rem] bg-white/85 p-4"><p className="text-lg leading-8 text-slate-800">“{recommendation.excerpt}”——{recommendation.title}{recommendation.author}</p></div></div></div>;
}

function MarketPanel({ indices, error }: { indices: MarketIndex[]; error: string }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{indices.length ? indices.map((item) => { const up = Number(item.change) >= 0; return <div key={item.code} className="rounded-3xl bg-slate-950/[0.035] p-4"><p className="text-sm text-slate-500">{item.name}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{item.price}</p><p className={`mt-1 text-sm ${up ? 'text-rose-500' : 'text-emerald-600'}`}>{up ? '+' : ''}{item.change} · {item.percent}%</p></div>; }) : <p className="col-span-3 rounded-2xl bg-slate-950/[0.035] p-4 text-slate-500">正在加载指数行情…</p>}{error ? <p className="col-span-3 text-xs text-amber-600">{error}</p> : null}</div>;
}

function StockDiaryPanel({ notes, setNotes, currentDate }: { notes: StockNote[]; setNotes: React.Dispatch<React.SetStateAction<StockNote[]>>; currentDate: string }) {
  const [symbol, setSymbol] = useState('');
  const [thought, setThought] = useState('');
  const grouped = notes.reduce<Record<string, StockNote[]>>((acc, item) => { acc[item.symbol] = [...(acc[item.symbol] || []), item]; return acc; }, {});
  const groupedEntries = Object.entries(grouped).slice(0, MAX_CARD_RECORDS);
  const add = () => { if (!symbol.trim() || !thought.trim()) return; setNotes([{ id: uid(), symbol: symbol.trim(), action: '观察', thought: thought.trim(), date: currentDate }, ...notes]); setSymbol(''); setThought(''); };
  return <div><div className="grid gap-2 sm:grid-cols-[0.5fr_1fr_auto]"><input className="input" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="标的" /><input className="input" value={thought} onChange={(e) => setThought(e.target.value)} placeholder="交易想法/复盘" /><button type="button" onClick={add} className="btn">记录</button></div><PreviewViewport className="mt-4" heightClass="max-h-[12rem]">{groupedEntries.map(([key, items]) => <div key={key} className="rounded-3xl bg-slate-950/[0.035] p-4"><p className="font-semibold text-slate-900">{key}</p>{items.slice(0, 2).map((item) => <p key={item.id} className="mt-2 text-sm leading-6 text-slate-600">{formatDateLabel(item.date)} · {item.thought}</p>)}</div>)}</PreviewViewport><PreviewHint currentCount={Object.keys(grouped).length} /></div>;
}


function PreviewViewport({ children, heightClass, className = '' }: { children: React.ReactNode; heightClass: string; className?: string }) {
  return <div className={`${className} ${heightClass} space-y-3 overflow-y-auto pr-1`}>{children}</div>;
}

function PreviewHint({ currentCount }: { currentCount: number }) {
  return currentCount > MAX_CARD_RECORDS ? <p className="mt-3 text-xs text-slate-400">卡片内最多滚动浏览 10 条，更多内容请点击右上角查看。</p> : null;
}

function MiniBars({ bars, unit, color, emptyText }: { bars: Array<{ label: string; value: number }>; unit: string; color: string; emptyText: string }) {
  if (!bars.length) return <EmptyState text={emptyText} />;
  const max = Math.max(...bars.map((item) => item.value), 1);
  return <div className="mt-4 rounded-[1.5rem] bg-white/80 p-4"><div className="flex h-28 items-end gap-2">{bars.map((item) => <div key={item.label} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-2xl" style={{ height: `${Math.max((item.value / max) * 100, 8)}%`, backgroundColor: color, opacity: 0.85 }} /><div className="text-center"><p className="text-xs text-slate-400">{item.label}</p><p className="text-xs font-medium text-slate-600">{item.value}{unit}</p></div></div>)}</div></div>;
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">{text}</p>;
}

function BookViewerModal({ title, visual, backgroundUrl, children, onClose }: { title: string; visual: CardVisual; backgroundUrl: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-md"><div className="relative w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/40 bg-[#fffdf8] p-6 shadow-2xl"><div className="absolute inset-0 bg-cover bg-center opacity-12" style={{ backgroundImage: `url(${backgroundUrl})`, filter: `hue-rotate(${visual.hueRotate}deg)` }} /><div className={`absolute inset-0 bg-gradient-to-br ${visual.overlay} opacity-6`} /><div className="absolute left-[3.35rem] top-0 h-full w-px bg-rose-200/70" /><div className="relative"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold tracking-[0.22em] text-slate-400">PAPER VIEW</p><h3 className="mt-1 text-2xl font-semibold text-slate-950">{title}</h3></div><button type="button" onClick={onClose} className="rounded-full bg-white/90 px-4 py-2 text-sm text-[var(--accent-strong)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white">关闭</button></div><div className="mt-5 max-h-[72vh] overflow-y-auto pr-1">{children}</div></div></div></div>;
}

function ProjectStepsModal({ project, visual, backgroundUrl, onClose, onToggle, onDelete, onAdd, onMove }: { project: Project; visual: CardVisual; backgroundUrl: string; onClose: () => void; onToggle: (stepId: string) => void; onDelete: (stepId: string) => void; onAdd: (title: string) => void; onMove: (stepId: string, direction: 'up' | 'down') => void }) {
  const [text, setText] = useState('');
  const submit = (event: FormEvent) => { event.preventDefault(); if (!text.trim()) return; onAdd(text.trim()); setText(''); };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-md"><div className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/40 bg-[#fffdf8] p-6 shadow-2xl"><div className="absolute inset-0 bg-cover bg-center opacity-12" style={{ backgroundImage: `url(${backgroundUrl})`, filter: `hue-rotate(${visual.hueRotate}deg)` }} /><div className={`absolute inset-0 bg-gradient-to-br ${visual.overlay} opacity-6`} /><div className="relative"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold tracking-[0.22em] text-slate-400">PROJECT STEPS</p><h3 className="mt-1 text-2xl font-semibold text-slate-950">{project.name}</h3><p className="mt-2 text-sm text-slate-500">下一步：{project.next}</p></div><button type="button" onClick={onClose} className="rounded-full bg-white/90 px-4 py-2 text-sm text-[var(--accent-strong)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white">关闭</button></div><form onSubmit={submit} className="mt-5 flex gap-2"><input value={text} onChange={(event) => setText(event.target.value)} placeholder="补充这一步要做什么" className="input" /><button className="btn">添加步骤</button></form><div className="mt-5 max-h-[60vh] space-y-3 overflow-y-auto pr-1">{(project.steps || []).map((step, index, steps) => <div key={step.id} className="group relative rounded-2xl bg-slate-950/[0.035] p-4 pr-12"><HoverDeleteButton onClick={() => onDelete(step.id)} label={`删除步骤${step.title}`} /><div className="flex items-center gap-3"><input checked={step.done} onChange={() => onToggle(step.id)} type="checkbox" className="h-5 w-5 accent-[var(--accent-strong)]" /><span className={`flex-1 ${step.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{step.title}</span><button type="button" disabled={index === 0} onClick={() => onMove(step.id, 'up')} className="rounded-full px-3 py-1 text-xs text-slate-500 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">上移</button><button type="button" disabled={index === steps.length - 1} onClick={() => onMove(step.id, 'down')} className="rounded-full px-3 py-1 text-xs text-slate-500 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">下移</button></div></div>)}</div></div></div></div>;
}

function ViewerItem({ title, meta, body, extra, onDelete, deleteLabel }: { title: string; meta?: string; body?: string; extra?: React.ReactNode; onDelete?: () => void; deleteLabel?: string }) {
  return <article className={`rounded-3xl bg-slate-950/[0.035] p-4 ${onDelete ? 'group relative pr-11' : ''}`}>{onDelete ? <HoverDeleteButton onClick={onDelete} label={deleteLabel || `删除${title}`} /> : null}<div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{title}</p>{meta ? <p className="mt-1 text-sm text-slate-500">{meta}</p> : null}</div>{extra}</div>{body ? <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p> : null}</article>;
}
