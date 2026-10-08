(()=>{"use strict";
const F=MarketAdmin;
const RECIPES=[
  {raw:"당근",product:"당근 묶음",per:64,icon:"assets/ingredient/carrot-bundle.png"},
  {raw:"감자",product:"감자 묶음",per:64,icon:"assets/ingredient/potato-bundle.png"},
  {raw:"비트",product:"비트 묶음",per:32,icon:"assets/ingredient/beet-bundle.png"},
  {raw:"호박",product:"호박 묶음",per:32,icon:"assets/ingredient/pumpkin-bundle.png"},
  {raw:"수박",product:"수박 묶음",per:32,icon:"assets/ingredient/melon-bundle.png"},
  {raw:"달콤한 열매",product:"달콤한 열매 묶음",per:64,icon:"assets/ingredient/sweet-berries-bundle.png"},
  {raw:"사탕수수",product:"설탕 큐브",per:64,icon:"assets/ingredient/sugar-cube.png"}
];
let offers=[],latestScan=null,rows=[],selected=null;

const median=a=>{const v=a.filter(Number.isFinite).slice().sort((x,y)=>x-y);if(!v.length)return null;const m=Math.floor(v.length/2);return v.length%2?v[m]:(v[m-1]+v[m])/2};
const unit=o=>F.offerUnit(o);
const stock=o=>Math.max(0,Number(o?.stock_quantity??o?.quantity??0));
const lotQty=o=>Math.max(1,Math.floor(Number(o?.quantity)||1));
const price=o=>Math.max(0,Number(o?.listing_price)||0);

function clean(rows){
  return (rows||[]).filter(o=>{
    const target=String(o?.raw_data?.searchTarget||"").trim();
    return !target||target===String(o?.item_name||"").trim();
  });
}
function isHighOutlier(o,group){
  const values=group.map(unit).filter(v=>Number.isFinite(v)&&v>0),u=unit(o);
  if(!(u>0)||values.length<2)return false;
  const sorted=values.slice().sort((a,b)=>a-b);
  if(values.length===2){const lo=sorted[0],hi=sorted[1];return u===hi&&lo>0&&hi>lo*20}
  const med=median(values);if(!(med&&med>0)||u<=med*5)return false;
  const mad=median(values.map(v=>Math.abs(v-med)))||0;
  return mad===0||((u-med)/(1.4826*mad)>6);
}
function saleOffers(name){
  return offers.filter(o=>o.trade_type!=="buy"&&String(o.item_name||"").trim()===name);
}
function normalOffers(name){
  const all=saleOffers(name),flagged=all.filter(o=>isHighOutlier(o,all));
  const normal=all.filter(o=>!flagged.includes(o));
  return {all,flagged,pool:normal.length?normal:all};
}
function wholeLots(o){
  const q=lotQty(o),s=stock(o);
  return Math.max(0,Math.floor(s/q));
}
function purchasePlan(source,required){
  const pool=source.slice().filter(o=>wholeLots(o)>0).sort((a,b)=>(unit(a)-unit(b))||(price(a)-price(b)));
  let need=Math.max(0,Math.floor(required)),acquired=0,cost=0;
  const steps=[];
  for(const o of pool){
    if(acquired>=need)break;
    const q=lotQty(o),available=wholeLots(o),remaining=Math.max(0,need-acquired);
    const take=Math.min(available,Math.ceil(remaining/q));
    if(take<=0)continue;
    const qty=take*q,lineCost=take*price(o);
    acquired+=qty;cost+=lineCost;
    steps.push({offer:o,lots:take,qty,cost:lineCost,available});
  }
  return {required:need,acquired,cost,complete:acquired>=need,leftover:Math.max(0,acquired-need),steps};
}
function buyAllPlan(source,per){
  let acquired=0,cost=0;
  const steps=[];
  for(const o of source.slice().filter(o=>wholeLots(o)>0).sort((a,b)=>(unit(a)-unit(b))||(price(a)-price(b)))){
    const lots=wholeLots(o),qty=lots*lotQty(o),lineCost=lots*price(o);
    if(lots<=0)continue;
    acquired+=qty;cost+=lineCost;steps.push({offer:o,lots,qty,cost:lineCost,available:lots});
  }
  return {acquired,cost,craftable:Math.floor(acquired/per),leftover:acquired%per,steps};
}
function sellDecision(product,count){
  const {pool,flagged}=normalOffers(product);
  if(!pool.length)return {available:false,flagged,reason:"현재 묶음 판매 매물이 없어 판매가를 계산할 수 없습니다."};
  const sorted=pool.slice().sort((a,b)=>(unit(a)-unit(b))||(price(a)-price(b)));
  const best=sorted[0],bestUnit=unit(best),bestQty=lotQty(best),bestPrice=price(best);
  const lowTier=sorted.filter(o=>Math.abs(unit(o)-bestUnit)<1e-9);
  const lowStock=lowTier.reduce((a,o)=>a+stock(o),0);
  const veryThin=lowStock<=bestQty*2;
  const recommendedTotal=veryThin?bestPrice:Math.max(1,bestPrice-1);
  const recommendedUnit=recommendedTotal/bestQty;
  const next=sorted.find(o=>unit(o)>bestUnit+1e-9);
  let reason=veryThin
    ?"현재 최저가 물량이 "+F.fmt(lowStock)+"개로 매우 적어 1G를 더 낮추기보다 현재 최저가를 유지하는 편이 유리합니다."
    :"현재 최저가 경쟁 재고가 "+F.fmt(lowStock)+"개 남아 있어 같은 가격 대기보다 해당 묶음 가격에서 1G 낮추는 전략을 적용했습니다.";
  if(next)reason+=" 다음 정상 가격대는 "+F.offerText(next)+"입니다.";
  if(flagged.length)reason+=" 극단 고가 "+F.fmt(flagged.length)+"건은 계산에서 제외했습니다.";
  return {available:true,best,bestQty,bestPrice,bestUnit,lowStock,recommendedTotal,recommendedUnit,next,flagged,reason,count};
}
function evaluate(recipe,targetSets){
  const outputQty=Math.max(1,targetSets)*64;
  const raw=normalOffers(recipe.raw),required=recipe.per*outputQty;
  const plan=purchasePlan(raw.pool,required),sell=sellDecision(recipe.product,outputQty);
  const revenue=plan.complete&&sell.available?Math.round(sell.recommendedUnit*outputQty):null;
  const net=revenue==null?null:revenue-plan.cost;
  const roi=net!=null&&plan.cost>0?net/plan.cost*100:null;
  const all=buyAllPlan(raw.pool,recipe.per);
  const allRevenue=sell.available?Math.round(sell.recommendedUnit*all.craftable):null;
  const allNet=allRevenue==null?null:allRevenue-all.cost;
  return {recipe,targetSets,outputQty,raw,plan,sell,revenue,net,roi,all,allRevenue,allNet};
}
function cls(v){return v==null?"muted":v>0?"positive":v<0?"negative":"muted"}
function resultState(r){
  if(!r.plan.complete)return {label:"원물 부족",kind:"warn"};
  if(!r.sell.available)return {label:"판매 시세 없음",kind:"muted"};
  if(r.net>0)return {label:"이득",kind:"ok"};
  if(r.net<0)return {label:"손해",kind:"danger"};
  return {label:"본전",kind:"muted"};
}
function render(){
  const target=Math.min(99,Math.max(1,Math.floor(Number(document.querySelector("#targetSets").value)||7)));
  document.querySelector("#targetSets").value=String(target);
  rows=RECIPES.map(r=>evaluate(r,target));
  const sort=document.querySelector("#bundleSort").value;
  rows.sort((a,b)=>{
    const av=sort==="roi"?(a.roi??-Infinity):sort==="capital"?(a.plan.complete?a.plan.cost:Infinity):(a.net??-Infinity);
    const bv=sort==="roi"?(b.roi??-Infinity):sort==="capital"?(b.plan.complete?b.plan.cost:Infinity):(b.net??-Infinity);
    return sort==="capital"?av-bv:bv-av;
  });

  const ready=rows.filter(r=>r.plan.complete&&r.sell.available&&r.net!=null),bestNet=ready.slice().sort((a,b)=>b.net-a.net)[0],bestRoi=ready.slice().sort((a,b)=>b.roi-a.roi)[0];
  document.querySelector("#mReady").textContent=F.fmt(ready.length)+"종";
  document.querySelector("#mBestNet").textContent=bestNet?((bestNet.net>=0?"+":"")+F.gold(bestNet.net)):"—";
  document.querySelector("#mBestRoi").textContent=bestRoi?F.pct(bestRoi.roi):"—";
  document.querySelector("#mScan").textContent=latestScan?F.dateTime(latestScan.completed_at):"—";
  ["#mReady","#mBestNet","#mBestRoi","#mScan"].forEach(s=>document.querySelector(s).classList.remove("pending"));

  const box=document.querySelector("#bundleGrid");
  box.innerHTML=rows.map((r,i)=>{
    const s=resultState(r),req=r.recipe.per*r.outputQty;
    const capital=r.plan.complete?F.gold(r.plan.cost):"조달 불가";
    const revenue=r.revenue==null?"—":F.gold(r.revenue);
    const net=r.net==null?"계산 불가":(r.net>=0?"+":"")+F.gold(r.net);
    const note=!r.plan.complete
      ?"필요 "+F.fmt(req)+"개 중 "+F.fmt(r.plan.acquired)+"개만 조달 가능"
      :!r.sell.available?"현재 "+F.escapeHtml(r.recipe.product)+" 판매 매물 없음"
      :"원물 "+F.fmt(req)+"개 → 완성품 "+F.fmt(r.outputQty)+"개 ("+F.fmt(r.targetSets)+"세트)";
    return '<article class="panel bundle-card '+(r.net==null?"unavailable":"")+'">'+
      '<div class="bundle-card-head"><div class="bundle-card-title"><img src="'+F.escapeHtml(r.recipe.icon)+'" alt=""><div><div class="bundle-rank">RANK '+String(i+1).padStart(2,"0")+'</div><h3>'+F.escapeHtml(r.recipe.raw)+' → '+F.escapeHtml(r.recipe.product)+'</h3><div class="bundle-recipe">완성품 1개당 원물 '+F.fmt(r.recipe.per)+'개 · 현재 '+F.fmt(r.outputQty)+'개 ('+F.fmt(r.targetSets)+'세트) 기준</div></div></div>'+
      '<div><div class="bundle-profit '+cls(r.net)+'">'+net+'<small>'+(r.roi==null?"수익률 —":"수익률 "+F.pct(r.roi))+'</small></div></div></div>'+
      '<div class="bundle-kpis"><div class="bundle-kpi"><span>실제 원물 구매비</span><strong>'+capital+'</strong></div><div class="bundle-kpi"><span>예상 판매 매출</span><strong>'+revenue+'</strong></div><div class="bundle-kpi"><span>원물 매물 재고</span><strong>'+F.fmt(r.raw.pool.reduce((a,o)=>a+wholeLots(o)*lotQty(o),0))+'개</strong></div></div>'+
      '<div class="bundle-card-foot"><small><span class="market-badge '+s.kind+'">'+s.label+'</span> · '+note+'</small><button class="bundle-detail-btn" type="button" data-bundle-detail="'+F.escapeHtml(r.recipe.product)+'">상세보기</button></div>'+
    '</article>';
  }).join("");
}
function shopName(o){return String(o?.raw_data?.shopName||"—")}
function planRows(steps){
  if(!steps.length)return '<tr><td colspan="5">사용할 수 있는 원물 판매 매물이 없습니다.</td></tr>';
  return steps.map(x=>'<tr><td><div class="shop-cell"><strong>'+F.escapeHtml(x.offer.seller_name||"—")+'</strong><small>'+F.escapeHtml(shopName(x.offer))+'</small></div></td><td>'+F.offerText(x.offer)+'</td><td>'+F.fmt(stock(x.offer))+'개</td><td>'+F.fmt(x.lots)+'묶음 · '+F.fmt(x.qty)+'개</td><td class="price">'+F.gold(x.cost)+'</td></tr>').join("");
}
function openDetail(product){
  const r=rows.find(x=>x.recipe.product===product);if(!r)return;
  selected=r;
  const s=resultState(r),req=r.recipe.per*r.outputQty;
  const allNet=r.allNet==null?"—":(r.allNet>=0?"+":"")+F.gold(r.allNet);
  const sellRef=r.sell.available
    ?F.gold(r.sell.recommendedTotal)+" / "+F.fmt(r.sell.bestQty)+"개 (개당 "+F.gold(r.sell.recommendedUnit)+")"
    :"판매 시세 없음";
  document.querySelector("#bundleDrawerTitle").textContent=r.recipe.raw+" → "+r.recipe.product;
  document.querySelector("#bundleDrawerBody").innerHTML=
    '<div class="bundle-section"><div class="bundle-summary-grid">'+
      '<div class="bundle-summary-box"><span>제작 목표</span><strong>'+F.fmt(r.outputQty)+'개 ('+F.fmt(r.targetSets)+'세트) · 원물 '+F.fmt(req)+'개</strong></div>'+
      '<div class="bundle-summary-box"><span>실제 조달</span><strong>'+F.fmt(r.plan.acquired)+'개 · '+F.gold(r.plan.cost)+'</strong></div>'+
      '<div class="bundle-summary-box"><span>추천 판매 기준</span><strong>'+sellRef+'</strong></div>'+
      '<div class="bundle-summary-box hero"><span>예상 순이익</span><strong>'+(r.net==null?"계산 불가":(r.net>=0?"+":"")+F.gold(r.net))+'</strong></div>'+
    '</div></div>'+
    '<div class="bundle-section"><h3>'+F.fmt(r.outputQty)+'개 ('+F.fmt(r.targetSets)+'세트) 제작용 실제 구매 순서</h3><div class="panel table-wrap"><table class="bundle-mini-table"><thead><tr><th>판매자 / 상점</th><th>판매 단위</th><th>현재 재고</th><th>구매</th><th>비용</th></tr></thead><tbody>'+planRows(r.plan.steps)+'</tbody></table></div>'+
      '<div class="bundle-note">'+(r.plan.complete?'필요 원물 '+F.fmt(req)+'개를 채운 뒤 '+F.fmt(r.plan.leftover)+'개가 남습니다.':'현재 정상 범위 매물만으로는 목표 수량을 채울 수 없습니다.')+'</div></div>'+
    '<div class="bundle-section"><h3>현재 정상가 원물 매물을 전부 산다면</h3><div class="bundle-summary-grid">'+
      '<div class="bundle-summary-box"><span>총 구매 원물</span><strong>'+F.fmt(r.all.acquired)+'개</strong></div>'+
      '<div class="bundle-summary-box"><span>총 구매비</span><strong>'+F.gold(r.all.cost)+'</strong></div>'+
      '<div class="bundle-summary-box"><span>제작 가능</span><strong>'+F.fmt(r.all.craftable)+'개 · '+(r.all.craftable/64).toLocaleString("ko-KR",{maximumFractionDigits:2})+'세트 · 원물 '+F.fmt(r.all.leftover)+'개 남음</strong></div>'+
      '<div class="bundle-summary-box hero"><span>전부 제작·판매 예상 순이익</span><strong>'+allNet+'</strong></div>'+
    '</div><div class="bundle-note">전부 매입 계산은 극단 고가로 판정된 원물 매물을 제외한 정상 범위 매물의 완전한 판매 단위만 구매한다고 가정합니다. 예상 매출 '+(r.allRevenue==null?"—":F.gold(r.allRevenue))+' · '+F.escapeHtml(r.sell.reason||"")+'</div></div>'+
    '<div class="bundle-section"><h3>원물 판매자 전체</h3><div class="panel table-wrap"><table class="bundle-mini-table"><thead><tr><th>판매자 / 상점</th><th>판매 단위</th><th>재고</th><th>구매 가능 판매단위</th><th>전량 구매비</th></tr></thead><tbody>'+
      (r.raw.pool.length?r.raw.pool.slice().sort((a,b)=>unit(a)-unit(b)).map(o=>'<tr><td><div class="shop-cell"><strong>'+F.escapeHtml(o.seller_name||"—")+'</strong><small>'+F.escapeHtml(shopName(o))+'</small></div></td><td>'+F.offerText(o)+'</td><td>'+F.fmt(stock(o))+'개</td><td>'+F.fmt(wholeLots(o))+'묶음</td><td class="price">'+F.gold(wholeLots(o)*price(o))+'</td></tr>').join(""):'<tr><td colspan="5">현재 원물 판매 매물이 없습니다.</td></tr>')+
    '</tbody></table></div>'+(r.raw.flagged.length?'<div class="bundle-note">극단 고가 원물 '+F.fmt(r.raw.flagged.length)+'건은 추천 매입과 전량 매입 계산에서 제외했습니다.</div>':'')+'</div>'+
    '<div class="bundle-note">순이익 = 예상 판매 매출 - 실제 원물 구매비입니다. 서버의 별도 등록 수수료나 가공 비용은 확인된 값이 없어 포함하지 않았습니다.</div>';
  const b=document.querySelector("#bundleBackdrop");b.classList.add("open");b.setAttribute("aria-hidden","false");
}
function closeDetail(){const b=document.querySelector("#bundleBackdrop");b.classList.remove("open");b.setAttribute("aria-hidden","true");selected=null}
async function load(){
  try{
    const d=await F.marketOffers();
    latestScan=d.latest_scan||null;offers=clean(d.offers||[]);
    render();
  }catch(e){
    document.querySelector("#bundleGrid").innerHTML='<div class="panel">'+F.errorState(e.message)+'</div>';
  }
}
document.querySelector("#targetSets").addEventListener("input",render);
document.querySelector("#bundleSort").addEventListener("change",render);
document.querySelector("#bundleGrid").addEventListener("click",e=>{const b=e.target.closest("[data-bundle-detail]");if(b)openDetail(b.dataset.bundleDetail||"")});
document.querySelector("#bundleDrawerClose").addEventListener("click",closeDetail);
document.querySelector("#bundleBackdrop").addEventListener("click",e=>{if(e.target===e.currentTarget)closeDetail()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDetail()});
F.boot(load);
})();