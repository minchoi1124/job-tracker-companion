import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import * as cheerio from "cheerio";

function toUrlOrNull(input: string): URL | null {
    if (!input) return null;
    try {
        return new URL(input);
    } catch {
        try {
            return new URL(`https://${input}`);
        } catch {
            return null;
        }
    }
}

function parseGreenhouseJobUrl(input: string): { companyShortName: string; jobId: string; canonicalUrl: string } | null {
    const u = toUrlOrNull(input);
    if (!u) return null;

    const host = u.hostname.toLowerCase();
    const isGreenhouseBoardHost =
        host === "boards.greenhouse.io" ||
        host === "job-boards.greenhouse.io" ||
        /^boards\.[a-z0-9-]+\.greenhouse\.io$/.test(host);

    if (!isGreenhouseBoardHost) return null;

    const segments = u.pathname.split("/").filter(Boolean);
    if (!segments.length) return null;

    const companyShortName = segments[0];
    const jobsIdx = segments.indexOf("jobs");

    let rawJobId: string | null = null;
    if (jobsIdx >= 0 && segments[jobsIdx + 1]) rawJobId = segments[jobsIdx + 1];
    if (!rawJobId) rawJobId = u.searchParams.get("gh_jid");

    const jobId = rawJobId?.match(/[a-zA-Z0-9]+/)?.[0];
    if (!companyShortName || !jobId) return null;

    return { companyShortName, jobId, canonicalUrl: u.toString() };
}

function parseAshbyJobUrl(input: string): { company: string } | null {
    const u = toUrlOrNull(input);
    if (!u) return null;

    const host = u.hostname.toLowerCase();
    if (host !== "ashbyhq.com" && host !== "jobs.ashbyhq.com") return null;

    const segments = u.pathname.split("/").filter(Boolean);
    if (!segments.length) return null;

    const company = segments[0];
    if (!company) return null;

    return { company };
}

/**
 * Converts job description HTML into clean, readable plain text.
 * Preserves structural spacing and bullet points without raw HTML tags.
 */
