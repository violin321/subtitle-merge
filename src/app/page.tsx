'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
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


const chineseFonts = ['PingFang SC', 'Microsoft YaHei', 'Source Han Sans SC', 'Noto Sans CJK SC', 'Heiti SC', 'SimHei'];
const englishFonts = ['PingFang SC', 'Helvetica Neue', 'Arial', 'Source Sans 3', 'Noto Sans', 'Verdana'];
const colorOptions = [
  { label: '白色', value: '&H00FFFFFF' },
  { label: '暖白', value: '&H00F5F5F5' },
  { label: '浅灰', value: '&H00DCDCDC' },
  { label: '淡黄', value: '&H00A8E9FF' },
];
const outlineColorOptions = [
  { label: '深灰', value: '&H2F2F2F' },
  { label: '柔黑', value: '&H4A4A4A' },
  { label: '黑色', value: '&H000000' },
  { label: '无感灰', value: '&H666666' },
];
const outlineOptions = [
  { label: '无', value: 0 },
  { label: '极细 0.5', value: 0.5 },
  { label: '标准 1.0', value: 1 },
  { label: '稍强 1.3', value: 1.3 },
];


const previewBackgrounds = [
  { id: 'dark', name: '暗场', className: 'bgDark' },
  { id: 'bright', name: '亮场', className: 'bgBright' },
  { id: 'busy', name: '复杂画面', className: 'bgBusy' },
  { id: 'stress', name: '字幕压力测试', className: 'bgStress' },
];

type Preset = {
  id: string;
  name: string;
  description: string;
  options: Partial<MergeOptions>;
};

const presets: Preset[] = [
  {
    id: 'mobile-clear',
    name: '移动端清晰',
    description: '推荐默认值：小画布、细描边，适合手机横屏。',
    options: defaultOptions,
  },
  {
    id: 'desktop-balanced',
    name: '电脑端均衡',
    description: '字号略大，适合电脑播放器外挂字幕。',
    options: { ...defaultOptions, chineseSize: 22, englishSize: 13, outline: 1.1, shadow: 1 },
  },
  {
    id: 'minimal-soft',
    name: '轻描边柔和',
    description: '降低描边和阴影，减少移动端边缘发硬。',
    options: { ...defaultOptions, chineseSize: 20, englishSize: 12, outline: 0.6, shadow: 0, outlineColor: '&H4A4A4A' },
  },
];


function assColorToCss(input: string, fallback = '#ffffff') {
  const match = input.match(/^&H(?:[0-9A-Fa-f]{2})?([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})&?$/);
  if (!match) return fallback;
  const [, b, g, r] = match;
  return `#${r}${g}${b}`;
}

function safeNamePart(input: string) {
  return input
    .replace(/\.(zh|chs|chi|cn|sc|tc|en|eng)?\.(ass|srt|ssa)$/i, '')
    .replace(/\.(ass|srt|ssa)$/i, '')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'subtitle';
}

function presetSlug(id: string) {
  return id.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
}

