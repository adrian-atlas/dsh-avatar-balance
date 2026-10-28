/**
 * Browser half of the DeepSeek balance bundle.
 *
 * Renders one compact balance cell into the sidebar-foot action seat (directly
 * beside the account avatar row) and reads the balance through the account
 * Remote that Settings → Account already uses. Plain JavaScript on purpose: no
 * build step, no Harness Client package imports.
 */
window.__ModuleLoader__.load({
  id: 'dsh-avatar-balance',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'avatar-balance';
    /** Account identity header; Settings → Account inlines the same build version. */
    const CLIENT_VERSION = '0.2.1-rc.3';
    const POLL_INTERVAL_MS = 120000;
    const STALE_AFTER_MS = 30000;
    /** Wait after every running session goes idle, so Platform has settled the charge. */
    const SETTLE_AFTER_RUN_MS = 3000;
    /** Balance below this many yuan shows the amber warning mark; stored per browser. */
    const DEFAULT_THRESHOLD = 20;
    const THRESHOLD_KEY = 'dsh-avatar-balance.threshold';

    const SYMBOLS = { CNY: '¥', USD: '$' };

    const zh = {
      'label': 'DeepSeek 余额',
      'label.short': '余额',
      'bonus': '赠金',
      'state.failed': '读取失败',
      'state.zero': '暂无余额',
      'state.retry': '重试',
      'action.refresh': '刷新余额',
      'tooltip.topup': '充值余额 {amount}',
      'tooltip.bonus': '赠金余额 {amount}',
      'tooltip.total': '合计 {amount}',
      'tooltip.updated': '更新于 {time}',
      'tooltip.refresh': '点击刷新',
      'status.low': '低于 {amount}，注意余额',
      'status.ok': '余额充足（阈值 {amount}）',
      'tooltip.threshold': '点击左侧标记调整阈值',
      'panel.title': '余额告警阈值',
      'panel.prefix': '低于',
      'panel.suffix': '元时标黄',
      'panel.current': '当前合计 {amount}',
      'panel.reset': '恢复默认',
      'panel.save': '保存',
    };

    const en = {
      'label': 'DeepSeek balance',
      'label.short': 'Balance',
      'bonus': 'Bonus',
      'state.failed': 'Unavailable',
      'state.zero': 'No balance',
      'state.retry': 'Retry',
      'action.refresh': 'Refresh balance',
      'tooltip.topup': 'Top-up balance {amount}',
      'tooltip.bonus': 'Bonus balance {amount}',
      'tooltip.total': 'Total {amount}',
      'tooltip.updated': 'Updated {time}',
      'tooltip.refresh': 'Click to refresh',
      'status.low': 'Below {amount}, top up soon',
      'status.ok': 'Balance is above {amount}',
      'tooltip.threshold': 'Click the mark to change the threshold',
      'panel.title': 'Low-balance threshold',
      'panel.prefix': 'Warn below',
      'panel.suffix': '',
      'panel.current': 'Current total {amount}',
      'panel.reset': 'Reset',
      'panel.save': 'Save',
    };

    const CSS = [
      '.dsb-root{display:flex;flex:0 0 100%;align-items:center;min-width:0}',
      '.dsb-row{box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;min-width:0;',
      'height:36px;padding:0 6px 0 4px;border-radius:var(--dsw-radius-md);color:var(--dsw-alias-label-tertiary);',
      'font-size:12px;line-height:16px;white-space:nowrap;overflow:hidden}',
      '.dsb-row:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dsb-icon{flex:none;color:var(--dsw-alias-label-tertiary)}',
      '.dsb-label{flex:none;color:var(--dsw-alias-label-tertiary)}',
      '.dsb-values{display:flex;align-items:baseline;gap:4px;margin-left:auto;min-width:0;overflow:hidden}',
      '.dsb-amount{overflow:hidden;text-overflow:ellipsis;color:var(--dsw-alias-label-primary);',
      'font-size:13px;font-weight:500;font-variant-numeric:tabular-nums}',
      '.dsb-amount[data-low="true"]{color:var(--dsw-alias-state-warn-primary)}',
      '.dsb-bonus{flex:none;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}',
      '.dsb-zero{overflow:hidden;text-overflow:ellipsis;color:var(--dsw-alias-label-tertiary)}',
      '.dsb-error{padding:0;border:0;background:none;color:var(--dsw-alias-state-warn-label);',
      'font:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:2px}',
      '.dsb-error:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px;border-radius:4px}',
      '.dsb-badge{flex:none;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;',
      'padding:0;border:0;border-radius:6px;background:transparent;cursor:pointer}',
      '.dsb-badge:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dsb-badge:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}',
      '.dsb-badge[data-state="low"]{color:var(--dsw-alias-state-warn-primary)}',
      '.dsb-badge[data-state="ok"]{color:var(--dsw-alias-state-success-primary)}',
      '.dsb-refresh{flex:none;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;',
      'padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}',
      '.dsb-refresh:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.dsb-refresh:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}',
      '.dsb-refresh:disabled{cursor:default;opacity:.55}',
      '.dsb-refresh[data-spinning="true"] .dsb-refresh-icon{animation:dsb-spin 900ms linear infinite}',
      '@keyframes dsb-spin{to{transform:rotate(360deg)}}',
      '@media (prefers-reduced-motion: reduce){.dsb-refresh[data-spinning="true"] .dsb-refresh-icon{animation:none}}',
      '.dsb-rail-root{display:flex;justify-content:center}',
      '.dsb-rail{display:flex;justify-content:center}',
      '.dsb-rail-button{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;',
      'width:36px;height:36px;padding:0;border:0;border-radius:50%;background:transparent;',
      'color:var(--dsw-alias-label-secondary);cursor:pointer}',
      '.dsb-rail-button:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.dsb-rail-button:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}',
      '.dsb-rail-button[data-state="low"]{color:var(--dsw-alias-state-warn-primary)}',
      '.dsb-rail-button[data-state="ok"]{color:var(--dsw-alias-label-secondary)}',
      '.dsb-panel{position:fixed;z-index:40;box-sizing:border-box;width:236px;padding:12px;',
      'border:.5px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-specific-menu);',
      'box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-primary);font-size:12px;line-height:18px}',
      '.dsb-panel-title{font-size:13px;font-weight:500;line-height:20px}',
      '.dsb-panel-row{display:flex;align-items:center;gap:6px;margin-top:8px;color:var(--dsw-alias-label-secondary)}',
      '.dsb-input{box-sizing:border-box;width:64px;padding:2px 6px;border:.5px solid var(--dsw-alias-border-l2);',
      'border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);',
      'font:inherit;text-align:right;-moz-appearance:textfield}',
      '.dsb-input:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}',
      '.dsb-panel-hint{margin-top:6px;color:var(--dsw-alias-label-tertiary)}',
      '.dsb-panel-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}',
      '.dsb-button{box-sizing:border-box;height:26px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l3);',
      'border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer}',
      '.dsb-button:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dsb-button:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '.dsb-button[data-primary="true"]{background:var(--dsw-alias-button-primary-fill);border-color:transparent;',
      'color:var(--dsw-alias-label-primary-foreground);font-weight:500}',
      '.dsb-button[data-primary="true"]:hover{background:var(--dsw-alias-button-primary-hover)}',
    ].join('');

    /** @param {string} value - balance decimal string from the account Remote. @returns {bigint | null} cents, truncated toward zero. */
    function parseCents(value) {
      const raw = String(value).trim();
      const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(raw);
      if (match === null) return null;
      const fraction = (match[3] ?? '').padEnd(2, '0').slice(0, 2);
      const cents = BigInt(match[2]) * 100n + BigInt(fraction);
      return match[1] === '-' ? -cents : cents;
    }

    /** @param {bigint} cents - amount already truncated to cents. @param {string} currency - CNY or USD. @returns {string} symbol-prefixed, grouped amount. */
    function formatCents(cents, currency) {
      const symbol = SYMBOLS[currency] ?? currency;
      const negative = cents < 0n;
      const absolute = negative ? -cents : cents;
      const whole = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      const fraction = (absolute % 100n).toString().padStart(2, '0');
      return `${negative ? '-' : ''}${symbol}${whole}.${fraction}`;
    }

    /** Format one wallet with Platform's two-decimal and sub-cent display rules. */
    function formatAmount(amount, currency) {
      const cents = parseCents(amount);
      if (cents === null) return null;
      if (cents === 0n && !/^[-\s]*0*(?:\.0*)?$/.test(String(amount))) {
        return `<${SYMBOLS[currency] ?? currency}0.01`;
      }
      return formatCents(cents, currency);
    }

    /** Project one Remote wallet array into display rows, dropping malformed entries. */
    function walletsOf(list) {
      const rows = [];
      for (const wallet of Array.isArray(list) ? list : []) {
        if (wallet === null || typeof wallet !== 'object') continue;
        const currency = wallet.currency === 'USD' || wallet.currency === 'CNY' ? wallet.currency : null;
        if (currency === null || typeof wallet.balance !== 'string') continue;
        const text = formatAmount(wallet.balance, currency);
        if (text === null) continue;
        rows.push({ currency, text, cents: parseCents(wallet.balance) ?? 0n });
      }
      return rows;
    }

    /** Total of main plus bonus wallets, preferring CNY and falling back to USD. */
    function totalOf(wallets, bonuses) {
      const sum = (rows, currency) => rows
        .filter((wallet) => wallet.currency === currency)
        .reduce((total, wallet) => total + wallet.cents, 0n);
      const cny = sum(wallets, 'CNY') + sum(bonuses, 'CNY');
      const usd = sum(wallets, 'USD') + sum(bonuses, 'USD');
      if (usd !== 0n && cny === 0n) return { currency: 'USD', cents: usd };
      return { currency: 'CNY', cents: cny };
    }

    /** Stable empty map for compositions that do not inject the Session status hook. */
    const EMPTY_STATUS = new Map();

    function readThreshold() {
      try {
        const raw = window.localStorage.getItem(THRESHOLD_KEY);
        const value = raw === null ? Number.NaN : Number(raw);
        return Number.isFinite(value) && value >= 0 ? value : DEFAULT_THRESHOLD;
      } catch {
        return DEFAULT_THRESHOLD;
      }
    }

    function writeThreshold(value) {
      try {
        window.localStorage.setItem(THRESHOLD_KEY, String(value));
      } catch {
        // A locked-down browser keeps the session value only.
      }
    }

    function WalletIcon({ size = 14 }) {
      return h('svg', {
        className: 'dsb-icon',
        viewBox: '0 0 16 16',
        width: size,
        height: size,
        'aria-hidden': true,
        focusable: false,
      },
        h('path', {
          d: 'M2.6 5.6h10.8v6.9a1 1 0 0 1-1 1H3.6a1 1 0 0 1-1-1Z',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M2.6 5.6V4.3A1.3 1.3 0 0 1 3.9 3h6.8',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinecap: 'round',
        }),
        h('circle', { cx: 10.9, cy: 9.1, r: 0.9, fill: 'currentColor' }));
    }

    function WarnIcon() {
      return h('svg', {
        viewBox: '0 0 16 16',
        width: 14,
        height: 14,
        'aria-hidden': true,
        focusable: false,
      },
        h('path', {
          d: 'M8 2.4 14.2 13H1.8Z',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinejoin: 'round',
        }),
        h('path', { d: 'M8 6.2v3.1', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' }),
        h('circle', { cx: 8, cy: 11.2, r: 0.85, fill: 'currentColor' }));
    }

    function CheckIcon() {
      return h('svg', {
        viewBox: '0 0 16 16',
        width: 14,
        height: 14,
        'aria-hidden': true,
        focusable: false,
      },
        h('circle', {
          cx: 8,
          cy: 8,
          r: 5.9,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
        }),
        h('path', {
          d: 'M5.2 8.2 7.2 10.2 10.9 6.2',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }));
    }

    function RefreshIcon() {
      return h('svg', {
        className: 'dsb-refresh-icon',
        viewBox: '0 0 16 16',
        width: 12,
        height: 12,
        'aria-hidden': true,
        focusable: false,
      },
        h('path', {
          d: 'M13 8a5 5 0 1 1-1.5-3.6',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
        }),
        h('path', {
          d: 'M13.2 2.6v3.2H10',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }));
    }

    const inject = ['slots', 'locale', 'remote', 'remote.account'];

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'avatar-balance: dictionaries');

      ctx.effect(() => {
        const tag = document.createElement('style');
        tag.dataset.plugin = 'dsh-avatar-balance';
        tag.dataset.pluginCss = 'dsh-avatar-balance/balance.css';
        tag.textContent = CSS;
        document.head.appendChild(tag);
        return () => {
          tag.remove();
        };
      }, 'avatar-balance: styles');

      /**
       * Read the account wallets.
       * @returns {Promise<{status: 'ready' | 'failed' | 'signed-out', wallets?: unknown[], bonuses?: unknown[]}>}
       */
      const readBalance = async () => {
        const account = ctx.remote.account;
        if (account === undefined || account === null || typeof account.getBalance !== 'function') {
          return { status: 'failed' };
        }
        const result = await account.getBalance({
          version: CLIENT_VERSION,
          locale: ctx.locale.getSnapshot().active,
          timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
        });
        if (result === null || result === undefined || result.ok !== true) return { status: 'failed' };
        const value = result.value;
        if (value === null || value === undefined) return { status: 'signed-out' };
        if (value.status !== 'ready') return { status: 'failed' };
        return { status: 'ready', wallets: value.value, bonuses: value.bonusWallets };
      };

      function BalanceCell({ t, wide, useSessionStatus }) {
        const [snapshot, setSnapshot] = React.useState({ status: 'loading', at: 0 });
        const [busy, setBusy] = React.useState(false);
        const [threshold, setThreshold] = React.useState(readThreshold);
        const [panel, setPanel] = React.useState(null);
        const [draft, setDraft] = React.useState('');
        const alive = React.useRef(true);
        const inFlight = React.useRef(null);
        const lastAt = React.useRef(0);
        const rootRef = React.useRef(null);
        const panelRef = React.useRef(null);
        const lastRunning = React.useRef(0);

        // Optional standard slot hook: read every Session's run state so a finished
        // task refreshes the balance instead of waiting for the next poll.
        const readStatus = useSessionStatus ?? ((select) => select(EMPTY_STATUS));
        const statuses = readStatus((value) => value);
        const runningCount = statuses === null || statuses === undefined
          ? 0
          : [...statuses.values()].filter((status) => status?.running === true).length;

        const load = React.useCallback((mode) => {
          if (inFlight.current !== null) return inFlight.current;
          if (mode === 'user') setBusy(true);
          const task = readBalance()
            .then((next) => {
              if (!alive.current) return;
              lastAt.current = Date.now();
              setSnapshot({ ...next, at: lastAt.current });
            })
            .catch(() => {
              if (!alive.current) return;
              lastAt.current = Date.now();
              setSnapshot({ status: 'failed', at: lastAt.current });
            })
            .finally(() => {
              inFlight.current = null;
              if (alive.current && mode === 'user') setBusy(false);
            });
          inFlight.current = task;
          return task;
        }, []);

        React.useEffect(() => {
          alive.current = true;
          void load('mount');
          const timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') void load('poll');
          }, POLL_INTERVAL_MS);
          const onWake = () => {
            if (document.visibilityState !== 'visible') return;
            if (Date.now() - lastAt.current >= STALE_AFTER_MS) void load('wake');
          };
          document.addEventListener('visibilitychange', onWake);
          window.addEventListener('focus', onWake);
          return () => {
            alive.current = false;
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onWake);
            window.removeEventListener('focus', onWake);
          };
        }, [load]);

        React.useEffect(() => {
          const previous = lastRunning.current;
          lastRunning.current = runningCount;
          if (runningCount >= previous) return undefined;
          const timer = window.setTimeout(() => {
            void load('settle');
          }, SETTLE_AFTER_RUN_MS);
          return () => {
            window.clearTimeout(timer);
          };
        }, [runningCount, load]);

        React.useEffect(() => {
          if (panel === null) return undefined;
          const onPointer = (event) => {
            const target = event.target;
            if (panelRef.current?.contains(target) === true) return;
            if (rootRef.current?.contains(target) === true) return;
            setPanel(null);
          };
          const onKey = (event) => {
            if (event.key === 'Escape') setPanel(null);
          };
          const onResize = () => {
            setPanel(null);
          };
          document.addEventListener('pointerdown', onPointer, true);
          document.addEventListener('keydown', onKey);
          window.addEventListener('resize', onResize);
          return () => {
            document.removeEventListener('pointerdown', onPointer, true);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', onResize);
          };
        }, [panel]);

        if (snapshot.status === 'loading' || snapshot.status === 'signed-out') return null;

        const failed = snapshot.status !== 'ready';
        const wallets = failed ? [] : walletsOf(snapshot.wallets);
        const bonuses = failed ? [] : walletsOf(snapshot.bonuses).filter((wallet) => wallet.cents > 0n);
        const total = totalOf(wallets, bonuses);
        const thresholdCents = BigInt(Math.round(threshold * 100));
        const low = total.cents < thresholdCents;
        const totalText = formatCents(total.cents, total.currency);
        const thresholdText = formatCents(BigInt(Math.round(threshold * 100)), total.currency);

        const openPanel = () => {
          const rect = rootRef.current?.getBoundingClientRect();
          const width = 236;
          const left = rect === undefined
            ? 8
            : Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8));
          const bottom = rect === undefined ? 48 : Math.max(8, window.innerHeight - rect.top + 8);
          setDraft(String(threshold));
          setPanel({ left, bottom });
        };
        const togglePanel = () => {
          if (panel === null) openPanel();
          else setPanel(null);
        };
        const saveThreshold = () => {
          const parsed = Number(String(draft).replace(',', '.').trim());
          const next = Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) / 100 : threshold;
          setThreshold(next);
          writeThreshold(next);
          setPanel(null);
        };
        const resetThreshold = () => {
          setThreshold(DEFAULT_THRESHOLD);
          writeThreshold(DEFAULT_THRESHOLD);
          setDraft(String(DEFAULT_THRESHOLD));
        };

        const tooltip = [];
        if (!failed) {
          for (const wallet of wallets) tooltip.push(t('tooltip.topup', { amount: wallet.text }));
          for (const wallet of bonuses) tooltip.push(t('tooltip.bonus', { amount: wallet.text }));
          tooltip.push(t('tooltip.total', { amount: totalText }));
        }
        if (snapshot.at > 0) {
          let time = '';
          try {
            time = new Date(snapshot.at).toLocaleTimeString(ctx.locale.getSnapshot().active, {
              hour: '2-digit',
              minute: '2-digit',
            });
          } catch {
            time = new Date(snapshot.at).toLocaleTimeString();
          }
          tooltip.push(t('tooltip.updated', { time }));
        }
        tooltip.push(failed ? t('state.retry') : t('tooltip.refresh'));
        if (!failed) {
          tooltip.push(t(low ? 'status.low' : 'status.ok', { amount: thresholdText }));
          tooltip.push(t('tooltip.threshold'));
        }

        const amountText = failed
          ? t('state.failed')
          : wallets.length === 0
            ? t('state.zero')
            : wallets.map((wallet) => wallet.text).join(' + ');

        const panelNode = panel === null ? null : h('div', {
          className: 'dsb-panel',
          ref: panelRef,
          style: { left: `${panel.left}px`, bottom: `${panel.bottom}px` },
          role: 'dialog',
          'aria-label': t('panel.title'),
        },
          h('div', { className: 'dsb-panel-title' }, t('panel.title')),
          h('div', { className: 'dsb-panel-row' },
            h('span', null, t('panel.prefix')),
            h('input', {
              className: 'dsb-input',
              type: 'number',
              min: 0,
              step: 1,
              inputMode: 'decimal',
              value: draft,
              autoFocus: true,
              'aria-label': t('panel.title'),
              onChange: (event) => {
                setDraft(event.target.value);
              },
              onKeyDown: (event) => {
                if (event.key === 'Enter') saveThreshold();
              },
            }),
            t('panel.suffix') === '' ? null : h('span', null, t('panel.suffix'))),
          h('div', { className: 'dsb-panel-hint' }, t('panel.current', { amount: totalText })),
          h('div', { className: 'dsb-panel-actions' },
            h('button', {
              type: 'button',
              className: 'dsb-button',
              onClick: resetThreshold,
            }, t('panel.reset')),
            h('button', {
              type: 'button',
              className: 'dsb-button',
              'data-primary': 'true',
              onClick: saveThreshold,
            }, t('panel.save'))));

        const badge = failed ? null : h('button', {
          type: 'button',
          className: 'dsb-badge',
          'data-state': low ? 'low' : 'ok',
          title: t(low ? 'status.low' : 'status.ok', { amount: thresholdText }),
          'aria-label': t(low ? 'status.low' : 'status.ok', { amount: thresholdText }),
          'aria-haspopup': 'dialog',
          'aria-expanded': panel !== null,
          onClick: togglePanel,
        }, low ? h(WarnIcon) : h(CheckIcon));

        if (wide === false) {
          return h('div', { ref: rootRef, className: 'dsb-rail-root' },
            h('div', { className: 'dsb-rail' },
              h('button', {
                type: 'button',
                className: 'dsb-rail-button',
                title: [`${t('label')} ${amountText}`, ...tooltip].join('\n'),
                'aria-label': `${t('label')} ${amountText}`,
                'data-state': failed ? undefined : low ? 'low' : 'ok',
                disabled: busy,
                onClick: () => {
                  void load('user');
                },
              }, h(WalletIcon, { size: 18 }))),
            panelNode);
        }

        const valueNodes = [];
        if (failed) {
          valueNodes.push(h('button', {
            key: 'failed',
            type: 'button',
            className: 'dsb-error',
            onClick: () => {
              void load('user');
            },
          }, `${t('state.failed')} · ${t('state.retry')}`));
        } else if (wallets.length === 0) {
          valueNodes.push(h('span', { key: 'zero', className: 'dsb-zero' }, t('state.zero')));
        } else {
          wallets.forEach((wallet, index) => {
            if (index > 0) valueNodes.push(h('span', { key: `sep${index}`, className: 'dsb-bonus' }, '+'));
            valueNodes.push(h('span', {
              key: `w${index}`,
              className: 'dsb-amount',
              'data-low': low ? 'true' : undefined,
            }, wallet.text));
          });
          bonuses.forEach((wallet, index) => {
            valueNodes.push(h('span', {
              key: `bonus${index}`,
              className: 'dsb-bonus',
            }, `+${wallet.text}`));
          });
        }

        return h('div', { ref: rootRef, className: 'dsb-root' },
          h('div', { className: 'dsb-row', title: tooltip.join('\n') },
            h(WalletIcon, { size: 14 }),
            h('span', { className: 'dsb-label' }, t('label.short')),
            h('span', { className: 'dsb-values' }, valueNodes),
            badge,
            h('button', {
              type: 'button',
              className: 'dsb-refresh',
              title: t('action.refresh'),
              'aria-label': t('action.refresh'),
              'data-spinning': busy ? 'true' : undefined,
              disabled: busy,
              onClick: () => {
                void load('user');
              },
            }, h(RefreshIcon))),
          panelNode);
      }

      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'avatar-balance',
        order: -10,
        locale: NS,
      }, BalanceCell));
    }

    return { inject, apply };
  },
});
