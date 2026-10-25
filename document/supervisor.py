"""Keep the isolated app bounded to its local owning host."""
from pathlib import Path
import signal, subprocess, time
from lease import HostLease
lease=HostLease()
path=Path("/heartbeat.json")
stopping=False
def stop(*args):
    global stopping
    stopping=True
signal.signal(signal.SIGTERM,stop)
signal.signal(signal.SIGINT,stop)
child=subprocess.Popen(["python","/input/entry.py"])
try:
    while not stopping and child.poll() is None and not lease.expired(path):
        time.sleep(1)
finally:
    if child.poll() is None:
        child.terminate()
        try:child.wait(timeout=3)
        except subprocess.TimeoutExpired:child.kill()
