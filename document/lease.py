"""Shared validation for the app and relay's read-only host heartbeat."""
import json, math, time
class HostLease:
    def __init__(self,ttl=20,clock=time.monotonic,wall=lambda:time.time()*1000):
        self.ttl=ttl
        self.clock=clock
        self.wall=wall
        self.last_valid=clock()
    def expired(self,path):
        try:
            state=json.loads(path.read_text())
            if not isinstance(state,dict):raise ValueError("Invalid heartbeat object")
            at=state.get("at")
            if type(at) not in (int,float) or not math.isfinite(at):raise ValueError("Invalid heartbeat timestamp")
            if "closed" in state and type(state["closed"]) is not bool:raise ValueError("Invalid heartbeat state")
            if at<0 or at>self.wall()+5000:raise ValueError("Heartbeat clock out of range")
            self.last_valid=self.clock()
            return state.get("closed",False) or self.wall()-at>self.ttl*1000
        except (OSError,UnicodeError,ValueError,TypeError,OverflowError,AttributeError,KeyError):
            return self.clock()-self.last_valid>self.ttl
