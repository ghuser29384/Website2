import unittest
from unittest.mock import patch
import synthetic_start as s

class GuardTests(unittest.TestCase):
    def setUp(self):
        self.host='ep-fixture.us-east-1.aws.neon.tech'
        self.env={'DATABASE_URL':f'postgresql://fixture:synthetic@{self.host}/render_reconnect_synthetic?sslmode=verify-full'}
    def test_valid(self): s.validate(self.env,self.host)
    def test_unbound(self):
        with self.assertRaises(ValueError): s.validate(self.env,None)
    def test_wrong_destination(self):
        for old,new in ((self.host,'production.example'),('render_reconnect_synthetic','production'),('verify-full','require')):
            with self.subTest(new=new),self.assertRaises(ValueError):
                s.validate({'DATABASE_URL':self.env['DATABASE_URL'].replace(old,new)},self.host)
    def test_flags_and_keys(self):
        for key in s.LIVE_FLAGS+s.LIVE_KEYS:
            with self.subTest(key=key),self.assertRaises(ValueError): s.validate(dict(self.env,**{key:'true'}),self.host)
    def test_overrides(self):
        for suffix in ('&host=production.example','&sslmode=disable','&channel_binding=disable'):
            with self.subTest(suffix=suffix),self.assertRaises(ValueError):
                s.validate({'DATABASE_URL':self.env['DATABASE_URL']+suffix},self.host)
    def test_provider(self):
        with self.assertRaises(ValueError): s.validate(dict(self.env,X_PROVIDER='live'),self.host)
    def test_before_app_import(self):
        with patch.dict(s.os.environ,{},clear=True),patch.dict(s.sys.modules):
            with self.assertRaises(ValueError): s.main()
            self.assertNotIn('app.main',s.sys.modules)

if __name__=='__main__': unittest.main()
