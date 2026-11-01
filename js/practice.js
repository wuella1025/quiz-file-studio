/** 依練習模式篩出可用題目，使用目前科目的進度資料。 */
export function candidates(bank,progress,mode,chapter='all'){
 let pool=bank.questions.filter(q=>q.type!=='unsupported');
 if(mode==='chapter')pool=pool.filter(q=>q.chapterId===chapter);
 if(mode==='unpracticed')pool=pool.filter(q=>!(Number(progress[q.id]?.attempts)>0));
 if(mode==='wrong')pool=pool.filter(q=>Number(progress[q.id]?.wrong)>0 && !progress[q.id]?.mastered);
 if(mode==='favorites')pool=pool.filter(q=>!!progress[q.id]?.favorite);
 return pool;
}
export function shuffle(items,random=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
/** 建立本次練習題號清單；選題與順序不會修改原始題庫。 */
export function selectQuestions(bank,progress,{mode,chapter,count,random}){
 const pool=candidates(bank,progress,mode,chapter);
 return (mode==='random'||random?shuffle(pool):pool).slice(0,Math.max(1,Math.min(pool.length,Number(count)||pool.length)));
}
/** 按題型判分；問答題回傳 null，由使用者自行確認。 */
export function grade(question,answer){if(question.type==='single')return answer===question.answer;if(question.type==='multiple')return Array.isArray(answer)&&answer.length===question.answer.length&&answer.every(v=>question.answer.includes(v));if(question.type==='text'){const norm=v=>String(v??'').trim().normalize('NFKC').toLowerCase();return (Array.isArray(question.answer)?question.answer:[question.answer]).some(v=>norm(v)===norm(answer));}if(question.type==='boolean'){const truth=v=>{const x=String(v).trim().toLowerCase();return ['true','是','對','正確'].includes(x)?'true':['false','非','錯','錯誤'].includes(x)?'false':x};return truth(answer)===truth(question.answer);}return null;}
/** 更新單題累積作答紀錄（含答對、答錯及連對）。 */
export function recordAnswer(progress,question,answer,correct,at=new Date().toISOString()){
 if(typeof correct!=='boolean')throw new Error('不支援的題型不能自動判分');
 const r=progress[question.id]||{};
 progress[question.id]={...r,attempts:(Number(r.attempts)||0)+1,correct:(Number(r.correct)||0)+(correct?1:0),wrong:(Number(r.wrong)||0)+(correct?0:1),lastAnswer:answer,lastCorrect:correct,lastAt:at,lastWrongAt:correct?(r.lastWrongAt||null):at,corrected:correct?(Number(r.wrong)>0?true:!!r.corrected):false,mastered:correct?((Number(r.streak)||0)+1>=3):false,streak:correct?(Number(r.streak)||0)+1:0};
 return progress[question.id];
}
/** 統計本次已確認作答結果，未作答不列入正確率分母。 */
export function sessionResult(session){const submitted=Object.values(session.answers).filter(a=>a.confirmed),correct=submitted.filter(a=>a.correct).length;return {total:session.ids.length,answered:submitted.length,correct,wrong:submitted.length-correct,accuracy:submitted.length?correct/submitted.length*100:0};}

/** Keep historical mistakes permanently; mastering only changes review status. */
export function mistakeStatus(record){
 if(!record||!(Number(record.wrong)>0))return 'never';
 if(record.mastered)return 'mastered';
 return record.corrected?'corrected':'review';
}
export function toggleFavorite(progress,id){
 const record=progress[id]||{};
 progress[id]={...record,favorite:!record.favorite};
 return progress[id].favorite;
}
export function setFavoriteNote(progress,id,note){
 const record=progress[id]||{};
 progress[id]={...record,note:String(note)};
}
export function markCorrected(progress,id,corrected){
 const record=progress[id];
 if(!record||!(Number(record.wrong)>0))return false;
 record.corrected=!!corrected;
 return true;
}
/** Grade every saved draft once when the user finishes without pressing confirm. */
/** 結算時自動確認已填答案，保留無答案題目為未作答。 */
export function finalizeDraftAnswers(session,bank,progress,at=new Date().toISOString()){
 let autoConfirmed=0;
 for(const id of session.ids){
  const draft=session.answers[id];
  if(!draft||draft.confirmed)continue;
  const value=draft.value;
  if(value===undefined||value===null||value===''||(Array.isArray(value)&&!value.length))continue;
  const question=bank.questionMap.get(id);
  if(!question)continue;
  const correct=grade(question,value);
  if(typeof correct!=='boolean')continue;
  session.answers[id]={value,correct,confirmed:true,at};
  recordAnswer(progress,question,value,correct,at);
  autoConfirmed++;
 }
 return autoConfirmed;
}
