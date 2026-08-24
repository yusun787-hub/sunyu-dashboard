import React, { FormEvent, useEffect, useMemo, useState } from 'react';
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
import { useLocalStorage, useTodayKey } from './hooks';
import { fetchMarketIndices, fetchYangpuWeather, weatherIcon, weatherText, windLevel } from './services';
import type {
  BookNote,
  DailyTask,
  Diary,
  FocusEntry,
  FocusLog,
  FocusNotebook,
  Habit,
  MarketIndex,
  MoodKey,
  Project,
  ProjectStep,
  QuoteCard,
  StockNote,
  WeatherDay,
  Workout,
} from './types';

const moodThemes: Record<MoodKey, { label: string; emoji: string; className: string; hint: string }> = {
  bright: { label: '元气满满', emoji: '🌞', className: 'theme-bright', hint: '适合进攻型任务，把最难的事放到上午。' },
  focused: { label: '专注稳定', emoji: '🧭', className: 'theme-focused', hint: '进入深度工作，减少切换。' },
  calm: { label: '平静温和', emoji: '🌿', className: 'theme-calm', hint: '稳稳推进，给自己留呼吸空间。' },
  warm: { label: '柔软治愈', emoji: '☕', className: 'theme-warm', hint: '适合整理、复盘和照顾生活秩序。' },
  tired: { label: '有点疲惫', emoji: '🌙', className: 'theme-tired', hint: '降低颗粒度，只完成最关键的一步。' },
};

const quotePalettes = [
  { overlay: 'from-slate-950/78 via-slate-900/68 to-slate-800/70', inkClass: 'text-white', mutedClass: 'text-white/72', borderClass: 'border-white/30', actionClass: 'bg-white/12 text-white hover:bg-white/20', hueRotate: -8 },
  { overlay: 'from-amber-50/82 via-orange-50/74 to-rose-50/78', inkClass: 'text-slate-900', mutedClass: 'text-slate-600', borderClass: 'border-amber-200/65', actionClass: 'bg-slate-950/6 text-slate-700 hover:bg-slate-950/10', hueRotate: 12 },
  { overlay: 'from-emerald-950/74 via-teal-900/66 to-cyan-900/68', inkClass: 'text-white', mutedClass: 'text-white/70', borderClass: 'border-white/25', actionClass: 'bg-white/12 text-white hover:bg-white/20', hueRotate: 78 },
  { overlay: 'from-rose-950/72 via-fuchsia-950/58 to-orange-900/60', inkClass: 'text-white', mutedClass: 'text-white/70', borderClass: 'border-white/25', actionClass: 'bg-white/12 text-white hover:bg-white/20', hueRotate: 146 },
];

type ViewerKey = 'workBoard' | 'lifeBoard' | 'focus' | 'diaries' | 'workouts' | 'bookNotes' | 'stockNotes' | null;
type CardVisual = (typeof quotePalettes)[number];

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
const today = () => new Date().toISOString().slice(0, 10);
const WEREAD_URL = 'https://weread.qq.com/';

