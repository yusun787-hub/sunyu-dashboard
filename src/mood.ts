import type { MoodOption } from './types';

function clampHue(hue: number) {
  return ((Math.round(hue) % 360) + 360) % 360;
}

function hsl(hue: number, saturation: number, lightness: number, alpha?: number) {
  return alpha === undefined ? `hsl(${clampHue(hue)} ${saturation}% ${lightness}%)` : `hsla(${clampHue(hue)} ${saturation}% ${lightness}% / ${alpha})`;
}

function buildMoodBackground(hue: number) {
  return [
    `radial-gradient(circle at 18% 14%, ${hsl(hue, 32, 76, 0.28)}, transparent 34%)`,
    `radial-gradient(circle at 82% 12%, ${hsl(hue + 10, 24, 64, 0.2)}, transparent 30%)`,
    `linear-gradient(135deg, ${hsl(hue, 16, 97)} 0%, ${hsl(hue + 6, 20, 93)} 52%, ${hsl(hue + 12, 18, 88)} 100%)`,
  ].join(', ');
}

export function createMorandiMoodOption({ id, label, emoji, hint, hue }: { id: string; label: string; emoji: string; hint: string; hue: number }): MoodOption {
  const normalizedHue = clampHue(hue);
  return {
    id,
    label,
    emoji,
    hint,
    hue: normalizedHue,
    accent: hsl(normalizedHue, 30, 66),
    accentStrong: hsl(normalizedHue, 26, 48),
    background: buildMoodBackground(normalizedHue),
  };
}

export function hashText(text: string) {
  return text.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
}

export function createCustomMoodOption(label: string, emoji: string) {
  const normalizedLabel = label.trim();
  const normalizedEmoji = emoji.trim() || '✨';
  const hue = hashText(`${normalizedLabel}-${normalizedEmoji}`) % 360;
  return createMorandiMoodOption({
    id: `custom-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    label: normalizedLabel,
    emoji: normalizedEmoji,
    hint: `今天按「${normalizedLabel}」的节奏来，先照顾好自己再推进事情。`,
    hue,
  });
}

function extractHueFromColor(color?: string) {
  if (!color) return undefined;
  const match = color.match(/hsla?\(\s*(-?\d+(?:\.\d+)?)/i);
  if (!match) return undefined;
  return clampHue(Number(match[1]));
}

export function resolveMoodHue(option: Pick<MoodOption, 'id' | 'label' | 'emoji' | 'accent' | 'accentStrong' | 'background' | 'hue'>) {
  if (typeof option.hue === 'number' && Number.isFinite(option.hue)) return clampHue(option.hue);
  return extractHueFromColor(option.accentStrong) ?? extractHueFromColor(option.accent) ?? extractHueFromColor(option.background) ?? hashText(`${option.id}-${option.label}-${option.emoji}`) % 360;
}

export function normalizeMoodOption(option: MoodOption): MoodOption {
  return createMorandiMoodOption({
    id: option.id,
    label: option.label,
    emoji: option.emoji,
    hint: option.hint,
    hue: resolveMoodHue(option),
  });
}

export function normalizeMoodOptions(options: MoodOption[]) {
  return options.map((option) => normalizeMoodOption(option));
}

export function updateMoodHue(option: MoodOption, hue: number) {
  return createMorandiMoodOption({
    id: option.id,
    label: option.label,
    emoji: option.emoji,
    hint: option.hint,
    hue,
  });
}

export function getMorandiHueWheelGradient() {
  const stops = Array.from({ length: 7 }, (_, index) => {
    const hue = index * 60;
    return `${hsl(hue, 30, 66)} ${(index / 6) * 100}%`;
  });
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}
