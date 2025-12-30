# Supabase 集成指南

## 步骤 1: 创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com)
2. 点击 "Start your project" 或 "New Project"
3. 填写项目信息：
   - **Name**: homework-hero (或任意名称)
   - **Database Password**: 设置一个强密码（请记住）
   - **Region**: 选择离你最近的区域（如 Northeast Asia (Tokyo)）
4. 点击 "Create new project"，等待 1-2 分钟初始化完成

## 步骤 2: 运行数据库 Schema

1. 在 Supabase 项目页面，点击左侧菜单的 **"SQL Editor"**
2. 点击 **"New query"**
3. 复制 `supabase-schema.sql` 文件的全部内容
4. 粘贴到 SQL 编辑器中
5. 点击右下角的 **"Run"** 按钮执行
6. 确认看到 "Success. No rows returned" 消息

## 步骤 3: 获取 API 凭证

1. 点击左侧菜单的 **"Settings"** (齿轮图标)
2. 选择 **"API"**
3. 找到以下两个值：
   - **Project URL**: 类似 `https://xxxxx.supabase.co`
   - **anon public**: 一个很长的字符串（点击眼睛图标显示）

## 步骤 4: 配置本地环境变量

1. 在 `homework-app` 目录下创建 `.env.local` 文件
2. 填入以下内容（替换为你的实际值）：

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. 保存文件

## 步骤 5: 重启开发服务器

```bash
# 停止当前的 npm run dev (Ctrl+C)
# 重新启动
npm run dev
```

## 步骤 6: 测试

1. 打开浏览器访问 `http://localhost:5173/stitch-homework-challenger/`
2. 尝试添加一个任务
3. 在 Supabase 项目中，点击 **"Table Editor"** → **"tasks"**，应该能看到新添加的数据

## 验证多端同步

1. 在浏览器 A 添加任务
2. 在浏览器 B（或无痕模式）打开相同 URL
3. 设置相同的用户名（如 "Luka"）
4. 应该能看到浏览器 A 添加的任务

## 注意事项

- `.env.local` 文件已被 `.gitignore` 忽略，不会提交到 GitHub
- 部署到 GitHub Pages 时，需要在 GitHub Secrets 中配置环境变量
- Supabase 免费版有以下限制：
  - 500MB 数据库空间
  - 2GB 带宽/月
  - 50,000 月活跃用户
  - 对于个人项目完全够用

## 故障排查

如果遇到连接问题：
1. 检查 `.env.local` 文件是否正确
2. 确认 Supabase 项目状态为 "Active"
3. 查看浏览器控制台是否有错误信息
4. 确认 SQL Schema 已成功执行
