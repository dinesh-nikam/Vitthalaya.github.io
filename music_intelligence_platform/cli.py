"""Command Line Interface (CLI) for Music Intelligence Platform."""

import argparse
import asyncio
import json
import sys
from pathlib import Path

from config.logging_config import logger
from config.settings import settings
from core.database import init_db
from models.schemas import SingleSongScrapeRequest, SongSearchFilter
from pipeline.orchestrator import music_pipeline
from services.export_service import export_service
from services.music_service import music_service
from discovery.source_registry import source_registry


def print_banner():
    print(r"""
========================================================================
   MUSIC RESEARCH, COMPOSITION & LYRICS INTELLIGENCE PLATFORM
           Powered by Scrapling Adaptive Web Crawling
========================================================================
""")


async def run_research(title: str, artist: str = None, album: str = None):
    print(f"[*] Researching song '{title}' by '{artist or 'Unknown'}'...")
    req = SingleSongScrapeRequest(title=title, artist=artist, album=album)
    result = await music_pipeline.execute(req)
    print("\n[+] Extraction and Intelligence Results:")
    print(json.dumps(result.model_dump(), indent=2, ensure_ascii=False))


async def run_search(query: str = None, artist: str = None, genre: str = None, limit: int = 10):
    print(f"[*] Searching catalog (query='{query}', artist='{artist}', genre='{genre}')...")
    filters = SongSearchFilter(query=query, artist=artist, genre=genre, limit=limit)
    res = await music_service.search_songs(filters)
    print(f"\n[+] Total items found: {res['total']}")
    for item in res["items"]:
        print(f"  - [{item['id']}] {item['title']} - {item['artist']} | Key: {item['key'] or 'N/A'} | BPM: {item['bpm'] or 'N/A'}")


async def run_export(fmt: str, output_path: str):
    print(f"[*] Exporting catalog to format: {fmt}...")
    filters = SongSearchFilter(limit=1000)
    search_res = await music_service.search_songs(filters)
    songs = []
    for item in search_res["items"]:
        intel = await music_service.get_song_intelligence(item["id"])
        if intel:
            songs.append(intel)

    out_file = Path(output_path)
    if fmt == "json":
        data = export_service.to_json(songs)
        out_file.write_text(data, encoding="utf-8")
    elif fmt == "csv":
        data = export_service.to_csv(songs)
        out_file.write_text(data, encoding="utf-8")
    elif fmt == "excel":
        data_bytes = export_service.to_excel_bytes(songs)
        out_file.write_bytes(data_bytes)
    print(f"[+] Successfully exported {len(songs)} items to {out_file.resolve()}")


def list_sources():
    print("[*] Registered Crawl Sources & Permissions:")
    for src in source_registry.list_sources():
        print(f"  - [{src.id:<18}] {src.name:<45} Authority: {src.authority_score:.2f} | Rate: {src.rate_limit_per_second} req/s")


def main():
    print_banner()
    parser = argparse.ArgumentParser(description="Music Composition & Lyrics Intelligence CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Research / Scrape command
    p_research = subparsers.add_parser("research", help="Research and extract intelligence for a song")
    p_research.add_argument("--title", required=True, help="Title of the song")
    p_research.add_argument("--artist", help="Artist or composer name")
    p_research.add_argument("--album", help="Album name")

    # Search command
    p_search = subparsers.add_parser("search", help="Search the catalog database")
    p_search.add_argument("--query", help="Keywords for title or lyrics")
    p_search.add_argument("--artist", help="Artist filter")
    p_search.add_argument("--genre", help="Genre filter")
    p_search.add_argument("--limit", type=int, default=10, help="Max results")

    # Export command
    p_export = subparsers.add_parser("export", help="Export the catalog dataset")
    p_export.add_argument("--format", choices=["json", "csv", "excel"], default="json")
    p_export.add_argument("--output", default="catalog_export.json", help="Output file path")

    # Sources command
    subparsers.add_parser("sources", help="List registered authoritative sources")

    # Init DB command
    subparsers.add_parser("init-db", help="Initialize database tables")

    # Serve command
    p_serve = subparsers.add_parser("serve", help="Launch FastAPI web and API server")
    p_serve.add_argument("--host", default=settings.app_host)
    p_serve.add_argument("--port", type=int, default=settings.app_port)

    args = parser.parse_args()

    if args.command == "research":
        asyncio.run(run_research(title=args.title, artist=args.artist, album=args.album))
    elif args.command == "search":
        asyncio.run(run_search(query=args.query, artist=args.artist, genre=args.genre, limit=args.limit))
    elif args.command == "export":
        asyncio.run(run_export(fmt=args.format, output_path=args.output))
    elif args.command == "sources":
        list_sources()
    elif args.command == "init-db":
        asyncio.run(init_db())
        print("[+] Database tables initialized.")
    elif args.command == "serve":
        import uvicorn
        uvicorn.run("api.main:app", host=args.host, port=args.port, reload=settings.debug)


if __name__ == "__main__":
    main()
