/**
 * Digital Pandharpur — Source Discovery Engine
 * 
 * Automatically discovers Marathi devotional resources across the web:
 * 1. Sitemap.xml parsing
 * 2. Link graph crawling (BFS crawling with depth limits)
 * 3. robots.txt compliance checking
 * 4. Search seed / YouTube URL discovery
 */

import { URL } from 'url';

export interface DiscoveredPage {
  url: string;
  title?: string;
  discoveredAt: string;
  sourceType: 'website' | 'youtube' | 'pdf' | 'epub';
}

/**
 * Basic robots.txt parser and rule checker
 */
export class RobotsParser {
  private disallows: string[] = [];
  private crawlDelay = 0;

  constructor(private robotsTxtContent: string, private userAgent: string) {
    this.parse();
  }

  private parse() {
    const lines = this.robotsTxtContent.split('\n');
    let isCurrentAgent = false;

    for (const line of lines) {
      const cleanLine = line.trim().toLowerCase();
      if (cleanLine.startsWith('user-agent:')) {
        const agent = cleanLine.split(':')[1].trim();
        isCurrentAgent = agent === '*' || this.userAgent.toLowerCase().includes(agent);
      } else if (isCurrentAgent) {
        if (cleanLine.startsWith('disallow:')) {
          const path = line.split(':')[1].trim();
          if (path) this.disallows.push(path);
        } else if (cleanLine.startsWith('crawl-delay:')) {
          const delay = parseInt(line.split(':')[1].trim(), 10);
          if (!isNaN(delay)) this.crawlDelay = delay;
        }
      }
    }
  }

  /**
   * Check if a path is allowed to be crawled
   */
  isAllowed(urlPath: string): boolean {
    for (const disallow of this.disallows) {
      if (disallow === '/') return false;
      if (urlPath.startsWith(disallow)) return false;
      // Convert simple glob-like match
      const regexStr = '^' + disallow.replace(/\*/g, '.*').replace(/\?/g, '\\?') + '($|/)';
      try {
        const regex = new RegExp(regexStr);
        if (regex.test(urlPath)) return false;
      } catch {
        if (urlPath.includes(disallow)) return false;
      }
    }
    return true;
  }

  getCrawlDelay(): number {
    return this.crawlDelay * 1000;
  }
}

/**
 * Fetch and check robots.txt of a domain
 */
export async function checkRobotsTxt(urlStr: string, userAgent: string): Promise<{ allowed: boolean; delayMs: number }> {
  try {
    const parsedUrl = new URL(urlStr);
    const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;

    const res = await fetch(robotsUrl, { 
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(5000) 
    });

    if (!res.ok) {
      // Default to allowed if no robots.txt exists (e.g. 404)
      return { allowed: true, delayMs: 1000 };
    }

    const content = await res.text();
    const parser = new RobotsParser(content, userAgent);
    const allowed = parser.isAllowed(parsedUrl.pathname);
    return { allowed, delayMs: parser.getCrawlDelay() || 1000 };
  } catch (err) {
    // If request fails (timeout or network error), allow with default delay
    return { allowed: true, delayMs: 1000 };
  }
}

/**
 * Parses a sitemap.xml and extracts all URLs
 */
export async function parseSitemap(sitemapUrl: string, userAgent: string): Promise<string[]> {
  const discoveredUrls: string[] = [];
  try {
    const res = await fetch(sitemapUrl, { 
      headers: { 'User-Agent': userAgent },
      signal: AbortSignal.timeout(10000) 
    });

    if (!res.ok) return [];

    const xmlText = await res.text();
    
    // Extract loc tags using regex (avoiding complex external xml parsers)
    const locRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
    let match;
    while ((match = locRegex.exec(xmlText)) !== null) {
      discoveredUrls.push(match[1].trim());
    }

    // Check if there are sitemap indexes nested
    const sitemapIndexRegex = /<sitemap>[\s\S]*?<loc>(https?:\/\/[^<]+)<\/loc>[\s\S]*?<\/sitemap>/g;
    const nestedSitemaps: string[] = [];
    while ((match = sitemapIndexRegex.exec(xmlText)) !== null) {
      nestedSitemaps.push(match[1].trim());
    }

    for (const nested of nestedSitemaps) {
      // Avoid infinite loops by skipping self-referential links
      if (nested !== sitemapUrl) {
        const nestedUrls = await parseSitemap(nested, userAgent);
        discoveredUrls.push(...nestedUrls);
      }
    }
  } catch (err) {
    console.warn(`[Discovery] Failed to parse sitemap ${sitemapUrl}:`, err);
  }
  return [...new Set(discoveredUrls)];
}

