/** Escaped Markdown renderer. No raw HTML, images or embedded scripts. */
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function inline(src){
  // Escape HTML first; links only allow http(s), mailto, and relative paths.
  let s=escapeHtml(src);
  const codes=[];
  s=s.replace(/`([^`\n]+)`/g,(_,v)=>{const i=codes.push(`<code>${v}</code>`)-1;return `\u0001${i}\u0002`;});
  s=s.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g,(_,label,target)=>{
    const url=target.replace(/&amp;/g,'&');
    if(!/^(https?:\/\/|mailto:|\.?\.?\/|#)/i.test(url))return label;
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
  s=s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/~~(.+?)~~/g,'<del>$1</del>');
  s=s.replace(/(^|[^*])\*([^*\n]+)\*/g,'$1<em>$2</em>');
  s=s.replace(/\u0001(\d+)\u0002/g,(_,n)=>codes[Number(n)]||'');
  return s;
}
/** 將可信資料結構中的文字轉成安全的 Markdown HTML；跳脫原始 HTML，不執行使用者腳本。 */
export function renderMarkdown(text){
 const lines=String(text??'').replace(/\r\n?/g,'\n').split('\n');
 const html=[];let para=[],list=[],listType='',fenced=false,lang='',code=[];
 const flushPara=()=>{if(para.length){html.push(`<p>${para.map(inline).join('<br>')}</p>`);para=[];}};
 const flushList=()=>{if(list.length){html.push(`<${listType}>${list.map(x=>`<li>${inline(x)}</li>`).join('')}</${listType}>`);list=[];listType='';}};
 for(const line of lines){
  const fence=line.match(/^\s*```\s*([\w+#.-]*)\s*$/);
  if(fence){flushPara();flushList();if(fenced){html.push(`<pre class="markdown-code"><code class="language-${escapeHtml(lang)}">${escapeHtml(code.join('\n'))}</code></pre>`);code=[];fenced=false;}else{fenced=true;lang=fence[1]||'text';}continue;}
  if(fenced){code.push(line);continue;}
  if(!line.trim()){flushPara();flushList();continue;}
  const h=line.match(/^\s*(#{1,6})\s+(.+)$/);if(h){flushPara();flushList();const n=h[1].length;html.push(`<h${n}>${inline(h[2])}</h${n}>`);continue;}
  const quote=line.match(/^\s*>\s?(.*)$/);if(quote){flushPara();flushList();html.push(`<blockquote>${inline(quote[1])}</blockquote>`);continue;}
  if(/^\s*(?:---+|\*\*\*+)\s*$/.test(line)){flushPara();flushList();html.push('<hr>');continue;}
  const li=line.match(/^\s*(?:([-*+])|(\d+)\.)\s+(.+)$/);
  if(li){flushPara();const kind=li[2]?'ol':'ul';if(listType&&listType!==kind)flushList();listType=kind;list.push(li[3]);continue;}
  flushList();para.push(line);
 }
 if(fenced)html.push(`<pre class="markdown-code"><code class="language-${escapeHtml(lang)}">${escapeHtml(code.join('\n'))}</code></pre>`);
 flushPara();flushList();return `<div class="markdown-body">${html.join('')}</div>`;
}
