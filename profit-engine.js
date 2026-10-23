/* 띵팜 수익 계산 엔진 — 외부 통신 및 DOM에 의존하지 않음. */
(function(root, factory){
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  if(root)root.DDING_PROFIT=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const SEEDS={tomato:{name:'토마토 씨앗'},onion:{name:'양파 씨앗'},garlic:{name:'마늘 씨앗'}};
  const EPS=1e-9;
  // 현재 플리마켓에서 실제 완성 재료로 거래되는 가공 아이템은
  // 원재료로 재귀 분해하지 않는다. 베이스는 여기에 포함하지 않는다.
  const MARKET_FINISHED=new Set(['sugar_cube','cheese_slice','flour_dough','butter_slice']);
  // 금가루는 게임 내 직접 수급이 확정된 재료다. 구매비·소비원가·매물 검사에서 제외한다.
  const GOLD_SELF_SUPPLIED=new Set(['gold_dust','edible_gold_dust']);
  function ownGold(leaf,mode){return mode==='gold'&&GOLD_SELF_SUPPLIED.has(leaf?.id)}
  function positiveInt(n){return Number.isSafeInteger(Number(n))&&Number(n)>0?Number(n):null}
  function integer(n){return Number.isSafeInteger(Number(n))&&Number(n)>=0?Number(n):null}
  function inputCount(raw,unit){
    if(raw==null||String(raw).trim()==='')return 1;
    const val=Number(raw);
    if(!positiveInt(val))return null;
    const count=unit==='set'?val*64:val;
    return positiveInt(count)&&count<=1000000?count:null;
  }
  function safeName(o){return String(o?.name||o?.item_name||'').trim()}
  function recipeLeaves(food,output,data,scenario='average'){
    const leaves=new Map(),baseDetails=[],errors=[];
    if(!positiveInt(output))return {leaves:[],baseDetails,errors:['제작 수량 오류']};
    const ingredient=data?.ingredients||{}, crops=data?.crops||[];
    const cropMap=new Map(crops.map(c=>[c.id,c]));
    function add(name,amount,id){
      if(!(Number.isSafeInteger(amount)&&amount>=0)){errors.push(name+' 수량 오류');return}
      if(!amount)return;
      const r=leaves.get(name)||{id,name,quantity:0};r.quantity+=amount;
      if(!Number.isSafeInteger(r.quantity))errors.push(name+' 수량 초과');
      leaves.set(name,r);
    }
    function expand(id,amount,trail=[]){
      if(!positiveInt(amount))return errors.push('잘못된 레시피 수량: '+id);
      if(trail.includes(id))return errors.push('순환 레시피: '+[...trail,id].join(' → '));
      const record=ingredient[id];
      if(!record?.name)return errors.push('확인되지 않은 재료 ID: '+id);
      if(SEEDS[id] && !record.recipe?.length)return errors.push(id+' 베이스 정보 오류');
      if(id.endsWith('_base') && !record.recipe?.length)return errors.push(record.name+'의 레시피 없음');
      // 농작물 가공 시설의 '묶음'은 플리마켓에 올라오는 실제 아이템 단위다.
      // 재료 1묶음을 낱개 원작물 32/64개로 풀어 구매하면 다른 품목이므로 안 된다.
      // 토마토/양파/마늘 베이스처럼 판매되지 않는 중간 재료는 아래에서 계속 분해한다.
      if(record.type==='묶음'||MARKET_FINISHED.has(id)){ add(record.name,amount,id); return; }
      if(record.recipe?.length){
        // 알려진 토마토/양파/마늘 베이스는 씨앗 수확량을 고려해 전개한다.
        if(id.endsWith('_base') && record.recipe.length===1 && SEEDS[record.recipe[0][0]]){
          const [cropId,cropPerBase]=record.recipe[0];const crop=cropMap.get(cropId);
          const min=positiveInt(crop?.yieldMin),max=positiveInt(crop?.yieldMax);
          const ratio=positiveInt(cropPerBase);
          if(!ratio||!min||!max||max<min){errors.push(record.name+'의 수확량/제작법 미확인');return}
          const cropQty=ratio*amount,average=(min+max)/2;
          const seedCount=Math.ceil(cropQty/(scenario==='minimum'?min:average));
          add(SEEDS[cropId].name,seedCount,cropId+'_seed');
          baseDetails.push({base:record.name,baseCount:amount,crop:crop.name,cropCount:cropQty,seed:SEEDS[cropId].name,seedCount,yieldMin:min,yieldMax:max,yieldAvg:average,scenario});
          return;
        }
        for(const pair of record.recipe){
          if(!Array.isArray(pair)||pair.length!==2||!positiveInt(pair[1])){errors.push(record.name+' 제작법 오류');continue}
          expand(pair[0],amount*Number(pair[1]),[...trail,id]);
        }
        return;
      }
      add(record.name,amount,id);
    }
    if(!Array.isArray(food?.recipe))errors.push('음식 레시피 없음');
    else for(const pair of food.recipe){
      if(!Array.isArray(pair)||pair.length!==2||!positiveInt(pair[1])){errors.push('음식 레시피 항목 오류');continue}
      expand(pair[0],output*Number(pair[1]));
    }
    return {leaves:[...leaves.values()],baseDetails,errors};
  }
  function mergeLeaves(...parts){
    const map=new Map(),errors=[],baseDetails=[];
    for(const part of parts){
      errors.push(...(part.errors||[]));baseDetails.push(...(part.baseDetails||[]));
      for(const r of part.leaves||[]){
        const old=map.get(r.name)||{id:r.id,name:r.name,quantity:0};
        old.quantity+=r.quantity;map.set(r.name,old);
      }
    }
    return {leaves:[...map.values()],baseDetails,errors};
  }
  function goldNeeds(food,target,data,scenario='average',bulkRunsOverride=null){
    const bulk=food?.gold?.bulk,single=food?.gold?.single;
    if(!positiveInt(bulk?.output)||!positiveInt(single?.output)||!Array.isArray(bulk?.recipe)||!Array.isArray(single?.recipe)){
      return {leaves:[],baseDetails:[],errors:['황금 제작법 미확인'],meta:null};
    }
    const bulkOut=bulk.output,singleOut=single.output;
    const bulkRuns=bulkRunsOverride===null?Math.floor(target/bulkOut):bulkRunsOverride;
    if(!Number.isSafeInteger(bulkRuns)||bulkRuns<0||bulkRuns>Math.ceil(target/bulkOut))return {leaves:[],baseDetails:[],errors:['황금 제작 횟수 오류'],meta:null};
    const missing=Math.max(0,target-bulkRuns*bulkOut);
    const singleRuns=Math.ceil(missing/singleOut);
    const produced=bulkRuns*bulkOut+singleRuns*singleOut;
    const extra=new Map();let normalCount=0;
    for(const [recipe,runs] of [[bulk.recipe,bulkRuns],[single.recipe,singleRuns]]){
      for(const [id,count] of recipe){
        if(!positiveInt(count))return {leaves:[],baseDetails:[],errors:['황금 레시피 수량 오류'],meta:null};
        if(id===food.slug)normalCount+=runs*count;
        else extra.set(id,(extra.get(id)||0)+runs*count);
      }
    }
    const normal=recipeLeaves(food,normalCount,data,scenario);
    const additions=[{leaves:[],errors:[],baseDetails:[]}];
    for(const [id,count] of extra){
      if(count<=0)continue;
      const ing=data?.ingredients?.[id];
      if(!ing?.name){additions[0].errors.push('황금 재료 ID 확인 필요: '+id);continue}
      // 황금 재료도 향후 하위 제작식이 연결되는 경우 이를 반영
      if(ing.recipe?.length){
        const temp={recipe:[[id,count]]};additions.push(recipeLeaves(temp,1,data,scenario));
      }else additions[0].leaves.push({id,name:ing.name,quantity:count});
    }
    const result=mergeLeaves(normal,...additions);
    result.meta={normalCount,bulkRuns,singleRuns,produced,overproduced:produced-target,bulkOut,singleOut};
    return result;
  }
  function npcMap(shop){
    const map=new Map();
    for(const r of shop?.items||[]){
      if(r.action!=='buy')continue;
      const match=String(r.value??'').replace(/,/g,'').match(/^\s*(\d+(?:\.\d+)?)\s*G\s*$/i);
      if(!match)continue;
      const price=Number(match[1]);if(!Number.isSafeInteger(price)||price<0)continue;
      const name=safeName(r),old=map.get(name);
      if(!old||price<old.price)map.set(name,{name,price,npc:r.npc||'',location:r.location||'',verified:r.verified||shop?.meta?.verified||''});
    }
    return map;
  }
  function offerStock(o){return integer(o?.stock_quantity??o?.quantity)}
  function offerLots(o){
    const q=positiveInt(o?.quantity),stock=offerStock(o),price=Number(o?.listing_price);
    if(!q||stock===null||!Number.isSafeInteger(price)||price<=0)return null;
    return {quantity:q,price,available:Math.floor(stock/q),seller:String(o?.seller_name||'판매자 정보 없음'),shop:String(o?.raw_data?.shopName||''),offer:o};
  }
  function exactPurchase(name,need,candidate,npc){
    if(need>2048||candidate.length>100)return null;
    const maxLot=Math.max(1,...candidate.map(c=>c.quantity));
    if(maxLot>2048)return null;
    const limit=need+maxLot-1;
    const groups=[];
    for(let i=0;i<candidate.length;i++){
      const o=candidate[i];let lots=Math.min(o.available,Math.floor(limit/o.quantity));
      for(let unit=1;lots>0;unit*=2){
        const count=Math.min(unit,lots);groups.push({index:i,amount:o.quantity*count,cost:o.price*count,lots:count});lots-=count;
      }
    }
    if(groups.length>160)return null;
    const dp=new Float64Array(limit+1);dp.fill(Infinity);dp[0]=0;
    const path=new Array(limit+1).fill(null);
    for(const item of groups){
      for(let qty=limit;qty>=item.amount;qty--){
        const prev=qty-item.amount;
        const cost=dp[prev]+item.cost;
        if(cost+EPS<dp[qty]){
          dp[qty]=cost;path[qty]={before:path[prev],index:item.index,lots:item.lots};
        }
      }
    }
    let best=Infinity,bestQty=-1;
    for(let q=npc?0:need;q<=limit;q++){
      if(!Number.isFinite(dp[q]))continue;
      const cost=dp[q]+(npc?Math.max(0,need-q)*npc.price:0);
      if(cost+EPS<best){best=cost;bestQty=q}
    }
    if(bestQty<0)return null;
    const purchased=new Array(candidate.length).fill(0);
    for(let node=path[bestQty];node;node=node.before)purchased[node.index]+=node.lots;
    let obtained=0,total=0;const steps=[];
    for(let i=0;i<candidate.length;i++){
      const n=purchased[i];if(!n)continue;
      const o=candidate[i],quantity=n*o.quantity,cost=n*o.price;
      obtained+=quantity;total+=cost;
      steps.push({type:'market',name,quantity,unit:o.quantity,lots:n,cost,seller:o.seller,shop:o.shop,offer:o.offer});
    }
    if(npc&&obtained<need){
      const quantity=need-obtained,cost=quantity*npc.price;
      obtained+=quantity;total+=cost;
      steps.push({type:'npc',name,quantity,unit:1,lots:quantity,cost,seller:'NPC · '+npc.npc,shop:npc.location,verified:npc.verified});
    }
    return {name,required:need,obtained,leftover:obtained-need,cost:total,complete:true,steps,reason:'',npcUsed:steps.some(s=>s.type==='npc'),optimal:true};
  }
  function selectPurchases(name,need,offers,npcs){
    if(!positiveInt(need))return {name,required:need,obtained:0,leftover:0,cost:0,complete:false,steps:[],reason:'잘못된 수량'};
    const npc=npcs.get(name)||null;
    const candidate=(offers||[]).filter(o=>o?.trade_type!=='buy'&&String(o?.item_name||'').trim()===name)
      .map(offerLots).filter(v=>v&&v.available>0);
    // 개당가격, 묶음단가, 판매자 순. 실물 묶음 단위의 과구매 가능성은 결과에 표시한다.
    candidate.sort((a,b)=>a.price/a.quantity-b.price/b.quantity||a.price-b.price||a.seller.localeCompare(b.seller));
    const exact=exactPurchase(name,need,candidate,npc);
    if(exact)return exact;
    let have=0,cost=0;const steps=[];
    for(const o of candidate){
      if(have>=need)break;
      if(npc && o.price/o.quantity>=npc.price)continue;
      const count=Math.min(o.available,Math.ceil((need-have)/o.quantity));
      if(!count)continue;
      const qty=count*o.quantity,price=count*o.price;
      // 묶음 초과구매가 NPC 잔여 구매보다 비쌀 경우 이 매물은 포기할 수 있음
      if(npc&&price>=Math.max(0,need-have)*npc.price)continue;
      have+=qty;cost+=price;
      steps.push({type:'market',name,quantity:qty,unit:o.quantity,lots:count,cost:price,seller:o.seller,shop:o.shop,offer:o.offer});
    }
    if(have<need&&npc){
      const quantity=need-have,price=quantity*npc.price;
      have+=quantity;cost+=price;
      steps.push({type:'npc',name,quantity,unit:1,lots:quantity,cost:price,seller:'NPC · '+npc.npc,shop:npc.location,verified:npc.verified});
    }
    return {name,required:need,obtained:have,leftover:Math.max(0,have-need),cost,complete:have>=need,steps,reason:have>=need?'':npc?'':'매물·NPC 구매 데이터 부족',npcUsed:steps.some(s=>s.type==='npc'),optimal:false};
  }
  function numericPrice(prices,name){
    const record=prices?.[name];
    if(!record)return null;
    const v=typeof record==='object'?(record.myPrice??record.marketPrice??record.price??record.current):record;
    const n=Number(String(v??'').replace(/,/g,''));
    return v==null||v===''||!Number.isFinite(n)||n<0?null:n;
  }
  function assess(food,quantity,mode,scenario,ctx){
    const name=mode==='gold'?(food.gold?.name||'황금 '+food.name):food.name;
    const unit=numericPrice(ctx.prices,name);
    const gross=unit==null?null:unit*quantity;
    const calculate=(source)=>{
      const plans=source.leaves.filter(r=>!ownGold(r,mode)).map(r=>({...r,plan:selectPurchases(r.name,r.quantity,ctx.offers,ctx.npc)}));
      const errors=[...source.errors];
      const complete=plans.every(p=>p.plan.complete)&&errors.length===0;
      const cost=plans.reduce((v,p)=>v+p.plan.cost,0);
      const fees=ctx.feeRate==null?null:gross==null?null:gross*ctx.feeRate;
      const net=complete&&gross!==null&&fees!==null?gross-fees-cost:null;
      const missing=plans.filter(p=>!p.plan.complete).length+errors.length;
      return {food,name,quantity,mode,scenario,plans,baseDetails:source.baseDetails,errors,complete,unit,gross,cost,fees,net,
        estimate:complete&&gross!==null?gross-cost:null,margin:net!==null&&gross>0?net/gross*100:null,meta:source.meta,missing};
    };
    if(mode!=='gold')return calculate(recipeLeaves(food,quantity,ctx.data,scenario));
    const gold=food.gold||{};
    const output=positiveInt(gold.bulk?.output)||quantity;
    const maxBulk=Math.floor(quantity/output);
    let choices=[];
    const cap=120;
    if(maxBulk<=cap){for(let i=0;i<=maxBulk;i++)choices.push(i)}
    else{
      choices=[0,maxBulk];
      for(let i=1;i<cap;i++)choices.push(Math.round(maxBulk*i/cap));
      choices=[...new Set(choices)].sort((a,b)=>a-b);
    }
    // 모든 조합이 조달 불가능할 때도 단가·물량 부족 원인을 표시한다.
    let best=null;
    for(const runs of choices){
      const option=calculate(goldNeeds(food,quantity,ctx.data,scenario,runs));
      if(best===null|| (option.complete&&!best.complete) ||
         (option.complete===best.complete && (option.complete ? option.cost<best.cost : option.missing<best.missing || (option.missing===best.missing&&option.cost<best.cost)))){
        best=option;
      }
    }
    if(best===null)best=calculate(goldNeeds(food,quantity,ctx.data,scenario));
    best.choiceCount=choices.length;
    best.choiceLimited=maxBulk>cap;
    return best;
  }


  // 메인 카드: 재료의 '실제 사용량' x 판매 매물의 개당 단가로 계산한다.
  // 플리마켓 묶음 전체를 지불하는 금액은 상세의 실제 구매비에서만 취급한다.
  function bestUnitOffer(name,offers,npcs){
    const npc=npcs?.get(name);
    let best=npc?{unitPrice:npc.price,source:'NPC · '+npc.npc}:null;
    for(const item of offers||[]){
      if(item?.trade_type==='buy'||String(item?.item_name||'').trim()!==name)continue;
      const lot=offerLots(item);
      if(!lot||lot.available<=0)continue;
      const price=lot.price/lot.quantity;
      if(!best||price<best.unitPrice)best={unitPrice:price,source:lot.seller};
    }
    return best;
  }
  function unitPreview(food,mode,scenario,ctx){
    const name=mode==='gold'?(food.gold?.name||'황금 '+food.name):food.name;
    const reference=mode==='gold'?positiveInt(food.gold?.bulk?.output)||1:1;
    const source=mode==='gold'?goldNeeds(food,reference,ctx.data,scenario,1):recipeLeaves(food,1,ctx.data,scenario);
    const plans=source.leaves.filter(leaf=>!ownGold(leaf,mode)).map(leaf=>({...leaf,price:bestUnitOffer(leaf.name,ctx.offers,ctx.npc)}));
    const missing=plans.filter(p=>!p.price).map(p=>p.name);
    const complete=source.errors.length===0&&missing.length===0;
    const unit=numericPrice(ctx.prices,name);
    const cost=complete?plans.reduce((v,p)=>v+p.quantity*p.price.unitPrice,0)/reference:null;
    return {food,name,mode,quantity:1,reference,scenario,unit,cost,complete,plans,errors:source.errors,
      missingNames:missing,estimate:complete&&unit!==null?unit-cost:null,gross:unit};
  }
  // 사용자가 체크한 재료만 구매한다. 체크 해제된 재료는 '보유분이 충분하다'는 조건이지,
  // 그 재료가 공짜이거나 자동 확보되었다는 뜻은 아니다.
  function purchasePlan(food,target,mode,scenario,ctx,selectedNames){
    const selected=new Set(selectedNames);
    const name=mode==='gold'?(food.gold?.name||'황금 '+food.name):food.name;
    const unit=numericPrice(ctx.prices,name);
    const evaluate=source=>{
      const plans=source.leaves.map(leaf=>{
        const autoSupplied=ownGold(leaf,mode);
        const buy=!autoSupplied&&selected.has(leaf.name);
        const plan=buy?selectPurchases(leaf.name,leaf.quantity,ctx.offers,ctx.npc):null;
        const allocated=buy&&plan?.complete&&plan.obtained>0 ? plan.cost*leaf.quantity/plan.obtained:null;
        return {...leaf,autoSupplied,buy,plan,allocated};
      });
      const complete=source.errors.length===0&&plans.every(x=>!x.buy||x.plan.complete);
      const cash=plans.reduce((sum,x)=>sum+(x.buy?x.plan.cost:0),0);
      const cost=complete?plans.reduce((sum,x)=>sum+(x.buy?x.allocated:0),0):null;
      const obtained=plans.filter(x=>x.buy).map(x=>({name:x.name,quantity:x.plan.obtained}));
      const missing=plans.filter(x=>x.buy&&!x.plan.complete).map(x=>x.name);
      const gross=unit==null?null:unit*target;
      return {food,name,mode,quantity:target,scenario,plans,errors:source.errors,baseDetails:source.baseDetails,
        meta:source.meta||null,selected,complete,missing,obtained,unit,gross,cash,cost,
        remainingValue:cost==null?null:Math.max(0,cash-cost),
        consumedDifference:complete&&gross!=null?gross-cost:null,
        cashDifference:complete&&gross!=null?gross-cash:null};
    };
    if(mode!=='gold')return evaluate(recipeLeaves(food,target,ctx.data,scenario));
    const out=positiveInt(food.gold?.bulk?.output)||1;
    const maxBulk=Math.ceil(target/out);
    // 기존의 황금 제작 옵션 비교는 유지하고, 선택된 재료의 실제 구매 지출로 고른다.
    const candidates=maxBulk<=100?Array.from({length:maxBulk+1},(_,i)=>i):
      [...new Set([0,Math.floor(target/out),maxBulk,...Array.from({length:99},(_,i)=>Math.floor(i*maxBulk/98))])];
    let result=null;
    for(const runs of candidates){
      const option=evaluate(goldNeeds(food,target,ctx.data,scenario,runs));
      if(!result||(option.complete&&!result.complete)||
        (option.complete===result.complete&& (option.complete?option.cash<result.cash:
         option.missing.length+option.errors.length<result.missing.length+result.errors.length)))result=option;
    }
    result.choiceCount=candidates.length;
    result.choiceLimited=maxBulk>100;
    return result;
  }
  function maxFromPurchases(food,mode,data,selectedPlans,scenario='average'){
    const tracked=selectedPlans.filter(x=>x.buy);
    if(!tracked.length)return {count:null,reason:'구매 재료를 선택하지 않아 상한을 정할 수 없음'};
    if(tracked.some(x=>!x.plan?.complete))return {count:null,reason:'선택한 재료의 구매 가능 수량이 부족함'};
    const stock=new Map(tracked.map(x=>[x.name,x.plan.obtained]));
    // 구매하지 않은 재료는 별도 보유분이 충분하다고 가정한다. 직접 보유량은 알 수 없다.
    function fits(target){
      let source;
      if(mode==='gold'){
        const size=positiveInt(food.gold?.bulk?.output);
        if(!size)return false;
        const goldName=data?.ingredients?.gold_dust?.name||'금 가루';
        const upper=Math.ceil(target/size);
        // 대량 제작을 가능한 한 많이 사용해야 추가로 필요한 일반 음식과
        // 식용 금가루 소모가 작아진다. 대량용 금가루만 제한되어 있으면 그만큼만 쓴다.
        const runs=stock.has(goldName)?Math.min(upper,stock.get(goldName)):upper;
        source=goldNeeds(food,target,data,scenario,runs);
      }else source=recipeLeaves(food,target,data,scenario);
      return source.errors.length===0&&source.leaves.every(x=>!stock.has(x.name)||x.quantity<=stock.get(x.name));
    }
    if(!fits(1))return {count:0,reason:'구매 수량으로 요리 1개를 만들기 부족함'};
    let low=1,high=2;
    while(high<=1000000&&fits(high)){low=high;high*=2}
    if(low>=1000000||high>1000000&&fits(1000000))return {count:null,reason:'선택 구매품목만으로 제작 수량의 상한을 확정할 수 없음'};
    high=Math.min(high,1000000);
    while(high-low>1){const mid=Math.floor((low+high)/2);if(fits(mid))low=mid;else high=mid}
    return {count:low,reason:'선택 구매 재료 기준 · 나머지는 충분히 보유한 경우 · 평균 수확 가정'};
  }

  return {inputCount,recipeLeaves,goldNeeds,npcMap,selectPurchases,assess,numericPrice,bestUnitOffer,unitPreview,purchasePlan,maxFromPurchases};
});
