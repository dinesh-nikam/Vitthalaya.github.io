task-10: README update with Ethical Scraping Policy

Changes:
- Replaced "No automated scraping of third-party sites." with "Ethical Scraping Pipeline" section
- Section includes: robots.txt compliance, rate limiting, attribution, no login bypass, dedup, manual review gate, take-down contact
- Lists current sources: Tukaram Gatha (anantasatsang.org), Warkari Rojnishi (warkarirojnishi.in), Abhang.in
- Includes CLI and API usage examples

Verification: 
- Select-String "No automated scraping" → no matches (old policy removed)
- Select-String "Ethical Scraping Pipeline" → line 61 match found (new policy added)
