(()=>{"use strict";
const D=window.DDING_DATA||{foods:[],ingredients:{},crops:[]};
const F=window.MarketAdmin;
const PRICE_API="https://dding-price-api.hansuyeon191-6fe.workers.dev";
const PREF_KEY="ddingFoodMarginBuyPrefsV1";
const MODE_KEY="ddingFoodMarginModeV1";
const BASE_SEEDS={
  tomato_base:{crop:"tomato",seedName:"토마토 씨앗"},
  onion_base:{crop:"onion",seedName:"양파 씨앗"},
  garlic_base:{crop:"garlic",seedName:"마늘 씨앗"}
};

let allOffers=[],marketOffers=[],ownListings=[],ownSellerName="",latestScan=null;
let foodPrices={},foodPriceUpdated=null,results=[],selected=null;
let mode=localStorage.getItem(MODE_KEY)==="gold"?"gold":"normal";
let buyPrefs=loadPrefs();

const $=s=>document.querySelector(s);
const esc=v=>F.escapeHtml(v);
const fmt=n=>F.fmt(n);
const gold=n=>F.gold(n);
const median=a=>{const v=a.filter(Number.isFinite).slice().sort((x,y)=>x-y);if(!v.length)return null;const m=Math.floor(v.length/2);return v.length%2?v[m]:(v[m-1]+v[m])/2};
const price=o=>Math.max(0,Number(o?.listing_price)||0);
const qty=o=>Math.max(1,Math.floor(Number(o?.quantity)||1));
const stock=o=>Math.max(0,Math.floor(Number(o?.stock_quantity??o?.quantity??0)));
const unit=o=>{const q=qty(o),p=price(o);return q>0?p/q:null};
const wholeLots=o=>Math.max(0,Math.floor(stock(o)/qty(o)));

function loadPrefs(){
  try{
    const v=JSON.parse(localStorage.getItem(PREF_KEY)||"{}");
    return v&&typeof v==="object"&&!Array.isArray(v)?v:{};
  }catch(_){return {}}
}
function savePrefs(){localStorage.setItem(PREF_KEY,JSON.stringify(buyPrefs))}
function prefKey(food,need,foodMode=mode){
  return [foodMode,food.slug,need.kind,need.sourceId||"",need.marketName||need.name||""].join("|");
}
function shouldBuy(food,need,foodMode=mode){return buyPrefs[prefKey(food,need,foodMode)]!==false}
function setShouldBuy(food,need,value,foodMode=mode){
  const key=prefKey(food,need,foodMode);
  if(value)delete buyPrefs[key];else buyPrefs[key]=false;
  savePrefs();
}

function cleanOffers(rows){
  return (rows||[]).filter(o=>{
    const target=String(o?.raw_data?.searchTarget||"").trim();
    return !target||target===String(o?.item_name||"").trim();
  });
}

function inferOwnSeller(rows,ownRows){
  const usable=(ownRows||[]).filter(o=>o?.item_name&&Number(o?.listing_price)>0&&Number(o?.listed_quantity)>0);
  if(!usable.length)return "";
  const scores=new Map();
  for(const own of usable){
    const matches=rows.filter(o=>
      o.trade_type!=="buy" &&
      String(o.item_name||"").trim()===String(own.item_name||"").trim() &&
      Number(o.quantity)===Number(own.listed_quantity) &&
      Number(o.listing_price)===Number(own.listing_price) &&
      o.seller_name
    );
    for(const seller of new Set(matches.map(o=>String(o.seller_name)))) scores.set(seller,(scores.get(seller)||0)+1);
  }
  const ranked=[...scores.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  if(!ranked.length)return "";
  const [name,matched]=ranked[0],second=ranked[1]?.[1]||0;
  const required=usable.length>=2?Math.min(2,usable.length):1;
  return matched>=required&&matched!==second?name:"";
}

function isHighOutlier(o,group){
  const values=group.map(unit).filter(v=>Number.isFinite(v)&&v>0),u=unit(o);
  if(!(u>0)||values.length<2)return false;
  const sorted=values.slice().sort((a,b)=>a-b);
  if(values.length===2){
    const lo=sorted[0],hi=sorted[1];
    return u===hi&&lo>0&&hi>lo*20;
  }
  const med=median(values);
  if(!(med>0)||u<=med*5)return false;
  const mad=median(values.map(v=>Math.abs(v-med)))||0;
  return mad===0||((u-med)/(1.4826*mad)>6);
}

function normalSaleOffers(itemName){
  const all=marketOffers.filter(o=>o.trade_type!=="buy"&&String(o.item_name||"").trim()===itemName);
  const flagged=all.filter(o=>isHighOutlier(o,all));
  const normal=all.filter(o=>!flagged.includes(o));
  return {all,flagged,pool:normal.length?normal:all};
}

function purchasePlan(itemName,required){
  const source=normalSaleOffers(itemName);
  const pool=source.pool.slice().filter(o=>wholeLots(o)>0).sort((a,b)=>(unit(a)-unit(b))||(price(a)-price(b)));
  const need=Math.max(0,Math.ceil(Number(required)||0));
  let acquired=0,cost=0;
  const steps=[];
  for(const o of pool){
    if(acquired>=need)break;
    const lotQty=qty(o),available=wholeLots(o),remain=need-acquired;
    const take=Math.min(available,Math.ceil(remain/lotQty));
    if(take<=0)continue;
    const got=take*lotQty,lineCost=take*price(o);
    acquired+=got;cost+=lineCost;
    steps.push({offer:o,lots:take,qty:got,cost:lineCost});
  }
  return {itemName,required:need,acquired,cost,leftover:Math.max(0,acquired-need),complete:acquired>=need,steps,flagged:source.flagged};
}

function cropMeta(id){return (D.crops||[]).find(c=>c.id===id)||null}
function ingredientMeta(id){return D.ingredients?.[id]||{id,name:id,type:"미확인",recipe:[],icon:""}}

function directNeed(id,required,note="레시피 재료를 플리마켓에서 직접 구매"){
  const ing=ingredientMeta(id);
  return {
    kind:"direct",sourceId:id,marketName:ing.name,name:ing.name,icon:ing.icon||"",
    required:Math.max(0,Math.ceil(Number(required)||0)),note
  };
}

function normalFoodNeeds(food,outputQty){
  const rows=[];
  for(const [id,nRaw] of food.recipe||[]){
    const n=Math.max(0,Number(nRaw)||0);
    const base=BASE_SEEDS[id];
    if(base){
      const ing=ingredientMeta(id);
      const cropRecipe=(ing.recipe||[]).find(([child])=>child===base.crop);
      const cropPerBase=Math.max(0,Number(cropRecipe?.[1])||0);
      const baseQty=n*outputQty;
      const rawCropQty=baseQty*cropPerBase;
      const crop=cropMeta(base.crop);
      const yieldMin=Math.max(0,Number(crop?.yieldMin)||0);
      const yieldMax=Math.max(yieldMin,Number(crop?.yieldMax)||yieldMin);
      const yieldAvg=(yieldMin+yieldMax)/2;
      const required=yieldAvg>0?Math.ceil(rawCropQty/yieldAvg):rawCropQty;
      rows.push({
        kind:"seed",sourceId:id,marketName:base.seedName,name:base.seedName,
        icon:crop?.icon||ing.icon||"",required,
        baseName:ing.name,baseQty,rawCropName:crop?.name||base.crop,rawCropQty,
        yieldMin,yieldMax,yieldAvg,
        note:yieldAvg>0
          ?ing.name+" "+fmt(baseQty)+"개에 필요한 "+(crop?.name||base.crop)+" "+fmt(rawCropQty)+"개를 평균 수확량 "+yieldAvg.toLocaleString("ko-KR",{maximumFractionDigits:1})+"개/씨앗으로 환산"
          :"수확량 정보가 없어 작물 필요량과 같은 수의 씨앗으로 계산"
      });
    }else{
      rows.push(directNeed(id,n*outputQty));
    }
  }
  return rows;
}

function goldCraftNeeds(food,targetQty){
  const bulk=food?.gold?.bulk,single=food?.gold?.single;
  if(!bulk?.recipe?.length||!(Number(bulk.output)>0)||!single?.recipe?.length||!(Number(single.output)>0)){
    return {needs:[],meta:{available:false,bulkRuns:0,singleRuns:0,normalQty:0,produced:0}};
  }
  const bulkOut=Math.max(1,Math.floor(Number(bulk.output)||1));
  const singleOut=Math.max(1,Math.floor(Number(single.output)||1));
  const bulkRuns=Math.floor(targetQty/bulkOut);
  const remainder=Math.max(0,targetQty-bulkRuns*bulkOut);
  const singleRuns=remainder?Math.ceil(remainder/singleOut):0;
  const produced=bulkRuns*bulkOut+singleRuns*singleOut;

  let normalQty=0;
  const extras=new Map();
  const addRecipe=(recipe,runs)=>{
    for(const [id,nRaw] of recipe||[]){
      const n=Math.max(0,Number(nRaw)||0)*runs;
      if(id===food.slug){normalQty+=n;continue}
      extras.set(id,(extras.get(id)||0)+n);
    }
  };
  addRecipe(bulk.recipe,bulkRuns);
  addRecipe(single.recipe,singleRuns);

  const needs=normalFoodNeeds(food,normalQty);
  for(const [id,n] of extras){
    needs.push(directNeed(id,n,"황금 음식 제작 재료를 플리마켓에서 직접 구매"));
  }
  return {
    needs,
    meta:{
      available:true,bulkRuns,singleRuns,normalQty,produced,
      bulkOutput:bulkOut,singleOutput:singleOut,leftoverOutput:Math.max(0,produced-targetQty)
    }
  };
}

function currentFoodPrice(food,foodMode=mode){
  const key=foodMode==="gold"?(food?.gold?.name||("황금 "+food.name)):food.name;
  const row=foodPrices[key];
  if(!row)return null;
  const v=row.myPrice??row.marketPrice??row.price??row.current;
  if(v==null||v==="")return null;
  const n=Number(String(v).replace(/,/g,""));
  return Number.isFinite(n)?n:null;
}

function displayInfo(food,foodMode=mode){
  return foodMode==="gold"
    ?{name:food?.gold?.name||("황금 "+food.name),image:food.goldImage||food.image,grade:food?.gold?.grade||food.grade}
    :{name:food.name,image:food.image,grade:food.grade};
}

function evaluate(food,targetSets,foodMode=mode){
  const outputQty=Math.max(1,targetSets)*64;
  const craft=foodMode==="gold"?goldCraftNeeds(food,outputQty):{needs:normalFoodNeeds(food,outputQty),meta:null};
  const needs=craft.needs.map(n=>{
    const plan=purchasePlan(n.marketName,n.required);
    return {...n,plan,included:shouldBuy(food,n,foodMode),pref:prefKey(food,n,foodMode)};
  });
  const included=needs.filter(n=>n.included);
  const ingredientCost=included.reduce((sum,n)=>sum+n.plan.cost,0);
  const complete=included.every(n=>n.plan.complete);
  const saleUnit=currentFoodPrice(food,foodMode);
  const revenue=Number.isFinite(saleUnit)?Math.round(saleUnit*outputQty):null;
  const net=complete&&revenue!=null?revenue-ingredientCost:null;
  const margin=net!=null&&revenue>0?net/revenue*100:null;
  const roi=net!=null&&ingredientCost>0?net/ingredientCost*100:null;
  return {
    food,mode:foodMode,targetSets,outputQty,needs,ingredientCost,complete,saleUnit,revenue,net,margin,roi,
    excludedCount:needs.length-included.length,craftMeta:craft.meta,...displayInfo(food,foodMode)
  };
}

function normalizeFoodPrices(payload){
  const root=payload?.prices??payload??{};
  const src=root?.prices??root;
  const toNum=v=>{
    if(v==null||v==="")return null;
    const n=Number(String(v).replace(/,/g,""));
    return Number.isFinite(n)?n:null;
  };
  const out={};
  for(const [name,val] of Object.entries(src||{})){
    if(typeof val==="number")out[name]={marketPrice:val,myPrice:val};
    else if(val&&typeof val==="object")out[name]={
      marketPrice:toNum(val.marketPrice??val.price??val.current),
      myPrice:toNum(val.myPrice??val.personalPrice??val.marketPrice??val.price??val.current)
    };
  }
  return out;
}

async function loadFoodPrices(){
  let bundle=null;
  try{
    const r=await fetch(PRICE_API+"/dashboard",{cache:"no-store"});
    if(!r.ok)throw new Error("HTTP "+r.status);
    bundle=await r.json();
  }catch(_){
    const r=await fetch(PRICE_API+"/prices",{cache:"no-store"});
    if(!r.ok)throw new Error("HTTP "+r.status);
    const p=await r.json();
    bundle={prices:p?.prices??p};
  }
  foodPrices=normalizeFoodPrices(bundle?.prices??bundle);
  const p=bundle?.prices;
  foodPriceUpdated=p?.capturedAt||p?.updatedAt||p?.generatedAt||bundle?.status?.publishedAt||bundle?.status?.updatedAt||null;
}

function cls(v){
  if(v==null)return "muted";
  return v>0?"positive":v<0?"negative":"muted";
}
function status(r){
  if(!Number.isFinite(r.saleUnit))return {label:"음식 가격 없음",kind:"muted"};
  if(!r.complete)return {label:"구매 재료 부족",kind:"warn"};
  if(r.net>0)return {label:"이득",kind:"ok"};
  if(r.net<0)return {label:"손해",kind:"danger"};
  return {label:"본전",kind:"muted"};
}
function formatMargin(v){
  return Number.isFinite(v)?(v>=0?"+":"")+v.toLocaleString("ko-KR",{maximumFractionDigits:1})+"%":"—";
}
function dateTime(v){
  if(!v)return "—";
  const d=new Date(v);if(Number.isNaN(d.getTime()))return "—";
  return d.toLocaleString("ko-KR",{timeZone:"Asia/Seoul",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
}
function syncModeUi(){
  document.querySelectorAll("#foodModeTabs button[data-mode]").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));
  $("#modeHint").textContent=mode==="gold"
    ?"황금 음식 가격과 황금 제작법을 사용합니다. 대량 제작 후 남는 수량은 소량 제작법으로 정확히 목표 수량을 맞춥니다."
    :"일반 음식 가격과 일반 제작법을 사용합니다.";
  $("#foodSearch").placeholder=mode==="gold"?"예: 황금 딥 크림 빠네":"예: 딥 크림 빠네";
}

function render(){
  syncModeUi();
  const target=Math.min(99,Math.max(1,Math.floor(Number($("#targetSets").value)||1)));
  $("#targetSets").value=String(target);
  const q=$("#foodSearch").value.trim().toLowerCase();
  results=(D.foods||[]).map(f=>evaluate(f,target,mode));
  const ready=results.filter(r=>r.complete&&r.revenue!=null&&r.net!=null);
  const best=ready.slice().sort((a,b)=>b.net-a.net)[0]||null;
  const bestMargin=ready.slice().sort((a,b)=>b.margin-a.margin)[0]||null;

  $("#mReady").textContent=fmt(ready.length)+"종";
  $("#mBest").textContent=best?best.name:"—";
  $("#mBestSub").textContent=best?((best.net>=0?"+":"")+gold(best.net)+" · "+target+"세트"):"재료/가격 데이터 필요";
  $("#mMargin").textContent=bestMargin?formatMargin(bestMargin.margin):"—";
  $("#mScan").textContent=latestScan?dateTime(latestScan.completed_at):"—";
  $("#mPriceTime").textContent="음식 가격 갱신 "+dateTime(foodPriceUpdated);

  const sort=$("#sortMode").value;
  let shown=results.filter(r=>!q||r.name.toLowerCase().includes(q)||r.food.name.toLowerCase().includes(q));
  shown.sort((a,b)=>{
    if(sort==="margin")return (b.margin??-Infinity)-(a.margin??-Infinity);
    if(sort==="cost")return (a.complete?a.ingredientCost:Infinity)-(b.complete?b.ingredientCost:Infinity);
    if(sort==="price")return (b.saleUnit??-Infinity)-(a.saleUnit??-Infinity);
    return (b.net??-Infinity)-(a.net??-Infinity);
  });
  $("#resultCount").textContent=(mode==="gold"?"황금 ":"일반 ")+fmt(shown.length)+"종 · "+fmt(target*64)+"개 제작 기준";

  $("#foodGrid").innerHTML=shown.length?shown.map((r,i)=>{
    const st=status(r),missing=r.needs.filter(n=>n.included&&!n.plan.complete);
    const netText=r.net==null?"계산 불가":(r.net>=0?"+":"")+gold(r.net);
    const costText=r.complete?gold(r.ingredientCost):gold(r.ingredientCost)+" + 부족";
    const revText=r.revenue==null?"—":gold(r.revenue);
    const topBadge=i===0&&sort==="net"&&r.net!=null?'<span class="fm-top-badge">순이익 1위</span>':"";
    const owned=r.excludedCount?'<span class="fm-owned-note">보유/직접 조달 '+fmt(r.excludedCount)+'종 제외</span>':"";
    return '<article class="fm-card '+(r.net==null?"unavailable":"")+' '+(mode==="gold"?"gold-mode":"")+'">'+
      '<div class="fm-card-head"><div class="fm-food"><img src="'+esc(r.image||"")+'" alt=""><div>'+topBadge+'<span class="fm-grade">'+esc(r.grade||"")+'</span><h3>'+esc(r.name)+'</h3><small>'+fmt(r.outputQty)+'개 · '+fmt(r.targetSets)+'세트</small></div></div>'+
      '<div class="fm-net '+cls(r.net)+'">'+netText+'<small>마진율 '+formatMargin(r.margin)+'</small></div></div>'+
      '<div class="fm-kpis">'+
        '<div><span>구매할 재료비</span><strong>'+costText+'</strong>'+owned+'</div>'+
        '<div><span>음식 판매금액</span><strong>'+revText+'</strong><small>'+(r.saleUnit==null?"판매가 없음":gold(r.saleUnit)+" / 1개")+'</small></div>'+
        '<div><span>원가 대비 수익률</span><strong>'+formatMargin(r.roi)+'</strong></div>'+
      '</div>'+
      '<div class="fm-card-foot"><div><span class="fm-badge '+st.kind+'">'+st.label+'</span><small>'+(missing.length?" 부족: "+missing.map(x=>esc(x.name)).join(", "):" 체크한 재료만 실제 매물 순차 구매 반영")+'</small></div>'+
      '<button type="button" data-detail="'+esc(r.food.slug)+'">상세보기</button></div>'+
    '</article>';
  }).join(""):'<div class="fm-panel fm-empty"><strong>검색 결과가 없습니다</strong><p>다른 음식 이름으로 검색해 주세요.</p></div>';
}

function stepRows(plan){
  if(!plan.steps.length)return '<tr><td colspan="5">구매 가능한 정상 판매 매물이 없습니다.</td></tr>';
  return plan.steps.map(s=>{
    const o=s.offer,shop=String(o?.raw_data?.shopName||"—");
    return '<tr><td><strong>'+esc(o.seller_name||"—")+'</strong><small>'+esc(shop)+'</small></td>'+
      '<td>'+gold(o.listing_price)+' / '+fmt(o.quantity)+'개</td>'+
      '<td>'+fmt(stock(o))+'개</td><td>'+fmt(s.lots)+'묶음 · '+fmt(s.qty)+'개</td><td><b>'+gold(s.cost)+'</b></td></tr>';
  }).join("");
}

function detailNeedHtml(r,n){
  const p=n.plan,included=n.included;
  const seedInfo=n.kind==="seed"
    ?'<div class="fm-seed-note"><b>'+esc(n.baseName)+' 대신 '+esc(n.name)+' 비용 반영</b><span>'+
      esc(n.rawCropName)+' '+fmt(n.rawCropQty)+'개 필요 · 평균 수확량 '+Number(n.yieldAvg||0).toLocaleString("ko-KR",{maximumFractionDigits:1})+
      '개/씨앗 → 예상 씨앗 '+fmt(n.required)+'개</span></div>'
    :"";
  const stateBadge=included
    ?'<span class="fm-badge '+(p.complete?"ok":"warn")+'">'+(p.complete?"조달 가능":"재고 부족")+'</span>'
    :'<span class="fm-badge owned">보유 / 구매 제외</span>';
  const costText=included?gold(p.cost):"원가 제외";
  return '<section class="fm-detail-item '+(included?"":"excluded")+'">'+
    '<div class="fm-detail-title"><div>'+stateBadge+'<h3>'+esc(n.name)+'</h3><small>'+esc(n.kind==="seed"?"베이스 재배용 씨앗":"플리마켓 직접 구매")+'</small></div>'+
    '<div><span>필요 '+fmt(p.required)+'개</span><strong>'+costText+'</strong></div></div>'+
    '<label class="fm-buy-check"><input type="checkbox" data-buy-pref="'+esc(n.pref)+'" data-food="'+esc(r.food.slug)+'" '+(included?"checked":"")+'><span><b>이 재료를 플리마켓에서 구매</b><small>'+(included?"총 재료비와 순이익 계산에 포함":"이미 보유하거나 직접 조달 · 비용 계산에서 제외")+'</small></span></label>'+
    seedInfo+
    '<div class="fm-procure-summary"><span>시장 기준 구매 '+fmt(p.acquired)+'개</span><span>남는 수량 '+fmt(p.leftover)+'개</span><span>고가 이상치 제외 '+fmt(p.flagged.length)+'건</span></div>'+
    '<details><summary>'+(included?"실제 구매 순서":"참고용 시장 구매 순서")+' '+fmt(p.steps.length)+'단계 보기</summary><div class="fm-table-wrap"><table><thead><tr><th>판매자 / 상점</th><th>판매 단위</th><th>재고</th><th>실제 구매</th><th>비용</th></tr></thead><tbody>'+stepRows(p)+'</tbody></table></div></details>'+
  '</section>';
}

function openDetail(slug){
  const r=results.find(x=>x.food.slug===slug);if(!r)return;
  selected={slug,mode:r.mode};
  $("#detailTitle").textContent=r.name+" · "+fmt(r.targetSets)+"세트";
  const st=status(r);
  const includedCount=r.needs.length-r.excludedCount;
  const craftNote=r.mode==="gold"&&r.craftMeta?.available
    ?'<div class="fm-gold-plan"><span>황금 제작 구성</span><strong>대량 '+fmt(r.craftMeta.bulkRuns)+'회 + 소량 '+fmt(r.craftMeta.singleRuns)+'회</strong><small>일반 '+esc(r.food.name)+' '+fmt(r.craftMeta.normalQty)+'개 사용 · 황금 완성 '+fmt(r.craftMeta.produced)+'개'+(r.craftMeta.leftoverOutput?' · 잔여 '+fmt(r.craftMeta.leftoverOutput)+'개':'')+'</small></div>'
    :"";
  const needs=r.needs.map(n=>detailNeedHtml(r,n)).join("");

  $("#detailBody").innerHTML=
    '<div class="fm-detail-hero">'+
      '<div class="fm-detail-food"><img src="'+esc(r.image||"")+'" alt=""><div><span class="fm-grade">'+esc(r.grade||"")+'</span><h3>'+esc(r.name)+'</h3><p>'+fmt(r.outputQty)+'개 판매 목표</p></div></div>'+
      '<span class="fm-badge '+st.kind+'">'+st.label+'</span>'+
    '</div>'+
    craftNote+
    '<div class="fm-detail-total">'+
      '<div><span>구매 포함 재료</span><strong>'+fmt(includedCount)+'종</strong><small>보유/직접 조달 '+fmt(r.excludedCount)+'종 제외</small></div>'+
      '<div><span>총 구매 재료비</span><strong>'+gold(r.ingredientCost)+(r.complete?"":" + 재료 부족")+'</strong></div>'+
      '<div><span>음식 판매금액</span><strong>'+(r.revenue==null?"—":gold(r.revenue))+'</strong><small>'+(r.saleUnit==null?"판매가 없음":gold(r.saleUnit)+" / 1개")+'</small></div>'+
      '<div class="hero"><span>예상 순이익</span><strong class="'+cls(r.net)+'">'+(r.net==null?"계산 불가":(r.net>=0?"+":"")+gold(r.net))+'</strong><small>마진율 '+formatMargin(r.margin)+' · 원가 대비 '+formatMargin(r.roi)+'</small></div>'+
    '</div>'+
    '<div class="fm-detail-section-head fm-detail-tools"><div><h3>내가 살 재료 선택</h3><p>체크된 재료만 실제 구매비에 포함합니다. 이미 가지고 있거나 직접 구할 재료는 체크를 끄면 됩니다.</p></div>'+
      '<div><button type="button" data-pref-all="1">전체 구매</button><button type="button" data-pref-all="0">전부 보유 처리</button></div></div>'+
    needs+
    '<div class="fm-detail-note">체크 상태는 이 브라우저에 음식별·일반/황금별로 저장됩니다. 베이스용 씨앗 수량은 띵팜에 기록된 평균 1회 수확량을 사용한 예상치이며 실제 수확량에 따라 달라질 수 있습니다. 확인되지 않은 수수료는 포함하지 않습니다.</div>';

  const b=$("#detailBackdrop");b.classList.add("open");b.setAttribute("aria-hidden","false");
}

function closeDetail(){
  const b=$("#detailBackdrop");b.classList.remove("open");b.setAttribute("aria-hidden","true");selected=null;
}

function refreshSelected(){
  const slug=selected?.slug;
  render();
  if(slug)openDetail(slug);
}

async function load(){
  try{
    const [marketData,ownData]=await Promise.all([
      F.marketOffers(),
      F.market("market-own-listings").catch(()=>({listings:[]})),
      loadFoodPrices()
    ]);
    latestScan=marketData.latest_scan||null;
    allOffers=cleanOffers(marketData.offers||[]);
    ownListings=Array.isArray(ownData?.listings)?ownData.listings:[];
    ownSellerName=inferOwnSeller(allOffers,ownListings);
    marketOffers=allOffers.filter(o=>!(o.trade_type!=="buy"&&ownSellerName&&String(o.seller_name||"")===ownSellerName));
    $("#marketStatus").innerHTML='<i class="ok"></i>플리마켓 연결 · '+fmt(marketOffers.filter(o=>o.trade_type!=="buy").length)+'개 판매 매물';
    $("#foodPriceStatus").innerHTML='<i class="ok"></i>음식 가격 연결 · '+fmt(Object.keys(foodPrices).length)+'종';
    render();
  }catch(e){
    console.error(e);
    $("#marketStatus").innerHTML='<i class="bad"></i>데이터 연결 실패';
    $("#foodPriceStatus").innerHTML='<i class="bad"></i>가격 확인 필요';
    $("#foodGrid").innerHTML='<div class="fm-panel fm-empty"><strong>데이터를 불러오지 못했습니다</strong><p>'+esc(e.message||"잠시 후 다시 시도해 주세요.")+'</p></div>';
  }
}

$("#foodModeTabs").addEventListener("click",e=>{
  const b=e.target.closest("button[data-mode]");if(!b||b.dataset.mode===mode)return;
  mode=b.dataset.mode==="gold"?"gold":"normal";
  localStorage.setItem(MODE_KEY,mode);
  $("#foodSearch").value="";
  closeDetail();
  render();
});
$("#targetSets").addEventListener("input",()=>{closeDetail();render()});
$("#sortMode").addEventListener("change",render);
$("#foodSearch").addEventListener("input",render);
$("#foodGrid").addEventListener("click",e=>{const b=e.target.closest("[data-detail]");if(b)openDetail(b.dataset.detail||"")});
$("#detailBody").addEventListener("change",e=>{
  const cb=e.target.closest('input[data-buy-pref]');if(!cb||!selected)return;
  const r=results.find(x=>x.food.slug===selected.slug);if(!r)return;
  const need=r.needs.find(n=>n.pref===cb.dataset.buyPref);if(!need)return;
  setShouldBuy(r.food,need,cb.checked,r.mode);
  refreshSelected();
});
$("#detailBody").addEventListener("click",e=>{
  const b=e.target.closest("button[data-pref-all]");if(!b||!selected)return;
  const r=results.find(x=>x.food.slug===selected.slug);if(!r)return;
  const value=b.dataset.prefAll==="1";
  for(const need of r.needs)setShouldBuy(r.food,need,value,r.mode);
  refreshSelected();
});
$("#detailClose").addEventListener("click",closeDetail);
$("#detailBackdrop").addEventListener("click",e=>{if(e.target===e.currentTarget)closeDetail()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDetail()});

F.boot(load);
})();