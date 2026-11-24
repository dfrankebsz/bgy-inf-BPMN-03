#!/usr/bin/env python3
"""Renderisiert BPMN-Unterrichtsdiagramme als editierbare diagrams.net XML und SVG/PNG.
Alle Pool-Grenzen sind explizit. Nachrichtenflüsse verlaufen nur zwischen Pools.
Hinweis: Die SVG ist ein didaktisches Bild; die .drawio-Datei ist editierbar.
"""
from pathlib import Path
import xml.etree.ElementTree as ET
import html, textwrap, copy
D=Path(__file__).resolve().parents[1]/'assets'/'diagramme'
D.mkdir(parents=True,exist_ok=True)
for p in D.glob('*'):
 if p.is_file():p.unlink()

def N(key,typ,label,x,y,w=None,h=None,pool=None):
 sizes={'start':(52,52),'end':(52,52),'terminate':(52,52),'msgSend':(52,52),'msgCatch':(52,52),'task':(152,65),'xor':(64,64),'and':(64,64),'data':(112,65)}
 w0,h0=sizes[typ]
 return {'id':key,'typ':typ,'txt':label,'x':x,'y':y,'w':w or w0,'h':h or h0,'pool':pool}
def E(s,t,kind='seq',label='',points=None): return {'s':s,'t':t,'kind':kind,'label':label,'points':points or []}
def P(name,y,h,lanes=None,x=30,w=1770): return {'name':name,'x':x,'y':y,'w':w,'h':h,'lanes':lanes or []}
def S(w,h,pools,nodes,edges):return {'w':w,'h':h,'pools':copy.deepcopy(pools),'nodes':copy.deepcopy(nodes),'edges':copy.deepcopy(edges)}

DGRAMS={}
# Verbindung und deren Korrektur
ps=[P('Kundin',38,170),P('CampusPrint',247,258,lanes=[('Kundenservice',247,129),('Design',376,129)])]
base=[N('k1','msgSend','Bestellung senden',150,95,pool='Kundin'),N('c1','msgCatch','Bestellung empfangen',480,285,pool='CampusPrint'),N('c2','task','Bestellung erfassen',740,282,pool='CampusPrint'),N('c3','task','Motiv prüfen',1100,415,pool='CampusPrint'),N('e1','end','Prüfung beendet',1515,416,pool='CampusPrint')]
DGRAMS['aufgabe-verbindungen']=S(1840,555,ps,base,[E('k1','c1','seq','falsch: Sequenzfluss'),E('c1','c2'),E('c2','c3','message','falsch: Nachricht'),E('c3','e1')])
DGRAMS['loesung-verbindungen']=S(1840,555,ps,base,[E('k1','c1','message','Bestellung'),E('c1','c2'),E('c2','c3'),E('c3','e1')])
# Daten-Vorlage mit nachfolgenden Ergänzungen
ps=[P('CampusPrint',38,350,lanes=[('Kundenservice',38,175),('Design',213,175)])]
base=[N('s','start','Bestellung eingegangen',125,100,pool='CampusPrint'),N('t1','task','Bestellung prüfen',360,93,pool='CampusPrint'),N('t2','task','Freigabe dokumentieren',785,262,pool='CampusPrint'),N('e','end','Freigabe gespeichert',1250,264,pool='CampusPrint')]
edges=[E('s','t1'),E('t1','t2'),E('t2','e')]
DGRAMS['aufgabe-daten-ergaenzen']=S(1840,540,ps,base,edges)
add=[N('d1','data','Bestellung',360,238,pool='CampusPrint'),N('d2','data','Größenliste',566,238,pool='CampusPrint'),N('d3','data','Freigabeprotokoll',1045,387,pool='CampusPrint')]
DGRAMS['loesung-daten-ergaenzen']=S(1840,540,ps,base+add,edges+[E('d1','t1','data'),E('d2','t1','data'),E('t2','d3','data')])
# Nachrichtenfrage mit zwei Pools, Anfrage und Rückantwort
ps=[P('Kundin',35,215),P('CampusPrint',295,260,lanes=[('Kundenservice',295,260)])]
ns=[N('ks','start','Bestellung vorbereitet',95,100,pool='Kundin'),N('k1','msgSend','Bestellung senden',280,101,pool='Kundin'),N('k2','msgCatch','Rückfrage empfangen',730,101,pool='Kundin'),N('k3','msgSend','Ergänzung senden',1080,101,pool='Kundin'),N('ke','end','Antwort versendet',1550,101,pool='Kundin'),
    N('c1','msgCatch','Bestellung empfangen',280,360,pool='CampusPrint'),N('c2','task','Bestellung prüfen',460,356,pool='CampusPrint'),N('c3','msgSend','Rückfrage senden',730,360,pool='CampusPrint'),N('c4','msgCatch','Ergänzung empfangen',1080,360,pool='CampusPrint'),N('c5','task','Bestellung fortführen',1280,354,pool='CampusPrint'),N('ce','end','Bearbeitung fortgesetzt',1570,360,pool='CampusPrint')]
