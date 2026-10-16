#!/usr/bin/env python3
"""Local workshop gallery. Run: python3 gallery-prototype/server.py"""
import argparse, base64, hmac, json, os, secrets, sqlite3, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse
ROOT = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get('GALLERY_DATA', str(Path(__file__).resolve().parent / '.local-data')))
DATA.mkdir(parents=True, exist_ok=True)
DB = DATA / 'gallery.sqlite3'
KEYFILE = DATA / 'admin-key'
if not KEYFILE.exists():
    KEYFILE.write_text(secrets.token_urlsafe(32)); KEYFILE.chmod(0o600)
ADMIN = KEYFILE.read_text().strip()
def connect():
    c = sqlite3.connect(DB, timeout=15); c.row_factory = sqlite3.Row
    c.execute('PRAGMA foreign_keys=ON'); return c
with connect() as c:
    c.executescript('''CREATE TABLE IF NOT EXISTS participants(token TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS works(id TEXT PRIMARY KEY, owner TEXT NOT NULL, title TEXT NOT NULL, author TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', image BLOB NOT NULL, mime TEXT NOT NULL, created REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS votes(person TEXT NOT NULL REFERENCES participants(token), work TEXT NOT NULL REFERENCES works(id), PRIMARY KEY(person,work));
    CREATE TABLE IF NOT EXISTS words(person TEXT NOT NULL REFERENCES participants(token),work TEXT NOT NULL REFERENCES works(id),text TEXT NOT NULL, PRIMARY KEY(person,work));
    CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY, phase TEXT, liked INTEGER, words INTEGER);
    INSERT OR IGNORE INTO settings VALUES(1,'upload',0,0);''')
    # Keep existing responses, removing their artwork association once.
    if 'work' in [r[1] for r in c.execute('PRAGMA table_info(words)')]:
        cols=[r[1] for r in c.execute('PRAGMA table_info(words)')]
        c.execute('ALTER TABLE words RENAME TO legacy_work_words')
        c.execute("CREATE TABLE words(id INTEGER PRIMARY KEY,person TEXT NOT NULL REFERENCES participants(token),text TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending')")
        status='status' if 'status' in cols else "'pending'"
        c.execute('INSERT INTO words(person,text,status) SELECT person,text,'+status+' FROM legacy_work_words')
        c.execute('DROP TABLE legacy_work_words')
