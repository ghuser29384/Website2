"""Offline synthetic ZIP integrity inspection and optional verified extraction; never prints contents."""
import hashlib, json, pathlib, stat, sys, zipfile

def inspect_archive(archive, inventory, destination=None):
    expected = {r['path']: r['sha256'] for r in inventory}
    if len(expected) != len(inventory) or not expected:
        raise ValueError('Invalid expected inventory')
    with zipfile.ZipFile(archive) as z:
        files = [i for i in z.infolist() if not i.is_dir()]
        if len(files) > 50000 or sum(i.file_size for i in files) > 250*1024*1024:
            raise ValueError('Archive size bound exceeded')
        seen=set(); hashes={}
        for i in files:
            p=pathlib.PurePosixPath(i.filename)
            if p.is_absolute() or any(part in ('', '.', '..') for part in i.filename.split('/')) or '\\' in i.filename or i.filename in seen or stat.S_ISLNK(i.external_attr >> 16):
                raise ValueError('Unsafe archive entry')
            seen.add(i.filename)
            if any(s.startswith('.env') or s in ('.git','.aws','private-tmp') for s in p.parts):
                raise ValueError('Private archive path')
            h=hashlib.sha256(); count=0
            with z.open(i) as f:
                while chunk:=f.read(65536):
                    count+=len(chunk)
                    if count>i.file_size: raise ValueError('Archive size mismatch')
                    h.update(chunk)
            hashes[i.filename]=h.hexdigest()
        anchor='compiled-entry.mjs'
        roots=[n[:-len(anchor)] for n in hashes if n==anchor or n.endswith('/'+anchor)]
        if len(roots)!=1 or anchor not in expected:
            raise ValueError('Missing or ambiguous runtime root')
        prefix=roots[0]
        matched=set()
        for path, digest in expected.items():
            name=prefix+path
            if hashes.get(name)!=digest:
                raise ValueError('Runtime artifact '+('missing' if name not in hashes else 'changed')+': '+json.dumps(path[:180]))
            matched.add(name)
        for name in seen-matched:
            if pathlib.PurePosixPath(name).suffix.lower() in ('.sql','.dump','.pem','.key','.p12','.pfx','.dmg','.sparseimage'):
                raise ValueError('Unreviewed private archive material')
        for name in seen:
            if any(str(parent) in seen for parent in pathlib.PurePosixPath(name).parents):
                raise ValueError('Archive file-directory collision')
        if destination is not None:
            destination=pathlib.Path(destination)
            destination.mkdir(mode=0o700,exist_ok=False)
            for i in files:
                target=destination.joinpath(*pathlib.PurePosixPath(i.filename).parts)
                target.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
                h=hashlib.sha256()
                with z.open(i) as source, target.open('xb') as output:
                    while chunk:=source.read(65536):
                        h.update(chunk);output.write(chunk)
                target.chmod(0o600)
                if h.hexdigest()!=hashes[i.filename]:
                    raise ValueError('Archive changed during extraction')
        return {'runtimeRoot':prefix, 'extracted':destination is not None, 'files':len(files),'verifiedRuntimeFiles':len(matched),'uncompressedBytes':sum(i.file_size for i in files),'integrityVerified':True}
if __name__=='__main__':
    try:
        print(json.dumps(inspect_archive(sys.argv[1],json.loads(pathlib.Path(sys.argv[2]).read_text()),sys.argv[3] if len(sys.argv)==4 else None)))
    except Exception as e:
        print('Archive verification failed: '+str(e)[:150],file=sys.stderr);sys.exit(1)
