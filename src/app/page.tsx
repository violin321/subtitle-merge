'use client';

import { useMemo, useState } from 'react';
import { defaultOptions, mergeSubtitles, type MergeOptions, type MergeStats } from '@/lib/subtitles';

const sampleZh = `[Script Info]
ScriptType: v4.00+
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Zh,Microsoft YaHei,58,&H00FFFFFF,&H000000FF,&H00000000,&HA0000000,0,0,0,0,100,100,0,0,1,3,0,2,80,80,120,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 1,0:00:02.00,0:00:04.10,Zh,,0,0,0,,你在找人吗？
Dialogue: 1,0:00:05.00,0:00:08.00,Zh,,0,0,0,,这是一句比较长的中文台词\\N会自然分成两行
`;

const sampleEn = `1
00:00:02,020 --> 00:00:04,000
Are you looking for someone?

2
00:00:05,100 --> 00:00:08,000
This is a longer English subtitle that sits under the Chinese line.
`;

export default function Home() {
  const [zh, setZh] = useState(sampleZh);
  const [en, setEn] = useState(sampleEn);
  const [options, setOptions] = useState<MergeOptions>(defaultOptions);
  const [ass, setAss] = useState('');
  const [stats, setStats] = useState<MergeStats | null>(null);
  const [error, setError] = useState('');

  const previewText = useMemo(() => {
    if (!ass) return ['你在找人吗？', 'Are you looking for someone?'];
    const line = ass.split('\n').find((x) => x.startsWith('Dialogue:') && x.includes('\\N'));
    if (!line) return ['你在找人吗？', 'Are you looking for someone?'];
    const body = line.split(',', 10)[9] ?? '';
    const plain = body.replace(/\{[^}]*\}/g, '').split('\\N');
    return [plain[0] || '你在找人吗？', plain.slice(1).join(' ') || 'Are you looking for someone?'];
  }, [ass]);

  function runMerge() {
    try {
      const result = mergeSubtitles(zh, en, options);
      setAss(result.ass);
      setStats(result.stats);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function download() {
    const blob = new Blob([ass], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged.yyets-iphone.ass';
    a.click();
    URL.revokeObjectURL(url);
  }

  const update = <K extends keyof MergeOptions>(key: K, value: MergeOptions[K]) => setOptions((x) => ({ ...x, [key]: value }));

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Open-source bilingual subtitle tool</p>
          <h1>Subtitle Merge</h1>
          <p>把中文和英文字幕合并成紧凑、iPhone 友好的 ASS 双语字幕。默认采用 YYeTs 风格：单条 Dialogue、中文主行、英文小字号第二行、384×288 小画布、描边不缩放。</p>
        </div>
        <div className="heroCard">
          <strong>默认不调用 LLM</strong>
          <span>规则配对优先：按时间轴 overlap 合并。LLM 只作为未来“难对齐/补翻译/润色”的可选增强。</span>
        </div>
      </section>

      <section className="grid">
        <div className="panel wide">
          <h2>1. 输入字幕</h2>
          <div className="twoCols">
            <label>中文字幕（ASS/SRT）<textarea value={zh} onChange={(e) => setZh(e.target.value)} /></label>
            <label>英文字幕（ASS/SRT）<textarea value={en} onChange={(e) => setEn(e.target.value)} /></label>
          </div>
          <div className="actions">
            <button onClick={runMerge}>合并字幕</button>
            <button className="secondary" disabled={!ass} onClick={download}>下载 ASS</button>
          </div>
          {error && <p className="error">{error}</p>}
          {stats && <div className="stats">
            <span>中文 {stats.chineseCount}</span><span>英文 {stats.englishCount}</span><span>配对 {stats.pairedCount}</span><span>未配对英文 {stats.unpairedEnglishCount}</span><span>输出 {stats.outputCount}</span>
          </div>}
        </div>

        <div className="panel">
          <h2>2. 样式调节</h2>
          <div className="controls">
            <label>中文字体<input value={options.chineseFont} onChange={(e) => update('chineseFont', e.target.value)} /></label>
            <label>中文字号<input type="number" value={options.chineseSize} onChange={(e) => update('chineseSize', Number(e.target.value))} /></label>
            <label>英文字体<input value={options.englishFont} onChange={(e) => update('englishFont', e.target.value)} /></label>
            <label>英文字号<input type="number" value={options.englishSize} onChange={(e) => update('englishSize', Number(e.target.value))} /></label>
            <label>英文颜色<input value={options.englishColor} onChange={(e) => update('englishColor', e.target.value)} /></label>
            <label>描边颜色<input value={options.outlineColor} onChange={(e) => update('outlineColor', e.target.value)} /></label>
            <label>描边<input type="number" step="0.1" value={options.outline} onChange={(e) => update('outline', Number(e.target.value))} /></label>
            <label className="check"><input type="checkbox" checked={options.keepEnglishOnly} onChange={(e) => update('keepEnglishOnly', e.target.checked)} /> 保留英文-only 音效/歌词</label>
          </div>
        </div>

        <div className="panel previews">
          <h2>3. 预览</h2>
          <div className="previewGrid">
            <Device title="iPhone 横屏" mode="phone" zh={previewText[0]} en={previewText[1]} options={options} />
            <Device title="电脑播放器" mode="desktop" zh={previewText[0]} en={previewText[1]} options={options} />
          </div>
        </div>

        <div className="panel wide">
          <h2>4. 输出 ASS</h2>
          <textarea value={ass} readOnly placeholder="点击“合并字幕”后在这里查看 ASS 输出。" />
        </div>
      </section>
    </main>
  );
}

function Device({ title, mode, zh, en, options }: { title: string; mode: 'phone' | 'desktop'; zh: string; en: string; options: MergeOptions }) {
  return <div>
    <h3>{title}</h3>
    <div className={mode === 'phone' ? 'phone' : 'desktop'}>
      <div className="scene" />
      <div className="subtitle">
        <div style={{ fontFamily: options.chineseFont, fontSize: mode === 'phone' ? 18 : 26 }}>{zh}</div>
        <div style={{ fontFamily: options.englishFont, fontSize: mode === 'phone' ? 12 : 17, color: '#fff' }}>{en}</div>
      </div>
    </div>
  </div>;
}
