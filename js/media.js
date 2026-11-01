// Private source-page assets. Never sent to GitHub or a server.
const DB='shuati-bao-private-pages-v1', STORE='pages';
let activeNamespace='java-midterm';
export function setMediaSubject(id){activeNamespace=String(id||'java-midterm');}
const mediaKey=path=>activeNamespace+'::'+path;
function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
/** 以科目命名空間儲存圖片，避免各科互相覆蓋。 */
export async function saveMedia(pages){
 const db=await openDb();
 try {await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');const s=tx.objectStore(STORE);const range=IDBKeyRange.bound(activeNamespace+'::',activeNamespace+'::\uffff');s.openKeyCursor(range).onsuccess=e=>{const c=e.target.result;if(c){s.delete(c.primaryKey);c.continue();}else{for(const [path,blob] of pages)s.put(blob,mediaKey(path));}};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
 finally{db.close()}
}
async function readStoredMedia(path){const db=await openDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get(mediaKey(path));r.onsuccess=()=>{if(r.result){resolve(r.result);return;}if(activeNamespace==='java-midterm'){const old=tx.objectStore(STORE).get(path);old.onsuccess=()=>resolve(old.result||null);old.onerror=()=>reject(old.error);}else resolve(null)};r.onerror=()=>reject(r.error);});}finally{db.close()}}
// Read bundled static images if this subject has not imported them locally.
export async function getMedia(path){
 const blob=await readStoredMedia(path);
 if(blob)return blob;
 if(activeNamespace!=='java-midterm'||!safeMediaPath(path))return null;
 try{const response=await fetch(path,{cache:'force-cache'});if(!response.ok)return null;return await response.blob();}catch{return null;}
}
/** 只清除目前科目命名空間下的圖片資料。 */
export async function clearMedia(){const db=await openDb();try{await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');const s=tx.objectStore(STORE);const range=IDBKeyRange.bound(activeNamespace+'::',activeNamespace+'::\uffff');s.openKeyCursor(range).onsuccess=e=>{const c=e.target.result;if(c){s.delete(c.primaryKey);c.continue();}};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);})}finally{db.close()}}
export async function exportMedia(){
 const db=await openDb();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const out=[];const r=tx.objectStore(STORE).openCursor(IDBKeyRange.bound(activeNamespace+'::',activeNamespace+'::\uffff'));r.onsuccess=()=>{const c=r.result;if(c){out.push([c.key.slice(activeNamespace.length+2),c.value]);c.continue();}else resolve(out)};r.onerror=()=>reject(r.error);});}finally{db.close()}
}
export function safeMediaPath(path){return typeof path==='string'&&(/^(?:images\/chapter_[1-5]\/page_\d{3}|images\/question\/chapter_[1-5]\/[a-zA-Z0-9_-]+_\d{3})\.png$/).test(path)}
/** 讀取匯入 ZIP 並檢查題庫與媒體格式；不直接執行壓縮包內程式碼。 */
export async function parseQuestionZip(file){
 if(!window.JSZip)throw new Error('ZIP 解析模組未載入。');
 if(file.size>60*1024*1024)throw new Error('ZIP 超過 60 MB。');
 const zip=await window.JSZip.loadAsync(file,{checkCRC32:true});
 const key=Object.keys(zip.files).find(p=>/^(?:[^/]+\/)?Java五章章節練習完整題庫\.json$/.test(p));
 if(!key)throw new Error('ZIP 中找不到 Java五章章節練習完整題庫.json。');
 const text=await zip.files[key].async('string');
 if(text.length>5*1024*1024)throw new Error('JSON 超過 5 MB。');
 const raw=JSON.parse(text);
 const needed=new Set();for(const [ch,arr] of Object.entries(raw))if(/^chapter_[1-5]$/.test(ch)&&Array.isArray(arr))for(const q of arr)for(const p of [...(q.reference_page_images||[]),...(q.question_only_images||[]),...((q.contentBlocks||[]).filter(b=>b?.type==='image').map(b=>b.src))]){if(!safeMediaPath(p))throw new Error('不安全的圖片路徑：'+String(p));needed.add(p)}
 if(needed.size>1000)throw new Error('圖片數量超過 500。');
 const pages=new Map();let total=0;
 for(const path of needed){const entry=zip.files[path];if(!entry||entry.dir)throw new Error('題庫缺少參照圖片：'+path);const bytes=await entry.async('uint8array');if(bytes.length>4*1024*1024)throw new Error('單張圖片超過 4 MB：'+path);total+=bytes.length;if(total>90*1024*1024)throw new Error('圖片總量超過 70 MB。');if(bytes[0]!==137||bytes[1]!==80||bytes[2]!==78||bytes[3]!==71)throw new Error('圖片格式不是 PNG：'+path);pages.set(path,new Blob([bytes],{type:'image/png'}))}
 return {raw,pages};
}
