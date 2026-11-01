/** Parse the original chapter_* JSON without mutating the source. */
export function normalizeBank(raw, subjectId = 'java-midterm') {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('題庫最外層必須是以章節名稱為鍵的物件。');
  const chapters = [], questions = [], ids = new Set(), errors = [];
  if (Object.keys(raw).length > 100) throw new Error("章節數不可超過 100。");
  for (const [chapterKey, entries] of Object.entries(raw)) {
    if (chapterKey.length > 120) throw new Error("章節名稱過長。");
    if (Array.isArray(entries) && entries.length > 5000) throw new Error("單章最多 5000 題。");
    if (!Array.isArray(entries)) { if (['subject','subjectId','subjectName','schema_version','note'].includes(chapterKey)) continue; errors.push(`${chapterKey}：章節內容必須是題目陣列`); continue; }
    chapters.push({ id: chapterKey, title: /^chapter_(\d+)$/.test(chapterKey) ? `第 ${chapterKey.match(/\d+$/)[0]} 章` : chapterKey, count: entries.length });
    entries.forEach((q, index) => {
      const loc = `${chapterKey} 第 ${index + 1} 題`;
      if (!q || typeof q !== 'object' || Array.isArray(q)) { errors.push(`${loc}：題目不是物件`); return; }
      if (!['string','number'].includes(typeof q.id) || String(q.id).trim() === '') { errors.push(`${loc}：缺少有效 id`); return; }
      if (typeof q.question !== 'string' || !q.question.trim()) { errors.push(`${loc}：缺少題目內容`); return; }
      if (String(q.id).length > 120 || q.question.length > 12000) { errors.push(`${loc}：題號或題目內容過長`); return; }
      const id = `${subjectId}:${chapterKey}:${q.id}`;
      if (ids.has(id)) { errors.push(`${loc}：章節內重複 id ${q.id}`); return; }
      ids.add(id);
      const options = q.options && typeof q.options === 'object' && !Array.isArray(q.options) ? Object.entries(q.options) : [];
      if (options.length > 30 || options.some(([key,value])=>key.length > 80 || typeof value !== 'string' || value.length > 5000)) { errors.push(`${loc}：選項數量或內容超出限制`); return; }
      if (typeof q.explanation === 'string' && q.explanation.length > 20000) { errors.push(`${loc}：解析過長`); return; }
      // Explicit type metadata takes precedence; otherwise infer from the answer shape.
      const declared=String(q.type||q.question_type||'').toLowerCase();
      let type='unsupported';
      if (['essay','short_answer','open_ended','問答題','簡答題'].includes(declared)) type='essay';
      else if (['boolean','true_false','truefalse','是非題'].includes(declared)) type='boolean';
      else if (['multiple','multiple_choice','multi_select','多選題'].includes(declared)) type='multiple';
      else if (['text','fill_blank','fill_in_blank','填空題','填充題'].includes(declared)) type='text';
      else if (['single','single_choice','choice','單選題'].includes(declared)) type='single';
      else if (options.length && Array.isArray(q.answer)) type='multiple';
      else if (options.length && typeof q.answer==='string' && Object.prototype.hasOwnProperty.call(q.options,q.answer)) type='single';
      else if (typeof q.answer==='boolean') type='boolean';
      else if (!options.length && ['string','number'].includes(typeof q.answer)) type='text';
      const validKey=v=>typeof v==='string' && Object.prototype.hasOwnProperty.call(q.options,v);
      if(type==='single' && (!options.length||!validKey(q.answer)))errors.push(`${loc}：單選題的答案必須對應選項`);
      if(type==='multiple' && (!options.length||!Array.isArray(q.answer)||!q.answer.length||!q.answer.every(validKey)||new Set(q.answer).size!==q.answer.length))errors.push(`${loc}：多選答案無效`);
      if(type==='boolean' && typeof q.answer!=='boolean' && !['true','false','是','非','對','錯','正確','錯誤'].includes(String(q.answer).toLowerCase()) && !(options.length&&validKey(q.answer)))errors.push(`${loc}：是非題答案格式不正確`);
      if(type==='text' && !['string','number'].includes(typeof q.answer) && !(Array.isArray(q.answer)&&q.answer.length&&q.answer.every(a=>['string','number'].includes(typeof a))))errors.push(`${loc}：填充題需要可核對答案`);
      if(type==='essay' && !['string','number'].includes(typeof q.answer) && q.answer!==null && q.answer!==undefined)errors.push(`${loc}：問答題參考答案格式不正確`);
      // Unsupported types remain in the bank for display, but are excluded from automatic practice.
      const validatePaths=(paths,pattern,label)=>{
        if(paths===undefined)return [];
        if(!Array.isArray(paths)||paths.length>8||paths.some(v=>typeof v!=='string'||!pattern.test(v))){errors.push(`${loc}：${label}路徑不正確`);return []}
        return paths;
      };
      const questionImages=validatePaths(q.question_only_images,/^images\/question\/chapter_[1-5]\/[a-zA-Z0-9_-]+_\d{3}\.png$/,'題目圖片');
      const referenceImages=validatePaths(q.reference_page_images,/^images\/chapter_[1-5]\/page_\d{3}\.png$/,'原頁圖片');
      const contentBlocks=[];
      if(q.contentBlocks!==undefined){
        if(!Array.isArray(q.contentBlocks)||q.contentBlocks.length>20){errors.push(`${loc}：內容區塊格式錯誤`);}
        else for(const block of q.contentBlocks){
          if(!block||typeof block!== 'object'||!['text','markdown','code','image'].includes(block.type)){errors.push(`${loc}：不支援的內容區塊`);continue;}
          if(block.type==='image'){
            if(typeof block.src!=='string'||!/^images\/question\/chapter_[1-5]\/[a-zA-Z0-9_-]+_\d{3}\.png$/.test(block.src)){errors.push(`${loc}：內容區塊圖片路徑無效`);continue;}
            contentBlocks.push({type:'image',src:block.src,alt:typeof block.alt==='string'?block.alt.slice(0,180):'題目附圖'});
          }else{
            if(typeof block.value!=='string'||block.value.length>20000){errors.push(`${loc}：內容區塊文字無效`);continue;}
            contentBlocks.push({type:block.type,value:block.value,language:block.type==='code'&&/^[a-z0-9+#-]{1,24}$/i.test(block.language||'')?block.language:'text'});
          }
        }
      }
      questions.push({id,originalId:q.id,chapterId:chapterKey,chapterTitle:chapters[chapters.length-1].title,text:q.question,options,answer:q.answer,explanation:typeof q.explanation==='string'?q.explanation:'',type,sourcePages:Array.isArray(q.source_pages)?q.source_pages:[],referenceImages,questionImages,contentBlocks});
    });
  }
  if (questions.length > 20000) errors.push("題庫不可超過 20000 題");
  if (!chapters.length || !questions.length) errors.push('題庫沒有有效題目');
  if (errors.length) throw new Error(`題庫驗證未通過（${errors.length} 個問題）：\n${errors.slice(0, 8).join('\n')}${errors.length > 8 ? '\n…' : ''}`);
  return { subjectId, subjectName: String(raw.subjectName||raw.subject||subjectId).slice(0,120), chapters, questions, questionMap: new Map(questions.map(q => [q.id, q])) };
}