es=[E('ks','k1'),E('k1','k2'),E('k2','k3'),E('k3','ke'),E('c1','c2'),E('c2','c3'),E('c3','c4'),E('c4','c5'),E('c5','ce'),E('k1','c1','message','Bestellung'),E('c3','k2','message','Rückfrage'),E('k3','c4','message','Ergänzung')]
DGRAMS['loesung-nachrichten']=S(1840,610,ps,ns,es)
# Daten: einzelne Prüfaktivität
ps=[P('CampusPrint',40,380,lanes=[('Design',40,380)])]
ns=[N('s','start','Prüfung beginnt',110,206,pool='CampusPrint'),N('t','task','Motiv prüfen',725,201,pool='CampusPrint'),N('e','end','Prüfung abgeschlossen',1520,206,pool='CampusPrint'),N('d1','data','Bestellung',510,90,pool='CampusPrint'),N('d2','data','Druckvorlage',730,90,pool='CampusPrint'),N('d3','data','Prüfprotokoll',1070,345,pool='CampusPrint')]
es=[E('s','t'),E('t','e'),E('d1','t','data'),E('d2','t','data'),E('t','d3','data')]
DGRAMS['loesung-daten']=S(1840,490,ps,ns,es)
# Terminate after parallel split: appropriate split AND and join on positive path
ps=[P('CampusPrint',35,555,lanes=[('Design',35,240),('Lager',275,315)])]
ns=[N('s','start','Auftrag freigegeben',80,115,pool='CampusPrint'),N('split','and','',240,113,pool='CampusPrint'),N('file','task','Druckdatei vorbereiten',435,111,pool='CampusPrint'),N('stock','task','Material prüfen',435,356,pool='CampusPrint'),N('x','xor','Artikel verfügbar?',740,356,pool='CampusPrint'),N('cancel','task','Auftrag stornieren',940,468,pool='CampusPrint'),N('stop','terminate','Auftrag vollständig beendet',1240,470,pool='CampusPrint'),N('join','and','',1165,145,pool='CampusPrint'),N('next','task','Druck starten',1385,143,pool='CampusPrint'),N('end','end','Druck gestartet',1645,150,pool='CampusPrint')]
es=[E('s','split'),E('split','file'),E('split','stock'),E('stock','x'),E('x','cancel','seq','Nein'),E('cancel','stop'),E('x','join','seq','Ja'),E('file','join'),E('join','next'),E('next','end')]
DGRAMS['loesung-terminierung']=S(1840,655,ps,ns,es)
# Kundenauftrag (two pools with customer response, loop within design and send final approval)
ps=[P('Kundin',35,190),P('CampusPrint',265,410,lanes=[('Kundenservice',265,185),('Design',450,225)])]
ns=[N('ks','start','Bestellwunsch',80,97,pool='Kundin'),N('k1','msgSend','Bestellung senden',230,101,pool='Kundin'),N('k2','msgCatch','Rückfrage empfangen',690,103,pool='Kundin'),N('k3','msgSend','Ergänzung senden',970,103,pool='Kundin'),N('k4','msgCatch','Freigabe erhalten',1550,103,pool='Kundin'),
    N('c1','msgCatch','Bestellung erhalten',230,335,pool='CampusPrint'),N('c2','task','Angaben prüfen',440,328,pool='CampusPrint'),N('cx','xor','Vollständig?',675,327,pool='CampusPrint'),N('cq','msgSend','Rückfrage senden',915,332,pool='CampusPrint'),N('cr','msgCatch','Ergänzung empfangen',1165,331,pool='CampusPrint'),N('d1','task','Druckdatei prüfen',900,505,pool='CampusPrint'),N('dx','xor','geeignet?',1140,505,pool='CampusPrint'),N('dr','task','Datei überarbeiten',1080,592,pool='CampusPrint'),N('done','msgSend','Freigabe senden',1525,505,pool='CampusPrint')]
