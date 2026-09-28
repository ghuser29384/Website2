from pathlib import Path

source = Path(__file__).with_name('apply.py').read_text()
before = '''if '  "/about",\\n' in s:
    edit(p, '  "/about",\\n', '')'''
after = '''edit(p, 'const publicEditorialRoutes = [\\n  "/about",\\n', 'const publicEditorialRoutes = [\\n')
edit(p, '  for (const route of [\\n    "/about",\\n', '  for (const route of [\\n    "/contact",\\n')'''
assert source.count(before) == 1
source = source.replace(before, after, 1)
# Keep desktop/mobile editorial geometry coverage; About now has separate HTTP redirect coverage.
Path('../evidence').mkdir(exist_ok=True)
Path('../evidence/resolved-apply.py').write_text(source)
exec(compile(source, 'resolved-apply.py', 'exec'), {'__name__': '__main__'})
