"""Execute preparation shell control flow with fake acquisition commands only."""
import os, pathlib, subprocess, tempfile, unittest
SCRIPT=pathlib.Path(__file__).with_name('prepare-edge-tools.sh')
class Preparation(unittest.TestCase):
 def run_case(self, checksum=True, version='2.4.2'):
  # Keep fixtures for inspection; no user files or caches are deleted.
  root=pathlib.Path(tempfile.mkdtemp(prefix='netlify-tooling-mock-'))
  bin=root/'mock-bin'; bin.mkdir()
  log=root/'commands'
  def command(name, body):
   p=bin/name;p.write_text('#!/bin/bash\n'+body+'\n');p.chmod(0o700)
  command('uname', 'case "$1" in -s) echo Linux;; -m) echo x86_64;; esac')
  command('curl', 'echo curl >> "$TEST_LOG"; while test "$#" -gt 0; do if test "$1" = -o; then shift; : > "$1"; fi; shift; done')
  command('sha256sum', 'cat >/dev/null; exit '+('0' if checksum else '1'))
  fake='#!/bin/bash\nif test "$1" = --version; then printf "deno '+version+' (stable, release, x86_64-unknown-linux-gnu)\\nv8 synthetic\\ntypescript synthetic\\n"; else printf "%s|%s|%s\\n" "$HOME" "$DENO_DIR" "$*" >> "'+str(log)+'"; fi\n'
  command('unzip', 'echo unzip >> "$TEST_LOG"; mkdir -p "$ROOT/edge-tools/bin"; cp "$FAKE_DENO" "$ROOT/edge-tools/bin/deno"; chmod 700 "$ROOT/edge-tools/bin/deno"')
  f=root/'fake-deno';f.write_text(fake)
  env={**os.environ,'PATH':str(bin)+':/usr/bin:/bin','ROOT':str(root/'task'),'GITHUB_ACTIONS':'true','TEST_LOG':str(log),'FAKE_DENO':str(f)}
  result=subprocess.run(['bash',str(SCRIPT)],env=env,capture_output=True,text=True)
  return result,log.read_text() if log.exists() else '',root
 def test_complete_handoff(self):
  r,log,root=self.run_case();self.assertEqual(r.returncode,0,r.stderr)
  for version in ['3-2-0','2-16-0']:
   self.assertIn('https://v'+version+'--edge.netlify.com/bootstrap/index-combined.ts',log)
  self.assertEqual(log.count(str(root/'task/home')+'|'+str(root/'task/home/deno-cache')),2)
 def test_bad_checksum_stops_before_extract(self):
  r,log,_=self.run_case(checksum=False);self.assertNotEqual(r.returncode,0);self.assertNotIn('unzip',log)
 def test_wrong_version_stops_before_cache(self):
  r,log,_=self.run_case(version='2.4.3');self.assertNotEqual(r.returncode,0);self.assertNotIn('cache --',log)
if __name__=='__main__':unittest.main()