es=[E('ks','k1'),E('k1','k2'),E('k2','k3'),E('k3','k4'),E('k1','c1','message','Bestellung'),E('c1','c2'),E('c2','cx'),E('cx','cq','seq','Nein'),E('cq','cr'),E('cq','k2','message','Rückfrage'),E('k3','cr','message','Ergänzung'),E('cr','c2','seq','erneut prüfen',[(1270,406),(510,406)]),E('cx','d1','seq','Ja'),E('d1','dx'),E('dx','dr','seq','Nein'),E('dr','d1','seq','erneut prüfen',[(1170,650),(950,650)]),E('dx','done','seq','Ja'),E('done','k4','message','Freigabe')]
DGRAMS['loesung-kundenauftrag']=S(1840,750,ps,ns,es)
# Production internal: lane values and loop and AND
ps=[P('CampusPrint',30,740,lanes=[('Kundenservice',30,160),('Design',190,210),('Lager',400,170),('Produktion',570,200)])]
ns=[N('s','start','Bestellung erhalten',80,85,pool='CampusPrint'),N('c','task','Bestellung prüfen',220,81,pool='CampusPrint'),N('check','task','Logo prüfen',460,247,pool='CampusPrint'),N('x','xor','geeignet?',680,248,pool='CampusPrint'),N('rev','task','Logo überarbeiten',645,342,pool='CampusPrint'),N('split','and','',930,249,pool='CampusPrint'),N('file','task','Druckdatei erstellen',1135,247,pool='CampusPrint'),N('stock','task','Trikots bereitstellen',1135,453,pool='CampusPrint'),N('join','and','',1400,288,pool='CampusPrint'),N('print','task','Produktion starten',1515,625,pool='CampusPrint'),N('end','end','Produktion gestartet',1705,633,pool='CampusPrint'),N('d1','data','Bestellung',205,215,pool='CampusPrint'),N('d2','data','Logo-Datei',465,359,pool='CampusPrint'),N('d3','data','Druckdatei',1350,90,pool='CampusPrint')]
es=[E('s','c'),E('c','check'),E('check','x'),E('x','rev','seq','Nein'),E('rev','check','seq','zurück zur Prüfung',[(705,387),(530,387)]),E('x','split','seq','Ja'),E('split','file'),E('split','stock'),E('file','join'),E('stock','join'),E('join','print'),E('print','end'),E('d1','c','data'),E('d2','check','data'),E('file','d3','data')]
DGRAMS['loesung-produktion']=S(1840,830,ps,ns,es)
# Festival collaboration: messages then looping and parallel
ps=[P('Veranstalter',35,170),P('CampusPrint',255,595,lanes=[('Kundenservice',255,160),('Design',415,190),('Lager',605,130),('Produktion',735,115)])]
ns=[N('ks','msgSend','Anfrage senden',115,100,pool='Veranstalter'),N('kr','msgCatch','Rückfrage empfangen',625,100,pool='Veranstalter'),N('ka','msgSend','Ergänzung senden',860,100,pool='Veranstalter'),N('kf','msgCatch','Freigabe erhalten',1585,100,pool='Veranstalter'),
N('s','msgCatch','Anfrage empfangen',115,311,pool='CampusPrint'),N('c','task','Angaben prüfen',325,307,pool='CampusPrint'),N('x','xor','vollständig?',560,306,pool='CampusPrint'),N('ask','msgSend','Rückfrage senden',800,312,pool='CampusPrint'),N('ans','msgCatch','Ergänzung erhalten',1010,312,pool='CampusPrint'),N('d','task','Motiv prüfen',470,474,pool='CampusPrint'),N('dx','xor','geeignet?',704,475,pool='CampusPrint'),N('rev','task','Motiv überarbeiten',675,556,pool='CampusPrint'),N('split','and','',960,472,pool='CampusPrint'),N('file','task','Druckdatei erstellen',1110,469,pool='CampusPrint'),N('stock','task','Material bereitstellen',1110,646,pool='CampusPrint'),N('join','and','',1370,492,pool='CampusPrint'),N('approval','task','Auftrag freigeben',1515,754,pool='CampusPrint'),N('send','msgSend','Freigabe senden',1660,319,pool='CampusPrint')]
es=[E('ks','s','message','Anfrage'),E('s','c'),E('c','x'),E('x','ask','seq','Nein'),E('ask','ans'),E('ask','kr','message','Rückfrage'),E('kr','ka'),E('ka','ans','message','Ergänzung'),E('ans','c','seq','erneute Prüfung',[(1080,395),(410,395)]),E('x','d','seq','Ja'),E('d','dx'),E('dx','rev','seq','Nein'),E('rev','d','seq','wieder prüfen',[(755,594),(530,594)]),E('dx','split','seq','Ja'),E('split','file'),E('split','stock'),E('file','join'),E('stock','join'),E('join','approval'),E('approval','send'),E('send','kf','message','Auftrag freigegeben')]
DGRAMS['loesung-festival']=S(1840,920,ps,ns,es)
# Bonus photo simplified
ps=[P('Schulklasse',30,180),P('Fotodruckerei',260,580,lanes=[('Auftragsannahme',260,170),('Grafik',430,180),('Produktion',610,230)])]
ns=[N('ks','msgSend','Datei senden',160,94,pool='Schulklasse'),N('ka','msgCatch','Neue Datei angefordert',665,93,pool='Schulklasse'),N('kb','msgSend','Korrigierte Datei senden',920,95,pool='Schulklasse'),N('s','msgCatch','Datei empfangen',160,317,pool='Fotodruckerei'),N('t','task','Datei prüfen',410,486,pool='Fotodruckerei'),N('x','xor','Qualität ausreichend?',645,485,pool='Fotodruckerei'),N('ask','msgSend','Neue Datei anfordern',860,319,pool='Fotodruckerei'),N('get','msgCatch','Neue Datei empfangen',1120,319,pool='Fotodruckerei'),N('split','and','',935,486,pool='Fotodruckerei'),N('a','task','Material beschaffen',1145,670,pool='Fotodruckerei'),N('b','task','Druck planen',1145,490,pool='Fotodruckerei'),N('join','and','',1415,556,pool='Fotodruckerei'),N('print','task','Produktion beginnen',1560,686,pool='Fotodruckerei')]
es=[E('ks','s','message','Datei'),E('s','t'),E('t','x'),E('x','ask','seq','Nein'),E('ask','ka','message','Neuanforderung'),E('ka','kb'),E('kb','get','message','neue Datei'),E('ask','get'),E('get','t','seq','erneut prüfen',[(1210,412),(490,412)]),E('x','split','seq','Ja'),E('split','a'),E('split','b'),E('a','join'),E('b','join'),E('join','print')]
DGRAMS['loesung-bonus-foto']=S(1840,910,ps,ns,es)
# Test: reuse a fresh slightly different process from photo for task specificity
ps=[P('Schulfirma',28,185),P('Druckerei',265,610,lanes=[('Kundenservice',265,160),('Design',425,190),('Lager',615,135),('Produktion',750,125)])]
ns=[N('ks','msgSend','Bestellung senden',160,95,pool='Schulfirma'),N('kb','msgCatch','Korrekturwunsch empfangen',660,97,pool='Schulfirma'),N('ka','msgSend','Neue Datei senden',915,97,pool='Schulfirma'),N('kf','msgCatch','Freigabe erhalten',1610,97,pool='Schulfirma'),N('s','msgCatch','Bestellung empfangen',170,320,pool='Druckerei'),N('t','task','Druckdatei prüfen',395,487,pool='Druckerei'),N('x','xor','geeignet?',640,488,pool='Druckerei'),N('req','msgSend','Korrektur anfordern',810,326,pool='Druckerei'),N('ans','msgCatch','Neue Datei erhalten',1050,324,pool='Druckerei'),N('split','and','',930,490,pool='Druckerei'),N('d','task','Druck vorbereiten',1120,489,pool='Druckerei'),N('l','task','Material bereitstellen',1120,672,pool='Druckerei'),N('join','and','',1400,537,pool='Druckerei'),N('p','task','Produktion starten',1510,787,pool='Druckerei'),N('send','msgSend','Freigabe senden',1630,316,pool='Druckerei')]
es=[E('ks','s','message','Bestellung'),E('s','t'),E('t','x'),E('x','req','seq','Nein'),E('req','kb','message','Korrekturwunsch'),E('kb','ka'),E('ka','ans','message','korrigierte Datei'),E('req','ans'),E('ans','t','seq','neu prüfen',[(1140,420),(475,420)]),E('x','split','seq','Ja'),E('split','d'),E('split','l'),E('d','join'),E('l','join'),E('join','p'),E('p','send'),E('send','kf','message','Freigabe')]
DGRAMS['loesung-test-ue4']=S(1840,940,ps,ns,es)


