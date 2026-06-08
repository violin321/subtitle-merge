import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '字幕合并工具｜Subtitle Merge',
  description: '在线合并中英字幕，生成适合移动端和电脑播放器的 ASS 双语字幕；文件仅在浏览器本地处理，不上传服务器。',
  icons: { icon: '/icon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
