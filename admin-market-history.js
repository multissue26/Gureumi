(()=>{"use strict";
const F=MarketAdmin;
const HISTORY_API="https://cmimycfvvhugiyrwsior.supabase.co/functions/v1/ddingfarm-market-history-v2";
let days=7,mode="lowest",selected="",payload={series:[],items:[]};
const key=()=>mode==="lowest"?"lowest_stack64_price":"average_stack64_price";
function axisTime(stamp){
  const d=new Date(stamp);
  if(Number.isNaN(d.getTime()))return {date:"—",time:""};
  const parts=new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(d);
  const pick=t=>parts.find(p=>p.type===t)?.value||"";
  return {date:pick("month")+"."+pick("day"),time:pick("hour")+":"+pick("minute")};
}
function labelIndexes(count,width){
  if(count<=1)return new Set([0]);
  const max=width<620?3:width<900?4:6;
  const slots=Math.min(max,count),set=new Set([0,count-1]);
  for(let i=1;i<slots-1;i++)set.add(Math.round(i*(count-1)/(slots-1)));
  return set;
}
async function history(body={}){
  const r=await fetch(HISTORY_API,{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||("HTTP "+r.status));return j;
}
function groups(){const m=new Map();for(const p of payload.series||[]){const a=m.get(p.item_name)||[];a.push(p);m.set(p.item_name,a)}for(const a of m.values())a.sort((x,y)=>new Date(x.completed_at)-new Date(y.completed_at));return m}
function drawChart(){
  const a=groups().get(selected)||[],vals=a.map(x=>Number(x[key()])).filter(Number.isFinite),wrap=document.querySelector("#chartWrap");
  document.querySelector("#modeText").textContent=(mode==="lowest"?"최저가":"평균가")+" /64";
  document.querySelector("#chartLabel").textContent=(selected||"PRICE SERIES")+" · "+(mode==="lowest"?"최저가":"평균가");
  if(!selected||vals.length===0){wrap.innerHTML='<div class="chart-empty"><div><strong>차트를 그릴 스캔 기록이 없습니다</strong><p>/스캔 기록이 누적되면 자동으로 표시됩니다.</p></div></div>';["#chartCurrent","#sOpen","#sHigh","#sLow","#sStock","#lastTime"].forEach(s=>document.querySelector(s).textContent="—");document.querySelector("#pointCount").textContent="0회";document.querySelector("#chartChange").textContent="스캔 기록 대기 중";return}
  const data=a.filter(x=>Number.isFinite(Number(x[key()]))),values=data.map(x=>Number(x[key()]));const W=1000,H=390,L=80,R=80,T=24,B=88,min=Math.min(...values),max=Math.max(...values),pad=Math.max(1,(max-min)*.15),lo=Math.max(0,min-pad),hi=max+pad;
  const x=i=>L+(W-L-R)*(data.length===1?0:i/(data.length-1)),y=v=>T+(H-T-B)*(1-(v-lo)/(hi-lo||1));
  const pts=values.map((v,i)=>[x(i),y(v)]),line=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" "),area=line+" L "+pts.at(-1)[0]+" "+(H-B)+" L "+pts[0][0]+" "+(H-B)+" Z";
  const grid=[0,.25,.5,.75,1].map(t=>{const yy=T+(H-T-B)*t,val=hi-(hi-lo)*t;return '<line class="chart-grid" x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'"/><text class="axis-label" x="8" y="'+(yy+4)+'">'+Math.round(val).toLocaleString("ko-KR")+'</text>'}).join("");
  const visible=labelIndexes(data.length,wrap.clientWidth||1000);
  const labels=data.map((p,i)=>{
    if(!visible.has(i))return "";
    const anchor=i===0?"start":i===data.length-1?"end":"middle",pos=x(i),t=axisTime(p.completed_at);
    return '<text class="axis-label axis-time" text-anchor="'+anchor+'" x="'+pos+'" y="'+(H-42)+'"><tspan x="'+pos+'">'+t.date+'</tspan><tspan class="axis-time-sub" x="'+pos+'" dy="15">'+t.time+'</tspan></text>';
  }).join("");
  wrap.innerHTML='<svg id="priceChart" viewBox="0 0 1000 390" preserveAspectRatio="none" aria-label="가격 변동 차트" role="img"><defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2b7655" stop-opacity=".22"/><stop offset="100%" stop-color="#2b7655" stop-opacity="0"/></linearGradient></defs>'+grid+'<path class="chart-area" d="'+area+'"/><path class="chart-line" d="'+line+'"/>'+pts.map((p,i)=>'<circle class="chart-dot" cx="'+p[0]+'" cy="'+p[1]+'" r="'+(i===pts.length-1?5:3.2)+'"/>').join("")+labels+'</svg>';
  const first=values[0],current=values.at(-1),diff=current-first,rate=first?diff/first*100:0,ch=document.querySelector("#chartChange");
  document.querySelector("#chartCurrent").textContent=F.gold(current);ch.textContent=(diff>=0?"+":"")+F.gold(diff)+" · "+F.pct(rate);ch.className="chart-change "+(diff>0?"up":diff<0?"down":"flat");
  document.querySelector("#sOpen").textContent=F.gold(first);document.querySelector("#sHigh").textContent=F.gold(max);document.querySelector("#sLow").textContent=F.gold(min);document.querySelector("#sStock").textContent=F.fmt(data.at(-1).total_stock)+"개";document.querySelector("#lastTime").textContent=F.dateTime(data.at(-1).completed_at);document.querySelector("#pointCount").textContent=data.length+"회";
}
function renderRows(){
  const t=document.querySelector("#detailRows"),g=groups(),rows=[];
  for(const [name,a] of g){if(a.length<2)continue;const p=a.at(-2),c=a.at(-1),pv=Number(p[key()]),cv=Number(c[key()]);if(!Number.isFinite(pv)||!Number.isFinite(cv))continue;const diff=cv-pv,rate=pv?diff/pv*100:0;rows.push({name,pv,cv,diff,rate,stock:c.total_stock,outliers:c.outlier_count||0})}
  rows.sort((a,b)=>Math.abs(b.rate)-Math.abs(a.rate));
  t.innerHTML=rows.length?rows.map(r=>'<tr data-name="'+F.escapeHtml(r.name)+'" style="cursor:pointer"><td class="item-name">'+F.escapeHtml(r.name)+(r.outliers?'<small>이상 고가 '+F.fmt(r.outliers)+'건 제외</small>':'')+'</td><td class="price">'+F.gold(r.pv)+'</td><td class="price">'+F.gold(r.cv)+'</td><td class="'+(r.diff>0?"up":r.diff<0?"down":"flat")+'"><b>'+(r.diff>=0?"+":"")+F.gold(r.diff)+'</b></td><td class="'+(r.rate>0?"up":r.rate<0?"down":"flat")+'"><b>'+F.pct(r.rate)+'</b></td><td>'+F.fmt(r.stock)+'개</td></tr>').join(""):'<tr><td colspan="6"><div class="empty-state"><strong>비교 가능한 기록이 없습니다</strong><p>같은 아이템이 두 번 이상 스캔되면 변화가 표시됩니다.</p></div></td></tr>';
  [...t.querySelectorAll("tr[data-name]")].forEach(tr=>tr.addEventListener("click",()=>selectItem(tr.dataset.name,true)));
}
function selectItem(name,scroll=false){
  const items=payload.items||[];
  const raw=String(name||"").trim();
  if(!raw)return false;
  const lower=raw.toLowerCase();
  const match=items.find(x=>x===raw)
    ||items.find(x=>x.toLowerCase()===lower)
    ||items.find(x=>x.toLowerCase().startsWith(lower))
    ||items.find(x=>x.toLowerCase().includes(lower));
  if(!match)return false;
  selected=match;
  document.querySelector("#itemSelect").value=match;
  document.querySelector("#itemSearch").value=match;
  drawChart();
  if(scroll)document.querySelector("#chartWrap")?.scrollIntoView({behavior:"smooth",block:"center"});
  return true;
}
function submitSearch(){
  const input=document.querySelector("#itemSearch");
  if(selectItem(input.value,true))return;
  const q=String(input.value||"").trim();
  if(q)input.setCustomValidity("일치하는 아이템을 찾지 못했습니다.");
  else input.setCustomValidity("");
  input.reportValidity();
  setTimeout(()=>input.setCustomValidity(""),900);
}
async function load(){
  try{
    payload=await history({days});
    const sel=document.querySelector("#itemSelect"),list=document.querySelector("#itemSearchList"),items=payload.items||[];
    const old=selected;selected=items.includes(old)?old:(items[0]||"");
    sel.innerHTML=items.length?items.map(x=>'<option value="'+F.escapeHtml(x)+'">'+F.escapeHtml(x)+'</option>').join(""):'<option value="">스캔 데이터 없음</option>';
    list.innerHTML=items.map(x=>'<option value="'+F.escapeHtml(x)+'"></option>').join("");
    sel.value=selected;
    document.querySelector("#itemSearch").value=selected;
    drawChart();renderRows();
  }catch(e){
    document.querySelector("#chartWrap").innerHTML=F.errorState(e.message);
    document.querySelector("#detailRows").innerHTML='<tr><td colspan="6">'+F.errorState(e.message)+'</td></tr>';
  }
}
document.querySelector("#itemSelect").addEventListener("change",e=>selectItem(e.target.value));
document.querySelector("#itemSearchBtn").addEventListener("click",submitSearch);
document.querySelector("#itemSearch").addEventListener("change",e=>{if(e.target.value)selectItem(e.target.value)});
document.querySelector("#itemSearch").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();submitSearch()}});

document.querySelector("#priceMode").addEventListener("click",e=>{const b=e.target.closest("button[data-mode]");if(!b)return;mode=b.dataset.mode;[...e.currentTarget.querySelectorAll("button")].forEach(x=>x.classList.toggle("active",x===b));drawChart();renderRows()});
document.querySelector("#rangeMode").addEventListener("click",async e=>{const b=e.target.closest("button[data-days]");if(!b)return;days=Number(b.dataset.days);[...e.currentTarget.querySelectorAll("button")].forEach(x=>x.classList.toggle("active",x===b));await load()});
let resizeTimer=0;
window.addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(drawChart,120)});
MarketAdmin.boot(load);
})();