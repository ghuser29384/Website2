from __future__ import annotations

from datetime import datetime

from app.models.records import NotesWrittenSnapshot, WritingLimitSnapshot, new_id


def _helpful(note: NotesWrittenSnapshot) -> bool:
    return note.crh and not note.crnh


class WritingLimitMonitor:
    def compute(self, notes: list[NotesWrittenSnapshot]) -> WritingLimitSnapshot:
        recent = notes[:]
        total = len(recent)
        nh_5 = sum(1 for note in recent[:5] if _helpful(note))
        nh_10 = sum(1 for note in recent[:10] if _helpful(note))
        hr_100 = sum(1 for note in recent[:100] if _helpful(note)) / (min(total, 100) or 1)
        hr_r = sum(1 for note in recent[:20] if _helpful(note)) / (min(total, 20) or 1)
        hr_l = sum(1 for note in recent if _helpful(note)) / (total or 1)
        dates = []
        for note in recent:
            try:
                dates.append(datetime.fromisoformat(note.created_at.replace("Z", "+00:00")))
            except ValueError:
                pass
        newest = max(dates) if dates else None
        last_14 = []
        last_30 = []
        last_90 = []
        if newest:
            for note in recent:
                parsed = datetime.fromisoformat(note.created_at.replace("Z", "+00:00"))
                days = (newest - parsed).days
                if days <= 14:
                    last_14.append(note)
                if days <= 30:
                    last_30.append(note)
                if days <= 90:
                    last_90.append(note)
        hr_14d = sum(1 for note in last_14 if _helpful(note)) / (len(last_14) or 1)
        dn_30 = len(last_30)
        estimated = max(1, int(5 + hr_100 * 45 + hr_r * 20 - max(0, dn_30 - 30) * 0.5))
        xl_ready = estimated >= 50 and hr_100 >= 0.55 and hr_14d >= 0.45
        xxl_ready = estimated >= 75 and hr_100 >= 0.65 and hr_14d >= 0.55
        feed_size_eligibility = {
            "small": {
                "eligible": total >= 1,
                "non_test_mode_only": False,
                "requirements": "Available in fixture/test-mode intake.",
            },
            "medium": {
                "eligible": estimated >= 10 and hr_100 >= 0.30,
                "non_test_mode_only": False,
                "requirements": "Moderate helpful-rate history.",
            },
            "large": {
                "eligible": estimated >= 25 and hr_100 >= 0.45 and hr_14d >= 0.35,
                "non_test_mode_only": True,
                "requirements": "High-performing non-test-mode writer.",
            },
            "xl": {
                "eligible": xl_ready,
                "non_test_mode_only": True,
                "requirements": "Higher sustained helpful-rate and write-limit trajectory.",
            },
            "xxl": {
                "eligible": xxl_ready,
                "non_test_mode_only": True,
                "requirements": "Highest sustained helpful-rate and write-limit trajectory.",
            },
        }
        return WritingLimitSnapshot(
            id=new_id(),
            wl=estimated,
            nh_5=nh_5,
            nh_10=nh_10,
            hr_r=hr_r,
            hr_100=hr_100,
            hr_14d=hr_14d,
            hr_l=hr_l,
            dn_30=dn_30,
            t=total,
            total_notes=total,
            estimated_writing_limit=estimated,
            feed_size_eligibility=feed_size_eligibility,
            writing_impact_90d={
                "notes": len(last_90),
                "crh": sum(1 for note in last_90 if note.crh),
                "crnh": sum(1 for note in last_90 if note.crnh),
                "nmr": sum(1 for note in last_90 if note.nmr),
            },
            formulas={
                "WL": "estimated writing limit from recent and lifetime helpful-rate signals",
                "NH_5": "count(CRH and not CRNH over most recent 5 notes)",
                "NH_10": "count(CRH and not CRNH over most recent 10 notes)",
                "HR_R": "helpful notes over most recent 20 / most recent 20",
                "HR_100": "helpful notes over most recent 100 / most recent 100",
                "HR_14d": "helpful notes in trailing 14 days / notes in trailing 14 days",
                "HR_L": "helpful notes over lifetime / lifetime notes",
                "DN_30": "notes written in trailing 30 days",
                "T": "total notes written",
                "estimated_writing_limit": "max(1, 5 + HR_100*45 + HR_R*20 - max(0, DN_30-30)*0.5)",
            },
            raw_inputs={
                "note_count": total,
                "last_14_count": len(last_14),
                "last_30_count": len(last_30),
                "test_results": {
                    "passed": sum(1 for note in recent if note.test_result == "passed"),
                    "needs_review": sum(1 for note in recent if note.test_result == "needs_review"),
                },
                "scoring_status": {
                    "scored": sum(1 for note in recent if note.scoring_status == "scored"),
                    "pending": sum(1 for note in recent if note.scoring_status == "pending"),
                },
            },
        )
