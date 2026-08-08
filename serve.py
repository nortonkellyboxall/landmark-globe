#!/usr/bin/env python3
"""Dev server: bind LAN + never cache HTML/JS/CSS (module imports have no ?v=)."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = 8000
HOST = "0.0.0.0"


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        path = self.path.split("?", 1)[0]
        if path.endswith((".html", ".js", ".css", ".mjs", "")) or path == "/":
            self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()


if __name__ == "__main__":
    httpd = ThreadingHTTPServer((HOST, PORT), NoCacheHandler)
    print(f"Serving on http://0.0.0.0:{PORT} (no-cache for html/js/css)")
    print("On other devices use this Mac's LAN IP, e.g. http://192.168.x.x:8000")
    httpd.serve_forever()
