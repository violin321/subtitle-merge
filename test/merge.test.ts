import assert from 'node:assert/strict';
import { mergeSubtitles, parseSrt, parseAss } from '../src/lib/subtitles';

const zhAss = `[Script Info]
ScriptType: v4.00+
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 1,0:00:02.00,0:00:04.00,Zh,,0,0,0,,你好
Dialogue: 1,0:00:05.00,0:00:07.00,Zh,,0,0,0,,第二句
`;
const enSrt = `1
00:00:02,100 --> 00:00:04,100
Hello

2
00:00:08,000 --> 00:00:09,000
[Music]
`;

assert.equal(parseAss(zhAss).length, 2);
assert.equal(parseSrt(enSrt).length, 2);
const keep = mergeSubtitles(zhAss, enSrt, { keepEnglishOnly: true });
assert.equal(keep.stats.chineseCount, 2);
assert.equal(keep.stats.englishCount, 2);
assert.equal(keep.stats.pairedCount, 1);
assert.equal(keep.stats.unpairedEnglishCount, 1);
assert.match(keep.ass, /PlayResX: 384/);
assert.match(keep.ass, /ScaledBorderAndShadow: no/);
assert.match(keep.ass, /你好\\N/);
assert.match(keep.ass, /Hello/);
assert.match(keep.ass, /\[Music\]/);
const drop = mergeSubtitles(zhAss, enSrt, { keepEnglishOnly: false });
assert.equal(drop.stats.outputCount, 2);
assert.doesNotMatch(drop.ass, /\[Music\]/);
console.log('merge tests passed');
