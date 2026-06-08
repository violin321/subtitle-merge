export type SubtitleFormat = 'ass' | 'srt' | 'unknown';

export interface Cue {
  start: number;
  end: number;
  text: string;
  style?: string;
}

export interface MergeOptions {
  chineseFont: string;
  chineseSize: number;
  englishFont: string;
  englishSize: number;
  primaryColor: string;
  englishColor: string;
  outlineColor: string;
  outline: number;
  shadow: number;
  playResX: number;
  playResY: number;
  marginV: number;
  keepEnglishOnly: boolean;
  maxPairStartDrift: number;
  maxPairEndDrift: number;
}

export interface MergeStats {
  chineseCount: number;
  englishCount: number;
  pairedCount: number;
  unpairedEnglishCount: number;
  outputCount: number;
}

export interface MergeResult {
  ass: string;
  stats: MergeStats;
  preview: Array<{ start: string; end: string; text: string }>;
}

export const defaultOptions: MergeOptions = {
  chineseFont: 'PingFang SC',
  chineseSize: 20,
  englishFont: 'PingFang SC',
  englishSize: 12,
  primaryColor: '&H00FFFFFF',
  englishColor: '&H00FFFFFF',
  outlineColor: '&H2F2F2F',
  outline: 1,
  shadow: 1,
  playResX: 384,
  playResY: 288,
  marginV: 5,
  keepEnglishOnly: true,
  maxPairStartDrift: 0.5,
  maxPairEndDrift: 0.75,
};

export function detectFormat(input: string): SubtitleFormat {
  const s = input.trimStart();
  if (s.includes('[Script Info]') || s.includes('[V4+ Styles]') || s.includes('[Events]')) return 'ass';
  if (/^\d+\s*\r?\n\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->/.test(s)) return 'srt';
  if (/\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->/.test(s)) return 'srt';
  return 'unknown';
}

export function parseSubtitles(input: string, preferredStyles: string[] = []): Cue[] {
  const format = detectFormat(input);
  if (format === 'ass') return parseAss(input, preferredStyles);
  if (format === 'srt') return parseSrt(input);
  // Try ASS then SRT so extensionless uploads still work.
  const ass = parseAss(input, preferredStyles);
  if (ass.length) return ass;
  return parseSrt(input);
}

export function parseAss(input: string, preferredStyles: string[] = []): Cue[] {
  const lines = input.replace(/^\uFEFF/, '').split(/\r?\n/);
  const cues: Cue[] = [];
  let inEvents = false;
  let fields: string[] = ['Layer', 'Start', 'End', 'Style', 'Name', 'MarginL', 'MarginR', 'MarginV', 'Effect', 'Text'];
  const styleSet = new Set(preferredStyles.map((x) => x.toLowerCase()));

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\[Events\]/i.test(trimmed)) {
      inEvents = true;
      continue;
    }
    if (inEvents && /^\[/.test(trimmed)) inEvents = false;
    if (!inEvents) continue;
    if (/^Format:/i.test(line)) {
      fields = line.slice(line.indexOf(':') + 1).split(',').map((x) => x.trim());
      continue;
    }
    if (!/^Dialogue:/i.test(line)) continue;
    const payload = line.slice(line.indexOf(':') + 1).trimStart();
    const parts = splitAssDialogue(payload, fields.length);
    const get = (name: string) => parts[fields.findIndex((f) => f.toLowerCase() === name.toLowerCase())] ?? '';
    const style = get('Style').replace(/^\*/, '').trim();
    if (styleSet.size && !styleSet.has(style.toLowerCase())) continue;
    const start = parseAssTime(get('Start'));
    const end = parseAssTime(get('End'));
    const text = normalizeAssText(get('Text'));
    if (Number.isFinite(start) && Number.isFinite(end) && end > start && text) {
      cues.push({ start, end, style, text });
    }
  }
  return cues.sort((a, b) => a.start - b.start || a.end - b.end);
}

