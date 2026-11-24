import test from 'node:test';import assert from 'node:assert/strict';
import {CHAPTERS,TASKS,TEST,ALL_TASKS,grade,expectedValue,earnedXp,newProgress,wallet,taskXp} from '../course-data.js';
test('Alle automatisch bewerteten Aufgaben erkennen die hinterlegte Lösung',()=>{for(const t of ALL_TASKS)if(t.type!=='text')assert.equal(grade(t,expectedValue(t)),true,t.id)});
test('Falsche Auswahl und unvollständige Diagramm-Drops werden abgelehnt',()=>{
 const s=TASKS.find(t=>t.type==='slots');assert.equal(grade(s,['start','task']),false);assert.equal(grade(s,['end','task','start']),false);
 const m=TASKS.find(t=>t.type==='multi');assert.equal(grade(m,[]),false);assert.equal(grade(m,[...m.correct,m.correct[0]]),false);
 const c=TASKS.find(t=>t.type==='category');assert.equal(grade(c,{}),false);
});
test('Die Kapitellängen sind bedarfsgerecht verteilt und AFB ausbalanciert',()=>{
 const a=TASKS.filter(t=>!t.bonus);assert.deepEqual(CHAPTERS.map(c=>a.filter(t=>t.chapter===c.id).length),[5,8,6,7,10]);assert.deepEqual([1,2,3].map(n=>a.filter(t=>t.afb===n).length),[9,18,9]);assert.equal(TASKS.filter(t=>t.bonus).length,4);assert.equal(TEST.length,10);
});
test('XP werden für einmalig gelöste Aufgaben vergeben und nach Käufen abgezogen',()=>{const p=newProgress();const t=TASKS[0];p.answers[t.id]={checked:true,correct:true};assert.equal(earnedXp(p),taskXp(t));assert.equal(wallet(p),taskXp(t))});
