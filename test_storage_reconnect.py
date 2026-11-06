"""Synthetic characterization of exact deployed storage source; no real driver/network."""
import importlib.util
import json
import socket
import sys
import types
import unittest
from pathlib import Path

ROOT = Path(__file__).parent
class Settings:
    database_url = 'postgresql://synthetic.invalid/test'
class Disconnected(Exception): pass
class Cursor:
    def __init__(self, connection): self.connection = connection
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def execute(self, *args):
        if self.connection.closed: raise Disconnected('synthetic connection closed')
    def fetchall(self): return [({'synthetic': True},)]
    def fetchone(self): return ({'synthetic': True},)
class Connection:
    closed = False
    def cursor(self):
        if self.closed: raise Disconnected('synthetic connection closed')
        return Cursor(self)
connections = []
def connect(*args, **kwargs):
    conn = Connection(); connections.append(conn); return conn

def no_network(*args, **kwargs): raise AssertionError('Network prohibited')
socket.socket = no_network
socket.create_connection = no_network
for name in ('app', 'app.settings', 'psycopg', 'psycopg.types', 'psycopg.types.json'):
    sys.modules[name] = types.ModuleType(name)
sys.modules['app.settings'].Settings = Settings
sys.modules['psycopg'].connect = connect
sys.modules['psycopg.types.json'].Jsonb = lambda value: value
spec = importlib.util.spec_from_file_location('synthetic_storage', ROOT / 'storage_reconnect_candidate.py')
storage = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = storage
spec.loader.exec_module(storage)

class Characterization(unittest.TestCase):
    def setUp(self):
        connections.clear()
        self.store = storage.PostgresRecordStore(Settings())
    def test_active_connection_reads(self):
        self.assertEqual(self.store.get('test', 'id'), {'synthetic': True})
        self.assertEqual(self.store.list_records('test'), [{'synthetic': True}])
    def test_closed_connection_recovers_before_read(self):
        connections[0].closed = True
        self.assertEqual(self.store.get('test', 'id'), {'synthetic': True})
        self.assertEqual(len(connections), 2)
    def test_closed_connection_recovers_before_write(self):
        connections[0].closed = True
        self.store.upsert('test', 'id', {'synthetic': True})
        self.store.delete_by_parent('test', 'id')
        self.assertEqual(len(connections), 2)
    def test_failed_reconnect_propagates_without_loop(self):
        old = connections[0]
        old.closed = True
        attempts = []
        original = storage.psycopg.connect if hasattr(storage, 'psycopg') else self.store._psycopg.connect
        def unavailable(*args, **kwargs):
            attempts.append(1)
            raise Disconnected('synthetic unavailable')
        self.store._psycopg.connect = unavailable
        try:
            with self.assertRaises(Disconnected): self.store.get('test', 'id')
        finally:
            self.store._psycopg.connect = original
        self.assertEqual(attempts, [1])
        self.assertIs(self.store._connection, old)
        self.assertEqual(self.store.get('test', 'id'), {'synthetic': True})

    def test_ambiguous_write_is_not_replayed(self):
        attempts = []
        original = Cursor.execute
        def fail(cursor, *args):
            attempts.append(args)
            cursor.connection.closed = True
            raise Disconnected('synthetic lost reply after possible commit')
        Cursor.execute = fail
        try:
            with self.assertRaises(Disconnected):
                self.store.upsert('test', 'id', {'synthetic': True})
        finally:
            Cursor.execute = original
        self.assertEqual(len(attempts), 1)
        self.assertEqual(len(connections), 1)
        self.assertEqual(self.store.get('test', 'id'), {'synthetic': True})
        self.assertEqual(len(connections), 2)
    def test_new_store_recovers_after_process_reinitialization(self):
        connections[0].closed = True
        replacement = storage.PostgresRecordStore(Settings())
        self.assertEqual(replacement.get('test', 'id'), {'synthetic': True})
        self.assertEqual(len(connections), 2)

if __name__ == '__main__': unittest.main(verbosity=2)