function splitAssDialogue(payload: string, fieldCount: number): string[] {
  const needed = Math.max(1, fieldCount - 1);
  const parts: string[] = [];
  let rest = payload;
  for (let i = 0; i < needed; i++) {
    const idx = rest.indexOf(',');
    if (idx < 0) {
      parts.push(rest);
      rest = '';
      break;
    }
    parts.push(rest.slice(0, idx));
    rest = rest.slice(idx + 1);
  }
  parts.push(rest);
  while (parts.length < fieldCount) parts.push('');
  return parts;
}

export function parseSrt(input: string): Cue[] {
  const blocks = input.replace(/^\uFEFF/, '').replace(/\r/g, '').split(/\n{2,}/);
  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((x) => x.trimEnd()).filter(Boolean);
    if (!lines.length) continue;
    const timeIndex = lines.findIndex((l) => l.includes('-->'));
    if (timeIndex < 0) continue;
    const [startRaw, endRaw] = lines[timeIndex].split('-->').map((x) => x.trim().split(/\s+/)[0]);
    const start = parseSrtTime(startRaw);
    const end = parseSrtTime(endRaw);
    const text = lines.slice(timeIndex + 1).join('\\N').replace(/<[^>]+>/g, '').trim();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start && text) cues.push({ start, end, text });
  }
  return cues.sort((a, b) => a.start - b.start || a.end - b.end);
}

export function mergeSubtitles(chineseInput: string, englishInput: string, options: Partial<MergeOptions> = {}): MergeResult {
  const opts = { ...defaultOptions, ...options };
  const zhAll = parseSubtitles(chineseInput);
  const enAll = parseSubtitles(englishInput);
  const zh = choosePrimaryLanguageCues(zhAll, 'zh');
  const en = choosePrimaryLanguageCues(enAll, 'en');
  const used = new Set<number>();
  const output: Array<{ start: number; end: number; text: string }> = [];
  let pairedCount = 0;

  for (const z of zh) {
    let bestIndex = -1;
    let bestScore = -Infinity;
    en.forEach((e, i) => {
      if (used.has(i)) return;
      const ov = overlapSeconds(z, e);
      if (ov <= 0.05) return;
      const drift = Math.abs(z.start - e.start) + Math.abs(z.end - e.end) * 0.35;
      const score = ov - drift * 0.15;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    });
    if (bestIndex >= 0) {
      const e = en[bestIndex];
      used.add(bestIndex);
      pairedCount++;
      const start = Math.abs(z.start - e.start) <= opts.maxPairStartDrift ? Math.min(z.start, e.start) : z.start;
      const end = Math.abs(z.end - e.end) <= opts.maxPairEndDrift ? Math.max(z.end, e.end) : z.end;
      output.push({ start, end, text: bilingualText(z.text, e.text, opts) });
    } else {
      output.push({ start: z.start, end: z.end, text: escapeAssText(z.text) });
    }
  }

  if (opts.keepEnglishOnly) {
    en.forEach((e, i) => {
      if (!used.has(i)) output.push({ start: e.start, end: e.end, text: englishOverride(e.text, opts) });
    });
  }
  output.sort((a, b) => a.start - b.start || a.end - b.end);
  const ass = renderAss(output, opts);
  return {
    ass,
    stats: {
      chineseCount: zh.length,
      englishCount: en.length,
      pairedCount,
      unpairedEnglishCount: en.length - pairedCount,
      outputCount: output.length,
    },
    preview: output.slice(0, 10).map((x) => ({ start: formatAssTime(x.start), end: formatAssTime(x.end), text: x.text })),
  };
}

function choosePrimaryLanguageCues(cues: Cue[], lang: 'zh' | 'en'): Cue[] {
  // If a source is already bilingual ASS, pick cues with stronger target-language signal, but keep all when unknown.
  const scored = cues.map((cue) => ({ cue, score: lang === 'zh' ? chineseScore(cue.text) : englishScore(cue.text) }));
  const positives = scored.filter((x) => x.score > 0);
  if (positives.length >= Math.max(3, cues.length * 0.35)) return positives.map((x) => x.cue);
  return cues;
}

