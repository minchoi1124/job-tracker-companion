# Job Search Helper

A job application tracker built to solve two real problems that most trackers don't address: **job postings getting taken down before you can reference them again**, and **the tedious manual work of logging every application**.

---

## The Problem

If you've ever applied to a lot of jobs, you know the frustrations:

- **Postings disappear.** You apply to a role, the listing gets removed a week later, and now you have no idea what the position was actually about — especially painful when you're prepping for an interview or following up.
- **Tracking is tedious.** Copying and pasting job titles, companies, locations, and descriptions into a spreadsheet or tracker for every single application is slow and repetitive.

Most job trackers only let you save a URL and a status. That's not enough.

---

## The Solution

Job Search Helper is built around two core ideas:

### 1. Save the Job Description, Not Just the Link
When you add a job posting, the app automatically scrapes and stores the full job description at that moment. Even if the company removes the listing later, you'll always have a copy of exactly what the role entailed — the responsibilities, requirements, and details you need to prep for interviews or decide if you want to follow up.

### 2. Minimize Manual Entry
Instead of filling out a form field by field, just paste the job posting URL. The app fetches and parses the page to automatically pull in the job title, company name, location, and description — so you can log an application in seconds, not minutes.

---

## Features

- 🔗 **URL-based job entry** — paste a link and let the app do the heavy lifting
- 📄 **Job description archiving** — the full description is saved so it's never lost when a posting is removed
- 📊 **Application status tracking** — keep tabs on where you are in the process for each role
- 🔍 **Search** — quickly filter through your applications
- 🔐 **User authentication** — your job list is private to your account

---

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org) (App Router)
- **Database:** [Supabase](https://supabase.com) (PostgreSQL)
- **Auth:** [NextAuth.js](https://next-auth.js.org)
- **Hosting:** [Vercel](https://vercel.com)

---

## Job Board Compatibility

The app uses a two-tier system to extract job data from a URL:

1. **Dedicated API integration** — For boards that expose a public API, the app calls it directly and gets clean, structured data every time.
2. **Generic HTML scraping** — For everything else, the app fetches the raw HTML and uses [Mozilla Readability](https://github.com/mozilla/readability) to extract the content. This is best-effort and depends on how the site renders its pages.

> **Note:** Sites that load their content via JavaScript (like Workday) will not work with the generic scraper, because the server-side fetcher cannot execute JS. Boards with dedicated API integrations side-step this entirely.

### ✅ Works Reliably

These boards have dedicated API integrations and will always return a clean title, company, description, and location:

| Job Board | URL Pattern |
|---|---|
| **Greenhouse** | `boards.greenhouse.io/{company}/jobs/{id}` |
| **Lever** | `jobs.lever.co/{company}/{id}` |
| **Ashby** | `ashbyhq.com/{company}/...` or `jobs.ashbyhq.com/{company}/...` |

### ⚠️ May Partially Work

These fall through to the generic HTML scraper. Title and description are often captured, but company name, location, or description quality may vary:

| Job Board | Limitation |
|---|---|
| **SmartRecruiters** | Partially JS-rendered; description may be incomplete |
| **Company career pages** | Varies — static HTML works well, JS-heavy pages may return little or nothing |

### ❌ Does Not Work

| Job Board | Reason |
|---|---|
| **Workday** (`myworkdayjobs.com`) | Fully JavaScript-rendered — the scraper receives an empty shell page |
| **LinkedIn** | Aggressive bot detection and login walls block the fetch entirely |
| **Indeed** | Bot detection triggers CAPTCHAs and redirects, stripping most content |
| **iCIMS** | JavaScript-rendered; same issue as Workday |
