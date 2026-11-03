# Ananya's Financial Management

A mobile-first money plan for a PhD scholar on a ₹37,500 monthly fellowship, built around three stages:

1. **Safety Fund**: an emergency fund of ₹1–2 lakh, built first.
2. **Compounding**: monthly SIPs into a few low-cost funds (index funds, gold, PPF/debt), starting small during Stage 1 and taking the full amount after it.
3. **Goals and credit**: an FD-backed credit card to build a CIBIL score from zero, plus a goals pot for things one to three years away.

The app has five tabs:

| Tab | What it does |
| --- | --- |
| Today | This month's split, the three progress rings, the payday routine (1st–5th), a "mark this month done" button that updates balances, and a splitter for unexpected money |
| Budget | Editable stipend and spending categories (need/want), with the needs/wants/savings breakdown |
| Plan | All three stages: target, timeline and where to keep the Safety Fund; the SIP mix and per-fund amounts; the credit roadmap checklist and goals |
| Grow | A projection of 600 simulated market paths (likely, bad-luck and good-luck outcomes), the levers that matter most, and crash stress tests |
| Ask | A Claude advisor that sees the plan's numbers |

Data stays in the browser (`localStorage`). When the page runs as a Claude artifact, it also syncs to the viewer's Claude account.

## Layout

```
ananya-finance/
  src/app.html        the whole app (HTML, CSS and JS in one file)
  scripts/build.mjs   wraps src/app.html into public/index.html
  public/index.html   the built page (committed, so static hosts work without a build)
  api/advisor.js      Vercel serverless function for the Claude advisor
  vercel.json         build, output folder and function timeout
```

Edit `src/app.html`, then run `npm run build` to regenerate `public/index.html`.

## Deploy on Vercel

1. In Vercel, choose **Add New → Project** and import this GitHub repository.
2. Set **Root Directory** to `ananya-finance`. Leave the framework preset as **Other**. `vercel.json` supplies the build command and output folder.
3. Under **Environment Variables**, add:
   - `ANTHROPIC_API_KEY`: an API key from console.anthropic.com. Required for the Ask tab.
   - `ADVISOR_PASSCODE`: optional but recommended. Without it, anyone with the link can spend your API credit. The page asks for the passcode once per session.
   - `ANTHROPIC_MODEL`: optional. Defaults to `claude-opus-5-5`.
4. Deploy. Everything except Ask works without the key.

The advisor streams answers from the Claude API with web search turned on (up to 3 searches per answer), so it can look up current expense ratios, PPF rates and rule changes. Each question costs a few cents of API usage.

## Static hosting only (GitHub Pages and similar)

Serve `public/index.html`. The planner works fully; the Ask tab says the advisor isn't connected, because there's no server to keep the API key secret.

## Assumptions

Long-run returns in rupee terms used by the projection (these are assumptions, not promises):

| Asset | Return per year | Typical yearly swing |
| --- | --- | --- |
| Nifty 50 index | 11% | ±17% |
| Nifty Next 50 / flexi-cap | 12% | ±21% |
| Nifty Midcap 150 index | 13% | ±25% |
| Gold | 9% | ±15% |
| PPF / short-duration debt | 7% | ±2% |

The app is educational planning guidance, not advice from a SEBI-registered investment adviser.
