import test from 'node:test';
import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';
import {CHAPTERS,TASKS,TEST,grade,expectedValue} from '../course-data.js';
import {join} from 'node:path';
const root=new URL('../',import.meta.url).pathname;
test('Alle Musterdiagramme sind vorhanden; reine Textmodellierungen haben keine Startvorlage',async()=>{
 const list=[...TASKS,...TEST].filter(t=>t.drawio);
 assert.ok(list.length>=8,'Wichtig: mehrere selbstständige Textmodellierungen');
 let noStarter=0;
 for(const t of list){assert.ok(t.solutionDiagram?.endsWith('.svg'),t.id+' without solution');
   await access(join(root,t.solutionDiagram));await access(join(root,t.solutionDiagram.replace('.svg','.drawio')));
   if(t.starter){await access(join(root,t.starter));await access(join(root,t.starter.replace('.svg','.drawio')));}
   else noStarter++;
 }
 assert.ok(noStarter>=7,'Mehrere eigenständige Textaufgaben ohne Vorlage');
});
test('Nicht automatisch bewertete Diagrammaufgaben werden als Freitext mit Musterlösung angelegt',()=>{
 for(const t of [...TASKS,...TEST])if(t.drawio){assert.equal(t.type,'text');assert.equal(grade(t, ''),null);assert.ok(t.solution.length>80);}
});
test('Aufgabenstellungen sind nicht doppelt',()=>{
 const all=[...TASKS,...TEST];const norm=s=>s.replace(/^(BONUS|DRAW.IO|Eigenständig modellieren)[^:]*:/g,'').trim().toLowerCase().replace(/\s+/g,' ');
 assert.equal(new Set(all.map(x=>norm(x.prompt))).size,all.length);
});
test('Alle automatisch bewertbaren Aufgaben haben echte Gegenbeispiele, die abgelehnt werden',()=>{
 for(const t of [...TASKS,...TEST].filter(t=>t.type!=='text')){
  assert.equal(grade(t,expectedValue(t)),true,t.id);
  const v=expectedValue(t); let wrong;
  if(t.type==='single')wrong=(v+1)%t.options.length;
  else if(t.type==='tf')wrong=!v;
  else if(t.type==='multi')wrong=[];
  else if(t.type==='slots')wrong=v.map((x,i)=>i===0?'not-a-symbol':x);
  else if(t.type==='order')wrong=[...v].reverse();
  else if(t.type==='category'||t.type==='match')wrong={...v,0:'nicht zugeordnet'};
  assert.equal(grade(t,wrong),false,t.id);
 }
});
test('Alle BPMN-Symbole aus UE 2, 3 und 4 sind vollständig in der Legende enthalten',async()=>{
 const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
 for(const s of ['Startereignis','Tätigkeit (Task)','Endereignis','Sequenzfluss','XOR-Gateway','AND-Gateway','Schleife','Pool','Lane','Nachrichtenfluss','Nachricht senden','Nachricht empfangen','Datenobjekt','Datenassoziation','Terminierungs-Endereignis'])assert.ok(app.includes(s),s);
});
