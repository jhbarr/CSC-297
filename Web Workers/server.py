from http.server import HTTPServer, SimpleHTTPRequestHandler

class COOPHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Cross-origin isolation headers (needed for SharedArrayBuffer)
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

HTTPServer(("localhost", 8000), COOPHandler).serve_forever()
