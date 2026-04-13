#!/usr/bin/env python3
"""Simple HTTP server for benchmark webapp."""

import http.server
import socketserver
import os
from pathlib import Path

PORT = 3003
DIRECTORY = Path(__file__).parent

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP request handler with CORS support."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)
    
    def end_headers(self):
        """Add CORS headers to all responses."""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
    
    def do_OPTIONS(self):
        """Handle OPTIONS requests for CORS preflight."""
        self.send_response(200)
        self.end_headers()
    
    def log_message(self, format, *args):
        """Custom log format."""
        print(f"[Benchmark Server] {format % args}")


def main():
    """Start the benchmark webapp server."""
    os.chdir(DIRECTORY)
    
    with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
        print("=" * 60)
        print("Resume Parser Benchmark Webapp")
        print("=" * 60)
        print(f"\n✅ Server running at: http://localhost:{PORT}")
        print(f"✅ Open in browser: http://localhost:{PORT}/index.html")
        print(f"\n⚠️  Make sure resume_service is running on port 8000:")
        print(f"   cd resume_service")
        print(f"   uvicorn main:app --reload --port 8000")
        print(f"\nPress Ctrl+C to stop\n")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n✅ Server stopped")


if __name__ == "__main__":
    main()
