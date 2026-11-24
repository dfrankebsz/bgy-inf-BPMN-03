import { TASKS, TEST, CHAPTERS, grade, expectedValue, SHOP } from '../course-data.js';
const errs=[];const ids=new Set();const regular=TASKS.filter(t=>!t.bonus);
for(const t of [...TASKS,...TEST]){
 if(ids.has(t.id))errs.push(`Doppelte Aufgaben-ID ${t.id}`);ids.add(t.id);
 if(![1,2,3].includes(t.afb))errs.push(`Ungültiger Anforderungsbereich ${t.id}`);
 if(!t.solution?.trim())errs.push(`Musterlösung fehlt ${t.id}`);
 if(t.type!=='text'&&!grade(t,expectedValue(t)))errs.push(`Lösung nicht korrekt erkennbar ${t.id}`);
 if(t.type==='single'&&(!Number.isInteger(t.correct)||t.correct<0||t.correct>=t.options.length))errs.push(`Auswahlindex ${t.id}`);
 if(t.type==='multi'&&(t.correct.some(x=>!Number.isInteger(x)||x>=t.options.length)||new Set(t.correct).size!==t.correct.length))errs.push(`Mehrfachauswahl ${t.id}`);
 if(t.type==='slots'&&(t.correct.length!==t.slots.length||t.correct.some(x=>!t.choices.includes(x))))errs.push(`Drop-Slots ${t.id}`);
 if(t.bonus&&t.afb===1)errs.push(`Bonus muss AFB II oder III sein ${t.id}`);
 if(!CHAPTERS.find(ch=>ch.id===t.chapter)&&t.chapter!=='test')errs.push(`Kapitel fehlt ${t.id}`);
 if(t.drawio&&!t.solutionDiagram&&!t.bonus)errs.push(`Diagrammlösung fehlt ${t.id}`);
}
for(const ch of CHAPTERS){const a=regular.filter(t=>t.chapter===ch.id);for(const n of [1,2,3])if(!a.some(t=>t.afb===n))errs.push(`AFB ${n} fehlt bei ${ch.id}`);if(!ch.cards?.length)errs.push(`Erklärungen fehlen ${ch.id}`);}
const distribution=[1,2,3].map(n=>regular.filter(t=>t.afb===n).length);const chapters=CHAPTERS.map(ch=>regular.filter(t=>t.chapter===ch.id).length);
if(distribution.join(',')!=='9,18,9')errs.push(`AFB-Verteilung falsch ${distribution}`);
if(chapters.join(',')!=='5,8,6,7,10')errs.push(`Ungleichmäßige Kapitelverteilung falsch ${chapters}`);
if(TEST.length!==10)errs.push(`Test-Aufgabenzahl ${TEST.length}`);
if(SHOP.length<8)errs.push(`XP-Shop zu klein`);
console.log(JSON.stringify({regular:regular.length,bonus:TASKS.length-regular.length,test:TEST.length,distribution,chapters},null,2));
if(errs.length){console.error(errs.join('\n'));process.exit(1)}
console.log('Inhalte und Lösungsschlüssel sind konsistent.');
