# Subtitle Merge

Subtitle Merge is a small open-source web app and CLI for merging Chinese and English subtitles into compact ASS bilingual subtitles.

The default output imitates the classic YYeTs-style layout that works well on iPhone:

- one `Dialogue` block per bilingual subtitle, not two overlaid tracks
- Chinese on the main line, English as a smaller inline override below it
- `PlayResX: 384`, `PlayResY: 288`
- `ScaledBorderAndShadow: no` so outlines stay thin on mobile players
- default Chinese font `PingFang SC`, default English font `PingFang SC`
- English line defaults to `\fs12`, white text, dark-gray outline `&H2F2F2F&`

## Why not LLM by default?

Most subtitle pairs only need deterministic time-overlap matching. This project does **not** call an LLM by default, which keeps it fast, cheap, private, and reproducible.

LLM support is a future optional enhancement for hard cases:

- badly shifted timelines
- semantic alignment when timestamps differ a lot
- translation repair or style polishing
- deciding whether English-only lyrics/SFX should be kept

## Web app

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

The page supports:

- paste/upload-style text areas for Chinese and English ASS/SRT content
- merge and download ASS
- iPhone and desktop visual previews
- adjustable font, size, color, outline, and English-only retention
- merge stats: Chinese count, English count, paired count, unpaired English count, output count

## CLI

```bash
npm run merge -- \
  --zh ./input.zh.ass \
  --en ./input.en.srt \
  --out ./merged.yyets-iphone.ass
```

Useful options:

```bash
--zh-font "PingFang SC"
--zh-size 20
--en-font "PingFang SC"
--en-size 12
--drop-english-only
```

## Default ASS style

```ass
PlayResX: 384
PlayResY: 288
WrapStyle: 0
ScaledBorderAndShadow: no
Style: Default,PingFang SC,20,&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,1,2,5,5,5,1
```

Example output line:

```ass
Dialogue: 0,0:00:02.00,0:00:04.10,Default,,0000,0000,0000,,你在找人吗？\N{\fnPingFang SC\fs12\b0\c&HFFFFFF&\3c&H2F2F2F&\4c&H000000&}Are you looking for someone?
```

## Deployment notes for `sub.violinai.qzz.io`

Recommended deployment:

1. Build the Next.js app:
   ```bash
   npm run build
   ```
2. Run it with pm2 or Docker on an internal port, for example `3018`.
3. Add an nginx reverse proxy:
   ```nginx
   server {
     server_name sub.violinai.qzz.io;
     location / {
       proxy_pass http://127.0.0.1:3018;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```
4. Point DNS for `sub.violinai.qzz.io` to the host.

## Development

```bash
npm run test
npm run typecheck
npm run build
```

## License

MIT