/**
 * BFS Link Graph crawler to discover internal pages
 */
export async function crawlLinkGraph(
  seedUrl: string,
  options: {
    maxPages?: number;
    maxDepth?: number;
    userAgent: string;
    domainRestricted?: boolean;
  }
): Promise<DiscoveredPage[]> {
  const maxPages = options.maxPages ?? 100;
  const maxDepth = options.maxDepth ?? 3;
  const restrictDomain = options.domainRestricted ?? true;
  
  const seedParsed = new URL(seedUrl);
  const targetHost = seedParsed.host;

  const queue: { url: string; depth: number }[] = [{ url: seedUrl, depth: 0 }];
  const visited = new Set<string>();
  const discovered: DiscoveredPage[] = [];

  while (queue.length > 0 && visited.size < maxPages) {
    const current = queue.shift()!;
    if (visited.has(current.url)) continue;
    visited.add(current.url);

    // Respect robots.txt
    const robots = await checkRobotsTxt(current.url, options.userAgent);
    if (!robots.allowed) {
      console.log(`[Discovery] Robots.txt disallows crawling of ${current.url}`);
      continue;
    }

    console.log(`[Discovery] Crawling [Depth ${current.depth}]: ${current.url}`);
    
    try {
      const res = await fetch(current.url, { 
        headers: { 'User-Agent': options.userAgent },
        signal: AbortSignal.timeout(8000) 
      });

      if (!res.ok || !res.headers.get('content-type')?.includes('text/html')) continue;

      const html = await res.text();
      
      // Try to extract title
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : undefined;

      discovered.push({
        url: current.url,
        title,
        discoveredAt: new Date().toISOString(),
        sourceType: 'website'
      });

      // If max depth reached, don't parse links
      if (current.depth >= maxDepth) continue;

      // Extract links
      const hrefRegex = /href="([^"#\s>]+)"/g;
      let match;
      while ((match = hrefRegex.exec(html)) !== null) {
        let linkUrl = match[1];
        try {
          // Resolve relative URLs
          if (!linkUrl.startsWith('http')) {
            linkUrl = new URL(linkUrl, current.url).href;
          }

          const parsedLink = new URL(linkUrl);
          
          // Domain restriction
          if (restrictDomain && parsedLink.host !== targetHost) continue;

          // Push to queue
          if (!visited.has(linkUrl) && !queue.some((q) => q.url === linkUrl)) {
            queue.push({ url: linkUrl, depth: current.depth + 1 });
          }
        } catch {
          // Ignore bad URL parses
        }
      }

      // Respect crawl delay
      await new Promise((resolve) => setTimeout(resolve, robots.delayMs));
    } catch (err) {
      console.warn(`[Discovery] Failed to crawl link ${current.url}:`, err);
    }
  }

  return discovered;
}

/**
 * Simulates YouTube discovery based on query terms
 */
export async function discoverYouTubePlaylists(queries: string[]): Promise<DiscoveredPage[]> {
  const discovered: DiscoveredPage[] = [];
  
  // Simulated output based on popular devotional channels/playlists where legally permitted
  const playlists = [
    { url: 'https://www.youtube.com/playlist?list=PL_Xv4V8l8m_4gWzSnyLwB6x-0eXl9_R3O', title: 'संत तुकाराम महाराज अभंग गाथा' },
    { url: 'https://www.youtube.com/playlist?list=PL_Xv4V8l8m_5VfSgqXz48uL4jG6Xh2t9Q', title: 'ज्ञानेश्वर महाराज हरिपाठ' },
  ];

  for (const q of queries) {
    for (const pl of playlists) {
      discovered.push({
        url: `${pl.url}&q=${encodeURIComponent(q)}`,
        title: `${pl.title} (Query: ${q})`,
        discoveredAt: new Date().toISOString(),
        sourceType: 'youtube'
      });
    }
  }

  return discovered;
}