export default function App() {
  const currentDate = useMemo(() => today(), []);
  const todayKey = useTodayKey('sunyu-mood');
  const [mood, setMood] = useLocalStorage<MoodKey>('sunyu-dashboard-mood', 'focused');
  const [moodNote, setMoodNote] = useLocalStorage<string>('sunyu-dashboard-mood-note', '');
  const [moodSelectedToday, setMoodSelectedToday] = useLocalStorage<boolean>(todayKey, false);

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
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [viewer, setViewer] = useState<ViewerKey>(null);
  const [quoteOffset, setQuoteOffset] = useState(0);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const projects = useMemo(() => rawProjects.map((project) => normalizeProject(project)), [rawProjects]);
  const workTodayTasks = useMemo(() => workDailyTasks.filter((item) => item.date === currentDate), [workDailyTasks, currentDate]);
  const lifeTodayTasks = useMemo(() => lifeDailyTasks.filter((item) => item.date === currentDate), [lifeDailyTasks, currentDate]);
  const quoteBundle = useMemo(() => getQuoteBundle(shiftDate(currentDate, -quoteOffset)), [currentDate, quoteOffset]);
  const quoteVisual = quoteBundle.palette;
  const completion = useMemo(() => getCompletionRate(workHabits, workTodayTasks, currentDate), [workHabits, workTodayTasks, currentDate]);
  const totalFocus = focusLogs.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  const workoutSummary = useMemo(() => getWorkoutSummary(workouts, currentDate, goalWeight), [workouts, currentDate, goalWeight]);
  const dailyBookPick = useMemo(() => getDailyBookPick(currentDate), [currentDate]);
  const activeProject = projects.find((item) => item.id === activeProjectId) || null;

  useEffect(() => {
    fetchYangpuWeather().then(setWeather).catch((err) => setWeatherError((err as Error).message));
    fetchMarketIndices().then(setIndices).catch((err) => setMarketError((err as Error).message));
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => setTimerSeconds((current) => Math.max(current - 1, 0)), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    if (timerSeconds === 0 && timerRunning) setTimerRunning(false);
  }, [timerSeconds, timerRunning]);

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
    setMoodSelectedToday(true);
  };

  return (
    <main className={`min-h-screen ${moodThemes[mood].className}`}>
      {!moodSelectedToday && <MoodModal defaultMood={mood} defaultNote={moodNote} onConfirm={selectMood} />}
      {viewerMeta && <BookViewerModal title={viewerMeta.title} visual={quoteVisual} backgroundUrl={quoteBundle.backgroundUrl} onClose={() => setViewer(null)}>{viewerMeta.content}</BookViewerModal>}
      {activeProject && (
        <ProjectStepsModal
          project={activeProject}
          visual={quoteVisual}
          backgroundUrl={quoteBundle.backgroundUrl}
          onClose={() => setActiveProjectId(null)}
          onToggle={(stepId) => updateProjectSteps(activeProject.id, (steps) => steps.map((step) => (step.id === stepId ? { ...step, done: !step.done } : step)))}
          onDelete={(stepId) => updateProjectSteps(activeProject.id, (steps) => steps.filter((step) => step.id !== stepId))}
          onAdd={(title) => updateProjectSteps(activeProject.id, (steps) => [...steps, { id: uid(), title, done: false }])}
        />
      )}

      <div className="mx-auto max-w-[1500px] px-5 py-6 lg:px-8">
        <Hero
          mood={moodThemes[mood]}
          moodNote={moodNote}
          quoteBundle={quoteBundle}
          quoteOffset={quoteOffset}
          setQuoteOffset={setQuoteOffset}
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

        <section className="mt-5 grid items-stretch gap-5 xl:grid-cols-[1.1fr_1fr]">
          <Card title="专注本" eyebrow="FOCUS NOTEBOOK" action="查看展开" onAction={() => setViewer('focus')}>
            <FocusNotebookPanel book={focusNotebook} setBook={setFocusNotebook} logs={focusLogs} setLogs={setFocusLogs} entries={focusEntries} seconds={timerSeconds} setSeconds={setTimerSeconds} running={timerRunning} setRunning={setTimerRunning} currentDate={currentDate} visual={quoteVisual} backgroundUrl={quoteBundle.backgroundUrl} />
          </Card>
          <Card title="成功日记本" eyebrow="WIN LOG" action="给努力留证据 · 点击查看" onAction={() => setViewer('diaries')}>
            <DiaryPanel diaries={diaries} setDiaries={setDiaries} currentDate={currentDate} />
          </Card>
        </section>

        <section className="mt-5 grid items-stretch gap-5 xl:grid-cols-[1.1fr_1fr]">
          <Card title="生活待办区" eyebrow="LIFE" action="查看过往" onAction={() => setViewer('lifeBoard')}>
            <TodoBoard area="life" habits={lifeHabits} setHabits={setLifeHabits} todayTasks={lifeTodayTasks} allTasks={lifeDailyTasks} setAllTasks={setLifeDailyTasks} currentDate={currentDate} />
          </Card>
          <Card title="运动记录区" eyebrow="HEALTH" action="点击查看" onAction={() => setViewer('workouts')}>
            <WorkoutPanel workouts={workouts} setWorkouts={setWorkouts} summary={workoutSummary} goalWeight={goalWeight} setGoalWeight={setGoalWeight} currentDate={currentDate} />
          </Card>
        </section>

        <section className="mt-5 grid items-stretch gap-5 xl:grid-cols-[1.1fr_1fr]">
          <Card title="读书笔记区" eyebrow="READING" action="查看历史" onAction={() => setViewer('bookNotes')}>
            <BookPanel notes={bookNotes} setNotes={setBookNotes} currentDate={currentDate} recommendation={dailyBookPick} />
          </Card>
          <Card title="今日股市指数" eyebrow="MARKET" action="真实行情">
            <MarketPanel indices={indices} error={marketError} />
          </Card>
        </section>

        <section className="mt-5 grid items-stretch gap-5 xl:grid-cols-[1.1fr_1fr]">
          <Card title="炒股日记" eyebrow="INVEST" action="点击查看" onAction={() => setViewer('stockNotes')}>
            <StockDiaryPanel notes={stockNotes} setNotes={setStockNotes} currentDate={currentDate} />
          </Card>
          <Card title="阅读与市场小结" eyebrow="DAILY SNAPSHOT" action="打开微信读书登录版">
            <SnapshotPanel recommendation={dailyBookPick} />
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
  const groupsMap = workouts.reduce<Record<string, { date: string; minutes: number; count: number }>>((acc, item) => {
    const current = acc[item.date] || { date: item.date, minutes: 0, count: 0 };
    acc[item.date] = { date: item.date, minutes: current.minutes + item.minutes, count: current.count + 1 };
    return acc;
  }, {});
  const dayGroups = Object.values(groupsMap).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).map((item) => ({ ...item, label: formatShortDate(item.date) }));
  const lastSevenDates = Array.from({ length: 7 }, (_, index) => shiftDate(currentDate, -(6 - index)));
  const weeklyBars = lastSevenDates.map((date) => ({ label: formatShortDate(date), value: groupsMap[date]?.minutes || 0 }));
  const weightEntries = workouts.filter((item) => typeof item.weight === 'number').sort((a, b) => a.date.localeCompare(b.date));
  const lastWeights = weightEntries.slice(-7).map((item) => ({ label: formatShortDate(item.date), value: Number(item.weight || 0) }));
  const todayWeight = [...weightEntries].reverse().find((item: Workout) => item.date === currentDate)?.weight ?? weightEntries.at(-1)?.weight;
  return {
    activeDays: new Set(workouts.map((item) => item.date)).size,
    totalSessions: workouts.length,
    totalMinutes: workouts.reduce((sum, item) => sum + item.minutes, 0),
    todayWeight,
    goalWeight,
    distance: todayWeight ? Math.max(0, Number((todayWeight - goalWeight).toFixed(1))) : 0,
    dayGroups,
    weeklyBars,
    weightBars: lastWeights,
  };
}

function getQuoteBundle(date: string) {
  const index = hashDate(date);
  return {
    quote: quoteCards[index % quoteCards.length],
    palette: quotePalettes[index % quotePalettes.length],
    backgroundUrl: vintageIllustrationUrls[index % vintageIllustrationUrls.length],
    date,
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
  return date.toISOString().slice(0, 10);
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
      return { title: '运动记录区 · 全部记录', content: <div className="space-y-3">{data.workouts.slice().reverse().map((item) => <ViewerItem key={item.id} title={item.type} meta={`${formatDateLabel(item.date)} · ${item.minutes} 分钟${item.weight ? ` · ${item.weight}kg` : ''}`} />)}</div> };
    case 'bookNotes':
      return { title: '读书笔记区 · 历史记录', content: <div className="space-y-3">{data.bookNotes.map((item) => <ViewerItem key={item.id} title={item.book} meta={formatDateLabel(item.date)} body={item.note} extra={<a href={item.link || WEREAD_URL} target="_blank" rel="noreferrer" className="text-sm text-[var(--accent-strong)]">打开微信读书</a>} />)}</div> };
    case 'stockNotes':
      return { title: '炒股日记 · 全部记录', content: <div className="space-y-3">{data.stockNotes.map((item) => <ViewerItem key={item.id} title={item.symbol} meta={`${formatDateLabel(item.date)} · ${item.action}`} body={item.thought} />)}</div> };
    default:
      return null;
  }
}

