"""Verify published commercial archives and preserved MIT boundaries without executing them."""
from pathlib import Path
import hashlib
from datetime import datetime, timezone
import io
import json
import tarfile
import urllib.request
import urllib.error

root = Path(__file__).resolve().parent.parent
policy = json.loads((root / 'licensing.json').read_text())
canonical = (root / 'LICENSE').read_bytes()
proof = []


def request(url):
    try:
        return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'FluriReleaseAudit/1.0'}), timeout=30)
    except urllib.error.HTTPError as error:
        raise SystemExit(f'Verification incomplete: {url} returned HTTP {error.code}.') from None


def archive(name, version):
    short = name.split('/')[1]
    url = f'https://registry.npmjs.org/{name}/-/{short}-{version}.tgz'
    with request(url) as response:
        data = response.read(20_000_001)
    if len(data) > 20_000_000:
        raise ValueError('Archive exceeds the verification budget')
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as tar:
        return {m.name.removeprefix('package/'): tar.extractfile(m).read() for m in tar if m.isfile()}


for name, boundary in policy['packages'].items():
    old_version, version = boundary['lastMIT'], boundary['firstCommercial']
    old, new = archive(name, old_version), archive(name, version)
    manifest = json.loads(new['package.json'])
    assert manifest['version'] == version
    assert manifest['license'] == policy['license']
    assert manifest['homepage'] == 'https://fluri.xyz/'
    assert new['LICENSE'] == canonical
    assert new['LICENSE-MIT-LEGACY'].startswith(b'Historical notice:')
    assert b'First commercial release' in new['LICENSING.md']
    assert json.loads(old['package.json'])['license'] == 'MIT'
    assert old['LICENSE'].startswith(b'MIT License')
    js = lambda files: {k: hashlib.sha256(v).hexdigest() for k, v in files.items() if k.startswith('dist/') and k.endswith('.js')}
    assert js(old) and js(old) == js(new), f'Unexpected runtime change in {name}'
    with request('https://registry.npmjs.org/' + name.replace('/', '%2f')) as response:
        registry = json.load(response)
    assert registry['dist-tags']['latest'] == version
    assert registry['versions'][version]['license'] == policy['license']
    proof.append({'package': name, 'commercialVersion': version, 'license': manifest['license'], 'lastMIT': old_version, 'legacyMITPreserved': True, 'runtimeUnchanged': True, 'homepage': manifest['homepage']})
    print(f'{name}@{version}: commercial archive, latest tag, legacy MIT and unchanged runtime verified', flush=True)

(root / 'docs').mkdir(exist_ok=True)
(root / 'docs/commercial-release-verification.json').write_text(json.dumps({'policyVersion': policy['version'], 'checkedAt': datetime.now(timezone.utc).isoformat(), 'releases': proof}, indent=2) + '\n')
