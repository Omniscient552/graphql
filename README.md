# 01 Profile

A personal profile page for [01.tomorrow-school.ai](https://01.tomorrow-school.ai) built with JavaScript, GraphQL, and SVG charts. No frameworks, no build tools — files are connected to each other directly via `import` / `export`.

## Live Demo

> [https://omniscient552.github.io/graphql/](https://omniscient552.github.io/graphql/)

## Features

- **JWT Authentication** — sign in with username or email, session persisted in localStorage
- **Navigational sidebar** — switch between views without page reload
- **Overview** — total XP, projects count, pass rate, audit ratio + 2 SVG charts
- **Personal Info** — profile data from `attrs` (name, contact, identity) with masked sensitive fields
- **Projects** — full list with deduplication logic (one PASS instead of duplicates, all FAILs kept)
- **Piscines** — all bootcamps with per-attempt history

## Project Structure

```
graphql-profile/
├── index.html          # Single HTML shell
├── css/
│   ├── style.css       # Entry point (@import only)
│   ├── base.css        # Variables, reset, utilities
│   ├── login.css       # Login page styles
│   ├── sidebar.css     # Navigation sidebar styles
│   └── profile.css     # Main content views styles
└── js/
    ├── app.js          # SPA router + view switching
    ├── auth.js         # JWT helpers (sign in, save, clear)
    ├── graphql.js      # All GraphQL queries
    ├── profile.js      # View renderers (return HTML strings)
    └── charts.js       # SVG charts (bar + donut)
```

## GraphQL Queries

The app uses all three types of querying required by the project:

| # | Function | Type | What it fetches |
|---|----------|------|-----------------|
| 1 | `fetchUserInfo()` | Normal + nested | User id, login, attrs, labels (batch) |
| 2 | `fetchXPTransactions()` | Normal + filter | XP transactions for eventId 96 (main curriculum) |
| 3 | `fetchAuditStats()` | Normal | Audit done (up) and received (down) |
| 4 | `fetchUserLevel()` | With arguments | Level from `event_user` where `eventId = 96` |
| 4b | `fetchTotalXPBytes()` | Nested aggregate | Total XP sum for main curriculum |
| 5 | `fetchProjects()` | Nested + filter | Results where object type = project |
| 6 | `fetchPiscineResults()` | With arguments | All attempts per piscine (exact path match) |
| 7 | `fetchXPPerProject()` | Nested + grouped | XP grouped by objectId, top 10 |

## Charts

Both charts are built with pure SVG — no chart libraries.

**XP over time** — bar chart where each bar represents one XP transaction. The chart width is dynamic based on transaction count and supports horizontal scrolling inside the card.

**Audit ratio** — donut chart showing the ratio of audits done vs received, with the ratio value in the center.

## Running Locally

Because files are connected via `import` / `export`, you can't just open `index.html` by double-clicking it — the browser will block file loading. You need a local HTTP server.

**Option 1 — VS Code + Live Server (easiest)**

1. Install the `Live Server` extension in VS Code
2. Open the project folder in VS Code
3. Click the **Go Live** button in the bottom right corner
4. The browser will open automatically

**Option 2 — Node.js**

```bash
npx serve .
```

**Option 3 — Python**

```bash
python3 -m http.server 3000
```

Then open `http://localhost:3000`.

## Deployment

The project is hosted on GitHub Pages.

## Key Implementation Notes

**Level** is fetched from `event_user` filtered by `eventId: 96` (main curriculum). Other event IDs correspond to piscines: 43 = piscine-go, 228 = piscine-js, 346 = piscine-ai.

**XP** is stored in bytes in the database. The app sums all positive XP transactions with `eventId: 96` and displays the result in kB.

**Project deduplication** — duplicate PASS entries for the same project are collapsed into one. All FAIL entries are kept so the full attempt history is visible.

**Piscine paths**:
- piscine-go → `/astanahub/piscinego`
- piscine-js → `/astanahub/module/piscine-js`
- piscine-ai → `/astanahub/module/piscine-ai`
- piscine-rust → `/astanahub/module/piscine-rust`

## Tech Stack

- JavaScript
- GraphQL
- SVG (hand-written, no libraries)
- CSS custom properties + CSS modules via `@import`
- Fonts: [DM Sans](https://fonts.google.com/specimen/DM+Sans) + [DM Mono](https://fonts.google.com/specimen/DM+Mono)

## License

MIT