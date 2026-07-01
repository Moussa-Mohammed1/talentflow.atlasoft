from __future__ import annotations

import re
from datetime import datetime

from app.services.certification_extraction.models import CertificationMention
from app.services.experience_extraction.date_parser import BilingualDateRangeParser
from app.services.skill_extraction.models import SectionSpan


class CertificationBlockExtractor:
    _BULLET = re.compile(r"^\s*(?:[-*\u2022\u25e6\u25aa]|\d+[.)])\s*")
    _YEAR_ONLY = re.compile(r"\b((?:19|20)\d{2})\b")
    _CREDENTIAL_ID = re.compile(r"(?i)(?:credential|license|certificate|id|no|number|ref)\s*[:\-#]?\s*(\S+)")
    _URL = re.compile(r"https?://\S+")

    def __init__(self) -> None:
        self.date_parser = BilingualDateRangeParser()

    @classmethod
    def _clean_line(cls, line: str) -> str:
        return cls._BULLET.sub("", line).strip()

    @classmethod
    def _is_blank_or_bullet(cls, line: str) -> bool:
        return not line.strip() or cls._BULLET.match(line)

    @classmethod
    def _clean_org(cls, candidate: str) -> str | None:
        cleaned = candidate.strip().strip(",").strip()
        if not cleaned or cls._YEAR_ONLY.fullmatch(cleaned):
            return None
        cleaned = re.sub(r",?\s*(?:19|20)\d{2}\s*$", "", cleaned).strip().strip(",").strip()
        if not cleaned:
            return None
        return cleaned

    @classmethod
    def _split_name_org(cls, line: str) -> tuple[str, str | None]:
        parts = re.split(r"\s*(?:[-\u2013\u2014\u2212|]\s+|\s+[-\u2013\u2014\u2212|]|\s+at\s+|\s+by\s+|\s+from\s+)", line, maxsplit=1)
        if len(parts) == 2 and parts[1].strip():
            org = cls._clean_org(parts[1])
            if org is not None:
                return parts[0].strip(), org
        parts = re.split(r",\s+", line, maxsplit=1)
        if len(parts) == 2 and parts[1].strip():
            org = cls._clean_org(parts[1])
            if org is not None:
                return parts[0].strip(), org
        return line.strip(), None

    def _extract_certification_block(
        self,
        lines: list[str],
        start: int,
        end: int,
        section_name: str,
    ) -> CertificationMention | None:
        block_lines = [
            self._clean_line(line)
            for line in lines[start:end]
            if self._clean_line(line)
        ]
        if not block_lines:
            return None

        merged = " ".join(block_lines)
        evidence = [line.strip() for line in lines[start:end] if line.strip()]

        raw_name, raw_org = self._split_name_org(block_lines[0])
        name = raw_name
        organization = raw_org

        for part in block_lines[1:]:
            if self._is_date_only_line(part):
                continue
            org_candidate, _ = self._split_name_org(part)
            if organization is None and org_candidate:
                organization = org_candidate

        url_match = self._URL.search(merged)
        credential_url = url_match.group(0) if url_match else None

        cred_match = self._CREDENTIAL_ID.search(merged)
        credential_id = cred_match.group(1) if cred_match else None

        date_ranges = []
        for line in block_lines:
            parsed = self.date_parser.find(line)
            if parsed is not None:
                date_ranges.append(parsed)

        year_matches = list(self._YEAR_ONLY.finditer(merged))
        years_found = sorted(set(int(m.group(1)) for m in year_matches))

        issue_date = None
        expiration_date = None
        if date_ranges:
            issue_date = date_ranges[0].start_date
            if date_ranges[0].end_date is not None:
                expiration_date = date_ranges[0].end_date
            elif len(date_ranges) > 1:
                expiration_date = date_ranges[1].end_date or date_ranges[1].start_date
        elif years_found:
            issue_date = datetime(years_found[0], 1, 1)
            if len(years_found) > 1:
                expiration_date = datetime(years_found[1], 12, 31)

        description = None
        extra = [l for l in block_lines[1:] if l.strip() and (organization is None or l.strip() != organization.strip())]
        if extra:
            description = "\n".join(extra)

        if not name:
            return None

        confidence = 0.60
        confidence += 0.10 if organization else 0.0
        confidence += 0.10 if issue_date else 0.0
        confidence += 0.05 if credential_id else 0.0
        confidence += 0.05 if credential_url else 0.0
        confidence += 0.05 if description else 0.0

        return CertificationMention(
            name=name,
            organization=organization,
            issue_date=issue_date,
            expiration_date=expiration_date,
            credential_id=credential_id,
            credential_url=credential_url,
            description=description,
            confidence=round(min(confidence, 0.97), 4),
            section=section_name,
            evidence=evidence,
        )

    @classmethod
    def _is_date_only_line(cls, cleaned: str) -> bool:
        return bool(re.search(r"(?i)(?:19|20)\d{2}", cleaned)) and len(cleaned) <= 20

    @classmethod
    def _split_blocks(cls, lines: list[str]) -> list[list[str]]:
        blocks: list[list[str]] = []
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            cleaned = cls._clean_line(line)
            if not cleaned:
                continue
            if blocks and cls._is_date_only_line(cleaned):
                blocks[-1].append(line)
            else:
                blocks.append([line])
        return blocks

    @classmethod
    def _looks_like_org(cls, cert: CertificationMention) -> bool:
        if cert.organization is not None:
            return False
        word_count = len(cert.name.split())
        return word_count <= 4 and not cert.credential_id and not cert.credential_url

    def extract(self, text: str, sections: list[SectionSpan]) -> tuple[list[CertificationMention], int]:
        mentions: list[CertificationMention] = []
        rejected = 0
        cert_sections = [s for s in sections if s.name == "certifications"]
        search_sections = cert_sections

        if not search_sections:
            return mentions, 0
        for section in search_sections:
            section_text = text[section.start_char:section.end_char]
            lines = section_text.splitlines()
            blocks = self._split_blocks(lines)

            for block in blocks:
                raw_lines = block
                cert = self._extract_certification_block(
                    raw_lines, 0, len(raw_lines), section.name,
                )
                if cert is not None:
                    mentions.append(cert)
                else:
                    rejected += 1

        merged: list[CertificationMention] = []
        for cert in mentions:
            if merged and self._looks_like_org(cert):
                prev = merged[-1]
                if prev.organization is None:
                    merged[-1] = CertificationMention(
                        name=prev.name,
                        organization=cert.name,
                        issue_date=prev.issue_date or cert.issue_date,
                        expiration_date=prev.expiration_date or cert.expiration_date,
                        credential_id=prev.credential_id or cert.credential_id,
                        credential_url=prev.credential_url or cert.credential_url,
                        description=prev.description,
                        confidence=min(prev.confidence + 0.08, 0.97),
                        section=prev.section,
                        evidence=prev.evidence + cert.evidence,
                    )
                    continue
            merged.append(cert)

        return merged, rejected
