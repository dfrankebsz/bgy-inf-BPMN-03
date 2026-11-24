/* Server-Routing-Test mit lokalen Netlify-Blobs-Mocks (kein Onlinezugriff erforderlich). */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

let handlerPromise;
async function makeHandler(){
 const stores=new Map();
 const getStore=({name})=>{
  if(!stores.has(name))stores.set(name,new Map());
  const m=stores.get(name);
  return {
   get:async key=>structuredClone(m.get(key)||null),
   setJSON:async(key,value,opt={})=>{if(opt.onlyIfNew&&m.has(key))throw Error('Already exists');m.set(key,structuredClone(value))},
   list:async({prefix='' }={})=>({blobs:[...m.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key}))}),
   delete:async key=>{m.delete(key)}
  }
 };
 globalThis.__mockNetlifyBlobs={getStore};
 process.env.TEACHER_ACCESS_CODE='LehrerCode12';
 const url=new URL('../netlify/functions/api.mjs',import.meta.url);
 let code=await readFile(url,'utf8');
 code=code.replace("import { getStore } from '@netlify/blobs';",'const {getStore}=globalThis.__mockNetlifyBlobs;');
 code=code.replace("import PDFDocument from 'pdfkit';",'const PDFDocument=class UnusedPDF {}');
 code=code.replace("from '../../course-data.js';",`from '${new URL('../course-data.js',import.meta.url).href}';`);
 const imported=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 return imported.default;
}
const jsonReq=(route,payload,cookie='')=>new Request('https://beispiel.netlify.app/api/'+route,{method:'POST',headers:{'Content-Type':'application/json', ...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(payload)});
const getReq=(route,cookie='')=>new Request('https://beispiel.netlify.app/api/'+route,{headers:{...(cookie?{Cookie:cookie}:{})}});
const cookieOf=response=>response.headers.get('set-cookie')?.split(';')[0]||'';

test('Lehrercode, Klassenbindung, Fortschritt, Reset, Passwort und Entfernen',async()=>{
 const run=await makeHandler();
 const noCode=await run(jsonReq('register',{klass:'BG11A',nickname:'badteacher',password:'passwort123',role:'teacher',teacherCode:'falsch'}));
 assert.equal(noCode.status,403);
 const validCode=process.env.TEACHER_ACCESS_CODE;
 assert.equal(validCode.length,12,'Der konfigurierte Lehrercode hat für diesen Test genau 12 Zeichen.');
 process.env.TEACHER_ACCESS_CODE='Code1234567';
 const tooShort=await run(jsonReq('register',{klass:'BG11A',nickname:'teacherShort',password:'passwort123',role:'teacher',teacherCode:process.env.TEACHER_ACCESS_CODE}));
 assert.equal(tooShort.status,503,'11 Zeichen dürfen nicht ausreichen.');
 process.env.TEACHER_ACCESS_CODE=validCode;
 const teacher=await run(jsonReq('register',{klass:'BG11A',nickname:'Tutor',password:'passwort123',role:'teacher',teacherCode:process.env.TEACHER_ACCESS_CODE}));
 assert.equal(teacher.status,201);
 const tc=cookieOf(teacher);
 const student=await run(jsonReq('register',{klass:'BG11A',nickname:'Lernender',password:'passwort123',role:'student'}));
 assert.equal(student.status,201);
 const sc=cookieOf(student);
 const studentBody=await student.json();
 const dup=await run(jsonReq('register',{klass:'BG11A',nickname:'Lernender',password:'passwort123',role:'student'}));
 assert.equal(dup.status,409);
 const otherClass=await run(jsonReq('register',{klass:'BG11B',nickname:'Lernender',password:'passwort123',role:'student'}));
 assert.equal(otherClass.status,201);
 const wrongPwd=await run(jsonReq('login',{klass:'BG11A',nickname:'Lernender',password:'falsch000'}));
 assert.equal(wrongPwd.status,401);
 const progress={answers:{'r1':{value:0,checked:true,correct:true,solutionViewed:false},'r2':{value:{0:'Kundenservice',1:'Design',2:'Lager',3:'Produktion'},checked:true,correct:true}},skills:{0:{rating:4,done:true}}};
 const saved=await run(jsonReq('progress',{revision:0,progress},sc));assert.equal(saved.status,200);
 const sv=await saved.json();assert.equal(sv.xp,55);
 const denied=await run(getReq('classroom',sc));assert.equal(denied.status,403);
 const classroom=await run(getReq('classroom',tc));assert.equal(classroom.status,200);
 const students=(await classroom.json()).students;
 assert.equal(students.length,1);assert.equal(students[0].exerciseDone,2);
 const diagramProgress={answers:{...progress.answers,'w6':{value:'',checked:true,selfAssessed:true,solutionViewed:true,correct:true}}};
 const diagramSaved=await run(jsonReq('progress',{revision:0,progress:diagramProgress},sc));assert.equal(diagramSaved.status,200);
 const diagramMe=await run(getReq('me',sc));assert.equal(diagramMe.status,200);
 const diagramEntry=(await diagramMe.json()).progress.answers['w6'];
 assert.equal(diagramEntry.correct,true,'draw.io darf nach Lösungssicht und Selbstprüfung ohne schriftliche Notiz als gelöst gelten');
 assert.equal(diagramEntry.value,'');
 const uid=studentBody.user.id;
 const reset=await run(jsonReq('reset-student',{id:uid},tc));assert.equal(reset.status,200);
 const stale=await run(jsonReq('progress',{revision:0,progress},sc));assert.equal(stale.status,409);
 const resetPwd=await run(jsonReq('reset-password',{id:uid},tc));assert.equal(resetPwd.status,200);
 const temp=(await resetPwd.json()).temporaryPassword;
 assert.ok(temp.length>=12);
 const newLogin=await run(jsonReq('login',{klass:'BG11A',nickname:'Lernender',password:temp}));assert.equal(newLogin.status,200);
 const nc=cookieOf(newLogin); assert.equal((await newLogin.json()).user.requirePasswordChange,true);
 const changed=await run(jsonReq('change-password',{oldPassword:temp,newPassword:'SicheresPasswort123'},nc));assert.equal(changed.status,200);
 const remove=await run(jsonReq('remove-student',{id:uid,confirm:'Lernender'},tc));assert.equal(remove.status,200);
 const cls2=await run(getReq('classroom',tc));assert.equal((await cls2.json()).students.length,0);
 const invalidSession=await run(getReq('me',sc));assert.equal(invalidSession.status,401);
});
