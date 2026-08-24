import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import calendarArt from './assets/french-calendar-art.svg';
import {
  defaultBookNotes,
  defaultDiaries,
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
} from './data';
import { useLocalStorage, useTodayKey } from './hooks';
import { fetchMarketIndices, fetchYangpuWeather, weatherIcon, weatherText, windLevel } from './services';
import type {
  BookNote,
  DailyTask,
  Diary,
  FocusLog,
  FocusNotebook,
  Habit,
  MarketIndex,
  MoodKey,
  Project,
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
  {
    overlay: 'from-slate-950/78 via-slate-900/68 to-slate-800/70',
    inkClass: 'text-white',
    mutedClass: 'text-white/72',
    borderClass: 'border-white/30',
    actionClass: 'bg-white/12 text-white hover:bg-white/20',
    hueRotate: -8,
  },
  {
    overlay: 'from-amber-50/82 via-orange-50/74 to-rose-50/78',
    inkClass: 'text-slate-900',
    mutedClass: 'text-slate-600',
    borderClass: 'border-amber-200/65',
    actionClass: 'bg-slate-950/6 text-slate-700 hover:bg-slate-950/10',
    hueRotate: 12,
  },
  {
    overlay: 'from-emerald-950/74 via-teal-900/66 to-cyan-900/68',
    inkClass: 'text-white',
    mutedClass: 'text-white/70',
    borderClass: 'border-white/25',
    actionClass: 'bg-white/12 text-white hover:bg-white/20',
    hueRotate: 78,
  },
  {
    overlay: 'from-rose-950/72 via-fuchsia-950/58 to-orange-900/60',
    inkClass: 'text-white',
    mutedClass: 'text-white/70',
    borderClass: 'border-white/25',
    actionClass: 'bg-white/12 text-white hover:bg-white/20',
    hueRotate: 146,
  },
];

type ViewerKey = 'workBoard' | 'lifeBoard' | 'projects' | 'focus' | 'diaries' | 'workouts' | 'bookNotes' | 'stockNotes' | null;

const MAX_CARD_RECORDS = 10;
const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const today = () => new Date().toISOString().slice(0, 10);

