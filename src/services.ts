import type { MarketIndex, WeatherDay } from './types';

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
  if ([1, 2, 3].includes(code)) return '多云';
  if ([45, 48].includes(code)) return '雾';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '雨';
  if ([71, 73, 75, 85, 86].includes(code)) return '雪';
  if ([95, 96, 99].includes(code)) return '雷雨';
  return '天气';
}

export function weatherIcon(code: number) {
  if (code === 0) return '☀️';
  if ([1, 2].includes(code)) return '🌤️';
  if (code === 3) return '☁️';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 85, 86].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
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
