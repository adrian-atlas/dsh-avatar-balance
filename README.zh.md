# dsh-avatar-balance —— DeepSeek 余额

在侧边栏底部、账号头像那一行的正上方显示 DeepSeek 账户余额 —— 不用再点「设置 → 账户」。

```
侧边栏底部（与头像行同宽，占满整行）
┌──────────────────────────────┐
│ 👛 余额        ⚠ ¥12.34 +¥0.50 ⟳ │   ← 低于阈值：黄色 ⚠
│ 🧑 Lawrence              ●  ↑ │   ← 账号头像行（DSH 自带）
└──────────────────────────────┘

余额充足时，⚠ 变成绿色 ✓：

│ 👛 余额              ✓ ¥28.50 ⟳ │
```

- **宽度**：整行占满侧边栏，和下面的账号头像行等宽（左内边距与头像对齐）。
- **颜色状态**：合计余额（充值 + 赠金）低于阈值 → 黄色 ⚠ 并把金额标黄；≥ 阈值 → 绿色 ✓。
- **阈值可调**：点 ⚠ / ✓ 标记弹出小面板，改数字 → 保存（Enter 直接保存），默认 20 元，存在浏览器 localStorage。
- 显示充值余额；有赠金时在后面补 `+¥x.xx`，两种货币（CNY / USD）分开显示。
- 刷新时机：挂载时一次；**任一任务从「运行中」结束**后 3 秒（等平台结算）；每 2 分钟（页面可见时）；窗口重新聚焦 / 切回页面且距上次读取超过 30 秒；⟳ 手动刷新。
- 悬停整行看明细：充值余额 / 赠金余额 / 合计 / 阈值状态 / 更新时间。
- 侧边栏收起成 56px 轨道时，退化成一个 36px 圆形钱包按钮（低于阈值时同样变黄，悬停显示金额，点击刷新）。
- 未登录（或没有账户授权）时整块隐藏。
- 读取失败时显示「读取失败 · 重试」，此时不显示状态标记。
- 颜色全部走 `--dsw-alias-*` 主题变量（`state-warn-primary` / `state-success-primary`），浅色/深色自动跟随；文案中英双语。

## 余额是账号级的

钱包属于 DeepSeek 账号，不是每个会话一份：所有会话、所有窗口共用同一个余额。插件显示的是这个账号当前的钱包快照，不代表某个会话的「额度」。

## 它是怎么工作的

- 浏览器半侧（`client.js`）占住侧边栏底部的 `sidebar.footer.action` 席位，用 React（由页面模块表提供，无额外依赖）渲染。
- 余额来自现有账号 Remote —— 和「设置 → 账户」用的是同一个 `account.getBalance`，不额外保存密码或 token。
- 宿主半侧（`index.js`）只提供一行 Loader 入口，没有后台任务、没有网络请求、没有定时器。

## 安装

**设置 → 插件 → 安装**，粘贴仓库地址即可：

```
github:adrian-atlas/dsh-avatar-balance
```

（以后上 npm 后也可以直接搜 `dsh-avatar-balance`。桌面版由 Electron 应用管理 profile，这是官方路径。）

**手动 / 离线：**

```bash
node install.mjs            # 默认写入 $DSH_PROFILE_DIR（桌面版即 ~/.dsh/profiles/desktop）
node install.mjs --uninstall
```

脚本会做三件事（可重复执行，改动前会留 `.dsb-backup` 备份）：

1. 把本目录链接到 `<profile>/node_modules/dsh-avatar-balance`；
2. 在 `<profile>/package.json` 的 `dependencies` 里记一条 `link:`，避免以后 `pnpm install` 把它清掉；
3. 把包名加进 `<profile>/package.json` 的 `dsh.profile.bundles`，让应用从这个包自己的 `cordis.patch.yml` 组合出 Loader 行。

桌面版由 Electron 应用独占管理，`dsh plugin add` 会拒绝操作 `desktop` profile，所以这里直接做同样的写入。

> **不要同时在 profile 的 `cordis.patch.yml` 里手写一行 insert。** 设置 → 插件 的开关会把 `disabled` 覆盖写进这一层；如果 bundle 层已经插入了一行、用户层又手写一行，就会出现两行同 id 的入口，开关只能命中其中一行（另一行继续运行），看起来就是「开关不生效」。install.mjs 1.x 曾经这么装过，新版脚本会自动把那段旧的标记块删掉。

## 文件

| 文件 | 作用 |
| --- | --- |
| `client.js` | 状态栏组件、余额读取、轮询与样式 |
| `index.js` | 宿主半侧，空 `apply()` |
| `cordis.patch.yml` | 插件自带的 Loader 入口（供 bundle 安装方式使用） |
| `install.mjs` | 安装 / 卸载脚本（软链 + 依赖 + bundle 选择） |
| `locale/{zh,en}.json` | 插件管理页显示的标题与描述 |
| `icon.svg` | 插件图标 |

## 调整

- 轮询间隔：`client.js` 顶部的 `POLL_INTERVAL_MS`（默认 120000 毫秒）。
- 默认阈值：`client.js` 顶部的 `DEFAULT_THRESHOLD`（20）；面板里「恢复默认」会回到它。
- 阈值存储键：`dsh-avatar-balance.threshold`（localStorage，按浏览器/应用实例保存）。
- 位置：DSH 的插槽系统不允许往「头像按钮」内部塞内容，`sidebar.footer.action` 是离头像最近、且由官方保留给第三方插件的席位（在头像行正上方，同一块 footer 区域）。想回到窗口底部，把 `sidebar.footer.action` 换回 `shell.bottom` 即可。
- 顺序：注册时的 `order: -10` 决定它排在 footer 动作列表最左侧（正对上面的头像）；同排还有 DSH 自带的 Cordis 面板按钮时会自动让位收缩。

## 发布

仓库：<https://github.com/adrian-atlas/dsh-avatar-balance>（也就是上面的安装 spec）。

```bash
node scripts/preflight.mjs   # 检查清单/语法/资源
git tag v1.0.0 && git push --tags
```

以后如果想进官方插件市场的「搜索 + 一键安装」，再补一个 npm 账号发布即可（同一步骤，多一条 `npm publish`）。

收录进插件市场：<https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md>

## License

MIT
