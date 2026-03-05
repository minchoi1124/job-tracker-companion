import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import * as cheerio from "cheerio";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

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

        // Basic cleanup: remove style attributes and normalize whitespace
        description = description.replace(/style="[^"]*"/g, '').trim();

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
