import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import * as cheerio from "cheerio";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

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
        // Match boards.greenhouse.io/{company}/jobs/{id}
        const greenhouseMatch = url.match(/boards\.greenhouse\.io\/([^/]+)\/jobs\/([a-zA-Z0-9]+)/);
        if (greenhouseMatch) {
            const companyShortName = greenhouseMatch[1];
            const jobId = greenhouseMatch[2];
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
                    const data = await apiRes.json();
                    const rawDescription = data.descriptionHtml + (data.lists?.map((l: any) => `<h3>${l.text}</h3><ul>${l.content}</ul>`).join('') || '');
                    return NextResponse.json({
                        title: data.text,
                        company: company.charAt(0).toUpperCase() + company.slice(1),
                        description: formatDescription(rawDescription),
                        url: url,
                    });
                }
            } catch (err) { console.error("Lever API error", err); }
        }

        // --- Ashby API Integration ---
        // Match ashbyhq.com/{company}/jobs/{id} or similar
        const ashbyMatch = url.match(/ashbyhq\.com\/([^/]+)\/(\d+)/) || url.match(/jobs\.ashbyhq\.com\/([^/]+)\/(\w+-?\w+)/);
        if (ashbyMatch) {
            const company = ashbyMatch[1];
            const jobId = ashbyMatch[2];
            // Ashby API is usually a board list, we fetch the board and find our job
            const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${company}`;

            try {
                const apiRes = await fetch(apiUrl);
                if (apiRes.ok) {
                    const data = await apiRes.json();
                    const job = data.jobs?.find((j: any) => j.id === jobId || j.externalId === jobId);
                    if (job) {
                        return NextResponse.json({
                            title: job.title,
                            company: company.charAt(0).toUpperCase() + company.slice(1),
                            description: formatDescription(job.descriptionHtml || job.description || ""),
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

        // Use Mozilla Readability to get the main content text
        const doc = new JSDOM(html, { url });
        const reader = new Readability(doc.window.document);
        const article = reader.parse();

        // Get HTML content for better formatting, fallback to textContent
        let description = article?.content || article?.textContent || "";

        // Apply our formatDescription sanitizer
        description = formatDescription(description);

        return NextResponse.json({
            title,
            company,
            description,
            url,
        });
    } catch (error: any) {
        console.error("Scraping error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to scrape" },
            { status: 500 }
        );
    }
}