export default function Home() {
  const [zh, setZh] = useState(sampleZh);
  const [en, setEn] = useState(sampleEn);
  const [zhName, setZhName] = useState('sample.zh.ass');
  const [enName, setEnName] = useState('sample.en.srt');
  const [presetId, setPresetId] = useState(presets[0].id);
  const [previewBg, setPreviewBg] = useState(previewBackgrounds[0].id);
  const [lightboxMode, setLightboxMode] = useState<'phone' | 'desktop' | null>(null);
  const [options, setOptions] = useState<MergeOptions>(defaultOptions);
  const [ass, setAss] = useState('');
  const [stats, setStats] = useState<MergeStats | null>(null);
  const [error, setError] = useState('');

  const selectedPreset = presets.find((preset) => preset.id === presetId) ?? presets[0];
  const selectedBg = previewBackgrounds.find((item) => item.id === previewBg) ?? previewBackgrounds[0];
  const outputName = `${safeNamePart(zhName)}.${presetSlug(presetId)}.bilingual.ass`;

  const previewText = useMemo(() => {
    if (!ass) return ['你在找人吗？', 'Are you looking for someone?'];
    const line = ass.split('\n').find((x) => x.startsWith('Dialogue:') && x.includes('\\N'));
    if (!line) return ['你在找人吗？', 'Are you looking for someone?'];
    const body = line.split(',', 10)[9] ?? '';
    const plain = body.replace(/\{[^}]*\}/g, '').split('\\N').filter(Boolean);
    return [plain[0] || '你在找人吗？', plain.slice(1).join(' ') || 'Are you looking for someone?'];
  }, [ass]);

  const status = stats ? `${stats.pairedCount}/${stats.chineseCount} 已配对` : '就绪';

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const result = mergeSubtitles(zh, en, options);
        setAss(result.ass);
        setStats(result.stats);
        setError('');
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [zh, en, options]);

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

  function applyPreset(id: string) {
    const preset = presets.find((item) => item.id === id) ?? presets[0];
    setPresetId(preset.id);
    setOptions({ ...defaultOptions, ...preset.options });
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
    a.download = outputName;
    a.click();
    URL.revokeObjectURL(url);
  }

  const update = <K extends keyof MergeOptions>(key: K, value: MergeOptions[K]) => setOptions((x) => ({ ...x, [key]: value }));

  return (
    <main className="shell">
      <header className="topbar" aria-label="项目概览">
        <div>
          <p className="kicker">字幕工作台</p>
          <h1>把中英字幕合成适合移动端播放的 ASS 双语字幕。</h1>
        </div>
        <div className="statusStrip" aria-live="polite">
          <span>ASS 输出</span>
          <strong>{status}</strong>
        </div>
      </header>

      <section className="privacyNote" aria-label="隐私说明">
        <strong>本地处理</strong>
        <span>字幕文件只在浏览器内读取和合并，当前版本没有上传接口、数据库或服务器落盘逻辑。</span>
        <a href="/admin">管理入口</a>
      </section>

      <section className="workflow" aria-label="处理流程">
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
            <FileDrop title="中文字幕" fileName={zhName} hint="支持 .ass / .srt / .ssa" onChange={(e) => handleFile(e, 'zh')} />
            <FileDrop title="英文字幕" fileName={enName} hint="支持 .ass / .srt / .ssa" onChange={(e) => handleFile(e, 'en')} />
          </div>

          <div className="editors">
            <label>中文字幕文本<textarea value={zh} onChange={(e) => setZh(e.target.value)} /></label>
            <label>英文字幕文本<textarea value={en} onChange={(e) => setEn(e.target.value)} /></label>
          </div>

          {error && <p className="error">{error}</p>}
          {stats && <Stats stats={stats} />}
        </section>

        <aside className="panel controls" aria-labelledby="style-title">
          <p className="sectionLabel">样式</p>
          <h2 id="style-title">预设与细节</h2>
          <p className="hint">选择预设后仍可微调。默认不使用 LLM，不会改写字幕内容。</p>
          <div className="controlGrid">
            <Control label="样式预设">
              <select value={presetId} onChange={(e) => applyPreset(e.target.value)}>
                {presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
              </select>
            </Control>
            <p className="presetHelp">{selectedPreset.description}</p>
            <Control label="中文字体"><select value={options.chineseFont} onChange={(e) => update('chineseFont', e.target.value)}>{chineseFonts.map((font) => <option key={font} value={font}>{font}</option>)}</select></Control>
            <Control label="中文字号"><input type="number" min="12" value={options.chineseSize} onChange={(e) => update('chineseSize', Number(e.target.value))} /></Control>
            <Control label="英文字体"><select value={options.englishFont} onChange={(e) => update('englishFont', e.target.value)}>{englishFonts.map((font) => <option key={font} value={font}>{font}</option>)}</select></Control>
            <Control label="英文字号"><input type="number" min="8" value={options.englishSize} onChange={(e) => update('englishSize', Number(e.target.value))} /></Control>
            <Control label="英文颜色"><select value={options.englishColor} onChange={(e) => update('englishColor', e.target.value)}>{colorOptions.map((color) => <option key={color.value} value={color.value}>{color.label}</option>)}</select></Control>
            <Control label="描边颜色"><select value={options.outlineColor} onChange={(e) => update('outlineColor', e.target.value)}>{outlineColorOptions.map((color) => <option key={color.value} value={color.value}>{color.label}</option>)}</select></Control>
            <Control label="描边粗细"><select value={options.outline} onChange={(e) => update('outline', Number(e.target.value))}>{outlineOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Control>
            <label className="switch"><input type="checkbox" checked={options.keepEnglishOnly} onChange={(e) => update('keepEnglishOnly', e.target.checked)} /> 保留英文-only 音效/歌词</label>
            <label className="switch"><input type="checkbox" checked={options.preventOverlap} onChange={(e) => update('preventOverlap', e.target.checked)} /> 避免同屏多句上下漂移</label>
          </div>
        </aside>

        <section className="panel previewPanel" aria-labelledby="preview-title">
          <div className="panelHead compact">
            <div>
              <p className="sectionLabel">预览</p>
              <h2 id="preview-title">实时播放预览</h2>
            </div>
            <button className="secondary" onClick={download}>下载 ASS</button>
          </div>
          <p className="downloadName">下载文件名：{outputName}</p>
          <div className="previewToolbar" aria-label="预览背景">
            {previewBackgrounds.map((item) => (
              <button key={item.id} type="button" className={item.id === previewBg ? 'chip active' : 'chip'} onClick={() => setPreviewBg(item.id)}>{item.name}</button>
            ))}
          </div>
          <div className="previewGrid">
            <Device title="手机横屏" mode="phone" bgClass={selectedBg.className} zh={previewText[0]} en={previewText[1]} options={options} onOpen={() => setLightboxMode('phone')} />
            <Device title="电脑播放器" mode="desktop" bgClass={selectedBg.className} zh={previewText[0]} en={previewText[1]} options={options} onOpen={() => setLightboxMode('desktop')} />
          </div>
          {lightboxMode && (
            <div className="lightbox" role="dialog" aria-modal="true" aria-label="放大预览" onClick={() => setLightboxMode(null)}>
              <div className="lightboxInner" onClick={(event) => event.stopPropagation()}>
                <div className="lightboxHead">
                  <strong>{lightboxMode === 'phone' ? '手机横屏放大预览' : '电脑播放器放大预览'}</strong>
                  <button type="button" className="secondary" onClick={() => setLightboxMode(null)}>关闭</button>
                </div>
                <Device title="" mode={lightboxMode} bgClass={selectedBg.className} zh={previewText[0]} en={previewText[1]} options={options} large />
              </div>
            </div>
          )}
        </section>

        <section className="panel outputPanel" aria-labelledby="output-title">
          <div className="panelHead compact">
            <div>
              <p className="sectionLabel">输出</p>
              <h2 id="output-title">生成的 ASS</h2>
            </div>
          </div>
          <textarea value={ass} readOnly placeholder="会随字幕内容和样式设置自动更新。" />
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
  return <div className="stats" aria-label="合并统计">
    <span><b>{stats.chineseCount}</b> 中文</span>
    <span><b>{stats.englishCount}</b> 英文</span>
    <span><b>{stats.pairedCount}</b> 已配对</span>
    <span><b>{stats.unpairedEnglishCount}</b> 英文-only</span>
    <span><b>{stats.outputCount}</b> 输出</span>
  </div>;
}

function Device({ title, mode, bgClass, zh, en, options, onOpen, large = false }: { title: string; mode: 'phone' | 'desktop'; bgClass: string; zh: string; en: string; options: MergeOptions; onOpen?: () => void; large?: boolean }) {
  const scale = large ? (mode === 'phone' ? 1.35 : 1.65) : (mode === 'phone' ? 0.9 : 1.25);
  const chineseSize = Math.max(11, Math.round(options.chineseSize * scale));
  const englishSize = Math.max(9, Math.round(options.englishSize * scale));
  const englishColor = assColorToCss(options.englishColor, '#ffffff');
  const outlineColor = assColorToCss(options.outlineColor, '#2f2f2f');
  const outline = Math.max(0, Number(options.outline) || 0);
  const shadow = Number(options.shadow) || 0;
  const textShadow = outline === 0
    ? (shadow ? `0 ${shadow}px ${shadow * 2}px ${outlineColor}` : 'none')
    : `0 ${outline}px 0 ${outlineColor}, ${outline}px 0 0 ${outlineColor}, -${outline}px 0 0 ${outlineColor}, 0 -${outline}px 0 ${outlineColor}${shadow ? `, 0 ${shadow + outline}px ${shadow * 2}px ${outlineColor}` : ''}`;

  return <figure className={large ? 'deviceWrap large' : 'deviceWrap'}>
    {title && <figcaption>{title}<button type="button" className="openPreview" onClick={onOpen}>放大</button></figcaption>}
    <div className={`${mode === 'phone' ? 'phone' : 'desktop'} ${large ? 'largeDevice' : ''}`}>
      <div className={`frameGrid ${bgClass}`} />
      <div className="subtitle" style={{ textShadow }}>
        <div style={{ fontFamily: options.chineseFont, fontSize: chineseSize }}>{zh}</div>
        <div style={{ fontFamily: options.englishFont, fontSize: englishSize, color: englishColor }}>{en}</div>
      </div>
    </div>
  </figure>;
}
