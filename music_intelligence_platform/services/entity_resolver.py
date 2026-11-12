"""Cross-source entity resolution, fuzzy deduplication, and authority score reconciliation."""

import re
from typing import List, Optional
from sqlalchemy import select
from core.database import async_session_scope
from models.domain import Artist, Song
from schemas.intelligence import (
    EntityResolutionRequest,
    ResolvedEntity,
    EntityResolutionResponse,
)


def _bigram_dice(s1: str, s2: str) -> float:
    """Computes Sørensen–Dice coefficient over character bigrams."""
    s1_clean = re.sub(r"\s+", "", s1.lower())
    s2_clean = re.sub(r"\s+", "", s2.lower())

    if not s1_clean or not s2_clean:
        return 0.0
    if s1_clean == s2_clean:
        return 1.0

    pairs1 = [s1_clean[i:i+2] for i in range(len(s1_clean) - 1)]
    pairs2 = [s2_clean[i:i+2] for i in range(len(s2_clean) - 1)]

    if not pairs1 or not pairs2:
        return 0.0

    matches = sum(1 for p in pairs1 if p in pairs2)
    return (2.0 * matches) / (len(pairs1) + len(pairs2))


def _levenshtein_ratio(s1: str, s2: str) -> float:
    """Computes normalized Levenshtein similarity ratio."""
    m, n = len(s1), len(s2)
    if m == 0 or n == 0:
        return 0.0 if m != n else 1.0

    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            dp[i][j] = min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)

    dist = dp[m][n]
    max_len = max(m, n)
    return 1.0 - (dist / max_len)


class EntityResolver:
    """Resolves and consolidates ambiguous musical works, recordings, and artists."""

    @staticmethod
    async def resolve(req: EntityResolutionRequest) -> EntityResolutionResponse:
        matches: List[ResolvedEntity] = []

        async with async_session_scope() as session:
            # 1. Exact ISRC search on Songs
            if req.isrc:
                rec_res = await session.execute(select(Song).where(Song.isrc == req.isrc.strip()))
                rec = rec_res.scalars().first()
                if rec:
                    matches.append(
                        ResolvedEntity(
                            entity_id=str(rec.id),
                            entity_type="song",
                            title=rec.title,
                            primary_artist=None,
                            confidence_score=1.0,
                            matching_criteria=["isrc_exact_match"],
                            sources_confirmed=["database_catalog"],
                        )
                    )

            # 2. Fuzzy Title search across Songs
            comp_stmt = select(Song).limit(500)
            all_comps = (await session.execute(comp_stmt)).scalars().all()

            for c in all_comps:
                dice = _bigram_dice(req.title, c.title)
                lev = _levenshtein_ratio(req.title, c.title)
                score = (dice * 0.6) + (lev * 0.4)

                if score >= 0.70:
                    matches.append(
                        ResolvedEntity(
                            entity_id=str(c.id),
                            entity_type="song",
                            title=c.title,
                            primary_artist=None,
                            confidence_score=round(score, 3),
                            matching_criteria=["title_fuzzy_dice_levenshtein"],
                            sources_confirmed=["database_catalog"],
                        )
                    )

        # Sort matches by highest confidence
        matches.sort(key=lambda m: m.confidence_score, reverse=True)
        best_match = matches[0] if matches else None

        status = "UNRESOLVED"
        if best_match:
            status = "EXACT_MATCH" if best_match.confidence_score >= 0.98 else "FUZZY_MATCH"

        return EntityResolutionResponse(
            query=req,
            matches=matches[:10],
            best_match=best_match,
            status=status,
        )


entity_resolver = EntityResolver()
