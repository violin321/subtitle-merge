import { cookies } from 'next/headers';

const COOKIE_NAME = 'subtitle_merge_admin';
const ADMIN_TOKEN = process.env.SUBTITLE_MERGE_ADMIN_TOKEN || 'subtitle-merge-admin';

export default async function AdminPage() {
  const jar = await cookies();
  const authed = jar.get(COOKIE_NAME)?.value === ADMIN_TOKEN;

  if (!authed) {
    return <main className="adminShell">
      <section className="adminCard">
        <p className="sectionLabel">管理登录</p>
        <h1>进入管理面板</h1>
        <p className="hint">请输入管理口令。登录只设置本地 httpOnly cookie，不读取或保存字幕文件。</p>
        <form action="/api/admin/login" method="post" className="adminForm">
          <label>管理口令<input name="passcode" type="password" autoComplete="current-password" required /></label>
          <button type="submit">登录</button>
        </form>
      </section>
    </main>;
  }

  return <main className="adminShell">
    <section className="adminCard wideAdmin">
      <p className="sectionLabel">管理面板</p>
      <h1>Subtitle Merge</h1>
      <div className="adminGrid">
        <div><strong>文件存储</strong><span>不保存。字幕在浏览器内读取、合并和下载。</span></div>
        <div><strong>服务端接口</strong><span>仅管理登录/退出接口。没有字幕上传接口。</span></div>
        <div><strong>默认处理</strong><span>规则匹配时间轴，不调用 LLM。</span></div>
        <div><strong>部署状态</strong><span>Next.js + PM2 + nginx。</span></div>
      </div>
      <form action="/api/admin/logout" method="post"><button className="secondary" type="submit">退出登录</button></form>
    </section>
  </main>;
}
