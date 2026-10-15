import base64, importlib.util, json, os, tempfile, threading, unittest, urllib.request, urllib.error
from pathlib import Path
TMP=tempfile.TemporaryDirectory();os.environ['GALLERY_DATA']=TMP.name
spec=importlib.util.spec_from_file_location('gallery',Path(__file__).with_name('server.py'));gallery=importlib.util.module_from_spec(spec);spec.loader.exec_module(gallery)
class FlowTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=gallery.ThreadingHTTPServer(('127.0.0.1',0),gallery.Handler);cls.url='http://127.0.0.1:'+str(cls.server.server_port);threading.Thread(target=cls.server.serve_forever,daemon=True).start()
 @classmethod
 def tearDownClass(cls):cls.server.shutdown();cls.server.server_close();TMP.cleanup()
 def call(self,path,body=None,person='',admin=False):
  headers={'Content-Type':'application/json','X-Participant':person}
  if admin:headers['Authorization']='Bearer '+gallery.ADMIN
  req=urllib.request.Request(self.url+path,data=json.dumps(body).encode() if body is not None else None,headers=headers)
  try:
   with urllib.request.urlopen(req) as r:return r.status,json.loads(r.read())
  except urllib.error.HTTPError as e:return e.code,json.loads(e.read())
 def test_full_flow(self):
  token=self.call('/api/join',{})[1]['token'];other=self.call('/api/join',{})[1]['token']
  image='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII='
  ids=[self.call('/api/submit',{'title':'Работа '+str(i),'author':'Тест','image':image},token)[1]['id'] for i in range(4)]
  self.assertEqual(self.call('/api/state',person=other)[1]['works'],[])
  self.assertEqual(self.call('/api/image/'+ids[0])[0],404)
  self.assertEqual(self.call('/api/admin')[0],401)
  self.assertEqual(self.call('/api/admin/moderate',{'id':ids[0],'status':'approved'})[0],401)
  for ident in ids:self.assertEqual(self.call('/api/admin/moderate',{'id':ident,'status':'approved'},admin=True)[0],200)
  self.assertEqual(len(self.call('/api/state')[1]['works']),4)
  self.assertEqual(self.call('/api/vote',{'id':ids[0],'liked':True},token)[0],400)
  self.call('/api/admin/settings',{'phase':'voting'},admin=True)
  # Parallel requests must still allow only three votes.
  from concurrent.futures import ThreadPoolExecutor
  with ThreadPoolExecutor(4) as pool:results=list(pool.map(lambda i:self.call('/api/vote',{'id':i,'liked':True},token)[0],ids))
  self.assertEqual(sorted(results),[200,200,200,400]);votes=self.call('/api/state',person=token)[1]['votes'];self.assertEqual(len(votes),3)
  self.call('/api/vote',{'id':votes[0],'liked':False},token);self.assertEqual(len(self.call('/api/state',person=token)[1]['votes']),2)
  self.assertEqual(self.call('/api/vote',{'id':ids[0],'liked':True},other)[0],200)
  self.call('/api/admin/settings',{'phase':'words','liked':True,'words':True},admin=True)
  self.assertEqual(self.call('/api/vote',{'id':ids[0],'liked':False},other)[0],400)
  self.assertEqual(self.call('/api/words',{'id':ids[0],'text':'раз два три четыре'},other)[0],400)
  self.assertEqual(self.call('/api/words',{'id':ids[0],'text':'Цвет и ритм'},other)[0],200)
  self.assertEqual(self.call('/api/state')[1]['words'],[])
  word=self.call('/api/admin',admin=True)[1]['words'][0]
  self.assertEqual(self.call('/api/admin/moderate-word',{'id':word['id'],'status':'approved'})[0],401)
  self.call('/api/admin/moderate-word',{'id':word['id'],'status':'approved'},admin=True)
  self.assertEqual(self.call('/api/state')[1]['words'][0]['text'],'Цвет и ритм')
  self.assertEqual(self.call('/api/words',{'text':'Независимый ответ'},other)[0],200)
  self.assertEqual(len(self.call('/api/state')[1]['words']),1)
  self.call('/api/admin/moderate-word',{'id':word['id'],'status':'rejected'},admin=True)
  self.assertEqual(self.call('/api/state')[1]['words'],[])
  self.call('/api/admin/moderate-word',{'id':word['id'],'status':'approved'},admin=True)
  self.call('/api/admin/moderate',{'id':ids[0],'status':'rejected'},admin=True)
  self.assertFalse(any(w['id']==ids[0] for w in self.call('/api/state')[1]['works']))
  self.assertEqual(self.call('/api/state',person=other)[1]['votes'],[])
  self.assertEqual(len(self.call('/api/state')[1]['words']),1)
  self.assertEqual(self.call('/gallery-prototype/.local-data/admin-key')[0],404)
  self.assertEqual(self.call('/gallery-prototype/server.py')[0],404)
  self.assertEqual(self.call('/api/join',[])[0],400)
  request=urllib.request.Request(self.url+'/gallery-prototype/.local-data/admin-key',method='HEAD')
  with self.assertRaises(urllib.error.HTTPError) as denied:urllib.request.urlopen(request)
  self.assertEqual(denied.exception.code,405)
  with gallery.connect() as c:self.assertEqual(c.execute('SELECT COUNT(*) FROM works').fetchone()[0],4)
if __name__=='__main__':unittest.main()