class Error(Exception):
    def __init__(self, message, status=400): self.message,self.status=message,status
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT),**kw)
    def log_message(self,*args): pass
    def reply(self,data,status=200):
        raw=json.dumps(data,ensure_ascii=False).encode(); self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
    def admin(self): return hmac.compare_digest(self.headers.get('Authorization',''), 'Bearer '+ADMIN)
    def person(self,c):
        token=self.headers.get('X-Participant','')
        if not c.execute('SELECT 1 FROM participants WHERE token=?',(token,)).fetchone(): raise Error('Откройте галерею заново.',401)
        return token
    def do_HEAD(self):
        self.send_response(405);self.send_header('Content-Length','0');self.end_headers()
    def do_GET(self):
        path=urlparse(self.path).path
        try:
            if path.startswith('/api/'):
                with connect() as c:
                    if path=='/api/state':
                        person=self.headers.get('X-Participant',''); settings=dict(c.execute('SELECT phase,liked,words FROM settings').fetchone())
                        works=[dict(r) for r in c.execute("SELECT id,title,author,(SELECT COUNT(*) FROM votes v WHERE v.work=w.id) likes FROM works w WHERE status='approved' ORDER BY created")]
                        votes=[r[0] for r in c.execute('SELECT work FROM votes WHERE person=?',(person,))]
                        mine=[dict(r) for r in c.execute('SELECT id,title,status FROM works WHERE owner=? ORDER BY created DESC',(person,))]
                        words=[dict(r) for r in c.execute("SELECT id,text FROM words WHERE status='approved'")] if settings['words'] else []
                        return self.reply(dict(settings=settings,works=works,votes=votes,mine=mine,words=words))
                    if path=='/api/admin':
                        if not self.admin(): raise Error('Нужен ключ администратора.',401)
                        return self.reply(dict(works=[dict(r) for r in c.execute('SELECT id,title,author,status,(SELECT COUNT(*) FROM votes v WHERE v.work=w.id) likes FROM works w ORDER BY created DESC')],words=[dict(r) for r in c.execute('SELECT id,text,status FROM words ORDER BY id DESC')],participants=c.execute('SELECT COUNT(*) FROM participants').fetchone()[0]))
                    if path.startswith('/api/image/'):
                        row=c.execute('SELECT image,mime,status FROM works WHERE id=?',(path.split('/')[-1],)).fetchone()
                        if not row or (row['status']!='approved' and not self.admin()): raise Error('Изображение не найдено.',404)
                        self.send_response(200);self.send_header('Content-Type',row['mime']);self.send_header('X-Content-Type-Options','nosniff');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(row['image'])));self.end_headers();self.wfile.write(row['image']);return
                    raise Error('Не найдено.',404)
            # Serve only gallery UI and its fonts. Never serve database, source, or keys.
            if path in ('/','/gallery-prototype'): self.send_response(302);self.send_header('Location','/gallery-prototype/');self.end_headers();return
            resolved=(ROOT / path.lstrip('/')).resolve()
            allowed=(resolved==ROOT/'gallery-prototype' or (resolved.is_relative_to(ROOT/'gallery-prototype') and resolved.suffix in ('.html','.css','.js','.svg','.png','.jpg','.webp')) or (resolved.is_relative_to(ROOT/'fonts') and resolved.suffix in ('.woff','.woff2')))
            if not allowed or '.local-data' in resolved.parts: raise Error('Не найдено.',404)
            return super().do_GET()
        except Error as e:self.reply({'error':e.message},e.status)
    def do_POST(self):
        try:
            origin=self.headers.get('Origin')
            if origin and origin not in ('http://'+self.headers.get('Host',''),): raise Error('Недопустимый источник.',403)
            if self.headers.get_content_type()!='application/json': raise Error('Ожидается JSON.',415)
            size=int(self.headers.get('Content-Length','0'))
            if size>8_000_000: raise Error('Изображение слишком большое.',413)
            body=json.loads(self.rfile.read(size)); path=urlparse(self.path).path
            if not isinstance(body,dict):raise Error('Ожидается объект JSON.')
            with connect() as c:
                c.execute('BEGIN IMMEDIATE')
                if path=='/api/join':
                    token=secrets.token_urlsafe(24);c.execute('INSERT INTO participants VALUES(?)',(token,));return self.reply({'token':token})
                if path.startswith('/api/admin/'):
                    if not self.admin():raise Error('Неверный ключ администратора.',401)
                    if path=='/api/admin/moderate':
                        if body.get('status') not in ('approved','rejected','pending'):raise Error('Неизвестный статус.')
                        if not c.execute('SELECT 1 FROM works WHERE id=?',(body.get('id'),)).fetchone():raise Error('Работа не найдена.',404)
                        c.execute('UPDATE works SET status=? WHERE id=?',(body['status'],body['id']))
                        if body['status']!='approved':
                            c.execute('DELETE FROM votes WHERE work=?',(body['id'],))
                    elif path=='/api/admin/moderate-word':
                        if body.get('status') not in ('approved','rejected'):raise Error('Неизвестный статус.')
                        if not c.execute('SELECT 1 FROM words WHERE rowid=?',(body.get('id'),)).fetchone():raise Error('Ответ не найден.',404)
                        c.execute('UPDATE words SET status=? WHERE rowid=?',(body['status'],body['id']))
                    elif path=='/api/admin/settings':
                        if body.get('phase') not in ('upload','voting','words','results'):raise Error('Неизвестный этап.')
                        c.execute('UPDATE settings SET phase=?,liked=?,words=? WHERE id=1',(body['phase'],bool(body.get('liked')),bool(body.get('words'))))
                    else:raise Error('Не найдено.',404)
                    return self.reply({'ok':True})
                person=self.person(c); phase=c.execute('SELECT phase FROM settings').fetchone()[0]
                if path=='/api/submit':
                    if phase!='upload':raise Error('Приём работ завершён.')
                    title=str(body.get('title','Изображение')).strip();author=str(body.get('author','Участник')).strip()
                    if not 1<=len(title)<=80 or not 1<=len(author)<=60:raise Error('Укажите название и имя автора.')
                    try: raw=base64.b64decode(body.get('image',''),validate=True)
                    except Exception:raise Error('Не удалось прочитать изображение.')
                    if len(raw)>5_000_000 or len(raw)<12:raise Error('Размер изображения — до 5 МБ.')
                    mime='image/jpeg' if raw.startswith(b'\xff\xd8\xff') and raw.endswith(b'\xff\xd9') else 'image/png' if raw.startswith(b'\x89PNG\r\n\x1a\n') else None
                    if not mime:raise Error('Используйте PNG или JPEG.')
                    ident=secrets.token_hex(12);c.execute('INSERT INTO works VALUES(?,?,?,?,?,?,?,?)',(ident,person,title,author,'pending',raw,mime,time.time()));return self.reply({'id':ident})
                if path=='/api/words':
                    if phase!='words':raise Error('Сбор впечатлений сейчас закрыт.')
                    text=' '.join(str(body.get('text','')).split())
                    if not 1<=len(text)<=100:raise Error('Напишите от 1 до 100 символов.')
                    c.execute("INSERT INTO words(person,text,status) VALUES(?,?,'pending')",(person,text))
                    return self.reply({'ok':True})
                ident=body.get('id');work=c.execute("SELECT 1 FROM works WHERE id=? AND status='approved'",(ident,)).fetchone()
                if not work:raise Error('Работа недоступна.',404)
                if path=='/api/vote':
                    if phase!='voting':raise Error('Голосование сейчас закрыто.')
                    existing=c.execute('SELECT 1 FROM votes WHERE person=? AND work=?',(person,ident)).fetchone()
                    if body.get('liked'):
                        if not existing:
                            if c.execute('SELECT COUNT(*) FROM votes WHERE person=?',(person,)).fetchone()[0]>=3:raise Error('Вы уже использовали три лайка. Снимите один, чтобы выбрать другую работу.')
                            c.execute('INSERT INTO votes VALUES(?,?)',(person,ident))
                    else:c.execute('DELETE FROM votes WHERE person=? AND work=?',(person,ident))
                else:raise Error('Не найдено.',404)
                return self.reply({'ok':True})
        except Error as e:self.reply({'error':e.message},e.status)
        except (ValueError,TypeError):self.reply({'error':'Не удалось прочитать запрос.'},400)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8767);args=p.parse_args()
    print(f'Gallery: http://127.0.0.1:{args.port}/gallery-prototype/',flush=True)
    print(f'Admin: http://127.0.0.1:{args.port}/gallery-prototype/admin.html',flush=True)
    print(f'Admin key saved in {KEYFILE}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