function chineseScore(s: string): number {
  return (s.match(/[\u3400-\u9fff]/g) ?? []).length;
}

function englishScore(s: string): number {
  const letters = (s.match(/[A-Za-z]/g) ?? []).length;
  const cn = chineseScore(s);
  return Math.max(0, letters - cn * 2);
}

function bilingualText(zh: string, en: string, opts: MergeOptions): string {
  return `${escapeAssText(zh)}\\N${englishOverride(en, opts)}`;
}

function englishOverride(en: string, opts: MergeOptions): string {
  return `{\\fn${escapeTagValue(opts.englishFont)}\\fs${opts.englishSize}\\b0\\c${normalizeAssColor(opts.englishColor)}&\\3c${normalizeAssColor(opts.outlineColor)}&\\4c&H000000&}${escapeAssText(en)}`;
}

function renderAss(cues: Array<{ start: number; end: number; text: string }>, opts: MergeOptions): string {
  const style = `Style: Default,${opts.chineseFont},${opts.chineseSize},${normalizeFullAssColor(opts.primaryColor)},&H0000FFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,${opts.outline},${opts.shadow},2,5,5,${opts.marginV},1`;
  const header = `[Script Info]\n; Generated by subtitle-merge\n; Mode: single-dialogue bilingual block, mobile-friendly style\nScriptType: v4.00+\nCollisions: Normal\nPlayResX: ${opts.playResX}\nPlayResY: ${opts.playResY}\nTimer: 100.0000\nWrapStyle: 0\nScaledBorderAndShadow: no\nYCbCr Matrix: TV.709\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n${style}\n\n[Events]\nFormat: Layer, Start, End, Style, Actor, MarginL, MarginR, MarginV, Effect, Text\n`;
  const body = cues.map((cue) => `Dialogue: 0,${formatAssTime(cue.start)},${formatAssTime(cue.end)},Default,,0000,0000,0000,,${cue.text}`).join('\n');
  return `\uFEFF${header}${body}\n`;
}

function overlapSeconds(a: Cue, b: Cue): number {
  return Math.min(a.end, b.end) - Math.max(a.start, b.start);
}

export function parseAssTime(s: string): number {
  const m = s.trim().match(/^(\d+):(\d{2}):(\d{2})(?:\.(\d{1,2}))?$/);
  if (!m) return Number.NaN;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number((m[4] ?? '0').padEnd(2, '0')) / 100;
}

export function parseSrtTime(s: string): number {
  const m = s.trim().match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{1,3})$/);
  if (!m) return Number.NaN;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4].padEnd(3, '0')) / 1000;
}

export function formatAssTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec - h * 3600 - m * 60;
  return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
}

function normalizeAssText(text: string): string {
  return text
    .replace(/\{[^}]*\}/g, '')
    .replace(/\\[Nn]/g, '\\N')
    .replace(/\\h/g, ' ')
    .trim();
}

function escapeAssText(text: string): string {
  return text.replace(/\r?\n/g, '\\N').replace(/\{([^}]*)\}/g, '');
}

function escapeTagValue(text: string): string {
  return text.replace(/[{}\\]/g, '');
}

function normalizeFullAssColor(input: string): string {
  const v = input.trim();
  if (/^&H[0-9A-Fa-f]{8}$/.test(v)) return v.toUpperCase();
  if (/^&H[0-9A-Fa-f]{6}$/.test(v)) return `&H00${v.slice(2)}`.toUpperCase();
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
    const r = v.slice(1, 3), g = v.slice(3, 5), b = v.slice(5, 7);
    return `&H00${b}${g}${r}`.toUpperCase();
  }
  return '&H00FFFFFF';
}

function normalizeAssColor(input: string): string {
  const full = normalizeFullAssColor(input);
  return `&H${full.slice(-6)}`;
}
