(() => {
  'use strict';

  const D = window.DDING_DATA;
  const SHOP = window.DDING_SHOP_DATA || {meta:{},items:[]};
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const LEGACY_URL = 'https://raw.githubusercontent.com/beniforreal/ddingtasearch/main/data/regionData.json';
  const LEGACY_CACHE_KEY = 'ddingLegacyCacheV1';

  const state = {
    page: 'dashboard',
    cookingFilter: 'ALL',
    cookingView: localStorage.getItem('ddingCookingView') || 'grid',
    finderFilter: localStorage.getItem('ddingFinderFilter') || 'all',
    fontChoice: localStorage.getItem('ddingFontChoice') || 'gmarket',
    fontScale: Number(localStorage.getItem('ddingFontScale') || 1),
    query: '',
    prices: {},
    priceMeta: null,
    priceHandle: null,
    priceTimer: null,
    farm: new Set(JSON.parse(localStorage.getItem('ddingFarm') || '[]')),
    legacy: null,
    legacyLoading: false,
    legacyError: '',
    legacyScope: localStorage.getItem('ddingLegacyScope') || 'wild',
    legacySub: '',
    activeTool: null,
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
    ingredients: ['INGREDIENT INDEX', '재료 도감'],
    finder: ['TRADE FINDER', '아이템 찾기'],
    reference: ['REFERENCE ARCHIVE', '원본 DB 탐색'],
    prices: ['LOCAL PRICE FEED', '가격 연동'],
  };

  const scopeLabels = {
    wild: '야생',
    grindel: '세레니티',
    collection: '컬렉션북',
    expert: '전문가',
  };

  const legacySubLabels = {
    sell: '판매', buy: '구매', process: '가공', cooking: '요리', enhancement: '강화',
    blocks: '블록', nature: '자연', loot: '전리품', collection: '수집품',
    gathering: '채집 전문가', mining: '채광 전문가', fishing: '해양 전문가',
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

  function iconHTML(item, cls = '') {
    if (item?.icon) {
      return `<img class="${cls}" src="${esc(item.icon)}" alt="${esc(item.name)}" onerror="this.outerHTML='<span class=\'fallback-icon\'>${esc(item.emoji || '□')}</span>'">`;
    }
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
    return food.recipe.reduce((sum, [id, n]) => sum + npcCashCostIngredient(id, n), 0);
  }

  function ingredientChip(id, qty) {
    const ing = resolveIngredient(id);
    return `<div class="ingredient-chip" data-tip="1">
      ${iconHTML(ing)}<b title="${esc(ing.name)}">${esc(ing.name)}</b><span>×${qty}</span>
      <div class="hover-card"><h4>${esc(ing.name)}</h4><p><em>${esc(ing.source)}</em></p><p>${esc(ing.detail)}</p>${ing.recipe?.length ? `<p>가공: ${ing.recipe.map(([c,n]) => `${esc(resolveIngredient(c).name)} ×${n}`).join(' + ')}</p>` : ''}</div>
    </div>`;
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
    return `<article class="card food-card" data-food="${food.slug}" data-gold="${gold ? '1' : '0'}">
      <div class="food-top">
        <div class="pixel-wrap"><img class="pixel" src="${image}" alt="${esc(name)}"></div>
        <div class="food-title-block"><div class="food-name">${esc(name)}</div><span class="grade ${gold ? 'GOLD' : food.grade}">${esc(gradeText(g))}</span></div>
        ${priceDisplay(food, gold)}
      </div>
      <div class="recipe-row">${modeRecipe.map(([id, n]) => ingredientChip(id, n)).join('')}</div>
      <div class="card-lower">
        ${!gold ? `<div class="readiness"><span style="width:${r}%"></span></div><div class="ready-caption"><span>농장 준비도</span><span>${r}%</span></div>` : ''}
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

  function renderDashboard() {
    const linked = Object.keys(state.prices).length > 0;
    const fully = D.foods.filter(f => readiness(f) === 1).length;
    const top = topPricedFoods().slice(0, 5);
    const recommendations = calcCropUnlocks().slice(0, 4);
    const heroFood = top[0] || bestFallbackFood();
    const heroPrice = currentPrice(heroFood) ?? heroFood.maxPrice;
    const heroPct = normalizedPrice(heroFood);

    $('#page-dashboard').innerHTML = `<div class="content-shell">
      <section class="hero">
        <div class="hero-copy">
          <div class="hero-kicker">Dding Tycoon · Personal Index</div>
          <h2>검색보다 빠르게,<br><b>지금 필요한 정보만.</b></h2>
          <p>요리 레시피, 재료 수급처, 내 농장 준비도와 가격 흐름을 한 화면에서 이어서 보는 개인용 작업 공간.</p>
          <div class="hero-actions"><button class="btn primary" data-go="cooking">요리 DB 열기</button><button class="btn" data-tool="memo">오늘 할 일 메모</button></div>
        </div>
        <div class="hero-side">
          <div class="hero-side-label">${top.length ? 'Current spotlight' : 'Farm-ready pick'}</div>
          <div class="hero-food">
            <div class="hero-food-img"><img src="${heroFood.image}" alt="${esc(heroFood.name)}"></div>
            <div><h3>${esc(heroFood.name)}</h3><div class="hero-price">${fmt(heroPrice)}</div><small>${heroPct != null ? `공식 범위 기준 상단 ${Math.round(heroPct * 100)}% 지점` : `내 농장 준비도 ${Math.round(readiness(heroFood) * 100)}%`}</small></div>
          </div>
        </div>
      </section>

      <section class="metrics">
        <div class="metric"><div class="metric-label">가격 피드</div><div class="metric-value">${linked ? 'ON' : 'OFF'}</div><div class="metric-foot">${linked ? `${Object.keys(state.prices).length}개 항목 로드됨` : 'prices.json 연결 대기'}</div></div>
        <div class="metric"><div class="metric-label">내 재배 작물</div><div class="metric-value">${state.farm.size}</div><div class="metric-foot">브라우저에 자동 저장</div></div>
        <div class="metric"><div class="metric-label">농작물 조건 충족</div><div class="metric-value">${fully}<small> / ${D.foods.length}</small></div><div class="metric-foot">고기·구매재료는 별도</div></div>
        <div class="metric"><div class="metric-label">다음 가격 변경</div><div class="metric-value" id="nextChange">—</div><div class="metric-foot">지정일 03:00 기준</div></div>
      </section>

      <section class="section">
        <div class="section-head"><div><h2>현재가 흐름</h2><p>각 음식의 최저~최고 가격 범위 안에서 현재 위치를 비교해.</p></div><button class="btn ghost" data-go="prices">가격 피드 보기</button></div>
        <div class="dashboard-columns">
          <div class="card rank-card">${top.length ? top.map((f,i) => {
            const pct = Math.round((normalizedPrice(f) || 0) * 100);
            return `<div class="rank-row"><div class="rank-no">${String(i + 1).padStart(2,'0')}</div><div class="rank-thumb"><img src="${f.image}" alt=""></div><div><div class="rank-name">${esc(f.name)}</div><div class="rank-meta">가격 범위 상단 ${pct}% · 농장 준비도 ${Math.round(readiness(f) * 100)}%</div></div><div class="rank-price"><strong>${fmt(currentPrice(f))}</strong><span>${fmt(f.minPrice)} — ${fmt(f.maxPrice)}</span></div></div>`;
          }).join('') : `<div class="empty"><strong>가격 파일이 아직 없어.</strong>연결하면 현재가가 강한 요리를 여기서 바로 비교할 수 있어.</div>`}</div>
          <div class="card crop-suggest"><div class="hero-side-label" style="color:#8a918c">NEXT CROP</div><p class="crop-suggest-intro">땅 한 칸을 더 쓴다면 무엇을 심는 게 좋은지, 현재 체크한 농장 상태에서 계산해.</p><div class="crop-suggest-list">${recommendations.length ? recommendations.map(x => {
            const c = D.crops.find(c => c.id === x.id);
            return `<div class="crop-suggest-item">${c.icon ? `<img src="${c.icon}" alt="">` : `<span class="crop-emoji">${esc(c.emoji || '·')}</span>`}<div><b>${esc(c.name)}</b><small>관련 요리 ${x.improves}종 · 즉시 완성 ${x.unlock}종</small></div><strong>+${x.unlock}</strong></div>`;
          }).join('') : `<div class="empty">모든 작물이 체크되어 있어.</div>`}</div></div>
        </div>
      </section>

      <section class="section"><div class="note-strip">직접 재배·사냥·채집한 재료를 임의의 골드 비용으로 환산하지 않아. 현재 계산되는 비용은 <b>NPC에게 실제로 지불하는 구매비</b>만 별도로 잡는다.</div></section>
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

  function renderFarm() {
    const groups = [...new Set(D.crops.map(c => c.group))];
    const foods = [...D.foods].sort((a,b) => readiness(b) - readiness(a) || ((normalizedPrice(b) || 0) - (normalizedPrice(a) || 0)));
    const unlocks = calcCropUnlocks();
    $('#page-farm').innerHTML = `<div class="content-shell">
      <div class="farm-layout">
        <div class="card farm-card">
          <div class="section-head" style="margin:0 0 18px"><div><h2>현재 농장</h2><p>체크한 작물은 브라우저에 바로 저장돼.</p></div><button id="clearFarm" class="btn ghost">전체 해제</button></div>
          <div class="crop-groups">${groups.map(g => `<div class="crop-group"><h3>${esc(g)}</h3>${D.crops.filter(c => c.group === g).map(c => `<label class="crop-check"><input type="checkbox" data-crop="${c.id}" ${state.farm.has(c.id) ? 'checked' : ''}>${c.icon ? `<img src="${c.icon}" alt="">` : `<span style="font-size:20px">${esc(c.emoji || '·')}</span>`}<span>${esc(c.name)}</span></label>`).join('')}</div>`).join('')}</div>
          <div class="note-strip" style="margin-top:16px">세레니티 전용 작물은 기존 정리 기준 성장 15분. 드롭 범위 등은 게임 업데이트에 따라 달라질 수 있어.</div>
        </div>
        <div class="card farm-recommend">
          <div class="section-head" style="margin:0 0 10px"><div><h2>다음 작물 후보</h2><p>1종 추가 시 완성되는 요리 수 기준</p></div></div>
          ${unlocks.length ? unlocks.map((x,i) => {
            const c = D.crops.find(c => c.id === x.id);
            return `<div class="recommend-item">${c.icon ? `<img src="${c.icon}" alt="">` : `<span style="font-size:25px">${esc(c.emoji || '·')}</span>`}<div><div class="name">${String(i + 1).padStart(2,'0')} · ${esc(c.name)}</div><div class="why">관련 ${x.improves}종 · 즉시 완성 ${x.unlock}종</div></div><div class="score">+${x.unlock}</div></div>`;
          }).join('') : `<div class="empty">모든 작물이 체크되어 있어.</div>`}
        </div>
      </div>
      <section class="section"><div class="section-head"><div><h2>내 농장으로 가까운 요리</h2><p>농작물 조건 위주로 정렬했어. 세부 구매·사냥 재료는 상세에서 확인해.</p></div></div><div class="food-grid">${foods.map(f => foodCard(f,false)).join('')}</div></section>
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

  function legacyScopeData() {
    if (!state.legacy) return null;
    if (state.legacyScope === 'expert') {
      const tools = state.legacy.grindel?.toolEnhancement || [];
      return {toolEnhancement: tools};
    }
    return state.legacy[state.legacyScope];
  }

  function legacySubKeys(scopeData) {
    if (!scopeData || typeof scopeData !== 'object') return [];
    if (state.legacyScope === 'wild') return ['all'];
    if (state.legacyScope === 'expert') return ['gathering','mining','fishing'];
    return Object.keys(scopeData).filter(k => k !== 'toolEnhancement');
  }

  function flattenLegacyItems(value, group = '') {
    const out = [];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object') out.push({...item, __group:group});
      }
    } else if (value && typeof value === 'object') {
      for (const [k,v] of Object.entries(value)) out.push(...flattenLegacyItems(v,k));
    }
    return out;
  }

  function matchesLegacy(item, q) {
    if (!q) return true;
    const text = [item.name,item.price,item.recipe,item.probability,item.__group,...(item.headers || []),...(item.rows || []).flat()].filter(Boolean).join(' ').toLowerCase();
    return text.includes(q);
  }

  function legacyItemHTML(item) {
    if (item.type === 'table' && Array.isArray(item.headers) && Array.isArray(item.rows)) {
      return `<div class="legacy-table-wrap"><table class="legacy-table"><thead><tr>${item.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${item.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }
    if (item.recipe) return `<div class="legacy-item recipe"><b>${esc(item.name || '항목')}</b><span>${esc(item.recipe)}</span>${item.price ? `<span>${esc(item.price)}</span>` : ''}${item.probability ? `<span>확률 ${esc(item.probability)}</span>` : ''}</div>`;
    return `<div class="legacy-item"><b>${esc(item.name || item.__group || '항목')}</b><span>${esc(item.price ?? item.value ?? '')}</span></div>`;
  }

  function renderLegacyGroups(scopeData) {
    const q = state.query.trim().toLowerCase();
    if (!scopeData) return '';

    if (state.legacyScope === 'wild') {
      const groups = Object.entries(scopeData);
      return groups.map(([group, items]) => {
        const filtered = (items || []).filter(i => matchesLegacy({...i,__group:group},q));
        if (!filtered.length) return '';
        return `<section class="legacy-group"><h3>${esc(group)}<span>${filtered.length} items</span></h3><div class="legacy-items">${filtered.map(legacyItemHTML).join('')}</div></section>`;
      }).join('');
    }

    if (state.legacyScope === 'expert') {
      const tools = scopeData.toolEnhancement || [];
      const map = {gathering:0,mining:1,fishing:2};
      const selected = state.legacySub || 'gathering';
      const item = tools[map[selected]];
      if (!item || !matchesLegacy(item,q)) return '';
      return `<section class="legacy-group"><h3>${esc(item.name)}<span>강화 정보</span></h3>${legacyItemHTML(item)}</section>`;
    }

    const sub = state.legacySub || Object.keys(scopeData)[0];
    const chosen = scopeData[sub];
    if (!chosen) return '';

    if (Array.isArray(chosen)) {
      const filtered = chosen.filter(i => matchesLegacy(i,q));
      return filtered.length ? `<section class="legacy-group"><h3>${esc(legacySubLabels[sub] || sub)}<span>${filtered.length} items</span></h3><div class="legacy-items">${filtered.map(legacyItemHTML).join('')}</div></section>` : '';
    }

    return Object.entries(chosen).map(([group, value]) => {
      const items = Array.isArray(value) ? value.filter(i => matchesLegacy({...i,__group:group},q)) : flattenLegacyItems(value,group).filter(i => matchesLegacy(i,q));
      if (!items.length) return '';
      return `<section class="legacy-group"><h3>${esc(group)}<span>${items.length} items</span></h3><div class="legacy-items">${items.map(legacyItemHTML).join('')}</div></section>`;
    }).join('');
  }

  function renderReference() {
    const root = $('#page-reference');
    const scopes = ['wild','grindel','collection','expert'];
    const scopeData = legacyScopeData();
    const subs = legacySubKeys(scopeData);
    if (subs.length && !subs.includes(state.legacySub)) state.legacySub = subs[0];

    let body = '';
    if (state.legacyLoading) {
      body = `<div class="card empty"><strong>원본 DB를 불러오는 중이야.</strong>공개 GitHub 원본 데이터를 읽고 있어.</div>`;
    } else if (!state.legacy) {
      body = `<div class="card empty"><strong>원본 DB를 아직 불러오지 못했어.</strong>${state.legacyError ? esc(state.legacyError) : '인터넷 연결이 있으면 자동으로 공개 원본 데이터를 가져와.'}<br><button class="btn" id="reloadLegacy" style="margin-top:12px">다시 불러오기</button></div>`;
    } else {
      const rendered = renderLegacyGroups(scopeData);
      body = `<div class="legacy-toolbar"><div class="legacy-subtabs">${subs.map(k => `<button class="pill ${state.legacySub === k ? 'active' : ''}" data-legacy-sub="${k}">${esc(legacySubLabels[k] || (k === 'all' ? '전체' : k))}</button>`).join('')}</div><span class="reference-status">원본 공개 데이터 snapshot</span></div><div class="card legacy-card">${rendered || `<div class="empty"><strong>검색 결과가 없어.</strong>현재 탭에서 다른 검색어를 써봐.</div>`}</div>`;
    }

    root.innerHTML = `<div class="content-shell">
      <div class="reference-intro"><div><h2>원본 DB 탐색</h2><p>기존 ddingtasearch의 정보 구조를 새 인터페이스 안에 보존했어. 데이터 자체는 공개 원본 GitHub의 regionData.json을 읽어오며, 이 개인DB의 최신 요리 데이터와는 별개로 참고용으로 보여줘.</p></div><div class="scope-tabs">${scopes.map(k => `<button class="scope-tab ${state.legacyScope === k ? 'active' : ''}" data-legacy-scope="${k}">${scopeLabels[k]}</button>`).join('')}</div></div>
      ${body}
      <p class="source-note">원본 공개 사이트/저장소 정보는 참고용이며 일부 값은 현재 게임과 다를 수 있어. 최신 요리·농장 데이터는 이 개인DB 메뉴를 우선해서 봐.</p>
    </div>`;
  }

  function renderPrices() {
    const rows = D.foods.flatMap(f => [[f,false],[f,true]]).filter(([f,g]) => getPrice(f,g));
    $('#page-prices').innerHTML = `<div class="content-shell">
      <div class="connect-hero">
        <div class="card connect-box"><p class="eyebrow">LOCAL FILE ACCESS</p><h2>prices.json 연결</h2><p>게임 쪽 helper가 로컬 JSON을 갱신하면, 브라우저는 네가 직접 고른 그 파일 하나만 읽어. 연결 뒤에는 약 2초마다 변경 여부를 확인해.</p><div class="connect-actions"><button id="connectPriceBtn" class="btn primary">가격 파일 연결</button><button id="loadDemoBtn" class="btn">샘플 보기</button><button id="disconnectPriceBtn" class="btn danger">연결 해제</button></div><div class="steps"><div class="step">모드를 mods 폴더에 넣고 게임 실행</div><div class="step">게임에서 가격 GUI를 한 번 열기</div><div class="step">helper가 화면의 가격 정보를 prices.json에 저장</div><div class="step">이 사이트가 연결된 파일을 자동으로 다시 읽음</div></div></div>
        <div class="card connect-box"><p class="eyebrow">DATA FORMAT</p><h2>가벼운 스냅샷</h2><p>현재 상태를 덮어쓰는 구조라 파일이 계속 커지지 않아.</p><div class="codebox">{
  "updatedAt": "2026-09-30T06:30:00+09:00",
  "prices": {
    "토마토 스파게티": {
      "marketPrice": 416,
      "myPrice": 424,
      "history": [{"day": 27, "price": 337}]
    }
  }
}</div></div>
      </div>
      <section class="section"><div class="section-head"><div><h2>현재 로드된 가격</h2><p>${state.priceMeta?.updatedAt ? `마지막 갱신 ${esc(new Date(state.priceMeta.updatedAt).toLocaleString('ko-KR'))}` : '아직 가격 데이터가 없어.'}</p></div><div class="status-row"><span class="status-dot ${rows.length ? 'on' : ''}"></span>${rows.length ? `${rows.length}개 항목` : '미연결'}</div></div>
      <div class="card price-panel">${rows.length ? `<div class="price-table-wrap"><table class="price-table"><thead><tr><th>음식</th><th>기준 판매가</th><th>나의 판매가</th><th>범위 내 위치</th></tr></thead><tbody>${rows.map(([f,g]) => {
        const p = getPrice(f,g), pct = normalizedPrice(f,g), percent = pct == null ? null : Math.round(pct * 100);
        return `<tr><td>${g ? '황금 · ' : ''}${esc(g ? f.gold.name : f.name)}</td><td>${fmt(p.marketPrice)}</td><td><b>${fmt(p.myPrice ?? p.marketPrice)}</b></td><td>${percent == null ? '—' : `<div class="price-position"><div class="mini-progress"><span style="width:${percent}%"></span></div>${percent}%</div>`}</td></tr>`;
      }).join('')}</tbody></table></div>` : `<div class="empty"><strong>가격 데이터가 없어.</strong>prices.json을 연결하거나 샘플 데이터를 불러와.</div>`}</div></section>
      <div class="note-strip" style="margin-top:14px">사이트는 네가 선택한 <b>prices.json 한 파일</b>만 읽어. GitHub에 가격 파일을 올릴 필요는 없어.</div>
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
    $('#detailDrawer').innerHTML = `<div class="drawer-inner"><button class="drawer-close" aria-label="닫기">×</button><div class="drawer-hero"><div class="pixel-wrap"><img class="pixel" src="${image}" alt=""></div><div><span class="grade ${gold ? 'GOLD' : food.grade}">${esc(gradeText(g))}</span><h2>${esc(name)}</h2><div class="muted" style="font-size:10px">판매 범위 ${fmt(min)} — ${fmt(max)}</div></div></div>
      <div class="drawer-section"><h3>${gold ? '황금 제작법 · 대량' : '레시피'}</h3><div class="recipe-list">${recipe.map(([id,n]) => {
        const ing = resolveIngredient(id);
        return `<div class="recipe-line">${iconHTML(ing)}<div><div class="rname">${esc(ing.name)}</div><div class="rsource">${esc(ing.source)}</div></div><div class="qty">×${n}</div></div>`;
      }).join('')}</div></div>
      ${gold ? `<div class="drawer-section"><h3>황금 제작법 · 소량</h3><div class="recipe-list">${food.gold.single.recipe.map(([id,n]) => {
        const ing = resolveIngredient(id);
        return `<div class="recipe-line">${iconHTML(ing)}<div><div class="rname">${esc(ing.name)}</div><div class="rsource">${esc(ing.source)}</div></div><div class="qty">×${n}</div></div>`;
      }).join('')}</div></div>` : ''}
      ${!gold ? `<div class="drawer-section"><h3>내 농장 관점</h3><div class="drawer-text">필요 농작물 · ${crops.length ? esc(crops.join(', ')) : '없음'}<br>${miss.length ? `아직 없는 작물 · <b>${esc(miss.join(', '))}</b>` : '<b>농작물 조건은 모두 충족했어.</b>'}</div></div><div class="drawer-section"><h3>실제 NPC 구매비</h3><div class="drawer-text"><b>${fmt(npcCashCostFood(food))}</b><br>직접 수급 재료의 가치는 넣지 않고 실제 NPC 구매가 필요한 재료만 합산.</div></div>` : ''}
      <div class="drawer-section"><h3>현재 가격</h3><div class="drawer-text">${p ? `기준 ${fmt(p.marketPrice)} · 나의 판매가 <b>${fmt(p.myPrice ?? p.marketPrice)}</b>` : '가격 파일에서 아직 이 음식 값을 읽지 못했어.'}</div>${p?.history?.length ? `<div class="mini-list" style="margin-top:10px">${p.history.map(h => `<div class="mini-row"><span>${esc(h.date || h.day + '일')}</span><b>${fmt(h.price)}</b></div>`).join('')}</div>` : ''}</div>
      <p class="source-note">개인DB 정리 데이터와 업로드된 서버 리소스 이미지를 기준으로 표시.</p></div>`;
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
    if (page === 'reference' && !state.legacy && !state.legacyLoading) loadLegacyData();
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function syncPriceStatus() {
    const count = Object.keys(state.prices).length;
    $('#sidePriceStatus').textContent = count ? `연동됨 · ${count}개` : '연결 안 됨';
    $('#sidePriceDot').classList.toggle('on', !!count);
    $('#sidePriceUpdated').textContent = state.priceMeta?.updatedAt ? `마지막 갱신 ${new Date(state.priceMeta.updatedAt).toLocaleString('ko-KR')}` : 'prices.json을 연결하면 자동 갱신돼.';
    const quick = $('#quickConnect');
    if (quick) quick.innerHTML = `<span class="connect-indicator" style="background:${count ? '#78d19b' : '#83b59c'}"></span>${count ? '가격 연동됨' : '가격 연결'}`;
  }

  function normalizePriceData(obj) {
    const src = obj?.prices || obj || {};
    const out = {};
    for (const [name,val] of Object.entries(src)) {
      if (typeof val === 'number') out[name] = {marketPrice:val, myPrice:val, history:[]};
      else if (val && typeof val === 'object') out[name] = {
        marketPrice:num(val.marketPrice ?? val.price ?? val.current),
        myPrice:num(val.myPrice ?? val.personalPrice ?? val.marketPrice ?? val.price ?? val.current),
        history:Array.isArray(val.history) ? val.history : [],
      };
    }
    return {prices:out, meta:{updatedAt:obj.updatedAt || obj.generatedAt || new Date().toISOString(), source:obj.source || 'file'}};
  }

  function num(v) {
    if (v == null || v === '') return null;
    const n = Number(String(v).replace(/,/g,''));
    return Number.isFinite(n) ? n : null;
  }

  async function applyPriceObject(obj) {
    const n = normalizePriceData(obj);
    state.prices = n.prices;
    state.priceMeta = n.meta;
    renderAll();
    toast(`가격 ${Object.keys(n.prices).length}개를 불러왔어.`);
  }

  const DB = 'dding-personal-db', STORE = 'handles';
  function idbOpen() { return new Promise((res,rej) => { const r=indexedDB.open(DB,1); r.onupgradeneeded=()=>r.result.createObjectStore(STORE); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
  async function idbSet(key,val) { const db=await idbOpen(); return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite'); tx.objectStore(STORE).put(val,key); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error);}); }
  async function idbGet(key) { const db=await idbOpen(); return new Promise((res,rej)=>{const r=db.transaction(STORE).objectStore(STORE).get(key); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error);}); }
  async function idbDel(key) { const db=await idbOpen(); return new Promise((res,rej)=>{const tx=db.transaction(STORE,'readwrite'); tx.objectStore(STORE).delete(key); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error);}); }

  async function connectPriceFile() {
    if (!window.showOpenFilePicker) { $('#fallbackPriceFile').click(); return; }
    try {
      if (state.priceHandle && await ensurePermission(state.priceHandle,true)) {
        await readHandle(false); startPolling(); toast('기존 가격 파일 연결을 다시 활성화했어.'); return;
      }
      const [handle] = await showOpenFilePicker({types:[{description:'띵타 가격 JSON',accept:{'application/json':['.json']}}],multiple:false});
      state.priceHandle = handle;
      await idbSet('priceFile',handle);
      await readHandle(false);
      startPolling();
    } catch (e) {
      if (e.name !== 'AbortError') toast('파일 연결 실패: ' + e.message);
    }
  }

  async function ensurePermission(handle, request = false) {
    if (!handle) return false;
    const opt = {mode:'read'};
    if ((await handle.queryPermission(opt)) === 'granted') return true;
    if (request && (await handle.requestPermission(opt)) === 'granted') return true;
    return false;
  }

  async function readHandle(requestPermission = false) {
    const h = state.priceHandle;
    if (!h || !(await ensurePermission(h,requestPermission))) return false;
    try {
      const f = await h.getFile();
      const obj = JSON.parse(await f.text());
      const n = normalizePriceData(obj);
      const sig = JSON.stringify(n);
      const old = JSON.stringify({prices:state.prices,meta:state.priceMeta});
      if (sig !== old) { state.prices=n.prices; state.priceMeta=n.meta; renderAll(); }
      return true;
    } catch (e) { console.warn(e); return false; }
  }

  function startPolling() { clearInterval(state.priceTimer); state.priceTimer = setInterval(() => readHandle(false), 2000); }
  async function disconnectPrice() { clearInterval(state.priceTimer); state.priceHandle=null; state.prices={}; state.priceMeta=null; await idbDel('priceFile').catch(()=>{}); renderAll(); toast('가격 연결을 해제했어.'); }
  async function restoreHandle() { try { const h=await idbGet('priceFile'); if(h){state.priceHandle=h; const ok=await readHandle(false); if(ok) startPolling();} } catch(e) {} }

  function saveFarm() { localStorage.setItem('ddingFarm',JSON.stringify([...state.farm])); renderAll(); }

  function updateNextPriceChange() {
    const el = $('#nextChange');
    if (!el) return;
    const now = new Date();
    const dates = [1,3,6,9,12,15,18,21,24,27,30];
    let target = null;
    for (let m=0; m<2 && !target; m++) {
      const y = now.getFullYear(), mo = now.getMonth() + m;
      for (const d of dates) {
        const t = new Date(y,mo,d,3,0,0);
        if (t > now) { target=t; break; }
      }
    }
    if (!target) target = new Date(now.getFullYear(), now.getMonth()+1, 1, 3);
    const diff = target - now;
    const days = Math.floor(diff/86400000), hrs = Math.floor((diff%86400000)/3600000), mins = Math.floor((diff%3600000)/60000);
    el.textContent = days ? `${days}일 ${hrs}시간` : `${hrs}시간 ${mins}분`;
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._tm);
    t._tm = setTimeout(() => t.hidden = true, 2400);
  }

  async function loadLegacyData(force = false) {
    if (state.legacyLoading) return;
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(LEGACY_CACHE_KEY) || 'null');
        if (cached?.data && Date.now() - cached.savedAt < 1000*60*60*24) {
          state.legacy = cached.data;
          renderReference();
          return;
        }
      } catch(e) {}
    }
    state.legacyLoading = true;
    state.legacyError = '';
    renderReference();
    try {
      const r = await fetch(LEGACY_URL, {cache:'no-store'});
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      state.legacy = await r.json();
      localStorage.setItem(LEGACY_CACHE_KEY, JSON.stringify({savedAt:Date.now(), data:state.legacy}));
    } catch(e) {
      state.legacyError = '공개 원본 데이터를 가져오지 못했어. 인터넷 연결 뒤 다시 시도해줘.';
      try {
        const cached = JSON.parse(localStorage.getItem(LEGACY_CACHE_KEY) || 'null');
        if (cached?.data) state.legacy = cached.data;
      } catch (_) {}
    } finally {
      state.legacyLoading = false;
      renderReference();
    }
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
      body.innerHTML = `<div class="tool-block"><div id="timerDisplay" class="timer-display">15:00</div><div class="timer-presets"><button data-timer-preset="300">5분</button><button data-timer-preset="900">15분</button><button data-timer-preset="1800">30분</button><button data-timer-preset="3600">60분</button></div><div class="timer-actions"><button id="timerStart" class="btn primary">${state.timer.target ? '일시정지' : '시작'}</button><button id="timerReset" class="btn">초기화</button></div></div><div class="note-strip">타이머를 시작한 뒤 패널을 닫아도 계속 흘러가. 같은 브라우저에서는 새로고침 후에도 남은 시간을 복원해.</div>`;
      updateTimerDisplay();
    } else if (state.activeTool === 'memo') {
      $('#toolEyebrow').textContent = 'UTILITY 03';
      $('#toolTitle').textContent = '메모';
      const text = localStorage.getItem('ddingMemo') || '';
      body.innerHTML = `<textarea id="memoArea" class="memo-area" placeholder="오늘 해야 할 것, 살 것, 만들어야 할 것…">${esc(text)}</textarea><div class="memo-foot"><span>자동 저장</span><span id="memoCount">${text.length} chars</span></div>`;
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
    state.timer.duration = seconds;
    state.timer.remaining = seconds;
    state.timer.target = 0;
    clearInterval(state.timer.interval);
    state.timer.interval = null;
    persistTimer();
    updateTimerDisplay();
    const btn=$('#timerStart'); if(btn) btn.textContent='시작';
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
    const m = Math.floor(total/60), s = total%60;
    el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
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
    if (e.target.closest('#quickConnect') || e.target.closest('#connectPriceBtn') || e.target.closest('#sideConnect')) { await connectPriceFile(); return; }
    if (e.target.closest('#disconnectPriceBtn')) { await disconnectPrice(); return; }
    if (e.target.closest('#loadDemoBtn')) { try { await applyPriceObject(await (await fetch('prices.example.json',{cache:'no-store'})).json()); } catch { toast('샘플 파일을 불러오지 못했어. 웹서버에서 열어줘.'); } return; }
    const fil = e.target.closest('[data-filter]');
    if (fil) { state.cookingFilter=fil.dataset.filter; renderCooking(); return; }
    const view = e.target.closest('[data-view]');
    if (view) { state.cookingView=view.dataset.view; localStorage.setItem('ddingCookingView',state.cookingView); renderCooking(); return; }
    const scope = e.target.closest('[data-legacy-scope]');
    if (scope) { state.legacyScope=scope.dataset.legacyScope; state.legacySub=''; localStorage.setItem('ddingLegacyScope',state.legacyScope); renderReference(); return; }
    const sub = e.target.closest('[data-legacy-sub]');
    if (sub) { state.legacySub=sub.dataset.legacySub; renderReference(); return; }
    const finderFilter = e.target.closest('[data-finder-filter]');
    if (finderFilter) { state.finderFilter=finderFilter.dataset.finderFilter; localStorage.setItem('ddingFinderFilter',state.finderFilter); renderFinder(); return; }
    const fontChoice = e.target.closest('[data-font-choice]');
    if (fontChoice) { state.fontChoice=fontChoice.dataset.fontChoice; localStorage.setItem('ddingFontChoice',state.fontChoice); applyDisplayPrefs(); renderTool(); return; }
    if (e.target.closest('#resetAppearance')) { state.fontChoice='gmarket'; state.fontScale=1; localStorage.setItem('ddingFontChoice','gmarket'); localStorage.setItem('ddingFontScale','1'); applyDisplayPrefs(); renderTool(); toast('환경 설정을 기본값으로 돌렸어.'); return; }
    if (e.target.closest('#reloadLegacy')) { loadLegacyData(true); return; }
    const card = e.target.closest('.food-card');
    if (card && e.target.closest('.detail-btn')) { openDrawer(foodBySlug(card.dataset.food), card.dataset.gold === '1'); return; }
    if (card && e.target.closest('.gold-toggle')) { openDrawer(foodBySlug(card.dataset.food), card.dataset.gold !== '1'); return; }
    if (e.target.closest('.drawer-close') || e.target.id === 'drawerBackdrop') { closeDrawer(); return; }
    if (e.target.closest('#clearFarm')) { state.farm.clear(); saveFarm(); return; }
    const preset = e.target.closest('[data-timer-preset]');
    if (preset) { setTimerDuration(Number(preset.dataset.timerPreset)); return; }
    if (e.target.closest('#timerStart')) { startPauseTimer(); return; }
    if (e.target.closest('#timerReset')) { resetTimer(); return; }
  });

  document.addEventListener('change', e => {
    const c = e.target.closest('[data-crop]');
    if (c) { c.checked ? state.farm.add(c.dataset.crop) : state.farm.delete(c.dataset.crop); saveFarm(); return; }
    if (e.target.id === 'calcFood') { selectCalcFood(e.target.value); return; }
  });

  document.addEventListener('input', e => {
    if (['calcSale','calcQty','calcCost','calcExtra'].includes(e.target.id)) updateCalc();
    if (e.target.id === 'memoArea') {
      localStorage.setItem('ddingMemo', e.target.value);
      const count=$('#memoCount'); if(count) count.textContent=`${e.target.value.length} chars`;
    }
    if (e.target.id === 'fontScaleRange') {
      state.fontScale = Number(e.target.value) || 1;
      localStorage.setItem('ddingFontScale', String(state.fontScale));
      applyDisplayPrefs();
    }
  });

  $('#globalSearch').addEventListener('input', e => { state.query=e.target.value; renderCurrent(); });
  $('#globalSearch').addEventListener('keydown', e => {
    if(e.key==='Escape'){e.target.value='';state.query='';renderCurrent();e.target.blur();}
    if(e.key==='Enter' && state.query.trim()){switchPage('finder');renderFinder();}
  });
  $('#fallbackPriceFile').addEventListener('change', async e => { const f=e.target.files[0]; if(!f)return; try{await applyPriceObject(JSON.parse(await f.text()));}catch{toast('JSON 형식을 확인해줘.');} });

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
    floatingTooltip.style.display = 'block';
    positionFloatingTooltip(e);
  });

  document.addEventListener('mouseout', e => {
    const chip = e.target.closest('[data-tip]');
    if (chip && !e.relatedTarget?.closest?.('[data-tip]')) hideFloatingTooltip();
  });

  window.addEventListener('scroll', hideFloatingTooltip, true);
  window.addEventListener('resize', hideFloatingTooltip);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeDrawer(); closeTool(); }
    if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      e.preventDefault(); $('#globalSearch').focus();
    }
  });

  renderAll();
  switchPage('dashboard');
  restoreHandle();
  restoreTimer();
  setInterval(updateNextPriceChange,60000);
})();
