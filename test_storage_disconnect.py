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
spec = importlib.util.spec_from_file_location('synthetic_storage', ROOT / 'apps_api_app_storage.py')
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
    def test_dropped_connection_read_fails_without_reconnect(self):
        connections[0].closed = True
        for _ in range(2):
            with self.assertRaises(Disconnected): self.store.get('test', 'id')
        self.assertEqual(len(connections), 1)
    def test_dropped_connection_write_fails_without_reconnect(self):
        connections[0].closed = True
        with self.assertRaises(Disconnected): self.store.upsert('test', 'id', {'synthetic': True})
        with self.assertRaises(Disconnected): self.store.delete_by_parent('test', 'id')
        self.assertEqual(len(connections), 1)
    def test_new_store_recovers_after_process_reinitialization(self):
        connections[0].closed = True
        replacement = storage.PostgresRecordStore(Settings())
        self.assertEqual(replacement.get('test', 'id'), {'synthetic': True})
        self.assertEqual(len(connections), 2)

if __name__ == '__main__': unittest.main(verbosity=2)
