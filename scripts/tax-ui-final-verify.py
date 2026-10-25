#!/usr/bin/env python3
"""Final synthetic-only checks, source freeze evidence, and server cleanup."""
import datetime as dt
import hashlib
import json
import os
import socket
from pathlib import Path
import subprocess
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SCRATCH = (Path.home() / '.hermes/cache/scratch').resolve()
ART = ROOT / 'artifacts'
STAMP = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
RUN = SCRATCH / ('tax-verified-' + STAMP)
RUN.mkdir(exist_ok=False)

def now():
    return dt.datetime.now().astimezone().isoformat(timespec='microseconds')

def source_text_allowed(rel):
    p = Path(rel)
    parts = [part.lower() for part in p.parts]
    forbidden = ('backup', '.bak', '.db', 'sqlite', 'finance', 'financial', 'database', '.wal', '.shm', '-wal', '-shm')
    if p.is_absolute() or '..' in parts or any(any(token in part for token in forbidden) for part in parts):
        return False
    if len(parts) == 1:
        return p.name in {'package.json', 'pnpm-lock.yaml', 'tsconfig.json', 'next-env.d.ts', '.eslintrc.json'} or (
            p.suffix in {'.ts', '.mts', '.js', '.mjs', '.cjs'} and '.config.' in p.name)
    return parts[0] in {'src', 'scripts', 'tests', 'migrations'} and p.suffix in {'.ts', '.tsx', '.mts', '.js', '.mjs', '.cjs', '.css', '.py', '.sql', '.json', '.yaml', '.yml'}

def manifest():
    paths = set(subprocess.check_output(['git', 'ls-files'], cwd=ROOT, text=True).splitlines())
    for folder in ['src', 'scripts', 'tests', 'migrations']:
        paths.update(str(p.relative_to(ROOT)) for p in (ROOT / folder).rglob('*') if p.is_file())
    paths.update(p.name for p in ROOT.iterdir() if p.is_file() and p.suffix in ['.ts', '.mts', '.json', '.js', '.mjs', '.cjs'])
    rows = []
    for rel in sorted(paths):
        if not source_text_allowed(rel):
            continue
        p = ROOT / rel
        if p.is_symlink() or not p.is_file() or p.resolve() != p.absolute():
            continue
        rows.append({'path': rel, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'mtime_ns': p.stat().st_mtime_ns,
                     'modified_at': dt.datetime.fromtimestamp(p.stat().st_mtime, dt.timezone.utc).isoformat(timespec='microseconds')})
    digest = hashlib.sha256(''.join(r['path'] + '\0' + r['sha256'] + '\n' for r in rows).encode()).hexdigest()
    return {'hash': digest, 'latest_modified_at': max(rows, key=lambda r: r['mtime_ns'])['modified_at'], 'files': rows}

def guarded(file):
    assert file.parent.resolve() == RUN and RUN.parent == SCRATCH and not file.is_symlink()
    assert not any(x in str(file).lower() for x in ['finance.db', 'test.db', 'production', 'development'])
    return str(file)

ENV = dict(os.environ, UNAHOUSE_TEST_BASE_URL='http://127.0.0.1:3247', UNAHOUSE_DB_PATH=guarded(RUN / 'synthetic.sqlite'), UNAHOUSE_ACCESS_KEY_BASE64='synthetic-tax-local-only', AI_BASE_URL='http://127.0.0.1:1', AI_API_KEY='synthetic-disabled')
records = []
servers = []
before = manifest()
(ART / ('uf-tax-manifest-' + STAMP + '.json')).write_text(json.dumps({'created_at': now(), 'scope': 'source, tests, scripts, migration SQL and root configs; excludes docs/artifacts/generated build/dependencies', 'before': before}, indent=2))

def check(name, args, env=ENV):
    initial = manifest()
    record = {'name': name, 'command': args, 'started_at': now(), 'manifest_before': initial['hash']}
    log = ART / ('final-' + STAMP + '-' + name + '.log')
    with log.open('w') as output:
        result = subprocess.run(args, cwd=ROOT, env=env, stdout=output, stderr=subprocess.STDOUT)
    final = manifest()
    record.update(ended_at=now(), exit=result.returncode, manifest_after=final['hash'], source_unchanged=initial['files'] == final['files'], log=str(log))
    records.append(record)
    print(json.dumps(record), flush=True)
    if result.returncode or initial['files'] != final['files']:
        raise RuntimeError('Check failed or source changed: ' + name)
    return result.returncode

def start(port, env):
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', port))
    assert env['UNAHOUSE_TEST_BASE_URL'] == 'http://127.0.0.1:' + str(port)
    log = (ART / ('final-' + STAMP + '-server-' + str(port) + '.log')).open('w')
    proc = subprocess.Popen(['node_modules/.bin/next', 'start', '-p', str(port), '-H', '127.0.0.1'], cwd=ROOT, env=env, stdout=log, stderr=log)
    servers.append((proc, log))
    for _ in range(60):
        if proc.poll() is not None:
            raise RuntimeError('Server exited: ' + str(port))
        try:
            urllib.request.urlopen('http://127.0.0.1:' + str(port) + '/unlock', timeout=1)
            return
        except Exception:
            time.sleep(.5)
    raise RuntimeError('Server not ready')

