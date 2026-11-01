/** 所有統計來自當前科目題庫與已持久化的作答紀錄。 */
const count = value => Math.max(0, Number(value) || 0);
const percent = (part,total) => total > 0 ? part / total * 100 : 0;
/** 由目前科目題庫、累積答題紀錄與練習歷史產生儀表板統計。 */
export function learningStatistics(bank,progress={},history=[]){
  const sections=bank.chapters.map(ch=>{
    const questions=bank.questions.filter(q=>q.chapterId===ch.id);
    const entries=questions.map(q=>progress[q.id]||{});
    const practiced=entries.filter(r=>count(r.attempts)>0).length;
    const attempts=entries.reduce((n,r)=>n+count(r.attempts),0);
    const correct=entries.reduce((n,r)=>n+count(r.correct),0);
    const wrongAttempts=entries.reduce((n,r)=>n+count(r.wrong),0);
    const mistakes=entries.filter(r=>count(r.wrong)>0).length;
    const mastered=entries.filter(r=>count(r.wrong)>0&&r.mastered===true).length;
    return {id:ch.id,title:ch.title,total:questions.length,practiced,remaining:questions.length-practiced,attempts,correct,wrongAttempts,accuracy:percent(correct,attempts),progress:percent(practiced,questions.length),mistakes,mastered};
  });
  const validHistory=Array.isArray(history)?history.filter(h=>h&&typeof h==='object'&&Number.isFinite(Number(h.answered))&&Number.isFinite(Number(h.correct))&&Number(h.answered)>=0&&Number(h.correct)>=0&&Number(h.correct)<=Number(h.answered)&&!Number.isNaN(Date.parse(h.finishedAt))):[];
  // 舊版紀錄的 accuracy 可能不存在，因此統一依實際 correct / answered 重算。
  const sessions=validHistory.map(h=>({...h,answered:Number(h.answered),correct:Number(h.correct),accuracy:percent(Number(h.correct),Number(h.answered))})).sort((a,b)=>Date.parse(a.finishedAt)-Date.parse(b.finishedAt));
  const attempts=sections.reduce((n,s)=>n+s.attempts,0);
  const correct=sections.reduce((n,s)=>n+s.correct,0);
  const practiced=sections.reduce((n,s)=>n+s.practiced,0);
  const mistakeQuestions=sections.reduce((n,s)=>n+s.mistakes,0);
  const mastered=sections.reduce((n,s)=>n+s.mastered,0);
  const corrected=bank.questions.filter(q=>count(progress[q.id]?.wrong)>0&&progress[q.id]?.corrected===true&&!progress[q.id]?.mastered).length;
  const averageSession=sessions.length ? sessions.reduce((n,h)=>n+h.accuracy,0)/sessions.length : null;
  const bestSession=sessions.length ? Math.max(...sessions.map(h=>h.accuracy)) : null;
  return {total:bank.questions.length,practiced,remaining:bank.questions.length-practiced,attempts,correct,wrongAttempts:attempts-correct,accuracy:percent(correct,attempts),sections,mistakeQuestions,mastered,corrected,pending:mistakeQuestions-mastered,averageSession,bestSession,sessions,lastSession:sessions.at(-1)||null,favorites:bank.questions.filter(q=>progress[q.id]?.favorite).length};
}
