import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Subtitle Merge｜双语字幕合并',
  description: 'Merge Chinese and English subtitles into compact iPhone-friendly ASS bilingual subtitles.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