try:
    (ART / ('ports-before-' + STAMP + '.log')).write_text(subprocess.check_output(['lsof', '-nP', '-iTCP', '-sTCP:LISTEN'], text=True))
    for port in [3247, 3248, 3249, 3250]:
        with socket.socket() as probe:
            probe.bind(('127.0.0.1', port))
    check('verifier-regression', ['python3', 'scripts/test-tax-ui-verifier.py'])
    check('dashboard-regression', ['node_modules/.bin/tsx', 'scripts/test-tax-dashboard.ts'])
    check('display-regression', ['node_modules/.bin/tsx', 'scripts/test-tax-display.ts'])
    check('python-tax-tests', ['python3', '-m', 'unittest', 'discover', '-s', 'tests/tax', '-p', 'test_*.py'])
    check('port-regression', ['python3', 'scripts/test-isolated-ports.py'])
    check('diff-check', ['git', 'diff', '--check'])
    if check('synthetic-init', ['node_modules/.bin/tsx', 'scripts/tax-synthetic-init.ts']):
        raise RuntimeError('Synthetic seed failed')
    check('typecheck', ['node_modules/.bin/tsc', '--noEmit'])
    if check('build', ['node_modules/.bin/next', 'build']):
        raise RuntimeError('Build failed')
    check('tax-tests', ['node_modules/.bin/vitest', 'run', '-c', 'vitest.tax.config.ts'])
    start(3247, ENV)
    check('ui-responsive', ['node_modules/.bin/tsx', 'scripts/tax-ui-check.mts', 'after'])
    check('browser', ['node_modules/.bin/tsx', 'scripts/tax-browser-check.mts'])
    api_env = dict(ENV, UNAHOUSE_TEST_BASE_URL='http://127.0.0.1:3248', UNAHOUSE_DB_PATH=guarded(RUN / 'synthetic-api.sqlite'), UNAHOUSE_ACCESS_KEY_BASE64='test-key-base64')
    if check('api-init', ['node_modules/.bin/tsx', 'scripts/tax-synthetic-init.ts'], api_env) == 0:
        start(3248, api_env)
        check('existing-api', ['node_modules/.bin/vitest', 'run', '-c', 'vitest.tax-safe-api.config.ts'], api_env)
    layout_env = dict(ENV, UNAHOUSE_TEST_BASE_URL='http://127.0.0.1:3249', UNAHOUSE_DB_PATH=guarded(RUN / 'synthetic-layout.sqlite'), UNAHOUSE_ACCESS_KEY_BASE64='layout-test-key')
    if check('layout-init', ['node_modules/.bin/tsx', 'scripts/tax-synthetic-init.ts'], layout_env) == 0:
        start(3249, layout_env)
        check('existing-layout', ['node_modules/.bin/playwright', 'test', '-c', 'playwright.tax-safe-layout.config.ts'], layout_env)
    journey_env = dict(ENV, UNAHOUSE_TEST_BASE_URL='http://127.0.0.1:3250', UNAHOUSE_DB_PATH=guarded(RUN / 'synthetic-journeys.sqlite'), UNAHOUSE_ACCESS_KEY_BASE64='test-key-base64')
    if check('journey-init', ['node_modules/.bin/tsx', 'scripts/tax-synthetic-init.ts'], journey_env) == 0:
        start(3250, journey_env)
        check('existing-journeys', ['node_modules/.bin/playwright', 'test', '-c', 'playwright.tax-safe-journeys.config.ts'], journey_env)
except Exception as error:
    records.append({'error': str(error), 'at': now()})
    raise
finally:
    for proc, log in servers:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
        log.close()
    after = manifest()
    evidence = {'started_source_last_modified': before['latest_modified_at'], 'finished_at': now(), 'manifest_before': before['hash'], 'manifest_after': after['hash'], 'source_and_mtimes_unchanged': before['files'] == after['files'], 'checks': records, 'synthetic_directory': str(RUN), 'servers_stopped': all(p.poll() is not None for p, _ in servers), 'limitations': ['Layout and e2e each use their sole default Chromium project; no project filtering or skipped assertions.', 'No separate tests/db directory in this base; actual DB/dashboard regression included in tax suite.', 'Screenshots captured; visual inspection delegated separately, not claimed by DOM checks.']}
    (ART / ('verification-' + STAMP + '.json')).write_text(json.dumps(evidence, indent=2))
    (ART / ('ports-after-' + STAMP + '.log')).write_text(subprocess.check_output(['lsof', '-nP', '-iTCP', '-sTCP:LISTEN'], text=True))
    (ART / ('uf-tax-manifest-' + STAMP + '.json')).write_text(json.dumps({'created_at': now(), 'before': before, 'after': after}, indent=2))
    print('FINAL_EVIDENCE ' + str(ART / ('verification-' + STAMP + '.json')), flush=True)
