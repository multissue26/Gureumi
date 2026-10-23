(()=>{'use strict';
const D=window.DDING_DATA||{foods:[],ingredients:{},crops:[]};
const F=window.MarketAdmin;const P=window.DDING_PROFIT;
const PRICE_API='https://dding-price-api.hansuyeon191-6fe.workers.dev';
const $=s=>document.querySelector(s);
const esc=v=>F.escapeHtml(v??'');
const fmt=v=>Number(v||0).toLocaleString('ko-KR',{maximumFractionDigits:2});
const gold=v=>Number.isFinite(v)?fmt(v)+' G':'—';
const stackLabel=value=>{
 const count=Math.floor(Number(value)||0);
 const sets=Math.floor(count/64),rest=count%64;
 return sets?fmt(sets)+'세트'+(rest?' + '+fmt(rest)+'개':''):fmt(rest)+'개';
};
const signed=v=>v==null?'—':(v>0?'+':'')+gold(v);
const dateTime=v=>F.dateTime(v);
let mode='normal',offers=[],prices={},lastScan='',priceTime='',selected='',results=[],marketOk=false,priceOk=false;
const npc=P.npcMap(window.DDING_SHOP_DATA||{});
const CTX=()=>({data:D,offers,prices,npc,feeRate:null}); // 판매 수수료 정보가 확인되지 않음
function identifyOwnSeller(rows,ownRows){
 const valid=(ownRows||[]).filter(o=>o?.item_name&&Number(o.listing_price)>0&&Number(o.listed_quantity)>0);
 if(!valid.length)return '';
 const scores=new Map();
 for(const own of valid){
  const matches=rows.filter(o=>String(o.item_name||'').trim()===String(own.item_name||'').trim()&&Number(o.quantity)===Number(own.listed_quantity)&&Number(o.listing_price)===Number(own.listing_price)&&o.seller_name);
  for(const name of new Set(matches.map(o=>o.seller_name)))scores.set(name,(scores.get(name)||0)+1);
 }
 const ranked=[...scores].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 if(!ranked.length)return '';
 const required=valid.length>=2?2:1;
 return ranked[0][1]>=required&&ranked[0][1]!==Number(ranked[1]?.[1]||0)?ranked[0][0]:'';
}
function normalizePrices(payload){
 const root=payload?.prices??payload??{};const src=root?.prices??root;const out={};
 const num=v=>{if(v==null||v==='')return null;const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?n:null};
 for(const [name,v] of Object.entries(src||{})){
  if(typeof v==='number')out[name]={marketPrice:v,myPrice:v};
  else if(v&&typeof v==='object')out[name]={marketPrice:num(v.marketPrice??v.price??v.current),myPrice:num(v.myPrice??v.personalPrice??v.marketPrice??v.price??v.current)};
 }
 return out;
}
async function loadPrices(){
 let response;
 try{const r=await fetch(PRICE_API+'/dashboard',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);response=await r.json()}
 catch(_){const r=await fetch(PRICE_API+'/prices',{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);response=await r.json()}
 prices=normalizePrices(response?.prices??response);
 priceTime=response?.prices?.capturedAt||response?.prices?.updatedAt||response?.status?.publishedAt||response?.status?.updatedAt||'';
 priceOk=true;
}
function input(){
 const raw=$('#targetAmount').value;
 const qty=P.inputCount(raw,$('#targetUnit').value);
 return {qty,explicit:raw.trim()!==''};
}
function evalFood(food,sc='average'){
 return P.unitPreview(food,mode,sc,CTX());
}
const materialSelections=new Map();
function materialKey(slug){return mode+':'+slug}
function availableMaterialNames(food,qty){
 const groups=[P.recipeLeaves(food,mode==='gold'?1:qty,D).leaves];
 if(mode==='gold'){
  groups.push(P.goldNeeds(food,qty,D,'average',0).leaves);
  groups.push(P.goldNeeds(food,qty,D,'average',Math.ceil(qty/(food.gold?.bulk?.output||1))).leaves);
 }
 return [...new Set(groups.flat().filter(x=>mode!=='gold'||(x.id!=='gold_dust'&&x.id!=='edible_gold_dust')).map(x=>x.name))];
}
function getChoices(slug,all){
 const key=materialKey(slug);
 if(!materialSelections.has(key))materialSelections.set(key,new Set(all));
 return materialSelections.get(key);
}
function render(){
 const {qty,explicit}=input();const notice=$('#inputMessage');
 notice.textContent=qty==null?'1 이상인 정수만 입력할 수 있어요. 최대 1,000,000개까지 계산 가능합니다.':
 explicit?`상세보기 제작 목표 ${fmt(qty)}개 · ${$('#targetUnit').value==='set'?'1세트 = 64개':'개별 수량'}`:'상세보기는 1개 제작을 기본값으로 사용합니다.';
 notice.classList.toggle('invalid',qty==null);
 $('#foodModeTabs').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
 $('#modeHint').textContent=mode==='gold'?'황금 요리의 실제 판매가와 개당 재료비를 비교합니다. 금 가루·식용 금 가루는 직접 수급(원가 0G) 기준입니다.':'메인은 재료 1개당 단가로 소비 원가를 계산합니다. 상세에서는 실제 매물 구매 지출을 표시합니다.';
 if(qty==null){$('#foodGrid').innerHTML='<div class="fm-panel fm-empty">제작 수량을 다시 확인해 주세요.</div>';return}
 results=D.foods.map(f=>evalFood(f));
 const ready=results.filter(r=>r.complete&&r.estimate!=null);
 const q=$('#foodSearch').value.trim().toLowerCase();
 const sorted=results.filter(r=>r.name.toLowerCase().includes(q)||r.food.name.toLowerCase().includes(q));
 const sort=$('#sortMode').value;
 sorted.sort((a,b)=>{
  const aa=a.complete&&a.estimate!=null,bb=b.complete&&b.estimate!=null;
  if(aa!==bb)return aa?-1:1;
  if(sort==='price')return (b.unit??-Infinity)-(a.unit??-Infinity);
  if(sort==='cost')return (a.cost??Infinity)-(b.cost??Infinity);
  if(sort==='margin')return (b.estimate!=null&&b.unit>0?b.estimate/b.unit:-Infinity)-(a.estimate!=null&&a.unit>0?a.estimate/a.unit:-Infinity);
  return (b.estimate??-Infinity)-(a.estimate??-Infinity);
 });
 $('#resultCount').textContent=fmt(sorted.length)+'종 · 개당 환산 원가 기준';
 $('#mReady').textContent=fmt(ready.length)+'종';
 const profitable=ready.filter(r=>r.estimate>0);
 const best=profitable.slice().sort((a,b)=>b.estimate-a.estimate)[0];
 $('#mBest').textContent=best?best.name:'확인된 흑자 없음';
 $('#mBestSub').textContent=best?signed(best.estimate)+' / 개 · 수수료 제외':'미확인 자료 또는 예상 적자';
 const margins=ready.filter(r=>r.unit>0).map(r=>100*r.estimate/r.unit);
 $('#mMargin').textContent=margins.length?fmt(Math.max(...margins))+'%':'—';
 $('#mScan').textContent=lastScan?dateTime(lastScan):'—';
 $('#mPriceTime').textContent='음식 가격 갱신 '+(priceTime?dateTime(priceTime):'시각 미확인');
 $('#foodGrid').innerHTML=sorted.map(r=>{
  const noCost=r.estimate==null,available=r.complete&&r.unit!=null;
  const img=mode==='gold'?(r.food.goldImage||r.food.image):r.food.image;
  const why=r.errors.length?r.errors.join(' · '):r.unit==null?(mode==='gold'?'황금 요리 판매가 미확인':'음식 판매가 없음'):r.missingNames.join(', ')+' 단가 미확인';
  const badge=available?'<span class="fm-badge ok">개당 원가 확인</span>':'<span class="fm-badge warn">확인 필요</span>';
  return '<article class="fm-card '+(noCost?'unavailable ':'')+(mode==='gold'?'gold-mode':'')+'">'+
   '<div class="fm-card-head"><div class="fm-food"><img src="'+esc(img||'')+'" alt=""><div><span class="fm-grade">'+esc(mode==='gold'?r.food.gold?.grade||'':r.food.grade||'')+'</span><h3>'+esc(r.name)+'</h3><small>'+(mode==='gold'?'대량 '+fmt(r.reference)+'개 제작 시 개당':'요리 1개 기준')+'</small></div></div>'+
   '<div class="fm-net '+(r.estimate>0?'positive':r.estimate<0?'negative':'muted')+'">'+(noCost?'원가·판매가 확인 필요':signed(r.estimate))+'<small>'+(mode==='gold'?'금가루 자가수급 · 수수료 제외':'개당 예상 차익 · 수수료 제외')+'</small></div></div>'+
   '<div class="fm-kpis"><div><span>'+(mode==='gold'?'황금 요리 개당 판매가':'개당 판매가')+'</span><strong>'+(r.unit==null?'—':gold(r.unit))+'</strong></div><div><span>개당 재료 소비원가</span><strong>'+(r.cost==null?'—':gold(r.cost))+'</strong></div><div><span>확인된 재료 단가</span><strong>'+fmt(r.plans.filter(x=>x.price).length)+' / '+fmt(r.plans.length)+'종</strong></div></div>'+
   '<div class="fm-card-foot"><div>'+badge+'<small>'+esc(why||' 매물 개당 가격 환산 · 실제 구매 지출은 상세보기')+'</small></div><button data-detail="'+esc(r.food.slug)+'">제작·구매 상세</button></div></article>';
 }).join('')||'<div class="fm-panel fm-empty">일치하는 요리가 없습니다.</div>';
}
function purchaseTable(rows){
 if(!rows.length)return '<p class="fm-detail-note">선택한 구매 품목의 매물이 없거나, 구매할 재료를 선택하지 않았습니다.</p>';
 return '<div class="fm-table-wrap"><table><thead><tr><th>판매자 / 구매처</th><th>품목</th><th>판매 단위</th><th>수량</th><th>실제 결제액</th></tr></thead><tbody>'+rows.map(s=>
  '<tr><td><strong>'+esc(s.seller)+'</strong><small>'+esc(s.shop)+(s.verified?' · '+esc(s.verified):'')+'</small></td><td>'+esc(s.name)+'</td><td>'+fmt(s.unit)+'개 × '+fmt(s.lots)+'회</td><td>'+fmt(s.quantity)+'개</td><td><b>'+gold(s.cost)+'</b></td></tr>'
 ).join('')+'</tbody></table></div>';
}
function renderDetail(){
 const r=results.find(v=>v.food.slug===selected);if(!r)return;
 const qty=input().qty;if(qty==null)return;
 const sourceNames=availableMaterialNames(r.food,qty);
 const selectedNames=getChoices(r.food.slug,sourceNames);
 // 황금 제작 방법에 따라 재료 목록이 달라지므로 체크 상태는 재료명 기준으로 유지한다.
 const plan=P.purchasePlan(r.food,qty,mode,'average',CTX(),selectedNames);
 const allSteps=plan.plans.filter(x=>x.buy).flatMap(x=>x.plan.steps);
 const max=P.maxFromPurchases(r.food,mode,D,plan.plans);
 const img=mode==='gold'?(r.food.goldImage||r.food.image):r.food.image;
 const fmtV=v=>v==null?'계산 불가':signed(v);
 const unchecked=plan.plans.filter(x=>!x.buy&&!x.autoSupplied);
 const insufficient=plan.plans.filter(x=>x.buy&&!x.plan.complete);
 const missing=plan.errors.concat(insufficient.map(x=>x.name+' 실제 구매량 부족'));
 const hasUnchecked=unchecked.length>0;
 const produced=max.count;
 const base=plan.baseDetails.map(x=>'<li>'+esc(x.base)+' '+fmt(x.baseCount)+'개 → '+esc(x.crop)+' '+fmt(x.cropCount)+'개 → '+esc(x.seed)+' '+fmt(x.seedCount)+'개 (평균 수확 추정)</li>').join('');
 const bundle=plan.plans.filter(x=>D.ingredients[x.id]?.type==='묶음').map(x=>{
  const part=D.ingredients[x.id].recipe?.[0],crop=D.ingredients[part?.[0]];
  return '<li>'+esc(x.name)+' '+fmt(x.quantity)+'개 (1묶음 = '+esc(crop?.name||'작물')+' '+fmt(part?.[1])+'개)</li>';
 }).join('');
 const goldSupply=plan.plans.filter(x=>x.autoSupplied).map(x=>esc(x.name)+' '+fmt(x.quantity)+'개').join(' · ');
 const choiceNote=plan.meta?'<div class="fm-gold-plan"><span>황금 제작 구성</span><strong>대량 '+fmt(plan.meta.bulkRuns)+'회 + 소량 '+fmt(plan.meta.singleRuns)+'회</strong><small>일반 요리 '+fmt(plan.meta.normalCount)+'개 필요'+(plan.meta.overproduced?' · 황금 요리 초과 제작 '+fmt(plan.meta.overproduced)+'개':'')+'. '+(plan.choiceLimited?'조합 일부를 비교했으므로 최소 구매비를 보장하지 않습니다.':'필요 재료를 제작법에 맞춰 계산합니다.')+'</small></div>':'';
 const checkedCount=plan.plans.filter(x=>x.buy).length;
 const top= '<div class="fm-detail-hero"><div class="fm-detail-food"><img src="'+esc(img||'')+'" alt=""><div><span class="fm-grade">'+(mode==='gold'?'GOLD':'NORMAL')+'</span><h3>'+esc(plan.name)+'</h3><p>선택 재료 '+fmt(checkedCount)+'종 구매 · 나머지는 직접 수급</p></div></div></div>'+choiceNote+(goldSupply?'<p class="fm-detail-note">직접 수급 황금 재료: '+goldSupply+' · 원가 0G · 구매 대상 제외</p>':'');
 const maxLabel=produced==null?'산출 불가':fmt(produced)+'개';
 // 핵심 3개 숫자만 기본 표시한다. 구매 시 현금 흐름과 잔여 자재 가치는 아래 펼침 영역으로 옮긴다.
 const detailMetrics=[
  ['이번 제작의 소비원가',plan.cost==null?'미확인':gold(plan.cost)],
  ['구매 후 남는 재료 가치',plan.remainingValue==null?'미확인':gold(plan.remainingValue)],
  ['이번 제작 판매 후 현금 차이',fmtV(plan.cashDifference)]
 ].map(([label,value])=>'<div class="fm-breakdown-line"><span>'+label+'</span><strong>'+value+'</strong></div>').join('');
 const hasUnpriced=!plan.complete||plan.cost==null;
 const unitLabel=mode==='gold'?'금가루 자가수급 기준 예상 차익':hasUnchecked?'선택 재료 기준 예상 차익':'재료 소비원가 기준 예상 차익';
 const differenceLabel=hasUnpriced?'계산 불가':fmtV(plan.consumedDifference);
 const summary='<section class="fm-compact-summary" aria-label="요리 제작·구매 요약">'+
  '<div class="fm-summary-quantity"><div><span>제작 목표</span><strong>'+fmt(qty)+'개</strong></div>'+
  '<div><span>구매 재료 기준 제작 가능</span><strong>'+maxLabel+'</strong></div></div>'+
  '<div class="fm-summary-metrics">'+
  '<div><span>실제 구매 지출</span><strong>'+gold(plan.cash)+'</strong><small>64개 등 매물 판매 단위 그대로 결제</small></div>'+
  '<div><span>'+(mode==='gold'?'황금 요리 판매금액':'목표 수량 판매금액')+'</span><strong>'+(plan.gross==null?(mode==='gold'?'황금 판매가 미확인':'판매가 미확인'):gold(plan.gross))+'</strong><small>요리 '+fmt(qty)+'개 판매 가정</small></div>'+
  '<div class="fm-summary-profit '+(plan.consumedDifference<0?'loss':'')+'"><span>'+unitLabel+'</span><strong>'+differenceLabel+'</strong><small>'+
  (hasUnchecked?'직접 수급하는 재료의 원가는 제외':'구매 재료의 실제 소비량만 원가로 반영')+' · 수수료 제외</small></div></div>'+
  '<p class="fm-summary-disclaimer">구매 지출은 묶음 전체 결제액, 예상 차익은 그중 <strong>실제 소비한 재료비</strong> 기준입니다. 남는 재료와 현금 차이는 아래에서 확인할 수 있어요.</p>'+
  '<details class="fm-breakdown"><summary>잔여 재료 · 현금 차이 보기</summary><div>'+detailMetrics+'</div>'+
  '<p>남는 재료의 가치는 재판매 확정금이 아닌 취득원가입니다. 체크하지 않은 재료의 가치와 수수료는 차익에서 제외됩니다.</p></details>'+
  (produced==null?'<p class="fm-summary-caveat">'+esc(max.reason)+'</p>':'')+'</section>';
 const rows=plan.plans.filter(x=>!x.autoSupplied).map((x,i)=>{
  const source=x.buy?x.plan:null;
  const unit=x.buy&&source.obtained>0?source.cost/source.obtained:null;
  const note=x.buy?(source.complete?'구매 '+fmt(source.obtained)+'개 · 남음 '+fmt(source.leftover)+'개 · 평균 '+gold(unit)+'/개':'일부 구매 가능 · 재고 부족'):'보유·직접 수급 가정 · 구매 지출 제외';
  return '<div class="fm-buy-row '+(x.buy?'':'unchecked')+'"><label><input type="checkbox" data-buy-name="'+esc(x.name)+'" '+(x.buy?'checked':'')+'><span><strong>'+esc(x.name)+'</strong><small>필요 '+fmt(x.quantity)+'개 ('+stackLabel(x.quantity)+') · '+esc(note)+'</small></span></label><strong class="fm-buy-cost">'+(x.buy?gold(source.cost):'직접 수급')+'</strong></div>';
 }).join('');
 const attention=missing.length?'<div class="fm-detail-alert"><strong>구매 수량 부족 / 계산 불가</strong><p>'+esc(missing.join(' · '))+'</p></div>':'';
 const reminders='<p class="fm-detail-note">※ '+(mode==='gold'?'금 가루·식용 금 가루는 반드시 직접 수급하며 원가를 0G로 처리합니다. ':'')+'구매 체크를 해제한 재료는 실제로 보유하고 있다고 가정하며, 보유 개수를 자동으로 읽지 않습니다. 따라서 최대 제작 가능 수량은 <strong>선택한 구매 재료에 한해 계산한 조건부 수량</strong>입니다. 씨앗의 평균 수확량은 확정 수확량이 아닙니다. 플리마켓 매물은 구매 전 소진될 수 있고, 판매 수수료는 아직 확인되지 않았습니다. 최종 순이익으로 확정하지 않습니다.</p>';
 const body=top+summary+
  '<div class="fm-detail-section-head fm-detail-tools"><div><h3>구매할 재료 선택</h3><p>구매할 항목만 체크해. 미선택 재료는 직접 수급한다고 가정해.</p></div><div><button data-select-all="1">전체 선택</button><button data-select-all="0">전체 해제</button></div></div>'+
  '<div class="fm-buy-list">'+rows+'</div>'+
  '<div class="fm-detail-section-head"><h3>판매자별 구매 목록</h3><p>실제 판매 매물의 묶음 수량을 적용했어. 묶음을 더 많이 사면 남는 재료는 유지돼.</p></div>'+purchaseTable(allSteps)+
  (bundle?'<div class="fm-detail-section-head"><h3>작물 묶음의 구성</h3></div><ul class="fm-base-list">'+bundle+'</ul>':'')+
  (base?'<div class="fm-detail-section-head"><h3>베이스 재료의 씨앗 환산</h3><p>수확량은 평균 추정치이므로 실제 제작 가능 개수는 달라질 수 있어.</p></div><ul class="fm-base-list">'+base+'</ul>':'')+attention+reminders;
 const drawer=$('.fm-drawer'),before=drawer.scrollTop;
 $('#detailTitle').textContent=plan.name+' · '+fmt(qty)+'개 계획';
 $('#detailBody').innerHTML=body;
 drawer.scrollTop=before;
}
function openDetail(slug){
 const r=results.find(v=>v.food.slug===slug);if(!r)return;
 selected=slug;renderDetail();
 $('#detailBackdrop').classList.add('open');$('#detailBackdrop').setAttribute('aria-hidden','false');
}
function closeDetail(){selected='';$('#detailBackdrop').classList.remove('open');$('#detailBackdrop').setAttribute('aria-hidden','true')}
async function load(){
 const status=await Promise.allSettled([F.marketOffers(),loadPrices(),F.market('market-own-listings').catch(()=>({listings:[]}))]);
 if(status[0].status==='fulfilled'){
  const market=status[0].value;offers=(market.offers||[]).filter(o=>{
   const target=String(o?.raw_data?.searchTarget||'').trim();return !target||target===String(o?.item_name||'').trim();
  });
  // 같은 매물이 여러 스캔 범위로 반환되면 재고가 두 배로 계산되지 않도록 중복 제거.
  const distinct=new Set();
  offers=offers.filter(o=>{
   const id=o.id??o.listing_id??o.market_id??null;
   if(id===null)return true;
   const key=String(id);
   if(distinct.has(key))return false;
   distinct.add(key);return true;
  });
  const seller=identifyOwnSeller(offers,status[2]?.status==='fulfilled'?status[2].value?.listings||[]:[]);
  if(seller)offers=offers.filter(o=>String(o.seller_name||'')!==seller);
  lastScan=market.latest_scan?.completed_at||'';marketOk=true;
 }
 const stamp=Date.parse(lastScan||'');
 const oldScan=marketOk&&(!Number.isFinite(stamp)||Date.now()-stamp>=30*60*1000);
 $('#marketStatus').innerHTML=marketOk?'<i class="'+(oldScan?'bad':'ok')+'"></i>플리마켓 '+(oldScan?'스캔 갱신 필요 · ':'연결 · ')+fmt(offers.length)+'건':'<i class="bad"></i>플리마켓 조회 실패';
 $('#foodPriceStatus').innerHTML=priceOk?'<i class="ok"></i>음식 판매가 연결 · '+fmt(Object.keys(prices).length)+'종':'<i class="bad"></i>음식 판매가 조회 실패';
 render();
}
$('#foodModeTabs').addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(!b)return;mode=b.dataset.mode==='gold'?'gold':'normal';closeDetail();render()});
$('#targetAmount').addEventListener('input',()=>{closeDetail();render()});
$('#targetUnit').addEventListener('change',()=>{closeDetail();render()});
$('#sortMode').addEventListener('change',render);$('#foodSearch').addEventListener('input',render);
$('#foodGrid').addEventListener('click',e=>{const b=e.target.closest('[data-detail]');if(b)openDetail(b.dataset.detail)});
$('#detailClose').addEventListener('click',closeDetail);
$('#detailBackdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)closeDetail()});
$('#detailBody').addEventListener('change',e=>{const el=e.target.closest('[data-buy-name]');if(!el||!selected)return;const r=results.find(v=>v.food.slug===selected);if(!r)return;const names=availableMaterialNames(r.food,input().qty);const chosen=getChoices(r.food.slug,names);const name=el.dataset.buyName;if(!name)return;el.checked?chosen.add(name):chosen.delete(name);renderDetail()});
$('#detailBody').addEventListener('click',e=>{const b=e.target.closest('[data-select-all]');if(!b||!selected)return;const r=results.find(v=>v.food.slug===selected);if(!r)return;const names=availableMaterialNames(r.food,input().qty);materialSelections.set(materialKey(selected),new Set(b.dataset.selectAll==='1'?names:[]));renderDetail()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDetail()});
F.boot(load);
})();
