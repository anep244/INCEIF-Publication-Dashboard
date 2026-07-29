# INCEIF Research Output Dashboard

A self-contained publication dashboard that reads a Scopus export directly in
the browser — no build step, no server, no database. Works as a static site
on GitHub Pages.

## Files

- `index.html` — the dashboard shell (layout, styles, loading screen)
- `app.js` — all logic: parses the spreadsheet, computes author/year
  aggregates, renders the charts and table
- `data.xlsx` — the Scopus export the dashboard loads automatically on page
  load. **This is the file you replace to update the dashboard.**

## How to update with new data

1. Export your updated results from Scopus in the same format you've been
   using (Author full names, Year, Cited by, Document Type, Source title,
   etc. — a standard Scopus "Export to Excel" works as-is).
2. Rename the exported file to exactly `data.xlsx`.
3. Replace the existing `data.xlsx` in this repo with the new one.
4. Commit and push:
   ```
   git add data.xlsx
   git commit -m "Update publication data"
   git push
   ```
5. GitHub Pages rebuilds automatically (usually within a minute). Refresh
   the published page — the new numbers are live. No other files need to
   change.

If you only want to preview a file without committing it, open the
published page and use the **"Load a different file"** button in the
header (or drag a file onto the upload screen on first load) — this parses
the file locally in your browser and doesn't touch the repo.

## Publishing on GitHub Pages

1. Push this folder's contents to a GitHub repo (root of the repo, or a
   `/docs` folder — either works as long as you point Pages at it).
2. In the repo: **Settings → Pages → Source** → select the branch and
   folder these files live in → **Save**.
3. GitHub gives you a URL like `https://<username>.github.io/<repo>/` —
   that's your live dashboard.

## Notes on the data pipeline

- Rows with a non-numeric `Year` are skipped (a handful of malformed rows
  sometimes appear in Scopus exports where a field with embedded
  punctuation shifts the columns — this filters them out automatically).
- Authors are matched by Scopus Author ID (the number in parentheses after
  each name in "Author full names"), so name variants merge correctly.
  Authors without a Scopus ID fall back to a name-based key.
- Everything — parsing, aggregation, charts — runs client-side. Nothing is
  sent to a server.
