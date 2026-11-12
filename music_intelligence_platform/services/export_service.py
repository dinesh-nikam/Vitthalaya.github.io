"""Export service generating JSON, CSV, and Excel reports from music intelligence data."""

import io
import json
from typing import Any, Dict, List
from openpyxl.styles import Alignment, Font, PatternFill
import pandas as pd
from models.schemas import SongIntelligenceResponse


class ExportService:
    """Handles structured data transformations and export generation."""

    def to_json(self, items: List[SongIntelligenceResponse]) -> str:
        """Serializes songs to formatted JSON string."""
        data = [item.model_dump() for item in items]
        return json.dumps(data, indent=2, ensure_ascii=False)

    def to_csv(self, items: List[SongIntelligenceResponse]) -> str:
        """Flattens structured songs into CSV format."""
        rows = [self._flatten_song(item) for item in items]
        df = pd.DataFrame(rows)
        return df.to_csv(index=False)

    def to_excel_bytes(self, items: List[SongIntelligenceResponse]) -> bytes:
        """Generates multi-worksheet formatted Excel workbook."""
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            # Sheet 1: Core Song Intelligence & Metadata
            core_rows = [self._flatten_song(item) for item in items]
            df_core = pd.DataFrame(core_rows)
            df_core.to_excel(writer, sheet_name="Song Intelligence", index=False)

            # Sheet 2: Composition & Chords
            comp_rows = []
            for item in items:
                comp_rows.append({
                    "Title": item.song.title,
                    "Artist": item.song.artist,
                    "Key": item.composition.key or "Unknown",
                    "Scale Type": item.composition.scale_type or "Unknown",
                    "BPM": item.composition.bpm,
                    "Time Signature": item.composition.time_signature,
                    "Chord Progression": " -> ".join(item.composition.chord_progression),
                    "Structure": " | ".join(item.composition.structure),
                    "Is Estimated": item.composition.is_estimated,
                    "Estimation Algorithm": item.composition.estimation_algorithm,
                })
            df_comp = pd.DataFrame(comp_rows)
            df_comp.to_excel(writer, sheet_name="Composition & Chords", index=False)

            # Sheet 3: Credits & Production
            credit_rows = []
            for item in items:
                credit_rows.append({
                    "Title": item.song.title,
                    "Artist": item.song.artist,
                    "Songwriters": ", ".join(item.songwriting.writers),
                    "Composers": ", ".join(item.songwriting.composers),
                    "Lyricists": ", ".join(item.songwriting.lyricists),
                    "Producers": ", ".join(item.production.producer),
                    "Mixing Engineers": ", ".join(item.production.mixing_engineer),
                    "Mastering Engineers": ", ".join(item.production.mastering_engineer),
                    "Studios": ", ".join(item.production.recording_studio),
                })
            df_credits = pd.DataFrame(credit_rows)
            df_credits.to_excel(writer, sheet_name="Credits & Production", index=False)

            # Style headers in all sheets
            for ws in writer.book.worksheets:
                header_fill = PatternFill(start_color="1F2937", end_color="1F2937", fill_type="solid")
                header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
                for cell in ws[1]:
                    cell.fill = header_fill
                    cell.font = header_font
                    cell.alignment = Alignment(horizontal="center", vertical="center")
                # Auto-fit column widths
                for col in ws.columns:
                    max_len = max(len(str(cell.value or "")) for cell in col)
                    col_letter = col[0].column_letter
                    ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 50)

        output.seek(0)
        return output.getvalue()

    def _flatten_song(self, item: SongIntelligenceResponse) -> Dict[str, Any]:
        return {
            "Title": item.song.title,
            "Artist": item.song.artist,
            "Album": item.song.album,
            "Release Date": item.song.release_date,
            "Genre": item.song.genre,
            "Duration": item.song.duration,
            "Language": item.song.language,
            "ISRC": item.song.isrc,
            "Key": item.composition.key,
            "BPM": item.composition.bpm,
            "Time Signature": item.composition.time_signature,
            "Chord Progression": ", ".join(item.composition.chord_progression),
            "Songwriters": ", ".join(item.songwriting.writers),
            "Composers": ", ".join(item.songwriting.composers),
            "Producers": ", ".join(item.production.producer),
            "Lyrics Availability": item.lyrics.availability,
            "Average Confidence": round(
                sum(item.confidence.values()) / len(item.confidence) if item.confidence else 0.0,
                2
            ),
            "Last Updated": item.last_updated,
        }


export_service = ExportService()
