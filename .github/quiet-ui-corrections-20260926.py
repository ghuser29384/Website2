from pathlib import Path

source = Path(__file__).with_name('quiet-ui-20260926.py').read_text()
source = source.replace("re.compile(re.escape(selector) + r'\\s*\\{([^{}]*)\\}')", "re.compile(r'(?m)^[ \\t]*' + re.escape(selector) + r'\\s*\\{([^{}]*)\\}')")
source = source.replace('changed = set()', 'changed = set()\nerrors = []')
source = source.replace('    new = transform(old)\n    assert new != old, f\'No change in {path}\'\n', '''    try:
        new = transform(old)
        assert new != old, f'No change in {path}'
    except (AssertionError, ValueError) as error:
        errors.append((path, str(error)))
        print('PREFLIGHT_ERROR', path, repr(error))
        return
''')
source = source.replace("Path('/tmp/quiet-ui-files.txt').write_text", "assert not errors, errors\nPath('/tmp/quiet-ui-files.txt').write_text")
exec(compile(source, 'quiet-ui-reviewed-transform', 'exec'))