export default function App() {
  const todayKey = useTodayKey('sunyu-mood');
  const currentDate = useMemo(() => today(), []);
  const [mood, setMood] = useLocalStorage<MoodKey>('sunyu-dashboard-mood', 'focused');
  const [moodNote, setMoodNote] = useLocalStorage<string>('sunyu-dashboard-mood-note', '');
  const [moodSelectedToday, setMoodSelectedToday] = useLocalStorage<boolean>(todayKey, false);

  const [workHabits, setWorkHabits] = useLocalStorage<Habit[]>('sunyu-work-habits', defaultWorkHabits);
  const [lifeHabits, setLifeHabits] = useLocalStorage<Habit[]>('sunyu-life-habits', defaultLifeHabits);
  const [workDailyTasks, setWorkDailyTasks] = useLocalStorage<DailyTask[]>('sunyu-work-daily-tasks', defaultWorkDailyTasks);
  const [lifeDailyTasks, setLifeDailyTasks] = useLocalStorage<DailyTask[]>('sunyu-life-daily-tasks', defaultLifeDailyTasks);

  const [projects, setProjects] = useLocalStorage<Project[]>('sunyu-projects', defaultProjects);
  const [focusLogs, setFocusLogs] = useLocalStorage<FocusLog[]>('sunyu-focus-logs', defaultFocusLogs);
  const [focusNotebook, setFocusNotebook] = useLocalStorage<FocusNotebook>('sunyu-focus-notebook', defaultFocusNotebook);
  const [diaries, setDiaries] = useLocalStorage<Diary[]>('sunyu-diaries', defaultDiaries);
  const [workouts, setWorkouts] = useLocalStorage<Workout[]>('sunyu-workouts', defaultWorkouts);
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

  const workTodayTasks = useMemo(() => workDailyTasks.filter((item) => item.date === currentDate), [workDailyTasks, currentDate]);
  const lifeTodayTasks = useMemo(() => lifeDailyTasks.filter((item) => item.date === currentDate), [lifeDailyTasks, currentDate]);
  const quoteBundle = useMemo(() => getQuoteBundle(shiftDate(currentDate, -quoteOffset)), [currentDate, quoteOffset]);
  const completion = useMemo(() => getCompletionRate(workHabits, workTodayTasks, currentDate), [workHabits, workTodayTasks, currentDate]);
  const totalFocus = focusLogs.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
  const latestWeights = workouts.filter((item) => item.weight).slice(-7);

  useEffect(() => {
    fetchYangpuWeather().then(setWeather).catch((err) => setWeatherError((err as Error).message));
    fetchMarketIndices().then(setIndices).catch((err) => setMarketError((err as Error).message));
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setTimerSeconds((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    if (timerSeconds === 0 && timerRunning) setTimerRunning(false);
  }, [timerSeconds, timerRunning]);

  const selectMood = (key: MoodKey, note: string) => {
    setMood(key);
    setMoodNote(note.trim());
    setMoodSelectedToday(true);
  };

  const viewerMeta = getViewerMeta(viewer, {
    currentDate,
    workHabits,
    lifeHabits,
    workDailyTasks,
    lifeDailyTasks,
    projects,
    focusLogs,
    focusNotebook,
    diaries,
    workouts,
    bookNotes,
    stockNotes,
  });

  return (
    <main className={`min-h-screen ${moodThemes[mood].className}`}>
      {!moodSelectedToday && <MoodModal defaultMood={mood} defaultNote={moodNote} onConfirm={selectMood} />}
      {viewerMeta && (
        <RecordViewerModal title={viewerMeta.title} onClose={() => setViewer(null)}>
          {viewerMeta.content}
        </RecordViewerModal>
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

        <section className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
          <Card title="今日待办" eyebrow="WORK" action="查看过往" onAction={() => setViewer('workBoard')}>
            <TodoBoard
              area="work"
              habits={workHabits}
              setHabits={setWorkHabits}
              todayTasks={workTodayTasks}
              allTasks={workDailyTasks}
              setAllTasks={setWorkDailyTasks}
              currentDate={currentDate}
            />
          </Card>
          <Card title="项目进展" eyebrow="PROJECTS" action="点击查看" onAction={() => setViewer('projects')}>
            <ProjectPanel projects={projects} setProjects={setProjects} />
          </Card>
        </section>

        <section className="mt-5">
          <Card title="专注本" eyebrow="FOCUS NOTEBOOK" action="点击查看" onAction={() => setViewer('focus')}>
            <FocusNotebookPanel
              book={focusNotebook}
              setBook={setFocusNotebook}
              logs={focusLogs}
              setLogs={setFocusLogs}
              seconds={timerSeconds}
              setSeconds={setTimerSeconds}
              running={timerRunning}
              setRunning={setTimerRunning}
              currentDate={currentDate}
            />
          </Card>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
          <Card title="成功日记本" eyebrow="WIN LOG" action="给努力留证据 · 点击查看" onAction={() => setViewer('diaries')}>
            <DiaryPanel diaries={diaries} setDiaries={setDiaries} currentDate={currentDate} />
          </Card>
          <Card title="生活待办区" eyebrow="LIFE" action="查看过往" onAction={() => setViewer('lifeBoard')}>
            <TodoBoard
              area="life"
              habits={lifeHabits}
              setHabits={setLifeHabits}
              todayTasks={lifeTodayTasks}
              allTasks={lifeDailyTasks}
              setAllTasks={setLifeDailyTasks}
              currentDate={currentDate}
            />
          </Card>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.05fr]">
          <Card title="运动记录区" eyebrow="HEALTH" action="点击查看" onAction={() => setViewer('workouts')}>
            <WorkoutPanel workouts={workouts} setWorkouts={setWorkouts} weights={latestWeights} currentDate={currentDate} />
          </Card>
          <Card title="读书笔记区" eyebrow="READING" action="点击查看" onAction={() => setViewer('bookNotes')}>
            <BookPanel notes={bookNotes} setNotes={setBookNotes} currentDate={currentDate} />
          </Card>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_1fr]">
          <Card title="炒股日记" eyebrow="INVEST" action="点击查看" onAction={() => setViewer('stockNotes')}>
            <StockDiaryPanel notes={stockNotes} setNotes={setStockNotes} currentDate={currentDate} />
          </Card>
          <Card title="今日股市指数" eyebrow="MARKET" action="真实行情">
            <MarketPanel indices={indices} error={marketError} />
          </Card>
        </section>
      </div>
    </main>
  );
}

function getCompletionRate(habits: Habit[], dailyTasks: DailyTask[], currentDate: string) {
  const total = habits.length + dailyTasks.length;
  if (!total) return 0;
  const completedHabits = habits.filter((item) => item.completedDates.includes(currentDate)).length;
  const completedDaily = dailyTasks.filter((item) => item.done).length;
  return Math.round(((completedHabits + completedDaily) / total) * 100);
}

function getQuoteBundle(date: string) {
  const index = hashDate(date) % quoteCards.length;
  const palette = quotePalettes[index % quotePalettes.length];
  return {
    quote: quoteCards[index],
    palette,
    date,
  };
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
  return new Date(`${date}T00:00:00`).toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  });
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
    projects: Project[];
    focusLogs: FocusLog[];
    focusNotebook: FocusNotebook;
    diaries: Diary[];
    workouts: Workout[];
    bookNotes: BookNote[];
    stockNotes: StockNote[];
  },
) {
  switch (viewer) {
    case 'workBoard':
      return {
        title: '今日待办 · 过往 list',
        content: <TodoHistoryViewer areaLabel="工作" habits={data.workHabits} tasks={data.workDailyTasks} currentDate={data.currentDate} />,
      };
    case 'lifeBoard':
      return {
        title: '生活待办区 · 过往 list',
        content: <TodoHistoryViewer areaLabel="生活" habits={data.lifeHabits} tasks={data.lifeDailyTasks} currentDate={data.currentDate} />,
      };
    case 'projects':
      return {
        title: '项目进展 · 全部记录',
        content: (
          <div className="space-y-3">
            {data.projects.map((project) => (
              <ViewerItem key={project.id} title={project.name} meta={`${project.stage} · ${project.progress}%`} body={`下一步：${project.next}`} />
            ))}
          </div>
        ),
      };
    case 'focus':
      return {
        title: '专注本 · 全部内容',
        content: <FocusViewer book={data.focusNotebook} logs={data.focusLogs} />,
      };
    case 'diaries':
      return {
        title: '成功日记本 · 全部记录',
        content: (
          <div className="space-y-3">
            {data.diaries.map((diary) => (
              <ViewerItem key={diary.id} title={diary.title} meta={formatDateLabel(diary.date)} body={diary.content} />
            ))}
          </div>
        ),
      };
    case 'workouts':
      return {
        title: '运动记录区 · 全部记录',
        content: (
          <div className="space-y-3">
            {data.workouts
              .slice()
              .reverse()
              .map((item) => (
                <ViewerItem
                  key={item.id}
                  title={item.type}
                  meta={`${formatDateLabel(item.date)} · ${item.minutes}min${item.weight ? ` · ${item.weight}kg` : ''}`}
                />
              ))}
          </div>
        ),
      };
    case 'bookNotes':
      return {
        title: '读书笔记区 · 全部记录',
        content: (
          <div className="space-y-3">
            {data.bookNotes.map((item) => (
              <ViewerItem
                key={item.id}
                title={item.book}
                meta={formatDateLabel(item.date)}
                body={item.note}
                extra={
                  item.link ? (
                    <a href={item.link} target="_blank" rel="noreferrer" className="text-sm text-[var(--accent-strong)]">
                      打开链接
                    </a>
                  ) : null
                }
              />
            ))}
          </div>
        ),
      };
    case 'stockNotes':
      return {
        title: '炒股日记 · 全部记录',
        content: (
          <div className="space-y-3">
            {data.stockNotes.map((item) => (
              <ViewerItem key={item.id} title={item.symbol} meta={`${formatDateLabel(item.date)} · ${item.action}`} body={item.thought} />
            ))}
          </div>
        ),
      };
    default:
      return null;
  }
}

