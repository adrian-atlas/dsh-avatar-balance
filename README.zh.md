# dsh-avatar-balance

DeepSeek 账户余额，显示在侧边栏底部、账号头像正上方。

[English](README.md) | 中文

整行显示余额和状态标记：合计（充值 + 赠金）低于阈值为黄色 ⚠，高于为绿色 ✓。点标记可改阈值（默认 20，本地保存）。悬停看明细；侧边栏收起时变成一个圆形钱包按钮。未登录时隐藏。

## 安装

设置 → 插件 → 安装：

```
github:adrian-atlas/dsh-avatar-balance
```

需要 DeepSeek Harness 0.2.1-rc.3+，并已登录 DeepSeek 账号。

## 刷新

- 打开时
- 任一任务结束后 3 秒
- 页面可见时每 2 分钟
- 窗口重新获得焦点时
- 点 ⟳

余额是账号级的，所有会话共用。

## License

MIT
