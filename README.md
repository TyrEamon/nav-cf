# Nav Item CF

一个个人导航站，带首页导航、聚合搜索、友链弹窗和后台管理。当前仓库是 Cloudflare 原生部署版本：前端跑在 Cloudflare Pages，接口跑在 Pages Functions，数据放在 D1。

线上地址：

```text
null
```

## 功能

- 首页卡片式导航
- 菜单和子菜单分类
- Google / 百度 / Bing / GitHub / 站内搜索
- 后台登录管理
- 菜单、卡片、广告位、友链管理
- 登录时间和 IP 记录
- 旧 SQLite 数据导入 D1

## 技术栈

- Vue 3
- Vite
- Cloudflare Pages
- Cloudflare Pages Functions
- Cloudflare D1
- Cloudflare R2，可选，仅在需要上传文件存储时使用

原来的 Express + SQLite + Docker 文件仍然保留，但推荐使用 Cloudflare 原生部署。

## 目录

```text
.
├── app.js                    # 旧版 Express 入口
├── db.js                     # 旧版 SQLite 初始化
├── routes/                   # 旧版 Express API
├── scripts/
│   └── export-sqlite-for-d1.mjs
├── web/
│   ├── functions/            # Cloudflare Pages Functions API
│   ├── public/               # 静态资源
│   ├── src/                  # Vue 前端
│   ├── schema.sql            # D1 表结构
│   ├── wrangler.toml         # Cloudflare 绑定配置
│   └── package.json
└── CLOUDFLARE_DEPLOY.md      # 详细部署说明
```

## 本地开发

前端开发：

```bash
cd web
npm install
npm run dev
```

生产构建：

```bash
cd web
npm run build
```

Cloudflare Pages 本地预览：

```bash
cd web
npm run build
npx wrangler pages dev dist
```

## Cloudflare 部署

当前配置使用 D1：

```toml
[[d1_databases]]
binding = "DB"
database_name = "nav-item"
database_id = "a43c2924-e816-4043-9c8e-b69c574ab4d3"
```

部署到 Pages：

```bash
cd web
npm run build
npx wrangler pages deploy dist --project-name nav-cf --branch main
```

Cloudflare Pages 构建设置：

```text
Root directory: web
Build command: npm run build
Build output directory: dist
```

需要在 Cloudflare Pages 环境变量里设置：

```text
JWT_SECRET=your-long-random-secret
```

不要把真实 `JWT_SECRET` 写进仓库。

## 导入旧数据库

把旧的 `nav.db` 放到本地 `database/nav.db`，然后导出为 D1 SQL：

```bash
node scripts/export-sqlite-for-d1.mjs database/nav.db web/d1-data.sql
cd web
npx wrangler d1 execute nav-item --remote --file=schema.sql
npx wrangler d1 execute nav-item --remote --file=d1-data.sql
```

脚本会导出菜单、子菜单、卡片、用户、广告和友链。用户密码保留原来的 bcrypt hash，导入后原账号密码仍可使用。

如果旧数据里有孤儿卡片引用了不存在的菜单或子菜单，导出脚本会跳过这些无效记录，避免 D1 外键导入失败。

## 文件和隐私

以下文件不会提交到仓库：

```text
database/
*.db
*.sqlite
*.sqlite3
web/d1-data.sql
.env
.dev.vars
node_modules/
web/node_modules/
web/dist/
```

数据库、导出的 SQL、密钥和本地构建产物都只保留在本机或 Cloudflare，不进 Git。

## 上传文件

当前线上版本没有启用 R2。后台主要使用 logo 链接字段，不依赖本地上传目录。

如果以后需要恢复上传文件功能：

1. 创建 R2 bucket
2. 在 `web/wrangler.toml` 里添加 `UPLOADS` 绑定
3. 将旧 `uploads/` 文件按相同 key 上传到 R2

## License

MIT
