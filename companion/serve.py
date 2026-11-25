from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial
if __name__ == '__main__':
    print('Open http://localhost:8765/launcher.html in Chrome. Ctrl+C stops server.', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8765), partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).resolve().parent/'site'))).serve_forever()
