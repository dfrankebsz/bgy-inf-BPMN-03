import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const ids=new Map();function el(id){if(!ids.has(id))ids.set(id,{innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){}},querySelector(){return null},addEventListener(){},showModal(){},close(){},value:''});return ids.get(id)}
globalThis.document={getElementById:el,querySelectorAll(){return []},addEventListener(){},createElement(){return {className:'',textContent:'',remove(){}}},body:{append(){}}};globalThis.window={scrollY:0,scrollTo(){}};globalThis.localStorage={getItem(){return null},setItem(){}};globalThis.history={replaceState(){}};globalThis.location={hash:''};globalThis.fetch=async()=>({ok:false,status:401,headers:{get(){return 'application/json'}},json:async()=>({error:'nicht angemeldet'})});
let js=await readFile(new URL('../app.js',import.meta.url),'utf8');
const dataURL=new URL('../course-data.js',import.meta.url).href;
js=js.replace("from './course-data.js?v=ue4'",`from '${dataURL}'`).replace(/\nboot\(\);\s*$/,'\n');
js+='\nexport {renderHome,renderChapter,renderLegend,renderTest,renderBonus,renderSkills,renderInteractive,taskHTML,choicesFor,render};\n';
const mod=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const data=await import(dataURL);
assert.match(mod.renderHome(),/CampusPrint/);
for(const ch of data.CHAPTERS){const html=mod.renderChapter(ch);assert.ok(html.includes(ch.title));assert.ok(html.includes('Musterlösung'));assert.equal((html.match(/class="task /g)||[]).length,data.TASKS.filter(t=>t.chapter===ch.id&&!t.bonus).length);console.log(ch.id,html.length,'chars', (html.match(/class="task /g)||[]).length,'tasks')}
assert.match(mod.renderLegend(),/XOR-Gateway/);assert.match(mod.renderLegend(),/AND-Gateway/);
assert.equal((mod.renderTest().match(/class="task /g)||[]).length,10);
console.log('Rendering successful; no missing template members.');
