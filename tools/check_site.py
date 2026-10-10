# coding: utf-8
"""Check generated static links, publication boundaries, and catalog coverage."""
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'_site'
errors=[];links=0
class Page(HTMLParser):
    def __init__(self):
        super().__init__();self.refs=[];self.ids=[];self.lang=None;self.title=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='html':self.lang=a.get('lang')
        if tag=='title':self.title=True
        if 'id' in a:self.ids.append(a['id'])
        for key in ('href','src'):
            if a.get(key):self.refs.append(a[key])
manifest=json.loads((OUT/'build-manifest.json').read_text())
for filename in manifest['files']:
    p=(OUT/filename).resolve()
    if not p.is_relative_to(OUT) or not p.is_file():errors.append('Invalid manifest entry: '+filename)
    if any(x in Path(filename).parts for x in ('.git','.github','__pycache__','raw')):errors.append('Private/build source included: '+filename)
for p in OUT.rglob('*.html'):
    body=p.read_text(encoding='utf-8');doc=Page();doc.feed(body)
    if doc.lang!='ko' or not doc.title:errors.append(str(p)+': missing Korean language/title')
    if len(doc.ids)!=len(set(doc.ids)):errors.append(str(p)+': duplicate IDs')
    if '/Users/' in body:errors.append(str(p)+': local/private metadata in publication')
    for url in doc.refs:
        u=urlparse(url)
        if u.scheme or u.netloc:continue
        if not u.path:
            if u.fragment and unquote(u.fragment) not in doc.ids:errors.append(str(p)+': missing anchor '+url)
            continue
        target=(p.parent/unquote(u.path)).resolve();links+=1
        if not target.is_relative_to(OUT) or not target.exists():errors.append(str(p)+': broken local link '+url)
        elif target.suffix=='.html' and u.fragment:
            other=Page();other.feed(target.read_text())
            if unquote(u.fragment) not in other.ids:errors.append(str(p)+': missing destination anchor '+url)
catalog=(OUT/'catalog.js').read_text(encoding='utf-8')
data=json.loads(catalog.removeprefix('window.DESIGN_DATA = ').rstrip().removesuffix(';').replace('<\\/','</'))
if len(data['levels']['rows'])!=99:errors.append('Missing level rows')
if len(data['atlas']['hubs'])!=12:errors.append('Missing atlas hubs')
if len(data['atlas']['entries'])!=148:errors.append('Unexpected atlas coverage change; update design/UI together')
for d in data['docs']:
    if not (OUT/d['href']).exists():errors.append('Missing document page '+d['href'])
if errors:raise SystemExit('\n'.join('FAIL: '+x for x in errors))
print(f'PASS: {len(data["docs"])} documents, {links} local links/assets, 99 levels, 12 hubs, 148 draft anatomy topics.')
print('Publication contains planning content only; not a medical or game validation.')
