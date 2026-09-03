import { quoteCards } from './data';
import type { DanxiangliCard, MarketIndex, WeatherDay } from './types';

const DANXIANGLI_API_BASE = (import.meta.env.VITE_DANXIANGLI_API_BASE || '').trim() || (import.meta.env.DEV ? 'http://127.0.0.1:8000' : '');
const DANXIANGLI_TIMEOUT = 6000;
const DANXIANGLI_RECOMMENDATIONS = ['宜认真生活', '宜慢慢变好', '宜稳稳推进', '宜留白呼吸', '宜记录此刻', '宜积蓄能量'];

function isDanxiangliCard(data: unknown): data is DanxiangliCard {
  if (!data || typeof data !== 'object') return false;
  const card = data as Record<string, unknown>;
  return typeof card.date === 'string'
    && typeof card.month_label === 'string'
    && typeof card.day_label === 'string'
    && typeof card.recommendation === 'string'
    && typeof card.taboo === 'string'
    && typeof card.lunar_label === 'string'
    && typeof card.quote === 'string'
    && typeof card.source_title === 'string'
    && typeof card.source_meta === 'string'
    && typeof card.is_dark === 'boolean';
}

async function fetchDanxiangliJson(url: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), DANXIANGLI_TIMEOUT);
    try {
      const res = await fetch(url, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      const text = await res.text();
      if (!res.ok) {
        throw new Error(text || '单向历服务暂不可用');
      }
      return JSON.parse(text) as unknown;
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise((resolve) => window.setTimeout(resolve, 450));
      }
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('单向历服务暂不可用');
}

export async function fetchYangpuWeather(): Promise<WeatherDay[]> {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=31.2669&longitude=121.5285&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=Asia%2FShanghai&forecast_days=7';
  const res = await fetch(url);
  if (!res.ok) throw new Error('天气服务暂不可用');
  const data = await res.json();
  return data.daily.time.map((date: string, index: number) => ({
    date,
    min: Math.round(data.daily.temperature_2m_min[index]),
    max: Math.round(data.daily.temperature_2m_max[index]),
    code: data.daily.weather_code[index],
    windSpeed: Math.round(data.daily.wind_speed_10m_max[index]),
    precipitation: Math.round(data.daily.precipitation_probability_max[index] || 0),
  }));
}

export function weatherText(code: number) {
  if (code === 0) return '晴';
  if (code >= 1 && code <= 3) return '多云';
  if (code === 45 || code === 48) return '雾';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return '雨';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return '雪';
  if (code === 95 || code === 96 || code === 99) return '雷雨';
  return '天气';
}

export function weatherIcon(code: number) {
  if (code === 0) return '☀️';
  if (code >= 1 && code <= 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return '🌧️';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return '❄️';
  if (code === 95 || code === 96 || code === 99) return '⛈️';
  return '🌥️';
}

export function windLevel(speed: number) {
  if (speed < 6) return '1级';
  if (speed < 12) return '2级';
  if (speed < 20) return '3级';
  if (speed < 29) return '4级';
  if (speed < 39) return '5级';
  if (speed < 50) return '6级';
  if (speed < 62) return '7级';
  return '8级+';
}

export async function fetchMarketIndices(): Promise<MarketIndex[]> {
  const url = 'https://qt.gtimg.cn/q=sh000001,sz399001,sz399006,sh000688,usIXIC,usINX';
  const res = await fetch(url);
  if (!res.ok) throw new Error('行情服务暂不可用');
  const text = await res.text();
  const nameMap: Record<string, string> = {
    sh000001: '上证指数',
    sz399001: '深证成指',
    sz399006: '创业板指',
    sh000688: '科创 50',
    usIXIC: '纳斯达克',
    usINX: '标普 500',
  };
  const parsed = text
    .split(';')
    .map((row) => {
      const code = row.match(/v_(\w+)=/)?.[1];
      const body = row.match(/="(.+)"/)?.[1];
      if (!code || !body) return null;
      const parts = body.split('~');
      return {
        code,
        name: nameMap[code] || parts[1] || code,
        price: Number(parts[3]).toFixed(2),
        change: Number(parts[31]).toFixed(2),
        percent: Number(parts[32]).toFixed(2),
      } satisfies MarketIndex;
    })
    .filter(Boolean) as MarketIndex[];
  if (!parsed.length) throw new Error('行情数据为空');
  return parsed;
}

function formatChineseMonth(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', timeZone: 'Asia/Shanghai' }).format(date);
}

function formatLunarLabel(date: Date) {
  const lunar = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Shanghai',
  }).format(date);
  return `农历${lunar.replace(/\s+/g, '')}`;
}

function getFallbackQuote(date: string) {
  const index = date.replaceAll('-', '').split('').reduce((sum, current) => sum + Number(current), 0);
  return quoteCards[index % quoteCards.length];
}

export function buildOfflineDanxiangliCard(date: string): DanxiangliCard {
  const currentDate = new Date(`${date}T12:00:00+08:00`);
  const quote = getFallbackQuote(date);
  const recommendationIndex = Math.abs(date.split('-').reduce((sum, current) => sum + Number(current), 0)) % DANXIANGLI_RECOMMENDATIONS.length;
  return {
    date,
    month_label: formatChineseMonth(currentDate),
    day_label: String(currentDate.getUTCDate()),
    recommendation: DANXIANGLI_RECOMMENDATIONS[recommendationIndex],
    taboo: '',
    lunar_label: formatLunarLabel(currentDate),
    quote: quote.text,
    source_title: quote.title,
    source_meta: quote.author,
    is_dark: false,
    raw_text: `${formatChineseMonth(currentDate)} ${currentDate.getUTCDate()} ${formatLunarLabel(currentDate)} ${quote.text}`,
  };
}

export async function fetchDanxiangliCard(date: string): Promise<DanxiangliCard> {
  if (!DANXIANGLI_API_BASE) {
    return buildOfflineDanxiangliCard(date);
  }
  try {
    const data = await fetchDanxiangliJson(`${DANXIANGLI_API_BASE}/api/v1/danxiangli?date=${encodeURIComponent(date)}`);
    if (!isDanxiangliCard(data)) {
      throw new Error('单向历返回格式异常');
    }
    return data;
  } catch (error) {
    console.warn('danxiangli remote fetch failed, fallback to local card', error);
    return buildOfflineDanxiangliCard(date);
  }
}

export function getDanxiangliImageUrl(date: string) {
  return DANXIANGLI_API_BASE
    ? `${DANXIANGLI_API_BASE}/api/v1/danxiangli/image?date=${encodeURIComponent(date)}`
    : '';
}
