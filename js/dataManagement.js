import { normalizeBank } from './questionBank.js';
import { loadProgress, loadSession, loadHistory } from './storage.js';

export const LEGACY_ID = 'java-midterm';
const LIST_KEY = 'quizflow:subjects:v2';
const ACTIVE_KEY = 'quizflow:active:v2';
export const SUBJECT_ID = LEGACY_ID;
const BANK_KEY = `personal-quiz:bank:v1:${LEGACY_ID}`;
const bankKey = id => `quizflow:bank:v2:${id}`;
const HIDDEN_BUILTINS_KEY='tidang:hidden-builtins:v1';
export function hiddenBuiltins(storage=localStorage){try{const data=JSON.parse(storage.getItem(HIDDEN_BUILTINS_KEY)||'[]');return Array.isArray(data)?data:[];}catch{return [];}}
export function hideBuiltins(ids,storage=localStorage){storage.setItem(HIDDEN_BUILTINS_KEY,JSON.stringify([...new Set([...hiddenBuiltins(storage),...ids])].filter(id=>/^[a-zA-Z0-9_-]{1,70}$/.test(id))));}
export function unhideBuiltin(id,storage=localStorage){storage.setItem(HIDDEN_BUILTINS_KEY,JSON.stringify(hiddenBuiltins(storage).filter(x=>x!==id)));}
export function listSubjects(storage=localStorage){
  try { const list=JSON.parse(storage.getItem(LIST_KEY)||'[]');return Array.isArray(list)?list.filter(x=>x&&/^[a-zA-Z0-9_-]{1,70}$/.test(x.id)&&typeof x.name==='string'):[]; }catch{return []}
}
export function activeSubject(storage=localStorage){return storage.getItem(ACTIVE_KEY)||listSubjects(storage)[0]?.id||null;}
export function setActiveSubject(id,storage=localStorage){if(!listSubjects(storage).some(x=>x.id===id))throw new Error('找不到科目');storage.setItem(ACTIVE_KEY,id);}
/** 取得穩定科目 ID；未提供 ID 時使用內容雜湊避免不同題庫互相覆蓋。 */
export function subjectIdForBank(raw){
  const declared=typeof raw.subjectId==='string'?raw.subjectId:(typeof raw.subject==='string'?raw.subject:'');
  const slug=declared.trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
  if(slug)return slug;
  // Anonymous banks use a stable non-sensitive hash of the content.
  const json=JSON.stringify(raw);let h=2166136261;for(let i=0;i<json.length;i++){h=Math.imul(h^json.charCodeAt(i),16777619)}
  return 'bank-'+(h>>>0).toString(16);
}
/** 新增或更新科目索引，並設為目前科目。 */
export function registerSubject(raw,id,storage=localStorage){
 const list=listSubjects(storage),name=String(raw.subjectName||raw.subject||id).slice(0,120);
 if(!list.some(x=>x.id===id)){if(list.length>=50)throw new Error('科目數量超過上限');list.push({id,name});storage.setItem(LIST_KEY,JSON.stringify(list));}
 else {storage.setItem(LIST_KEY,JSON.stringify(list.map(x=>x.id===id?{id,name}:x)));}
 storage.setItem(ACTIVE_KEY,id);
}
/** 只移除指定科目的本機題庫與索引，不清除其他科目紀錄。 */
export function removeSubject(id,storage=localStorage){
 storage.removeItem(bankKey(id));const list=listSubjects(storage).filter(x=>x.id!==id);
 storage.setItem(LIST_KEY,JSON.stringify(list));if(storage.getItem(ACTIVE_KEY)===id){if(list.length)storage.setItem(ACTIVE_KEY,list[0].id);else storage.removeItem(ACTIVE_KEY);}
}
/** 遷移舊版 Java 題庫，保留既有學習紀錄鍵值。 */
export function migrateLegacy(storage=localStorage){
 if(storage.getItem(BANK_KEY)&&!storage.getItem(bankKey(LEGACY_ID))){
  const raw=JSON.parse(storage.getItem(BANK_KEY));
  // Existing record keys already contain java-midterm; keep them unchanged.
  storage.setItem(bankKey(LEGACY_ID),JSON.stringify(raw));registerSubject(raw,LEGACY_ID,storage);
 }
}