function Hero({ mood, moodNote, quoteBundle, quoteOffset, setQuoteOffset, completion, totalFocus, weather, weatherError }: { mood: { label: string; emoji: string; hint: string }; moodNote: string; quoteBundle: { quote: QuoteCard; palette: CardVisual; backgroundUrl: string; date: string }; quoteOffset: number; setQuoteOffset: React.Dispatch<React.SetStateAction<number>>; completion: number; totalFocus: number; weather: WeatherDay[]; weatherError: string }) {
  const quoteDate = new Date(`${quoteBundle.date}T00:00:00`);
  return (
    <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-white/55 bg-white/55 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl lg:p-8">
      <div className="absolute right-8 top-8 h-40 w-40 rounded-full bg-[var(--accent)] opacity-20 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-stretch">
        <div>
          <p className="mb-3 inline-flex rounded-full bg-white/75 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">{mood.emoji} 今日状态：{mood.label}</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">孙瑜的工作生活面板</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">把工作推进、生活照料和成长记录放在同一个安静有质感的空间里。数据保存在本地浏览器，打开即可继续。</p>
          {moodNote && <p className="mt-4 inline-flex rounded-full bg-white/85 px-4 py-2 text-sm text-slate-600 shadow-sm">今天想对自己说：{moodNote}</p>}
          <QuoteCalendarCard quoteBundle={quoteBundle} quoteDate={quoteDate} quoteOffset={quoteOffset} setQuoteOffset={setQuoteOffset} moodHint={mood.hint} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Metric label="今日待办完成" value={`${completion}%`} />
          <Metric label="累计专注" value={`${totalFocus} min`} />
          <WeatherPreviewCard weather={weather} error={weatherError} />
        </div>
      </div>
    </section>
  );
}

function QuoteCalendarCard({ quoteBundle, quoteDate, quoteOffset, setQuoteOffset, moodHint }: { quoteBundle: { quote: QuoteCard; palette: CardVisual; backgroundUrl: string; date: string }; quoteDate: Date; quoteOffset: number; setQuoteOffset: React.Dispatch<React.SetStateAction<number>>; moodHint: string }) {
  return (
    <div className={`relative mt-6 overflow-hidden rounded-[2rem] border ${quoteBundle.palette.borderClass} shadow-xl`}>
      <div className="absolute inset-0 bg-cover bg-center opacity-75" style={{ backgroundImage: `url(${quoteBundle.backgroundUrl})`, filter: `hue-rotate(${quoteBundle.palette.hueRotate}deg) saturate(1.05)` }} />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.22),rgba(15,23,42,0.06))]" />
      <div className={`absolute inset-0 bg-gradient-to-br ${quoteBundle.palette.overlay} opacity-65`} />
      <div className="absolute left-6 top-4 flex gap-2"><span className="h-3 w-3 rounded-full bg-white/60" /><span className="h-3 w-3 rounded-full bg-white/60" /><span className="h-3 w-3 rounded-full bg-white/60" /></div>
      <div className="absolute right-6 top-5 rounded-full bg-white/18 px-3 py-1 text-xs text-white/85 backdrop-blur-sm">Free Vintage Illustrations</div>
      <div className="relative p-6 lg:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${quoteBundle.palette.mutedClass}`}>Daily Quote Calendar</p>
            <div className={`mt-3 flex items-end gap-3 ${quoteBundle.palette.inkClass}`}>
              <span className="text-6xl font-semibold leading-none">{quoteDate.getDate()}</span>
              <div className="pb-1">
                <p className="text-sm">{quoteDate.toLocaleDateString('zh-CN', { month: 'long' })}</p>
                <p className={`text-sm ${quoteBundle.palette.mutedClass}`}>{quoteDate.toLocaleDateString('zh-CN', { weekday: 'long' })}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setQuoteOffset((current) => current + 1)} className={`rounded-full px-3 py-2 text-sm transition ${quoteBundle.palette.actionClass}`}>查看前一天</button>
            <button type="button" disabled={quoteOffset === 0} onClick={() => setQuoteOffset((current) => Math.max(current - 1, 0))} className={`rounded-full px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${quoteBundle.palette.actionClass}`}>回到今天</button>
          </div>
        </div>
        <div className="mt-8 rounded-[1.8rem] border border-white/12 bg-white/10 px-6 py-7 backdrop-blur-sm">
          <p className={`text-3xl font-medium leading-[1.6] lg:text-4xl ${quoteBundle.palette.inkClass}`}>“{quoteBundle.quote.text}”</p>
          <div className="mt-6 flex items-center justify-between gap-4">
            <p className={`text-sm ${quoteBundle.palette.mutedClass}`}>—— {quoteBundle.quote.source}</p>
            <p className={`text-sm ${quoteBundle.palette.mutedClass}`}>{moodHint}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeatherPreviewCard({ weather, error }: { weather: WeatherDay[]; error: string }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">上海 · 杨浦区</p>
          <h3 className="mt-1 text-2xl font-semibold text-slate-950">未来 7 天天气</h3>
        </div>
        <span className="rounded-full bg-slate-950/5 px-3 py-1 text-xs text-slate-500">3 条可见 · 滚动浏览</span>
      </div>
      {error ? <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</p> : <PreviewViewport className="mt-4" heightClass="max-h-[15rem]">{weather.map((day) => <WeatherDayCard key={day.date} day={day} />)}</PreviewViewport>}
    </div>
  );
}

