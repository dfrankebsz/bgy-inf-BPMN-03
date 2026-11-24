import { getStore } from '@netlify/blobs';
import { randomBytes, randomUUID, createHash, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import PDFDocument from 'pdfkit';
import { ALL_TASKS, TASKS, TEST, CHAPTERS, SKILLS, SHOP, grade, earnedXp, wallet, newProgress, COURSE_TITLE, COURSE_VERSION } from '../../course-data.js';

const scrypt = promisify(scryptCb);
const REGION = 'eu-central-1';
const COOKIE = 'bpmn_ue4_session';
const MAX_SESSION = 60 * 60 * 24 * 30;
const HEADERS = { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' };
const accounts = () => getStore({ name:'bpmn-ue4-accounts-v1', region:REGION, consistency:'strong' });
const progressStore = () => getStore({ name:'bpmn-ue4-progress-v1', region:REGION, consistency:'strong' });
const sessions = () => getStore({ name:'bpmn-ue4-sessions-v1', region:REGION, consistency:'strong' });
const sha = value => createHash('sha256').update(value).digest('hex');
const encode = value => encodeURIComponent(value);
const accountKey = (klass, nickname) => `${encode(klass)}/${sha(nickname.toLocaleLowerCase('de-DE'))}`;
const accountPath = a => a.key;
const res = (data, status=200, headers={}) => new Response(JSON.stringify(data), {status,headers:{...HEADERS,...headers}});
const fail = (msg, status=400) => res({ok:false,error:msg}, status);
const getJson = (s,k)=>s.get(k,{type:'json'});
const errText = e => { console.error('API error:',e?.message||e); return fail('Serverfehler. Bitte versuchen Sie es erneut.',500); };
const sanitizeClass = v => String(v??'').trim().normalize('NFKC').toUpperCase().replace(/\s+/g,'');
const sanitizeNick = v => String(v??'').trim().normalize('NFKC').replace(/\s+/g,' ');
const validClass = v => /^[A-Z0-9_-]{2,24}$/.test(v);
const validNick = v => v.length>=3 && v.length<=24 && /^[\p{L}\p{N}][\p{L}\p{N}_. -]*[\p{L}\p{N}]$/u.test(v);
const validPass = p => typeof p==='string' && p.length>=8 && p.length<=100;
const equalSecret = (a,b) => {if(!a||!b)return false; const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);};
const passwordHash = async (password,salt)=> (await scrypt(password,salt,64)).toString('hex');
const cookieValue = req => {const str=req.headers.get('cookie')||'';return str.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';};
const setCookie = (token,maxAge=MAX_SESSION,secure=true)=>`${COOKIE}=${token}; Path=/; HttpOnly; ${secure?'Secure; ':''}SameSite=Lax; Max-Age=${maxAge}`;
const publicAccount = a => ({id:a.id,nickname:a.nickname,klass:a.klass,role:a.role,requirePasswordChange:!!a.requirePasswordChange,revision:a.revision||0});
async function auth(req){
 const token=cookieValue(req); if(!/^[a-f0-9]{64}$/.test(token))return null;
 const session=await getJson(sessions(),sha(token));
 if(!session || session.expires<Date.now())return null;
 const user=await getJson(accounts(),session.accountKey);
 if(!user || user.id!==session.id || (session.sessionVersion||0)!==(user.sessionVersion||0))return null;
 return {user,session,token};
}
function safeValue(task,v){
 if(task.type==='text')return String(v??'').slice(0,3500);
 if(task.type==='numeric')return String(v??'').slice(0,50);
 if(task.type==='tf')return typeof v==='boolean'?v:null;
 if(task.type==='single')return Number.isInteger(Number(v))?Number(v):null;
 if(task.type==='multi')return Array.isArray(v)?[...new Set(v.slice(0,12).map(Number).filter(Number.isInteger))]:[];
 if(task.type==='order')return Array.isArray(v)?v.slice(0,12).map(String):[];
 if(task.type==='slots')return Array.isArray(v)?v.slice(0,12).map(x=>['start','end','task','xor','and','pool','lane','msgSend','msgCatch','msgFlow','seq','data','dataAssoc','terminate'].includes(x)?x:''):[];
 if(task.type==='category'||task.type==='match'){
  const ret={}; task.items.forEach((item,i)=>{if(v && typeof v==='object' && typeof v[i]==='string' && v[i].length<180)ret[i]=v[i];});return ret;
 }
 return null;
}
function cleanProgress(input, old=newProgress()){
 const result={...newProgress(), ...old, answers:{}, owned:Array.isArray(old.owned)?old.owned.filter(x=>SHOP.some(s=>s.id===x)):[], appearance:old.appearance||newProgress().appearance, skills:{}, lastChapter:CHAPTERS.some(x=>x.id===input?.lastChapter)?input.lastChapter:old.lastChapter};
 const from=input?.answers && typeof input.answers==='object'?input.answers:{};
 for(const t of ALL_TASKS){
  const entry=from[t.id];if(!entry||typeof entry!=='object')continue;
  const value=safeValue(t,entry.value);
  const checked=entry.checked===true;
  const solutionViewed=entry.solutionViewed===true;
  const selfAssessed=entry.selfAssessed===true;
  const correct=t.type==='text' ? checked&&selfAssessed&&solutionViewed&&(t.drawio||value.trim().length>0) : checked&&grade(t,value)===true;
  result.answers[t.id]={value,checked,solutionViewed,selfAssessed,correct,attempts:Math.min(99,Math.max(0,Number(entry.attempts)||0))};
 }
 for(let i=0;i<SKILLS.length;i++){
  const s=input?.skills?.[i]; if(s && Number.isInteger(Number(s.rating)) && s.rating>=1&&s.rating<=5){result.skills[i]={rating:Number(s.rating),done:s.done===true};}
 }
 result.updatedAt=new Date().toISOString();
 return result;
}
async function newSession(user){const token=randomBytes(32).toString('hex');await sessions().setJSON(sha(token),{id:user.id,accountKey:user.key,expires:Date.now()+MAX_SESSION*1000,sessionVersion:user.sessionVersion||0});return token;}
async function bodyJson(req){if(Number(req.headers.get('content-length')||0)>600000)throw new Error('body too large');const txt=await req.text();if(txt.length>600000)throw new Error('body too large');return txt?JSON.parse(txt):{};}
async function getUserProgress(user){
 const p=await getJson(progressStore(),user.id) || newProgress();
 let migrated=false;
 for(const entry of Object.values(p.answers||{}))if(entry && typeof entry==='object' && Object.hasOwn(entry,'imageData')){delete entry.imageData;migrated=true;}
 if(migrated)await progressStore().setJSON(user.id,p);
 return p;
}
async function getOneFromClass(teacher,id){const {blobs}=await accounts().list({prefix:`${encode(teacher.klass)}/`});if(blobs.length>1500)throw new Error('Zu viele Nutzer in der Klasse');for(const x of blobs){const a=await getJson(accounts(),x.key);if(a && a.role==='student' && a.id===id && a.klass===teacher.klass)return a;}return null;}
async function getClassStudents(user){const {blobs}=await accounts().list({prefix:`${encode(user.klass)}/`});if(blobs.length>1500)throw new Error('Zu viele Nutzer in der Klasse');const arr=[];for(const x of blobs){const a=await getJson(accounts(),x.key);if(!a||a.role!=='student'||a.klass!==user.klass)continue;const p=await getUserProgress(a);const exercises=TASKS.filter(t=>!t.bonus&&p.answers[t.id]?.correct).length;arr.push({id:a.id,nickname:a.nickname,exerciseDone:exercises,exerciseTotal:TASKS.filter(t=>!t.bonus).length,testDone:TEST.filter(t=>p.answers[t.id]?.correct).length,xp:earnedXp(p),lastActivity:p.updatedAt||null,skillsDone:Object.values(p.skills||{}).filter(x=>x.done).length,needsPasswordChange:!!a.requirePasswordChange});}return arr.sort((a,b)=>a.nickname.localeCompare(b.nickname,'de'));}
function nowISO(){return new Date().toISOString()}
function generatePassword(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!';return Array.from(randomBytes(16),n=>chars[n%chars.length]).join('');}
function formatAnswer(task,val){
 if(task.type==='single')return task.options[val]??'Keine Antwort';
 if(task.type==='tf')return val===true?'Richtig':val===false?'Falsch':'Keine Antwort';
 if(task.type==='multi')return Array.isArray(val)?val.map(i=>task.options[i]).filter(Boolean).join('; '):'Keine Antwort';
 if(task.type==='match'||task.type==='category')return task.items.map((item,i)=>`${item.text}: ${val?.[i]??'–'}`).join('\n');
 if(task.type==='order')return (val||[]).map((id,i)=>`${i+1}. ${task.steps.find(x=>x.id===id)?.text||id}`).join('\n');
 if(task.type==='slots')return (val||[]).map((v,i)=>`Position ${i+1}: ${{start:'Startereignis',task:'Tätigkeit',xor:'XOR-Gateway',and:'AND-Gateway',end:'Endereignis',pool:'Pool',lane:'Lane',msgSend:'Nachricht senden',msgCatch:'Nachricht empfangen',msgFlow:'Nachrichtenfluss',seq:'Sequenzfluss',data:'Datenobjekt',dataAssoc:'Datenassoziation',terminate:'Terminierungs-Endereignis'}[v]||'–'}`).join('\n');
 return String(val??'');
}
async function makePDF(body,user){
 const clean=cleanProgress(body.progress||{},newProgress());
 const title=String(user?.nickname||body.nickname||'Gast').slice(0,30);
 const klass=String(user?.klass||body.klass||'ohne Klassenangabe').slice(0,30);
 const doc=new PDFDocument({size:'A4',margin:48,info:{Title:'Lernportfolio – BPMN UE 4',Author:'BPMN-Labor UE 4'},compress:true});
 const chunks=[];doc.on('data',c=>chunks.push(c));
 const complete=new Promise((resolve,reject)=>{doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject)});
 const M=doc.page.margins.left, W=doc.page.width-M-doc.page.margins.right;
 const ensure=(height=90)=>{if(doc.y+height>doc.page.height-52)doc.addPage();};
 doc.fillColor('#13314c').font('Helvetica-Bold').fontSize(21).text('Lernportfolio – BPMN 2.0 · UE 4',{width:W});
 doc.moveDown(.5).font('Helvetica').fontSize(10).fillColor('#425569').text(`Kurs: ${COURSE_TITLE}`);
 doc.text(`Name: ${title}   ·   Klasse: ${klass}   ·   Ausgabe: ${new Date().toLocaleDateString('de-DE')}`);
 doc.moveDown(.7).fontSize(9).text('Enthalten sind die eingegebenen Antworten bereits bearbeiteter Aufgaben. Freitext-Selbsteinschätzungen sind keine automatische fachliche Prüfung.');
 let count=0;
 for(const ch of [...CHAPTERS,{id:'test',title:'Abschlusstest'}]){
  const items=ALL_TASKS.filter(t=>{const entry=clean.answers[t.id];if(t.chapter!==ch.id||!entry)return false;const v=entry.value;return entry.checked||(typeof v==='string'&&v.trim().length>0)||(Array.isArray(v)&&v.length>0)||(v&&typeof v==='object'&&Object.values(v).some(Boolean))||typeof v==='boolean'||Number.isInteger(v);});
  if(!items.length)continue;
  ensure(70);doc.moveDown(1).font('Helvetica-Bold').fontSize(15).fillColor('#163b59').text(ch.title,{width:W});doc.moveDown(.25);
  for(const t of items){count++;ensure(105);const entry=clean.answers[t.id];
   doc.fillColor('#222').font('Helvetica-Bold').fontSize(10).text(`${count}. ${t.prompt.replace(/^BONUS:\s*/,'Bonus: ')}`,{width:W});
   doc.moveDown(.2).font('Helvetica').fontSize(10).fillColor('#34445b').text(t.drawio && !String(entry.value||'').trim()?'Diagramm lokal in draw.io bearbeitet; keine schriftliche Anmerkung.':formatAnswer(t,entry.value),{width:W});
   doc.moveDown(.25).fontSize(8).fillColor('#66768b').text(t.type==='text' ? `Selbsteinschätzung: ${entry.correct?'als richtig markiert':entry.checked?'als zu überarbeiten markiert':'noch nicht abgeschlossen'}` : `Automatische Prüfung: ${entry.correct?'richtig':entry.checked?'nicht richtig':'noch nicht geprüft'}`,{width:W});
   doc.moveDown(.6);doc.strokeColor('#e7ebef').moveTo(M,doc.y).lineTo(M+W,doc.y).stroke();doc.moveDown(.45);
  }
 }
 if(!count)doc.moveDown(1).fillColor('#333').text('Noch keine bearbeiteten Aufgaben vorhanden.');
 doc.end(); return complete;
}
export default async function handler(req){
 const url=new URL(req.url);const parts=url.pathname.split('/');const route=parts[parts.length-1]||'';const method=req.method;
 if(method==='OPTIONS')return new Response(null,{status:204});
 if(!['GET','POST'].includes(method))return fail('Methode nicht erlaubt.',405);
 if(method==='POST'){
  const origin=req.headers.get('origin'); if(origin && origin!==url.origin)return fail('Ungültige Herkunft.',403);
  if(!(req.headers.get('content-type')||'').includes('application/json'))return fail('JSON erforderlich.',415);
 }
 try{
  if(route==='register' && method==='POST'){
   const input=await bodyJson(req),klass=sanitizeClass(input.klass),nickname=sanitizeNick(input.nickname),password=input.password;
   if(!validClass(klass))return fail('Klasse: 2–24 Zeichen (Buchstaben, Ziffern, _ oder -).');
   if(!validNick(nickname))return fail('Nickname: 3–24 Zeichen, Buchstaben/Zahlen sowie _ . - und Leerzeichen.');
   if(!validPass(password))return fail('Passwort: mindestens 8 und höchstens 100 Zeichen.');
   const role=input.role==='teacher'?'teacher':'student';
   if(role==='teacher'){
    if(!process.env.TEACHER_ACCESS_CODE || process.env.TEACHER_ACCESS_CODE.length<12)return fail('Lehrerregistrierung nicht eingerichtet. Setzen Sie TEACHER_ACCESS_CODE mit mindestens 12 Zeichen in Netlify.',503);
    if(!equalSecret(input.teacherCode,process.env.TEACHER_ACCESS_CODE))return fail('Lehrercode ist nicht korrekt.',403);
   }
   const key=accountKey(klass,nickname);const salt=randomBytes(16).toString('hex');const hash=await passwordHash(password,salt);
   const user={id:randomUUID(),key,klass,nickname,role,salt,hash,revision:0,sessionVersion:0,createdAt:nowISO(),failed:0,lockedUntil:0,requirePasswordChange:false};
   try{const created=await accounts().setJSON(key,user,{onlyIfNew:true});if(created?.modified===false)return fail('Dieser Nickname ist in der Klasse bereits vergeben.',409);}catch(e){if((await getJson(accounts(),key)))return fail('Dieser Nickname ist in der Klasse bereits vergeben.',409);throw e;}
   await progressStore().setJSON(user.id,newProgress());const token=await newSession(user);
   return res({ok:true,user:publicAccount(user),progress:newProgress()},201,{'Set-Cookie':setCookie(token,MAX_SESSION,new URL(req.url).protocol==='https:')});
  }
  if(route==='login' && method==='POST'){
   const data=await bodyJson(req),klass=sanitizeClass(data.klass),nick=sanitizeNick(data.nickname);
   if(!validClass(klass)||!validNick(nick)||typeof data.password!=='string')return fail('Klasse, Nickname oder Passwort nicht korrekt.',401);
   const key=accountKey(klass,nick),user=await getJson(accounts(),key);
   if(!user)return fail('Klasse, Nickname oder Passwort nicht korrekt.',401);
   if(user.lockedUntil>Date.now())return fail('Zu viele Fehlversuche. Bitte später erneut versuchen.',429);
   const hash=await passwordHash(data.password,user.salt);const match=equalSecret(hash,user.hash);
   if(!match){const failed=(user.failed||0)+1;user.failed=failed;user.lockedUntil=failed>=8?Date.now()+15*60*1000:0;await accounts().setJSON(key,user);return fail('Klasse, Nickname oder Passwort nicht korrekt.',401);}
   user.failed=0;user.lockedUntil=0;await accounts().setJSON(key,user);
   const token=await newSession(user);return res({ok:true,user:publicAccount(user),progress:await getUserProgress(user)},200,{'Set-Cookie':setCookie(token,MAX_SESSION,new URL(req.url).protocol==='https:')});
  }
  if(route==='logout' && method==='POST'){
   const authd=await auth(req);if(authd)await sessions().delete(sha(authd.token));return res({ok:true},200,{'Set-Cookie':setCookie('',0,new URL(req.url).protocol==='https:')});
  }
  if(route==='pdf' && method==='POST'){
   const data=await bodyJson(req);const a=await auth(req);const bytes=await makePDF(data,a?.user||null);
   return new Response(bytes,{status:200,headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="bpmn-ue4-portfolio.pdf"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
  const a=await auth(req);if(!a)return fail('Nicht angemeldet.',401);
  const user=a.user;
  if(route==='me' && method==='GET')return res({ok:true,user:publicAccount(user),progress:await getUserProgress(user)});
  if(route==='progress' && method==='POST'){
   if(user.requirePasswordChange)return fail('Bitte zunächst Ihr vorläufiges Passwort ändern.',403);
   const data=await bodyJson(req);
   if(data.revision!==user.revision)return res({ok:false,error:'Der Fortschritt wurde von der Lehrkraft zurückgesetzt. Bitte Seite neu laden.',stale:true,progress:await getUserProgress(user),revision:user.revision},409);
   const previous=await getUserProgress(user),clean=cleanProgress(data.progress,previous);
   await progressStore().setJSON(user.id,clean);return res({ok:true,xp:earnedXp(clean),wallet:wallet(clean),updatedAt:clean.updatedAt});
  }
  if(route==='buy' && method==='POST'){
   if(user.requirePasswordChange)return fail('Bitte zuerst Passwort ändern.',403);
   const data=await bodyJson(req),item=SHOP.find(x=>x.id===data.item);
   if(!item)return fail('Gegenstand nicht gefunden.');
   const p=await getUserProgress(user);
   if(p.owned.includes(item.id))return fail('Bereits freigeschaltet.');
   if(wallet(p)<item.price)return fail('Nicht genug verfügbare XP.',409);
   p.owned.push(item.id);p.updatedAt=nowISO();await progressStore().setJSON(user.id,p);
   return res({ok:true,progress:p});
  }
  if(route==='appearance' && method==='POST'){
   const data=await bodyJson(req),p=await getUserProgress(user);
   const allowed=(id,kind)=> id===null || (kind==='avatar' && id==='default') || (SHOP.some(x=>x.id===id&&x.kind===kind)&&p.owned.includes(id));
   if(!['avatar','pet','outfit'].includes(data.kind)||!allowed(data.item,data.kind))return fail('Avatar-Zubehör nicht freigeschaltet.',403);
   p.appearance[data.kind]=data.item;p.updatedAt=nowISO();await progressStore().setJSON(user.id,p);return res({ok:true,progress:p});
  }
  if(route==='change-password' && method==='POST'){
   const data=await bodyJson(req);if(!validPass(data.newPassword))return fail('Neues Passwort muss 8–100 Zeichen haben.');
   const actual=await passwordHash(String(data.oldPassword||''),user.salt);if(!equalSecret(actual,user.hash))return fail('Bisheriges Passwort nicht korrekt.',403);
   user.salt=randomBytes(16).toString('hex');user.hash=await passwordHash(data.newPassword,user.salt);user.requirePasswordChange=false;user.sessionVersion=(user.sessionVersion||0)+1;
   await accounts().setJSON(accountPath(user),user);await sessions().delete(sha(a.token));const fresh=await newSession(user);return res({ok:true,user:publicAccount(user)},200,{'Set-Cookie':setCookie(fresh,MAX_SESSION,new URL(req.url).protocol==='https:')});
  }
  if(user.role!=='teacher')return fail('Nur für Lehrkräfte.',403);
  if(route==='classroom' && method==='GET')return res({ok:true,klass:user.klass,students:await getClassStudents(user)});
  if(route==='reset-class' && method==='POST'){
   const data=await bodyJson(req);if(data.confirm!==`RESET ${user.klass}`)return fail(`Zur Bestätigung genau „RESET ${user.klass}“ eingeben.`);
   const {blobs}=await accounts().list({prefix:`${encode(user.klass)}/`});let count=0;
   for(const b of blobs){const student=await getJson(accounts(),b.key);if(!student||student.role!=='student'||student.klass!==user.klass)continue;student.revision=(student.revision||0)+1;await accounts().setJSON(b.key,student);await progressStore().setJSON(student.id,newProgress());count++;}
   return res({ok:true,resetCount:count});
  }
  if(['remove-student','reset-student','reset-password'].includes(route) && method==='POST'){
   const data=await bodyJson(req),student=await getOneFromClass(user,data.id);
   if(!student)return fail('Schülerkonto in dieser Klasse nicht gefunden.',404);
   if(route==='remove-student'){
    if(data.confirm!==student.nickname)return fail('Bitte zur Bestätigung den Nicknamen eingeben.');
    await progressStore().delete(student.id);await accounts().delete(student.key);return res({ok:true});
   }
   if(route==='reset-student'){
    student.revision=(student.revision||0)+1;await accounts().setJSON(student.key,student);await progressStore().setJSON(student.id,newProgress());return res({ok:true});
   }
   const temp=generatePassword();student.salt=randomBytes(16).toString('hex');student.hash=await passwordHash(temp,student.salt);student.requirePasswordChange=true;student.sessionVersion=(student.sessionVersion||0)+1;student.failed=0;student.lockedUntil=0;await accounts().setJSON(student.key,student);
   return res({ok:true,temporaryPassword:temp,nickname:student.nickname});
  }
  return fail('Endpunkt nicht gefunden.',404);
 }catch(e){return errText(e);}
}
