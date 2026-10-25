"""Fixed-target transport for one isolated local app."""
import ipaddress, os, selectors, socket, socketserver, threading, time
from lease import HostLease
from pathlib import Path
TARGET=os.environ["DOCUMENT_TARGET"]
if not ipaddress.ip_address(TARGET).is_private or ipaddress.ip_address(TARGET).is_loopback:
    raise ValueError("Expected the isolated app's private container IP")
LIMIT=threading.BoundedSemaphore(16)
def lease_watch():
    lease=HostLease()
    while not lease.expired(Path("/heartbeat.json")):
        time.sleep(1)
    os._exit(0)
threading.Thread(target=lease_watch,daemon=True).start()
class Handler(socketserver.BaseRequestHandler):
    def handle(self):
        if not LIMIT.acquire(blocking=False):return
        try:
            with socket.create_connection((TARGET,8501),timeout=10) as upstream:
                self.request.setblocking(False);upstream.setblocking(False)
                selector=selectors.DefaultSelector()
                selector.register(self.request,selectors.EVENT_READ,upstream);selector.register(upstream,selectors.EVENT_READ,self.request)
                deadline=time.monotonic()+3600
                try:
                    while time.monotonic()<deadline:
                        for key,_ in selector.select(1):
                            data=key.fileobj.recv(65536)
                            if not data:return
                            key.data.setblocking(True);key.data.settimeout(10);key.data.sendall(data);key.data.setblocking(False)
                finally:selector.close()
        except (OSError,ConnectionError):pass
        finally:LIMIT.release()
class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address=True
    daemon_threads=True
with Server(("0.0.0.0",8501),Handler) as server:server.serve_forever()