function WeatherDayCard({ day }: { day: WeatherDay }) {
  return (
    <div className="rounded-2xl bg-slate-950/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{weatherIcon(day.code)}</span>
          <div>
            <p className="font-medium text-slate-900">{formatDateLabel(day.date)}</p>
            <p className="text-sm text-slate-500">{weatherText(day.code)}</p>
          </div>
        </div>
        <p className="text-sm font-semibold text-slate-800">{day.min}° / {day.max}°</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-white px-2 py-1">风力 {windLevel(day.windSpeed)}</span>
        <span className="rounded-full bg-white px-2 py-1">最大风速 {day.windSpeed} km/h</span>
        <span className="rounded-full bg-white px-2 py-1">降雨概率 {day.precipitation}%</span>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p></div>;
}

function Card({ title, eyebrow, action, onAction, children }: { title: string; eyebrow: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return <section className="flex h-full flex-col rounded-[1.75rem] border border-white/60 bg-white/70 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl"><div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs font-bold tracking-[0.25em] text-[var(--accent-strong)]">{eyebrow}</p><h2 className="mt-1 text-2xl font-semibold text-slate-950">{title}</h2></div>{action && onAction ? <button type="button" onClick={onAction} className="rounded-full bg-white/85 px-3 py-1 text-xs text-[var(--accent-strong)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white">{action}</button> : action ? <span className="rounded-full bg-slate-950/5 px-3 py-1 text-xs text-slate-500">{action}</span> : null}</div><div className="flex-1">{children}</div></section>;
}

function MoodModal({ defaultMood, defaultNote, onConfirm }: { defaultMood: MoodKey; defaultNote: string; onConfirm: (key: MoodKey, note: string) => void }) {
  const [selectedMood, setSelectedMood] = useState<MoodKey>(defaultMood);
  const [note, setNote] = useState(defaultNote);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-md">
      <div className="max-w-3xl rounded-[2rem] bg-white/92 p-6 shadow-2xl">
        <h2 className="mood-script text-center text-[56px] leading-none text-[var(--accent-strong)] lg:text-[72px]">How do you feel today?</h2>
        <RunningDog />
        <div className="mt-6 grid gap-3 sm:grid-cols-5">
          {(Object.keys(moodThemes) as MoodKey[]).map((key) => {
            const active = selectedMood === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedMood(key)}
                className={`rounded-3xl border p-4 text-center transition hover:-translate-y-1 hover:bg-white hover:shadow-xl ${active ? 'border-[var(--accent-strong)] bg-white shadow-lg' : 'border-slate-200 bg-slate-50'}`}
              >
                <span className="text-3xl">{moodThemes[key].emoji}</span>
                <span className="mt-2 block text-sm font-medium text-slate-700">{moodThemes[key].label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 rounded-3xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">也可以自己写一句</p>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="比如：今天想慢一点，但也想把最重要的事做好。" className="input mt-3 min-h-24 resize-none" />
        </div>
        <div className="mt-5 flex justify-end"><button type="button" onClick={() => onConfirm(selectedMood, note)} className="btn">进入面板</button></div>
      </div>
    </div>
  );
}

function RunningDog() {
  return (
    <div className="dog-track mt-5" aria-hidden="true">
      <div className="dog-runner">
        <svg viewBox="0 0 120 70" className="dog-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="48" cy="38" rx="24" ry="16" fill="#F3B28A" />
          <circle cx="82" cy="24" r="14" fill="#F7C9A8" />
          <ellipse cx="88" cy="22" rx="3.5" ry="4.5" fill="#1F2937" />
          <ellipse cx="77" cy="44" rx="5" ry="4" fill="#8B5E3C" />
          <path d="M95 10C101 6 107 10 106 18C101 18 98 16 95 10Z" fill="#D48B63" />
          <path d="M73 9C69 6 63 8 63 16C67 17 71 15 73 9Z" fill="#D48B63" />
          <path d="M26 35C18 32 12 26 10 17" stroke="#D48B63" strokeWidth="7" strokeLinecap="round" />
          <path d="M34 51L28 64" stroke="#8B5E3C" strokeWidth="6" strokeLinecap="round" />
          <path d="M54 52L48 65" stroke="#8B5E3C" strokeWidth="6" strokeLinecap="round" />
          <path d="M64 52L72 65" stroke="#8B5E3C" strokeWidth="6" strokeLinecap="round" />
          <path d="M84 50L92 63" stroke="#8B5E3C" strokeWidth="6" strokeLinecap="round" />
        </svg>
      </div>
      <span className="dog-ground">········································</span>
    </div>
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
  const toggleTask = (taskId: string) => setAllTasks(allTasks.map((item) => item.id === taskId ? { ...item, done: !item.done } : item));
  const deleteTask = (taskId: string) => setAllTasks(allTasks.filter((item) => item.id !== taskId));
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <BoardPanel title="坚持区" subtitle="累积打卡，自动统计已完成次数">
        <form onSubmit={addHabit} className="mt-4 flex gap-2"><input value={habitText} onChange={(event) => setHabitText(event.target.value)} placeholder="新增一个坚持项目" className="input" /><button className="btn">添加</button></form>
        <PreviewViewport className="mt-4" heightClass="max-h-[10.5rem]">{previewHabits.map((habit) => <div key={habit.id} className="rounded-[1.4rem] bg-slate-950/[0.035] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-slate-900">{habit.title}</p><p className="mt-2 text-xs text-[var(--accent-strong)]">已完成 {habit.completedDates.length} 次</p></div><button type="button" onClick={() => toggleHabitToday(habit.id)} style={habit.completedDates.includes(currentDate) ? { backgroundColor: 'color-mix(in oklab, var(--accent) 18%, white)', color: 'var(--accent-strong)' } : undefined} className="rounded-full px-3 py-1 text-xs text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-white">{habit.completedDates.includes(currentDate) ? '已打卡' : '去打卡'}</button></div></div>)}</PreviewViewport>
        <PreviewHint currentCount={habits.length} />
      </BoardPanel>
      <BoardPanel title="日常区" subtitle="只展示今天的 list，过往日期可查看">
        <form onSubmit={addTask} className="mt-4 flex gap-2"><input value={taskText} onChange={(event) => setTaskText(event.target.value)} placeholder="新增一个事项" className="input" /><button className="btn">添加</button></form>
        <PreviewViewport className="mt-4" heightClass="max-h-[10.5rem]">{previewTasks.map((task) => <label key={task.id} className="group flex items-center gap-3 rounded-[1.4rem] bg-slate-950/[0.035] p-4"><input checked={task.done} onChange={() => toggleTask(task.id)} type="checkbox" className="h-5 w-5 accent-[var(--accent-strong)]" /><span className={`flex-1 text-sm ${task.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</span><button type="button" onClick={() => deleteTask(task.id)} className="text-xs text-slate-300 opacity-0 transition group-hover:opacity-100">删除</button></label>)}</PreviewViewport>
        <PreviewHint currentCount={todayTasks.length} />
      </BoardPanel>
    </div>
  );
}

function BoardPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <div className="rounded-[1.6rem] bg-white/78 p-5 shadow-sm"><div><p className="text-base font-semibold text-slate-900">{title}</p><p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p></div>{children}</div>;
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
  return <div><form onSubmit={add} className="flex gap-2"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="新增项目" /><button className="btn">添加</button></form><PreviewViewport className="mt-4" heightClass="max-h-[16rem]">{previewProjects.map((project) => <div key={project.id} className="rounded-3xl bg-slate-950/[0.035] p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"><div className="flex justify-between gap-3"><button type="button" onClick={() => onOpen(project.id)} className="flex-1 text-left"><p className="font-semibold text-slate-900">{project.name}</p><p className="text-sm text-slate-500">{project.stage} · 下一步：{project.next}</p><p className="mt-2 text-xs text-slate-400">点击展开填写步骤并打勾完成</p></button><div className="flex flex-col items-end gap-2"><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">{project.progress}%</span><button type="button" onClick={() => setProjects((items) => items.filter((item) => item.id !== project.id))} className="text-xs text-slate-400 transition hover:text-rose-500">删除项目</button></div></div></div>)}</PreviewViewport><PreviewHint currentCount={projects.length} /></div>;
}

function FocusNotebookPanel({ book, setBook, logs, setLogs, entries, seconds, setSeconds, running, setRunning, currentDate, visual, backgroundUrl }: { book: FocusNotebook; setBook: React.Dispatch<React.SetStateAction<FocusNotebook>>; logs: FocusLog[]; setLogs: React.Dispatch<React.SetStateAction<FocusLog[]>>; entries: FocusEntry[]; seconds: number; setSeconds: React.Dispatch<React.SetStateAction<number>>; running: boolean; setRunning: React.Dispatch<React.SetStateAction<boolean>>; currentDate: string; visual: CardVisual; backgroundUrl: string }) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const sec = (seconds % 60).toString().padStart(2, '0');
  const previewLogs = logs.slice(0, MAX_CARD_RECORDS);
  const previewEntries = entries.slice(0, MAX_CARD_RECORDS);
  const updateBook = (patch: Partial<FocusNotebook>) => setBook({ ...book, ...patch });
  const record = () => {
    const topic = book.currentTopic.trim();
    if (!topic) return;
    const latest = logs[0];
    if (latest && latest.title === topic && latest.date === currentDate) {
      setLogs(logs.map((item, index) => (index === 0 ? { ...item, minutes: item.minutes + 25 } : item)));
      return;
    }
    setLogs([{ id: uid(), title: topic, minutes: 25, date: currentDate }, ...logs]);
  };
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <NotebookPage title="左页 · 当下专注" subtitle="左页主题是唯一 key，主题不变就持续覆盖更新。" visual={visual} backgroundUrl={backgroundUrl}>
          <label className="block text-xs text-slate-500">此刻主题</label>
          <input value={book.currentTopic} onChange={(event) => updateBook({ currentTopic: event.target.value })} placeholder="写下现在最想专注的事" className="input handwrite-cn mt-2 text-[20px]" style={{ fontFamily: '"Ma Shan Zheng", "Zhi Mang Xing", cursive' }} />
          <label className="mt-4 block text-xs text-slate-500">左页拆解</label>
          <textarea value={book.leftPage} onChange={(event) => updateBook({ leftPage: event.target.value })} placeholder="把任务拆小，像在纸页上慢慢写。" className="handwrite-cn mt-2 min-h-44 w-full resize-none rounded-[1.4rem] border border-amber-100 bg-[#fffdf7]/90 px-4 py-4 text-[20px] outline-none" style={{ fontFamily: '"Ma Shan Zheng", "Zhi Mang Xing", cursive' }} />
        </NotebookPage>
        <NotebookPage title="右页 · 灵感与复盘" subtitle="右页内容自动和左页主题绑定，同主题只更新不新增。" visual={visual} backgroundUrl={backgroundUrl}>
          <label className="block text-xs text-slate-500">右页手记</label>
          <textarea value={book.rightPage} onChange={(event) => updateBook({ rightPage: event.target.value })} placeholder="写下卡住点、临时灵感或结束后的复盘。" className="handwrite-cn mt-2 min-h-[14rem] w-full resize-none rounded-[1.4rem] border border-amber-100 bg-[#fffdf7]/90 px-4 py-4 text-[20px] outline-none" style={{ fontFamily: '"Ma Shan Zheng", "Zhi Mang Xing", cursive' }} />
        </NotebookPage>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.8rem] bg-white/75 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">Timer & Record</p>
          <div className="mt-4 rounded-[1.5rem] bg-slate-950 px-5 py-5 text-center text-white shadow-lg shadow-slate-950/10">
            <p className="text-sm text-white/50">番茄钟</p>
            <p className="mt-2 text-5xl font-semibold tabular-nums">{minutes}:{sec}</p>
            <div className="mt-4 flex justify-center gap-2">
              <button type="button" onClick={() => setRunning(!running)} className="btn light">{running ? '暂停' : '开始'}</button>
              <button type="button" onClick={() => { setRunning(false); setSeconds(25 * 60); }} className="btn ghost">重置</button>
              <button type="button" onClick={record} className="btn">记录</button>
            </div>
          </div>
          <div className="mt-4 rounded-[1.5rem] bg-slate-950/[0.035] p-4">
            <p className="text-sm font-semibold text-slate-900">最近专注时长</p>
            <PreviewViewport className="mt-3" heightClass="max-h-[9rem]">{previewLogs.map((log) => <p key={log.id} className="rounded-2xl bg-white/85 px-3 py-2 text-sm text-slate-600">{formatDateLabel(log.date)} · {log.title} · {log.minutes}min</p>)}</PreviewViewport>
            <PreviewHint currentCount={logs.length} />
          </div>
        </div>
        <div className="rounded-[1.8rem] bg-white/75 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]">History Preview</p>
          <p className="mt-2 text-sm text-slate-500">支持按日期和主题查看历史记录，主题相同只更新这一条。</p>
          <PreviewViewport className="mt-4" heightClass="max-h-[18rem]">
            {previewEntries.map((entry) => (
              <div key={entry.id} className="rounded-[1.4rem] bg-slate-950/[0.035] p-4">
                <p className="font-medium text-slate-900">{entry.topic}</p>
                <p className="mt-1 text-xs text-slate-500">{formatDateLabel(entry.date)}</p>
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">左页：{entry.leftPage}</p>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">右页：{entry.rightPage}</p>
              </div>
            ))}
          </PreviewViewport>
          <PreviewHint currentCount={entries.length} />
        </div>
      </div>
    </div>
  );
}

function NotebookPage({ title, subtitle, visual, backgroundUrl, children }: { title: string; subtitle: string; visual: CardVisual; backgroundUrl: string; children: React.ReactNode }) {
  return <div className="notebook-page relative overflow-hidden rounded-[2rem] px-5 py-5 shadow-inner shadow-amber-100/40"><div className="absolute inset-0 bg-cover bg-center opacity-14" style={{ backgroundImage: `url(${backgroundUrl})`, filter: `hue-rotate(${visual.hueRotate}deg)` }} /><div className={`absolute inset-0 bg-gradient-to-br ${visual.overlay} opacity-10`} /><div className="relative"><div className="mb-4 border-b border-amber-100/80 pb-4"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700/75">Focus Spread</p><h3 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p></div>{children}</div></div>;
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
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{topics.map((topic) => <button key={topic} type="button" onClick={() => setSelectedTopic(topic)} className={`rounded-full px-3 py-2 text-sm whitespace-nowrap transition ${selectedTopic === topic ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>{topic}</button>)}</div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <ViewerItem title="左页内容" body={currentEntry?.leftPage || book.leftPage} meta={`主题：${currentEntry?.topic || book.currentTopic}`} />
        <ViewerItem title="右页内容" body={currentEntry?.rightPage || book.rightPage} meta={currentEntry ? formatDateLabel(currentEntry.date) : '当前内容'} />
      </div>
      <div className="mt-5 space-y-3">{logs.map((log) => <ViewerItem key={log.id} title={log.title} meta={`${formatDateLabel(log.date)} · ${log.minutes}min`} />)}</div>
    </div>
  );
}

function DiaryPanel({ diaries, setDiaries, currentDate }: { diaries: Diary[]; setDiaries: React.Dispatch<React.SetStateAction<Diary[]>>; currentDate: string }) {
  const [content, setContent] = useState('');
  const previewDiaries = diaries.slice(0, MAX_CARD_RECORDS);
  const add = () => { if (!content.trim()) return; setDiaries([{ id: uid(), title: '今天的小成功', content: content.trim(), date: currentDate }, ...diaries]); setContent(''); };
  return <div><textarea className="input min-h-24 resize-none" value={content} onChange={(e) => setContent(e.target.value)} placeholder="写下今天做成的一件小事" /><button type="button" onClick={add} className="btn mt-2 w-full">存入日记</button><PreviewViewport className="mt-4" heightClass="max-h-[10rem]">{previewDiaries.map((diary) => <article key={diary.id} className="rounded-3xl bg-slate-950/[0.035] p-4"><p className="text-xs text-slate-400">{formatDateLabel(diary.date)}</p><p className="mt-1 font-medium text-slate-800">{diary.content}</p></article>)}</PreviewViewport><PreviewHint currentCount={diaries.length} /></div>;
}

function WorkoutPanel({ workouts, setWorkouts, summary, goalWeight, setGoalWeight, currentDate }: { workouts: Workout[]; setWorkouts: React.Dispatch<React.SetStateAction<Workout[]>>; summary: WorkoutSummary; goalWeight: number; setGoalWeight: React.Dispatch<React.SetStateAction<number>>; currentDate: string }) {
  const [type, setType] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [weight, setWeight] = useState(summary.todayWeight ? String(summary.todayWeight) : '');
  const addWorkout = (event: FormEvent) => { event.preventDefault(); if (!type.trim()) return; setWorkouts([...workouts, { id: uid(), type: type.trim(), minutes: Number(minutes), weight: weight ? Number(weight) : undefined, date: currentDate }]); setType(''); setMinutes('30'); };
  return <div className="grid gap-4"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr]"><div className="rounded-[1.5rem] bg-slate-950/[0.035] p-4"><p className="text-sm text-slate-500">目标体重</p><div className="mt-3 flex items-center gap-3"><input type="number" value={goalWeight} onChange={(event) => setGoalWeight(Number(event.target.value) || 0)} className="input max-w-[8rem]" /><span className="text-sm text-slate-500">kg</span></div><p className="mt-4 text-base text-slate-700">距离理想体重还有 <span className="font-semibold text-[var(--accent-strong)]">{summary.distance.toFixed(1)}kg</span></p></div><div className="rounded-[1.5rem] bg-slate-950/[0.035] p-4"><p className="text-sm text-slate-500">体重记录</p><p className="mt-3 text-2xl font-semibold text-slate-950">今天体重是：{summary.todayWeight ? `${summary.todayWeight}kg` : '待记录'}</p><MiniBars bars={summary.weightBars} unit="kg" color="var(--accent-strong)" emptyText="还没有足够的体重记录" /></div></div><div className="rounded-[1.5rem] bg-white/72 p-4 shadow-sm"><div className="flex flex-wrap items-center gap-3"><InfoChip label={`${summary.activeDays}天`} /><InfoChip label={`${summary.totalSessions}次运动`} /><InfoChip label={`${summary.totalMinutes}分钟`} /></div><form onSubmit={addWorkout} className="mt-4 grid gap-2 sm:grid-cols-[1fr_120px_120px_auto]"><input className="input" value={type} onChange={(e) => setType(e.target.value)} placeholder="新增运动记录" /><input className="input" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="分钟" /><input className="input" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="体重kg" /><button className="btn">记录</button></form><div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]"><div><p className="text-sm font-semibold text-slate-900">按天记录</p><PreviewViewport className="mt-3" heightClass="max-h-[10rem]">{summary.dayGroups.map((item) => <div key={item.date} className="rounded-2xl bg-slate-950/[0.035] p-3"><div className="flex items-center justify-between gap-3"><p className="font-medium text-slate-900">{formatDateLabel(item.date)}</p><span className="text-sm text-slate-500">{item.minutes} 分钟</span></div><p className="mt-1 text-xs text-slate-500">{item.count} 次运动记录</p></div>)}</PreviewViewport></div><div><p className="text-sm font-semibold text-slate-900">按周累计小图表</p><MiniBars bars={summary.weeklyBars} unit="min" color="var(--accent-strong)" emptyText="还没有足够的运动记录" /></div></div></div></div>;
}

function BookPanel({ notes, setNotes, currentDate, recommendation }: { notes: BookNote[]; setNotes: React.Dispatch<React.SetStateAction<BookNote[]>>; currentDate: string; recommendation: { title: string; author: string; tagline: string; reason: string } }) {
  const [book, setBook] = useState('');
  const [note, setNote] = useState('');
  const previewNotes = notes.slice(0, MAX_CARD_RECORDS);
  const add = () => { if (!book.trim() || !note.trim()) return; setNotes([{ id: uid(), book, note, link: WEREAD_URL, date: currentDate }, ...notes]); setBook(''); setNote(''); };
  return <div className="grid gap-4"><div className="rounded-[1.5rem] bg-slate-950/[0.035] p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-slate-900">每日好书推荐</p><p className="mt-1 text-xs text-slate-500">支持联动到微信读书登录版继续阅读</p></div><a href={WEREAD_URL} target="_blank" rel="noreferrer" className="rounded-full bg-white/85 px-3 py-1 text-xs text-[var(--accent-strong)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white">打开微信读书登录版</a></div><div className="mt-4 rounded-[1.4rem] bg-white/85 p-4"><p className="text-lg font-semibold text-slate-900">{recommendation.title}</p><p className="text-sm text-slate-500">{recommendation.author} · {recommendation.tagline}</p><p className="mt-3 text-sm leading-7 text-slate-600">{recommendation.reason}</p></div></div><div className="grid gap-2"><input className="input" value={book} onChange={(e) => setBook(e.target.value)} placeholder="书名" /><textarea className="input min-h-20 resize-none" value={note} onChange={(e) => setNote(e.target.value)} placeholder="摘抄或想法" /><button type="button" onClick={add} className="btn">添加笔记</button></div><PreviewViewport className="mt-0" heightClass="max-h-[10rem]">{previewNotes.map((item) => <article key={item.id} className="rounded-3xl bg-slate-950/[0.035] p-4"><div className="flex justify-between gap-3"><p className="font-medium text-slate-900">{item.book}</p><a href={item.link || WEREAD_URL} target="_blank" rel="noreferrer" className="text-sm text-[var(--accent-strong)]">微信读书</a></div><p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p></article>)}</PreviewViewport><PreviewHint currentCount={notes.length} /></div>;
}

function MarketPanel({ indices, error }: { indices: MarketIndex[]; error: string }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{indices.length ? indices.map((item) => { const up = Number(item.change) >= 0; return <div key={item.code} className="rounded-3xl bg-slate-950/[0.035] p-4"><p className="text-sm text-slate-500">{item.name}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{item.price}</p><p className={`mt-1 text-sm ${up ? 'text-rose-500' : 'text-emerald-600'}`}>{up ? '+' : ''}{item.change} · {item.percent}%</p></div>; }) : <p className="col-span-3 rounded-2xl bg-slate-950/[0.035] p-4 text-slate-500">正在加载指数行情…</p>}{error && <p className="col-span-3 text-xs text-amber-600">{error}</p>}</div>;
}

function StockDiaryPanel({ notes, setNotes, currentDate }: { notes: StockNote[]; setNotes: React.Dispatch<React.SetStateAction<StockNote[]>>; currentDate: string }) {
  const [symbol, setSymbol] = useState('');
  const [thought, setThought] = useState('');
  const grouped = notes.reduce<Record<string, StockNote[]>>((acc, item) => { acc[item.symbol] = [...(acc[item.symbol] || []), item]; return acc; }, {});
  const groupedEntries = Object.entries(grouped).slice(0, MAX_CARD_RECORDS);
  const add = () => { if (!symbol.trim() || !thought.trim()) return; setNotes([{ id: uid(), symbol: symbol.trim(), action: '观察', thought: thought.trim(), date: currentDate }, ...notes]); setSymbol(''); setThought(''); };
  return <div><div className="grid gap-2 sm:grid-cols-[0.5fr_1fr_auto]"><input className="input" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="标的" /><input className="input" value={thought} onChange={(e) => setThought(e.target.value)} placeholder="交易想法/复盘" /><button type="button" onClick={add} className="btn">记录</button></div><PreviewViewport className="mt-4" heightClass="max-h-[12rem]">{groupedEntries.map(([key, items]) => <div key={key} className="rounded-3xl bg-slate-950/[0.035] p-4"><p className="font-semibold text-slate-900">{key}</p>{items.slice(0, 2).map((item) => <p key={item.id} className="mt-2 text-sm leading-6 text-slate-600">{formatDateLabel(item.date)} · {item.thought}</p>)}</div>)}</PreviewViewport><PreviewHint currentCount={Object.keys(grouped).length} /></div>;
}

function SnapshotPanel({ recommendation }: { recommendation: { title: string; author: string; tagline: string; reason: string } }) {
  return <div className="grid h-full content-start gap-4"><div className="rounded-[1.5rem] bg-slate-950/[0.035] p-4"><p className="text-sm font-semibold text-slate-900">今日阅读提示</p><p className="mt-3 text-lg font-semibold text-slate-900">{recommendation.title}</p><p className="mt-1 text-sm text-slate-500">{recommendation.author} · {recommendation.tagline}</p><p className="mt-3 text-sm leading-7 text-slate-600">{recommendation.reason}</p><a href={WEREAD_URL} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full bg-white/85 px-3 py-1 text-xs text-[var(--accent-strong)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white">去微信读书看看</a></div><div className="rounded-[1.5rem] bg-slate-950/[0.035] p-4"><p className="text-sm font-semibold text-slate-900">市场观察</p><p className="mt-3 text-sm leading-7 text-slate-600">先看指数，再看日记，把情绪和判断分开记录，更容易看清自己的交易节奏。</p></div></div>;
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

function InfoChip({ label }: { label: string }) {
  return <span className="rounded-full bg-white px-3 py-1 text-sm text-slate-700 shadow-sm">{label}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">{text}</p>;
}

function BookViewerModal({ title, visual, backgroundUrl, children, onClose }: { title: string; visual: CardVisual; backgroundUrl: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-md"><div className="relative w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/40 bg-[#fffdf8] p-6 shadow-2xl"><div className="absolute inset-0 bg-cover bg-center opacity-12" style={{ backgroundImage: `url(${backgroundUrl})`, filter: `hue-rotate(${visual.hueRotate}deg)` }} /><div className={`absolute inset-0 bg-gradient-to-br ${visual.overlay} opacity-6`} /><div className="absolute left-[3.35rem] top-0 h-full w-px bg-rose-200/70" /><div className="relative"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold tracking-[0.22em] text-slate-400">PAPER VIEW</p><h3 className="mt-1 text-2xl font-semibold text-slate-950">{title}</h3></div><button type="button" onClick={onClose} className="rounded-full bg-white/90 px-4 py-2 text-sm text-[var(--accent-strong)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white">关闭</button></div><div className="mt-5 max-h-[72vh] overflow-y-auto pr-1">{children}</div></div></div></div>;
}

function ProjectStepsModal({ project, visual, backgroundUrl, onClose, onToggle, onDelete, onAdd }: { project: Project; visual: CardVisual; backgroundUrl: string; onClose: () => void; onToggle: (stepId: string) => void; onDelete: (stepId: string) => void; onAdd: (title: string) => void }) {
  const [text, setText] = useState('');
  const submit = (event: FormEvent) => { event.preventDefault(); if (!text.trim()) return; onAdd(text.trim()); setText(''); };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-md"><div className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/40 bg-[#fffdf8] p-6 shadow-2xl"><div className="absolute inset-0 bg-cover bg-center opacity-12" style={{ backgroundImage: `url(${backgroundUrl})`, filter: `hue-rotate(${visual.hueRotate}deg)` }} /><div className={`absolute inset-0 bg-gradient-to-br ${visual.overlay} opacity-6`} /><div className="relative"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold tracking-[0.22em] text-slate-400">PROJECT STEPS</p><h3 className="mt-1 text-2xl font-semibold text-slate-950">{project.name}</h3><p className="mt-2 text-sm text-slate-500">下一步：{project.next}</p></div><button type="button" onClick={onClose} className="rounded-full bg-white/90 px-4 py-2 text-sm text-[var(--accent-strong)] shadow-sm transition hover:-translate-y-0.5 hover:bg-white">关闭</button></div><form onSubmit={submit} className="mt-5 flex gap-2"><input value={text} onChange={(event) => setText(event.target.value)} placeholder="补充这一步要做什么" className="input" /><button className="btn">添加步骤</button></form><div className="mt-5 max-h-[60vh] space-y-3 overflow-y-auto pr-1">{(project.steps || []).map((step) => <div key={step.id} className="flex items-center gap-3 rounded-2xl bg-slate-950/[0.035] p-4"><input checked={step.done} onChange={() => onToggle(step.id)} type="checkbox" className="h-5 w-5 accent-[var(--accent-strong)]" /><span className={`flex-1 ${step.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{step.title}</span><button type="button" onClick={() => onDelete(step.id)} className="text-xs text-slate-400 transition hover:text-rose-500">删除</button></div>)}</div></div></div></div>;
}

function ViewerItem({ title, meta, body, extra }: { title: string; meta?: string; body?: string; extra?: React.ReactNode }) {
  return <article className="rounded-3xl bg-slate-950/[0.035] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{title}</p>{meta && <p className="mt-1 text-sm text-slate-500">{meta}</p>}</div>{extra}</div>{body && <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>}</article>;
}