function formatDescription(rawHtml: string): string {
    if (!rawHtml) return "";

    // Load and remove noisy elements
    const $ = cheerio.load(rawHtml);
    $('script, style, iframe, button, form, svg, canvas, nav, footer, header').remove();
    $('.content-intro, .content-conclusion, .p-client_container, .p-ia4_client_container, [data-qa="message_container"]').remove();

    // Inject newlines for structure
    $('p, div, br, h1, h2, h3, h4, h5, h6').each((_, el) => {
        $(el).append('\n');
    });

    $('li').each((_, el) => {
        $(el).prepend('• ').append('\n');
    });

    // Force text extraction (strips all tags)
    let text = $('body').text() || $.text() || "";

    // Final safety: if for some reason tags remained, strip them
    if (text.includes('<') && text.includes('>')) {
        text = text.replace(/<[^>]*>?/gm, '');
    }

    return text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s+\n/g, '\n\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        // --- Greenhouse API Integration ---
        // Supports:
        // - boards.greenhouse.io/{company}/jobs/{id}
        // - job-boards.greenhouse.io/{company}/jobs/{id}
        // - boards.{region}.greenhouse.io/{company}/jobs/{id}
        // - .../{company}/jobs/{id}?gh_src=... or .../{company}?gh_jid={id}
        const greenhouse = parseGreenhouseJobUrl(url);
        if (greenhouse) {
            const { companyShortName, jobId } = greenhouse;
            const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${companyShortName}/jobs/${jobId}`;

            try {
                const apiRes = await fetch(apiUrl);
                if (apiRes.ok) {
                    const data = await apiRes.json();

                    // Greenhouse API sometimes returns the full description in 'content'
                    const rawContent = data.content || "";

                    return NextResponse.json({
                        title: data.title || "",
                        company: companyShortName.charAt(0).toUpperCase() + companyShortName.slice(1),
                        description: formatDescription(rawContent),
                        location: data.location?.name || "",
                        url: url,
                    });
                }
            } catch (err) { console.error("Greenhouse API error", err); }
        }

        // --- Lever API Integration ---
        // Match jobs.lever.co/{company}/{id}
        const leverMatch = url.match(/jobs\.lever\.co\/([^/]+)\/([^/]+)/);
        if (leverMatch) {
            const company = leverMatch[1];
            const jobId = leverMatch[2];
            const apiUrl = `https://api.lever.co/v0/postings/${company}/${jobId}`;

            try {
                const apiRes = await fetch(apiUrl);
                if (apiRes.ok) {
                    type LeverList = { text?: string; content?: string };
                    type LeverPosting = {
                        text?: string;
                        descriptionHtml?: string;
                        lists?: LeverList[];
                        categories?: { location?: string };
                    };

                    const data: LeverPosting = await apiRes.json();
                    const rawDescription =
                        (data.descriptionHtml ?? "") +
                        ((data.lists ?? [])
                            .map((l) => `<h3>${l.text ?? ""}</h3><ul>${l.content ?? ""}</ul>`)
                            .join("") || "");
                    return NextResponse.json({
                        title: data.text || "",
                        company: company.charAt(0).toUpperCase() + company.slice(1),
                        description: formatDescription(rawDescription),
                        location: data.categories?.location || "",
                        url: url,
                    });
                }
            } catch (err) { console.error("Lever API error", err); }
        }

        // --- Ashby API Integration ---
        // Supports:
        // - ashbyhq.com/{company}/...
        // - jobs.ashbyhq.com/{company}/...
        const ashby = parseAshbyJobUrl(url);
        if (ashby) {
            const { company } = ashby;
            const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${company}`;

            try {
                const apiRes = await fetch(apiUrl);
                if (apiRes.ok) {
                    type AshbyJob = {
                        title?: string;
                        descriptionHtml?: string;
                        descriptionPlain?: string;
                        description?: string;
                        location?: string;
                        jobUrl?: string;
                        applyUrl?: string;
                    };
                    type AshbyBoard = { jobs?: AshbyJob[] };

                    const data: AshbyBoard = await apiRes.json();
                    const jobs = data.jobs ?? [];

                    const requestedUrl = toUrlOrNull(url);
                    let job: AshbyJob | undefined;

                    if (requestedUrl) {
                        job = jobs.find((j) => {
                            const candidateUrl = toUrlOrNull(j.jobUrl || j.applyUrl || "");
                            return candidateUrl?.pathname === requestedUrl.pathname;
                        });
                    }

                    if (!job) {
                        console.warn("Ashby API: Job not found for URL, falling back to generic scraper");
                    } else {
                        const rawDescription =
                            job.descriptionHtml ||
                            job.description ||
                            job.descriptionPlain ||
                            "";

                        return NextResponse.json({
                            title: job.title || "",
                            company: company.charAt(0).toUpperCase() + company.slice(1),
                            description: formatDescription(rawDescription),
                            location: job.location || "",
                            url: url,
                        });
                    }
                }
            } catch (err) { console.error("Ashby API error", err); }
        }

        const response = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch URL: ${response.statusText}` },
                { status: 500 }
            );
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Basic heuristic to find title and company
        let title = $('meta[property="og:title"]').attr('content') || $('title').text() || "";
        let company = $('meta[property="og:site_name"]').attr('content') || "";

        // Try to find location from meta tags (best-effort; lots of sites omit this)
        let location =
            $('meta[property="job:location"]').attr("content") ||
            $('meta[name="job:location"]').attr("content") ||
            $('meta[name="jobLocation"]').attr("content") ||
            $('meta[property="og:locality"]').attr("content") ||
            "";

        // Clean up title
        if (title.includes(" at ")) {
            const parts = title.split(" at ");
            title = parts[0].trim();
            if (!company) company = parts[1].trim();
        } else if (title.includes(" | ") || title.includes(" - ")) {
            const splitChar = title.includes(" | ") ? " | " : " - ";
            const parts = title.split(splitChar);

            if (company && parts[0].toLowerCase().includes(company.toLowerCase())) {
                title = parts.length > 1 ? parts[1].trim() : parts[0].trim();
            } else if (company && parts.length > 1 && parts[parts.length - 1].toLowerCase().includes(company.toLowerCase())) {
                title = parts[0].trim();
            } else if (!company && parts.length > 1) {
                // Heuristic: Company name is usually shorter than the Job Role
                if (parts[0].length < parts[1].length) {
                    company = parts[0].trim();
                    title = parts[1].trim();
                } else {
                    title = parts[0].trim();
                    company = parts[1].trim();
                }
            } else if (parts.length > 1) {
                title = parts[0].trim();
            }
        }

        // Some libraries (or their dependencies) may assume a browser-like global `location`.
        // In Node/Next.js this does not exist by default, so we provide a minimal polyfill.
        if (typeof (globalThis as { location?: unknown }).location === "undefined") {
            try {
                (globalThis as { location?: unknown }).location = new URL(url);
            } catch {
                (globalThis as { location?: unknown }).location = { href: url };
            }
        }

        // Use Mozilla Readability to get the main content text
        const { parseHTML } = await import("linkedom");
        const { Readability } = await import("@mozilla/readability");
        const { document } = parseHTML(html);
        const reader = new Readability(document as unknown as Document);
        const article = reader.parse();

        // Get HTML content for better formatting, fallback to textContent
        let description = article?.content || article?.textContent || "";

        // Apply our formatDescription sanitizer
        description = formatDescription(description);

        return NextResponse.json({
            title,
            company,
            description,
            location,
            url,
        });
    } catch (error: unknown) {
        console.error("Scraping error:", error);
        const message = error instanceof Error ? error.message : "Failed to scrape";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
