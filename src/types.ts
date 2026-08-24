export type MoodKey = string;

export type MoodOption = {
  id: string;
  label: string;
  emoji: string;
  hint: string;
  hue?: number;
  accent: string;
  accentStrong: string;
  background: string;
};

export type Habit = {
  id: string;
  title: string;
  area: 'work' | 'life';
  completedDates: string[];
};

export type DailyTask = {
  id: string;
  title: string;
  area: 'work' | 'life';
  date: string;
  done: boolean;
};

export type ProjectStep = {
  id: string;
  title: string;
  done: boolean;
};

export type Project = {
  id: string;
  name: string;
  stage: string;
  progress: number;
  next: string;
  steps?: ProjectStep[];
};

export type FocusEntry = {
  id: string;
  topic: string;
  leftPage: string;
  rightPage: string;
  date: string;
};

export type FocusLog = {
  id: string;
  title: string;
  minutes: number;
  date: string;
};

export type FocusNotebook = {
  currentTopic: string;
  leftPage: string;
  rightPage: string;
};

export type Diary = {
  id: string;
  title: string;
  content: string;
  date: string;
};

export type Workout = {
  id: string;
  type: string;
  minutes: number;
  weight?: number;
  date: string;
};

export type BookNote = {
  id: string;
  book: string;
  note: string;
  link?: string;
  date: string;
};

export type StockNote = {
  id: string;
  symbol: string;
  action: string;
  thought: string;
  date: string;
};

export type MarketIndex = {
  code: string;
  name: string;
  price: string;
  change: string;
  percent: string;
};

export type WeatherDay = {
  date: string;
  min: number;
  max: number;
  code: number;
  windSpeed: number;
  precipitation: number;
};

export type QuoteCard = {
  text: string;
  title: string;
  author: string;
};

export type DanxiangliCard = {
  date: string;
  month_label: string;
  day_label: string;
  recommendation: string;
  lunar_label: string;
  quote: string;
  source_title: string;
  source_meta: string;
  is_dark: boolean;
  raw_text: string;
};

export type BookRecommendation = {
  title: string;
  author: string;
  excerpt: string;
};
