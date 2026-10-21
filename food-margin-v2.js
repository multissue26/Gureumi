(()=>{'use strict';
const D=window.DDING_DATA||{foods:[],ingredients:{},crops:[]};
const F=window.MarketAdmin;const P=window.DDING_PROFIT;
const PRICE_API='https://dding-price-api.hansuyeon191-6fe.workers.dev';
const $=s=>document.querySelector(s);
const esc=v=>F.escapeHtml(v??'');
const fmt=v=>Number(v||0).toLocaleString('ko-KR',{maximumFractionDigits:2});
const gold=v=>Number.isFinite(v)?fmt(v)+' G':'—';
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
function evalFood(food,qty,sc='average'){
 return P.assess(food,qty,mode,sc,CTX());
}
function render(){
 const {qty,explicit}=input();const notice=$('#inputMessage');
 notice.textContent=qty==null?'1 이상인 정수만 입력할 수 있어요. 최대 1,000,000개까지 계산 가능합니다.':explicit?`총 ${fmt(qty)}개 · ${$('#targetUnit').value==='set'?'1세트 = 64개':'개별 수량'}`:'미입력 · 음식 1개 기준';
 notice.classList.toggle('invalid',qty==null);
 $('#foodModeTabs').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
 $('#modeHint').textContent=mode==='gold'?'황금 제작법의 대량·소량 사용량과 금 가루 비용을 모두 반영합니다.':'중간 제작 재료까지 분해하고, 베이스는 씨앗 비용으로 환산합니다.';
 if(qty==null){$('#foodGrid').innerHTML='<div class="fm-panel fm-empty">제작 수량을 다시 확인해 주세요.</div>';return}
 results=D.foods.map(f=>evalFood(f,qty));
 const ready=results.filter(x=>x.complete&&x.estimate!=null);
 const q=$('#foodSearch').value.trim().toLowerCase();
 const sorted=results.filter(r=>r.name.toLowerCase().includes(q)||r.food.name.toLowerCase().includes(q));
 const sort=$('#sortMode').value;
 sorted.sort((a,b)=>{
  const aa=a.complete&&a.estimate!=null,bb=b.complete&&b.estimate!=null;
  if(aa!==bb)return aa?-1:1;
  if(sort==='price')return (b.unit??-Infinity)-(a.unit??-Infinity);
  if(sort==='cost')return (a.complete?a.cost:Infinity)-(b.complete?b.cost:Infinity);
  if(sort==='margin')return (b.estimate!=null&&b.gross>0?b.estimate/b.gross:-Infinity)-(a.estimate!=null&&a.gross>0?a.estimate/a.gross:-Infinity);
  return (b.estimate??-Infinity)-(a.estimate??-Infinity);
 });
 $('#resultCount').textContent=fmt(sorted.length)+'종 · '+fmt(qty)+'개 기준';
 $('#mReady').textContent=fmt(ready.length)+'종';
 const best=ready.slice().sort((a,b)=>b.estimate-a.estimate)[0];
 $('#mBest').textContent=best?best.name:'—';
 $('#mBestSub').textContent=best?signed(best.estimate)+' · 수수료 제외':'가격·구매 가능 재료 확인 필요';
 const margins=ready.filter(r=>r.gross>0).map(r=>100*r.estimate/r.gross);
 $('#mMargin').textContent=margins.length?fmt(Math.max(...margins))+'%':'—';
 $('#mScan').textContent=lastScan?dateTime(lastScan):'—';
 $('#mPriceTime').textContent='음식 가격 갱신 '+(priceTime?dateTime(priceTime):'시각 미확인');
 $('#foodGrid').innerHTML=sorted.map((r,i)=>{
  const noCost=r.estimate==null,available=r.complete&&r.unit!=null;
  const img=mode==='gold'?(r.food.goldImage||r.food.image):r.food.image;
  const per=r.estimate==null?'—':gold(r.estimate/qty);
  const headline=noCost?'계산 불가':signed(r.estimate);
  const why=r.errors.length?r.errors.join(' · '):r.unit==null?'음식 판매가 없음':r.plans.filter(x=>!x.plan.complete).map(x=>x.name).join(', ')+' 재고/구매가 부족';
  const badge=available?'<span class="fm-badge ok">재료 조달 계산 가능</span>':'<span class="fm-badge warn">'+esc(why?'확인 필요':'자료 부족')+'</span>';
  return '<article class="fm-card '+(noCost?'unavailable ':'')+(mode==='gold'?'gold-mode':'')+'">'+
   '<div class="fm-card-head"><div class="fm-food"><img src="'+esc(img||'')+'" alt=""><div><span class="fm-grade">'+esc(mode==='gold'?r.food.gold?.grade||'':r.food.grade||'')+'</span><h3>'+esc(r.name)+'</h3><small>'+fmt(qty)+'개 기준</small></div></div>'+
   '<div class="fm-net '+(r.estimate>0?'positive':r.estimate<0?'negative':'muted')+'">'+headline+'<small>개당 차익 '+per+'</small></div></div>'+
   '<div class="fm-kpis"><div><span>재료 조달 비용</span><strong>'+gold(r.cost)+'</strong></div><div><span>예상 판매금액</span><strong>'+(r.gross==null?'—':gold(r.gross))+'</strong></div><div><span>구매 가능</span><strong>'+fmt(r.plans.filter(x=>x.plan.complete).length)+' / '+fmt(r.plans.length)+'종</strong></div></div>'+
   '<div class="fm-card-foot"><div>'+badge+'<small>'+(why?' '+esc(why):' 평균 수확 시나리오 · 수수료 제외')+'</small></div><button data-detail="'+esc(r.food.slug)+'">구매 목록 보기</button></div></article>';
 }).join('')||'<div class="fm-panel fm-empty">일치하는 요리가 없습니다.</div>';
}
function purchaseTable(rows){
 if(!rows.length)return '<p class="fm-detail-note">확인 가능한 구매 매물이 없습니다.</p>';
 return '<div class="fm-table-wrap"><table><thead><tr><th>판매자 / 구매처</th><th>구매 품목</th><th>묶음 단위</th><th>수량</th><th>구매비</th></tr></thead><tbody>'+rows.map(s=>
  '<tr><td><strong>'+esc(s.seller)+'</strong><small>'+esc(s.shop)+(s.verified?' · 확인 '+esc(s.verified):'')+'</small></td><td>'+esc(s.name)+'</td><td>'+fmt(s.unit)+'개 × '+fmt(s.lots)+'회</td><td>'+fmt(s.quantity)+'개</td><td><b>'+gold(s.cost)+'</b></td></tr>'
 ).join('')+'</tbody></table></div>';
}
function openDetail(slug){
 const r=results.find(v=>v.food.slug===slug);if(!r)return;
 selected=slug;
 $('#detailTitle').textContent=r.name+' · '+fmt(r.quantity)+'개';
 const conservative=evalFood(r.food,r.quantity,'minimum');
 const allSteps=r.plans.flatMap(x=>x.plan.steps);
 const issues=r.errors.concat(r.plans.filter(x=>!x.plan.complete).map(x=>x.name+': 구매처/재고 미확인'));
 const img=r.mode==='gold'?(r.food.goldImage||r.food.image):r.food.image;
 const gross=r.gross==null?'음식 판매가 미확인':gold(r.gross);
 const fmtValue=x=>x==null?'계산 불가':signed(x);
 const base=r.baseDetails.map(x=>'<li>'+esc(x.base)+' '+fmt(x.baseCount)+'개 → '+esc(x.crop)+' '+fmt(x.cropCount)+'개 → '+esc(x.seed)+' 평균 '+fmt(x.seedCount)+'개 (1회 수확 '+fmt(x.yieldMin)+'~'+fmt(x.yieldMax)+'개)</li>').join('');
 const goldCraft=r.meta?'<p class="fm-detail-note">황금 제작: 대량 '+fmt(r.meta.bulkRuns)+'회, 소량 '+fmt(r.meta.singleRuns)+'회 · 일반 음식 '+fmt(r.meta.normalCount)+'개 사용'+(r.meta.overproduced?' · 초과 제작 '+fmt(r.meta.overproduced)+'개':'')+' · 제작 조합 '+fmt(r.choiceCount||1)+'개 비교'+(r.choiceLimited?' (최적 조합 보장 안 됨)':'')+'</p>':'';
 $('#detailBody').innerHTML='<div class="fm-detail-hero"><div class="fm-detail-food"><img src="'+esc(img||'')+'" alt=""><div><span class="fm-grade">'+esc(r.mode==='gold'?'GOLD':r.food.grade)+'</span><h3>'+esc(r.name)+'</h3><p>개당 예상 차익 '+(r.estimate==null?'—':gold(r.estimate/r.quantity))+'</p></div></div><span class="fm-badge '+(r.complete?'ok':'warn')+'">'+(r.complete?'구매 목록 계산됨':'재료 부족/정보 확인')+'</span></div>'+goldCraft+
 '<div class="fm-detail-total">'+
 '<div><span>총 재료비 (확인된 매물 기준)</span><strong>'+gold(r.cost)+'</strong></div>'+ 
 '<div><span>총 판매 예상금액</span><strong>'+gross+'</strong></div>'+ 
 '<div class="hero"><span>예상 차익 · 수수료 제외</span><strong class="'+(r.estimate<0?'negative':'')+'">'+fmtValue(r.estimate)+'</strong><small>확인되지 않은 판매 수수료를 순이익으로 확정하지 않습니다.</small></div>'+ 
 '<div><span>최소 수확 시나리오 · 수수료 제외</span><strong>'+fmtValue(conservative.estimate)+'</strong><small>작물이 매번 최소치로 수확된 경우 · 재고/가격 부족 시 계산 불가</small></div></div>'+ 
 '<div class="fm-detail-section-head"><h3>실제 구매 목록</h3><p>필요한 원재료를 플리마켓 판매자·NPC별로 구분했습니다. 화면의 매물은 실제 구매 시 변경될 수 있습니다.</p></div>'+purchaseTable(allSteps)+
 '<div class="fm-detail-section-head"><h3>재료별 필요 수량</h3></div>'+ 
 '<div class="fm-requirements">'+r.plans.map(x=>'<div><span>'+esc(x.name)+' · 필요 '+fmt(x.quantity)+'개</span><strong>'+(x.plan.complete?gold(x.plan.cost):'미확인 / '+gold(x.plan.cost))+'</strong></div>').join('')+'</div>'+ 
 (base?'<div class="fm-detail-section-head"><h3>베이스 씨앗 환산 과정</h3><p>평균 수확 기준은 확정 수량이 아닙니다.</p></div><ul class="fm-base-list">'+base+'</ul>':'')+
 (issues.length?'<div class="fm-detail-alert"><strong>확인 필요</strong><p>'+esc(issues.join(' · '))+'</p></div>':'')+
 (r.plans.some(x=>!x.plan.optimal&&x.plan.complete)?'<p class="fm-detail-note">일부 재료는 구매 수량이 커서 빠른 단가순 구매 조합을 사용했습니다. 실제 구매 목록의 비용은 계산했지만 최소 총구매비라고 보장하지 않습니다.</p>':'')+
 '<p class="fm-detail-note">중간 제작 재료는 하위 원재료로 전개합니다. 묶음 구매는 실제 묶음 단위로 계산하므로 남는 재료가 생길 수 있습니다. 판매 수수료·NPC 가격 변동은 아직 최종 확인되지 않았습니다. 순이익으로 확정하지 않고 수수료 제외 차익을 보여줍니다. 가격 데이터가 갱신되면 다시 계산됩니다.</p>';
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
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDetail()});
F.boot(load);
})();