# Ergänzung eindeutiger Start-/Endereignisse bei längeren Kollaborationsmodellen.
def add(name, nodes=(), edges=()):
 DGRAMS[name]['nodes'].extend(nodes)
 DGRAMS[name]['edges'].extend(edges)
# Bei der absichtlich fehlerhaften Aufgabe geht es um die Verbindungstypen.
for name in ('aufgabe-verbindungen','loesung-verbindungen'):
 add(name,[N('k0','start','Bestellung fertig',75,95,pool='Kundin'),N('c0','start','Bearbeitung beginnt',380,285,pool='CampusPrint')],[E('k0','k1'),E('c0','c1')])
add('loesung-nachrichten',[N('c0','start','Bearbeitung beginnt',112,360,pool='CampusPrint')],[E('c0','c1')])
add('loesung-kundenauftrag',[
 N('c0','start','Bearbeitung beginnt',90,335,pool='CampusPrint'),
 N('ke','end','Freigabe gelesen',1730,105,pool='Kundin'),
 N('ce','end','Bearbeitung abgeschlossen',1740,505,pool='CampusPrint')],
 [E('c0','c1'),E('k4','ke'),E('done','ce')])
add('loesung-festival',[
 N('ks0','start','Anfrage geplant',75,99,pool='Veranstalter'),
 N('c0','start','Bearbeitung beginnt',75,311,pool='CampusPrint'),
 N('ke','end','Freigabe erhalten',1760,99,pool='Veranstalter'),
 N('ce','end','Auftrag freigegeben',1760,319,pool='CampusPrint')],
 [E('ks0','ks'),E('ks','kr'),E('kr','ka'),E('ka','kf'),E('kf','ke'),E('c0','s'),E('send','ce')])
