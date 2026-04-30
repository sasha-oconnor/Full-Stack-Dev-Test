# Field Estimate Tool

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables** (required for AI-assisted features)

   Copy [`.env.example`](.env.example) to `.env.local` in the project root:

   ```bash
   cp .env.example .env.local
   ```

   Open `.env.local` and set your [Google AI Studio](https://aistudio.google.com/apikey) **Gemini API key** and the **model name** you want to use (for example the values shown in `.env.example`):

   - `GEMINI_API_KEY` - your API key
   - `GEMINI_MODEL` - the Gemini model id to use (see `.env.example` for a placeholder)

   I would recommend keeping `GEMINI_MODEL=gemini-2.5-flash` because I have not tested any other models.

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## My approach

I built a **mobile-first** Next.js app for technicians in the field: large tap targets, tab-based navigation on the estimate screen, and layouts that suit a phone even when only using one hand. The same UI scales up cleanly on **desktop and tablet**, so office staff or techs on a laptop get the full experience without a separate codebase.

### Customer selection (home)

Technicians start from a **searchable customer list** backed by `customers.json`. They can filter by **All / Residential / Commercial**, see match counts, and open a **customer card** with property details, system type, and last service. The list is built for long scroll sessions on mobile: a constrained scroll region, and entry animations.

### Building an estimate

After picking a customer, the flow is **Notes → Equipment → Service (labor)**. A **progress indicator** shows where they are in the job. Each section is a **tab** with status dots (e.g. line-item count, whether labor is chosen) so it’s obvious what still needs attention.

- **Notes** - Free-form job notes, plus **voice dictation** via the browser’s **Web Speech API**. Speech is cleaned up with basic **punctuation and capitalization** so “period / comma / new line” style dictation is usable in the field without typing.
- **Equipment** - Add lines from the equipment catalog with **search and categories**, adjust **quantities**, and remove lines. Selected items are summarized above the picker.
- **Service** - Pick a **labor rate** from `labor_rates.json` (job type, level, hourly rate, hour ranges). The UI warns if there’s equipment but no labor selected.

While building, the app keeps a **draft in `sessionStorage`** so a refresh or accidental navigation is less painful; opening a saved estimate from the list restores the right context.

### AI assist (Gemini)

On the notes section we added an **AI assist panel** powered by **Google Gemini** (server-side API route; key and model in `.env.local`). The model receives the tech’s notes plus **customer context** (property type, system, etc.) and returns structured suggestions:

- **Equipment recommendations** mapped to our real catalog (with reasons and confidence), **one-tap add** to the estimate.
- **Labor / service type** suggestions aligned to our rate table, with apply/clear actions.
- **“Missing information” prompts** when the job description is ambiguous. Simply answer inline and re-run the analysis.
- A **visit summary draft** you can insert into notes as bullets.

If Gemini is rate-limited, down, or slow, the app **falls back to heuristic matching** from the same catalogs so the tech isn’t stuck.

### Summary, drafts, and sharing

The **summary** page rolls up **equipment subtotal**, **labor min/max hours**, and a **total range**, with customer and property context for review.

Saving writes to **`localStorage`** as a **draft** by default. Each saved estimate gets a **stable share token** and a **copy link** (`/shared/[token]`) you can text or email to the homeowner. **Mark as sent** moves the estimate out of “draft” for your own workflow. 

### Customer-facing shared page

The **public-style shared URL** shows a read-only estimate with branding-friendly layout. The customer can **approve or reject** (with an optional short note). That decision is stored on the **same device/browser** as the tech’s saved estimates (local-only persistence today), and status badges update immediately when they return to the app, so the loop is **draft → share → sent → approved/rejected** with clear states.

Copy the estimate URL and paste it into your browser. You will now have the option to approve or reject the estimate. Once you complete this step, the estimate will automatically update to show: "Approved" or "Rejected".

### Saved estimates hub

A **Saved** area lists all stored estimates with **search**, **open** (reloads into summary), **duplicate**, **delete**, **copy share link**, and **print**-friendly views where applicable, so repeat visits and follow-ups are quick.

### Stack and tradeoffs

**Next.js App Router**, **Tailwind**, **Motion** for lightweight list animation, **Lucide** icons, and **shadcn-style** UI primitives. Persisting estimates in the browser keeps the demo **fast and deployable without a database**.


## What I struggled with the most

I struggled the most with **voice dictation** (browser speech APIs, accuracy, and making dictated punctuation feel natural) and the **AI helper** (prompting Gemini for structured catalog-aligned output, error handling, fallbacks, and keeping the UX smooth when the model or network misbehaves).

## If I had more time...

If I had more time, I would add a **full authorization flow** (sign-in, roles for tech vs. customer vs. admin), **version control or a clear change history** for estimates so you could see what changed between revisions, and hook everything up to a **real backend** with a database so share links, approvals, and data survive across devices and browsers—not just `localStorage`.

## Assignment brief (summary)

HVAC field techs lose a lot of time per estimate (paper, spreadsheets, phone-a-friend) while the customer waits, so quotes feel slow and we sometimes lose to faster competitors.

**Data** in `data/`: **equipment.json** (parts & equipment), **labor_rates.json** (rates by job type), **customers.json** (sample customers/properties). Shapes may vary; it’s meant to feel like real exports.

**Ask:** build something that helps, and include a short write-up on your approach.
