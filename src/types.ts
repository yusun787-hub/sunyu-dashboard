export type MoodKey = 'calm' | 'focused' | 'warm' | 'tired' | 'bright';

export type Todo = {
  id: string;
  title: string;
  done: boolean;
  tag?: string;
};

export type Project = {
  id: string;
  name: string;
  stage: string;
  progress: number;
  next: string;
};

export type FocusLog = {
  id: string;
  title: string;
  minutes: number;
  date: string;
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
};