for item in DGRAMS['loesung-festival']['nodes']:
 if item['id']=='ks':item['x']=190
 if item['id']=='s':item['x']=175
add('loesung-bonus-foto',[
 N('k0','start','Datei vorbereitet',75,95,pool='Schulklasse'),
 N('c0','start','Auftrag beginnt',75,317,pool='Fotodruckerei'),
 N('ke','end','Datei gesendet',1650,95,pool='Schulklasse'),
 N('ce','end','Produktion gestartet',1760,690,pool='Fotodruckerei')],
 [E('k0','ks'),E('ks','ka'),E('ka','kb'),E('kb','ke'),E('c0','s'),E('print','ce')])
add('loesung-test-ue4',[
 N('k0','start','Auftrag vorbereitet',65,95,pool='Schulfirma'),
 N('c0','start','Bearbeitung beginnt',75,320,pool='Druckerei'),
 N('ke','end','Bestätigung erhalten',1760,97,pool='Schulfirma'),
 N('ce','end','Auftrag gestartet',1760,316,pool='Druckerei')],
 [E('k0','ks'),E('ks','kb'),E('kb','ka'),E('ka','kf'),E('kf','ke'),E('c0','s'),E('send','ce')])

# Style helpers
STYLE={'start':'ellipse;whiteSpace=wrap;html=1;strokeWidth=2;fillColor=#EAF5FF;strokeColor=#2C6089;',
'end':'ellipse;whiteSpace=wrap;html=1;strokeWidth=6;fillColor=#FFF3F4;strokeColor=#AC3E55;',
'terminate':'ellipse;whiteSpace=wrap;html=1;strokeWidth=3;fillColor=#FFF3F4;strokeColor=#AC3E55;',
'task':'rounded=1;arcSize=16;whiteSpace=wrap;html=1;strokeWidth=2;fillColor=#F7FBFF;strokeColor=#375F87;fontSize=15;align=center;verticalAlign=middle;',
'xor':'rhombus;whiteSpace=wrap;html=1;strokeWidth=2;fillColor=#FFF2CE;strokeColor=#997431;fontSize=32;align=center;verticalAlign=middle;',
'and':'rhombus;whiteSpace=wrap;html=1;strokeWidth=2;fillColor=#E8F8EC;strokeColor=#348456;fontSize=32;align=center;verticalAlign=middle;',
'msgSend':'ellipse;whiteSpace=wrap;html=1;strokeWidth=3;fillColor=#E5F1FF;strokeColor=#34689C;',
'msgCatch':'ellipse;whiteSpace=wrap;html=1;strokeWidth=3;fillColor=#E5F1FF;strokeColor=#34689C;',
'data':'shape=document;whiteSpace=wrap;html=1;strokeWidth=2;fillColor=#FFFDF0;strokeColor=#907B45;fontSize=13;'}

