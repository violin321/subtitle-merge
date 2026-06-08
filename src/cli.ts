#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { mergeSubtitles, defaultOptions, type MergeOptions } from './lib/subtitles';

function usage(): never {
  console.error(`Usage: npm run merge -- --zh zh.ass --en en.srt --out merged.ass [--drop-english-only]

Options:
  --zh <file>                 Chinese subtitle file (ASS/SRT)
  --en <file>                 English subtitle file (ASS/SRT)
  --out <file>                Output ASS path
  --zh-font <name>            Default: ${defaultOptions.chineseFont}
  --zh-size <number>          Default: ${defaultOptions.chineseSize}
  --en-font <name>            Default: ${defaultOptions.englishFont}
  --en-size <number>          Default: ${defaultOptions.englishSize}
  --drop-english-only         Remove unpaired English cues such as lyrics/SFX
`);
  process.exit(1);
}

const args = process.argv.slice(2);
const get = (flag: string) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const zh = get('--zh');
const en = get('--en');
const out = get('--out');
if (!zh || !en || !out) usage();
const options: Partial<MergeOptions> = {
  chineseFont: get('--zh-font') ?? defaultOptions.chineseFont,
  englishFont: get('--en-font') ?? defaultOptions.englishFont,
  chineseSize: Number(get('--zh-size') ?? defaultOptions.chineseSize),
  englishSize: Number(get('--en-size') ?? defaultOptions.englishSize),
  keepEnglishOnly: !args.includes('--drop-english-only'),
};
const result = mergeSubtitles(readFileSync(zh, 'utf8'), readFileSync(en, 'utf8'), options);
writeFileSync(out, result.ass, 'utf8');
console.log(JSON.stringify(result.stats, null, 2));