const keys = id => ({progress:`personal-quiz:v1:${id}`,session:`personal-quiz:session:v1:${id}`,history:`personal-quiz:history:v1:${id}`});
export function readImportedBank(storage=localStorage){
  const id=activeSubject(storage);if(!id)return null;
  const text=storage.getItem(bankKey(id));if(!text)return null;
  try { const raw=JSON.parse(text);return {bank:normalizeBank(raw,id),raw}; }
  catch(error){throw new Error(`已匯入的題庫無法載入：${error.message}`);}
}
export function validateImportedBank(text){
  let raw;
  try{raw=JSON.parse(text);}catch{throw new Error('匯入失敗：檔案不是有效 JSON。');}
  const bank=normalizeBank(raw,subjectIdForBank(raw));
  return {raw,bank};
}
export function saveImportedBank(raw,storage=localStorage){
 const id=subjectIdForBank(raw);normalizeBank(raw,id);
 storage.setItem(bankKey(id),JSON.stringify(raw));unhideBuiltin(id,storage);registerSubject(raw,id,storage);
}
export function removeImportedBank(storage=localStorage){const id=activeSubject(storage);if(id)removeSubject(id,storage);}
/** 清除本機匯入題庫索引，不會改寫 GitHub 公開檔案。 */
export function removeAllImportedBanks(storage=localStorage){const ids=listSubjects(storage).map(x=>x.id);for(const id of ids)removeSubject(id,storage);return ids;}
/** 匯出本機資料備份，供更換瀏覽器時還原。 */
export function createBackup(subjectId=SUBJECT_ID,storage=localStorage){
  const k=keys(subjectId);
  const parse=(key,fallback)=>{const text=storage.getItem(key);return text===null?fallback:JSON.parse(text);};
  return {format:'studyflow-backup',version:1,subjectId,exportedAt:new Date().toISOString(),progress:parse(k.progress,{}),session:parse(k.session,null),history:parse(k.history,[]),importedBank:parse(bankKey(subjectId),null)};
}
export function validateBackup(data,subjectId=SUBJECT_ID){
  if (JSON.stringify(data).length > 5 * 1024 * 1024) throw new Error('備份內容過大。');
  if(!data||typeof data!=='object'||Array.isArray(data)||data.format!=='studyflow-backup'||data.version!==1||data.subjectId!==subjectId)throw new Error('備份格式、版本或科目不符合目前網站。');
  if(!data.progress||typeof data.progress!=='object'||Array.isArray(data.progress)||!Array.isArray(data.history)||!(data.session===null||data.session===undefined||(typeof data.session==='object'&&!Array.isArray(data.session))))throw new Error('備份的作答紀錄、練習狀態或成績歷史格式錯誤。');
  if (Object.keys(data.progress).length > 20000 || data.history.length > 10000) throw new Error('備份紀錄數超過上限。');
  for(const h of data.history){
    if (!h || typeof h !== 'object' || Array.isArray(h) || !Number.isSafeInteger(h.answered) || h.answered < 0 || !Number.isSafeInteger(h.correct) || h.correct < 0 || h.correct > h.answered || typeof h.finishedAt !== 'string' || !Number.isFinite(Date.parse(h.finishedAt))) throw new Error('歷史成績資料無效。');
    if (h.ids !== undefined && (!Array.isArray(h.ids) || h.ids.length > 20000 || h.ids.some(id=>typeof id!=='string'||id.length>300))) throw new Error('歷史題號無效。');
    if (h.answers !== undefined && (!h.answers || typeof h.answers!=='object' || Array.isArray(h.answers) || Object.keys(h.answers).length>20000)) throw new Error('歷史答案資料無效。');
  }
  for(const [id,r] of Object.entries(data.progress)){
    if(id.length > 300 || !id.startsWith(`${subjectId}:`)||!r||typeof r!=='object'||Array.isArray(r))throw new Error('備份包含無效題目 ID 或紀錄。');
    if (r.note !== undefined && (typeof r.note!=='string' || r.note.length>5000)) throw new Error('備註內容過長。');
    for(const field of ['attempts','correct','wrong','streak'])if(r[field]!==undefined&&(!Number.isSafeInteger(r[field])||r[field]<0))throw new Error(`備份中 ${id} 的 ${field} 不合法。`);
    if((r.correct||0)+(r.wrong||0)>(r.attempts||0))throw new Error(`備份中 ${id} 的答題次數不一致。`);
  }
  if(data.session != null && (data.session.ids?.length > 20000 || Object.keys(data.session.answers||{}).length > 20000)) throw new Error('未完成練習資料過大。');
  if(data.session!=null&&(!Array.isArray(data.session.ids)||!data.session.answers||typeof data.session.answers!=='object'||Array.isArray(data.session.answers)))throw new Error('練習中的題目資料格式錯誤。');
  if(data.importedBank!==null&&data.importedBank!==undefined)normalizeBank(data.importedBank,subjectId);
  return data;
}
/** 驗證備份後還原，避免格式不符的資料損壞紀錄。 */
export function restoreBackup(data,subjectId=SUBJECT_ID,storage=localStorage){
  validateBackup(data,subjectId);
  const k=keys(subjectId);
  const entries=[[k.progress,JSON.stringify(data.progress)],[k.history,JSON.stringify(data.history)],[k.session,data.session==null?null:JSON.stringify(data.session)],[bankKey(subjectId),data.importedBank==null?null:JSON.stringify(data.importedBank)]];
  // Keep a snapshot so quota or storage errors do not leave a half-restored backup.
  const old=entries.map(([key])=>[key,storage.getItem(key)]);
  try{for(const [key,value] of entries){if(value===null)storage.removeItem(key);else storage.setItem(key,value);}}
  catch(error){for(const [key,value] of old){try{if(value===null)storage.removeItem(key);else storage.setItem(key,value);}catch{}}throw error;}
}
/** 重設科目學習紀錄，不刪除題庫本身。 */
export function resetLearning(subjectId=SUBJECT_ID,storage=localStorage){const k=keys(subjectId);for(const key of Object.values(k))storage.removeItem(key);}
export function storedInfo(bank,storage=localStorage){
  const progress=loadProgress(bank.subjectId),session=loadSession(bank.subjectId),history=loadHistory(bank.subjectId);
  const active=new Set(bank.questions.map(q=>q.id));
  return {activeRecords:Object.keys(progress).filter(id=>active.has(id)).length,orphanRecords:Object.keys(progress).filter(id=>!active.has(id)).length,hasSession:!!session,history:history.length};
}