def cell(rt,id,value,style,x,y,w,h,parent='1'):
 c=ET.SubElement(rt,'mxCell',id=str(id),value=str(value),style=style,vertex='1',parent=parent)
 ET.SubElement(c,'mxGeometry',x=str(x),y=str(y),width=str(w),height=str(h),attrib={'as':'geometry'})
 return c

def diagram_xml(name,spec):
 mx=ET.Element('mxfile',host='app.diagrams.net',modified='2026-11-24T11:00:00.000Z',agent='BPMN-Labor UE4',version='24.7.17',type='device')
 diagram=ET.SubElement(mx,'diagram',id=name,name='BPMN')
 model=ET.SubElement(diagram,'mxGraphModel',dx='1840',dy='940',grid='1',gridSize='10',page='1',pageScale='1',pageWidth=str(spec['w']),pageHeight=str(spec['h']))
 root=ET.SubElement(model,'root');ET.SubElement(root,'mxCell',id='0');ET.SubElement(root,'mxCell',id='1',parent='0')
 for i,p in enumerate(spec['pools']):
  cell(root,f'pool-{i}','', 'rounded=0;whiteSpace=wrap;html=1;strokeWidth=3;strokeColor=#5B6EA0;fillColor=#F8FAFF;',p['x'],p['y'],p['w'],p['h'])
  cell(root,f'pool-label-{i}',p['name'],'text;whiteSpace=wrap;html=1;fontStyle=1;fontSize=15;align=center;verticalAlign=middle;rotation=270;',p['x']+3,p['y']+5,48,p['h']-10)
  for j,(lab,y,h) in enumerate(p['lanes']):
   cell(root,f'lane-{i}-{j}','', 'rounded=0;whiteSpace=wrap;html=1;strokeWidth=1;strokeColor=#D2DDEE;fillColor=none;',p['x']+55,y,p['w']-55,h)
   cell(root,f'lane-label-{i}-{j}',lab,'text;whiteSpace=wrap;html=1;fontSize=13;align=center;verticalAlign=middle;rotation=270;',p['x']+58,y+4,48,h-8)
 for n in spec['nodes']:
  typ=n['typ'];label=n['txt'] if typ in ('task','data') else ('X' if typ=='xor' else '+' if typ=='and' else '')
  cell(root,n['id'],label,STYLE[typ],n['x'],n['y'],n['w'],n['h'])
  if typ in ('msgSend','msgCatch'):
   # BPMN-Zwischenereignis: zwei Kreise, bei Senden schwarz gefüllter Briefumschlag, bei Empfangen ungefüllter.
   cell(root,'ring-'+n['id'],'','ellipse;fillColor=none;strokeColor=#34689C;strokeWidth=1.7;',n['x']+7,n['y']+7,n['w']-14,n['h']-14)
   is_send=typ=='msgSend'
   cell(root,'env-'+n['id'],'',('rounded=0;fillColor=#24344E;strokeColor=#24344E;strokeWidth=1.6;' if is_send else 'rounded=0;fillColor=#FFFFFF;strokeColor=#24344E;strokeWidth=1.6;'),n['x']+12,n['y']+17,n['w']-24,n['h']-34)
   cell(root,'env-flap-'+n['id'],'⌄','text;html=1;align=center;verticalAlign=middle;fontSize=24;fontStyle=1;'+('fontColor=#FFFFFF;' if is_send else 'fontColor=#24344E;'),n['x']+15,n['y']+15,n['w']-30,n['h']-31)
  if typ=='terminate':cell(root,'dot-'+n['id'],'','ellipse;fillColor=#25344C;strokeColor=none;',n['x']+13,n['y']+13,n['w']-26,n['h']-26)
  if typ not in ('task','data') and n['txt']:
   cell(root,'label-'+n['id'],n['txt'],'text;html=1;whiteSpace=wrap;align=center;verticalAlign=middle;fontSize=12;fontColor=#374866;',n['x']-62,n['y']+n['h']+6,n['w']+124,36)
 for i,e in enumerate(spec['edges']):
  kind=e['kind'];sty='edgeStyle=orthogonalEdgeStyle;orthogonalLoop=1;rounded=1;jettySize=auto;html=1;strokeColor=#304565;strokeWidth=2.5;fontSize=13;labelBackgroundColor=#ffffff;'
  if kind=='seq':sty+='endArrow=block;endFill=1;'
  elif kind=='message':sty+='dashed=1;dashPattern=8 7;endArrow=open;endFill=0;startArrow=oval;startFill=0;strokeColor=#8755B4;'
  elif kind=='data':sty+='dashed=1;dashPattern=1 4;endArrow=open;endFill=0;strokeColor=#887A4A;'
  c=ET.SubElement(root,'mxCell',id=f'edge-{i}',value=e['label'],style=sty,edge='1',parent='1',source=e['s'],target=e['t']);g=ET.SubElement(c,'mxGeometry',relative='1',attrib={'as':'geometry'})
  if e['points']:
   pts=ET.SubElement(g,'Array',attrib={'as':'points'})
   for x,y in e['points']:ET.SubElement(pts,'mxPoint',x=str(x),y=str(y))
 return ET.tostring(mx,encoding='unicode',xml_declaration=True)

