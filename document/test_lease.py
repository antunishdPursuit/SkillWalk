import json, unittest
from types import SimpleNamespace
from lease import HostLease
class LeaseTests(unittest.TestCase):
    def setUp(self):
        self.now=0
        self.wall=100000
        self.lease=HostLease(clock=lambda:self.now,wall=lambda:self.wall)
    def path(self,raw):return SimpleNamespace(read_text=lambda:raw)
    def test_recent_and_expired_valid_lease(self):
        self.assertFalse(self.lease.expired(self.path('{"at":100000}')))
        self.wall=121000
        self.assertTrue(self.lease.expired(self.path('{"at":100000}')))
    def test_closed_lease(self):
        self.assertTrue(self.lease.expired(self.path('{"at":100000,"closed":true}')))
    def test_malformed_shapes_do_not_renew(self):
        for raw in [json.dumps({'at':10**400}),'[]','null','"text"','{}','{"at":"bad"}','{"at":true}','{"at":100000,"closed":1}','{"at":NaN}','{"at":Infinity}','{"at":-Infinity}','{"at":99999999999999}','{']:
            with self.subTest(raw=raw):
                self.now=0;lease=HostLease(clock=lambda:self.now,wall=lambda:self.wall)
                self.assertFalse(lease.expired(self.path(raw)))
                self.now=19;self.assertFalse(lease.expired(self.path(raw)))
                self.now=21;self.assertTrue(lease.expired(self.path(raw)))
    def test_missing_file_expires(self):
        def missing():raise FileNotFoundError()
        path=SimpleNamespace(read_text=missing)
        self.now=21;self.assertTrue(self.lease.expired(path))
if __name__=="__main__":unittest.main()
