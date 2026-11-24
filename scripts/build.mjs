import {mkdir,cp,copyFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
const root=new URL('../',import.meta.url).pathname;
const dist=join(root,'dist');
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
for(const f of ['index.html','styles.css','course-data.js','app.js'])await copyFile(join(root,f),join(dist,f));
await cp(join(root,'assets'),join(dist,'assets'),{recursive:true});
console.log('Öffentliche Kursdateien unter dist/ bereitgestellt. Servercode und README sind nicht öffentlich im Publish-Ordner.');