def svg(spec):
 W,H=spec['w'],spec['h'];by={n['id']:n for n in spec['nodes']}
 out=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><defs>',
 '<marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#304565"/></marker>',
 '<marker id="msg" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M1,1 L8,4.5 L1,8" stroke="#8755B4" stroke-width="2" fill="none"/></marker>',
 '<marker id="dataarr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L7,4 L0,8" stroke="#887A4A" stroke-width="2" fill="none"/></marker></defs>',
 f'<rect width="{W}" height="{H}" fill="#F7F9FD"/>']
 for p in spec['pools']:
  x,y,w,h=p['x'],p['y'],p['w'],p['h'];out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#FFFFFF" stroke="#566B9A" stroke-width="3"/>')
  out.append(f'<rect x="{x}" y="{y}" width="55" height="{h}" fill="#EBF0FD" stroke="#566B9A" stroke-width="2"/>')
  out.append(f'<text transform="translate({x+34} {y+h/2}) rotate(-90)" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" font-weight="bold" fill="#283B65">{html.escape(p["name"])}</text>')
  for lab,ly,lh in p['lanes']:
   out.append(f'<rect x="{x+55}" y="{ly}" width="{w-55}" height="{lh}" fill="none" stroke="#D7DEED" stroke-width="1.5"/>')
   out.append(f'<text transform="translate({x+84} {ly+lh/2}) rotate(-90)" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="#5A6B8B">{html.escape(lab)}</text>')
 # edges before nodes
 for e in spec['edges']:
  a,b=by[e['s']],by[e['t']]
  # use center point for different pools or data; else choose routing according to position
  ax=a['x']+a['w']/2;ay=a['y']+a['h']/2;bx=b['x']+b['w']/2;byy=b['y']+b['h']/2
  if e['kind']=='message':
   st=(ax,ay+(a['h']/2 if byy>ay else -a['h']/2));en=(bx,byy-(b['h']/2 if byy>ay else -b['h']/2));
  elif e['kind']=='data':st=(ax,ay);en=(bx,byy)
  else:
   if e['points'] or (bx+20<ax):st=(ax,ay+a['h']/2);en=(bx,byy+b['h']/2)
   else:st=(a['x']+a['w'],ay);en=(b['x'],byy)
  pts=[st]+e['points']+[en]
  # polyline with very simple intelligent midpoint for different y if no points
  if len(pts)==2 and e['kind']=='seq' and abs(st[1]-en[1])>90:pts=[st,((st[0]+en[0])/2,st[1]),((st[0]+en[0])/2,en[1]),en]
  path='M '+' L '.join(f'{x:.0f},{y:.0f}' for x,y in pts)
  cl={'seq':'#304565','message':'#8755B4','data':'#887A4A'}[e['kind']]
  dash={'seq':'','message':'stroke-dasharray="9 6"','data':'stroke-dasharray="2 7"'}[e['kind']]
  marker={'seq':'arr','message':'msg','data':'dataarr'}[e['kind']]
  out.append(f'<path d="{path}" fill="none" stroke="{cl}" stroke-width="2.6" stroke-linejoin="round" {dash} marker-end="url(#{marker})"/>')
  if e['kind']=='message':out.append(f'<circle cx="{st[0]:.0f}" cy="{st[1]:.0f}" r="4.5" fill="white" stroke="{cl}" stroke-width="2"/>')
  if e['label']:
   px,py=(st[0]+en[0])/2,(st[1]+en[1])/2-8
   out.append(f'<text x="{px:.0f}" y="{py:.0f}" text-anchor="middle" font-size="12" font-weight="bold" font-family="Arial,sans-serif" fill="{cl}" stroke="white" stroke-width="4" paint-order="stroke">{html.escape(e["label"])}</text>')
 for n in spec['nodes']:
  typ=n['typ'];x,y,w,h=n['x'],n['y'],n['w'],n['h'];cx=x+w/2;cy=y+h/2
  if typ in ('start','end','terminate','msgSend','msgCatch'):
   stroke='#A43852' if typ in ('end','terminate') else '#245D94';fill='#FFF1F4' if typ in ('end','terminate') else '#E9F5FF';sw=6 if typ=='end' else 3
   out.append(f'<circle cx="{cx}" cy="{cy}" r="{w/2-4}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
   if typ in ('msgSend','msgCatch'):
    out.append(f'<circle cx="{cx}" cy="{cy}" r="{w/2-9}" fill="none" stroke="{stroke}" stroke-width="2"/>')
    if typ=='msgSend':
     out.append(f'<rect x="{cx-15}" y="{cy-10}" width="30" height="20" fill="#275E8C" stroke="#275E8C" stroke-width="1.5"/>')
     out.append(f'<path d="M {cx-15} {cy-10} L {cx} {cy+3} L {cx+15} {cy-10}" fill="none" stroke="white" stroke-width="2"/>')
    else:out.append(f'<rect x="{cx-15}" y="{cy-10}" width="30" height="20" fill="white" stroke="#275E8C" stroke-width="2"/><path d="M {cx-15} {cy-10} L {cx} {cy+3} L {cx+15} {cy-10}" fill="none" stroke="#275E8C" stroke-width="2"/>')
   if typ=='terminate':out.append(f'<circle cx="{cx}" cy="{cy}" r="17" fill="#27374D"/>')
  elif typ=='task':out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="13" fill="#F7FBFF" stroke="#3A658B" stroke-width="2.4"/>')
  elif typ=='data':out.append(f'<path d="M{x} {y} H{x+w-22} L{x+w} {y+22} V{y+h} H{x} Z" fill="#FFFBE8" stroke="#938148" stroke-width="2.4"/><path d="M{x+w-22} {y} V{y+22} H{x+w}" fill="none" stroke="#938148" stroke-width="2"/>')
  else:
   cl='#987134' if typ=='xor' else '#31885D';fc='#FFF2D7' if typ=='xor' else '#E7F9EC'
   out.append(f'<path d="M{cx} {y+2} L{x+w-2} {cy} L{cx} {y+h-2} L{x+2} {cy}Z" fill="{fc}" stroke="{cl}" stroke-width="2.4"/>')
   out.append(f'<text x="{cx}" y="{cy+12}" text-anchor="middle" font-family="Arial" font-size="38" font-weight="bold" fill="#303D58">{"X" if typ=="xor" else "+"}</text>')
  label=n['txt']
  if label:
   if typ in ('task','data'):
    lines=textwrap.wrap(label,width=20,break_long_words=False) or [''];font=14 if typ=='task' else 13
    for i,line in enumerate(lines):out.append(f'<text x="{cx}" y="{cy+(i-(len(lines)-1)/2)*17+5:.0f}" text-anchor="middle" font-family="Arial,sans-serif" font-size="{font}" fill="#2B3E60">{html.escape(line)}</text>')
   else:
    lines=textwrap.wrap(label,width=25,break_long_words=False) or ['']
    for i,line in enumerate(lines):out.append(f'<text x="{cx}" y="{y+h+19+i*15}" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#31445F">{html.escape(line)}</text>')
 out.append('</svg>');return '\n'.join(out)

for name,spec in DGRAMS.items():
 nodes={n['id']:n for n in spec['nodes']};assert len(nodes)==len(spec['nodes']),f'{name}: Duplicate nodes'
 for e in spec['edges']:
  assert e['s'] in nodes and e['t'] in nodes,(name,e)
  if e['kind']=='message' and name!='aufgabe-verbindungen':assert nodes[e['s']]['pool']!=nodes[e['t']]['pool'],f'{name}: illegal message within pool: {e}'
  if e['kind']=='seq' and name!='aufgabe-verbindungen':assert nodes[e['s']]['pool']==nodes[e['t']]['pool'],f'{name}: illegal sequence crossing pools: {e}'
 # expected intentional errors in one exercise
 (D/f'{name}.drawio').write_text(diagram_xml(name,spec),encoding='utf8')
 (D/f'{name}.svg').write_text(svg(spec),encoding='utf8')
try:
 import cairosvg
 for p in D.glob('*.svg'):
  cairosvg.svg2png(url=str(p),write_to=str(p.with_suffix('.png')),output_width=1400)
except Exception as ex:print('PNG-Export nicht verfügbar:',ex)
print('Created',len(DGRAMS),'drawio + SVG + PNG diagrams')
