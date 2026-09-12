import http.client
import importlib.util
import threading
import unittest
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("serve", REPO / "serve.py")
serve = importlib.util.module_from_spec(spec)
spec.loader.exec_module(serve)


class PathBlocked(unittest.TestCase):
    def test_git(self):
        self.assertTrue(serve.path_is_blocked("/.git/config"))
        self.assertTrue(serve.path_is_blocked("/.git"))
        self.assertTrue(serve.path_is_blocked("/.git/config?x=1"))

    def test_scratch_cursor(self):
        self.assertTrue(serve.path_is_blocked("/.scratch/x"))
        self.assertTrue(serve.path_is_blocked("/.cursor/rules/x"))

    def test_app_ok(self):
        self.assertFalse(serve.path_is_blocked("/index.html"))
        self.assertFalse(serve.path_is_blocked("/boot.js"))
        self.assertFalse(serve.path_is_blocked("/vendor/tts/clips/eiffel.name.mp3"))


class QuietHandler(serve.NoCacheHandler):
    def log_message(self, fmt, *args):
        pass


class LivePaths(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = partial(QuietHandler, directory=str(REPO))
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        cls.port = cls.httpd.server_address[1]
        cls.thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def status(self, method, path):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=2)
        try:
            conn.request(method, path)
            res = conn.getresponse()
            res.read()
            return res.status
        finally:
            conn.close()

    def test_blocked_http(self):
        self.assertEqual(self.status("GET", "/.git/config"), 403)
        self.assertEqual(self.status("HEAD", "/.git"), 403)
        self.assertEqual(self.status("GET", "/.scratch/find-quiz/spec.md"), 403)
        self.assertEqual(self.status("GET", "/.cursor/skills/"), 403)
        self.assertEqual(self.status("GET", "/.git/config?x=1"), 403)

    def test_allowed_http(self):
        self.assertEqual(self.status("GET", "/index.html"), 200)


if __name__ == "__main__":
    unittest.main()
