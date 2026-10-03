(() => {
  'use strict';

  const D = window.DDING_DATA;
  const SHOP = window.DDING_SHOP_DATA || {meta:{},items:[]};
  const GUIDE = window.DDING_GUIDE || {meta:{},sources:{},items:[],enhancement:[],sagePickaxeStats:[]};
  const RESOURCE_ITEMS = window.DDING_RESOURCE_ITEMS || [];
  // 배포 과정에서 guide-data.js가 누락되어도 리소스팩 전수 목록 자체는 0개가 되지 않도록 안전망을 둔다.
  if (!Array.isArray(GUIDE.items)) GUIDE.items = [];
  if (!GUIDE.items.length && RESOURCE_ITEMS.length) {
    GUIDE.meta = {...(GUIDE.meta||{}), version:'0.10.0', resourcePackVersion:'260930', resourceModelCount:RESOURCE_ITEMS.length, resourceFallback:true};
    GUIDE.items = RESOURCE_ITEMS.map(r => ({
      name:r.name, aliases:r.aliases||[], region:r.region||'리소스팩', category:r.category||'기타/미분류',
      acquire:'리소스팩에서 존재가 확인된 항목입니다. 서버 내 정확한 획득처는 공식 설명 데이터가 로드되지 않아 확인이 필요합니다.',
      use:'리소스팩 모델/아이콘이 확인되었습니다. 서버 표시명·사용처는 공식 설명 데이터가 로드되면 함께 표시됩니다.',
      icon:r.icon, resourceId:r.id, resourceTexture:r.texture, resourceVerified:!!r.nameVerified,
      official:false, sourceLabel:'RESOURCE PACK 260930'
    }));
  }
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const PRICE_API = 'https://dding-price-api.hansuyeon191-6fe.workers.dev';
  const PRICE_CHANGE_DAYS = [1,3,6,9,12,15,18,21,24,27,30];
  const PROFIT_CROP_IDS = ['tomato','onion','garlic'];
  const PROFIT_FARM_KEY = 'ddingProfitFarmV1';

  function loadProfitFarm() {
    try {
      const raw = JSON.parse(localStorage.getItem(PROFIT_FARM_KEY) || '{}');
      return {
        total: Math.max(0, Math.floor(Number(raw.total) || 0)),
        tomato: Math.max(0, Math.floor(Number(raw.tomato) || 0)),
        onion: Math.max(0, Math.floor(Number(raw.onion) || 0)),
        garlic: Math.max(0, Math.floor(Number(raw.garlic) || 0)),
      };
    } catch (_) {
      return {total:0,tomato:0,onion:0,garlic:0};
    }
  }

  const state = {
    page: 'dashboard',
    cookingFilter: 'ALL',
    cookingView: localStorage.getItem('ddingCookingView') || 'grid',
    finderFilter: localStorage.getItem('ddingFinderFilter') || 'all',
    selectedTrendFood: localStorage.getItem('ddingTrendFood') || '',
    selectedTrendGold: localStorage.getItem('ddingTrendGold') === '1',
    fontChoice: localStorage.getItem('ddingFontChoice') || 'gmarket',
    fontScale: Number(localStorage.getItem('ddingFontScale') || 1),
    query: '',
    prices: {},
    priceMeta: null,
    cloudStatus: null,
    cloudHistory: [],
    cloudLoaded: false,
    cloudBusy: false,
    cloudError: '',
    uiCycleKey: '',
    farm: new Set(JSON.parse(localStorage.getItem('ddingFarm') || '[]')),
    profitFarm: loadProfitFarm(),
    profitSort: localStorage.getItem('ddingProfitSort') || 'avgRevenue',
    profitFilter: localStorage.getItem('ddingProfitFilter') || 'all',
    profitPriceMode: localStorage.getItem('ddingProfitPriceMode') || 'mine',
    profitTargetFood: localStorage.getItem('ddingProfitTargetFood') || 'onion-soup',
    guideFilter: localStorage.getItem('ddingGuideFilter') || 'all',
    guideTarget: Math.min(15, Math.max(1, Number(localStorage.getItem('ddingGuideTarget') || 15))),
    guidePage: 1,
    guidePageSize: 48,
    activeTool: null,
    memoEditingId: null,
    timer: {
      duration: Number(localStorage.getItem('ddingTimerDuration') || 900),
      target: Number(localStorage.getItem('ddingTimerTarget') || 0),
      remaining: Number(localStorage.getItem('ddingTimerRemaining') || 900),
      interval: null,
    },
  };

  const pages = {
    dashboard: ['OVERVIEW', '홈'],
    cooking: ['COOKING INDEX', '요리 제작법'],
    farm: ['FARM PLANNER', '내 농장'],
    profit: ['FARM REVENUE', '예상 수익'],
    ingredients: ['INGREDIENT INDEX', '재료 도감'],
    finder: ['TRADE FINDER', '아이템 찾기'],
    reference: ['NEWBIE GUIDE', '초뉴비 가이드'],
    prices: ['LOCAL PRICE FEED', '가격 연동'],
  };


  const tradeLabels = {buy:'내가 구매', sell:'내가 판매', exchange:'교환'};

  function applyDisplayPrefs() {
    document.body.dataset.font = state.fontChoice;
    document.documentElement.style.setProperty('--font-scale', String(Math.max(.9, Math.min(1.14, state.fontScale || 1))));
  }
  applyDisplayPrefs();

  function fmt(n) {
    return n == null ? '—' : Number(n).toLocaleString('ko-KR') + ' G';
  }

  function esc(s = '') {
    return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function guideIconHTML(item, cls = '') {
    const sprite = window.DDING_RESOURCE_ATLAS?.html(item, cls);
    if (sprite) return sprite;
    if (item?.icon) return `<img class="${esc(cls)}" src="${esc(item.icon)}" alt="" loading="lazy" onerror="this.parentElement.classList.add('missing');this.remove()">`;
    return '';
  }
  function hasGuideIcon(item) { return item?.iconSprite !== undefined || !!item?.icon; }

  function iconHTML(item, cls = '') {
    if (item?.icon) {
      const fallbackClass = cls.includes('big') ? 'big-fallback' : 'fallback-icon';
      return `<img class="${cls}" src="${esc(item.icon)}" alt="${esc(item.name)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="${fallbackClass}" hidden>${esc(item.emoji || '□')}</span>`;
    }
    const sprite = window.DDING_RESOURCE_ATLAS?.html(item, cls);
    if (sprite) return sprite;
    return `<span class="${cls.includes('big') ? 'big-fallback' : 'fallback-icon'}">${esc(item?.emoji || '□')}</span>`;
  }

  function gradeText(g) {
    return ({COMMON:'COMMON',NORMAL:'NORMAL',RARE:'RARE',EPIC:'EPIC',LEGENDARY:'LEGENDARY',MYTHIC:'MYTHIC'}[g] || g);
  }

  function priceKey(food, gold = false) { return gold ? `황금 ${food.name}` : food.name; }
  function getPrice(food, gold = false) { return state.prices[priceKey(food, gold)] || null; }
  function currentPrice(food, gold = false) {
    const p = getPrice(food, gold);
    return p?.myPrice ?? p?.marketPrice ?? null;
  }
  function rangeFor(food, gold = false) { return gold ? [food.gold.minPrice, food.gold.maxPrice] : [food.minPrice, food.maxPrice]; }
  function normalizedPrice(food, gold = false) {
    const p = currentPrice(food, gold);
    if (p == null) return null;
    const [min, max] = rangeFor(food, gold);
    return Math.max(0, Math.min(1, (p - min) / (max - min || 1)));
  }
  function foodBySlug(slug) { return D.foods.find(f => f.slug === slug); }

  function resolveIngredient(id) {
    if (D.ingredients[id]) return D.ingredients[id];
    const f = foodBySlug(id);
    if (f) return {id, name:f.name, type:'완성 요리', icon:f.image, emoji:'□', source:'요리 제작 시설', detail:'일반 요리를 먼저 제작합니다.', recipe:f.recipe};
    return {id, name:id, type:'미확인', emoji:'□', source:'확인 필요', detail:'아직 수급 정보를 입력하지 않은 재료입니다.', recipe:[]};
  }

  function collectCrops(id, seen = new Set()) {
    if (seen.has(id)) return new Set();
    seen.add(id);
    const ing = resolveIngredient(id);
    if (ing.crop) return new Set([ing.crop]);
    const out = new Set();
    for (const [child] of (ing.recipe || [])) {
      for (const c of collectCrops(child, seen)) out.add(c);
    }
    return out;
  }

  function foodCrops(food) {
    const out = new Set();
    for (const [id] of food.recipe) {
      for (const c of collectCrops(id, new Set())) out.add(c);
    }
    return out;
  }

  function readiness(food) {
    const crops = [...foodCrops(food)];
    if (!crops.length) return 1;
    return crops.filter(c => state.farm.has(c)).length / crops.length;
  }

  function missingCrops(food) { return [...foodCrops(food)].filter(c => !state.farm.has(c)); }
  function cropName(id) { return D.crops.find(c => c.id === id)?.name || id; }

  function collectNpcPurchaseIngredient(id, qty = 1, out = new Map(), seen = new Set()) {
    if (qty <= 0 || seen.has(id)) return out;
    const ing = resolveIngredient(id);
    if (ing.npcPrice != null) {
      const prev = out.get(id) || {id, ingredient:ing, qty:0, unitPrice:Number(ing.npcPrice), cost:0};
      prev.qty += qty;
      prev.cost = prev.qty * prev.unitPrice;
      out.set(id, prev);
      return out;
    }
    if (!ing.recipe?.length) return out;
    const nextSeen = new Set(seen).add(id);
    for (const [child, n] of ing.recipe) collectNpcPurchaseIngredient(child, qty * n, out, nextSeen);
    return out;
  }

  function npcPurchasePlan(food, qty = 1) {
    const count = Math.max(1, Math.floor(Number(qty) || 1));
    const out = new Map();
    for (const [id, n] of (food.recipe || [])) collectNpcPurchaseIngredient(id, count * n, out, new Set());
    const rows = [...out.values()].sort((a,b) => b.cost - a.cost || a.ingredient.name.localeCompare(b.ingredient.name,'ko'));
    return {
      qty: count,
      rows,
      totalItems: rows.reduce((sum,row) => sum + row.qty, 0),
      totalCost: rows.reduce((sum,row) => sum + row.cost, 0),
    };
  }

  function npcCashCostIngredient(id, qty = 1, seen = new Set()) {
    if (seen.has(id)) return 0;
    const ing = resolveIngredient(id);
    if (ing.npcPrice != null) return ing.npcPrice * qty;
    if (!ing.recipe?.length) return 0;
    let total = 0;
    for (const [child, n] of ing.recipe) total += npcCashCostIngredient(child, qty * n, new Set(seen).add(id));
    return total;
  }

  function npcCashCostFood(food) {
    return npcPurchasePlan(food, 1).totalCost;
  }

  function stackBreakdown(qty) {
    const count = Math.max(0, Math.floor(Number(qty) || 0));
    const sets = Math.floor(count / 64);
    const rest = count % 64;
    return {count, sets, rest, label:`${sets.toLocaleString('ko-KR')}세트, ${rest.toLocaleString('ko-KR')}개`};
  }

  function npcPurchasePlannerHtml(food, qty = 1) {
    const plan = npcPurchasePlan(food, qty);
    if (!plan.rows.length) return '<div class="npc-plan-empty">NPC에서 따로 구매해야 하는 재료가 없어.</div>';
    const rows = plan.rows.map(row => {
      const stack = stackBreakdown(row.qty);
      return `<div class="npc-plan-row">
        <span class="npc-plan-item">${iconHTML(row.ingredient,'npc-plan-icon')}<span><b>${esc(row.ingredient.name)}</b><small>${fmt(row.unitPrice)} / 개</small></span></span>
        <span class="npc-plan-qty"><b>${row.qty.toLocaleString('ko-KR')}개</b><small>${stack.label}</small></span>
        <strong>${fmt(row.cost)}</strong>
      </div>`;
    }).join('');
    return `<div class="npc-plan-list">${rows}</div>
      <div class="npc-plan-total">
        <div><span>총 구매 수량</span><b>${plan.totalItems.toLocaleString('ko-KR')}개</b><small>품목별 세트 환산은 위 목록 기준</small></div>
        <div class="npc-plan-total-cost"><span>총 NPC 구매비</span><strong>${fmt(plan.totalCost)}</strong></div>
      </div>`;
  }

  function updateNpcPurchasePlanner(input) {
    const food = foodBySlug(input?.dataset?.craftFood);
    if (!food) return;
    const qty = Math.max(1, Math.floor(Number(input.value) || 1));
    if (String(qty) !== input.value) input.value = String(qty);
    const target = $('#npcPurchasePlanner');
    if (target) target.innerHTML = npcPurchasePlannerHtml(food, qty);
    const total = $('#craftPlannerTotal');
    if (total) total.textContent = fmt(npcPurchasePlan(food, qty).totalCost);
  }

  function profitCropMeta(id) {
    const crop = D.crops.find(c => c.id === id) || {id,name:id,emoji:'·'};
    const min = Number(crop.yieldMin ?? 0);
    const max = Number(crop.yieldMax ?? min);
    return {
      ...crop,
      growthMinutes: Math.max(1, Number(crop.growthMinutes || 15)),
      yieldMin: min,
      yieldAvg: (min + max) / 2,
      yieldMax: max,
    };
  }

  function addProfitCropRequirement(id, qty, out, stack = new Set()) {
    if (PROFIT_CROP_IDS.includes(id)) {
      out[id] = (out[id] || 0) + qty;
      return;
    }
    if (stack.has(id)) return;
    const ing = resolveIngredient(id);
    if (!ing?.recipe?.length) return;
    const next = new Set(stack).add(id);
    for (const [child, n] of ing.recipe) addProfitCropRequirement(child, qty * n, out, next);
  }

  function profitCropRequirements(food) {
    const out = {};
    for (const [id, qty] of (food.recipe || [])) addProfitCropRequirement(id, qty, out, new Set());
    return out;
  }

  function profitSalePrice(food) {
    const p = getPrice(food);
    if (!p) return null;
    if (state.profitPriceMode === 'market') return p.marketPrice ?? p.myPrice ?? null;
    return p.myPrice ?? p.marketPrice ?? null;
  }

  function cropUnitsForMinutes(cropId, minutes, scenario = 'avg') {
    const meta = profitCropMeta(cropId);
    const plots = Number(state.profitFarm[cropId] || 0);
    const yieldValue = scenario === 'min' ? meta.yieldMin : scenario === 'max' ? meta.yieldMax : meta.yieldAvg;
    return plots * yieldValue * (minutes / meta.growthMinutes);
  }

  function foodUnitsForMinutes(requirements, minutes, scenario = 'avg') {
    const entries = Object.entries(requirements).filter(([, qty]) => qty > 0);
    if (!entries.length) return 0;
    return Math.min(...entries.map(([id, qty]) => cropUnitsForMinutes(id, minutes, scenario) / qty));
  }

  function profitFoodStats(food) {
    const requirements = profitCropRequirements(food);
    const periods = {minute:1, quarter:15, hour:60};
    const units = {};
    for (const [period, minutes] of Object.entries(periods)) {
      units[period] = {
        min: foodUnitsForMinutes(requirements, minutes, 'min'),
        avg: foodUnitsForMinutes(requirements, minutes, 'avg'),
        max: foodUnitsForMinutes(requirements, minutes, 'max'),
      };
    }
    const avgRatios = Object.entries(requirements).map(([id, qty]) => ({
      id,
      ratio: cropUnitsForMinutes(id, 60, 'avg') / qty,
    })).sort((a,b) => a.ratio - b.ratio);
    const bottleneck = avgRatios[0]?.id || '';
    const price = profitSalePrice(food);
    const npcCost = npcCashCostFood(food);
    const revenue = {};
    for (const period of Object.keys(periods)) {
      revenue[period] = price == null ? null : {
        min: units[period].min * price,
        avg: units[period].avg * price,
        max: units[period].max * price,
      };
    }
    return {food, requirements, units, revenue, price, npcCost, bottleneck};
  }

  function compactNumber(n, digits = 2) {
    if (!Number.isFinite(Number(n))) return '—';
    const v = Number(n);
    const maxDigits = Math.abs(v) >= 100 ? 1 : digits;
    return v.toLocaleString('ko-KR', {maximumFractionDigits:maxDigits});
  }

  function compactGold(n) {
    if (!Number.isFinite(Number(n))) return '—';
    return `${Math.round(Number(n)).toLocaleString('ko-KR')} G`;
  }

  function saveProfitFarm() {
    localStorage.setItem(PROFIT_FARM_KEY, JSON.stringify(state.profitFarm));
  }

  function cropAverageHourlyRate(cropId) {
    const meta = profitCropMeta(cropId);
    return meta.yieldAvg * (60 / meta.growthMinutes);
  }

  function cropUnitsForAllocation(cropId, plots, minutes, scenario = 'avg') {
    const meta = profitCropMeta(cropId);
    const yieldValue = scenario === 'min' ? meta.yieldMin : scenario === 'max' ? meta.yieldMax : meta.yieldAvg;
    return Math.max(0, Number(plots) || 0) * yieldValue * (minutes / meta.growthMinutes);
  }

  function foodUnitsForAllocation(requirements, allocation, minutes, scenario = 'avg') {
    const entries = Object.entries(requirements).filter(([,qty]) => qty > 0);
    if (!entries.length) return 0;
    return Math.min(...entries.map(([id,qty]) => cropUnitsForAllocation(id, allocation[id] || 0, minutes, scenario) / qty));
  }

  function targetFoodAllocation(food, totalPlots) {
    const total = Math.max(0, Math.floor(Number(totalPlots) || 0));
    const requirements = profitCropRequirements(food);
    const ids = Object.keys(requirements).filter(id => PROFIT_CROP_IDS.includes(id));
    const allocation = Object.fromEntries(PROFIT_CROP_IDS.map(id => [id,0]));
    if (!total || !ids.length) return {food,total,requirements,ids,allocation,insufficient:false};

    if (total < ids.length) {
      const ranked = [...ids].sort((a,b) => {
        const wa = requirements[a] / Math.max(.0001,cropAverageHourlyRate(a));
        const wb = requirements[b] / Math.max(.0001,cropAverageHourlyRate(b));
        return wb-wa;
      });
      ranked.slice(0,total).forEach(id => allocation[id] = 1);
      return {food,total,requirements,ids,allocation,insufficient:true};
    }

    // Every required crop receives at least one plot. Remaining plots are split
    // in proportion to recipe demand / hourly crop yield, which maximizes the
    // recipe's bottleneck throughput rather than balancing raw crop counts.
    ids.forEach(id => allocation[id] = 1);
    let remaining = total - ids.length;
    const weights = Object.fromEntries(ids.map(id => [id, requirements[id] / Math.max(.0001,cropAverageHourlyRate(id))]));
    const weightSum = ids.reduce((sum,id) => sum + weights[id], 0);
    const rawExtra = Object.fromEntries(ids.map(id => [id, remaining * weights[id] / Math.max(.0001,weightSum)]));
    let assigned = 0;
    ids.forEach(id => {
      const n = Math.floor(rawExtra[id]);
      allocation[id] += n;
      assigned += n;
    });
    remaining -= assigned;
    [...ids].sort((a,b) => (rawExtra[b] % 1) - (rawExtra[a] % 1)).slice(0,remaining).forEach(id => allocation[id] += 1);

    // Integer local refinement: move one plot at a time only when it increases
    // average hourly craft throughput.
    for (let pass=0; pass<12; pass++) {
      const current = foodUnitsForAllocation(requirements, allocation, 60, 'avg');
      let best = current, move = null;
      for (const from of ids) {
        if (allocation[from] <= 1) continue;
        for (const to of ids) {
          if (from === to) continue;
          const test = {...allocation, [from]:allocation[from]-1, [to]:allocation[to]+1};
          const score = foodUnitsForAllocation(requirements, test, 60, 'avg');
          if (score > best + 1e-9) { best = score; move = [from,to]; }
        }
      }
      if (!move) break;
      allocation[move[0]] -= 1;
      allocation[move[1]] += 1;
    }
    return {food,total,requirements,ids,allocation,insufficient:false};
  }

  function targetFoodPlan(food, totalPlots) {
    const base = targetFoodAllocation(food,totalPlots);
    const periods = {quarter:15,hour:60};
    const units = {};
    for (const [key,minutes] of Object.entries(periods)) {
      units[key] = {
        min: foodUnitsForAllocation(base.requirements,base.allocation,minutes,'min'),
        avg: foodUnitsForAllocation(base.requirements,base.allocation,minutes,'avg'),
        max: foodUnitsForAllocation(base.requirements,base.allocation,minutes,'max'),
      };
    }
    const price = profitSalePrice(food);
    const npcCost = npcCashCostFood(food);
    const money = {};
    for (const key of Object.keys(periods)) {
      money[key] = price == null ? null : {
        gross: units[key].avg * price,
        net: units[key].avg * (price - npcCost),
        minNet: units[key].min * (price - npcCost),
        maxNet: units[key].max * (price - npcCost),
      };
    }
    return {...base,units,price,npcCost,money};
  }

  function targetFoodPlannerCard(totalPlots) {
    const selected = foodBySlug(state.profitTargetFood) || D.foods.find(f => Object.keys(profitCropRequirements(f)).length) || D.foods[0];
    state.profitTargetFood = selected.slug;
    const plan = targetFoodPlan(selected,totalPlots);
    const reqIds = plan.ids;
    const quarter = plan.units.quarter;
    const hour = plan.units.hour;
    const priceLabel = state.profitPriceMode === 'market' ? '시장 기준가' : '나의 판매가';
    const cropRows = reqIds.map(id => {
      const c = profitCropMeta(id);
      const plots = plan.allocation[id] || 0;
      const avg15 = cropUnitsForAllocation(id,plots,15,'avg');
      return `<div class="target-crop-row">
        <span class="target-crop-name">${c.icon ? `<img src="${esc(c.icon)}" alt="">` : `<i>${esc(c.emoji || '·')}</i>`}<span><b>${esc(c.name)}</b><small>1개 제작에 ${compactNumber(plan.requirements[id],1)}개 필요</small></span></span>
        <strong>${plots.toLocaleString('ko-KR')}칸</strong>
        <span class="target-crop-yield">15분 평균 ${compactNumber(avg15,1)}개</span>
      </div>`;
    }).join('');
    const targetOptions = D.foods
      .filter(f => Object.keys(profitCropRequirements(f)).length)
      .map(f => `<option value="${f.slug}" ${f.slug===selected.slug?'selected':''}>${esc(f.name)}</option>`)
      .join('');
    const qRange = totalPlots > 0 && !plan.insufficient
      ? `${compactNumber(quarter.min,1)} ~ ${compactNumber(quarter.max,1)}개`
      : '—';
    const hRange = totalPlots > 0 && !plan.insufficient
      ? `${compactNumber(hour.min,1)} ~ ${compactNumber(hour.max,1)}개`
      : '—';
    return `<section class="card profit-target-card" id="profitTargetPlanner">
      <div class="profit-target-head">
        <div><span class="profit-target-kicker">TARGET FOOD OPTIMIZER</span><h2>음식 하나에 경작지 몰아주기</h2><p>전체 경작지 ${Number(totalPlots||0).toLocaleString('ko-KR')}칸을 선택한 음식 생산량이 최대가 되도록 토마토·양파·마늘 비율을 역산해.</p></div>
        <label class="profit-target-select"><span>목표 음식</span><select id="profitTargetFood">${targetOptions}</select></label>
      </div>
      <div class="profit-target-hero">
        <div class="profit-target-food"><img src="${esc(selected.image)}" alt="${esc(selected.name)}"><div><span class="grade ${esc(selected.grade)}">${esc(gradeText(selected.grade))}</span><h3>${esc(selected.name)}</h3><p>${priceLabel} · <b>${plan.price == null ? '가격 대기' : compactGold(plan.price)}</b> · NPC 구매비/개 ${compactGold(plan.npcCost)}</p></div></div>
        <button class="btn profit-target-apply" data-profit-apply-target="${selected.slug}" ${!totalPlots || plan.insufficient ? 'disabled' : ''}>추천 배치 적용</button>
      </div>
      ${!totalPlots ? `<div class="profit-target-empty"><b>전체 경작지 수를 먼저 입력해줘.</b><span>위의 ‘현재 전체 경작지’ 값을 기준으로 자동 계산할게.</span></div>`
        : plan.insufficient ? `<div class="profit-target-empty warn"><b>필요 작물 종류보다 경작지가 적어.</b><span>이 음식은 ${reqIds.length}종의 핵심 작물이 필요해서 최소 ${reqIds.length}칸부터 생산량 계산이 가능해.</span></div>`
        : `<div class="profit-target-body">
          <div class="target-crop-plan"><div class="target-plan-title"><b>최적 배치</b><span>평균 수율 기준 · 총 ${plan.total.toLocaleString('ko-KR')}칸</span></div>${cropRows}</div>
          <div class="target-output-grid">
            <div class="target-output-card"><span>15분당 평균 제작</span><strong>${compactNumber(quarter.avg,1)}개</strong><small>수율 범위 ${qRange}</small></div>
            <div class="target-output-card"><span>시간당 평균 제작</span><strong>${compactNumber(hour.avg,1)}개</strong><small>수율 범위 ${hRange}</small></div>
            <div class="target-output-card money"><span>시간당 예상 매출</span><strong>${plan.money.hour ? compactGold(plan.money.hour.gross) : '—'}</strong><small>${priceLabel} 기준</small></div>
            <div class="target-output-card net"><span>시간당 예상 순수익</span><strong>${plan.money.hour ? compactGold(plan.money.hour.net) : '—'}</strong><small>${plan.money.hour ? `NPC 비용 차감 · ${compactGold(plan.money.hour.minNet)} ~ ${compactGold(plan.money.hour.maxNet)}` : '가격 데이터 필요'}</small></div>
          </div>
        </div>`}
      <div class="profit-target-note">경작지 최적화는 <b>토마토·양파·마늘만 생산 병목</b>이라고 가정해. 감자·호박·과일·고기 등 다른 재료는 충분히 확보되어 있어야 실제 제작량이 이 계산에 가까워져.</div>
    </section>`;
  }

  function recommendedProfitAllocation(totalPlots, current = {}) {
    const total = Math.max(0, Math.floor(Number(totalPlots) || 0));
    const finalPlots = Object.fromEntries(PROFIT_CROP_IDS.map(id => [id, Math.max(0, Math.floor(Number(current[id]) || 0))]));
    const used = PROFIT_CROP_IDS.reduce((sum,id) => sum + finalPlots[id], 0);
    const additional = Object.fromEntries(PROFIT_CROP_IDS.map(id => [id, 0]));
    if (total <= used) return {finalPlots, additional, remaining:Math.max(0,total-used), over:Math.max(0,used-total)};

    // Existing plots are treated as fixed. Every remaining slot goes to the
    // crop with the lowest projected average hourly output. This naturally
    // compensates for different average yields (tomato 8/h, onion 6/h, garlic 10/h).
    for (let n = used; n < total; n++) {
      const nextId = [...PROFIT_CROP_IDS].sort((a,b) => {
        const outA = finalPlots[a] * cropAverageHourlyRate(a);
        const outB = finalPlots[b] * cropAverageHourlyRate(b);
        if (outA !== outB) return outA - outB;
        const rateA = cropAverageHourlyRate(a), rateB = cropAverageHourlyRate(b);
        if (rateA !== rateB) return rateA - rateB;
        return PROFIT_CROP_IDS.indexOf(a) - PROFIT_CROP_IDS.indexOf(b);
      })[0];
      finalPlots[nextId] += 1;
      additional[nextId] += 1;
    }
    return {finalPlots, additional, remaining:0, over:0};
  }

  function profitRecommendationCard(total, used) {
    const rec = recommendedProfitAllocation(total, state.profitFarm);
    const hasTotal = total > 0;
    const remaining = Math.max(0, total - used);
    return `<div class="card profit-recommend-card">
      <div class="section-head profit-recommend-head"><div><h2>경작지 균형 추천</h2><p>${hasTotal ? `현재 설치량은 고정하고 남은 ${remaining.toLocaleString('ko-KR')}칸을 평균 생산량이 가장 비슷해지도록 자동 배분해.` : '전체 경작지 수를 입력하면 토마토·양파·마늘의 평균 수율 차이를 반영해 추천해.'}</p></div><span class="profit-recommend-badge">AUTO BALANCE</span></div>
      ${!hasTotal ? `<div class="profit-recommend-empty">전체 경작지 수를 먼저 입력해줘.</div>` : `
      <div class="profit-recommend-table">
        <div class="profit-recommend-row head"><span>작물</span><span>현재</span><span>추가 추천</span><span>최종 추천</span><span>평균 시간당</span></div>
        ${PROFIT_CROP_IDS.map(id => {
          const c = profitCropMeta(id);
          const current = Number(state.profitFarm[id] || 0);
          const add = rec.additional[id] || 0;
          const final = rec.finalPlots[id] || current;
          const hourly = final * cropAverageHourlyRate(id);
          return `<div class="profit-recommend-row">
            <span class="profit-recommend-crop">${c.icon ? `<img src="${esc(c.icon)}" alt="">` : `<i>${esc(c.emoji || '·')}</i>`}<b>${esc(c.name)}</b></span>
            <span>${current.toLocaleString('ko-KR')}칸</span>
            <span class="profit-recommend-add ${add ? 'active' : 'done'}">${add ? `+${add.toLocaleString('ko-KR')}칸` : '충족'}</span>
            <strong>${final.toLocaleString('ko-KR')}칸</strong>
            <span>${compactNumber(hourly,1)}개</span>
          </div>`;
        }).join('')}
        <div class="profit-recommend-row total"><span><b>합계</b></span><span>${used.toLocaleString('ko-KR')}칸</span><span>${remaining > 0 && !rec.over ? `+${remaining.toLocaleString('ko-KR')}칸` : rec.over ? '초과' : '완료'}</span><strong>${PROFIT_CROP_IDS.reduce((sum,id)=>sum+(rec.finalPlots[id]||0),0).toLocaleString('ko-KR')}칸</strong><span>균형 생산</span></div>
      </div>
      ${rec.over ? `<div class="profit-recommend-warning">현재 입력이 전체 경작지보다 ${rec.over.toLocaleString('ko-KR')}칸 많아서 추가 추천을 멈췄어. 현재 설치량이나 전체 경작지 수를 조정해줘.</div>` : `<div class="profit-recommend-note">추천은 <b>평균 시간당 생산량 균형</b> 기준이야. 이미 많이 설치한 작물은 추가 추천에서 자동으로 빠지고, 남은 칸만 다시 계산해.</div>`}` }
    </div>`;
  }

  function ingredientChip(id, qty) {
    const ing = resolveIngredient(id);
    return `<div class="ingredient-chip" data-tip="1">
      ${iconHTML(ing)}<b title="${esc(ing.name)}">${esc(ing.name)}</b><span>×${qty}</span>
      <div class="hover-card"><h4>${esc(ing.name)}</h4><p><em>${esc(ing.source)}</em></p><p>${esc(ing.detail)}</p>${ing.recipe?.length ? `<p>가공: ${ing.recipe.map(([c,n]) => `${esc(resolveIngredient(c).name)} ×${n}`).join(' + ')}</p>` : ''}</div>
    </div>`;
  }

  function foodRecipeTooltip(food) {
    const rows = (food.recipe || []).map(([id, qty]) => {
      const ing = resolveIngredient(id);
      return `<span class="food-recipe-tip-row">${iconHTML(ing, 'food-recipe-tip-icon')}<span>${esc(ing.name)}</span><b>×${qty}</b></span>`;
    }).join('');
    return `<span class="hover-card" data-tooltip-kind="recipe">
      <span class="food-recipe-tip-shell">
        <span class="food-recipe-tip-head"><strong>${esc(food.name)}</strong><em>${esc(gradeText(food.grade))}</em></span>
        <span class="food-recipe-tip-label">제작 재료</span>
        <span class="food-recipe-tip-list">${rows || '<span class="food-recipe-tip-empty">등록된 제작 재료가 없습니다.</span>'}</span>
        <span class="food-recipe-tip-foot"><span>NPC 구매비 <b>${fmt(npcCashCostFood(food))}</b></span><span>클릭 · 요리 제작법</span></span>
      </span>
    </span>`;
  }

  function priceDisplay(food, gold = false) {
    const p = getPrice(food, gold);
    const [min, max] = rangeFor(food, gold);
    if (!p) return `<div class="price-line"><strong>${fmt(min)}~</strong><small>상단 ${fmt(max)}</small></div>`;
    const mine = p.myPrice ?? p.marketPrice;
    const market = p.marketPrice;
    return `<div class="price-line"><strong>${fmt(mine)}</strong><small>${p.myPrice != null && market != null && p.myPrice !== market ? `기준 ${fmt(market)}` : '현재가'} · 범위 ${fmt(min)}~${fmt(max)}</small></div>`;
  }

  function foodCard(food, gold = false) {
    const r = Math.round(readiness(food) * 100);
    const modeRecipe = gold ? food.gold.bulk.recipe : food.recipe;
    const g = gold ? food.gold.grade : food.grade;
    const name = gold ? food.gold.name : food.name;
    const image = gold ? food.goldImage : food.image;
    const missing = gold ? [] : missingCrops(food).map(cropName);
    const readyHelp = missing.length
      ? `추가 필요 · ${missing.join(', ')}`
      : '필요 재배·채집 재료 조건 충족';
    return `<article class="card food-card" data-food="${food.slug}" data-gold="${gold ? '1' : '0'}">
      <div class="food-top">
        <div class="pixel-wrap"><img class="pixel" src="${image}" alt="${esc(name)}"></div>
        <div class="food-title-block"><div class="food-name">${esc(name)}</div><span class="grade ${gold ? 'GOLD' : food.grade}">${esc(gradeText(g))}</span></div>
        ${priceDisplay(food, gold)}
      </div>
      <div class="recipe-row">${modeRecipe.map(([id, n]) => ingredientChip(id, n)).join('')}</div>
      <div class="card-lower">
        ${!gold ? `<div class="readiness-wrap" tabindex="0" aria-label="${esc(readyHelp)}"><div class="readiness"><span style="width:${r}%"></span></div><div class="ready-caption"><span>식재료 준비도</span><span>${r}%</span></div><div class="readiness-hover"><b>${r === 100 ? '준비 완료' : '더 확보해야 할 재료'}</b><span>${esc(readyHelp)}</span></div></div>` : ''}
        <div class="food-actions"><button class="detail-btn">상세 보기</button>${gold ? `<button class="gold-toggle normal-mode">일반 보기</button>` : `<button class="gold-toggle">황금 보기</button>`}</div>
      </div>
    </article>`;
  }

  function calcCropUnlocks() {
    return D.crops.filter(c => !state.farm.has(c.id)).map(c => {
      let unlock = 0, improves = 0;
      for (const f of D.foods) {
        const miss = missingCrops(f);
        if (miss.includes(c.id)) {
          improves++;
          if (miss.length === 1) unlock++;
        }
      }
      return {id:c.id, unlock, improves};
    }).sort((a,b) => b.unlock - a.unlock || b.improves - a.improves);
  }

  function topPricedFoods() {
    return [...D.foods]
      .filter(f => currentPrice(f) != null)
      .sort((a,b) => (normalizedPrice(b) ?? -1) - (normalizedPrice(a) ?? -1));
  }

  function bestFallbackFood() {
    return [...D.foods].sort((a,b) => readiness(b) - readiness(a) || b.maxPrice - a.maxPrice)[0];
  }

  function marketPrice(food, gold = false) {
    const p = getPrice(food, gold);
    return p?.marketPrice ?? p?.myPrice ?? null;
  }

  function trendName(food, gold = false) {
    return gold ? food?.gold?.name || `황금 ${food?.name || ''}` : food?.name || '';
  }

  function trendImage(food, gold = false) {
    return gold ? food?.goldImage || food?.image || '' : food?.image || '';
  }

  function historyLabel(h, i) {
    if (h?.label) return String(h.label).replace(/일$/, '');
    if (h?.date) return String(h.date);
    if (h?.day != null) return `${h.day}일`;
    return `이전 ${i + 1}`;
  }

  function kstParts(stamp) {
    const d = new Date(stamp || Date.now());
    if (Number.isNaN(d.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone:'Asia/Seoul', year:'numeric', month:'numeric', day:'numeric'
    }).formatToParts(d);
    const get = type => Number(parts.find(x => x.type === type)?.value);
    return {year:get('year'), month:get('month'), day:get('day')};
  }

  function kstDateKey(stamp) {
    const p = kstParts(stamp);
    if (!p) return '';
    return `${p.year}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;
  }

  function tooltipHistoryForFood(food, gold = false) {
    const p = getPrice(food, gold);
    if (!p) return [];
    const hist = Array.isArray(p.history) ? p.history.filter(h => Number.isFinite(Number(h?.price))) : [];
    if (!hist.length) return [];

    const baseStamp = state.priceMeta?.capturedAt || state.priceMeta?.updatedAt || Date.now();
    const base = kstParts(baseStamp) || kstParts(Date.now());

    // Milky's tooltip shows the newest past observation first. Reverse it for a
    // left-to-right chronological chart.
    return [...hist].reverse().map((h,i) => {
      const label = historyLabel(h, hist.length - 1 - i);
      let dateKey = '';
      const m = String(h?.label || '').match(/(\d{1,2})[.\/-](\d{1,2})\s*일?/);
      if (m && base) {
        const month = Number(m[1]), day = Number(m[2]);
        let year = base.year;
        // Handles the Dec -> Jan boundary when old tooltip dates are from the
        // previous calendar year.
        if (month > base.month + 1) year -= 1;
        dateKey = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      }
      return {
        label,
        price:Number(h.price),
        delta:h.delta ?? null,
        dateKey,
        source:'tooltip',
      };
    });
  }

  function cloudHistoryForFood(food, gold = false) {
    const rows = [];
    for (const snap of [...state.cloudHistory].reverse()) {
      const entry = snap?.prices?.[priceKey(food, gold)];
      const price = Number(entry?.marketPrice ?? entry?.myPrice);
      if (!Number.isFinite(price)) continue;
      const stamp = snap?.capturedAt || snap?.publishedAt || snap?.cycleKey;
      const kp = kstParts(stamp);
      rows.push({
        label: kp ? `${kp.month}.${kp.day}` : '기록',
        price,
        capturedAt: stamp,
        dateKey: kstDateKey(stamp),
        source:'cloud',
        current:false,
      });
    }
    if (rows.length) rows[rows.length - 1].current = true;
    return rows;
  }

  function priceHistory(food, gold = false) {
    const seedRows = tooltipHistoryForFood(food, gold);
    const cloudRows = cloudHistoryForFood(food, gold);
    const rows = [];
    const dateIndex = new Map();

    for (const row of seedRows) {
      if (row.dateKey) dateIndex.set(row.dateKey, rows.length);
      rows.push(row);
    }

    // Cloudflare observations are authoritative for a date. If a tooltip seed
    // happens to describe the same date, replace it instead of drawing a
    // duplicate point.
    for (const row of cloudRows) {
      if (row.dateKey && dateIndex.has(row.dateKey)) {
        rows[dateIndex.get(row.dateKey)] = row;
      } else {
        if (row.dateKey) dateIndex.set(row.dateKey, rows.length);
        rows.push(row);
      }
    }

    // Backward/local fallback: before any Cloudflare history exists, append the
    // currently published market price after the tooltip's past observations.
    if (!cloudRows.length) {
      const now = marketPrice(food, gold);
      if (now != null) rows.push({label:'현재', price:Number(now), delta:getPrice(food, gold)?.marketDelta ?? null, current:true, source:'current'});
    }

    return rows;
  }

  function priceChange(food, gold = false) {
    const rows = priceHistory(food, gold);
    if (rows.length < 2) {
      const current = marketPrice(food, gold);
      return {current, previous:null, diff:null, pct:null};
    }
    const current = Number(rows[rows.length - 1].price);
    const previous = Number(rows[rows.length - 2].price);
    if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return {current, previous, diff:null, pct:null};
    const diff = current - previous;
    return {current, previous, diff, pct:(diff / previous) * 100};
  }

  function changeBadge(change, compact = false) {
    if (change?.pct == null) return `<span class="change-pill neutral">기록 대기</span>`;
    const up = change.diff > 0, down = change.diff < 0;
    const cls = up ? 'up' : down ? 'down' : 'neutral';
    const arrow = up ? '↑' : down ? '↓' : '→';
    const pct = Math.abs(change.pct).toFixed(Math.abs(change.pct) >= 10 ? 1 : 2);
    return `<span class="change-pill ${cls}">${arrow} ${pct}%${compact ? '' : ` · ${change.diff > 0 ? '+' : ''}${Number(change.diff).toLocaleString('ko-KR')} G`}</span>`;
  }

  function salesEfficiencyFoods() {
    return D.foods.map(food => {
      const sale = currentPrice(food);
      if (sale == null) return null;
      const npcCost = npcCashCostFood(food);
      const net = sale - npcCost;
      const heat = normalizedPrice(food) ?? .5;
      // Primary signal is actual gold left after known NPC purchases.  Market heat
      // is only a light tie-break so the ranking stays easy to explain.
      const score = net + (sale * heat * .03);
      return {food, sale, npcCost, net, heat, change:priceChange(food), score};
    }).filter(Boolean).sort((a,b) => b.score - a.score);
  }

  function highestPriceFoods() {
    return D.foods.map(food => ({food, sale:currentPrice(food), change:priceChange(food)}))
      .filter(x => x.sale != null)
      .sort((a,b) => b.sale - a.sale);
  }

  function trendChartSvg(food, gold = false) {
    const rows = priceHistory(food, gold);
    if (rows.length < 2) return `<div class="market-chart-empty"><strong>가격 기록을 기다리고 있어.</strong><span>밀키 가격표의 과거 기록이나 사이트 확정 기록이 2개 이상 모이면 차트가 표시돼.</span></div>`;

    const W = 720, H = 292, L = 58, R = 22, T = 22, B = 45;
    const values = rows.map(x => x.price);
    let lo = Math.min(...values), hi = Math.max(...values);
    const pad = Math.max(12, Math.round((hi - lo || Math.max(hi,1) * .08) * .18));
    lo = Math.max(0, lo - pad); hi += pad;
    const x = i => L + (rows.length === 1 ? 0 : i * ((W - L - R) / (rows.length - 1)));
    const y = v => T + (hi - v) * ((H - T - B) / (hi - lo || 1));
    const points = rows.map((r,i) => `${x(i).toFixed(1)},${y(r.price).toFixed(1)}`).join(' ');
    const area = `${L},${H-B} ${points} ${x(rows.length-1)},${H-B}`;
    const ticks = Array.from({length:5},(_,i) => hi - i * ((hi-lo)/4));

    return `<svg class="market-chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(trendName(food, gold))} 가격 흐름">
      <defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2f7556" stop-opacity=".18"/><stop offset="100%" stop-color="#2f7556" stop-opacity="0"/></linearGradient></defs>
      ${ticks.map(v => `<g><line class="chart-grid-line" x1="${L}" x2="${W-R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="chart-y-label" x="${L-10}" y="${(y(v)+3).toFixed(1)}">${Math.round(v).toLocaleString('ko-KR')}</text></g>`).join('')}
      <polygon class="chart-area" points="${area}"/>
      <polyline class="chart-line" points="${points}"/>
      ${rows.map((r,i) => `<g class="chart-point-group"><circle class="chart-point ${r.current ? 'current' : ''}" cx="${x(i).toFixed(1)}" cy="${y(r.price).toFixed(1)}" r="${r.current ? 5 : 3.5}"/><text class="chart-x-label" x="${x(i).toFixed(1)}" y="${H-17}">${esc(r.label)}</text><title>${esc(r.label)} · ${fmt(r.price)}</title></g>`).join('')}
    </svg>`;
  }

  function efficiencyRankHtml(rows) {
    if (!rows.length) return `<div class="empty compact"><strong>가격 연결 대기</strong>가격 데이터를 연결하면 자동으로 계산해.</div>`;
    return rows.slice(0,5).map((x,i) => `<button class="market-rank-row" data-cooking-food="${x.food.slug}" aria-label="${esc(x.food.name)} 제작법으로 이동">
      <span class="market-rank-no">${i+1}</span>
      <span class="market-rank-food" data-tip="1">
        <span class="market-rank-icon"><img src="${x.food.image}" alt="${esc(x.food.name)}"></span>
        <span class="market-rank-main"><b>${esc(x.food.name)}</b><small>확인된 NPC 구매비 ${fmt(x.npcCost)} · 예상 차익 ${fmt(x.net)}</small></span>
        ${foodRecipeTooltip(x.food)}
      </span>
      <span class="market-rank-value"><b>${fmt(x.sale)}</b>${changeBadge(x.change,true)}</span>
    </button>`).join('');
  }

  function highPriceRankHtml(rows) {
    if (!rows.length) return `<div class="empty compact"><strong>가격 연결 대기</strong>가격 데이터를 연결하면 자동으로 계산해.</div>`;
    return rows.slice(0,5).map((x,i) => `<button class="market-rank-row" data-trend-food="${x.food.slug}" data-trend-gold="0">
      <span class="market-rank-no">${i+1}</span>
      <span class="market-rank-food" data-tip="1">
        <span class="market-rank-icon"><img src="${x.food.image}" alt="${esc(x.food.name)}"></span>
        <span class="market-rank-main"><b>${esc(x.food.name)}</b><small>${fmt(x.change.previous)} → ${fmt(x.change.current)}</small></span>
        ${foodRecipeTooltip(x.food)}
      </span>
      <span class="market-rank-value"><b>${fmt(x.sale)}</b>${changeBadge(x.change,true)}</span>
    </button>`).join('');
  }

  function kstEpoch(y, m, d, h = 3, min = 0, sec = 0) {
    return Date.UTC(y, m - 1, d, h - 9, min, sec);
  }

  function kstNowParts(nowMs = Date.now()) {
    const d = new Date(nowMs + 9 * 3600000);
    return {y:d.getUTCFullYear(), m:d.getUTCMonth()+1, d:d.getUTCDate(), h:d.getUTCHours(), min:d.getUTCMinutes(), sec:d.getUTCSeconds()};
  }

  function daysInMonth(y,m) { return new Date(Date.UTC(y,m,0)).getUTCDate(); }

  function priceCycleInfo(nowMs = Date.now()) {
    const p = kstNowParts(nowMs);
    let startMs = null, nextMs = null;
    for (let back=0; back<45 && startMs==null; back++) {
      const t = new Date(Date.UTC(p.y,p.m-1,p.d-back,0,0,0));
      const y=t.getUTCFullYear(), m=t.getUTCMonth()+1, d=t.getUTCDate();
      if (!PRICE_CHANGE_DAYS.includes(d) || d>daysInMonth(y,m)) continue;
      const candidate = kstEpoch(y,m,d,3,0,0);
      if (candidate <= nowMs) startMs = candidate;
    }
    for (let fwd=0; fwd<45 && nextMs==null; fwd++) {
      const t = new Date(Date.UTC(p.y,p.m-1,p.d+fwd,0,0,0));
      const y=t.getUTCFullYear(), m=t.getUTCMonth()+1, d=t.getUTCDate();
      if (!PRICE_CHANGE_DAYS.includes(d) || d>daysInMonth(y,m)) continue;
      const candidate = kstEpoch(y,m,d,3,0,0);
      if (candidate > nowMs) nextMs = candidate;
    }
    const start = new Date(startMs);
    const shifted = new Date(startMs + 9*3600000);
    const cycleKey = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth()+1).padStart(2,'0')}-${String(shifted.getUTCDate()).padStart(2,'0')}T03:00:00+09:00`;
    return {startMs,nextMs,cycleKey};
  }

  function fmtKst(ts, withSeconds = true) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:withSeconds?'2-digit':undefined,hour12:false});
  }

  function isCurrentCycleStamp(ts) {
    if (!ts) return false;
    const t = new Date(ts).getTime();
    return Number.isFinite(t) && t >= priceCycleInfo().startMs;
  }

  function priceFreshState() {
    const cycle = priceCycleInfo();
    const published = state.cloudStatus?.published || state.priceMeta;
    const candidate = state.cloudStatus?.candidate;
    const publishedFresh = !!published && published.cycleKey === cycle.cycleKey && isCurrentCycleStamp(published.capturedAt || published.updatedAt);
    const candidateFresh = !!candidate && candidate.cycleKey === cycle.cycleKey && isCurrentCycleStamp(candidate.capturedAt);
    // Worker v1.2.1 can report a corrected candidate for an already-published cycle.
    // Keep that state distinct from "already current" so the user can republish it.
    const hasNewCandidate = candidateFresh && state.cloudStatus?.hasNewCandidate === true;
    return {cycle,published,candidate,publishedFresh,candidateFresh,hasNewCandidate};
  }

  function renderDashboard() {
    const linked = Object.keys(state.prices).length > 0;
    const fully = D.foods.filter(f => readiness(f) === 1).length;
    const efficiency = salesEfficiencyFoods();
    const expensive = highestPriceFoods();
    const pricedFoods = D.foods.filter(f => getPrice(f));
    const goldPricedFoods = D.foods.filter(f => getPrice(f, true));
    const trendGold = state.selectedTrendGold;
    const trendFoods = trendGold ? goldPricedFoods : pricedFoods;
    const selectedCandidate = foodBySlug(state.selectedTrendFood);
    const selected = selectedCandidate && getPrice(selectedCandidate, trendGold)
      ? selectedCandidate
      : (trendGold ? (goldPricedFoods[0] || D.foods[0]) : (efficiency[0]?.food || pricedFoods[0] || D.foods[0]));
    state.selectedTrendFood = selected.slug;
    const selectedPrice = getPrice(selected, trendGold);
    const selectedChange = priceChange(selected, trendGold);
    const changes = D.foods.map(food => ({food, ...priceChange(food)}))
      .filter(x => x.current != null)
      .sort((a,b) => (b.pct ?? -9999) - (a.pct ?? -9999));
    const recommendations = calcCropUnlocks().slice(0, 4);
    const freshness = priceFreshState();
    const updateReady = freshness.candidateFresh && (!freshness.publishedFresh || freshness.hasNewCandidate);
    const statusLabel = !linked ? 'WAITING' : updateReady ? 'UPDATE' : freshness.publishedFresh ? 'CURRENT' : 'UPDATE';
    const statusClass = linked && freshness.publishedFresh && !updateReady ? 'on' : '';
    const updateCopy = !linked
      ? 'Cloudflare에 아직 확정 가격이 없어.'
      : updateReady
        ? `새 가격 후보가 확인됐어 · ${fmtKst(freshness.candidate.capturedAt)}`
        : freshness.publishedFresh
          ? `현재 가격 주기 확인 완료 · ${fmtKst(freshness.published?.capturedAt || state.priceMeta?.capturedAt || state.priceMeta?.updatedAt)}`
          : `가격 변동 시각이 지났어. 밀키 상점 확인이 필요해.`;

    $('#page-dashboard').innerHTML = `<div class="content-shell market-home">
      <section class="hero market-hero">
        <div class="hero-copy">
          <div class="hero-kicker">DDING TYCOON · COOKING MARKET</div>
          <h2>가격은 확인할 때만,<br><b>공개는 네가 원할 때.</b></h2>
          <p>모드가 확인한 가격은 Cloudflare의 후보값으로만 올라가고, 이 사이트의 가격은 [최신 가격 업데이트]를 눌렀을 때만 확정돼.</p>
          <div class="hero-actions"><button id="publishLatestBtn" class="btn primary">최신 가격 업데이트</button><span class="update-help" tabindex="0">업데이트 방법 ?<span class="update-help-pop">모드가 설치된 Minecraft에서 밀키 → 요리 판매 상점을 한 번 연 뒤, 이 버튼을 눌러줘.</span></span></div>
        </div>
        <div class="hero-side market-status-hero">
          <div class="hero-side-label">PRICE STATUS</div>
          <div class="feed-big-status"><span class="feed-live-dot ${statusClass}"></span><strong>${statusLabel}</strong></div>
          <p>${esc(updateCopy)}</p>
        </div>
      </section>

      ${(!freshness.publishedFresh || freshness.hasNewCandidate) && (linked || freshness.candidateFresh) ? `<section class="price-alert ${updateReady?'ready':'warning'}"><div><b>${updateReady?'새 가격 후보가 준비됐습니다.':'가격 업데이트가 필요합니다.'}</b><span>${updateReady ? '밀키 상점에서 현재 주기 가격이 다시 확인됐어. 업데이트 버튼을 누르면 사이트에 반영돼.' : '현재 가격 주기의 실제 가격이 아직 확인되지 않았어.'}</span></div><div class="alert-actions"><span class="update-help" tabindex="0">업데이트 방법 ?<span class="update-help-pop">1. 모드가 설치된 PC에서 Minecraft 서버 접속<br>2. 밀키 → 요리 판매 상점 열기<br>3. 사이트로 돌아와 [최신 가격 업데이트] 클릭</span></span><button id="publishLatestBtn2" class="btn primary">최신 가격 업데이트</button></div></section>` : ''}

      <section class="metrics">
        <div class="metric"><div class="metric-label">가격 상태</div><div class="metric-value">${updateReady ? '새 후보' : freshness.publishedFresh ? '최신' : linked ? '확인 필요' : '대기'}</div><div class="metric-foot">${freshness.published ? `최종 확인 ${fmtKst(freshness.published.capturedAt,false)}` : '확정 가격 없음'}</div></div>
        <div class="metric"><div class="metric-label">상승 음식</div><div class="metric-value">${changes.filter(x => x.diff > 0).length}</div><div class="metric-foot">직전 확정 주기 대비</div></div>
        <div class="metric"><div class="metric-label">하락 음식</div><div class="metric-value">${changes.filter(x => x.diff < 0).length}</div><div class="metric-foot">직전 확정 주기 대비</div></div>
        <div class="metric"><div class="metric-label">다음 가격 변경</div><div class="metric-value" id="nextChange">—</div><div class="metric-foot">1·3·6·9·12·15·18·21·24·27·30일 03:00</div></div>
      </section>

      <section class="section">
        <div class="section-head"><div><h2>지금 뭘 파는 게 좋은가</h2><p>왼쪽은 확인 가능한 NPC 구매비를 차감한 판매 차익, 오른쪽은 현재 확정 판매가 자체가 높은 순서야.</p></div></div>
        <div class="market-rank-grid">
          <article class="card market-rank-card"><div class="market-card-head"><div><span class="market-kicker">SELL EFFICIENCY</span><h3>추천 판매 효율</h3></div><small>NPC 구매비 차감 기준</small></div>${efficiencyRankHtml(efficiency)}</article>
          <article class="card market-rank-card"><div class="market-card-head"><div><span class="market-kicker">HIGHEST PRICE</span><h3>확정 판매가 최고</h3></div><small>현재 공개 가격 순</small></div>${highPriceRankHtml(expensive)}</article>
        </div>
        <div class="market-method-note">재배·사냥·채집 재료는 임의의 골드 원가로 환산하지 않고, DB에 확인된 NPC 구매비만 비용으로 차감해. ‘추천 판매 효율’은 <b>현재 공개 가격을 빠르게 비교하는 실전 지표</b>야.</div>
      </section>

      <section class="section">
        <div class="section-head"><div><h2>현재가 흐름</h2><p>첫 연결은 밀키 툴팁의 과거 가격을 시드로 쓰고, 이후에는 사이트에서 확정한 가격 주기가 차례로 쌓여.</p></div><button class="btn ghost" data-go="prices">가격 상태 보기</button></div>
        <div class="chart-mode-tabs" role="tablist" aria-label="가격 흐름 모드"><button class="chart-mode-tab ${trendGold ? '' : 'active'}" data-trend-mode="normal" role="tab" aria-selected="${trendGold ? 'false' : 'true'}">일반 요리</button><button class="chart-mode-tab ${trendGold ? 'active' : ''}" data-trend-mode="gold" role="tab" aria-selected="${trendGold ? 'true' : 'false'}">황금 요리</button></div>
        <div class="card market-chart-card">
          <div class="market-chart-main">
            <div class="market-chart-head">
              <div class="market-selected-food"><span class="market-selected-icon"><img src="${trendImage(selected, trendGold)}" alt=""></span><div><span class="market-kicker">${trendGold ? 'SELECTED GOLD FOOD' : 'SELECTED FOOD'}</span><h3>${esc(trendName(selected, trendGold))}</h3></div></div>
              <div class="market-selected-numbers"><div><small>시장 판매가</small><b>${fmt(marketPrice(selected, trendGold))}</b></div><div><small>나의 판매가</small><b>${fmt(selectedPrice?.myPrice ?? selectedPrice?.marketPrice)}</b></div>${changeBadge(selectedChange)}</div>
            </div>
            <div class="market-chart-wrap">${trendChartSvg(selected, trendGold)}</div>
          </div>
          <aside class="market-food-picker"><div class="picker-head"><b>${trendGold ? '황금 요리 선택' : '음식 선택'}</b><span>${trendFoods.length}/${D.foods.length}</span></div><div class="picker-list">${D.foods.map(food => {
            const p=getPrice(food, trendGold), ch=priceChange(food, trendGold), itemName=trendName(food, trendGold), itemImage=trendImage(food, trendGold);
            return `<button class="picker-food ${food.slug===selected.slug?'active':''} ${p?'':'disabled'}" data-trend-food="${food.slug}" data-trend-gold="${trendGold ? '1' : '0'}" ${p?'':'disabled'}><img src="${itemImage}" alt=""><span><b>${esc(itemName)}</b><small>${p ? `${fmt(p.myPrice ?? p.marketPrice)} · ${ch.pct == null ? '변동 기록 대기' : `${ch.diff>0?'↑':ch.diff<0?'↓':'→'} ${Math.abs(ch.pct).toFixed(1)}%`}` : '가격 미수집'}</small></span></button>`;
          }).join('')}</div></aside>
        </div>
      </section>

      <section class="section">
        <div class="section-head"><div><h2>전체 음식 변동</h2><p>직전 확정 가격과 현재 확정 가격을 비교해 얼마나 비싸졌고 싸졌는지 바로 확인해.</p></div></div>
        <div class="card movement-table-card">${changes.length ? `<div class="movement-table-head"><span>음식</span><span>직전가</span><span>현재가</span><span>변동</span></div>${changes.map(x => `<button class="movement-row" data-trend-food="${x.food.slug}" data-trend-gold="0"><span class="movement-food"><img src="${x.food.image}" alt=""><b>${esc(x.food.name)}</b></span><span>${fmt(x.previous)}</span><span><b>${fmt(x.current)}</b></span><span>${changeBadge(x,true)}</span></button>`).join('')}` : `<div class="empty"><strong>등락 데이터를 기다리는 중이야.</strong>가격을 두 주기 이상 확정하면 실제 Cloudflare 기록을 기준으로 비교해.</div>`}</div>
      </section>

      <section class="section farm-after-market">
        <div class="section-head"><div><h2>다음 농장 추천</h2><p>현재 체크한 작물 기준으로 제작 가능 요리를 늘리는 작물을 계산했어.</p></div><button class="btn ghost" data-go="farm">농장 수정</button></div>
        <div class="card crop-suggest">${recommendations.map(x=>`<div class="crop-suggest-row"><span>${iconHTML(D.crops.find(c=>c.id===x.id)||{emoji:'□'})}</span><div><b>${esc(cropName(x.id))}</b><small>관련 요리 ${x.improves}종 · 즉시 완성 ${x.unlock}종</small></div><strong>+${x.unlock}</strong></div>`).join('') || `<div class="empty compact"><strong>농장 정보가 없어.</strong>내 농장에서 현재 재배 작물을 체크해줘.</div>`}</div>
      </section>
    </div>`;
    updateNextPriceChange();
  }

  function renderCooking() {
    const filters = ['ALL','COMMON','NORMAL','RARE','EPIC','GOLD'];
    const q = state.query.trim().toLowerCase();
    const gold = state.cookingFilter === 'GOLD';
    const foods = D.foods.filter(f => {
      if (!gold && state.cookingFilter !== 'ALL' && f.grade !== state.cookingFilter) return false;
      if (!q) return true;
      const ingredients = f.recipe.map(([id]) => resolveIngredient(id).name).join(' ');
      const goldName = f.gold?.name || '';
      return (f.name + ' ' + goldName + ' ' + ingredients).toLowerCase().includes(q);
    });
    $('#page-cooking').innerHTML = `<div class="content-shell">
      <div class="section-head" style="margin-top:2px"><div><h2>요리 인덱스</h2><p>최신 15종을 등급·재료·황금 제작법까지 한 흐름으로 정리했어.</p></div><div class="reference-status">${foods.length} / ${D.foods.length}</div></div>
      <div class="toolbar"><div class="pillbar">${filters.map(f => `<button class="pill ${state.cookingFilter === f ? 'active' : ''}" data-filter="${f}">${f === 'ALL' ? '전체' : f === 'GOLD' ? '황금' : f}</button>`).join('')}</div><div class="view-toggle"><button data-view="grid" class="${state.cookingView === 'grid' ? 'active' : ''}" title="그리드"><svg><use href="#i-grid"/></svg></button><button data-view="list" class="${state.cookingView === 'list' ? 'active' : ''}" title="리스트"><svg><use href="#i-list"/></svg></button></div></div>
      <div class="food-grid ${state.cookingView === 'list' ? 'list-view' : ''}">${foods.length ? foods.map(f => foodCard(f, gold)).join('') : `<div class="card empty"><strong>검색 결과가 없어.</strong>다른 음식명이나 재료명으로 검색해봐.</div>`}</div>
      <p class="source-note">현재 개인DB 레시피·가격 범위와 업로드된 서버 리소스 이미지를 기준으로 표시해.</p>
    </div>`;
  }

  function goToCookingFood(slug) {
    const food = foodBySlug(slug);
    if (!food) return;
    state.query = '';
    state.cookingFilter = 'ALL';
    const search = $('#globalSearch');
    if (search) search.value = '';
    switchPage('cooking');
    renderCooking();
    hideFloatingTooltip();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const card = document.querySelector(`.food-card[data-food="${slug}"][data-gold="0"]`);
      if (!card) return;
      card.scrollIntoView({behavior:'smooth', block:'center'});
      card.classList.remove('recipe-jump-highlight');
      void card.offsetWidth;
      card.classList.add('recipe-jump-highlight');
      setTimeout(() => card.classList.remove('recipe-jump-highlight'), 1800);
    }));
  }

  function renderFarm() {
    const groups = [...new Set(D.crops.map(c => c.group))];
    const readyFoods = [...D.foods].filter(f => readiness(f) >= 1).sort((a,b) => ((normalizedPrice(b) || 0) - (normalizedPrice(a) || 0)) || a.name.localeCompare(b.name,'ko'));
    const nearFoods = [...D.foods].filter(f => readiness(f) < 1).sort((a,b) => readiness(b) - readiness(a) || ((normalizedPrice(b) || 0) - (normalizedPrice(a) || 0)));
    const unlocks = calcCropUnlocks();
    $('#page-farm').innerHTML = `<div class="content-shell">
      <div class="farm-layout">
        <div class="card farm-card">
          <div class="section-head" style="margin:0 0 18px"><div><h2>현재 농장·채집</h2><p>체크한 재배·채집 재료는 브라우저에 바로 저장돼.</p></div><button id="clearFarm" class="btn ghost">전체 해제</button></div>
          <div class="crop-groups">${groups.map(g => `<div class="crop-group"><h3>${esc(g)}</h3>${D.crops.filter(c => c.group === g).map(c => `<label class="crop-check"><input type="checkbox" data-crop="${c.id}" ${state.farm.has(c.id) ? 'checked' : ''}>${c.icon ? `<img src="${c.icon}" alt="">` : `<span style="font-size:20px">${esc(c.emoji || '·')}</span>`}<span>${esc(c.name)}</span></label>`).join('')}</div>`).join('')}</div>
          <div class="note-strip" style="margin-top:16px">세레니티 전용 작물은 기존 정리 기준 성장 15분. 드롭 범위 등은 게임 업데이트에 따라 달라질 수 있어.</div>
        </div>
        <div class="card farm-recommend">
          <div class="section-head" style="margin:0 0 10px"><div><h2>다음 확보 후보</h2><p>재배·채집 재료 1종 추가 시 완성되는 요리 수 기준</p></div></div>
          ${unlocks.length ? unlocks.map((x,i) => {
            const c = D.crops.find(c => c.id === x.id);
            return `<div class="recommend-item">${c.icon ? `<img src="${c.icon}" alt="">` : `<span style="font-size:25px">${esc(c.emoji || '·')}</span>`}<div><div class="name">${String(i + 1).padStart(2,'0')} · ${esc(c.name)}</div><div class="why">관련 ${x.improves}종 · 즉시 완성 ${x.unlock}종</div></div><div class="score">+${x.unlock}</div></div>`;
          }).join('') : `<div class="empty">모든 작물이 체크되어 있어.</div>`}
        </div>
      </div>

      <section class="section farm-ready-section"><div class="section-head"><div><h2>지금 만들 수 있는 요리</h2><p>내 농장·채집 목록에 체크한 재료를 대조해서 재배·채집 조건이 100% 충족된 음식이야.</p></div><div class="reference-status">${readyFoods.length} / ${D.foods.length}</div></div>
        ${readyFoods.length ? `<div class="food-grid">${readyFoods.map(f => foodCard(f,false)).join('')}</div>` : `<div class="card empty"><strong>아직 재배·채집 재료 조건이 완성된 요리가 없어.</strong>위의 다음 확보 후보를 참고해서 작물을 추가해봐.</div>`}
      </section>

      <section class="section"><div class="section-head"><div><h2>조금만 더 확보하면 되는 요리</h2><p>아직 부족한 음식만 식재료 준비도 높은 순으로 정렬했어. 준비도 바에 마우스를 올리면 부족한 작물이 바로 보여.</p></div></div>${nearFoods.length ? `<div class="food-grid">${nearFoods.map(f => foodCard(f,false)).join('')}</div>` : `<div class="card empty"><strong>모든 음식의 재배·채집 재료 조건을 충족했어.</strong></div>`}</section>
    </div>`;
  }

  function profitCropCard(cropId) {
    const meta = profitCropMeta(cropId);
    const plots = Number(state.profitFarm[cropId] || 0);
    const periods = [
      ['15분',15],
      ['분당',1],
      ['시간당',60],
    ];
    return `<article class="card profit-crop-card">
      <div class="profit-crop-head">
        <div class="profit-crop-icon">${meta.icon ? `<img src="${esc(meta.icon)}" alt="">` : `<span>${esc(meta.emoji || '·')}</span>`}</div>
        <div><h3>${esc(meta.name)}</h3><p>${plots.toLocaleString('ko-KR')}칸 · 성장 ${meta.growthMinutes}분 · 수율 ${compactNumber(meta.yieldMin,1)}~${compactNumber(meta.yieldMax,1)}개</p></div>
      </div>
      <div class="profit-crop-periods">${periods.map(([label,minutes]) => {
        const min = cropUnitsForMinutes(cropId, minutes, 'min');
        const avg = cropUnitsForMinutes(cropId, minutes, 'avg');
        const max = cropUnitsForMinutes(cropId, minutes, 'max');
        return `<div><span>${label}</span><b>${compactNumber(avg)}개</b><small>${compactNumber(min)} ~ ${compactNumber(max)}개</small></div>`;
      }).join('')}</div>
    </article>`;
  }

  function profitRequirementChips(stats) {
    return Object.entries(stats.requirements).map(([id, qty]) => {
      const c = profitCropMeta(id);
      return `<span class="profit-req-chip ${stats.bottleneck === id ? 'bottleneck' : ''}">${c.icon ? `<img src="${esc(c.icon)}" alt="">` : `<span>${esc(c.emoji || '·')}</span>`}<b>${esc(c.name)}</b><em>×${compactNumber(qty,1)}</em></span>`;
    }).join('');
  }

  function profitPeriodCard(stats, key, label) {
    const u = stats.units[key];
    const r = stats.revenue[key];
    return `<div class="profit-period-card">
      <span class="profit-period-label">${label}</span>
      ${r ? `<b class="profit-period-money">${compactGold(r.avg)}</b><small class="profit-period-range">최소 ${compactGold(r.min)} · 최대 ${compactGold(r.max)}</small>` : `<b class="profit-period-money muted">가격 대기</b><small class="profit-period-range">가격 연동 후 수익 자동 계산</small>`}
      <div class="profit-period-output"><span>기대 제작량</span><strong>${compactNumber(u.avg)}개</strong></div>
      <div class="profit-period-output range"><span>수율 범위</span><strong>${compactNumber(u.min)} ~ ${compactNumber(u.max)}개</strong></div>
    </div>`;
  }

  function profitFoodCard(stats) {
    const {food, price, npcCost, bottleneck} = stats;
    const avgHour = stats.units.hour.avg;
    const avgRevenueHour = stats.revenue.hour?.avg ?? null;
    const knownNetHour = avgRevenueHour == null ? null : avgHour * (price - npcCost);
    const bottleneckName = bottleneck ? profitCropMeta(bottleneck).name : '—';
    return `<article class="card profit-food-card">
      <div class="profit-food-head">
        <div class="profit-food-title">
          <div class="profit-food-icon"><img src="${esc(food.image)}" alt="${esc(food.name)}"></div>
          <div><span class="grade ${esc(food.grade)}">${esc(gradeText(food.grade))}</span><h3>${esc(food.name)}</h3><p>평균 병목 · <b>${esc(bottleneckName)}</b></p></div>
        </div>
        <div class="profit-food-price"><span>${state.profitPriceMode === 'market' ? '시장 기준가' : '나의 판매가'}</span><b>${price == null ? '—' : compactGold(price)}</b></div>
      </div>
      <div class="profit-requirements"><span class="profit-mini-label">1개 제작에 필요한 핵심 작물</span><div>${profitRequirementChips(stats)}</div></div>
      <div class="profit-period-grid">
        ${profitPeriodCard(stats,'quarter','15분')}
        ${profitPeriodCard(stats,'minute','분당')}
        ${profitPeriodCard(stats,'hour','시간당')}
      </div>
      <div class="profit-food-foot">
        <span>15분 평균 기준 즉시 제작 가능 <b>${Math.floor(stats.units.quarter.avg).toLocaleString('ko-KR')}개</b></span>
        <span>확인 가능한 NPC 구매비/개 <b>${compactGold(npcCost)}</b>${knownNetHour == null ? '' : ` · 평균 시간당 순수익 참고 <b>${compactGold(knownNetHour)}</b>`}</span>
      </div>
      <button class="profit-target-food-btn" data-profit-target-food="${food.slug}">이 음식 기준 최적 배치 보기</button>
    </article>`;
  }

  function renderProfit() {
    const used = PROFIT_CROP_IDS.reduce((sum,id) => sum + Number(state.profitFarm[id] || 0), 0);
    const total = Number(state.profitFarm.total || 0);
    const remaining = total - used;
    const over = total > 0 && remaining < 0;
    const stats = D.foods.map(profitFoodStats).filter(x => Object.keys(x.requirements).length);
    const filtered = stats.filter(x => {
      const ids = Object.keys(x.requirements);
      if (state.profitFilter === 'all') return true;
      if (state.profitFilter === 'mixed') return ids.length > 1;
      return ids.includes(state.profitFilter);
    });
    const sortValue = x => {
      if (state.profitSort === 'minRevenue') return x.revenue.hour?.min ?? -1;
      if (state.profitSort === 'maxRevenue') return x.revenue.hour?.max ?? -1;
      if (state.profitSort === 'avgUnits') return x.units.hour.avg;
      return x.revenue.hour?.avg ?? -1;
    };
    filtered.sort((a,b) => state.profitSort === 'name'
      ? a.food.name.localeCompare(b.food.name,'ko')
      : sortValue(b) - sortValue(a) || a.food.name.localeCompare(b.food.name,'ko'));
    const priced = stats.filter(x => x.revenue.hour?.avg != null && x.units.hour.avg > 0).sort((a,b) => b.revenue.hour.avg - a.revenue.hour.avg);
    const best = priced[0] || null;
    const priceLabel = state.profitPriceMode === 'market' ? '시장 기준가' : '나의 판매가';
    const allocationText = total <= 0
      ? '전체 경작지 수를 입력하면 남은 칸을 계산해.'
      : over
        ? `${Math.abs(remaining).toLocaleString('ko-KR')}칸 초과 배정됐어. 계산은 입력값 기준이야.`
        : remaining === 0
          ? '모든 경작지를 배정했어.'
          : `${remaining.toLocaleString('ko-KR')}칸이 아직 미배정이야.`;

    $('#page-profit').innerHTML = `<div class="content-shell profit-page">
      <section class="profit-setup-grid">
        <div class="card profit-input-card">
          <div class="section-head" style="margin:0 0 16px"><div><h2>경작지 설정</h2><p>입력값은 이 브라우저에 자동 저장돼.</p></div><button id="profitReset" class="btn ghost">초기화</button></div>
          <div class="profit-input-list">
            <label class="profit-input-row total"><span><b>현재 전체 경작지</b><small>배정 가능한 총 칸 수</small></span><input data-profit-field="total" type="number" min="0" step="1" value="${total}"><em>칸</em></label>
            ${PROFIT_CROP_IDS.map(id => {
              const c = profitCropMeta(id);
              return `<label class="profit-input-row"><span>${c.icon ? `<img src="${esc(c.icon)}" alt="">` : `<i>${esc(c.emoji || '·')}</i>`}<span><b>${esc(c.name)}</b><small>${c.growthMinutes}분 · 평균 수율 ${compactNumber(c.yieldAvg,1)}개</small></span></span><input data-profit-field="${id}" type="number" min="0" step="1" value="${Number(state.profitFarm[id] || 0)}"><em>칸</em></label>`;
            }).join('')}
          </div>
          <div class="profit-allocation ${over ? 'over' : ''}"><span>배정 ${used.toLocaleString('ko-KR')} / ${total.toLocaleString('ko-KR')}칸</span><b>${esc(allocationText)}</b></div>
        </div>

        ${profitRecommendationCard(total, used)}
      </section>

      ${targetFoodPlannerCard(total)}

      ${best ? `<div class="profit-best-strip"><span>현재 배정 최고 평균 수익</span><b>${esc(best.food.name)}</b><strong>${compactGold(best.revenue.hour.avg)} / 시간</strong><small>${priceLabel} · 최소 ${compactGold(best.revenue.hour.min)} ~ 최대 ${compactGold(best.revenue.hour.max)}</small></div>` : ''}

      <div class="note-strip profit-assumption">계산 가정 · 토마토/양파/마늘 경작지가 생산 병목이라고 보고 계산해. 감자·호박·고기·과일·구매 재료 등 다른 재료는 충분히 확보되어 있고, 가공/조리 대기시간은 없다고 가정한다. 실제 수익은 재료 수급과 플레이 방식에 따라 달라질 수 있어.</div>

      <section class="section">
        <div class="section-head"><div><h2>작물 생산량</h2><p>각 경작지의 드롭 범위에서 평균값을 계산하고, 최소·최대도 함께 보여줘.</p></div></div>
        <div class="profit-crop-grid">${PROFIT_CROP_IDS.map(profitCropCard).join('')}</div>
      </section>

      <section class="section">
        <div class="section-head profit-food-section-head"><div><h2>음식별 예상 수익</h2><p>여러 핵심 작물이 필요한 음식은 가장 부족한 작물을 자동으로 병목 처리해.</p></div>
          <div class="profit-controls">
            <div class="pillbar">
              ${[['all','전체'],['tomato','토마토'],['onion','양파'],['garlic','마늘'],['mixed','복합']].map(([id,label]) => `<button class="pill ${state.profitFilter === id ? 'active' : ''}" data-profit-filter="${id}">${label}</button>`).join('')}
            </div>
            <label class="profit-select"><span>가격</span><select id="profitPriceMode"><option value="mine" ${state.profitPriceMode === 'mine' ? 'selected' : ''}>나의 판매가</option><option value="market" ${state.profitPriceMode === 'market' ? 'selected' : ''}>시장 기준가</option></select></label>
            <label class="profit-select"><span>정렬</span><select id="profitSort"><option value="avgRevenue" ${state.profitSort === 'avgRevenue' ? 'selected' : ''}>평균 시간당 수익</option><option value="minRevenue" ${state.profitSort === 'minRevenue' ? 'selected' : ''}>최소 시간당 수익</option><option value="maxRevenue" ${state.profitSort === 'maxRevenue' ? 'selected' : ''}>최대 시간당 수익</option><option value="avgUnits" ${state.profitSort === 'avgUnits' ? 'selected' : ''}>시간당 제작량</option><option value="name" ${state.profitSort === 'name' ? 'selected' : ''}>이름순</option></select></label>
          </div>
        </div>
        <div class="profit-food-list">${filtered.map(profitFoodCard).join('')}</div>
        <p class="source-note">수익 = 해당 기간의 기대 제작량 × 선택한 현재 판매가. 최소/최대 수익은 작물 드롭 수율 범위만 반영하며 가격 변동폭은 섞지 않아.</p>
      </section>
    </div>`;
  }

  function renderIngredients() {
    const q = state.query.trim().toLowerCase();
    const arr = Object.values(D.ingredients).filter(i => !q || (i.name + ' ' + i.type + ' ' + i.source + ' ' + i.detail).toLowerCase().includes(q));
    $('#page-ingredients').innerHTML = `<div class="content-shell">
      <div class="section-head" style="margin-top:2px"><div><h2>재료 인덱스</h2><p>획득처와 가공 경로를 카드 하나에서 바로 확인해.</p></div><div class="reference-status">${arr.length} items</div></div>
      <div class="ingredient-grid">${arr.map(i => `<article class="card ingredient-card"><div class="icon-lg">${iconHTML(i,'big-icon')}</div><span class="tag">${esc(i.type)}</span><h3>${esc(i.name)}</h3><p><b>${esc(i.source)}</b></p><p>${esc(i.detail)}</p>${i.recipe?.length ? `<p>필요 · ${i.recipe.map(([c,n]) => `${esc(resolveIngredient(c).name)} ×${n}`).join(' + ')}</p>` : ''}${i.npcPrice != null ? `<p class="cost">NPC 구매비 ${fmt(i.npcPrice)} / 개</p>` : ''}</article>`).join('')}</div>
      <p class="source-note">세레니티 작물·과일·구매 식재료·고기 수급처는 기존 조사 내용을 기반으로 정리되어 있어.</p>
    </div>`;
  }

  function finderMatch(item, q) {
    if (!q) return true;
    const hay = [item.name,item.region,item.location,item.npc,item.category,item.value,item.note,tradeLabels[item.action]].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  }

  function finderScore(item, q) {
    if (!q) return 0;
    const name = item.name.toLowerCase();
    if (name === q) return 100;
    if (name.startsWith(q)) return 70;
    if (name.includes(q)) return 50;
    if ((item.npc || '').toLowerCase().includes(q)) return 30;
    if ((item.location || '').toLowerCase().includes(q)) return 20;
    return 10;
  }

  function renderFinder() {
    const q = state.query.trim().toLowerCase();
    const filter = state.finderFilter;
    let items = SHOP.items.filter(x => (filter === 'all' || x.action === filter) && finderMatch(x,q));
    items = items.sort((a,b) => finderScore(b,q) - finderScore(a,q) || a.name.localeCompare(b.name,'ko'));
    const total = items.length;
    const visible = items.slice(0, q ? 160 : 100);
    const exactGlow = SHOP.items.find(x => x.name === '발광석' && x.action === 'buy');
    const sourceDate = SHOP.meta?.verified || '2026-09-30';
    const filters = [['all','전체'],['buy','내가 구매'],['sell','내가 판매'],['exchange','교환']];
    const cards = visible.map(x => `<article class="finder-card">
      <div>
        <div class="finder-name-row"><span class="finder-name">${esc(x.name)}</span><span class="trade-badge ${esc(x.action)}">${esc(tradeLabels[x.action] || x.action)}</span></div>
        <div class="finder-path"><b>${esc(x.region)}</b><span class="chev">›</span><span>${esc(x.location)}</span><span class="chev">›</span><b>${esc(x.npc)}</b>${x.category ? `<span class="chev">·</span><span>${esc(x.category)}</span>` : ''}</div>
        ${x.note ? `<div class="finder-note">${esc(x.note)}</div>` : ''}
      </div>
      <div class="finder-value"><strong>${esc(x.value)}</strong><a href="${esc(x.sourceUrl)}" target="_blank" rel="noreferrer">공식 위키 ↗</a></div>
    </article>`).join('');
    $('#page-finder').innerHTML = `<div class="content-shell">
      <div class="finder-hero">
        <section class="finder-intro"><p class="eyebrow">OFFICIAL TRADE INDEX</p><h2>이 물건, <b>어디서 사고 어디에 팔지?</b></h2><p>스폰 일반 상점·특수 상점·세레니티 상점가의 거래 정보를 한 검색창으로 묶었어. 아이템뿐 아니라 NPC나 장소 이름으로도 바로 찾을 수 있어.</p></section>
        <section class="card finder-example"><div class="mini-label">예시 · 바로 찾기</div><strong>발광석</strong><p>${exactGlow ? `${esc(exactGlow.value)}에 구매 가능` : '공식 상점 정보 검색'}</p><div class="route"><span>스폰</span><span>›</span><span>꽃잎 공방</span><span>›</span><b>바름</b></div></section>
      </div>
      <div class="finder-toolbar"><div class="finder-filters">${filters.map(([k,label]) => `<button class="finder-filter ${filter===k?'active':''}" data-finder-filter="${k}">${label}</button>`).join('')}</div><div class="finder-count"><b>${total.toLocaleString('ko-KR')}</b>건 · 공식 위키 ${esc(sourceDate)} 확인</div></div>
      <div class="finder-grid">${cards || `<div class="finder-search-hint" style="grid-column:1/-1"><strong>검색 결과가 없어.</strong><br>아이템 이름 일부, NPC 이름, 장소 이름으로 다시 찾아봐.</div>`}</div>
      ${total > visible.length ? `<div class="finder-sourcebar"><span>검색 전에는 앞 ${visible.length}개만 보여줘. 검색어를 입력하면 최대 160개까지 좁혀 보여줘.</span><span>${total-visible.length}개 추가 결과</span></div>` : ''}
      <div class="finder-sourcebar"><span>현재 카탈로그는 공식 위키의 스폰 상점·특수 상점·세레니티 상점가를 기준으로 정리.</span><span>값이 바뀌면 공식 위키 링크를 우선 확인</span></div>
    </div>`;
  }

  function guideByName(name) {
    if (!name) return null;
    const n = String(name).trim().toLowerCase();
    return GUIDE.items.find(x => String(x.name).toLowerCase() === n || (x.aliases || []).some(a => String(a).toLowerCase() === n)) || null;
  }

  function guideText(item) {
    const shopText = (item.shopEntries || []).flatMap(x => [x.action,x.value,x.region,x.location,x.npc,x.category,x.note]);
    const lifecycleText=[...(item.usedIn||[]),...(item.usageExamples||[]),...(item.lifecyclePaths||[]).flat(),item.noviceTip,item.finalUse];
    return [item.name,item.resourceId,item.resourceTexture,item.region,item.category,item.subcategory,item.acquire,item.use,item.note,item.probability,item.trade,...shopText,...(item.aliases||[]),...(item.tags||[]),...(item.related||[]),...lifecycleText].filter(Boolean).join(' ').toLowerCase();
  }

  function cleanGuideQuery(q) {
    return String(q || '').toLowerCase().replace(/[?!.,/\\()[\]{}:;~`'\"]/g,' ').replace(/(뭐야|뭔데|뭐임|무엇|어떻게|하는법|방법|알려줘|알려|어디서|어디에|구해|구함|얻어|획득|수급|쓰는지|사용처|사용|재료|제작법|제작|강화하려면|강화방법|강화법|강화)/g,' ').replace(/\s+/g,' ').trim();
  }

  function guideScore(item, raw) {
    const q = String(raw || '').trim().toLowerCase();
    if (!q) return 1;
    const text = guideText(item);
    const name = item.name.toLowerCase();
    const compactQ = q.replace(/\s+/g,'');
    const compactName = name.replace(/\s+/g,'');
    let score = 0;
    if (q === name || compactQ === compactName) score += 300;
    if (q.includes(name) || compactQ.includes(compactName)) score += 170;
    if (name.includes(q) || compactName.includes(compactQ)) score += 135;
    for (const a of item.aliases || []) {
      const al = String(a).toLowerCase();
      if (q.includes(al) || al.includes(q) || compactQ.includes(al.replace(/\s+/g,''))) score += 120;
    }
    const cleaned = cleanGuideQuery(q);
    const tokens = cleaned.split(/\s+/).filter(x => x.length > 1);
    tokens.forEach(t => {
      if (name.includes(t)) score += 46;
      else if (text.includes(t)) score += 12;
    });
    if (text.includes(q)) score += 40;
    return score;
  }

  function guideFilterMatch(item, filter) {
    if (!filter || filter === 'all') return true;
    if (filter === 'resource') return !!item.resourceId;
    if (filter === 'images') return hasGuideIcon(item);
    if (filter === 'missing-images') return !hasGuideIcon(item);
    if (filter === 'official') return item.official !== false;
    const r = `${item.region} ${item.category} ${item.subcategory}`;
    if (filter === 'general') return /공통|스폰|마을|특별/.test(r) && !/야생|세레니티|루미디아|파라다이스/.test(item.region);
    if (filter === 'wild') return /야생/.test(r);
    if (filter === 'serenity') return /세레니티/.test(r);
    if (filter === 'lumidia') return /루미디아/.test(r);
    if (filter === 'noctila') return /노크틸라/.test(r);
    if (filter === 'paradise') return /파라다이스/.test(r);
    if (filter === 'badge') return /뱃지/.test(r);
    if (filter === 'odds') return /캡슐|보급품|확률|코스메틱|가구|이벤트|칭호/.test(r);
    return true;
  }

  function guideMatches(raw, filter = state.guideFilter) {
    const q = String(raw || '').trim();
    return GUIDE.items
      .map((item,index) => ({item,index}))
      .filter(x => guideFilterMatch(x.item, filter))
      .map(x => ({...x,score:guideScore(x.item,raw)}))
      .filter(x => !q || x.score > 0)
      .sort((a,b) => {
        if (q) return b.score-a.score || a.item.name.localeCompare(b.item.name,'ko');
        // 기본 백과에서는 검증된 한글/공식 항목을 먼저 보여주고,
        // 표시명이 아직 확인되지 않은 리소스팩 식별 항목은 뒤쪽 페이지에 보존한다.
        const rank = x => x.item.official !== false ? 0 : (x.item.resourceVerified ? 1 : 2);
        return rank(a)-rank(b) || a.index-b.index;
      });
  }

  // ─────────────────────────────────────────────────────────────
  // v0.10 · 아이템 획득 → 사용 → 최종 목적 흐름 추적
  // 공개 제작식은 자동으로 역방향 인덱스를 만들고, 공식 문서의 개념 연결은 usedIn/lifecyclePaths로 보강한다.
  let _guideFlowCache = null;
  function guideFlowIndex() {
    if (_guideFlowCache) return _guideFlowCache;
    const byName = new Map();
    const usedBy = new Map();
    GUIDE.items.forEach(item => {
      byName.set(String(item.name).toLowerCase(), item);
      (item.aliases||[]).forEach(a=>byName.set(String(a).toLowerCase(),item));
    });
    const addUse=(source,target,qty=null,kind='recipe')=>{
      const rawKey=String(source||'').trim().toLowerCase();
      if(!rawKey || !target) return;
      // 제작식이 별칭/리소스 ID를 쓰더라도 실제 한국어 아이템 카드로 묶는다.
      const canonical=byName.get(rawKey);
      const key=String(canonical?.name || source || '').trim().toLowerCase();
      if(!key) return;
      if(!usedBy.has(key)) usedBy.set(key,[]);
      const arr=usedBy.get(key);
      if(!arr.some(x=>x.name===target.name && x.kind===kind)) arr.push({name:target.name,item:target,qty,kind});
    };
    GUIDE.items.forEach(target=>{
      (target.recipe||[]).forEach(([source,qty])=>addUse(source,target,qty,'recipe'));
    });
    GUIDE.items.forEach(source=>{
      (source.usedIn||[]).forEach(targetName=>{
        const target=byName.get(String(targetName).toLowerCase());
        if(target) addUse(source.name,target,null,'official-link');
      });
    });
    _guideFlowCache={byName,usedBy};
    return _guideFlowCache;
  }

  function guideDirectUses(item) {
    const idx=guideFlowIndex();
    return idx.usedBy.get(String(item.name).toLowerCase()) || [];
  }

  function guideBaseSources(item, depth=0, seen=new Set()) {
    if (!item || depth>6 || seen.has(item.name)) return [];
    const nextSeen=new Set(seen); nextSeen.add(item.name);
    const recipe=item.recipe||[];
    if (!recipe.length) return [{name:item.name,item,reason:item.acquire||'직접 획득/구매'}];
    const out=[];
    recipe.forEach(([n])=>{
      const child=guideByName(n);
      if(!child) out.push({name:n,item:null,reason:'기초/외부 재료'});
      else out.push(...guideBaseSources(child,depth+1,nextSeen));
    });
    const dedup=[]; const keys=new Set();
    out.forEach(x=>{const k=x.name.toLowerCase(); if(!keys.has(k)){keys.add(k); dedup.push(x);}});
    return dedup.slice(0,14);
  }

  function guideEndPaths(item, maxDepth=6, maxPaths=10) {
    const manual=(item.lifecyclePaths||[]).map(path=>path.map(String));
    const paths=[];
    const walk=(cur,path,seen,depth)=>{
      if(paths.length>=maxPaths || depth>maxDepth) return;
      const uses=guideDirectUses(cur).filter(x=>!seen.has(x.name));
      const sells=(cur.shopEntries||[]).filter(x=>x.action==='sell');
      // 중간 재료도 바로 판매할 수 있다면 '지금 팔기'를 하나의 실제 종착점으로 보여준다.
      if(sells.length && paths.length<maxPaths){
        const s=sells[0];
        const who=s.npc||s.location||'상점';
        const value=s.value?` · ${s.value}`:'';
        paths.push([...path,`판매 → ${who}${value}`,'골드/재화 회수']);
      }
      if(!uses.length){
        const terminal=cur.finalUse || (!sells.length ? cur.use : '');
        if(terminal && !path.includes(terminal)) paths.push([...path,terminal]);
        else if(!sells.length) paths.push(path);
        return;
      }
      uses.slice(0,8).forEach(u=>{
        if(paths.length>=maxPaths) return;
        const ns=new Set(seen); ns.add(u.name);
        walk(u.item,[...path,u.name],ns,depth+1);
      });
    };
    walk(item,[item.name],new Set([item.name]),0);
    const all=[...manual,...paths];
    const uniq=[]; const sig=new Set();
    all.forEach(path=>{const k=path.join('>'); if(!sig.has(k)){sig.add(k); uniq.push(path);}});
    return uniq.slice(0,maxPaths);
  }

  function guideFinalLabel(item) {
    if(item.finalUse) return item.finalUse;
    const sells=(item.shopEntries||[]).filter(x=>x.action==='sell');
    const uses=guideDirectUses(item);
    const useNames=uses.slice(0,3).map(x=>x.name);
    const useText=useNames.length ? `${useNames.join(' · ')}${uses.length>3?` 외 ${uses.length-3}개`:''} 제작/진행으로 이어짐` : '';
    const sellText=sells.length ? `NPC 판매/환금 가능 · ${sells.slice(0,2).map(x=>`${x.npc||x.location||'상점'} ${x.value||''}`.trim()).join(' · ')}` : '';
    if(sellText && useText) return `${sellText} / 또는 ${useText}`;
    if(useText) return useText;
    if(sellText) return sellText;
    if(item.use) return item.use;
    return '공식 공개자료에서 최종 사용처를 확인하지 못함';
  }

  function guideLifecyclePanel(item, compact=false) {
    const uses=guideDirectUses(item);
    const rawPaths=guideEndPaths(item);
    const recipe=item.recipe||[];
    const bases=guideBaseSources(item);
    const startLabel=recipe.length && bases.length
      ? bases.slice(0,4).map(x=>x.name).join(' · ') + (bases.length>4?` 외 ${bases.length-4}종`:'')
      : (item.acquire||'획득처 확인 필요');

    const normalizePath=(path)=>{
      let p=(path||[]).map(String).filter(Boolean);
      // 수동 경로가 "커먼/레어 등급 결정"처럼 범주명으로 적힌 경우 현재 아이템명으로 바꿔 읽기 쉽게 만든다.
      if(item.subcategory?.includes('커먼')) p=p.map(x=>x==='커먼 등급 결정'?item.name:x);
      if(item.subcategory?.includes('레어')) p=p.map(x=>x==='레어 등급 결정'?item.name:x);
      if(!p.some(x=>x===item.name)) {
        if(p.length) p=[p[0],item.name,...p.slice(1)];
        else p=[item.name];
      }
      // 자동 경로는 현재 아이템부터 시작하므로 실제 획득 시작점을 앞에 붙인다.
      if(p[0]===item.name && startLabel && startLabel!==item.name) p=[startLabel,...p];
      return p;
    };

    let paths=rawPaths.map(normalizePath);
    if(!paths.length) paths=[[startLabel,item.name,guideFinalLabel(item)].filter(Boolean)];
    // 같은 표시 경로 제거
    const seen=new Set();
    paths=paths.filter(p=>{const k=p.join('>'); if(seen.has(k)) return false; seen.add(k); return true;});

    const primary=paths[0];
    const secondary=paths.slice(1,compact?3:6);
    const stepType=(name,idx,path)=>{
      if(name===item.name) return '현재 아이템';
      if(idx===0) return '획득 / 시작';
      if(idx===path.length-1) return '최종 목적';
      return '다음 단계';
    };
    const stepNode=(name,idx,path)=>{
      const linked=guideByName(name);
      const current=name===item.name;
      const cls=`guide-journey-step${current?' current':''}${idx===path.length-1?' terminal':''}`;
      const body=linked && !current
        ? `<button type="button" data-guide-open="${esc(linked.name)}"><b>${esc(name)}</b><small>눌러서 상세 보기</small></button>`
        : `<div><b>${esc(name)}</b>${current?'<small>지금 보고 있는 아이템</small>':''}</div>`;
      return `<div class="${cls}"><em>${idx+1}</em><span>${stepType(name,idx,path)}</span>${body}</div>`;
    };
    const primaryHtml=primary.map((n,i)=>`${i?'<div class="guide-journey-arrow" aria-hidden="true">→</div>':''}${stepNode(n,i,primary)}`).join('');
    const secondaryHtml=secondary.map((path,pi)=>{
      const condensed=path.map((n,i)=>{const linked=guideByName(n); return linked?`<button type="button" data-guide-open="${esc(linked.name)}">${esc(n)}</button>`:`<span>${esc(n)}</span>`}).join('<i>→</i>');
      return `<div class="guide-route-row"><strong>경로 ${pi+2}</strong><div>${condensed}</div></div>`;
    }).join('');

    const examples=[...(item.usageExamples||[])];
    uses.slice(0,8).forEach(u=>examples.push(`${u.name}${u.qty!=null?` 제작에 ×${u.qty}`:' 제작/진행에 사용'}`));
    const exampleUniq=[...new Set(examples)].slice(0,8);

    return `<section class="guide-lifecycle ${compact?'compact':''}">
      <div class="guide-lifecycle-head"><div><span>ITEM FLOW</span><h3>어디서 얻고, 어디에 쓰는지</h3><p>같은 설명을 반복하지 않고 실제 흐름만 순서대로 정리했어.</p></div></div>
      <div class="guide-journey" role="list">${primaryHtml}</div>
      ${secondaryHtml?`<div class="guide-route-table"><div class="guide-route-title"><b>다른 사용 경로</b><span>여러 곳에 쓰이는 아이템만 표시</span></div>${secondaryHtml}</div>`:''}
      ${exampleUniq.length&&!compact?`<div class="guide-use-examples"><b>실제 사용 예시</b><div>${exampleUniq.map(x=>`<span>${esc(x)}</span>`).join('')}</div></div>`:''}
      <div class="guide-life-conclusion"><b>한줄 결론</b><p>${esc(guideFinalLabel(item))}</p></div>
      ${item.noviceTip?`<div class="guide-life-tip"><b>초뉴비 팁</b><p>${esc(item.noviceTip)}</p></div>`:''}
    </section>`;
  }

  function guideSourceLink(item) {
    if (!item?.sourceUrl) return '';
    return `<a class="guide-source-link" href="${esc(item.sourceUrl)}" target="_blank" rel="noreferrer">${esc(item.sourceLabel || '원문')} ↗</a>`;
  }

  function guideTradeLabel(action) {
    if (action === 'buy') return '구매';
    if (action === 'sell') return '판매';
    if (action === 'exchange') return '교환';
    return action || '거래';
  }

  function guideShopTable(item) {
    const rows = item?.shopEntries || [];
    if (!rows.length) return '';
    return `<section class="guide-panel guide-shop-panel"><div class="guide-panel-head"><div><span>공식 상점 정보</span><h3>돈·교환값 / 어디서 거래해?</h3></div></div>
      <div class="guide-table-wrap"><table class="guide-table guide-shop-table"><thead><tr><th>구분</th><th>가격/교환값</th><th>지역</th><th>장소</th><th>NPC</th><th>비고</th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${esc(guideTradeLabel(x.action))}</b></td><td><strong>${esc(x.value || '—')}</strong></td><td>${esc(x.region || '—')}</td><td>${esc(x.location || '—')}</td><td>${esc(x.npc || '—')}</td><td>${esc(x.note || x.category || '—')}</td></tr>`).join('')}</tbody></table></div>
      <p class="guide-panel-copy">상점 가격은 현재 사이트에 편입한 공식 상점 카탈로그 값이야. 운영 중 변경될 수 있으니 이상하면 원문 링크를 최종 기준으로 봐.</p>
    </section>`;
  }

  const noctilaWeaponTiers = {
    '루트바인 스태프':'입문','템페스트 해머':'입문','아크 블래스터':'견습','레디언트 윙보우':'정예','글레이셜 스피어':'정예','인페르널 클레이모어':'영웅','팬텀 사이드':'영웅(인피니티)'
  };

  function noctilaWeaponNames() { return Object.keys(noctilaWeaponTiers); }

  function noctilaWeaponFromQuery(q) {
    const text=String(q||'').replace(/\s+/g,'');
    return noctilaWeaponNames().find(n=>text.includes(n.replace(/\s+/g,''))) || '루트바인 스태프';
  }

  function aggregateGuideMaterials(stages) {
    const map = new Map();
    stages.forEach(s => (s.materials || []).forEach(([name,qty]) => map.set(name,(map.get(name)||0)+Number(qty||0))));
    return [...map.entries()];
  }

  function renderNoctilaWeaponEnhancement() {
    const weapon = noctilaWeaponFromQuery(state.query);
    const tier = noctilaWeaponTiers[weapon];
    const allStages = GUIDE.noctilaWeaponEnhancement?.[tier] || [];
    const target = Math.min(15, Math.max(1, Number(state.guideTarget) || 15));
    const stages = allStages.filter(x=>x.stage<=target);
    const totalGold = stages.reduce((a,x)=>a+Number(x.gold||0),0);
    const mats = aggregateGuideMaterials(stages);
    const item=guideByName(weapon);
    return `<section class="guide-answer guide-enhancement noctila-enhancement">
      <div class="guide-answer-head"><div><span class="guide-answer-type">질문 분석 · 노크틸라 무기 강화</span><h2>${esc(weapon)} 0강 → +${target}</h2><p>초뉴비 기준으로 <b>NPC 위치 → 강화 단계 → 정확한 골드 → 재료 → 재료 수급처</b>까지 한 화면에서 보게 만들었어.</p></div>
        <div class="guide-target dual"><label><span>무기</span><select id="noctilaWeaponSelect">${noctilaWeaponNames().map(n=>`<option value="${esc(n)}" ${n===weapon?'selected':''}>${esc(n)}</option>`).join('')}</select></label><label><span>목표 강화</span><select id="guideTargetStage">${Array.from({length:15},(_,i)=>`<option value="${i+1}" ${target===i+1?'selected':''}>+${i+1}</option>`).join('')}</select></label></div>
      </div>
      <div class="guide-steps"><div class="guide-step"><i>1</i><div><b>노크틸라 마을 NPC 브론</b><span>브론에게 말을 걸고 <strong>1번 → 장비 강화하기</strong>를 선택해.</span></div></div><div class="guide-step"><i>2</i><div><b>${esc(weapon)} 올리기</b><span>현재 단계에서 요구하는 골드와 재료를 준비해.</span></div></div><div class="guide-step"><i>3</i><div><b>강화 실행</b><span>공식 표 기준 노크틸라 무기 강화는 <strong>전 단계 성공률 100%</strong>야.</span></div></div><div class="guide-step"><i>4</i><div><b>스킬 해금도 확인</b><span>무기 +3/+6/+9/+12에서 스킬 슬롯 조건이 열리므로 시온의 스킬 시스템도 같이 확인해.</span></div></div></div>
      <div class="guide-summary-grid"><article><span>등급</span><strong>${esc(tier)}</strong><small>${esc(item?.subcategory||'노크틸라 무기')}</small></article><article><span>0 → +${target} 고정 골드</span><strong>${fmt(totalGold)}</strong><small>단계별 공식 골드 합계</small></article><article><span>성공률</span><strong>100%</strong><small>공식 무기 강화표 기준</small></article><article><span>외형 변화</span><strong>+3·6·9·12·14·15</strong><small>해당 강화 구간에서 변화</small></article></div>
      <section class="guide-panel wide"><div class="guide-panel-head"><div><span>필요 재료 합계</span><h3>0강부터 +${target}까지 한 번에 준비</h3></div>${guideSourceLink({sourceUrl:GUIDE.sources.noctilaWeaponEnhancement,sourceLabel:'공식 무기 강화'})}</div><div class="guide-materials">${mats.map(([n,q])=>guideItemChip(n,q)).join('')}</div><p class="guide-panel-copy">각 재료에 마우스를 올리면 획득처·사용처가 뜨고, 클릭하면 그 재료 상세로 계속 내려갈 수 있어.</p></section>
      <section class="guide-panel wide"><div class="guide-panel-head"><div><span>공식 단계표</span><h3>${esc(weapon)} · ${esc(tier)} 강화 비용</h3></div></div><div class="guide-table-wrap"><table class="guide-table"><thead><tr><th>강화</th><th>골드</th><th>필요 재료</th><th>성공률</th></tr></thead><tbody>${allStages.map(x=>`<tr class="${x.stage<=target?'selected-row':''}"><td><b>+${x.stage}</b></td><td>${fmt(x.gold)}</td><td class="table-mats">${(x.materials||[]).map(([n,q])=>`${esc(n)} ×${esc(String(q))}`).join(' · ')}</td><td><strong>${x.chance}%</strong></td></tr>`).join('')}</tbody></table></div></section>
      <div class="guide-note important"><b>참고 · 강화만 보고 끝내면 안 돼</b><span>+3/+6/+9/+12는 스킬 슬롯 해금 조건과 연결돼. 스킬 슬롯은 <strong>봉인 해방의 인장</strong>, 개별 스킬 해금은 <strong>능력 개방의 문장 + 골드</strong>, 스킬 강화는 무기 등급에 맞는 <strong>각성석</strong>이 필요해. 검색창에서 “${esc(weapon)} 스킬” 또는 재료 이름을 그대로 검색하면 이어서 볼 수 있어.</span></div>
      <div class="guide-sourcebar"><span>고정 골드·재료·성공률은 공식 노크틸라 무기 강화표 기준</span>${guideSourceLink({sourceUrl:GUIDE.sources.noctilaWeaponEnhancement,sourceLabel:'공식 원문'})}</div>
    </section>`;
  }

  function renderNoctilaAccessoryEnhancement() {
    const q = String(state.query||'');
    const tier = ['카르벤','세리온','브렉사','오브레'].find(x=>q.includes(x)) || '카르벤';
    const d = GUIDE.noctilaAccessoryEnhancement?.[tier];
    if (!d) return renderGuideHome(guideMatches(state.query,state.guideFilter));
    const rows = Array.from({length:5},(_,i)=>({stage:i+1,gold:d.gold[i],chance:d.chance[i],pity:d.pity[i]}));
    const onePassGold = rows.reduce((a,x)=>a+x.gold,0);
    return `<section class="guide-answer guide-enhancement noctila-enhancement">
      <div class="guide-answer-head"><div><span class="guide-answer-type">질문 분석 · 노크틸라 장신구 강화</span><h2>${esc(tier)} 장신구 강화</h2><p>브론에게 강화하는 방법과 +1~+5 비용, 성공률, 확정 시도, 다음 등급 승급 조건을 같이 정리했어.</p></div>${guideSourceLink({sourceUrl:GUIDE.sources.noctilaAccessoryEnhancement,sourceLabel:'공식 장신구 강화'})}</div>
      <div class="guide-steps"><div class="guide-step"><i>1</i><div><b>노크틸라 마을 NPC 브론</b><span><strong>1번 → 장비 강화하기</strong>를 선택해.</span></div></div><div class="guide-step"><i>2</i><div><b>${esc(d.stone)} 준비</b><span>등급 내 강화 1회마다 ${esc(d.stone)} ×${d.count}와 단계별 골드가 필요해.</span></div></div><div class="guide-step"><i>3</i><div><b>+5까지 강화</b><span>실패할 수 있지만 단계별 <strong>확정 강화 시도 횟수</strong>가 있어.</span></div></div>${d.next?`<div class="guide-step"><i>4</i><div><b>${esc(d.next)} 등급 승급</b><span>승급 성공률 5%, 확정 26회. ${esc(d.stone)} ×${d.upgradeStone} + 어빌리티 스톤 ×${d.upgradeAbility}가 추가로 필요해.</span></div></div>`:''}</div>
      <div class="guide-summary-grid"><article><span>등급 내 최소 골드</span><strong>${fmt(onePassGold)}</strong><small>각 단계 1회 성공 가정</small></article><article><span>1회 강화 재료</span><strong>${esc(d.stone)} ×${d.count}</strong><small>+1~+5 공통</small></article><article><span>강화 성공률</span><strong>90 → 10%</strong><small>+1부터 +5 순서</small></article><article><span>승급</span><strong>${d.next?'5% · 확정 26회':'최종 등급'}</strong><small>${d.next?`${tier} → ${d.next}`:'오브레 +5까지'}</small></article></div>
      <section class="guide-panel wide"><div class="guide-panel-head"><div><span>공식 단계표</span><h3>${esc(tier)} +1 ~ +5</h3></div></div><div class="guide-table-wrap"><table class="guide-table"><thead><tr><th>목표</th><th>수호석</th><th>골드</th><th>성공률</th><th>확정 강화</th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>+${x.stage}</b></td><td>${guideItemChip(d.stone,d.count)}</td><td>${fmt(x.gold)}</td><td><strong class="chance ${x.chance<=10?'low':''}">${x.chance}%</strong></td><td>${x.pity}회</td></tr>`).join('')}</tbody></table></div></section>
      ${d.next?`<div class="guide-note important"><b>+5 다음 등급 승급</b><span><strong>${esc(tier)} → ${esc(d.next)}</strong>: 성공률 5%, 확정 26회. ${guideItemChip(d.stone,d.upgradeStone)} ${guideItemChip('어빌리티 스톤',d.upgradeAbility)}가 필요해. 승급 실패/소모 규칙은 공식 원문을 최종 기준으로 확인해.</span></div>`:''}
      <div class="guide-sourcebar"><span>장신구 강화 비용·확률·확정 횟수는 공식 위키 기준</span>${guideSourceLink({sourceUrl:GUIDE.sources.noctilaAccessoryEnhancement,sourceLabel:'공식 원문'})}</div>
    </section>`;
  }

  function guideHoverCard(item) {
    if (!item) return '';
    const recipe = (item.recipe || []).slice(0,5).map(([n,q])=>`${n} ×${q}`).join(' · ');
    return `<div class="hover-card"><strong>${esc(item.name)}</strong><span>${esc(item.region)} · ${esc(item.category)}</span><p><b>획득</b> ${esc(item.acquire || '미확인')}</p><p><b>사용</b> ${esc(item.use || '미확인')}</p>${recipe ? `<p><b>재료</b> ${esc(recipe)}${item.recipe.length>5?' 외':''}</p>`:''}</div>`;
  }

  function guideItemChip(name, qty = null) {
    const item = guideByName(name);
    const q = qty == null ? '' : `<em>×${esc(String(qty))}</em>`;
    if (!item) return `<span class="guide-mat plain"><b>${esc(name)}</b>${q}</span>`;
    return `<button type="button" class="guide-mat" data-tip data-guide-item="${esc(item.name)}"><b>${esc(item.name)}</b>${q}${guideHoverCard(item)}</button>`;
  }

  function enhancementTotals(target, expected = false) {
    const out = {low:0,mid:0,high:0,gold:0,ruby:0};
    for (const s of GUIDE.enhancement.filter(x => x.stage <= target)) {
      const mul = expected ? 100 / Math.max(1,s.chance) : 1;
      out.low += s.low * mul; out.mid += s.mid * mul; out.high += s.high * mul;
      out.gold += s.gold * mul; out.ruby += s.ruby * mul;
    }
    return out;
  }

  function stoneRawTotals(t) {
    return [
      ['조약돌', t.low * 128], ['구리 블록', t.low * 8 + t.high * 30], ['레드스톤 블록', t.low * 3], ['코룸 주괴', t.low],
      ['심층암 조약돌', t.mid * 128], ['청금석 블록', t.mid * 5], ['철 블록', t.mid * 5 + t.high * 7], ['다이아몬드 블록', t.mid * 3 + t.high * 5], ['리프톤 주괴', t.mid * 2],
      ['자수정 블록', t.high * 20], ['금 블록', t.high * 7], ['세렌트 주괴', t.high * 3]
    ].filter(([,n]) => n > 0);
  }

  function num1(n) {
    if (!Number.isFinite(n)) return '—';
    return Math.abs(n-Math.round(n)) < .001 ? Math.round(n).toLocaleString('ko-KR') : n.toLocaleString('ko-KR',{maximumFractionDigits:1});
  }

  function renderGuideEnhancement() {
    const target = state.guideTarget;
    const min = enhancementTotals(target,false);
    const exp = enhancementTotals(target,true);
    const raw = stoneRawTotals(min);
    const stages = GUIDE.enhancement.filter(x=>x.stage<=target);
    const stats = GUIDE.sagePickaxeStats.filter(x=>x.stage<=target);
    return `<section class="guide-answer guide-enhancement">
      <div class="guide-answer-head"><div><span class="guide-answer-type">질문 분석 · 도구 강화</span><h2>세이지 곡괭이 강화, 처음부터 ${target}강까지</h2><p>초뉴비 기준으로 <b>어디로 가는지 → 뭘 넣는지 → 단계별 돈/재료/확률 → 라이프스톤 제작 → 곡괭이 성능</b> 순서로 정리했어.</p></div><div class="guide-target"><span>목표 강화</span><select id="guideTargetStage">${Array.from({length:15},(_,i)=>`<option value="${i+1}" ${target===i+1?'selected':''}>+${i+1}</option>`).join('')}</select></div></div>
      <div class="guide-steps">
        <div class="guide-step"><i>1</i><div><b>세레니티 마을로 이동</b><span>NPC <strong>로니</strong>를 찾는다.</span></div></div>
        <div class="guide-step"><i>2</i><div><b>로니에게 말 걸기</b><span><strong>2번 → 강화하기</strong>를 선택한다.</span></div></div>
        <div class="guide-step"><i>3</i><div><b>도구 + 강화 재료 올리기</b><span>현재 단계에 필요한 라이프스톤·골드·루비를 준비한다.</span></div></div>
        <div class="guide-step"><i>4</i><div><b>강화 실행</b><span>도구를 사용하거나 강화하면 해당 플레이어에게 <strong>귀속</strong>된다.</span></div></div>
      </div>
      <div class="guide-note important"><b>참고 · 단계가 올라가면 재료 종류가 추가돼</b><span><strong>+1~3:</strong> 하급만 · <strong>+4~5:</strong> 하급+중급 · <strong>+6부터:</strong> 하급+중급+상급 · <strong>+7부터:</strong> 루비까지 필요. 하급은 3강 이후에 사라지는 게 아니라 고강화에서도 계속 같이 들어가.</span></div>
      <div class="guide-summary-grid">
        <article><span>최소 고정 골드</span><strong>${fmt(min.gold)}</strong><small>모든 단계 1회 성공 기준</small></article>
        <article><span>최소 라이프스톤</span><strong>${num1(min.low)} / ${num1(min.mid)} / ${num1(min.high)}</strong><small>하급 / 중급 / 상급</small></article>
        <article><span>최소 루비</span><strong>${num1(min.ruby)}개</strong><small>+7 이후 단계 합계</small></article>
        <article class="expected"><span>단순 확률 기대 골드*</span><strong>${fmt(Math.round(exp.gold))}</strong><small>성공확률 역수로 계산</small></article>
      </div>
      <div class="guide-note caution"><b>* 기대값 계산 주의</b><span>공식 강화표의 성공 확률을 이용해 단계별 평균 시도 횟수를 <code>1 ÷ 성공확률</code>로 단순 계산한 값이야. <strong>실패 시 단계 유지 + 해당 1회 비용/재료가 소모된다는 가정</strong>이 들어가며, 공식 문서에서 실패 패널티가 별도로 명시되지 않은 경우 실제 체감 비용과 달라질 수 있어. 아래의 “최소 비용” 표는 공식 수치를 그대로 사용해.</span></div>
      <div class="guide-two-col">
        <section class="guide-panel"><div class="guide-panel-head"><div><span>강화석 제작</span><h3>라이프스톤은 이렇게 만든다</h3></div></div>
          ${['하급 라이프스톤','중급 라이프스톤','상급 라이프스톤'].map(n=>{const it=guideByName(n);return `<div class="guide-recipe-card"><div><b>${esc(n)}</b><small>${esc(it?.note||'')}</small></div><div class="guide-materials">${(it?.recipe||[]).map(([x,q])=>guideItemChip(x,q)).join('')}</div></div>`}).join('')}
        </section>
        <section class="guide-panel"><div class="guide-panel-head"><div><span>0 → +${target}</span><h3>최소 라이프스톤 제작 원재료</h3></div></div><p class="guide-panel-copy">강화석을 전부 직접 제작하고, 각 강화가 한 번에 성공한다고 가정했을 때의 원재료 환산이야.</p><div class="guide-materials dense">${raw.map(([n,q])=>guideItemChip(n,q)).join('')}</div></section>
      </div>
      <section class="guide-panel wide"><div class="guide-panel-head"><div><span>OFFICIAL ENHANCEMENT TABLE</span><h3>단계별 강화 비용 · 재료 · 성공률</h3></div>${guideSourceLink({sourceUrl:GUIDE.sources.enhancement,sourceLabel:'공식 강화표'})}</div>
        <div class="guide-table-wrap"><table class="guide-table"><thead><tr><th>목표</th><th>하급</th><th>중급</th><th>상급</th><th>골드</th><th>루비</th><th>성공률</th></tr></thead><tbody>${stages.map(x=>`<tr><td><b>+${x.stage}</b></td><td>${x.low}</td><td>${x.mid||'—'}</td><td>${x.high||'—'}</td><td>${fmt(x.gold)}</td><td>${x.ruby||'—'}</td><td><strong class="chance ${x.chance<=5?'low':''}">${x.chance}%</strong></td></tr>`).join('')}</tbody></table></div>
      </section>
      <section class="guide-panel wide"><div class="guide-panel-head"><div><span>SAGE PICKAXE</span><h3>그래서 강화하면 뭐가 좋아져?</h3></div>${guideSourceLink({sourceUrl:GUIDE.sources.sagePickaxe,sourceLabel:'공식 세이지 곡괭이'})}</div>
        <p class="guide-panel-copy">세이지 곡괭이는 채광 1회당 스태미나 10을 사용해. 아래는 ${target}강까지 공식 강화 성능표야.</p>
        <div class="guide-table-wrap"><table class="guide-table stats"><thead><tr><th>강화</th><th>채광력</th><th>채광속도</th><th>광물 드롭</th><th>유물%</th><th>코비%</th><th>광채 속도%</th><th>광채 확률%</th><th>경험치</th></tr></thead><tbody>${stats.map(x=>`<tr><td><b>+${x.stage}</b></td><td>${x.power}</td><td>${x.speed}</td><td>${x.drops}</td><td>${x.relic}</td><td>${x.kobi}</td><td>${x.glowSpeed==null?'—':x.glowSpeed}</td><td>${x.glowChance==null?'—':x.glowChance}</td><td>${x.xp}</td></tr>`).join('')}</tbody></table></div>
      </section>
      <div class="guide-note"><b>돈 계산 범위</b><span>위 골드는 <strong>강화창에서 직접 요구하는 고정 골드</strong>야. 라이프스톤 원재료를 다른 유저에게 구매할 때 드는 시세 비용은 서버 시장가가 고정값이 아니므로 임의로 만들지 않았어. 대신 필요한 강화석/원재료 수량은 전부 계산해서 바로 비교할 수 있게 했어.</span></div>
    </section>`;
  }

  function renderGuideItemAnswer(item) {
    const recipe = item.recipe || [];
    return `<section class="guide-answer">
      <div class="guide-answer-head item"><div class="guide-answer-item-title">${hasGuideIcon(item)?`<div class="guide-answer-item-icon">${guideIconHTML(item)}</div>`:''}<div><span class="guide-answer-type">검색 답변 · ${esc(item.region)} / ${esc(item.category)}</span><h2>${esc(item.name)}</h2><p>${esc(item.use || '세부 사용처 확인 필요')}</p>${item.resourceId?`<code class="guide-rid">${esc(item.resourceId)}</code>`:''}</div></div>${guideSourceLink(item)}</div>
      ${guideLifecyclePanel(item,true)}
      ${item.probability ? `<div class="guide-inline-fact"><span>확률/조건</span><b>${esc(item.probability)}</b></div>`:''}
      ${item.trade ? `<div class="guide-inline-fact"><span>거래/가격</span><b>${esc(item.trade)}</b></div>`:''}
      <div class="guide-info-grid">
        <article><span>이게 뭐고, 어디서 구해?</span><p>${esc(item.acquire || '공식 문서에서 세부 획득처를 확인하지 못했어.')}</p></article>
        <article><span>어디에 써?</span><p>${esc(item.use || '공식 문서에서 세부 사용처를 확인하지 못했어.')}</p></article>
      </div>
      ${guideShopTable(item)}
      ${recipe.length ? `<section class="guide-panel recipe-main"><div class="guide-panel-head"><div><span>필요 재료</span><h3>${esc(item.name)} 제작 재료</h3></div></div><div class="guide-materials">${recipe.map(([n,q])=>guideItemChip(n,q)).join('')}</div><p class="guide-panel-copy">재료에 마우스를 올리면 수급처가 뜨고, 클릭하면 그 재료의 획득법·사용처·하위 재료까지 이어서 볼 수 있어.</p></section>`:''}
      ${item.note ? `<div class="guide-note important"><b>참고 / 꼭 알아둘 것</b><span>${esc(item.note)}</span></div>`:''}
      ${(item.related||[]).length ? `<div class="guide-related"><span>같이 보면 좋은 항목</span><div>${item.related.map(n=>guideItemChip(n)).join('')}</div></div>`:''}
      <div class="guide-sourcebar"><span>${item.official === false ? '기본 게임/참고 정보 · 서버 전용 규칙이 있으면 공식 공지가 우선' : `공식 자료 기준 · 확인 ${esc(item.verified||GUIDE.meta.verified||'')}`}</span>${guideSourceLink(item)}</div>
    </section>`;
  }

  function guideCard(item) {
    const recipe = (item.recipe || []).slice(0,3);
    const sourceBadge = item.resourceId ? (item.resourceVerified ? '공식명+RP' : 'RESOURCE PACK') : (item.official===false ? '참고' : '공식');
    const icon = guideIconHTML(item, 'guide-card-icon-img');
    const rid = item.resourceId ? `<span class="guide-resource-id">${esc(item.resourceId)}</span>` : '';
    const endpoint=guideFinalLabel(item);
    return `<article class="guide-card" data-guide-open="${esc(item.name)}"><div class="guide-card-main"><div class="guide-card-icon ${hasGuideIcon(item)?'':'missing'}">${icon}<span class="guide-icon-placeholder">이미지<br>미확인</span></div><div class="guide-card-copy"><div class="guide-card-top"><span>${esc(item.region)}</span><em>${esc(item.category)}</em></div><h3>${esc(item.name)}</h3>${rid}<p>${esc(item.use || item.acquire || '세부 정보 확인 필요')}</p></div></div>${recipe.length?`<div class="guide-card-recipe">${recipe.map(([n,q])=>`<span>${esc(n)} ×${esc(String(q))}</span>`).join('')}</div>`:''}<div class="guide-card-flow"><span>결국 어디에 써?</span><b>${esc(endpoint)}</b></div><div class="guide-card-bottom"><span class="guide-data-badge ${item.resourceId?'rp':''}">${sourceBadge}</span><button type="button">상세 보기 <svg><use href="#i-arrow"/></svg></button></div></article>`;
  }

  function guidePagination(totalPages,current){
    if(totalPages<=1) return '';
    const nums=[];
    const from=Math.max(1,Math.min(current-2,totalPages-4));
    const to=Math.min(totalPages,from+4);
    for(let i=from;i<=to;i++) nums.push(`<button class="${i===current?'active':''}" data-guide-page="${i}">${i}</button>`);
    return `<nav class="guide-pagination" aria-label="아이템 페이지"><button data-guide-page="1" ${current===1?'disabled':''}>«</button><button data-guide-page="${Math.max(1,current-1)}" ${current===1?'disabled':''}>이전</button>${from>1?'<span>…</span>':''}${nums.join('')}${to<totalPages?'<span>…</span>':''}<button data-guide-page="${Math.min(totalPages,current+1)}" ${current===totalPages?'disabled':''}>다음</button><button data-guide-page="${totalPages}" ${current===totalPages?'disabled':''}>»</button></nav>`;
  }

  function renderGuideHome(matches) {
    const q = state.query.trim();
    const pageSize = Number(state.guidePageSize)||48;
    const totalPages = Math.max(1,Math.ceil(matches.length/pageSize));
    state.guidePage = Math.min(totalPages,Math.max(1,Number(state.guidePage)||1));
    const start=(state.guidePage-1)*pageSize;
    const visible = matches.slice(start,start+pageSize).map(x=>guideCard(x.item)).join('');
    const exactish = q ? matches.filter(x=>x.score>=100).slice(0,4) : [];
    const itemAnswer = exactish.length ? renderGuideItemAnswer(exactish[0].item) : '';
    const rpCount = GUIDE.meta?.resourceModelCount || 0;
    return `${itemAnswer}<section class="guide-catalog-section"><div class="section-head guide-catalog-head"><div><h2>${q ? '관련 아이템·시스템' : '서버 아이템 백과'}</h2><p>${q ? `검색어 “${esc(q)}”와 관련도가 높은 순서야.` : `검색하지 않아도 전체 목록을 페이지로 넘겨 볼 수 있어. 리소스팩 260930 루트 아이템 모델 ${Number(rpCount).toLocaleString('ko-KR')}개를 전수 인덱싱했어.`}</p></div><div class="guide-count-stack"><b>${matches.length.toLocaleString('ko-KR')}개</b><span>${state.guidePage} / ${totalPages} 페이지</span></div></div><div class="guide-catalog">${visible || '<div class="card empty"><strong>검색 결과가 없어.</strong>띄어쓰기를 바꾸거나 아이템 이름 일부만 입력해봐.</div>'}</div>${guidePagination(totalPages,state.guidePage)}</section>`;
  }

  function shouldShowEnhancement(q) {
    const t = String(q || '').replace(/\s+/g,'').toLowerCase();
    return !!t && /강화/.test(t) && /(세이지|곡괭이|괭이|낚싯대|대검|도구|라이프스톤|라이프스톤)/.test(t);
  }

  function renderReference() {
    const root = $('#page-reference');
    if (!root) return;
    const q = state.query.trim();
    const filters = [['all','전체'],['images','이미지 있음'],['missing-images','이미지 미확인'],['official','공식 설명'],['resource','리소스팩 전체'],['general','일반/공통'],['wild','야생'],['serenity','세레니티'],['lumidia','루미디아'],['noctila','노크틸라'],['paradise','파라다이스'],['badge','뱃지'],['odds','확률·장식']];
    const matches = guideMatches(q,state.guideFilter);
    const compactQ = q.replace(/\s+/g,'');
    const isNoctilaWeaponEnhance = /강화/.test(compactQ) && (/노크틸라무기/.test(compactQ) || noctilaWeaponNames().some(n=>compactQ.includes(n.replace(/\s+/g,''))));
    const isAccessoryEnhance = /강화/.test(compactQ) && (/장신구/.test(compactQ) || ['카르벤','세리온','브렉사','오브레'].some(n=>compactQ.includes(n)));
    let answer;
    if (shouldShowEnhancement(q)) answer = renderGuideEnhancement();
    else if (isNoctilaWeaponEnhance) answer = renderNoctilaWeaponEnhancement();
    else if (isAccessoryEnhance) answer = renderNoctilaAccessoryEnhancement();
    else answer = renderGuideHome(matches);
    const examples=['세이지 곡괭이 강화하려면?','하급 라이프스톤 어디서 구해?','카르세나의 룬이 뭐야?','루트바인 스태프 강화','좌표 스크롤 어디서 사?','중급 라이프스톤 재료'];
    root.innerHTML = `<div class="content-shell guide-shell">
      <section class="guide-hero">
        <div class="guide-hero-copy"><span class="eyebrow">NEWBIE SERVER ENCYCLOPEDIA</span><h2>몰라도 돼. <b>그냥 하고 싶은 걸 물어봐.</b></h2><p>요리·채집이 메인인 개인DB는 그대로 두고, 서버에서 처음 보는 아이템의 획득처뿐 아니라 <b>왜 모으는지, 다음에 뭘 만드는지, 최종적으로 어디까지 이어지는지</b>까지 따라가게 정리했어. 현재 통합 인덱스 <strong>${GUIDE.items.length.toLocaleString('ko-KR')}개</strong> · 리소스팩 모델 <strong>${Number(GUIDE.meta?.resourceModelCount||0).toLocaleString('ko-KR')}개 전수 확인</strong>.</p></div>
        <div class="guide-searchbox"><svg><use href="#i-search"/></svg><input id="guideSearchInput" value="${esc(q)}" placeholder="예: 세이지 곡괭이 강화하려면 어떻게 해야해?" autocomplete="off"><button id="guideRunSearch" class="btn primary">찾기</button></div>
        <div class="guide-examples"><span>바로 질문</span>${examples.map(x=>`<button data-guide-example="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      </section>
      <div class="guide-quality-strip"><div><b>초뉴비용</b><span>“이게 뭐야?”부터 설명</span></div><div><b>리소스팩 전수</b><span>${Number(GUIDE.meta?.resourceModelCount||0).toLocaleString('ko-KR')}개 모델 + 아이콘</span></div><div><b>시작→끝 추적</b><span>원재료 → 중간재 → 최종 사용처</span></div><div><b>${GUIDE.items.length.toLocaleString('ko-KR')}개 통합</b><span>공식 설명 + 리소스팩 식별 항목</span></div></div>
      <div class="guide-filterbar">${filters.map(([k,l])=>`<button class="${state.guideFilter===k?'active':''}" data-guide-filter="${k}">${l}</button>`).join('')}</div>
      ${answer}
      <p class="source-note guide-footnote">기준: 띵타이쿤 공식 위키의 아이템/상점/제작/강화 자료 + 사용자가 제공한 2026-09-30 서버 리소스팩(assets/minecraft/models 루트 모델 전수) + 현재 사이트 요리/채집 DB. 공식 문서에 사용처가 적혀 있지 않은 항목은 지어내지 않고 “미확인/세부 설명 없음”으로 남겼어. 이벤트·확률표·상점은 운영 중 변경될 수 있으니 각 항목의 원문 링크가 최종 기준이야.</p>
    </div>`;
  }

  function openGuideItemDrawer(item) {
    if (!item) return;
    const recipe = item.recipe || [];
    $('#detailDrawer').innerHTML = `<div class="drawer-inner guide-drawer"><button class="drawer-close" aria-label="닫기">×</button><div class="guide-drawer-hero with-icon">${hasGuideIcon(item)?`<div class="guide-drawer-icon">${guideIconHTML(item)}</div>`:''}<div><span>${esc(item.region)} · ${esc(item.category)}</span><h2>${esc(item.name)}</h2><p>${esc(item.subcategory || '서버 아이템')}</p>${item.resourceId?`<code class="guide-rid">${esc(item.resourceId)}</code>`:''}</div></div>
      ${guideLifecyclePanel(item,false)}
      ${item.probability?`<div class="drawer-section"><h3>확률 / 조건</h3><div class="drawer-text"><b>${esc(item.probability)}</b></div></div>`:''}
      ${item.trade?`<div class="drawer-section"><h3>거래 / 가격</h3><div class="drawer-text"><b>${esc(item.trade)}</b></div></div>`:''}
      <div class="drawer-section"><h3>이게 뭐고, 어디서 구해?</h3><div class="drawer-text">${esc(item.acquire || '세부 획득처 미확인')}</div></div>
      <div class="drawer-section"><h3>뭐에 써?</h3><div class="drawer-text">${esc(item.use || '세부 사용처 미확인')}</div></div>
      ${guideShopTable(item)}
      ${recipe.length?`<div class="drawer-section"><h3>필요 재료</h3><div class="guide-materials drawer-materials">${recipe.map(([n,q])=>guideItemChip(n,q)).join('')}</div><div class="drawer-text guide-drawer-help">재료를 클릭하면 그 재료의 수급처와 하위 재료로 계속 내려갈 수 있어.</div></div>`:''}
      ${item.iconSourceUrl?`<div class="drawer-section"><h3>아이템 이미지</h3><div class="drawer-text">공식 위키의 이미지와 이름표를 연결했습니다. <a href="${esc(item.iconSourceUrl)}" target="_blank" rel="noopener noreferrer">이미지 출처 확인</a></div></div>`:''}
      ${item.resourceId?`<div class="drawer-section"><h3>리소스팩 확인</h3><div class="drawer-text"><b>모델 ID:</b> ${esc(item.resourceId)}<br><b>텍스처:</b> ${esc(item.resourceTexture||'—')}<br>${item.resourceVerified?'공식/사이트 표시명과 리소스팩 모델을 연결한 항목이야.':'리소스팩에 모델은 존재하지만 서버 표시명은 리소스팩만으로 확정할 수 없어. 획득처·사용처는 확인 자료가 없으면 추측하지 않아.'}</div></div>`:''}${item.note?`<div class="drawer-section"><h3>참고 / 주의</h3><div class="drawer-text">${esc(item.note)}</div></div>`:''}
      ${(item.related||[]).length?`<div class="drawer-section"><h3>관련 항목</h3><div class="guide-materials drawer-materials">${item.related.map(n=>guideItemChip(n)).join('')}</div></div>`:''}
      <div class="drawer-section"><h3>자료 상태</h3><div class="drawer-text">${item.official===false?'기본 게임/참고 데이터. 서버 전용 규칙이 있으면 공식 서버 자료가 우선이야.':'공식 위키 기반 데이터.'}<br>${guideSourceLink(item)}</div></div></div>`;
    $('#drawerBackdrop').hidden = false;
    $('#detailDrawer').classList.add('open');
    $('#detailDrawer').setAttribute('aria-hidden','false');
  }

  function renderPrices() {
    const rows = D.foods.flatMap(f => [[f,false],[f,true]]).filter(([f,g]) => getPrice(f,g));
    const freshness = priceFreshState();
    const candidate = freshness.candidate;
    const published = freshness.published;
    $('#page-prices').innerHTML = `<div class="content-shell">
      <div class="connect-hero">
        <div class="card connect-box"><p class="eyebrow">CLOUD PRICE FEED</p><h2>파일 선택 없이 자동 연동</h2><p>모드가 밀키의 요리 판매 상점을 읽으면 현재 가격 주기의 후보값을 Cloudflare에 한 번 보낸다. 사이트 가격은 사용자가 직접 [최신 가격 업데이트]를 누를 때만 바뀐다.</p><div class="connect-actions"><button id="refreshCloudBtn" class="btn">Cloudflare 새로 확인</button><button id="publishLatestBtn3" class="btn primary">최신 가격 업데이트</button></div><div class="steps"><div class="step">모드가 설치된 PC에서 Minecraft 실행</div><div class="step">밀키 → 요리 판매 상점을 한 번 열기</div><div class="step">새 가격 주기 최초 확인값이 candidate로 전송</div><div class="step">사이트에서 최신 가격 업데이트를 눌러 확정</div></div></div>
        <div class="card connect-box"><p class="eyebrow">SYNC STATUS</p><h2>${freshness.publishedFresh ? '현재 주기 확인 완료' : '가격 확인 필요'}</h2><div class="cloud-status-list"><div><span>현재 가격 주기</span><b>${esc(freshness.cycle.cycleKey.replace('T03:00:00+09:00',' · 03:00'))}</b></div><div><span>모드 후보 확인</span><b>${candidate ? fmtKst(candidate.capturedAt) : '없음'}</b></div><div><span>사이트 최종 확정</span><b>${published ? fmtKst(published.capturedAt) : '없음'}</b></div><div><span>수집 항목</span><b>${published?.itemCount ?? rows.length} / 30</b></div></div>${state.cloudError ? `<p class="cloud-error">${esc(state.cloudError)}</p>` : ''}</div>
      </div>
      <section class="section"><div class="section-head"><div><h2>현재 사이트 확정 가격</h2><p>${published ? `Minecraft 실제 확인 ${fmtKst(published.capturedAt)}` : '아직 Cloudflare에 확정된 가격이 없어.'}</p></div><div class="status-row"><span class="status-dot ${freshness.publishedFresh ? 'on' : ''}"></span>${freshness.publishedFresh ? '최신 주기' : rows.length ? '이전 주기' : '대기'}</div></div>
      <div class="card price-panel">${rows.length ? `<div class="price-table-wrap"><table class="price-table"><thead><tr><th>음식</th><th>기준 판매가</th><th>나의 판매가</th><th>범위 내 위치</th></tr></thead><tbody>${rows.map(([f,g]) => {
        const p = getPrice(f,g), pct = normalizedPrice(f,g), percent = pct == null ? null : Math.round(pct * 100);
        return `<tr><td>${g ? '황금 · ' : ''}${esc(g ? f.gold.name : f.name)}</td><td>${fmt(p.marketPrice)}</td><td><b>${fmt(p.myPrice ?? p.marketPrice)}</b></td><td>${percent == null ? '—' : `<div class="price-position"><div class="mini-progress"><span style="width:${percent}%"></span></div>${percent}%</div>`}</td></tr>`;
      }).join('')}</tbody></table></div>` : `<div class="empty"><strong>확정 가격 데이터가 없어.</strong>모드에서 밀키 상점을 확인한 뒤 최신 가격 업데이트를 눌러줘.</div>`}</div></section>
      <div class="note-strip" style="margin-top:14px">가격 변동 공식 일정: 매월 <b>1·3·6·9·12·15·18·21·24·27·30일 오전 3시</b>. 사이트는 그 시간이 지나면 자동으로 업데이트 필요 상태로 바뀐다.</div>
    </div>`;
  }

  function openDrawer(food, gold = false) {
    const name = gold ? food.gold.name : food.name;
    const image = gold ? food.goldImage : food.image;
    const g = gold ? food.gold.grade : food.grade;
    const recipe = gold ? food.gold.bulk.recipe : food.recipe;
    const [min,max] = rangeFor(food,gold);
    const p = getPrice(food,gold);
    const crops = [...foodCrops(food)].map(cropName);
    const miss = missingCrops(food).map(cropName);
    const unitNpcCost = !gold ? npcCashCostFood(food) : 0;
    $('#detailDrawer').innerHTML = `<div class="drawer-inner"><button class="drawer-close" aria-label="닫기">×</button><div class="drawer-hero"><div class="pixel-wrap"><img class="pixel" src="${image}" alt=""></div><div><span class="grade ${gold ? 'GOLD' : food.grade}">${esc(gradeText(g))}</span><h2>${esc(name)}</h2><div class="muted" style="font-size:10px">판매 범위 ${fmt(min)} — ${fmt(max)}</div></div></div>
      <div class="drawer-section"><h3>${gold ? '황금 제작법 · 대량' : '레시피'}</h3><div class="recipe-list">${recipe.map(([id,n]) => {
        const ing = resolveIngredient(id);
        return `<div class="recipe-line">${iconHTML(ing)}<div><div class="rname">${esc(ing.name)}</div><div class="rsource">${esc(ing.source)}</div></div><div class="qty">×${n}</div></div>`;
      }).join('')}</div></div>
      ${gold ? `<div class="drawer-section"><h3>황금 제작법 · 소량</h3><div class="recipe-list">${food.gold.single.recipe.map(([id,n]) => {
        const ing = resolveIngredient(id);
        return `<div class="recipe-line">${iconHTML(ing)}<div><div class="rname">${esc(ing.name)}</div><div class="rsource">${esc(ing.source)}</div></div><div class="qty">×${n}</div></div>`;
      }).join('')}</div></div>` : ''}
      ${!gold ? `<div class="drawer-section"><h3>내 농장 관점</h3><div class="drawer-text">필요 농작물 · ${crops.length ? esc(crops.join(', ')) : '없음'}<br>${miss.length ? `아직 없는 작물 · <b>${esc(miss.join(', '))}</b>` : '<b>농작물 조건은 모두 충족했어.</b>'}</div></div>
      <div class="drawer-section"><h3>NPC 구매비</h3><div class="npc-unit-cost"><span>1개 제작 기준</span><strong>${fmt(unitNpcCost)}</strong></div><div class="drawer-text">직접 수급하는 농작물·과일·고기 가치는 제외하고, 밀키에게 실제 골드를 주고 사는 식재료만 합산해.</div></div>
      <div class="drawer-section craft-planner"><div class="craft-planner-head"><div><h3>제작 수량 계산</h3><p>만들 수량을 입력하면 NPC에서 사야 할 재료와 총 비용을 자동 계산해.</p></div><div class="craft-planner-total"><span>예상 총 비용</span><b id="craftPlannerTotal">${fmt(unitNpcCost)}</b></div></div>
        <label class="craft-qty-field"><span>만들 음식 수량</span><div><input class="craft-qty-input" data-craft-food="${food.slug}" type="number" inputmode="numeric" min="1" step="1" value="1"><em>개</em></div></label>
        <div class="craft-preset-row"><button data-craft-preset="1" data-craft-food="${food.slug}">1개</button><button data-craft-preset="10" data-craft-food="${food.slug}">10개</button><button data-craft-preset="64" data-craft-food="${food.slug}">1세트</button><button data-craft-preset="640" data-craft-food="${food.slug}">10세트</button></div>
        <div id="npcPurchasePlanner">${npcPurchasePlannerHtml(food,1)}</div>
        <div class="npc-plan-note">세트 환산은 <b>1세트 = 64개</b>. 현재 인벤토리 보유량은 차감하지 않은 ‘처음부터 전부 구매’ 기준이야.</div>
      </div>` : ''}
      <div class="drawer-section"><h3>현재 가격</h3><div class="drawer-text">${p ? `기준 ${fmt(p.marketPrice)} · 나의 판매가 <b>${fmt(p.myPrice ?? p.marketPrice)}</b>` : '가격 파일에서 아직 이 음식 값을 읽지 못했어.'}</div>${p?.history?.length ? `<div class="mini-list" style="margin-top:10px">${p.history.map((h,i) => `<div class="mini-row"><span>${esc(historyLabel(h,i))}</span><b>${fmt(h.price)}</b></div>`).join('')}</div>` : ''}</div>
      <p class="source-note">완성 요리 레시피·밀키 구매가는 공식 위키와 대조. 버터 조각은 2026-10-03 인게임 확인값(요리용 우유 ×8 + 오일 ×4)을 우선 반영.</p></div>`;
    $('#drawerBackdrop').hidden = false;
    $('#detailDrawer').classList.add('open');
    $('#detailDrawer').setAttribute('aria-hidden','false');
  }

  function closeDrawer() {
    $('#detailDrawer').classList.remove('open');
    $('#detailDrawer').setAttribute('aria-hidden','true');
    setTimeout(() => $('#drawerBackdrop').hidden = true, 220);
  }

  function renderAll() {
    renderDashboard();
    renderCooking();
    renderFarm();
    renderProfit();
    renderIngredients();
    renderFinder();
    renderReference();
    renderPrices();
    syncPriceStatus();
  }

  function renderCurrent() {
    if (state.page === 'dashboard') renderDashboard();
    if (state.page === 'cooking') renderCooking();
    if (state.page === 'farm') renderFarm();
    if (state.page === 'profit') renderProfit();
    if (state.page === 'ingredients') renderIngredients();
    if (state.page === 'finder') renderFinder();
    if (state.page === 'reference') renderReference();
    if (state.page === 'prices') renderPrices();
  }

  function switchPage(page) {
    state.page = page;
    $$('.page').forEach(x => x.classList.remove('active'));
    $(`#page-${page}`).classList.add('active');
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    $('#pageEyebrow').textContent = pages[page][0];
    $('#pageTitle').textContent = pages[page][1];
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function syncPriceStatus() {
    const count = Object.keys(state.prices).length;
    const freshness = priceFreshState();
    $('#sidePriceStatus').textContent = freshness.publishedFresh ? `최신 · ${count}개` : count ? '업데이트 필요' : '가격 대기';
    $('#sidePriceDot').classList.toggle('on', !!freshness.publishedFresh);
    $('#sidePriceUpdated').textContent = freshness.published ? `최종 확인 ${fmtKst(freshness.published.capturedAt,false)}` : 'Cloudflare 확정 가격을 기다리는 중.';
    const quick = $('#quickConnect');
    if (quick) quick.innerHTML = `<span class="connect-indicator" style="background:${freshness.publishedFresh ? '#78d19b' : '#d6a85c'}"></span>${freshness.publishedFresh ? '가격 최신' : '최신 가격 확인'}`;
  }

  function normalizePriceData(obj, meta = {}) {
    const src = obj?.prices || obj || {};
    const out = {};
    for (const [name,val] of Object.entries(src)) {
      if (typeof val === 'number') out[name] = {marketPrice:val, myPrice:val, history:[]};
      else if (val && typeof val === 'object') out[name] = {
        marketPrice:num(val.marketPrice ?? val.price ?? val.current),
        myPrice:num(val.myPrice ?? val.personalPrice ?? val.marketPrice ?? val.price ?? val.current),
        marketDelta:num(val.marketDelta),
        history:Array.isArray(val.history) ? val.history : [],
      };
    }
    return {prices:out, meta:{...meta, updatedAt:meta.capturedAt || obj?.updatedAt || obj?.generatedAt || new Date().toISOString(), source:'cloudflare'}};
  }

  function num(v) {
    if (v == null || v === '') return null;
    const n = Number(String(v).replace(/,/g,''));
    return Number.isFinite(n) ? n : null;
  }

  async function apiJson(path, options = {}) {
    const res = await fetch(`${PRICE_API}${path}`, {cache:'no-store', ...options, headers:{'Content-Type':'application/json', ...(options.headers||{})}});
    let body = null;
    try { body = await res.json(); } catch (_) {}
    if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
    return body;
  }

  function applyPublishedSnapshot(snapshot) {
    if (!snapshot?.prices) { state.prices={}; state.priceMeta=null; return; }
    const n = normalizePriceData(snapshot.prices, snapshot);
    state.prices = n.prices;
    state.priceMeta = n.meta;
  }

  async function loadCloudState(showToast = false) {
    if (state.cloudBusy) return false;
    state.cloudBusy = true;
    state.cloudError = '';
    try {
      let bundle;
      try {
        bundle = await apiJson('/dashboard');
      } catch (e) {
        // Backward-compatible fallback for the first Worker code already deployed.
        const [status, prices, history] = await Promise.all([apiJson('/status'), apiJson('/prices'), apiJson('/history?limit=40')]);
        bundle = {status, prices:prices.prices, history:history.history};
      }
      state.cloudStatus = bundle.status || null;
      state.cloudHistory = Array.isArray(bundle.history) ? bundle.history : [];
      applyPublishedSnapshot(bundle.prices);
      state.cloudLoaded = true;
      renderAll();
      if (showToast) toast('Cloudflare 최신 상태를 확인했어.');
      return true;
    } catch (e) {
      state.cloudError = `Cloudflare 연결 실패: ${e.message}`;
      console.warn(e);
      renderAll();
      if (showToast) toast(state.cloudError);
      return false;
    } finally {
      state.cloudBusy = false;
    }
  }

  async function publishLatestPrice() {
    if (state.cloudBusy) return;
    const cycle = priceCycleInfo();
    await loadCloudState(false);
    const freshness = priceFreshState();
    if (freshness.publishedFresh && !freshness.hasNewCandidate) {
      toast('현재 가격 주기는 이미 확정되어 있어.');
      return;
    }
    const candidate = freshness.candidate;
    if (!candidate || candidate.cycleKey !== cycle.cycleKey || !isCurrentCycleStamp(candidate.capturedAt)) {
      toast('현재 주기 가격이 아직 없어. 밀키의 요리 판매 상점을 한 번 열어줘.');
      return;
    }

    state.cloudBusy = true;
    try {
      await apiJson('/publish', {method:'POST', body:JSON.stringify({cycleKey:cycle.cycleKey})});
      state.cloudBusy = false;
      await loadCloudState(false);
      toast(`최신 가격 업데이트 완료 · ${fmtKst(candidate.capturedAt)}`);
    } catch (e) {
      state.cloudBusy = false;
      toast(`가격 업데이트 실패: ${e.message}`);
    }
  }

  function saveFarm() { localStorage.setItem('ddingFarm',JSON.stringify([...state.farm])); renderAll(); }

  function updateNextPriceChange() {
    const el = $('#nextChange');
    if (!el) return;
    const {nextMs} = priceCycleInfo();
    const diff = Math.max(0, nextMs - Date.now());
    const days = Math.floor(diff/86400000);
    const hrs = Math.floor((diff%86400000)/3600000);
    const mins = Math.floor((diff%3600000)/60000);
    const secs = Math.floor((diff%60000)/1000);
    el.textContent = days ? `${days}일 ${hrs}시간` : hrs ? `${hrs}시간 ${mins}분` : `${mins}분 ${secs}초`;
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._tm);
    t._tm = setTimeout(() => t.hidden = true, 2400);
  }

  function openTool(tool) {
    state.activeTool = tool;
    $('#toolPanel').classList.add('open');
    $('#toolPanel').setAttribute('aria-hidden','false');
    renderTool();
  }

  function closeTool() {
    state.activeTool = null;
    $('#toolPanel').classList.remove('open');
    $('#toolPanel').setAttribute('aria-hidden','true');
  }

  function calculatorFoodOptions() {
    return `<option value="">직접 입력</option>${D.foods.map(f => `<option value="${f.slug}">${esc(f.name)}</option>`).join('')}`;
  }

  function loadMemoEntries() {
    try {
      const rows = JSON.parse(localStorage.getItem('ddingMemosV1') || '[]');
      return Array.isArray(rows) ? rows.filter(n => n && n.id && typeof n.text === 'string') : [];
    } catch (_) {
      return [];
    }
  }

  function persistMemoEntries(rows) {
    localStorage.setItem('ddingMemosV1', JSON.stringify(rows.slice(0, 100)));
  }

  function formatMemoTime(stamp) {
    const d = new Date(stamp);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone:'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', hour12:false,
    }).format(d);
  }

  function saveMemoFromTool() {
    const area = $('#memoArea');
    if (!area) return;
    const text = area.value.trim();
    if (!text) { toast('메모 내용을 입력해줘.'); return; }
    const rows = loadMemoEntries();
    const now = new Date().toISOString();
    if (state.memoEditingId) {
      const i = rows.findIndex(n => n.id === state.memoEditingId);
      if (i >= 0) rows[i] = {...rows[i], text, updatedAt:now};
      state.memoEditingId = null;
      toast('메모를 수정했어.');
    } else {
      rows.unshift({id:`memo-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, text, createdAt:now, updatedAt:now});
      toast('메모를 저장했어.');
    }
    persistMemoEntries(rows);
    localStorage.setItem('ddingMemoDraft','');
    localStorage.removeItem('ddingMemo');
    renderTool();
  }

  function editMemo(id) {
    const note = loadMemoEntries().find(n => n.id === id);
    if (!note) return;
    state.memoEditingId = id;
    renderTool();
    requestAnimationFrame(() => { const a=$('#memoArea'); if(a){ a.focus(); a.setSelectionRange(a.value.length,a.value.length); } });
  }

  function deleteMemo(id) {
    const rows = loadMemoEntries().filter(n => n.id !== id);
    persistMemoEntries(rows);
    if (state.memoEditingId === id) state.memoEditingId = null;
    renderTool();
    toast('메모를 삭제했어.');
  }

  function renderTool() {
    const body = $('#toolPanelBody');
    if (state.activeTool === 'calculator') {
      $('#toolEyebrow').textContent = 'UTILITY 01';
      $('#toolTitle').textContent = '요리 수익 계산기';
      body.innerHTML = `<div class="tool-block"><label class="tool-label">음식 선택</label><select id="calcFood" class="field">${calculatorFoodOptions()}</select></div>
        <div class="tool-block"><div class="field-row"><div><label class="tool-label">판매 단가</label><input id="calcSale" class="field" inputmode="numeric" placeholder="0"></div><div><label class="tool-label">수량</label><input id="calcQty" class="field" inputmode="numeric" value="1"></div></div><div class="field-row" style="margin-top:8px"><div><label class="tool-label">개당 직접 비용</label><input id="calcCost" class="field" inputmode="numeric" placeholder="0"></div><div><label class="tool-label">추가 고정 비용</label><input id="calcExtra" class="field" inputmode="numeric" placeholder="0"></div></div><div class="tool-result"><small>Estimated net</small><strong id="calcNet">0 G</strong><p id="calcMeta">판매가와 비용을 입력하면 바로 계산돼.</p></div></div>
        <div class="note-strip">음식을 선택하면 연결된 현재 판매가와 이 개인DB의 <b>NPC 실제 구매비</b>를 자동으로 넣어줘. 직접 수급 재료의 기회비용은 자동 환산하지 않아.</div>`;
      updateCalc();
    } else if (state.activeTool === 'timer') {
      $('#toolEyebrow').textContent = 'UTILITY 02';
      $('#toolTitle').textContent = '쿠킹 타이머';
      const configured = Math.max(1, Math.floor(Number(state.timer.duration) || 900));
      const timerHours = Math.floor(configured / 3600);
      const timerMinutes = Math.floor((configured % 3600) / 60);
      const timerSeconds = configured % 60;
      body.innerHTML = `<div class="tool-block"><div id="timerDisplay" class="timer-display">15:00</div>
        <div class="timer-custom"><div class="timer-custom-head"><b>직접 시간 설정</b><span>시 · 분 · 초</span></div><div class="timer-custom-grid"><label><span>시간</span><input id="timerHours" type="number" min="0" max="999" step="1" value="${timerHours}"></label><label><span>분</span><input id="timerMinutes" type="number" min="0" max="59" step="1" value="${timerMinutes}"></label><label><span>초</span><input id="timerSeconds" type="number" min="0" max="59" step="1" value="${timerSeconds}"></label><button id="timerApplyCustom" class="btn">시간 적용</button></div></div>
        <div class="timer-presets"><button data-timer-preset="300">5분</button><button data-timer-preset="900">15분</button><button data-timer-preset="1800">30분</button><button data-timer-preset="3600">60분</button></div><div class="timer-actions"><button id="timerStart" class="btn primary">${state.timer.target ? '일시정지' : '시작'}</button><button id="timerReset" class="btn">초기화</button></div></div><div class="note-strip">직접 시간을 설정하거나 프리셋을 골라 사용할 수 있어. 시작 후 패널을 닫거나 새로고침해도 같은 브라우저에서 남은 시간을 복원해.</div>`;
      updateTimerDisplay();
    } else if (state.activeTool === 'memo') {
      $('#toolEyebrow').textContent = 'UTILITY 03';
      $('#toolTitle').textContent = '메모';
      const draft = localStorage.getItem('ddingMemoDraft') ?? localStorage.getItem('ddingMemo') ?? '';
      const notes = loadMemoEntries();
      const editing = state.memoEditingId ? notes.find(n => n.id === state.memoEditingId) : null;
      body.innerHTML = `<div class="memo-compose"><textarea id="memoArea" class="memo-area" placeholder="오늘 해야 할 것, 살 것, 만들어야 할 것…">${esc(editing?.text ?? draft)}</textarea><div class="memo-compose-foot"><span id="memoCount">${(editing?.text ?? draft).length} chars</span><div class="memo-compose-actions">${editing ? '<button id="memoCancelEdit" class="btn">취소</button>' : ''}<button id="memoSave" class="btn primary">${editing ? '수정 저장' : '저장'}</button></div></div></div>
        <div class="memo-list-head"><b>저장된 메모</b><span>${notes.length}개</span></div>
        <div class="memo-list">${notes.length ? notes.map(n => `<article class="memo-item"><div class="memo-item-meta"><time>${esc(formatMemoTime(n.updatedAt || n.createdAt))}</time><div><button class="memo-link" data-memo-edit="${esc(n.id)}">수정</button><button class="memo-link danger" data-memo-delete="${esc(n.id)}">삭제</button></div></div><p>${esc(n.text).replace(/\n/g,'<br>')}</p></article>`).join('') : '<div class="memo-empty">아직 저장된 메모가 없어.</div>'}</div>`;
    } else if (state.activeTool === 'settings') {
      $('#toolEyebrow').textContent = 'APPEARANCE';
      $('#toolTitle').textContent = '환경 설정';
      const opts = [
        ['gmarket','Gmarket Sans','네가 준 폰트 계열 · 기본값'],
        ['pretendard','Pretendard','웹 UI에 익숙한 단정한 느낌'],
        ['system','System UI','윈도우/맥 기본 글꼴'],
        ['serif','Editorial','제목만 세리프를 쓰는 조합'],
      ];
      body.innerHTML = `<div class="setting-block"><div class="setting-title">글꼴</div><div class="setting-copy">선택값은 이 브라우저에 자동 저장돼. Gmarket Sans는 PC 설치본을 우선 사용하고, 없으면 웹폰트로 불러와.</div><div class="font-options">${opts.map(([k,n,d]) => `<button class="font-option ${state.fontChoice===k?'active':''}" data-font-choice="${k}"><b>${n}</b><small>${d}</small></button>`).join('')}</div></div>
        <div class="setting-block"><div class="setting-title">글자 크기</div><div class="setting-copy">정보 밀도를 해치지 않는 범위에서 전체 UI를 조금씩 조절해.</div><div class="range-row"><span>작게</span><input id="fontScaleRange" type="range" min="0.9" max="1.14" step="0.02" value="${state.fontScale}"><span>크게</span></div></div>
        <div class="setting-preview"><strong>띵타 개인DB</strong><p>발광석 · 꽃잎 공방 · 바름 · 200 G<br>요리와 상점 정보를 같은 화면에서 빠르게 확인.</p></div>
        <button id="resetAppearance" class="btn" style="width:100%;margin-top:10px">환경 설정 기본값으로</button>`;
    }
  }

  function updateCalc() {
    const saleEl=$('#calcSale'), qtyEl=$('#calcQty'), costEl=$('#calcCost'), extraEl=$('#calcExtra'), netEl=$('#calcNet'), metaEl=$('#calcMeta');
    if (!saleEl || !netEl) return;
    const sale = num(saleEl.value) || 0, qty = Math.max(0,num(qtyEl.value) || 0), cost = num(costEl.value) || 0, extra = num(extraEl.value) || 0;
    const revenue = sale*qty, totalCost = cost*qty + extra, net = revenue-totalCost;
    netEl.textContent = fmt(net);
    const margin = revenue ? (net/revenue*100) : 0;
    metaEl.textContent = `매출 ${fmt(revenue)} · 비용 ${fmt(totalCost)} · 마진 ${margin.toFixed(1)}%`;
  }

  function selectCalcFood(slug) {
    const f = foodBySlug(slug);
    if (!f) return;
    const sale = currentPrice(f) ?? f.minPrice;
    $('#calcSale').value = sale;
    $('#calcCost').value = npcCashCostFood(f);
    updateCalc();
  }

  function timerRemaining() {
    if (state.timer.target) return Math.max(0, Math.ceil((state.timer.target - Date.now())/1000));
    return Math.max(0, Number(state.timer.remaining ?? state.timer.duration));
  }

  function persistTimer() {
    localStorage.setItem('ddingTimerDuration', String(state.timer.duration));
    localStorage.setItem('ddingTimerTarget', String(state.timer.target || 0));
    localStorage.setItem('ddingTimerRemaining', String(timerRemaining()));
  }

  function setTimerDuration(seconds) {
    const safe = Math.max(1, Math.floor(Number(seconds) || 1));
    state.timer.duration = safe;
    state.timer.remaining = safe;
    state.timer.target = 0;
    clearInterval(state.timer.interval);
    state.timer.interval = null;
    persistTimer();
    updateTimerDisplay();
    const btn=$('#timerStart'); if(btn) btn.textContent='시작';
  }

  function applyCustomTimer() {
    const h = Math.max(0, Math.min(999, Math.floor(Number($('#timerHours')?.value) || 0)));
    const m = Math.max(0, Math.min(59, Math.floor(Number($('#timerMinutes')?.value) || 0)));
    const s = Math.max(0, Math.min(59, Math.floor(Number($('#timerSeconds')?.value) || 0)));
    const seconds = h * 3600 + m * 60 + s;
    if (seconds <= 0) { toast('타이머 시간을 1초 이상 입력해줘.'); return; }
    setTimerDuration(seconds);
    renderTool();
    toast('타이머 시간을 적용했어.');
  }

  function startPauseTimer() {
    if (state.timer.target) {
      state.timer.remaining = timerRemaining();
      state.timer.target = 0;
      clearInterval(state.timer.interval);
      state.timer.interval = null;
    } else {
      const remain = timerRemaining();
      if (remain <= 0) state.timer.remaining = state.timer.duration;
      state.timer.target = Date.now() + (state.timer.remaining || state.timer.duration)*1000;
      state.timer.interval = setInterval(tickTimer, 500);
    }
    persistTimer();
    renderTool();
  }

  function resetTimer() { setTimerDuration(state.timer.duration || 900); }

  function tickTimer() {
    const r = timerRemaining();
    if (r <= 0 && state.timer.target) {
      state.timer.target = 0;
      state.timer.remaining = 0;
      clearInterval(state.timer.interval);
      state.timer.interval = null;
      persistTimer();
      toast('쿠킹 타이머가 끝났어.');
    }
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const el = $('#timerDisplay');
    if (!el) return;
    const total = timerRemaining();
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    el.textContent = h > 0
      ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    persistTimer();
  }

  function restoreTimer() {
    if (state.timer.target && state.timer.target > Date.now()) state.timer.interval = setInterval(tickTimer,500);
    else if (state.timer.target) { state.timer.target=0; state.timer.remaining=0; persistTimer(); }
  }

  document.addEventListener('click', async e => {
    const nav = e.target.closest('[data-page]');
    if (nav) { switchPage(nav.dataset.page); return; }
    const go = e.target.closest('[data-go]');
    if (go) { switchPage(go.dataset.go); return; }
    const tool = e.target.closest('[data-tool]');
    if (tool) { openTool(tool.dataset.tool); return; }
    if (e.target.closest('#toolClose')) { closeTool(); return; }
    if (e.target.closest('#quickConnect') || e.target.closest('#sideConnect') || e.target.closest('#refreshCloudBtn')) { await loadCloudState(true); return; }
    if (e.target.closest('#publishLatestBtn') || e.target.closest('#publishLatestBtn2') || e.target.closest('#publishLatestBtn3')) { await publishLatestPrice(); return; }
    const fil = e.target.closest('[data-filter]');
    if (fil) { state.cookingFilter=fil.dataset.filter; renderCooking(); return; }
    const view = e.target.closest('[data-view]');
    if (view) { state.cookingView=view.dataset.view; localStorage.setItem('ddingCookingView',state.cookingView); renderCooking(); return; }
    const guideExample = e.target.closest('[data-guide-example]');
    if (guideExample) {
      state.query = guideExample.dataset.guideExample || ''; state.guidePage=1;
      $('#globalSearch').value = state.query;
      switchPage('reference'); renderReference(); return;
    }
    const guideFilter = e.target.closest('[data-guide-filter]');
    if (guideFilter) { state.guideFilter=guideFilter.dataset.guideFilter; state.guidePage=1; localStorage.setItem('ddingGuideFilter',state.guideFilter); renderReference(); return; }
    const guideItem = e.target.closest('[data-guide-item]');
    if (guideItem) { openGuideItemDrawer(guideByName(guideItem.dataset.guideItem)); return; }
    const guideOpen = e.target.closest('[data-guide-open]');
    if (guideOpen) { openGuideItemDrawer(guideByName(guideOpen.dataset.guideOpen)); return; }
    const guidePageBtn = e.target.closest('[data-guide-page]');
    if (guidePageBtn && !guidePageBtn.disabled) { state.guidePage=Math.max(1,Number(guidePageBtn.dataset.guidePage)||1); renderReference(); const sec=document.querySelector('.guide-catalog-section'); if(sec) sec.scrollIntoView({behavior:'smooth',block:'start'}); return; }
    if (e.target.closest('#guideRunSearch')) {
      const input=$('#guideSearchInput'); state.query=(input?.value||'').trim(); state.guidePage=1; $('#globalSearch').value=state.query; renderReference(); return;
    }
    const finderFilter = e.target.closest('[data-finder-filter]');
    if (finderFilter) { state.finderFilter=finderFilter.dataset.finderFilter; localStorage.setItem('ddingFinderFilter',state.finderFilter); renderFinder(); return; }
    const profitFilter = e.target.closest('[data-profit-filter]');
    if (profitFilter) { state.profitFilter=profitFilter.dataset.profitFilter; localStorage.setItem('ddingProfitFilter',state.profitFilter); renderProfit(); return; }
    const profitTarget = e.target.closest('[data-profit-target-food]');
    if (profitTarget) {
      state.profitTargetFood = profitTarget.dataset.profitTargetFood;
      localStorage.setItem('ddingProfitTargetFood',state.profitTargetFood);
      renderProfit();
      requestAnimationFrame(() => document.querySelector('#profitTargetPlanner')?.scrollIntoView({behavior:'smooth',block:'center'}));
      return;
    }
    const applyTarget = e.target.closest('[data-profit-apply-target]');
    if (applyTarget && !applyTarget.disabled) {
      const food = foodBySlug(applyTarget.dataset.profitApplyTarget);
      const plan = food ? targetFoodPlan(food,state.profitFarm.total) : null;
      if (plan && !plan.insufficient) {
        PROFIT_CROP_IDS.forEach(id => state.profitFarm[id] = plan.allocation[id] || 0);
        saveProfitFarm();
        renderProfit();
        toast('선택 음식 기준 최적 경작지 배치를 적용했어.');
      }
      return;
    }
    const fontChoice = e.target.closest('[data-font-choice]');
    if (fontChoice) { state.fontChoice=fontChoice.dataset.fontChoice; localStorage.setItem('ddingFontChoice',state.fontChoice); applyDisplayPrefs(); renderTool(); return; }
    if (e.target.closest('#resetAppearance')) { state.fontChoice='gmarket'; state.fontScale=1; localStorage.setItem('ddingFontChoice','gmarket'); localStorage.setItem('ddingFontScale','1'); applyDisplayPrefs(); renderTool(); toast('환경 설정을 기본값으로 돌렸어.'); return; }
    const trendMode = e.target.closest('[data-trend-mode]');
    if (trendMode) { state.selectedTrendGold=trendMode.dataset.trendMode==='gold'; localStorage.setItem('ddingTrendGold',state.selectedTrendGold?'1':'0'); renderDashboard(); return; }
    const cookingFood = e.target.closest('[data-cooking-food]');
    if (cookingFood) { goToCookingFood(cookingFood.dataset.cookingFood); return; }
    const craftPreset = e.target.closest('[data-craft-preset]');
    if (craftPreset) {
      const input = $('.craft-qty-input');
      if (input && input.dataset.craftFood === craftPreset.dataset.craftFood) {
        input.value = String(Math.max(1, Number(craftPreset.dataset.craftPreset) || 1));
        updateNpcPurchasePlanner(input);
      }
      return;
    }
    const trendFood = e.target.closest('[data-trend-food]');
    if (trendFood && !trendFood.disabled) { state.selectedTrendFood=trendFood.dataset.trendFood; if (trendFood.dataset.trendGold != null) state.selectedTrendGold=trendFood.dataset.trendGold==='1'; localStorage.setItem('ddingTrendFood',state.selectedTrendFood); localStorage.setItem('ddingTrendGold',state.selectedTrendGold?'1':'0'); if(state.page!=='dashboard') switchPage('dashboard'); else renderDashboard(); return; }
    const card = e.target.closest('.food-card');
    if (card && e.target.closest('.detail-btn')) { openDrawer(foodBySlug(card.dataset.food), card.dataset.gold === '1'); return; }
    if (card && e.target.closest('.gold-toggle')) { openDrawer(foodBySlug(card.dataset.food), card.dataset.gold !== '1'); return; }
    if (e.target.closest('.drawer-close') || e.target.id === 'drawerBackdrop') { closeDrawer(); return; }
    if (e.target.closest('#clearFarm')) { state.farm.clear(); saveFarm(); return; }
    if (e.target.closest('#profitReset')) {
      state.profitFarm = {total:0,tomato:0,onion:0,garlic:0};
      saveProfitFarm();
      renderProfit();
      toast('예상 수익 경작지 설정을 초기화했어.');
      return;
    }
    if (e.target.closest('#memoSave')) { saveMemoFromTool(); return; }
    if (e.target.closest('#memoCancelEdit')) { state.memoEditingId=null; localStorage.setItem('ddingMemoDraft',''); renderTool(); return; }
    const memoEdit = e.target.closest('[data-memo-edit]');
    if (memoEdit) { editMemo(memoEdit.dataset.memoEdit); return; }
    const memoDelete = e.target.closest('[data-memo-delete]');
    if (memoDelete) { deleteMemo(memoDelete.dataset.memoDelete); return; }
    const preset = e.target.closest('[data-timer-preset]');
    if (preset) { setTimerDuration(Number(preset.dataset.timerPreset)); renderTool(); return; }
    if (e.target.closest('#timerApplyCustom')) { applyCustomTimer(); return; }
    if (e.target.closest('#timerStart')) { startPauseTimer(); return; }
    if (e.target.closest('#timerReset')) { resetTimer(); return; }
  });

  document.addEventListener('change', e => {
    const c = e.target.closest('[data-crop]');
    if (c) { c.checked ? state.farm.add(c.dataset.crop) : state.farm.delete(c.dataset.crop); saveFarm(); return; }
    const profitField = e.target.closest('[data-profit-field]');
    if (profitField) {
      const key = profitField.dataset.profitField;
      state.profitFarm[key] = Math.max(0, Math.floor(Number(profitField.value) || 0));
      saveProfitFarm();
      renderProfit();
      return;
    }
    if (e.target.id === 'profitPriceMode') {
      state.profitPriceMode = e.target.value === 'market' ? 'market' : 'mine';
      localStorage.setItem('ddingProfitPriceMode', state.profitPriceMode);
      renderProfit();
      return;
    }
    if (e.target.id === 'profitTargetFood') {
      state.profitTargetFood = e.target.value;
      localStorage.setItem('ddingProfitTargetFood',state.profitTargetFood);
      renderProfit();
      return;
    }
    if (e.target.id === 'profitSort') {
      state.profitSort = e.target.value;
      localStorage.setItem('ddingProfitSort', state.profitSort);
      renderProfit();
      return;
    }
    if (e.target.id === 'guideTargetStage') {
      state.guideTarget=Math.min(15,Math.max(1,Number(e.target.value)||15)); localStorage.setItem('ddingGuideTarget',String(state.guideTarget)); renderReference(); return;
    }
    if (e.target.id === 'noctilaWeaponSelect') {
      state.query = `${e.target.value} 강화`; const g=$('#globalSearch'); if(g) g.value=state.query; renderReference(); return;
    }
    if (e.target.id === 'calcFood') { selectCalcFood(e.target.value); return; }
  });

  document.addEventListener('input', e => {
    if (e.target.id === 'guideSearchInput') {
      state.query=e.target.value; const g=$('#globalSearch'); if(g) g.value=state.query;
    }
    if (['calcSale','calcQty','calcCost','calcExtra'].includes(e.target.id)) updateCalc();
    const craftQty = e.target.closest?.('.craft-qty-input');
    if (craftQty) { updateNpcPurchasePlanner(craftQty); return; }
    if (e.target.id === 'memoArea') {
      if (!state.memoEditingId) localStorage.setItem('ddingMemoDraft', e.target.value);
      const count=$('#memoCount'); if(count) count.textContent=`${e.target.value.length} chars`;
    }
    if (e.target.id === 'fontScaleRange') {
      state.fontScale = Number(e.target.value) || 1;
      localStorage.setItem('ddingFontScale', String(state.fontScale));
      applyDisplayPrefs();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.target.id === 'guideSearchInput' && e.key === 'Enter') {
      state.query=e.target.value.trim(); state.guidePage=1; const g=$('#globalSearch'); if(g) g.value=state.query; renderReference();
    }
  });

  $('#globalSearch').addEventListener('input', e => { state.query=e.target.value; state.guidePage=1; renderCurrent(); });
  $('#globalSearch').addEventListener('keydown', e => {
    if(e.key==='Escape'){e.target.value='';state.query='';renderCurrent();e.target.blur();}
    if(e.key==='Enter' && state.query.trim()){switchPage('reference');renderReference();}
  });

  // Ingredient help is rendered in a body-level floating layer.
  // Keeping the tooltip inside .food-card caused position:fixed to be scoped by
  // the card's hover transform, which could push the panel to the lower-right
  // or clip it outside the viewport.
  const floatingTooltip = document.createElement('div');
  floatingTooltip.id = 'floatingTooltip';
  floatingTooltip.className = 'hover-card hover-card-floating';
  floatingTooltip.setAttribute('role', 'tooltip');
  document.body.appendChild(floatingTooltip);

  function hideFloatingTooltip() {
    floatingTooltip.style.display = 'none';
    floatingTooltip.innerHTML = '';
    floatingTooltip.classList.remove('recipe-preview-floating');
  }

  function positionFloatingTooltip(e) {
    if (floatingTooltip.style.display !== 'block') return;
    const pad = 12, gap = 14;
    const w = floatingTooltip.offsetWidth || 268;
    const h = floatingTooltip.offsetHeight || 140;
    let x = e.clientX + gap;
    let y = e.clientY + gap;
    if (x + w + pad > window.innerWidth) x = e.clientX - w - gap;
    if (y + h + pad > window.innerHeight) y = e.clientY - h - gap;
    x = Math.max(pad, Math.min(x, window.innerWidth - w - pad));
    y = Math.max(pad, Math.min(y, window.innerHeight - h - pad));
    floatingTooltip.style.left = x + 'px';
    floatingTooltip.style.top = y + 'px';
  }

  document.addEventListener('mousemove', e => {
    const chip = e.target.closest('[data-tip]');
    if (!chip) { hideFloatingTooltip(); return; }
    const source = $('.hover-card', chip);
    if (!source) { hideFloatingTooltip(); return; }
    floatingTooltip.innerHTML = source.innerHTML;
    floatingTooltip.classList.toggle('recipe-preview-floating', source.dataset.tooltipKind === 'recipe');
    floatingTooltip.style.display = 'block';
    positionFloatingTooltip(e);
  });

  document.addEventListener('mouseout', e => {
    const chip = e.target.closest('[data-tip]');
    if (chip && !e.relatedTarget?.closest?.('[data-tip]')) hideFloatingTooltip();
  });

  window.addEventListener('scroll', hideFloatingTooltip, true);
  window.addEventListener('resize', hideFloatingTooltip);

  // The update-help popup also lives at body level so hero/card overflow can
  // never clip it.
  const floatingHelp = document.createElement('div');
  floatingHelp.id = 'floatingUpdateHelp';
  floatingHelp.className = 'update-help-floating';
  floatingHelp.setAttribute('role','tooltip');
  document.body.appendChild(floatingHelp);

  function hideFloatingHelp() {
    floatingHelp.style.display = 'none';
    floatingHelp.innerHTML = '';
  }

  function showFloatingHelp(trigger, clientX, clientY) {
    const source = $('.update-help-pop', trigger);
    if (!source) return;
    floatingHelp.innerHTML = source.innerHTML;
    floatingHelp.style.display = 'block';
    const pad=12, gap=12, w=floatingHelp.offsetWidth || 290, h=floatingHelp.offsetHeight || 100;
    let x=clientX+gap, y=clientY+gap;
    if (x+w+pad>window.innerWidth) x=clientX-w-gap;
    if (y+h+pad>window.innerHeight) y=clientY-h-gap;
    floatingHelp.style.left=Math.max(pad,Math.min(x,window.innerWidth-w-pad))+'px';
    floatingHelp.style.top=Math.max(pad,Math.min(y,window.innerHeight-h-pad))+'px';
  }

  document.addEventListener('mousemove', e => {
    const help=e.target.closest('.update-help');
    if (help) showFloatingHelp(help,e.clientX,e.clientY);
    else hideFloatingHelp();
  });
  document.addEventListener('focusin', e => {
    const help=e.target.closest?.('.update-help');
    if (!help) return;
    const r=help.getBoundingClientRect();
    showFloatingHelp(help,r.left+r.width/2,r.bottom);
  });
  document.addEventListener('focusout', e => { if(e.target.closest?.('.update-help')) hideFloatingHelp(); });
  window.addEventListener('scroll', hideFloatingHelp, true);
  window.addEventListener('resize', hideFloatingHelp);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeDrawer(); closeTool(); }
    if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      e.preventDefault(); $('#globalSearch').focus();
    }
  });

  renderAll();
  switchPage('dashboard');
  loadCloudState(false);
  restoreTimer();
  state.uiCycleKey = priceCycleInfo().cycleKey;
  setInterval(() => {
    const key = priceCycleInfo().cycleKey;
    if (state.uiCycleKey && key !== state.uiCycleKey) {
      state.uiCycleKey = key;
      renderAll();
    }
    updateNextPriceChange();
  },1000);
})();

