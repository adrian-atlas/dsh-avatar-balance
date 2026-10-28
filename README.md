# dsh-avatar-balance

Your DeepSeek account balance, right above the account avatar in the DeepSeek Harness sidebar. No more opening **Settings → Account** just to check it.

```
sidebar foot (same width as the account row)
┌──────────────────────────────────┐
│ 👛 Balance     ⚠ ¥12.34 +¥0.50 ⟳ │   ← below the threshold: amber ⚠
│ 🧑 Lawrence                 ●  ↑ │   ← the shipped account row
└──────────────────────────────────┘

Above the threshold the mark turns green:

│ 👛 Balance           ✓ ¥28.50 ⟳ │
```

## What it does

- **Full-width row** in the sidebar foot, aligned with the account row below it.
- **Colour state**: total balance (top-up + bonus) below the threshold → amber ⚠ with the amount tinted; at or above it → green ✓.
- **Adjustable threshold**: click the ⚠ / ✓ mark to open a small panel, type a number, and save (Enter saves too). Default is 20, stored in `localStorage` per app/browser instance.
- Shows the top-up balance; a positive bonus balance is appended as `+¥x.xx`. CNY and USD are shown separately.
- **Refresh**: once on mount; 3 seconds after any session finishes a run (Platform settles the charge); every 2 minutes while visible; when the window regains focus after more than 30 seconds; and on the ⟳ button.
- Hover the row for the breakdown: top-up, bonus, total, threshold state, last read time.
- Collapsed 56px sidebar → a 36px round wallet button (also turns amber below the threshold; hover shows the amount, click refreshes).
- Hidden when signed out; a read failure shows "Unavailable · Retry" without a status mark.
- Colours come from `--dsw-alias-*` theme tokens (`state-warn-primary` / `state-success-primary`), so light and dark follow the host. Copy is English and Chinese.

## The balance is account-wide

The wallet belongs to your DeepSeek account, not to a session: every session and every window shares one balance. The plugin shows that account snapshot; it is not a per-session quota.

## How it works

- The browser half (`client.js`) occupies the `sidebar.footer.action` seat and renders with the React instance the page already provides — no bundled dependencies.
- The balance comes from the existing account Remote, the same `account.getBalance` that Settings → Account uses. The plugin stores no token or password.
- The host half (`index.js`) only provides one Loader row: no background task, no network call, no timer.

## Install

**Settings → Plugins → Install**, then either search for `dsh-avatar-balance` once it is on npm, or paste the repository spec:

```
github:adrian-atlas/dsh-avatar-balance
```

**Manual / offline** (useful when the app owns the desktop profile):

```bash
node install.mjs            # writes into $DSH_PROFILE_DIR, ~/.dsh/profiles/desktop on desktop
node install.mjs --uninstall
```

The script is idempotent and backs up files it edits:

1. links this directory into `<profile>/node_modules/dsh-avatar-balance`;
2. records the dependency (`link:`) in `<profile>/package.json`;
3. selects the package in `dsh.profile.bundles`, so the app composes the row from this package's own `cordis.patch.yml`.

> Do **not** also hand-write an insert row into the profile's `cordis.patch.yml`. Plugin Manager writes its on/off override into that layer; two rows with the same id leave one of them running no matter what the switch says.

## Files

| File | Purpose |
| --- | --- |
| `client.js` | The balance cell: rendering, reads, refresh policy, styles |
| `index.js` | Host half; an empty `apply()` |
| `cordis.patch.yml` | The Loader row this package contributes |
| `install.mjs` | Manual install / uninstall for an app-managed profile |
| `scripts/preflight.mjs` | `npm publish` guard: manifest, files, syntax, locale, icon |
| `locale/{zh,en}.json` | Title and description shown in the Plugins page |
| `icon.svg` | Plugin icon |

## Tuning

- Refresh interval: `POLL_INTERVAL_MS` in `client.js` (120000 ms).
- Delay after a run finishes: `SETTLE_AFTER_RUN_MS` (3000 ms).
- Default threshold: `DEFAULT_THRESHOLD` (20); "Reset" in the panel returns to it.
- Threshold storage key: `dsh-avatar-balance.threshold`.
- Placement: the slot system does not allow injecting inside the avatar button, so `sidebar.footer.action` — directly above the avatar row in the same footer — is the closest supported seat. Swap it for `shell.bottom` to move the row to the bottom of the window instead.
- Order: `order: -10` keeps this entry leftmost in the footer action row.

## Requirements

DeepSeek Harness 0.2.1-rc.3 or newer (`engines.dsh`), signed in with a DeepSeek account. API-key-only setups have no wallet to read, so the row stays hidden.

## Publish

The source of truth is the GitHub repository <https://github.com/adrian-atlas/dsh-avatar-balance>, which is also the install spec above.

```bash
node scripts/preflight.mjs   # manifest, files, syntax, locale and icon checks
git tag v1.0.0 && git push --tags
```

An npm release (`npm publish`) can be added later; it makes the plugin searchable in the Plugins page and listable in the community catalog.

To be listed in the community catalog: <https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md>

## License

MIT
