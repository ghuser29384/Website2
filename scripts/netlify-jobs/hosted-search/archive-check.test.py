import hashlib, importlib.util, pathlib, tempfile, unittest, zipfile
spec=importlib.util.spec_from_file_location('check',pathlib.Path(__file__).with_name('archive-check.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ArchiveTests(unittest.TestCase):
 def archive(self,files):
  root=pathlib.Path(tempfile.mkdtemp(prefix='synthetic-archive-check-'));p=root/'test.zip'
  with zipfile.ZipFile(p,'w') as z:
   for name,content in files:z.writestr(name,content)
  return p
 def test_nested_same_basename(self):
  content=b'fixture';digest=hashlib.sha256(content).hexdigest();paths=['compiled-entry.mjs','package.json','node_modules/example/package.json']
  expected=[{'path':p,'sha256':digest} for p in paths]
  result=m.inspect_archive(self.archive([('bundle/'+p,content) for p in paths]),expected)
  self.assertEqual(result['verifiedRuntimeFiles'],3)
 def test_integrity(self):
  expected=[{'path':'compiled-entry.mjs','sha256':hashlib.sha256(b'fixture').hexdigest()}]
  self.assertTrue(m.inspect_archive(self.archive([('bundle/compiled-entry.mjs',b'fixture')]),expected)['integrityVerified'])
  for files in [[('compiled-entry.mjs',b'changed')],[('other.mjs',b'fixture')],[('../compiled-entry.mjs',b'fixture')],[('compiled-entry.mjs',b'fixture'),('backup.sql',b'fixture')],[('compiled-entry.mjs',b'fixture'),('.env.local',b'fixture')]]:
   with self.assertRaises(ValueError):m.inspect_archive(self.archive(files),expected)
 def test_verified_extraction(self):
  content=b'fixture';paths=['compiled-entry.mjs','synthetic-search.mjs','.netlify/dist/build/routes.js']
  expected=[{'path':p,'sha256':hashlib.sha256(content).hexdigest()} for p in paths]
  archive=self.archive([('bundle/'+p,content) for p in paths]);destination=archive.parent/'extracted'
  result=m.inspect_archive(archive,expected,destination)
  self.assertTrue(result['extracted']);self.assertEqual(result['runtimeRoot'],'bundle/')
  for p in paths:self.assertEqual((destination/'bundle'/p).read_bytes(),content)
  with self.assertRaises(FileExistsError):m.inspect_archive(archive,expected,destination)
 def test_invalid_archive_never_creates_destination(self):
  expected=[{'path':'compiled-entry.mjs','sha256':hashlib.sha256(b'fixture').hexdigest()}]
  for extra in [('a/../escape',b'x'),('a//escape',b'x'),('./escape',b'x'),('compiled-entry.mjs/nested',b'x'),('.env',b'x')]:
   archive=self.archive([('compiled-entry.mjs',b'fixture'),extra]);destination=archive.parent/'extracted'
   with self.assertRaises(ValueError):m.inspect_archive(archive,expected,destination)
   self.assertFalse(destination.exists())
if __name__=='__main__':unittest.main()
