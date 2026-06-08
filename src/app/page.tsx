'use client';

import { ChangeEvent, useMemo, useState } from 'react';
import { defaultOptions, mergeSubtitles, type MergeOptions, type MergeStats } from '@/lib/subtitles';

const sampleZh = `[Script Info]
ScriptType: v4.00+
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Zh,Microsoft YaHei,58,&H00FFFFFF,&H000000FF,&H00000000,&HA0000000,0,0,0,0,100,100,0,0,1,3,0,2,80,80,120,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 1,0:00:02.00,0:00:04.10,Zh,,0,0,0,,你在找人吗？
Dialogue: 1,0:00:05.00,0:00:08.00,Zh,,0,0,0,,这是一句比较长的中文台词\N会自然分成两行
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
  const [zhName, setZhName] = useState('sample.zh.ass');
  const [enName, setEnName] = useState('sample.en.srt');
  const [options, setOptions] = useState<MergeOptions>(defaultOptions);
  const [ass, setAss] = useState('');
  const [stats, setStats] = useState<MergeStats | null>(null);
  const [error, setError] = useState('');

  const previewText = useMemo(() => {
    if (!ass) return ['你在找人吗？', 'Are you looking for someone?'];
    const line = ass.split('\n').find((x) => x.startsWith('Dialogue:') && x.includes('\\N'));
    if (!line) return ['你在找人吗？', 'Are you looking for someone?'];
    const body = line.split(',', 10)[9] ?? '';
    const plain = body.replace(/\{[^}]*\}/g, '').split('\\N').filter(Boolean);
    return [plain[0] || '你在找人吗？', plain.slice(1).join(' ') || 'Are you looking for someone?'];
  }, [ass]);

  const status = stats ? `${stats.pairedCount}/${stats.chineseCount} 已配对` : '就绪';

  function handleFile(event: ChangeEvent<HTMLInputElement>, target: 'zh' | 'en') {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      if (target === 'zh') {
        setZh(text);
        setZhName(file.name);
      } else {
        setEn(text);
        setEnName(file.name);
      }
    };
    reader.readAsText(file);
  }

  function runMerge() {
    try {
      const result = mergeSubtitles(zh, en, options);
      setAss(result.ass);
      setStats(result.stats);
      setError('');
      return result.ass;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      return '';
    }
  }

  function download() {
    const content = ass || runMerge();
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged.yyets-iphone.ass';
    a.click();
    URL.revokeObjectURL(url);
  }

  const update = <K extends keyof MergeOptions>(key: K, value: MergeOptions[K]) => setOptions((x) => ({ ...x, [key]: value }));

  return (
    <main className="shell">
      <header className="topbar" aria-label="Project summary">
        <div>
          <p className="kicker">字幕工作台</p>
          <h1>把中英字幕合成适合 iPhone 播放的 ASS 双语字幕。</h1>
        </div>
        <div className="statusStrip" aria-live="polite">
          <span>ASS 输出</span>
          <strong>{status}</strong>
        </div>
      </header>

      <section className="workflow" aria-label="Main workflow">
        <div className="step active"><span>01</span>上传字幕</div>
        <div className="step"><span>02</span>调整样式</div>
        <div className="step"><span>03</span>预览效果</div>
        <div className="step"><span>04</span>导出 ASS</div>
      </section>

      <section className="workbench">
        <section className="panel inputPanel" aria-labelledby="input-title">
          <div className="panelHead">
            <div>
              <p className="sectionLabel">输入</p>
              <h2 id="input-title">字幕来源</h2>
            </div>
            <button onClick={runMerge}>立即合并</button>
          </div>

          <div className="uploadRail">
            <FileDrop title="中文字幕" fileName={zhName} hint=".ass / .srt / .ssa" onChange={(e) => handleFile(e, 'zh')} />
            <FileDrop title="英文字幕" fileName={enName} hint=".ass / .srt / .ssa" onChange={(e) => handleFile(e, 'en')} />
          </div>

          <div className="editors">
            <label>中文字幕文本<textarea value={zh} onChange={(e) => setZh(e.target.value)} /></label>
            <label>英文字幕文本<textarea value={en} onChange={(e) => setEn(e.target.value)} /></label>
          </div>

          {error && <p className="error">{error}</p>}
          {stats && <Stats stats={stats} />}
        </section>

        <aside className="panel controls" aria-labelledby="style-title">
          <p className="sectionLabel">样式预设</p>
          <h2 id="style-title">YYeTs / iPhone</h2>
          <p className="hint">单条 Dialogue 双语块，384×288 画布，描边不随分辨率缩放。默认不使用 LLM。</p>
          <div className="controlGrid">
            <Control label="中文字体"><input value={options.chineseFont} onChange={(e) => update('chineseFont', e.target.value)} /></Control>
            <Control label="中文字号"><input type="number" min="12" value={options.chineseSize} onChange={(e) => update('chineseSize', Number(e.target.value))} /></Control>
            <Control label="英文字体"><input value={options.englishFont} onChange={(e) => update('englishFont', e.target.value)} /></Control>
            <Control label="英文字号"><input type="number" min="8" value={options.englishSize} onChange={(e) => update('englishSize', Number(e.target.value))} /></Control>
            <Control label="英文颜色"><input value={options.englishColor} onChange={(e) => update('englishColor', e.target.value)} /></Control>
            <Control label="描边颜色"><input value={options.outlineColor} onChange={(e) => update('outlineColor', e.target.value)} /></Control>
            <Control label="描边粗细"><input type="number" step="0.1" min="0" value={options.outline} onChange={(e) => update('outline', Number(e.target.value))} /></Control>
            <label className="switch"><input type="checkbox" checked={options.keepEnglishOnly} onChange={(e) => update('keepEnglishOnly', e.target.checked)} /> 保留英文-only 音效/歌词</label>
          </div>
        </aside>

        <section className="panel previewPanel" aria-labelledby="preview-title">
          <div className="panelHead compact">
            <div>
              <p className="sectionLabel">预览</p>
              <h2 id="preview-title">播放预览</h2>
            </div>
            <button className="secondary" onClick={download}>下载 ASS</button>
          </div>
          <div className="previewGrid">
            <Device title="iPhone 横屏" mode="phone" zh={previewText[0]} en={previewText[1]} options={options} />
            <Device title="电脑播放器" mode="desktop" zh={previewText[0]} en={previewText[1]} options={options} />
          </div>
        </section>

        <section className="panel outputPanel" aria-labelledby="output-title">
          <div className="panelHead compact">
            <div>
              <p className="sectionLabel">输出</p>
              <h2 id="output-title">生成的 ASS</h2>
            </div>
          </div>
          <textarea value={ass} readOnly placeholder="合并后可在这里检查 ASS 输出。" />
        </section>
      </section>
    </main>
  );
}

function FileDrop({ title, hint, fileName, onChange }: { title: string; hint: string; fileName: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="fileDrop">
      <input type="file" accept=".ass,.srt,.ssa,text/plain" onChange={onChange} />
      <span className="fileBadge">ASS</span>
      <span>
        <strong>{title}</strong>
        <small>{hint}</small>
      </span>
      <em title={fileName}>{fileName}</em>
    </label>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="control"><span>{label}</span>{children}</label>;
}

function Stats({ stats }: { stats: MergeStats }) {
  return <div className="stats" aria-label="Merge statistics">
    <span><b>{stats.chineseCount}</b> 中文</span>
    <span><b>{stats.englishCount}</b> 英文</span>
    <span><b>{stats.pairedCount}</b> 已配对</span>
    <span><b>{stats.unpairedEnglishCount}</b> 英文-only</span>
    <span><b>{stats.outputCount}</b> 输出</span>
  </div>;
}

function Device({ title, mode, zh, en, options }: { title: string; mode: 'phone' | 'desktop'; zh: string; en: string; options: MergeOptions }) {
  return <figure className="deviceWrap">
    <figcaption>{title}</figcaption>
    <div className={mode === 'phone' ? 'phone' : 'desktop'}>
      <div className="frameGrid" />
      <div className="subtitle">
        <div style={{ fontFamily: options.chineseFont, fontSize: mode === 'phone' ? 18 : 25 }}>{zh}</div>
        <div style={{ fontFamily: options.englishFont, fontSize: mode === 'phone' ? 12 : 16 }}>{en}</div>
      </div>
    </div>
  </figure>;
}
