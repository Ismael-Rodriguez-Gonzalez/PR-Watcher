# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GitHub PR Watcher is an Electron desktop application for visualizing, managing, and analyzing Pull Requests across multiple GitHub repositories. Built with React + TypeScript + Electron.

**Language**: Spanish (README, comments, UI text)

## Development Commands

### Setup & Development
```bash
# Install dependencies
npm install

# Build Electron TypeScript files (required before first run)
npm run build:electron

# Start development (Vite + Electron with hot reload)
npm run dev

# Start only Vite dev server
npm run dev:vite

# Start only Electron (requires Vite running)
npm run dev:electron
```

### Production Build
```bash
# Build for all platforms
npm run build

# Platform-specific builds
npm run build:win     # Windows (.exe)
npm run build:mac     # macOS (.dmg)
npm run build:linux   # Linux (.AppImage)

# Clean build artifacts
npm run clean
```

### Common Workflow
After pulling changes or switching branches that modify Electron code:
```bash
npm run build:electron
npm run dev
```

## Configuration Files

### Required Configuration (not versioned)
- `config/config.json` - GitHub token and refresh interval
  - Can use environment variables: `GITHUB_TOKEN` or `GH_TOKEN`
  - `REFRESH_INTERVAL` for custom refresh rate (default: 60 seconds)

### Application Configuration
- `config/repos.json` - Repository list with custom names and colors
- `config/users.json` - Team members for assignment dropdowns
- `config/config.example.json` - Template for config.json

**Important**: GitHub tokens for organization repos may require SAML SSO authorization. See `docs/SAML_SETUP.md`.

## Architecture

### Two-Process Model (Electron)

**Main Process** (`electron/main.ts`):
- Creates BrowserWindow
- Handles IPC communication via `ipcMain.handle()`
- Loads configuration files from disk
- Opens external URLs via `shell.openExternal()`
- Environment-aware: development loads from `http://localhost:5173`, production from `build/index.html`

**Renderer Process** (`src/`):
- React application with Vite dev server
- Communicates with main process via `window.electronAPI` (exposed by preload script)
- No direct Node.js access (security via `contextIsolation`)

**Preload Script** (`electron/preload.ts`):
- Secure bridge using `contextBridge.exposeInMainWorld()`
- Exposes only whitelisted APIs: `loadConfig`, `loadRepositories`, `loadUsers`, `openExternal`

### TypeScript Configuration

Two separate tsconfig files:
- `tsconfig.json` - React/renderer code (ESNext, noEmit, jsx: react-jsx)
- `tsconfig.node.json` - Electron/main code (CommonJS, outputs to `dist/electron/`)

Always run `npm run build:electron` after modifying Electron TypeScript files.

### Data Flow Architecture

**Dual Loading System** for performance optimization:

1. **View Data** (`githubService.getAllPullRequests()`):
   - Loads only open PRs with `state: 'open'`
   - Fetches full PR details + reviews for each PR
   - Used for main PR list view
   - Auto-refreshes every 60 seconds

2. **Statistics Data** (`githubService.getAllPullRequestsForStats()`):
   - Loads ALL PRs with `state: 'all'` (open, closed, merged)
   - Includes reviews for accurate metrics
   - Used exclusively for dashboard statistics
   - Manual refresh only (5-minute cache)

**Why separate?** Loading all historical PRs for stats is expensive (~909 API requests for 9 repos). Separating view/stats data prevents performance issues in the main UI.

### GitHub API Integration

**Service**: `src/services/github.ts`
- Single `GitHubService` class with Octokit
- `initialize(token)` must be called before any API calls
- Repository URL parsing: extracts `owner/repo` from `https://github.com/owner/repo`
- Error handling for SAML enforcement (throws user-friendly messages)

**Key Methods**:
- `getPullRequests(repo)` - Single repo, open PRs with details + reviews
- `getAllPullRequests(repos)` - All repos, Promise.allSettled for parallel loading
- `getPullRequestsForStats(repo)` - Single repo, ALL PRs (state: 'all')
- `getAllPullRequestsForStats(repos)` - All repos, ALL PRs for statistics
- `assignUserToPR()` / `removeAssigneeFromPR()` - Assignment management

**API Considerations**:
- Rate limit: 5,000 requests/hour with authentication
- Current usage: ~18% of limit for full stats reload (9 repos)
- Uses Promise.allSettled to prevent one repo failure from blocking others
- Reviews require separate endpoint: `pulls.listReviews()`

### Statistics Service

**Location**: `src/services/statsService.ts`

**Cache System**:
- 5-minute TTL (`MetricsCache` class)
- Invalidates on time range changes
- Manual clear via `StatsService.clearCache()`

