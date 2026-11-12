"""Confidence scoring, multi-source cross-referencing, and conflict detection engine."""

from typing import Any, Dict, List, Optional, Tuple
from discovery.deduplication import levenshtein_similarity, normalize_string


class FieldObservation:
    def __init__(self, value: Any, source_name: str, authority_score: float, is_estimated: bool = False):
        self.value = value
        self.source_name = source_name
        self.authority_score = authority_score
        self.is_estimated = is_estimated


class ConfidenceEngine:
    """Calculates field-level confidence scores and detects conflicts across multiple sources."""

    def resolve_field(
        self,
        field_name: str,
        observations: List[FieldObservation],
    ) -> Tuple[Any, float, Optional[Dict[str, Any]]]:
        """Resolves single-value fields (e.g. title, key, bpm, release_date).

        Returns: (resolved_value, confidence_score, conflict_record_or_None)
        """
        valid_obs = [o for o in observations if o.value is not None and str(o.value).strip() != ""]
        if not valid_obs:
            return None, 0.0, None

        if len(valid_obs) == 1:
            obs = valid_obs[0]
            base_score = obs.authority_score * (0.75 if obs.is_estimated else 0.90)
            return obs.value, round(base_score, 2), None

        # Multiple observations: group by normalized equality
        groups: Dict[str, List[FieldObservation]] = {}
        for obs in valid_obs:
            norm_key = normalize_string(str(obs.value))
            groups.setdefault(norm_key, []).append(obs)

        # Check for consensus vs conflict
        if len(groups) == 1:
            # Full consensus across all sources
            top_obs = valid_obs[0]
            # Multi-source consensus boost
            boosted_score = min(0.99, top_obs.authority_score + (len(valid_obs) - 1) * 0.04)
            return top_obs.value, round(boosted_score, 2), None

        # Conflict detected
        sorted_groups = sorted(
            groups.values(),
            key=lambda obs_list: sum(o.authority_score for o in obs_list),
            reverse=True,
        )
        winning_group = sorted_groups[0]
        winning_obs = winning_group[0]

        conflict_details = {
            "field": field_name,
            "chosen_value": winning_obs.value,
            "chosen_source": winning_obs.source_name,
            "conflicting_values": [
                {"value": g[0].value, "source": g[0].source_name, "authority": g[0].authority_score}
                for g in sorted_groups[1:]
            ],
        }

        # In case of conflict, confidence is penalized
        penalized_score = max(0.50, winning_obs.authority_score - 0.15)
        return winning_obs.value, round(penalized_score, 2), conflict_details

    def resolve_list_field(
        self,
        field_name: str,
        observations: List[FieldObservation],
    ) -> Tuple[List[str], float]:
        """Resolves list-based credits (e.g. writers, producers, instruments) with deduplication."""
        seen: Dict[str, str] = {}
        authorities = []

        for obs in observations:
            if not obs.value:
                continue
            items = obs.value if isinstance(obs.value, list) else [obs.value]
            for item in items:
                if not item:
                    continue
                norm = normalize_string(str(item))
                if norm and norm not in seen:
                    seen[norm] = str(item).strip()
                    authorities.append(obs.authority_score)

        merged_list = list(seen.values())
        if not merged_list:
            return [], 0.0

        avg_authority = sum(authorities) / len(authorities) if authorities else 0.85
        return merged_list, round(min(0.98, avg_authority), 2)


# Global confidence engine singleton
confidence_engine = ConfidenceEngine()
