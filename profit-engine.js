/* 띵팜 수익 계산 엔진 — 외부 통신 및 DOM에 의존하지 않음. */
(function(root, factory){
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  if(root)root.DDING_PROFIT=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const SEEDS={tomato:{name:'토마토 씨앗'},onion:{name:'양파 씨앗'},garlic:{name:'마늘 씨앗'}};
  const EPS=1e-9;
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
      const plans=source.leaves.map(r=>({...r,plan:selectPurchases(r.name,r.quantity,ctx.offers,ctx.npc)}));
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

  return {inputCount,recipeLeaves,goldNeeds,npcMap,selectPurchases,assess,numericPrice};
});