**Calculations**:
- `calculateOverviewStats()` - Aggregated metrics across all repos
- `calculateUserStats()` - Per-user metrics (PRs created, reviews given, approvals, assignments)
- `calculateRepoStats()` - Per-repository metrics

**Time Ranges**: 7d, 30d, 3m, 6m (filters PRs by `created_at`)

### Component Structure

**Main Components**:
- `App.tsx` - Root component, global state (PRs, repositories, users, filters)
- `PullRequestList.tsx` - PR list with filters, search, sorting
- `PullRequestItem.tsx` - Individual PR card with reviews, merge status, assignees
- `StatsModal.tsx` - Statistics dashboard with 3 tabs (Overview, Users, Repos)

**State Management**: No Redux/Context - state lifted to `App.tsx`, passed via props.

### Styling

- CSS modules per component (e.g., `PullRequestItem.css`)
- Tailwind CSS configured (`tailwind.config.js`, `postcss.config.js`)
- Dark theme by default
- Custom repository colors via `backgroundColor` property in `repos.json`

## Key Features & Implementation

### Review System
- Loads real reviews from GitHub API (`pulls.listReviews`)
- Displays only most recent review per user (handled in component logic)
- States: APPROVED (✅), CHANGES_REQUESTED (❌), COMMENTED (💬), DISMISSED (🚫)

### Merge Status
- Visual indicators in PR title
- States from `mergeable_state`: clean (✅), dirty (⚠️ conflicts), blocked (🚫), unstable/behind/draft (❓)
- Fetched via `pulls.get()` for detailed PR info

### Branch Display
- Color-coded branches: head (green), base (yellow), master/main (red)
- Arrow indicator showing merge direction

### Assignment Management
- Dropdown with searchable user list (34+ users)
- Search normalizes strings (removes accents)
- Direct assignment via GitHub API (`issues.addAssignees`)

### Auto-refresh
- Configurable interval (default: 60s, set in `config.json`)
- Only refreshes view data (open PRs), not stats
- Uses `setInterval` in `App.tsx`

## Common Development Patterns

### Adding a New IPC Handler

1. **Main process** (`electron/main.ts`):
```typescript
ipcMain.handle('my-handler', async (event, arg) => {
  // Handle logic
  return result;
});
```

2. **Preload script** (`electron/preload.ts`):
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  myMethod: (arg) => ipcRenderer.invoke('my-handler', arg)
});
```

3. **Type definition** (`src/electron.d.ts`):
```typescript
interface ElectronAPI {
  myMethod: (arg: string) => Promise<Result>;
}
```

4. **Usage in React**:
```typescript
const result = await window.electronAPI.myMethod(arg);
```

### Modifying PR Data Structure

1. Update types in `src/types/index.ts` (PullRequest interface)
2. Modify GitHub service to fetch new data (`src/services/github.ts`)
3. Update components consuming the data
4. If adding stats, update `statsService.ts` calculations

### Adding a New Configuration File

1. Create JSON file in `config/` directory
2. Add IPC handler in `electron/main.ts` (pattern: `ipcMain.handle('load-*')`)
3. Expose in preload script
4. Add loader function in `src/services/github.ts`
5. Load in `App.tsx` on mount

## Troubleshooting

### "Por favor, configura tu token de GitHub"
Electron TypeScript files not compiled. Run:
```bash
npm run build:electron
```

### PRs not loading / SAML errors
Token not authorized for organization. Go to GitHub → Settings → Developer settings → Personal access tokens → Configure SSO → Authorize organization.

### Reviews showing 0
Old issue - fixed. Reviews now loaded via dedicated endpoint in dual loading system.

### DevTools not opening
- Manual: `Ctrl+Shift+I` (Win/Linux) or `Cmd+Option+I` (Mac)
- Auto: Uncomment line 26 in `electron/main.ts`

### Changes in Electron code not reflecting
Must rebuild: `npm run build:electron` before `npm run dev`

## Technical Debt & Known Limitations

- No test suite (consider adding Jest + React Testing Library)
- No CI/CD pipeline
- Configuration only via JSON files (no UI settings)
- Rate limit handling is basic (no retry logic or backoff)
- No offline mode or persistent cache
- Statistics load all PRs from repos (can be slow for large repos)

## Important Notes

- Never commit `config/config.json` (contains GitHub token, already in .gitignore)
- Rate limit is shared across all requests (consider caching if scaling)
- Spanish is the primary language for UI and docs
- SAML SSO authorization is common for enterprise GitHub orgs - see docs/SAML_SETUP.md
- The app uses GitHub's REST API v3 via Octokit (not GraphQL)
