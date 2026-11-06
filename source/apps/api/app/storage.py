from __future__ import annotations

import json
import threading
from dataclasses import dataclass
from typing import Any

from app.settings import Settings


def normalize_postgres_url(database_url: str) -> str:
    if database_url.startswith("postgresql+psycopg://"):
        return "postgresql://" + database_url.removeprefix("postgresql+psycopg://")
    return database_url


SCHEMA_SQL = """
create table if not exists app_records (
  record_type text not null,
  id text not null,
  parent_id text,
  canonical_hash text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (record_type, id)
);

create index if not exists app_records_parent_idx
  on app_records (record_type, parent_id);

create unique index if not exists app_records_candidate_hash_idx
  on app_records (canonical_hash)
  where record_type = 'candidate' and canonical_hash is not null;
"""


class RecordStore:
    enabled = False

    def upsert(self, record_type: str, record_id: str, payload: dict[str, Any], parent_id: str | None = None, canonical_hash: str | None = None) -> None:
        return None

    def delete_by_parent(self, record_type: str, parent_id: str) -> None:
        return None

    def list_records(self, record_type: str) -> list[dict[str, Any]]:
        return []

    def get(self, record_type: str, record_id: str) -> dict[str, Any] | None:
        return None


@dataclass
class PostgresRecordStore(RecordStore):
    settings: Settings
    enabled: bool = True

    def __post_init__(self) -> None:
        try:
            import psycopg
            from psycopg.types.json import Jsonb
        except ImportError as exc:
            raise RuntimeError("Postgres persistence requires psycopg. Add requirements.txt dependencies and redeploy.") from exc
        self._psycopg = psycopg
        self._jsonb = Jsonb
        self._lock = threading.RLock()
        self._connection = psycopg.connect(normalize_postgres_url(self.settings.database_url), autocommit=True)
        self.ensure_schema()

    def ensure_schema(self) -> None:
        with self._lock, self._connection.cursor() as cursor:
            cursor.execute(SCHEMA_SQL)

    def upsert(self, record_type: str, record_id: str, payload: dict[str, Any], parent_id: str | None = None, canonical_hash: str | None = None) -> None:
        with self._lock, self._connection.cursor() as cursor:
            cursor.execute(
                """
                insert into app_records (record_type, id, parent_id, canonical_hash, payload)
                values (%s, %s, %s, %s, %s)
                on conflict (record_type, id)
                do update set
                  parent_id = excluded.parent_id,
                  canonical_hash = excluded.canonical_hash,
                  payload = excluded.payload,
                  updated_at = now()
                """,
                (record_type, record_id, parent_id, canonical_hash, self._jsonb(payload)),
            )

    def delete_by_parent(self, record_type: str, parent_id: str) -> None:
        with self._lock, self._connection.cursor() as cursor:
            cursor.execute("delete from app_records where record_type = %s and parent_id = %s", (record_type, parent_id))

    def list_records(self, record_type: str) -> list[dict[str, Any]]:
        with self._lock, self._connection.cursor() as cursor:
            cursor.execute(
                "select payload from app_records where record_type = %s order by created_at asc, id asc",
                (record_type,),
            )
            return [_as_dict(row[0]) for row in cursor.fetchall()]

    def get(self, record_type: str, record_id: str) -> dict[str, Any] | None:
        with self._lock, self._connection.cursor() as cursor:
            cursor.execute("select payload from app_records where record_type = %s and id = %s", (record_type, record_id))
            row = cursor.fetchone()
            return _as_dict(row[0]) if row else None


def _as_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        return json.loads(value)
    return dict(value)


def build_record_store(settings: Settings) -> RecordStore:
    if settings.postgres_persistence_enabled():
        return PostgresRecordStore(settings)
    return RecordStore()
