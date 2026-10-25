"""Loopback-only Ollama protocol adapter; host-side broker supplies actual inference."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json, time, uuid
DIRECTORY=Path("/bridge")
class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def do_GET(self): self.forward()
    def do_POST(self): self.forward()
    def forward(self):
        if self.path not in ["/api/generate","/api/chat","/api/embed","/api/embeddings","/api/show","/api/tags","/api/version"]:
            self.send_error(404); return
        size=int(self.headers.get("Content-Length","0"))
        if size>8_000_000: self.send_error(413); return
        try:
            body=json.loads(self.rfile.read(size)) if size else {}
            request_id=uuid.uuid4().hex
            target=DIRECTORY/(request_id+".request.json")
            temp=target.with_suffix(".tmp")
            temp.write_text(json.dumps({"method":self.command,"path":self.path,"body":body}))
            temp.replace(target)
            result=DIRECTORY/(request_id+".response.json")
            deadline=time.monotonic()+360
            while not result.exists():
                if time.monotonic()>deadline: raise TimeoutError("Local inference bridge timed out")
                time.sleep(.1)
            response=json.loads(result.read_text());result.unlink()
            payload=json.dumps(response["body"]).encode()
            if body.get("stream"):payload+=b"\n"
            self.send_response(response["status"])
            self.send_header("Content-Type","application/x-ndjson" if body.get("stream") else "application/json")
            self.send_header("Content-Length",str(len(payload)));self.end_headers();self.wfile.write(payload)
        except Exception as exc:
            payload=json.dumps({"error":str(exc)}).encode()
            self.send_response(502);self.send_header("Content-Type","application/json");self.end_headers();self.wfile.write(payload)
if __name__=="__main__":
    ThreadingHTTPServer(("127.0.0.1",11434),Handler).serve_forever()
