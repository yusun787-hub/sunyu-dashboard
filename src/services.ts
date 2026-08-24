import type { MarketIndex, WeatherDay } from './types';

export async function fetchShanghaiWeather(): Promise<WeatherDay[]> {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=31.2304&longitude=121.4737&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FShanghai&forecast_days=5';
  const res = await fetch(url);
  if (!res.ok) throw new Error('天气服务暂不可用');
  const data = await res.json();
  return data.daily.time.map((date: string, index: number) => ({
    date,
    min: Math.round(data.daily.temperature_2m_min[index]),
    max: Math.round(data.daily.temperature_2m_max[index]),
    code: data.daily.weather_code[index],
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

declare global {
  interface Window {
    hq_str_s_sh000001?: string;
    hq_str_s_sz399001?: string;
    hq_str_s_sz399006?: string;
  }
}

export function fetchMarketIndices(): Promise<MarketIndex[]> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://hq.sinajs.cn/list=s_sh000001,s_sz399001,s_sz399006';
    script.charset = 'GBK';
    script.referrerPolicy = 'no-referrer';
    const timer = window.setTimeout(() => reject(new Error('行情加载超时')), 6000);
    script.onload = () => {
      window.clearTimeout(timer);
      const rows = [
        ['s_sh000001', window.hq_str_s_sh000001],
        ['s_sz399001', window.hq_str_s_sz399001],
        ['s_sz399006', window.hq_str_s_sz399006],
      ] as const;
      const parsed = rows
        .map(([code, raw]) => {
          const parts = (raw || '').split(',');
          if (parts.length < 6) return null;
          return {
            code,
            name: parts[0],
            price: parts[1],
            change: parts[2],
            percent: parts[3],
          } satisfies MarketIndex;
        })
        .filter(Boolean) as MarketIndex[];
      if (!parsed.length) reject(new Error('行情数据为空'));
      else resolve(parsed);
      script.remove();
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('行情服务暂不可用'));
      script.remove();
    };
    document.body.appendChild(script);
  });
}
