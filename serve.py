#!/usr/bin/env python3
"""Dev server: bind LAN + never cache HTML/JS/CSS (module imports have no ?v=)."""
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "8000"))
HOST = os.environ.get("HOST", "0.0.0.0")

BLOCKED_PREFIXES = ("/.git", "/.scratch", "/.cursor")


def path_is_blocked(url_path: str) -> bool:
    p = url_path.split("?", 1)[0]
    return any(p == prefix or p.startswith(prefix + "/") for prefix in BLOCKED_PREFIXES)


class NoCacheHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if path_is_blocked(self.path):
            self.send_error(403, "Forbidden")
            return
        super().do_GET()

    def do_HEAD(self):
        if path_is_blocked(self.path):
            self.send_error(403, "Forbidden")
            return
        super().do_HEAD()

    def end_headers(self):
        path = self.path.split("?", 1)[0]
        if path.endswith((".html", ".js", ".css", ".mjs", "")) or path == "/":
            self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


if __name__ == "__main__":
    httpd = ThreadingHTTPServer((HOST, PORT), NoCacheHandler)
    print(f"Serving on http://{HOST}:{PORT} (no-cache for html/js/css)")
    print("On other devices use this Mac's LAN IP, e.g. http://192.168.x.x:8000")
    httpd.serve_forever()