function Hero({
  mood,
  moodNote,
  quoteBundle,
  quoteOffset,
  setQuoteOffset,
  completion,
  totalFocus,
  weather,
  weatherError,
}: {
  mood: { label: string; emoji: string; hint: string };
  moodNote: string;
  quoteBundle: { quote: QuoteCard; palette: (typeof quotePalettes)[number]; date: string };
  quoteOffset: number;
  setQuoteOffset: React.Dispatch<React.SetStateAction<number>>;
  completion: number;
  totalFocus: number;
  weather: WeatherDay[];
  weatherError: string;
}) {
  const quoteDate = new Date(`${quoteBundle.date}T00:00:00`);

  return (
    <section className="relative mb-6 overflow-hidden rounded-[2rem] border border-white/55 bg-white/55 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl lg:p-8">
      <div className="absolute right-8 top-8 h-40 w-40 rounded-full bg-[var(--accent)] opacity-20 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-stretch">
        <div>
          <p className="mb-3 inline-flex rounded-full bg-white/75 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
            {mood.emoji} 今日状态：{mood.label}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">孙瑜的工作生活面板</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            把工作推进、生活照料和成长记录放在同一个安静有质感的空间里。数据保存在本地浏览器，打开即可继续。
          </p>
          {moodNote && <p className="mt-4 inline-flex rounded-full bg-white/85 px-4 py-2 text-sm text-slate-600 shadow-sm">今天想对自己说：{moodNote}</p>}

          <div className={`relative mt-6 overflow-hidden rounded-[2rem] border ${quoteBundle.palette.borderClass} shadow-xl`}>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-55"
              style={{ backgroundImage: `url(${calendarArt})`, filter: `hue-rotate(${quoteBundle.palette.hueRotate}deg) saturate(1.08)` }}
            />
            <div className={`absolute inset-0 bg-gradient-to-br ${quoteBundle.palette.overlay}`} />
            <div className="absolute left-6 top-4 flex gap-2">
              <span className="h-3 w-3 rounded-full bg-white/60 shadow-inner shadow-black/10" />
              <span className="h-3 w-3 rounded-full bg-white/60 shadow-inner shadow-black/10" />
              <span className="h-3 w-3 rounded-full bg-white/60 shadow-inner shadow-black/10" />
            </div>
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
                  <button
                    type="button"
                    onClick={() => setQuoteOffset((current) => current + 1)}
                    className={`rounded-full px-3 py-2 text-sm transition ${quoteBundle.palette.actionClass}`}
                  >
                    查看前一天
                  </button>
                  <button
                    type="button"
                    disabled={quoteOffset === 0}
                    onClick={() => setQuoteOffset((current) => Math.max(current - 1, 0))}
                    className={`rounded-full px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${quoteBundle.palette.actionClass}`}
                  >
                    回到今天
                  </button>
                </div>
              </div>

              <div className="mt-8 rounded-[1.8rem] border border-white/12 bg-white/10 px-6 py-7 backdrop-blur-sm">
                <p className={`text-3xl font-medium leading-[1.6] lg:text-4xl ${quoteBundle.palette.inkClass}`}>“{quoteBundle.quote.text}”</p>
                <div className="mt-6 flex items-center justify-between gap-4">
                  <p className={`text-sm ${quoteBundle.palette.mutedClass}`}>—— {quoteBundle.quote.source}</p>
                  <p className={`text-sm ${quoteBundle.palette.mutedClass}`}>{mood.hint}</p>
                </div>
              </div>
            </div>
          </div>
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

function WeatherPreviewCard({ weather, error }: { weather: WeatherDay[]; error: string }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">上海 · 杨浦区</p>
          <h3 className="mt-1 text-2xl font-semibold text-slate-950">未来 7 天天气</h3>
        </div>
        <span className="rounded-full bg-slate-950/5 px-3 py-1 text-xs text-slate-500">3 条可见 · 上下滑动</span>
      </div>
      {error ? (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</p>
      ) : (
        <div className="mt-4 max-h-[15rem] space-y-3 overflow-y-auto pr-1">
          {weather.map((day) => (
            <div key={day.date} className="rounded-2xl bg-slate-950/[0.04] p-4">
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
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Card({ title, eyebrow, action, onAction, children }: { title: string; eyebrow: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.75rem] border border-white/60 bg-white/70 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.25em] text-[var(--accent-strong)]">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">{title}</h2>
        </div>
        {action && onAction ? (
          <button type="button" onClick={onAction} className="rounded-full bg-slate-950/5 px-3 py-1 text-xs text-slate-500 transition hover:bg-slate-950/10 hover:text-slate-700">
            {action}
          </button>
        ) : action ? (
          <span className="rounded-full bg-slate-950/5 px-3 py-1 text-xs text-slate-500">{action}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function MoodModal({ defaultMood, defaultNote, onConfirm }: { defaultMood: MoodKey; defaultNote: string; onConfirm: (key: MoodKey, note: string) => void }) {
  const [selectedMood, setSelectedMood] = useState<MoodKey>(defaultMood);
  const [note, setNote] = useState(defaultNote);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-md">
      <div className="max-w-3xl rounded-[2rem] bg-white p-6 shadow-2xl">
        <p className="text-sm font-bold tracking-[0.22em] text-slate-400">DAILY CHECK-IN</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">今天感觉怎么样？</h2>
        <p className="mt-2 text-slate-600">先选一个基调，再给自己留一句今天的心情备注。</p>
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
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="比如：今天想慢一点，但也想把最重要的事做好。"
            className="input mt-3 min-h-24 resize-none"
          />
        </div>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={() => onConfirm(selectedMood, note)} className="btn">
            进入面板
          </button>
        </div>
      </div>
    </div>
  );
}

function TodoBoard({
  area,
  habits,
  setHabits,
  todayTasks,
  allTasks,
  setAllTasks,
  currentDate,
}: {
  area: 'work' | 'life';
  habits: Habit[];
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
  todayTasks: DailyTask[];
  allTasks: DailyTask[];
  setAllTasks: React.Dispatch<React.SetStateAction<DailyTask[]>>;
  currentDate: string;
}) {
  const [habitText, setHabitText] = useState('');
  const [taskText, setTaskText] = useState('');
  const previewHabits = habits.slice(0, MAX_CARD_RECORDS);
  const previewTasks = todayTasks.slice(0, MAX_CARD_RECORDS);

  const addHabit = (event: FormEvent) => {
    event.preventDefault();
    if (!habitText.trim()) return;
    setHabits([{ id: uid(), title: habitText.trim(), area, completedDates: [] }, ...habits]);
    setHabitText('');
  };

  const addTask = (event: FormEvent) => {
    event.preventDefault();
    if (!taskText.trim()) return;
    setAllTasks([{ id: uid(), title: taskText.trim(), area, date: currentDate, done: false }, ...allTasks]);
    setTaskText('');
  };

  const toggleHabitToday = (habitId: string) => {
    setHabits(
      habits.map((item) => {
        if (item.id !== habitId) return item;
        return item.completedDates.includes(currentDate)
          ? { ...item, completedDates: item.completedDates.filter((date) => date !== currentDate) }
          : { ...item, completedDates: [currentDate, ...item.completedDates] };
      }),
    );
  };

  const toggleTask = (taskId: string) => {
    setAllTasks(allTasks.map((item) => (item.id === taskId ? { ...item, done: !item.done } : item)));
  };

  const deleteTask = (taskId: string) => {
    setAllTasks(allTasks.filter((item) => item.id !== taskId));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-[1.5rem] bg-white/70 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">坚持区</p>
            <p className="text-xs text-slate-500">累积打卡，自动统计已完成次数</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">今日 {formatDateLabel(currentDate)}</span>
        </div>
        <form onSubmit={addHabit} className="mt-3 flex gap-2">
          <input value={habitText} onChange={(event) => setHabitText(event.target.value)} placeholder="新增一个坚持项目" className="input" />
          <button className="btn">添加</button>
        </form>
        <PreviewViewport heightClass="max-h-[9.2rem]">
          {previewHabits.map((habit) => {
            const doneToday = habit.completedDates.includes(currentDate);
            return (
              <div key={habit.id} className="rounded-2xl bg-slate-950/[0.035] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{habit.title}</p>
                    <p className="mt-1 text-xs text-[var(--accent-strong)]">已完成 {habit.completedDates.length} 次</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleHabitToday(habit.id)}
                    className={`rounded-full px-3 py-1 text-xs transition ${doneToday ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                  >
                    {doneToday ? '今日已打卡' : '今日打卡'}
                  </button>
                </div>
              </div>
            );
          })}
        </PreviewViewport>
        <PreviewHint currentCount={habits.length} />
      </div>

      <div className="rounded-[1.5rem] bg-white/70 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">日常区</p>
            <p className="text-xs text-slate-500">只展示今天的 list，过往日期可查看</p>
          </div>
          <span className="rounded-full bg-slate-950/5 px-3 py-1 text-xs text-slate-500">Today List</span>
        </div>
        <form onSubmit={addTask} className="mt-3 flex gap-2">
          <input value={taskText} onChange={(event) => setTaskText(event.target.value)} placeholder="新增一个今日事项" className="input" />
          <button className="btn">添加</button>
        </form>
        <PreviewViewport heightClass="max-h-[9.2rem]">
          {previewTasks.map((task) => (
            <label key={task.id} className="group flex items-center gap-3 rounded-2xl bg-slate-950/[0.035] p-3">
              <input checked={task.done} onChange={() => toggleTask(task.id)} type="checkbox" className="h-5 w-5 accent-[var(--accent-strong)]" />
              <span className={`flex-1 text-sm ${task.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{task.title}</span>
              <button type="button" onClick={() => deleteTask(task.id)} className="text-xs text-slate-300 opacity-0 transition group-hover:opacity-100">
                删除
              </button>
            </label>
          ))}
        </PreviewViewport>
        <PreviewHint currentCount={todayTasks.length} />
      </div>
    </div>
  );
}

function TodoHistoryViewer({ areaLabel, habits, tasks, currentDate }: { areaLabel: string; habits: Habit[]; tasks: DailyTask[]; currentDate: string }) {
  const dates = useMemo(() => uniqueDates([currentDate, ...tasks.map((item) => item.date), ...habits.flatMap((item) => item.completedDates)]), [currentDate, tasks, habits]);
  const [selectedDate, setSelectedDate] = useState(dates[0] || currentDate);
  const selectedTasks = tasks.filter((item) => item.date === selectedDate);

  return (
    <div>
      <div className="rounded-3xl bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-700">选择日期</p>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {dates.map((date) => (
            <button
              key={date}
              type="button"
              onClick={() => setSelectedDate(date)}
              className={`rounded-full px-3 py-2 text-sm whitespace-nowrap transition ${selectedDate === date ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            >
              {formatDateLabel(date)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl bg-slate-950/[0.035] p-4">
          <p className="text-sm font-semibold text-slate-900">{areaLabel} · 坚持区</p>
          <div className="mt-3 space-y-3">
            {habits.length ? (
              habits.map((habit) => {
                const done = habit.completedDates.includes(selectedDate);
                return (
                  <ViewerItem
                    key={habit.id}
                    title={habit.title}
                    meta={`${done ? '当日已打卡' : '当日未打卡'} · 累计已完成 ${habit.completedDates.length} 次`}
                  />
                );
              })
            ) : (
              <EmptyState text="这一天还没有坚持区记录。" />
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-slate-950/[0.035] p-4">
          <p className="text-sm font-semibold text-slate-900">{areaLabel} · 日常区</p>
          <div className="mt-3 space-y-3">
            {selectedTasks.length ? (
              selectedTasks.map((task) => <ViewerItem key={task.id} title={task.title} meta={task.done ? '已完成' : '未完成'} />)
            ) : (
              <EmptyState text="这一天还没有日常区事项。" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectPanel({ projects, setProjects }: { projects: Project[]; setProjects: React.Dispatch<React.SetStateAction<Project[]>> }) {
  const [name, setName] = useState('');
  const previewProjects = projects.slice(0, MAX_CARD_RECORDS);

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setProjects([{ id: uid(), name: name.trim(), stage: '进行中', progress: 10, next: '写下下一步' }, ...projects]);
    setName('');
  };

  return (
    <div>
      <form onSubmit={add} className="flex gap-2">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="新增项目" />
        <button className="btn">添加</button>
      </form>
      <PreviewViewport heightClass="max-h-[15rem]" className="mt-4">
        {previewProjects.map((project) => (
          <div key={project.id} className="rounded-3xl bg-slate-950/[0.035] p-4">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{project.name}</p>
                <p className="text-sm text-slate-500">{project.stage} · 下一步：{project.next}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-sm font-semibold text-[var(--accent-strong)]">{project.progress}%</span>
                <button type="button" onClick={() => setProjects(projects.filter((item) => item.id !== project.id))} className="text-xs text-slate-400 transition hover:text-rose-500">
                  删除项目
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={project.progress}
              onChange={(e) => setProjects(projects.map((item) => (item.id === project.id ? { ...item, progress: Number(e.target.value) } : item)))}
              className="mt-3 w-full accent-[var(--accent-strong)]"
            />
          </div>
        ))}
      </PreviewViewport>
      <PreviewHint currentCount={projects.length} />
    </div>
  );
}

function FocusNotebookPanel({
  book,
  setBook,
  logs,
  setLogs,
  seconds,
  setSeconds,
  running,
  setRunning,
  currentDate,
}: {
  book: FocusNotebook;
  setBook: React.Dispatch<React.SetStateAction<FocusNotebook>>;
  logs: FocusLog[];
  setLogs: React.Dispatch<React.SetStateAction<FocusLog[]>>;
  seconds: number;
  setSeconds: React.Dispatch<React.SetStateAction<number>>;
  running: boolean;
  setRunning: React.Dispatch<React.SetStateAction<boolean>>;
  currentDate: string;
}) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const sec = (seconds % 60).toString().padStart(2, '0');
  const previewLogs = logs.slice(0, MAX_CARD_RECORDS);

  const updateBook = (patch: Partial<FocusNotebook>) => {
    setBook({ ...book, ...patch });
  };

  const record = () => {
    if (!book.currentTopic.trim()) return;
    setLogs([{ id: uid(), title: book.currentTopic.trim(), minutes: 25, date: currentDate }, ...logs]);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <NotebookPage title="左页 · 当下专注" subtitle="像翻开抖音里那种专注本的左页，写下今天的目标与节奏。">
        <label className="block text-xs text-slate-500">此刻主题</label>
        <input
          value={book.currentTopic}
          onChange={(event) => updateBook({ currentTopic: event.target.value })}
          placeholder="写下现在最想专注的事"
          className="input handwrite-input mt-2"
        />
        <label className="mt-4 block text-xs text-slate-500">左页拆解</label>
        <textarea
          value={book.leftPage}
          onChange={(event) => updateBook({ leftPage: event.target.value })}
          placeholder="把任务拆小，像在纸页上慢慢写。"
          className="handwrite-textarea mt-2 min-h-44 w-full resize-none rounded-[1.4rem] border border-amber-100 bg-[#fffdf7]/90 px-4 py-4 outline-none"
        />
        <div className="mt-4 rounded-[1.5rem] bg-slate-950 px-5 py-5 text-center text-white shadow-lg shadow-slate-950/10">
          <p className="text-sm text-white/50">番茄钟</p>
          <p className="mt-2 text-5xl font-semibold tabular-nums">{minutes}:{sec}</p>
          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={() => setRunning(!running)} className="btn light">
              {running ? '暂停' : '开始'}
            </button>
            <button type="button" onClick={() => { setRunning(false); setSeconds(25 * 60); }} className="btn ghost">
              重置
            </button>
            <button type="button" onClick={record} className="btn">
              记录
            </button>
          </div>
        </div>
      </NotebookPage>

      <NotebookPage title="右页 · 灵感与复盘" subtitle="右页留给情绪、提醒和零碎灵感，输入采用手写体样式。">
        <label className="block text-xs text-slate-500">右页手记</label>
        <textarea
          value={book.rightPage}
          onChange={(event) => updateBook({ rightPage: event.target.value })}
          placeholder="写下卡住点、临时灵感或结束后的复盘。"
          className="handwrite-textarea mt-2 min-h-[14rem] w-full resize-none rounded-[1.4rem] border border-amber-100 bg-[#fffdf7]/90 px-4 py-4 outline-none"
        />
        <div className="mt-4 rounded-[1.5rem] border border-dashed border-amber-200 bg-white/75 p-4">
          <p className="text-xs text-slate-500">最近专注记录</p>
          <PreviewViewport heightClass="max-h-[9.4rem]" className="mt-3">
            {previewLogs.map((log) => (
              <p key={log.id} className="handwrite-text rounded-2xl bg-slate-950/[0.035] px-3 py-2 text-[17px] text-slate-600">
                {formatDateLabel(log.date)} · {log.title} · {log.minutes}min
              </p>
            ))}
          </PreviewViewport>
          <PreviewHint currentCount={logs.length} />
        </div>
      </NotebookPage>
    </div>
  );
}

function NotebookPage({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="notebook-page rounded-[2rem] px-5 py-5 shadow-inner shadow-amber-100/40">
      <div className="mb-4 border-b border-amber-100/80 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700/75">Focus Spread</p>
        <h3 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function FocusViewer({ book, logs }: { book: FocusNotebook; logs: FocusLog[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <ViewerItem title="左页内容" body={book.leftPage} meta={`当前主题：${book.currentTopic}`} />
      <ViewerItem title="右页内容" body={book.rightPage} meta="灵感与复盘" />
      <div className="lg:col-span-2 space-y-3">
        {logs.map((log) => (
          <ViewerItem key={log.id} title={log.title} meta={`${formatDateLabel(log.date)} · ${log.minutes}min`} />
        ))}
      </div>
    </div>
  );
}

function DiaryPanel({ diaries, setDiaries, currentDate }: { diaries: Diary[]; setDiaries: React.Dispatch<React.SetStateAction<Diary[]>>; currentDate: string }) {
  const [content, setContent] = useState('');
  const previewDiaries = diaries.slice(0, MAX_CARD_RECORDS);

  const add = () => {
    if (!content.trim()) return;
    setDiaries([{ id: uid(), title: '今天的小成功', content: content.trim(), date: currentDate }, ...diaries]);
    setContent('');
  };

  return (
    <div>
      <textarea className="input min-h-24 resize-none" value={content} onChange={(e) => setContent(e.target.value)} placeholder="写下今天做成的一件小事" />
      <button type="button" onClick={add} className="btn mt-2 w-full">
        存入日记
      </button>
      <PreviewViewport heightClass="max-h-[10rem]" className="mt-4">
        {previewDiaries.map((diary) => (
          <article key={diary.id} className="rounded-3xl bg-slate-950/[0.035] p-4">
            <p className="text-xs text-slate-400">{formatDateLabel(diary.date)}</p>
            <p className="mt-1 font-medium text-slate-800">{diary.content}</p>
          </article>
        ))}
      </PreviewViewport>
      <PreviewHint currentCount={diaries.length} />
    </div>
  );
}

function WorkoutPanel({ workouts, setWorkouts, weights, currentDate }: { workouts: Workout[]; setWorkouts: React.Dispatch<React.SetStateAction<Workout[]>>; weights: Workout[]; currentDate: string }) {
  const [type, setType] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [weight, setWeight] = useState('');
  const previewWorkouts = workouts.slice(-MAX_CARD_RECORDS).reverse();

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!type.trim()) return;
    setWorkouts([...workouts, { id: uid(), type: type.trim(), minutes: Number(minutes), weight: weight ? Number(weight) : undefined, date: currentDate }]);
    setType('');
    setWeight('');
  };

  return (
    <div>
      <form onSubmit={add} className="grid grid-cols-3 gap-2">
        <input className="input col-span-3" value={type} onChange={(e) => setType(e.target.value)} placeholder="运动类型，如瑜伽/快走" />
        <input className="input" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="分钟" />
        <input className="input" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="体重" />
        <button className="btn">记录</button>
      </form>
      <div className="mt-5 h-32 rounded-3xl bg-slate-950/[0.035] p-4">
        <p className="mb-3 text-sm text-slate-500">体重趋势</p>
        <div className="flex h-20 items-end gap-2">
          {weights.map((item) => (
            <div key={item.id} title={`${item.date} ${item.weight}kg`} className="flex-1 rounded-t-xl bg-[var(--accent)]" style={{ height: `${Math.max(18, Number(item.weight || 0) * 1.3)}%` }} />
          ))}
        </div>
      </div>
      <PreviewViewport heightClass="max-h-[9rem]" className="mt-3">
        {previewWorkouts.map((item) => (
          <p key={item.id} className="rounded-2xl bg-slate-950/[0.035] px-3 py-2 text-sm text-slate-600">
            {formatDateLabel(item.date)} · {item.type} {item.minutes}min {item.weight ? `· ${item.weight}kg` : ''}
          </p>
        ))}
      </PreviewViewport>
      <PreviewHint currentCount={workouts.length} />
    </div>
  );
}

function BookPanel({ notes, setNotes, currentDate }: { notes: BookNote[]; setNotes: React.Dispatch<React.SetStateAction<BookNote[]>>; currentDate: string }) {
  const [book, setBook] = useState('');
  const [note, setNote] = useState('');
  const previewNotes = notes.slice(0, MAX_CARD_RECORDS);

  const add = () => {
    if (!book.trim() || !note.trim()) return;
    setNotes([{ id: uid(), book, note, link: 'https://weread.qq.com/', date: currentDate }, ...notes]);
    setBook('');
    setNote('');
  };

  return (
    <div>
      <div className="grid gap-2">
        <input className="input" value={book} onChange={(e) => setBook(e.target.value)} placeholder="书名" />
        <textarea className="input min-h-20 resize-none" value={note} onChange={(e) => setNote(e.target.value)} placeholder="摘抄或想法" />
        <button type="button" onClick={add} className="btn">
          添加笔记
        </button>
      </div>
      <PreviewViewport heightClass="max-h-[10rem]" className="mt-4">
        {previewNotes.map((item) => (
          <article key={item.id} className="rounded-3xl bg-slate-950/[0.035] p-4">
            <div className="flex justify-between gap-3">
              <p className="font-medium text-slate-900">{item.book}</p>
              <a href={item.link || 'https://weread.qq.com/'} target="_blank" rel="noreferrer" className="text-sm text-[var(--accent-strong)]">
                微信读书
              </a>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.note}</p>
          </article>
        ))}
      </PreviewViewport>
      <PreviewHint currentCount={notes.length} />
    </div>
  );
}

function StockDiaryPanel({ notes, setNotes, currentDate }: { notes: StockNote[]; setNotes: React.Dispatch<React.SetStateAction<StockNote[]>>; currentDate: string }) {
  const [symbol, setSymbol] = useState('');
  const [thought, setThought] = useState('');
  const grouped = notes.reduce<Record<string, StockNote[]>>((acc, item) => {
    acc[item.symbol] = [...(acc[item.symbol] || []), item];
    return acc;
  }, {});
  const groupedEntries = Object.entries(grouped).slice(0, MAX_CARD_RECORDS);

  const add = () => {
    if (!symbol.trim() || !thought.trim()) return;
    setNotes([{ id: uid(), symbol: symbol.trim(), action: '观察', thought: thought.trim(), date: currentDate }, ...notes]);
    setSymbol('');
    setThought('');
  };

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-[0.5fr_1fr_auto]">
        <input className="input" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="标的" />
        <input className="input" value={thought} onChange={(e) => setThought(e.target.value)} placeholder="交易想法/复盘" />
        <button type="button" onClick={add} className="btn">
          记录
        </button>
      </div>
      <PreviewViewport heightClass="max-h-[10rem]" className="mt-4">
        {groupedEntries.map(([key, items]) => (
          <div key={key} className="rounded-3xl bg-slate-950/[0.035] p-4">
            <p className="font-semibold text-slate-900">{key}</p>
            {items.slice(0, 2).map((item) => (
              <p key={item.id} className="mt-2 text-sm leading-6 text-slate-600">
                {formatDateLabel(item.date)} · {item.thought}
              </p>
            ))}
          </div>
        ))}
      </PreviewViewport>
      <PreviewHint currentCount={Object.keys(grouped).length} />
    </div>
  );
}

function MarketPanel({ indices, error }: { indices: MarketIndex[]; error: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {indices.length ? (
        indices.map((item) => {
          const up = Number(item.change) >= 0;
          return (
            <div key={item.code} className="rounded-3xl bg-slate-950/[0.035] p-4">
              <p className="text-sm text-slate-500">{item.name}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{item.price}</p>
              <p className={`mt-1 text-sm ${up ? 'text-rose-500' : 'text-emerald-600'}`}>
                {up ? '+' : ''}
                {item.change} · {item.percent}%
              </p>
            </div>
          );
        })
      ) : (
        <p className="col-span-3 rounded-2xl bg-slate-950/[0.035] p-4 text-slate-500">正在加载沪深创业板指数…</p>
      )}
      {error && <p className="col-span-3 text-xs text-amber-600">{error}</p>}
    </div>
  );
}

function PreviewViewport({ children, heightClass, className = '' }: { children: React.ReactNode; heightClass: string; className?: string }) {
  return <div className={`${className} ${heightClass} space-y-3 overflow-y-auto pr-1`}>{children}</div>;
}

function PreviewHint({ currentCount }: { currentCount: number }) {
  return currentCount > MAX_CARD_RECORDS ? <p className="mt-3 text-xs text-slate-400">卡片内最多滚动浏览 10 条，更多内容请点击右上角查看。</p> : null;
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">{text}</p>;
}

function RecordViewerModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-md">
      <div className="w-full max-w-4xl rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold tracking-[0.22em] text-slate-400">VIEWER</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950">{title}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-950/5 px-4 py-2 text-sm text-slate-500 transition hover:bg-slate-950/10 hover:text-slate-700">
            关闭
          </button>
        </div>
        <div className="mt-5 max-h-[72vh] overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}

function ViewerItem({ title, meta, body, extra }: { title: string; meta?: string; body?: string; extra?: React.ReactNode }) {
  return (
    <article className="rounded-3xl bg-slate-950/[0.035] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          {meta && <p className="mt-1 text-sm text-slate-500">{meta}</p>}
        </div>
        {extra}
      </div>
      {body && <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>}
    </article>
  );
}
