"""Exercise the distributable from a relocated folder; no user scan data."""
import hashlib
from html.parser import HTMLParser
import http.server
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import threading
import urllib.error
import urllib.request

SOURCE = Path(__file__).resolve().parents[1]
HTTP = urllib.request.build_opener(urllib.request.ProxyHandler({}))


class ResourceAudit(HTMLParser):
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for name in ("src", "href", "action"):
            value = attrs.get(name, "")
            assert not value.startswith(("http:", "https:", "//")), (tag, name, value)


with tempfile.TemporaryDirectory(prefix="claude skill 空格 ") as tmp:
    moved = Path(tmp) / "另一台电脑" / "claude-local-check"
    shutil.copytree(SOURCE, moved, ignore=shutil.ignore_patterns(
        "web", ".git", "dist", "__pycache__", ".DS_Store"))
    script = moved / "scripts/local_check.py"
    dummy = http.server.HTTPServer(("127.0.0.1", 0), http.server.BaseHTTPRequestHandler)
    thread = threading.Thread(target=dummy.serve_forever, daemon=True)
    thread.start()

    def command(*args, good=True):
        result = subprocess.run([sys.executable, str(script), *args],
                                capture_output=True, text=True, timeout=20)
        assert (result.returncode == 0) == good, result.stderr + result.stdout
        return json.loads(result.stdout)

    try:
        first = command("start", "--port", str(dummy.server_port))
        assert first["status"] == "running"
        assert ":%d/" % dummy.server_port not in first["url"], "port conflict was not handled"
        second = command("start")
        assert second["pid"] == first["pid"] and second["reused"], "start must be idempotent"
        assert command("status")["status"] == "running"
        origin = first["url"][:-4]
        with HTTP.open(first["url"]) as response:
            page = response.read().decode()
            assert response.headers["Content-Security-Policy"].find("connect-src 'self'") >= 0
            assert "本地独立版" in page and 'id="retest"' in page
        audit = ResourceAudit()
        audit.feed(page)
        assert "googletagmanager.com" not in page and "googlesyndication.com" not in page
        package = json.loads((moved / "assets/manifest.json").read_text())
        for name, digest in package["files"].items():
            with HTTP.open(origin + "/" + name) as response:
                assert hashlib.sha256(response.read()).hexdigest() == digest, name
        for route, method, headers, expected in [
            ("/__local/stop", "POST", {}, 403),
            ("/__local/health", "GET", {}, 403),
            ("/scripts/local_check.py", "GET", {}, 404),
            ("/%2e%2e/LICENSE", "GET", {}, 404),
            ("/_astro/", "GET", {}, 404),
            ("/zh/", "GET", {"Host": "example.com"}, 403),
        ]:
            try:
                HTTP.open(urllib.request.Request(origin + route, method=method, headers=headers))
                raise AssertionError("unexpectedly served " + route)
            except urllib.error.HTTPError as error:
                assert error.code == expected, (route, error.code)
        assert command("stop")["status"] == "stopped"
        assert command("status")["status"] == "stopped"
        page_file = moved / "assets/site/zh/index.html"
        saved = page_file.read_bytes()
        page_file.write_bytes(saved + b"\nmodified")
        rejected = command("start", good=False)
        assert rejected["status"] == "error" and "verification" in rejected["error"]
        page_file.write_bytes(saved)
        assert command("start", "--port", "0")["status"] == "running"
        assert command("stop")["status"] == "stopped"
        print("PASS: relocated path, occupied port, start/reuse/status/stop/restart, "
              "all asset HTTP hashes, local-only page URLs, file boundaries, "
              "Host validation, shutdown authorization, tamper rejection")
    finally:
        command("stop")
        dummy.shutdown()
        dummy.server_close()
