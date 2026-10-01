(() => {
  'use strict';

  const OFFICIAL = {
    itemCategory: 'https://wiki.ddingtycoon.kr/ko/categories/%EC%95%84%EC%9D%B4%ED%85%9C-%EC%A0%95%EB%B3%B4-83d9c123',
    general: 'https://wiki.ddingtycoon.kr/ko/articles/%EC%9D%BC%EB%B0%98-%EC%95%84%EC%9D%B4%ED%85%9C-42c1a1d0',
    wild: 'https://wiki.ddingtycoon.kr/ko/articles/%EC%95%BC%EC%83%9D-%EC%95%84%EC%9D%B4%ED%85%9C-df9f70ad',
    badge: 'https://wiki.ddingtycoon.kr/ko/articles/%EB%B1%83%EC%A7%80-%EC%95%84%EC%9D%B4%ED%85%9C-febe63a3',
    serenity: 'https://wiki.ddingtycoon.kr/ko/articles/%EC%84%B8%EB%A0%88%EB%8B%88%ED%8B%B0-%EC%95%84%EC%9D%B4%ED%85%9C-85e4c935',
    lumidia: 'https://wiki.ddingtycoon.kr/ko/articles/%EB%A3%A8%EB%AF%B8%EB%94%94%EC%95%84-%EC%95%84%EC%9D%B4%ED%85%9C-be51372a',
    paradise: 'https://wiki.ddingtycoon.kr/ko/articles/%ED%8C%8C%EB%9D%BC%EB%8B%A4%EC%9D%B4%EC%8A%A4-%EC%95%84%EC%9D%B4%ED%85%9C-82875065',
    capsule: 'https://wiki.ddingtycoon.kr/ko/articles/%EC%BA%A1%EC%8A%90-%ED%99%95%EB%A5%A0-aabb235b',
    supply: 'https://wiki.ddingtycoon.kr/ko/articles/%EB%B3%B4%EA%B8%89%ED%92%88-%ED%99%95%EB%A5%A0-8a6754a1',
    randomBox: 'https://wiki.ddingtycoon.kr/ko/articles/%EB%9E%9C%EB%8D%A4-%EB%B0%95%EC%8A%A4-%ED%99%95%EB%A5%A0-f19a44f1',
    miscOdds: 'https://wiki.ddingtycoon.kr/ko/articles/%EA%B8%B0%ED%83%80-%EC%95%84%EC%9D%B4%ED%85%9C-%ED%99%95%EB%A5%A0-a56d6764',
    crafting: 'https://wiki.ddingtycoon.kr/ko/articles/%EC%A0%9C%EC%9E%91-%EC%8B%9C%EC%84%A4-804e71dc',
    enhancement: 'https://wiki.ddingtycoon.kr/ko/articles/%EB%8F%84%EA%B5%AC-%EA%B0%95%ED%99%94-7acb3b1c',
    sagePickaxe: 'https://wiki.ddingtycoon.kr/ko/articles/%EC%84%B8%EC%9D%B4%EC%A7%80-%EA%B3%A1%EA%B4%AD%EC%9D%B4-1f350b99',
    sageHoe: 'https://wiki.ddingtycoon.kr/ko/articles/%EC%84%B8%EC%9D%B4%EC%A7%80-%EA%B4%AD%EC%9D%B4-d1378ba6',
    treasure: 'https://wiki.ddingtycoon.kr/ko/articles/%EB%B3%B4%EB%AC%BC%EC%83%81%EC%9E%90-3a840e35',
    currency: 'https://wiki.ddingtycoon.kr/ko/articles/%EC%9E%AC%ED%99%94-66c4b5df',
    noctilaEquipment: 'https://wiki.ddingtycoon.kr/ko/articles/%EC%9E%A5%EB%B9%84-d41aca39',
    noctilaWeaponEnhancement: 'https://wiki.ddingtycoon.kr/ko/articles/%EB%AC%B4%EA%B8%B0-%EA%B0%95%ED%99%94-12cc57bc',
    noctilaSkillEnhancement: 'https://wiki.ddingtycoon.kr/ko/articles/%EC%8A%A4%ED%82%AC-%EA%B0%95%ED%99%94-f436585f',
    noctilaAccessoryEnhancement: 'https://wiki.ddingtycoon.kr/ko/articles/%EC%9E%A5%EC%8B%A0%EA%B5%AC-%EA%B0%95%ED%99%94-53e5f17d',
    noctilaRune: 'https://wiki.ddingtycoon.kr/ko/articles/%EB%A3%AC-0b22a641',
    coordinateScroll: 'https://wiki.ddingtycoon.kr/ko/articles/%EC%A2%8C%ED%91%9C-%EC%8A%A4%ED%81%AC%EB%A1%A4-fd1ebce8',
    noctilaMiniboss: 'https://wiki.ddingtycoon.kr/ko/articles/%EB%AF%B8%EB%8B%88%EB%B3%B4%EC%8A%A4-388289ea',
    noctilaNormalMonster: 'https://wiki.ddingtycoon.kr/ko/articles/%EC%9D%BC%EB%B0%98-%EB%AA%AC%EC%8A%A4%ED%84%B0-4475e4c1',
    noctilaAlphaMonster: 'https://wiki.ddingtycoon.kr/ko/articles/%EC%95%8C%ED%8C%8C-%EB%AA%AC%EC%8A%A4%ED%84%B0-6399f6a6',
    noctilaOmegaMonster: 'https://wiki.ddingtycoon.kr/ko/articles/%EC%98%A4%EB%A9%94%EA%B0%80-%EB%AA%AC%EC%8A%A4%ED%84%B0-496d73af'
  };

  const items = [];
  const byName = new Map();
  function normalizeName(name){ return String(name || '').replace(/\s+/g,' ').trim(); }
  function addItem(name, meta={}) {
    name = normalizeName(name);
    if (!name) return;
    const prev = byName.get(name);
    if (prev) {
      Object.assign(prev, Object.fromEntries(Object.entries(meta).filter(([,v]) => v != null && v !== '')));
      return prev;
    }
    const item = {
      name,
      region: meta.region || '기타',
      category: meta.category || '기타',
      subcategory: meta.subcategory || '',
      acquire: meta.acquire || '공식 아이템 목록에 등재되어 있으나 세부 획득처 설명은 별도 확인이 필요합니다.',
      use: meta.use || '공식 아이템 목록에서 세부 사용처가 별도로 설명되지 않은 항목입니다.',
      recipe: meta.recipe || [],
      related: meta.related || [],
      aliases: meta.aliases || [],
      note: meta.note || '',
      official: meta.official !== false,
      sourceUrl: meta.sourceUrl || OFFICIAL.itemCategory,
      sourceLabel: meta.sourceLabel || '공식 위키',
      probability: meta.probability || '',
      trade: meta.trade || '',
      tags: meta.tags || [],
      shopEntries: meta.shopEntries || [],
      verified: meta.verified || '2026-10-02'
    };
    items.push(item); byName.set(name,item); return item;
  }
  function addMany(names, meta={}) {
    const arr = Array.isArray(names) ? names : String(names).split('|');
    return arr.map(n => addItem(n.trim(), {...meta})).filter(Boolean);
  }
  function update(name, patch){ return addItem(name, patch); }

  // ─────────────────────────────────────────────────────────────
  // 기본/공통 아이템 — 공식 위키 '일반 아이템'
  // ─────────────────────────────────────────────────────────────
  addMany('크기 강화권|멤버 강화권|워프 강화권|호퍼 강화권|경작지 강화권|트로피 강화권', {
    region:'스폰', category:'마을', subcategory:'마을 업그레이드권',
    acquire:'스폰 그린 마을회관의 소피에게서 구입합니다.', use:'마을의 해당 기능/한도를 업그레이드할 때 사용하는 아이템입니다.', sourceUrl:OFFICIAL.general
  });
  addMany('상자 정리 도구|상자 잠금 자물쇠|상자 잠금 해제 열쇠', {
    region:'스폰', category:'마을', subcategory:'상자 기능', acquire:'스폰 그린 마을회관의 소피에게서 구입합니다.', use:'마을 상자의 정리·잠금·잠금 해제 기능에 사용합니다.', sourceUrl:OFFICIAL.general
  });
  addItem('기반암 제거권',{region:'스폰',category:'마을',subcategory:'기반암 제거',acquire:'스폰 그린 마을회관의 맥스에게서 구입합니다.',use:'마을의 기반암 제거에 사용하는 아이템입니다.',sourceUrl:OFFICIAL.general});
  addItem('어빌리티 스톤',{region:'세레니티',category:'특별 아이템',subcategory:'스킬 아이템',acquire:'세레니티 강화 제작 시설에서 제작합니다.',use:'세이지 도구/모듈/어선 등 여러 제작에 들어가는 핵심 재료입니다.',recipe:[['코룸 주괴',1],['리프톤 주괴',1],['세렌트 주괴',1]],sourceUrl:OFFICIAL.crafting,aliases:['어빌리시 스톤']});
  addItem('스킬 펄스',{region:'세레니티',category:'특별 아이템',subcategory:'스킬 아이템',acquire:'광석 채광 중 확률적으로 등장하는 코비를 처치해 얻습니다.',use:'스킬 관련 성장에 사용하는 아이템입니다.',sourceUrl:OFFICIAL.general});
  addItem('스킬 프리즘',{region:'공통',category:'특별 아이템',subcategory:'스킬 아이템',acquire:'보물상자 등에서 획득합니다.',use:'스킬 관련 성장에 사용하는 아이템입니다.',sourceUrl:OFFICIAL.general});
  addItem('스킬 아크',{region:'공통',category:'특별 아이템',subcategory:'스킬 아이템',acquire:'대형 제작대 제작, 제니에게 구매, 추천 보상 등으로 얻습니다.',use:'스킬 관련 성장에 사용하는 아이템입니다.',sourceUrl:OFFICIAL.general});
  addMany('권한 해금권|무한 물 요술봉|귀속 해제 스크롤|머리 추출권|도구 스킨 제거/추출권|의뢰 리롤권|유저상점 홍보권|플리마켓 홍보권|플래그 포인트|재배 전문가 초기화권|채광 전문가 초기화권|해양 전문가 초기화권|사냥 전문가 초기화권|전문가 선택 초기화권|전문가 전체 초기화권',{
    region:'스폰', category:'특별 아이템', subcategory:'유틸 아이템', acquire:'로얄상점의 루아에게서 구입할 수 있습니다.',use:'이름에 표시된 서버 편의/초기화 기능을 수행합니다.',sourceUrl:OFFICIAL.general
  });
  addItem('분해된 뱃지',{region:'스폰',category:'뱃지',subcategory:'분해 재료',acquire:'뱃지 획득권을 강철 채석장의 두리에게 분해하여 얻습니다.',use:'뱃지 관련 교환/재료로 사용하는 아이템입니다.',sourceUrl:OFFICIAL.general});
  addItem('골드하프',{region:'공통',category:'특별 아이템',acquire:'접속 보상으로 획득합니다.',sourceUrl:OFFICIAL.general});
  addItem('크로마 코인',{region:'공통',category:'이벤트/패스',acquire:'크로마 패스 기간에 크로마 패스 상점에서 구입할 수 있습니다.',sourceUrl:OFFICIAL.general});

  // ─────────────────────────────────────────────────────────────
  // 야생 아이템
  // ─────────────────────────────────────────────────────────────
  addMany('익히지 않은 소 갈비살|익힌 소 갈비살|익히지 않은 소 등심|익힌 소 등심',{region:'야생',category:'사냥',subcategory:'소고기',acquire:'야생의 소를 사냥해 얻습니다. 익힌 항목은 해당 고기를 조리해 얻습니다.',use:'요리/제작 재료로 사용합니다.',sourceUrl:OFFICIAL.wild});
  addMany('익히지 않은 돼지 삼겹살|익힌 돼지 삼겹살|익히지 않은 돼지 앞다리살|익힌 돼지 앞다리살',{region:'야생',category:'사냥',subcategory:'돼지고기',acquire:'야생의 돼지를 사냥해 얻습니다. 익힌 항목은 해당 고기를 조리해 얻습니다.',use:'요리/제작 재료로 사용합니다.',sourceUrl:OFFICIAL.wild});
  addMany('익히지 않은 양 갈비살|익힌 양 갈비살|익히지 않은 양 다리살|익힌 양 다리살',{region:'야생',category:'사냥',subcategory:'양고기',acquire:'야생의 양을 사냥해 얻습니다. 익힌 항목은 해당 고기를 조리해 얻습니다.',use:'요리/제작 재료로 사용합니다.',sourceUrl:OFFICIAL.wild});
  addMany('익히지 않은 닭 가슴살|익힌 닭 가슴살|익히지 않은 닭 다리살|익힌 닭 다리살',{region:'야생',category:'사냥',subcategory:'닭고기',acquire:'야생의 닭을 사냥해 얻습니다. 익힌 항목은 해당 고기를 조리해 얻습니다.',use:'요리/제작 재료로 사용합니다.',sourceUrl:OFFICIAL.wild});
  addMany('좀비의 심장|스켈레톤의 심장|거미의 심장|크리퍼의 심장',{region:'야생',category:'사냥',subcategory:'몬스터 심장',acquire:'야생의 해당 몬스터를 처치해 얻습니다.',use:'야생 관련 제작/콘텐츠 재료입니다.',sourceUrl:OFFICIAL.wild});
  addItem('석유',{region:'야생',category:'채광',acquire:'야생의 석유 원석 또는 심층암 원석을 드릴로 채광해 얻습니다.',use:'연료/가공 계열 재료입니다.',sourceUrl:OFFICIAL.wild});
  addMany('토파즈|사파이어|플래티넘',{region:'야생',category:'채광',subcategory:'광물',acquire:'야생의 해당 원석 또는 심층암 원석을 드릴로 채광해 얻습니다.',use:'제련 및 제작 재료입니다.',sourceUrl:OFFICIAL.wild});
  addMany('토파즈 주괴|사파이어 주괴|플래티넘 주괴',{region:'야생',category:'채광',subcategory:'주괴',acquire:'화로나 용광로에서 해당 광물을 제련해 얻습니다.',use:'제작 재료입니다.',sourceUrl:OFFICIAL.wild});
  addMany('노말 일꾼 골렘|레어 일꾼 골렘|에픽 일꾼 골렘',{region:'야생',category:'채광',subcategory:'일꾼 골렘',acquire:'광석 골렘에게 광물 캔디를 제공하여 얻습니다.',use:'일꾼 골렘 콘텐츠에 사용합니다.',sourceUrl:OFFICIAL.wild});
  addMany('익히지 않은 새우|익힌 새우|익히지 않은 도미|익힌 도미|익히지 않은 청어|익힌 청어|금붕어|농어',{region:'야생',category:'낚시',subcategory:'물고기',acquire:'야생에서 낚시로 얻습니다. 익힌 항목은 조리해 얻습니다.',use:'세이지 낚싯대 제작, 회 제작 등 여러 제작에 사용합니다.',sourceUrl:OFFICIAL.wild});
  addMany('깐 새우|도미 회|청어 회|금붕어 회|농어 회',{region:'야생',category:'낚시',subcategory:'회',acquire:'야생 물고기를 대형 제작대에서 가공해 제작합니다.',use:'세레니티 연금 제작 등에 사용합니다.',sourceUrl:OFFICIAL.wild});
  addItem('켈프 더미',{region:'야생',category:'채집',acquire:'켈프를 대형 제작대에서 제작합니다.',use:'세레니티 연금 제작 재료입니다.',sourceUrl:OFFICIAL.wild});
  addMany('은은한 결정|용감한 결정|고요한 결정|소박한 결정|아련한 결정',{region:'야생',category:'품질',subcategory:'커먼 결정',acquire:'야생의 일반적인 채광·사냥·낚시·벌목·채집으로 얻습니다.',use:'상위 결정/코어 제작 등 품질 시스템 재료입니다.',sourceUrl:OFFICIAL.wild});
  addMany('광휘의 결정|위대한 결정|청명한 결정|영롱한 결정|화사한 결정',{region:'야생',category:'품질',subcategory:'레어 결정',acquire:'야생의 특정 채광·사냥·낚시·벌목·채집 또는 커먼 결정을 모아 제작해 얻습니다.',use:'상위 코어/품질 시스템 재료입니다.',sourceUrl:OFFICIAL.wild});
  addItem('순진무구한 코어',{region:'야생',category:'품질',subcategory:'코어',acquire:'커먼 등급 결정을 모아 대형 제작대에서 제작합니다.',sourceUrl:OFFICIAL.wild});
  addItem('영광스러운 코어',{region:'야생',category:'품질',subcategory:'코어',acquire:'레어 등급 결정을 모아 대형 제작대에서 제작합니다.',sourceUrl:OFFICIAL.wild});
  ['루키','커먼','노멀','레어','에픽','전설','미식'].forEach(g=>{
    addItem(`${g} 등급 일반 인챈트북`,{region:'야생',category:'강화',subcategory:'일반 인챈트북',acquire:'스폰의 두리 또는 맥스에게 구매하거나 캡슐/풍선에서 얻습니다.',use:'야생 장비 일반 인챈트에 사용합니다.',sourceUrl:OFFICIAL.wild});
    addItem(`${g} 등급 특수 인챈트북`,{region:'야생',category:'강화',subcategory:'특수 인챈트북',acquire:'캡슐과 풍선에서 얻습니다.',use:'야생 장비 특수 인챈트에 사용합니다.',sourceUrl:OFFICIAL.wild});
  });
  addItem('인챈트북 조각',{region:'스폰',category:'강화',acquire:'인챈트북을 강철 채석장의 두리에게 분해하여 얻습니다.',use:'인챈트 관련 교환/제작 재료입니다.',sourceUrl:OFFICIAL.wild});
  addItem('야생 장비 파괴 방지권',{region:'스폰',category:'강화',acquire:'스폰 그린 마을회관의 맥스에게 구매합니다.',use:'야생 장비 강화 시 파괴 방지 용도로 사용합니다.',sourceUrl:OFFICIAL.wild});
  addMany('그린 일반 인챈트 캡슐|블루 일반 인챈트 캡슐',{region:'스폰',category:'강화',subcategory:'일반 인챈트 캡슐',acquire:'강철 채석장의 두리에게 구매하거나 풍선에서 얻습니다.',use:'열어 일반 인챈트북류를 획득합니다.',sourceUrl:OFFICIAL.wild});
  addMany('하급 특수 인챈트 캡슐|상급 특수 인챈트 캡슐|전설 특수 인챈트 캡슐|신화 특수 인챈트 캡슐',{region:'스폰',category:'강화',subcategory:'특수 인챈트 캡슐',acquire:'두리 또는 맥스에게 구매하거나 풍선에서 얻습니다.',use:'열어 특수 인챈트북류를 획득합니다.',sourceUrl:OFFICIAL.wild});
  addMany('작업 램프|모험 램프',{region:'스폰',category:'강화',subcategory:'램프',acquire:'강철 채석장의 두리에게 구매합니다.',sourceUrl:OFFICIAL.wild});
  addItem('골든티켓',{region:'야생',category:'특별 아이템',acquire:'컬렉션북·오션오더·광석 골렘·풍선 등을 통해 얻습니다.',sourceUrl:OFFICIAL.wild});
  addMany('블루 컬렉션북 캡슐|퍼플 컬렉션북 캡슐',{region:'스폰',category:'특별 아이템',acquire:'그린 마을회관의 맥스에게 구매합니다.',use:'컬렉션북 관련 보상을 획득하는 캡슐입니다.',sourceUrl:OFFICIAL.wild});
  addItem('음산한 열쇠',{region:'스폰',category:'특별 아이템',acquire:'그린 마을회관의 맥스에게 구매합니다.',sourceUrl:OFFICIAL.wild});

  // ─────────────────────────────────────────────────────────────
  // 세레니티 — 채집/요리
  // ─────────────────────────────────────────────────────────────
  addMany('토마토 씨앗|양파 씨앗|마늘 씨앗',{region:'세레니티',category:'채집',subcategory:'씨앗',acquire:'세레니티 밭의 작물을 세이지 괭이로 채집해 얻습니다.',use:'내 마을 경작지에 심어 해당 작물을 기릅니다.',sourceUrl:OFFICIAL.serenity});
  addMany('토마토|양파|마늘',{region:'세레니티',category:'채집',subcategory:'작물',acquire:'내 마을 경작지에 해당 씨앗을 심고 길러 수확합니다.',use:'베이스 및 요리 재료로 사용합니다.',sourceUrl:OFFICIAL.serenity});
  addMany('파인애플|코코넛',{region:'세레니티',category:'채집',subcategory:'과일',acquire:'세레니티 과수원의 과일을 손으로 채집합니다.',use:'요리 재료로 사용합니다.',sourceUrl:OFFICIAL.serenity});
  addMany('소금|요리용 달걀|요리용 우유|오일',{region:'세레니티',category:'요리',subcategory:'구매 식재료',acquire:'세레니티 마을의 밀키에게서 구입합니다.',use:'요리/가공 식재료입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('설탕 큐브|요리용 소금|치즈 조각|밀가루 반죽|버터 조각',{region:'세레니티',category:'요리',subcategory:'가공 식재료',acquire:'세레니티 마을의 농작물 가공 시설에서 농작물과 구매 식재료를 조합해 얻습니다.',use:'요리 제작 시설의 레시피 재료입니다.',sourceUrl:OFFICIAL.serenity});
  update('설탕 큐브',{recipe:[['사탕수수',64]],note:'현재 사이트 기준 정정: 사탕수수 64개를 가공해 설탕 큐브를 만듭니다.'});
  addMany('당근 묶음|감자 묶음|비트 묶음|호박 묶음|수박 묶음|달콤한 열매 묶음',{region:'세레니티',category:'요리',subcategory:'농작물 묶음',acquire:'세레니티 마을 농작물 가공 시설에서 해당 농작물을 가공합니다.',use:'요리 제작 시설의 레시피 재료입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('토마토 베이스|양파 베이스|마늘 베이스',{region:'세레니티',category:'요리',subcategory:'베이스',acquire:'세레니티 마을 농작물 가공 시설에서 해당 작물을 가공합니다.',use:'여러 세레니티 요리의 핵심 베이스입니다.',sourceUrl:OFFICIAL.serenity});

  const foodNames='토마토 스파게티|어니언 링|갈릭 케이크|삼겹살 토마토 찌개|삼색 아이스크림|마늘 양갈비 핫도그|달콤 시리얼|로스트 치킨 파이|스윗 치킨 햄버거|토마토 파인애플 피자|양파 수프|허브 삼겹살 찜|토마토 라자냐|딥 크림 빠네|트리플 소갈비 꼬치'.split('|');
  addMany(foodNames,{region:'세레니티',category:'요리',subcategory:'완성 요리',acquire:'세레니티 마을의 요리 제작 시설에서 제작합니다.',use:'판매하여 골드를 벌거나 다른 제작 재료로 사용할 수 있습니다.',sourceUrl:OFFICIAL.crafting});
  addMany(foodNames.map(n=>`황금 ${n}`),{region:'세레니티',category:'요리',subcategory:'황금 요리',acquire:'세레니티 마을의 황금 요리 제작 시설에서 일반 요리와 금 가루/식용 금 가루를 사용해 제작합니다.',use:'고급 판매용 요리입니다.',sourceUrl:OFFICIAL.crafting});

  // 기존 요리 DB 레시피를 서버 백과에도 연결한다.
  const D = window.DDING_DATA;
  if (D?.foods) {
    D.foods.forEach(f=>{
      update(f.name,{recipe:(f.recipe||[]).map(([id,n])=>[(D.ingredients?.[id]?.name || D.crops?.find(c=>c.id===id)?.name || id),n])});
      if(f.gold?.name) update(f.gold.name,{recipe:(f.gold.bulk?.recipe||[]).map(([id,n])=>[(D.ingredients?.[id]?.name || f.name || id),n])});
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 세레니티 — 바리스타
  // ─────────────────────────────────────────────────────────────
  addItem('원두',{region:'세레니티',category:'바리스타',acquire:'세레니티 농작물을 세이지 괭이로 수확할 때 확률적으로 등장하는 두더지를 처치해 얻습니다.',use:'커피 가루 제작 재료입니다.',sourceUrl:OFFICIAL.serenity});
  addItem('커피 가루',{region:'세레니티',category:'바리스타',acquire:'커피 그라인더 모듈로 원두를 가공해 제작합니다.',use:'커피 머신 모듈의 핵심 재료입니다.',related:['원두'],sourceUrl:OFFICIAL.serenity});
  addMany('머그컵|유리컵',{region:'세레니티',category:'바리스타',subcategory:'컵',acquire:'세레니티 마을의 도구 제작 시설에서 제작합니다.',use:'커피 제작에 사용하는 컵입니다.',sourceUrl:OFFICIAL.crafting});
  update('머그컵',{recipe:[['네더 석영',16],['모닥불',1]]}); update('유리컵',{recipe:[['모래',16],['모닥불',1]]});
  addMany('뜨거운 큐브|차가운 큐브',{region:'세레니티',category:'바리스타',subcategory:'큐브',acquire:'믹서기 모듈에서 마그마 블록 또는 얼음을 이용해 제작합니다.',use:'커피 제작 재료입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('검정 분말|초코 분말|순백 분말|눈꽃 분말|숯 분말|버섯 분말|돌 분말|녹색 분말',{region:'세레니티',category:'바리스타',subcategory:'분말',acquire:'믹서기 모듈에서 다양한 재료를 가공해 제작합니다.',use:'커피 제작 재료입니다.',sourceUrl:OFFICIAL.serenity});
  addItem('스팀 우유',{region:'세레니티',category:'바리스타',acquire:'우유 스티머 모듈에서 우유 양동이를 가공해 제작합니다.',use:'커피 제작 재료입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('레어 등급 커피 레시피북|에픽 등급 커피 레시피북|전설 등급 커피 레시피북|신화 등급 커피 레시피북',{region:'세레니티',category:'바리스타',subcategory:'레시피북',acquire:'세레니티 농작물 수확 중 확률적으로 등장하는 두더지를 처치해 얻습니다.',use:'해당 등급 커피 레시피 해금/제작에 사용합니다.',sourceUrl:OFFICIAL.serenity});
  addMany('블랙 커피|카페 모카|화이트 모카|드립 커피|콜드 브루|아메리카노|플랫 마끼아또|머쉬룸 마끼아또|코코아 마끼아또|돌체 라떼|그린티 라떼|우드 라떼|플라워 카푸치노|썬더 카푸치노|가든 카푸치노|스톤 블렌디드|쿠키 블렌디드|다크 블렌디드|그린 트리 프라페|체리 블라썸 프라페|프로즌 스노우 프라페|실버문 아인슈페너|오로라 아인슈페너|골든 아인슈페너|인스턴트 커피',{region:'세레니티',category:'바리스타',subcategory:'커피',acquire:'커피 머신 모듈에서 컵·커피 가루·큐브·스팀 우유·분말 등을 조합해 제작합니다.',use:'바리스타 콘텐츠의 완성품입니다.',sourceUrl:OFFICIAL.serenity});

  // ─────────────────────────────────────────────────────────────
  // 세레니티 — 플로리스트
  // ─────────────────────────────────────────────────────────────
  addItem('향기로운 이슬',{region:'세레니티',category:'플로리스트',acquire:'플로리스트 콘텐츠에서 획득하는 기초 이슬 아이템입니다.',use:'다양한 이슬/씨앗 및 꽃 관련 성장에 사용합니다.',sourceUrl:OFFICIAL.serenity});
  addMany('촉촉한 이슬|신비로운 이슬|따스한 이슬|매혹적인 이슬|투명한 이슬',{region:'세레니티',category:'플로리스트',subcategory:'이슬',acquire:'향기로운 이슬 사용 시 동일 확률군으로 획득하는 이슬 계열입니다.',use:'플로리스트 콘텐츠 재료입니다.',sourceUrl:OFFICIAL.miscOdds});
  addMany('촉촉한 씨앗|신비로운 씨앗|따스한 씨앗|매혹적인 씨앗|투명한 씨앗',{region:'세레니티',category:'플로리스트',subcategory:'씨앗',acquire:'플로리스트 콘텐츠에서 획득합니다.',use:'꽃 재배/제작에 사용합니다.',sourceUrl:OFFICIAL.serenity});
  addMany('아쿠아네타|루밀리아|솔라리스티|벨라로제|크리스텔라',{region:'세레니티',category:'플로리스트',subcategory:'꽃',acquire:'플로리스트 씨앗을 재배해 얻는 꽃입니다.',use:'향장품 제작 재료입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('아쿠아네타 앰플|루밀리아 디퓨저|솔라리스티 캔들|벨라로제 퍼퓸|크리스텔라 오일',{region:'세레니티',category:'플로리스트',subcategory:'향장품',acquire:'플로리스트 콘텐츠에서 해당 꽃을 가공해 제작합니다.',use:'플로리스트 완성품입니다.',sourceUrl:OFFICIAL.serenity});

  // ─────────────────────────────────────────────────────────────
  // 세레니티 — 채광/강화/보석/제련
  // ─────────────────────────────────────────────────────────────
  addMany('코룸|리프톤|세렌트',{region:'세레니티',category:'채광',subcategory:'광물',acquire:'세레니티 동굴의 광석을 세이지 곡괭이로 채광해 얻습니다.',use:'주괴로 제련하여 강화석·도구·모듈 제작에 사용합니다.',sourceUrl:OFFICIAL.serenity});
  addMany('코룸 주괴|리프톤 주괴|세렌트 주괴',{region:'세레니티',category:'채광',subcategory:'주괴',acquire:'세레니티 마을의 채광물 가공 시설에서 해당 광물을 제련합니다.',use:'어빌리티 스톤·라이프스톤 등 핵심 제작 재료입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('코룸 정동석|리프톤 정동석|세렌트 정동석',{region:'세레니티',category:'채광',subcategory:'정동석',acquire:'세레니티 동굴 광석을 세이지 곡괭이로 채광할 때 확률적으로 얻습니다.',sourceUrl:OFFICIAL.serenity});
  addItem('광물 캔디',{region:'세레니티',category:'채광',acquire:'세레니티 동굴 광석 채광 시 확률적으로 얻습니다.',use:'광석 골렘에게 주어 일꾼 골렘을 얻는 데 사용합니다.',related:['노말 일꾼 골렘','레어 일꾼 골렘','에픽 일꾼 골렘'],sourceUrl:OFFICIAL.serenity});
  addMany('강화 횃불|기름통',{region:'세레니티',category:'채광',subcategory:'연료',acquire:'세레니티 마을 채광물 가공 시설에서 제작합니다.',use:'채광 관련 연료/보조 아이템입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('탈리세르의 나뭇잎|데르무스의 가죽|카이로스카의 조각|실파드라의 술병|아스트라곤의 뼈',{region:'세레니티',category:'채광',subcategory:'유물',acquire:'세레니티 동굴 광석을 세이지 곡괭이로 채광할 때 확률적으로 얻습니다.',use:'세레니티 유물/항해 가치 계열 아이템입니다.',sourceUrl:OFFICIAL.serenity});
  addItem('에르칼의 장갑',{region:'세레니티',category:'보물',acquire:'세레니티 전역의 보물상자에서 획득합니다. 루키 보물상자 표에 포함되어 있습니다.',use:'세레니티 보물 분류 아이템입니다.',sourceUrl:OFFICIAL.treasure});
  addItem('이그논의 탈리즈만',{region:'세레니티',category:'보물',acquire:'세레니티 전역의 보물상자에서 획득합니다. 노멀 보물상자 표에 포함되어 있습니다.',use:'세레니티 보물 분류 아이템입니다.',sourceUrl:OFFICIAL.treasure});
  addItem('카르세나의 룬',{region:'세레니티',category:'보물',acquire:'세레니티 전역의 전설 보물상자에서 획득합니다. 공식 확률표 기준 1개가 7% 항목으로 기재되어 있습니다.',use:'세레니티의 보물 아이템입니다. 공식 아이템 문서에서 별도 소비 사용처는 확인되지 않아 보물/가치 아이템으로 보관 여부를 판단하는 편이 안전합니다.',probability:'전설 보물상자 7%',note:'외부 편의 모드에서는 항해 포인트 1,000점으로 취급하는 사례가 있으나, 이 값은 공식 위키 근거와 분리해서 봐야 합니다.',sourceUrl:OFFICIAL.treasure,related:['전설 보물상자']});
  addItem('실바르의 보석함',{region:'세레니티',category:'보물',acquire:'세레니티 전역의 전설 보물상자에서 획득합니다. 공식 확률표에 5% 항목으로 기재되어 있습니다.',use:'세레니티 보물 분류 아이템입니다.',probability:'전설 보물상자 5%',sourceUrl:OFFICIAL.treasure});
  addItem('아르데온의 반지',{region:'세레니티',category:'보물',acquire:'세레니티 전역의 신화 보물상자에서 획득합니다. 공식 확률표에 5% 항목으로 기재되어 있습니다.',use:'세레니티 보물 분류 아이템입니다.',probability:'신화 보물상자 5%',sourceUrl:OFFICIAL.treasure});
  addMany('루키 보물상자|노멀 보물상자|전설 보물상자|신화 보물상자',{region:'세레니티',category:'탐험 시스템',subcategory:'보물상자',acquire:'아일랜드 전역에 상시 배치되는 보물상자입니다. 같은 등급 상자를 열면 다른 위치에 동일 등급 상자가 즉시 재생성되어 등급별 개수가 유지됩니다.',use:'등급에 맞는 열쇠를 들고 우클릭해 보상을 획득합니다. 인벤토리를 비우고 여는 것이 안전합니다.',note:'공식 기준 상시 총 57개: 루키 30개, 노멀 20개, 전설 5개, 신화 2개.',sourceUrl:OFFICIAL.treasure,tags:['보물상자','열쇠','세레니티','아일랜드']});
  update('루키 보물상자',{related:['토마토 씨앗','양파 씨앗','마늘 씨앗','에르칼의 장갑','스태미나 드링크 I','스킬 프리즘']});
  update('노멀 보물상자',{related:['토마토 씨앗','양파 씨앗','마늘 씨앗','이그논의 탈리즈만','스태미나 드링크 I','스태미나 드링크 II','스킬 프리즘']});
  update('전설 보물상자',{related:['신화 특수 인챈트 캡슐','스태미나 드링크 III','스킬 프리즘','카르세나의 룬','실바르의 보석함','신화 열쇠']});
  update('신화 보물상자',{related:['스킬 프리즘','스태미나 드링크 III','스태미나 드링크 IV','아르데온의 반지','상급 미끼 인챈트북','겉날개']});
  addItem('상급 미끼 인챈트북',{region:'세레니티',category:'보물상자 보상',acquire:'신화 보물상자에서 공식 확률표 기준 1개 3% 확률 항목으로 획득합니다.',use:'미끼 관련 인챈트에 사용하는 인챈트북입니다. 세부 적용 조건은 인챈트 시스템의 최신 공식 안내를 우선 확인하세요.',probability:'신화 보물상자 3%',sourceUrl:OFFICIAL.treasure,related:['신화 보물상자']});
  addItem('겉날개',{region:'세레니티/공통',category:'보물상자 보상',acquire:'신화 보물상자에서 공식 확률표 기준 1개 2% 확률 항목으로 획득할 수 있습니다.',use:'마인크래프트의 비행 장비입니다. 서버 귀속/폐기 등 별도 규칙은 최신 공식 안내를 우선 확인하세요.',probability:'신화 보물상자 2%',sourceUrl:OFFICIAL.treasure,related:['신화 보물상자']});

  addMany('바이올렛 광채 원석|오팔 광채 원석|아다만티움 광채 원석',{region:'세레니티',category:'보석 세공',subcategory:'광채 원석',acquire:'세레니티 채광/광채 콘텐츠에서 획득하는 원석입니다.',use:'보석 세공 재료입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('키론|테라온|실바니움|라온|제피르|아스트랄|넬트|세피아|피로시아',{region:'세레니티',category:'보석 세공',subcategory:'보석',acquire:'보석 세공 콘텐츠에서 광채 원석 등을 가공해 얻습니다.',use:'귀중품 제작 재료입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('키론 오르골|테라온 축음기|실바니움 만년필|라온 만화경|제피르 라이터|아스트랄 이어커프|넬트 천체관측기|세피아 회중시계|피로시아 단안경',{region:'세레니티',category:'보석 세공',subcategory:'귀중품',acquire:'보석 세공 콘텐츠에서 보석을 가공해 제작합니다.',use:'세레니티 귀중품 완성품입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('오르딘|루미트|크레온|벨릭|세르칸',{region:'세레니티',category:'형광 광산',subcategory:'형광 광물',acquire:'형광 광산 콘텐츠에서 획득합니다.',use:'형광 큐브/제작품 재료입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('오르딘 큐브|루미트 큐브|크레온 큐브|벨릭 큐브|세르칸 큐브',{region:'세레니티',category:'형광 광산',subcategory:'큐브',acquire:'형광 광물 가공을 통해 얻습니다.',use:'형광 모루 제작품 재료입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('오르딘 미니 망치|루미트 강철 방패|크레온 장인 석궁|벨릭 사냥 스피어|세르칸 초승달 단검',{region:'세레니티',category:'형광 광산',subcategory:'제작품',acquire:'형광 모루/관련 콘텐츠에서 제작합니다.',use:'형광 광산 계열 완성 제작품입니다.',sourceUrl:OFFICIAL.serenity});

  // 도구 + 강화석
  addItem('세이지 괭이',{region:'세레니티',category:'세이지 도구',acquire:'세레니티 마을 도구 제작 시설에서 제작합니다.',use:'세레니티 밭의 작물 채집에 사용하는 전용 도구입니다.',recipe:[['금 괭이',1],['버섯불',32],['밀',32],['비트',32],['당근',32],['감자',32],['발광 열매',32]],sourceUrl:OFFICIAL.crafting,related:['도구 강화']});
  addItem('세이지 곡괭이',{region:'세레니티',category:'세이지 도구',acquire:'세레니티 마을 도구 제작 시설에서 제작합니다.',use:'세레니티 동굴에서 코룸·리프톤·세렌트 등 광물을 채광하는 전용 도구입니다. 채광 1회당 스태미나 10을 소모합니다.',recipe:[['금 곡괭이',1],['조약돌 뭉치',4],['심층암 조약돌 뭉치',4],['자수정 블록',32],['구리 주괴',32],['다이아몬드',32],['네더라이트 주괴',4]],sourceUrl:OFFICIAL.sagePickaxe,related:['도구 강화','하급 라이프스톤','중급 라이프스톤','상급 라이프스톤']});
  addItem('세이지 낚싯대',{region:'세레니티',category:'세이지 도구',acquire:'세레니티 마을 도구 제작 시설에서 제작합니다.',use:'세레니티 해역 낚시 및 수중 어획에 사용하는 전용 도구입니다.',recipe:[['낚싯대',1],['익힌 새우',32],['익힌 도미',32],['익힌 청어',32],['금붕어',32],['농어',32],['열대어',4]],sourceUrl:OFFICIAL.crafting,related:['도구 강화']});
  addItem('세이지 대검',{region:'세레니티',category:'세이지 도구',acquire:'세레니티 마을 도구 제작 시설에서 제작합니다.',use:'세레니티 사냥에 사용하는 전용 무기입니다.',recipe:[['금 검',1],['가죽',32],['깃털',32],['썩은 살점',32],['뼈다귀',32],['블레이즈 막대기',16],['엔더 진주',8]],sourceUrl:OFFICIAL.crafting,related:['도구 강화']});
  addItem('조약돌 뭉치',{region:'세레니티',category:'강화',subcategory:'뭉치',acquire:'강화 제작 시설에서 제작합니다.',use:'세이지 곡괭이 및 하급 라이프스톤 제작에 사용합니다.',recipe:[['조약돌',64]],sourceUrl:OFFICIAL.crafting});
  addItem('심층암 조약돌 뭉치',{region:'세레니티',category:'강화',subcategory:'뭉치',acquire:'강화 제작 시설에서 제작합니다.',use:'세이지 곡괭이 및 중급 라이프스톤 제작에 사용합니다.',recipe:[['심층암 조약돌',64]],sourceUrl:OFFICIAL.crafting});
  addItem('하급 라이프스톤',{region:'세레니티',category:'강화',subcategory:'라이프스톤',acquire:'세레니티 강화 제작 시설에서 제작합니다.',use:'세이지 도구 강화 재료입니다. 1~3강에서는 하급만 사용하고, 4강 이후에도 계속 하급이 함께 들어갑니다.',recipe:[['조약돌 뭉치',2],['구리 블록',8],['레드스톤 블록',3],['코룸 주괴',1]],sourceUrl:OFFICIAL.crafting,related:['중급 라이프스톤','상급 라이프스톤','도구 강화'],note:'1~3강: 하급만 / 4~5강: 하급+중급 / 6강+: 하급+중급+상급'});
  addItem('중급 라이프스톤',{region:'세레니티',category:'강화',subcategory:'라이프스톤',acquire:'세레니티 강화 제작 시설에서 제작합니다.',use:'세이지 도구 4강부터 필요한 강화 재료입니다.',recipe:[['심층암 조약돌 뭉치',2],['청금석 블록',5],['철 블록',5],['다이아몬드 블록',3],['리프톤 주괴',2]],sourceUrl:OFFICIAL.crafting,related:['하급 라이프스톤','상급 라이프스톤','도구 강화'],note:'4~5강부터 중급이 추가됩니다.'});
  addItem('상급 라이프스톤',{region:'세레니티',category:'강화',subcategory:'라이프스톤',acquire:'세레니티 강화 제작 시설에서 제작합니다.',use:'세이지 도구 6강부터 필요한 강화 재료입니다.',recipe:[['구리 블록',30],['자수정 블록',20],['철 블록',7],['금 블록',7],['다이아몬드 블록',5],['세렌트 주괴',3]],sourceUrl:OFFICIAL.crafting,related:['하급 라이프스톤','중급 라이프스톤','도구 강화'],note:'6강부터 상급이 추가됩니다.'});
  addItem('도구 강화',{region:'세레니티',category:'가이드',subcategory:'시스템',acquire:'세레니티 마을 NPC 로니에게 말을 걸고 2번 → 강화하기를 선택합니다.',use:'세이지 도구의 성능을 올리는 시스템입니다. 도구와 강화석을 올리고 강화합니다.',sourceUrl:OFFICIAL.enhancement,related:['세이지 괭이','세이지 곡괭이','세이지 낚싯대','세이지 대검','하급 라이프스톤','중급 라이프스톤','상급 라이프스톤']});

  addItem('드릴',{region:'세레니티/야생',category:'보조 도구',acquire:'도구 제작 시설에서 제작합니다.',use:'야생의 석유·광물 원석 채광에 사용합니다.',recipe:[['철 곡괭이',1],['다이아몬드',5],['에메랄드',2],['응회암',8],['발광 이끼',4],['뾰족한 점적석',4]],sourceUrl:OFFICIAL.crafting});
  addItem('고급 드릴',{region:'세레니티/야생',category:'보조 도구',acquire:'도구 제작 시설에서 제작합니다.',use:'상위 야생 채광에 사용하는 보조 도구입니다.',recipe:[['드릴',1],['석영',32],['금 주괴',10],['흑암',8],['현무암',8],['용암 양동이',1]],sourceUrl:OFFICIAL.crafting});
  addItem('육식 동물 덫',{region:'세레니티',category:'사냥',acquire:'도구 제작 시설에서 2개 단위로 제작합니다.',use:'육식 동물 포획에 사용합니다.',recipe:[['에메랄드',10],['철',8],['거미줄',2],['사과',4],['부싯돌',4]],sourceUrl:OFFICIAL.crafting});
  addItem('나무 어선 획득권',{region:'세레니티',category:'해양',acquire:'도구 제작 시설에서 제작합니다.',use:'나무 어선 획득에 사용합니다.',recipe:[['참나무 보트',1],['어빌리티 스톤',20],['해초',32],['참나무 판자',16],['익힌 대구',16],['익힌 연어',16],['철사 덫 갈고리',1]],sourceUrl:OFFICIAL.crafting});
  addItem('어선 수리 키트',{region:'세레니티',category:'해양',acquire:'도구 제작 시설에서 심해 자원을 조합해 제작합니다. 공식 위키에는 여러 조합식이 기재되어 있습니다.',use:'어선 수리에 사용합니다.',recipe:[['심해의 고철',1],['심연의 오로라 파편',1],['영롱한 티타늄 광석',1]],sourceUrl:OFFICIAL.crafting});
  addMany('커피 그라인더 모듈|믹서기 모듈|우유 스티머 모듈|커피 머신 모듈|하급 광채 생성기|중급 광채 생성기|상급 광채 생성기|화석 제작대 모듈|보석 세공대 모듈|테라리움 모듈|어항 모듈|형광 광산 모듈|형광 모루 모듈',{region:'세레니티',category:'모듈',acquire:'세레니티 마을 도구 제작 시설에서 제작합니다.',use:'각 전문 콘텐츠의 제작/가공 기능을 여는 모듈입니다.',sourceUrl:OFFICIAL.crafting});
  update('커피 그라인더 모듈',{recipe:[['어빌리티 스톤',30],['케이크',1],['코코아 콩',30],['숫돌',1]]});
  update('믹서기 모듈',{recipe:[['어빌리티 스톤',30],['케이크',1],['코코아 콩',30],['석재 절단기',1]]});
  update('우유 스티머 모듈',{recipe:[['어빌리티 스톤',30],['케이크',1],['코코아 콩',30],['훈연기',1]]});
  update('커피 머신 모듈',{recipe:[['어빌리티 스톤',30],['케이크',1],['코코아 콩',30],['제작대',1]]});
  update('화석 제작대 모듈',{recipe:[['어빌리티 스톤',30],['브리즈 막대기',5],['엔더의 눈',16],['대장장이 작업대',1]]});
  update('보석 세공대 모듈',{recipe:[['어빌리티 스톤',30],['네더라이트 주괴',5],['에메랄드',16],['마법 부여대',1]]});
  update('테라리움 모듈',{recipe:[['어빌리티 스톤',30],['위더 장미',1],['발광 열매',64],['장식된 도자기',1]]});
  update('어항 모듈',{recipe:[['어빌리티 스톤',30],['열대어',10],['앵무조개 껍데기',1],['통',1]]});
  update('형광 광산 모듈',{recipe:[['어빌리티 스톤',30],['영혼 랜턴',4],['우는 흑요석',7],['네더라이트 곡괭이',1]]});
  update('형광 모루 모듈',{recipe:[['어빌리티 스톤',30],['모루',3],['레드스톤 블록',10],['경험치병',5]]});

  // ─────────────────────────────────────────────────────────────
  // 세레니티 — 해양/수중/연금
  // ─────────────────────────────────────────────────────────────
  addMany('평원 해역 물고기|산호초 해역 물고기|쓰레기 해역 물고기|심해 해역 물고기|크림슨 해역 물고기|빙하 해역 물고기|오염 해역 물고기',{region:'세레니티',category:'해양',subcategory:'물고기 그룹',acquire:'세레니티 해당 해역에서 세이지 낚싯대로 낚습니다.',use:'해양 콘텐츠 재료/수집품입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('루키 열쇠 조각|노멀 열쇠 조각|전설 열쇠 조각|신화 열쇠 조각',{region:'세레니티',category:'해양',subcategory:'열쇠 조각',acquire:'세레니티 해역 낚시 등 해양 콘텐츠에서 얻습니다.',use:'조각 4개를 모아 해당 등급 열쇠를 제작합니다.',sourceUrl:OFFICIAL.serenity});
  addItem('루키 열쇠',{region:'세레니티',category:'해양',recipe:[['루키 열쇠 조각',4]],acquire:'해양 제작 시설에서 루키 열쇠 조각 4개로 제작합니다.',sourceUrl:OFFICIAL.crafting});
  addItem('노멀 열쇠',{region:'세레니티',category:'해양',recipe:[['노멀 열쇠 조각',4]],acquire:'해양 제작 시설에서 노멀 열쇠 조각 4개로 제작합니다.',sourceUrl:OFFICIAL.crafting});
  addItem('전설 열쇠',{region:'세레니티',category:'해양',recipe:[['전설 열쇠 조각',4]],acquire:'해양 제작 시설에서 전설 열쇠 조각 4개로 제작합니다.',sourceUrl:OFFICIAL.crafting});
  addItem('신화 열쇠',{region:'세레니티',category:'해양',recipe:[['신화 열쇠 조각',4]],acquire:'해양 제작 시설에서 신화 열쇠 조각 4개로 제작합니다.',sourceUrl:OFFICIAL.crafting});
  addMany('심해의 고철|해저 열수구 코어|심연의 오로라 파편|해구의 화석 연료|영롱한 티타늄 광석',{region:'세레니티',category:'해양',subcategory:'심해 자원',acquire:'세레니티 해역 전역에서 세이지 낚싯대로 낚습니다.',use:'어선 수리 키트 등 해양 제작 재료입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('녹슨 바다 상자|바다 상자|녹슨 무거운 바다 상자|무거운 바다 상자|녹슨 가벼운 바다 상자|가벼운 바다 상자',{region:'세레니티',category:'해양',subcategory:'바다 상자',acquire:'세레니티 해역에서 낚거나 해양 제작 시설에서 상위 상자로 가공합니다.',use:'열어서 각종 해양/채광 재료를 획득합니다.',sourceUrl:OFFICIAL.serenity});
  addMany('캔|통조림|비닐봉지|페트병|신발',{region:'세레니티',category:'해양',subcategory:'쓰레기',acquire:'세레니티 해역에서 세이지 낚싯대로 낚습니다.',use:'해양 제작 시설에서 재활용품으로 가공합니다.',sourceUrl:OFFICIAL.serenity});
  addMany('굴|소라|문어|미역|성게',{region:'세레니티',category:'수중 어획',acquire:'세레니티 바다 속에서 세이지 낚싯대로 채집합니다.',use:'연금 제작의 기초 어패류 재료입니다.',sourceUrl:OFFICIAL.serenity});
  addItem('알쏭달쏭 조개',{region:'세레니티',category:'수중 어획',acquire:'수중 어획물 채집 시 확률적으로 등장하는 조개를 처치해 얻습니다.',use:'열어 깨진 조개껍데기와 여러 진주를 확률적으로 얻습니다.',sourceUrl:OFFICIAL.miscOdds});
  addItem('고대 주화',{region:'세레니티',category:'수중 어획',acquire:'수중 어획 콘텐츠에서 획득합니다.',use:'수중/해양 콘텐츠 재료 또는 가치 아이템입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('깨진 조개껍데기|노란빛 진주|푸른빛 진주|청록빛 진주|분홍빛 진주|보라빛 진주|흑진주',{region:'세레니티',category:'수중 어획',subcategory:'조개/진주',acquire:'알쏭달쏭 조개 또는 해양 상자 등에서 확률적으로 얻습니다.',use:'수중 공예품 제작 재료입니다.',sourceUrl:OFFICIAL.miscOdds});
  addItem('금속 재활용품',{region:'세레니티',category:'해양',subcategory:'재활용품',acquire:'해양 제작 시설에서 캔 2개로 3개를 제작합니다.',recipe:[['캔',2]],use:'수중 공예품 제작 재료입니다.',sourceUrl:OFFICIAL.crafting});
  addItem('합금 재활용품',{region:'세레니티',category:'해양',subcategory:'재활용품',acquire:'해양 제작 시설에서 통조림 2개로 3개를 제작합니다.',recipe:[['통조림',2]],use:'수중 공예품 제작 재료입니다.',sourceUrl:OFFICIAL.crafting});
  addItem('합성수지 재활용품',{region:'세레니티',category:'해양',subcategory:'재활용품',acquire:'해양 제작 시설에서 비닐봉지 2개로 3개를 제작합니다.',recipe:[['비닐봉지',2]],use:'수중 공예품 제작 재료입니다.',sourceUrl:OFFICIAL.crafting});
  addItem('플라스틱 재활용품',{region:'세레니티',category:'해양',subcategory:'재활용품',acquire:'해양 제작 시설에서 페트병 2개로 3개를 제작합니다.',recipe:[['페트병',2]],use:'수중 공예품 제작 재료입니다.',sourceUrl:OFFICIAL.crafting});
  addItem('섬유 재활용품',{region:'세레니티',category:'해양',subcategory:'재활용품',acquire:'해양 제작 시설에서 신발 2개로 3개를 제작합니다.',recipe:[['신발',2]],use:'수중 공예품 제작 재료입니다.',sourceUrl:OFFICIAL.crafting});
  addMany('조개껍데기 브로치|푸른 향수병|자개 손거울|분홍 헤어핀|자개 부채|흑진주 시계',{region:'세레니티',category:'해양',subcategory:'공예품',acquire:'세레니티 해양 제작 시설에서 진주·조개껍데기·재활용품을 조합해 제작합니다.',use:'수중 공예 완성품입니다.',sourceUrl:OFFICIAL.crafting});
  update('조개껍데기 브로치',{recipe:[['깨진 조개껍데기',1],['노란빛 진주',1],['금속 재활용품',1],['거미줄',2]]});
  update('푸른 향수병',{recipe:[['깨진 조개껍데기',2],['푸른빛 진주',1],['합성수지 재활용품',1],['플라스틱 재활용품',1],['양동이',4]]});
  update('자개 손거울',{recipe:[['깨진 조개껍데기',3],['청록빛 진주',1],['합금 재활용품',2],['플라스틱 재활용품',2],['유리판',8]]});
  update('분홍 헤어핀',{recipe:[['깨진 조개껍데기',4],['분홍빛 진주',1],['합성수지 재활용품',3],['섬유 재활용품',3],['대나무',32],['분홍 꽃잎',16]]});
  update('자개 부채',{recipe:[['깨진 조개껍데기',5],['보라빛 진주',1],['합금 재활용품',5],['합성수지 재활용품',5],['막대기',64],['자수정 조각',8]]});
  update('흑진주 시계',{recipe:[['깨진 조개껍데기',7],['흑진주',1],['금속 재활용품',7],['합금 재활용품',7],['섬유 재활용품',7],['흑요석',16],['시계',8]]});
  addMany('아기 먹|먹|아기 글라이|글라이|아기 체다|체다|아기 루모스|루모스|아기 토라|토라|아기 팽|팽|아기 비비드|비비드|아기 길드|길드|아기 에테리아|에테리아',{region:'세레니티',category:'수중 어획',subcategory:'반려어',acquire:'세레니티 수중/해양 콘텐츠에서 획득합니다.',use:'어항/반려어 콘텐츠에서 사용합니다.',sourceUrl:OFFICIAL.serenity});

  addMany('수호의 정수|파동의 정수|혼란의 정수|생명의 정수|부식의 정수',{region:'세레니티',category:'연금',subcategory:'정수 ★',acquire:'연금 제작 시설에서 ★ 등급 수중 어획물로 제작합니다.',use:'1성 핵 및 상위 연금품 제작 재료입니다.',sourceUrl:OFFICIAL.crafting});
  addMany('물결 수호의 핵|파동 오염의 핵|질서 파괴의 핵|활력 붕괴의 핵|침식 방어의 핵',{region:'세레니티',category:'연금',subcategory:'핵 ★',acquire:'연금 제작 시설에서 두 종류 정수와 회를 조합해 제작합니다.',use:'1성 연금 핵입니다.',sourceUrl:OFFICIAL.crafting});
  addMany('영생의 아쿠티스|크라켄의 광란체|리바이던의 깃털',{region:'세레니티',category:'연금',subcategory:'1성 연금품',acquire:'세레니티 연금 콘텐츠에서 제작합니다.',use:'연금 콘텐츠의 1성 완성품입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('수호 에센스|파동 에센스|혼란 에센스|생명 에센스|부식 에센스',{region:'세레니티',category:'연금',subcategory:'에센스 ★★',acquire:'연금 제작 시설에서 ★★ 등급 수중 어획물로 제작합니다.',use:'2성 결정 및 상위 연금품 제작 재료입니다.',sourceUrl:OFFICIAL.crafting});
  addMany('활기 보존의 결정|파도 침식의 결정|방어 오염의 결정|격류 재생의 결정|맹독 혼란의 결정',{region:'세레니티',category:'연금',subcategory:'결정 ★★',acquire:'연금 제작 시설에서 에센스와 켈프 더미/광물 재료를 조합해 제작합니다.',use:'2성 연금 결정입니다.',sourceUrl:OFFICIAL.crafting});
  addMany('해구의 파동 코어|침묵의 심해 비약|청해룡의 날개',{region:'세레니티',category:'연금',subcategory:'2성 연금품',acquire:'세레니티 연금 콘텐츠에서 제작합니다.',use:'연금 콘텐츠의 2성 완성품입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('수호의 엘릭서|파동의 엘릭서|혼란의 엘릭서|생명의 엘릭서|부식의 엘릭서',{region:'세레니티',category:'연금',subcategory:'엘릭서 ★★★',acquire:'연금 제작 시설에서 ★★★ 등급 수중 어획물과 불우렁쉥이 등으로 제작합니다.',use:'3성 영약 및 상위 연금품 제작 재료입니다.',sourceUrl:OFFICIAL.crafting});
  addMany('불멸 재생의 영약|파동 장벽의 영약|타락 침식의 영약|생명 광란의 영약|맹독 파동의 영약',{region:'세레니티',category:'연금',subcategory:'영약 ★★★',acquire:'연금 제작 시설에서 엘릭서와 켈프 더미 등을 조합해 제작합니다.',use:'3성 연금 영약입니다.',sourceUrl:OFFICIAL.crafting});
  addMany('아쿠아 펄스 파편|나우틸러스의 손|무저의 척추',{region:'세레니티',category:'연금',subcategory:'3성 연금품',acquire:'세레니티 연금 콘텐츠에서 제작합니다.',use:'연금 콘텐츠의 3성 완성품입니다.',sourceUrl:OFFICIAL.serenity});

  // ─────────────────────────────────────────────────────────────
  // 세레니티 — 사냥/각인/화석
  // ─────────────────────────────────────────────────────────────
  addMany('사슴의 뿔|미어캣의 꼬리|기린의 가죽|코끼리의 상아|하마의 송곳니|플라밍고의 부리|칠면조의 깃털|곰의 발바닥',{region:'세레니티',category:'사냥',subcategory:'사냥 전리품',acquire:'세레니티 사냥 콘텐츠에서 해당 동물을 사냥해 얻습니다.',use:'사냥 제작/수집 재료입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('사슴의 영혼|미어캣의 영혼|기린의 영혼|코끼리의 영혼|하마의 영혼|플라밍고의 영혼|칠면조의 영혼|곰의 영혼',{region:'세레니티',category:'사냥',subcategory:'영혼',acquire:'세레니티 사냥 콘텐츠에서 해당 동물과 관련해 획득합니다.',use:'영혼 계약서 제작 재료입니다.',sourceUrl:OFFICIAL.serenity});
  addItem('번영의 영혼 계약서',{region:'세레니티',category:'사냥',recipe:[['사슴의 영혼',1],['미어캣의 영혼',1]],acquire:'강화 제작 시설에서 제작합니다.',sourceUrl:OFFICIAL.crafting});
  addItem('파쇄의 영혼 계약서',{region:'세레니티',category:'사냥',recipe:[['기린의 영혼',1],['코끼리의 영혼',1]],acquire:'강화 제작 시설에서 제작합니다.',sourceUrl:OFFICIAL.crafting});
  addItem('만조의 영혼 계약서',{region:'세레니티',category:'사냥',recipe:[['하마의 영혼',1],['플라밍고의 영혼',1]],acquire:'강화 제작 시설에서 제작합니다.',sourceUrl:OFFICIAL.crafting});
  addItem('정복의 영혼 계약서',{region:'세레니티',category:'사냥',recipe:[['칠면조의 영혼',1],['곰의 영혼',1]],acquire:'강화 제작 시설에서 제작합니다.',sourceUrl:OFFICIAL.crafting});
  addItem('수상한 각인석 조각',{region:'세레니티',category:'각인',acquire:'세레니티 사냥/각인 콘텐츠에서 획득합니다.',use:'5개를 모아 수상한 각인석을 제작합니다.',sourceUrl:OFFICIAL.serenity});
  addItem('수상한 각인석',{region:'세레니티',category:'각인',acquire:'강화 제작 시설에서 수상한 각인석 조각 5개로 제작합니다.',use:'각인석 획득/각인 콘텐츠에 사용합니다.',recipe:[['수상한 각인석 조각',5]],sourceUrl:OFFICIAL.crafting});
  ['괭이','곡괭이','낚싯대','대검'].forEach(tool=>['투박한','단정한','정교한'].forEach(rank=>addItem(`${rank} ${tool} 각인석`,{region:'세레니티',category:'각인',subcategory:`${tool} 각인석`,acquire:'세레니티 각인 콘텐츠에서 획득합니다.',use:`세이지 ${tool} 관련 각인에 사용합니다.`,sourceUrl:OFFICIAL.serenity})));
  // 보급품 확률표에 이름이 직접 확인되는 세부 각인석도 검색 가능하게 수록.
  addMany('투박한 코비 탐색 각인석|단정한 코비 탐색 각인석|정교한 코비 탐색 각인석|투박한 물고기 행운 각인석|단정한 물고기 행운 각인석|정교한 물고기 행운 각인석|투박한 어획 강화 각인석|단정한 어획 강화 각인석|정교한 어획 강화 각인석|투박한 조개 탐색 각인석|단정한 조개 탐색 각인석|정교한 조개 탐색 각인석|투박한 어패 행운 각인석|단정한 어패 행운 각인석|정교한 어패 행운 각인석|투박한 수중 호흡 각인석|단정한 수중 호흡 각인석|정교한 수중 호흡 각인석|투박한 공격 강화 각인석|단정한 공격 강화 각인석|정교한 공격 강화 각인석|투박한 공격 가속 각인석|단정한 공격 가속 각인석|정교한 공격 가속 각인석|투박한 전리품 행운 각인석|단정한 전리품 행운 각인석|정교한 전리품 행운 각인석|투박한 조각 탐색 각인석|단정한 조각 탐색 각인석|정교한 조각 탐색 각인석|투박한 빠른 농부 각인석|정교한 정령 고래 각인석|정교한 가오리 인도 각인석|정교한 어부 룰렛 각인석|정교한 흔적 추적 각인석|정교한 조각 공명 각인석|정교한 흡입 사냥 각인석|정교한 사냥꾼 룰렛 각인석|정교한 원두 행운 각인석|정교한 광채 탐색 각인석|정교한 주화 탐색 각인석|정교한 어선 보호 각인석|정교한 모래 탐색 각인석|정교한 이슬 탐색 각인석|정교한 금 가루 탐색 각인석|정교한 반려어 탐색 각인석',{region:'세레니티',category:'각인',subcategory:'세부 각인석',acquire:'각인석 보급품/각인 콘텐츠에서 확률적으로 획득하는 세부 옵션 각인석입니다.',use:'이름에 표시된 세이지 도구/전문가 옵션을 부여하는 데 사용합니다.',sourceUrl:OFFICIAL.supply});

  addMany('사자 소환 알|표범 소환 알|악어 소환 알|늑대 소환 알|호랑이 소환 알',{region:'세레니티',category:'사냥',subcategory:'포획',acquire:'세레니티 사냥/포획 콘텐츠에서 획득합니다.',use:'해당 육식 동물 포획/소환에 사용합니다.',sourceUrl:OFFICIAL.serenity});
  addMany('사자|표범|악어|늑대|호랑이',{region:'세레니티',category:'사냥',subcategory:'포획 동물',acquire:'육식 동물 덫과 소환 알을 이용한 포획 콘텐츠로 획득합니다.',use:'사냥/포획 콘텐츠 대상 또는 획득 개체입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('우티의 화석이 섞인 모래|라프의 화석이 섞인 모래|크록의 화석이 섞인 모래|헤탄의 화석이 섞인 모래|듀크의 화석이 섞인 모래',{region:'세레니티',category:'화석',subcategory:'화석 모래',acquire:'세레니티 화석 콘텐츠에서 획득합니다.',use:'화석 부위를 복원하는 재료입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('우티의 머리|우티의 이빨|우티의 몸통|우티의 발톱|우티의 꼬리|라프의 머리|라프의 목|라프의 몸통|라프의 다리|라프의 꼬리|크록의 머리|크록의 몸통|크록의 등가시|크록의 다리|크록의 꼬리|헤탄의 부리|헤탄의 목|헤탄의 몸통|헤탄의 날개|헤탄의 다리|듀크의 머리|듀크의 턱|듀크의 몸통|듀크의 다리|듀크의 꼬리',{region:'세레니티',category:'화석',subcategory:'화석 부위',acquire:'화석이 섞인 모래를 화석 콘텐츠에서 처리해 획득합니다.',use:'해당 고대 생물의 화석 복원에 사용합니다.',sourceUrl:OFFICIAL.serenity});
  addMany('우티 토큰|라프 토큰|크록 토큰|헤탄 토큰|듀크 토큰',{region:'세레니티',category:'화석',subcategory:'토큰',acquire:'화석 콘텐츠에서 획득합니다.',sourceUrl:OFFICIAL.serenity});
  addMany('우티의 화석|라프의 화석|크록의 화석|헤탄의 화석|듀크의 화석',{region:'세레니티',category:'화석',subcategory:'복원 화석',acquire:'해당 화석 부위를 모아 화석 제작대/관련 콘텐츠에서 복원합니다.',use:'화석 콘텐츠의 완성품입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('우티의 원혼|라프의 원혼|크록의 원혼|헤탄의 원혼|듀크의 원혼',{region:'세레니티',category:'화석',subcategory:'원혼',acquire:'화석/원혼 콘텐츠에서 획득합니다.',use:'영혼 가죽 계열 제작에 사용합니다.',sourceUrl:OFFICIAL.serenity});
  addMany('혼이 깃든 가죽|고독한 영혼의 가죽|신비한 영혼의 가죽|활기찬 영혼의 가죽|특이한 영혼의 가죽|화끈한 영혼의 가죽',{region:'세레니티',category:'화석',subcategory:'영혼 가죽',acquire:'화석 원혼/사냥 후가공 콘텐츠에서 획득 또는 제작합니다.',use:'고급 가죽 공예품 제작 재료입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('반짝 광택제|장인 인증 도장',{region:'세레니티',category:'화석',subcategory:'가공 재료',acquire:'화석/가죽 가공 콘텐츠에서 획득합니다.',use:'영혼 가죽 고급 공예품 제작 보조 재료입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('고독한 가죽 키링|신비한 가죽 팔찌|활기찬 영혼 장갑|특이한 가죽 파우치|화끈한 가죽 샌드백',{region:'세레니티',category:'화석',subcategory:'고급 공예품',acquire:'영혼 가죽과 가공 재료를 사용해 제작합니다.',use:'화석/가죽 콘텐츠의 완성 공예품입니다.',sourceUrl:OFFICIAL.serenity});
  addMany('스태미나 드링크 I|스태미나 드링크 II|스태미나 드링크 III|스태미나 드링크 IV|스태미나 드링크 V',{region:'세레니티',category:'회복/소모품',subcategory:'스태미나',acquire:'보물상자/해양 제작/기타 보상 등에서 단계별로 얻거나 하위 등급을 모아 제작합니다.',use:'스태미나 회복에 사용하는 소모품입니다.',sourceUrl:OFFICIAL.serenity});
  update('스태미나 드링크 II',{recipe:[['스태미나 드링크 I',5]]}); update('스태미나 드링크 III',{recipe:[['스태미나 드링크 II',5]]}); update('스태미나 드링크 IV',{recipe:[['스태미나 드링크 III',5]]});

  // ─────────────────────────────────────────────────────────────
  // 루미디아 / 노크틸라
  // ─────────────────────────────────────────────────────────────
  addItem('루미디아의 조각',{region:'루미디아/노크틸라',category:'전리품',acquire:'벚꽃 숨결 평야와 붉은 버섯 군락지의 몬스터를 사냥해 확률적으로 얻습니다. 일반·알파·오메가·미니보스가 드롭합니다.',use:'정제 및 노크틸라 제작/성장 재료입니다.',sourceUrl:OFFICIAL.lumidia});
  addItem('정제된 루미디아의 조각',{region:'루미디아/노크틸라',category:'전리품',acquire:'대형 제작대에서 루미디아의 조각을 정제해 제작합니다.',use:'노크틸라 제작/성장 재료입니다.',sourceUrl:OFFICIAL.lumidia});
  addItem('루미디아의 결정',{region:'루미디아/노크틸라',category:'전리품',acquire:'푸른 균사 지대와 잔광 침식 동굴의 몬스터를 사냥해 확률적으로 얻습니다.',use:'정제 및 노크틸라 제작/성장 재료입니다.',sourceUrl:OFFICIAL.lumidia});
  addItem('정제된 루미디아의 결정',{region:'루미디아/노크틸라',category:'전리품',acquire:'대형 제작대에서 루미디아의 결정을 정제해 제작합니다.',sourceUrl:OFFICIAL.lumidia});
  addItem('빛바랜 낙화',{region:'루미디아/노크틸라',category:'전리품',acquire:'벚꽃 숨결 평야의 일반 몬스터를 사냥해 확률적으로 얻습니다.',sourceUrl:OFFICIAL.lumidia});
  addItem('정제된 빛바랜 낙화',{region:'루미디아/노크틸라',category:'전리품',acquire:'대형 제작대에서 빛바랜 낙화를 정제해 제작합니다.',sourceUrl:OFFICIAL.lumidia});
  addItem('선홍의 균사',{region:'루미디아/노크틸라',category:'전리품',acquire:'붉은 버섯 군락지의 일반 몬스터를 사냥해 확률적으로 얻습니다.',sourceUrl:OFFICIAL.lumidia});
  addItem('정제된 선홍의 균사',{region:'루미디아/노크틸라',category:'전리품',acquire:'대형 제작대에서 선홍의 균사를 정제해 제작합니다.',sourceUrl:OFFICIAL.lumidia});
  addItem('고요한 포자',{region:'루미디아/노크틸라',category:'전리품',acquire:'푸른 균사 지대의 일반 몬스터를 사냥해 확률적으로 얻습니다.',sourceUrl:OFFICIAL.lumidia});
  addItem('정제된 고요한 포자',{region:'루미디아/노크틸라',category:'전리품',acquire:'대형 제작대에서 고요한 포자를 정제해 제작합니다.',sourceUrl:OFFICIAL.lumidia});
  addItem('갈라진 암석',{region:'루미디아/노크틸라',category:'전리품',acquire:'잔광 침식 동굴의 일반 몬스터를 사냥해 확률적으로 얻습니다.',sourceUrl:OFFICIAL.lumidia});
  addItem('정제된 갈라진 암석',{region:'루미디아/노크틸라',category:'전리품',acquire:'대형 제작대에서 갈라진 암석을 정제해 제작합니다.',sourceUrl:OFFICIAL.lumidia});
  addMany('미약한 격파석|안정된 격파석|강화된 격파석|완성된 격파석',{region:'루미디아/노크틸라',category:'강화석',subcategory:'격파석',acquire:'노크틸라 마을의 칸에게 무기를 분해하거나 미니보스 특별 보상·퀘스트 클리어 보상으로 얻습니다.',use:'노크틸라 무기 성장에 사용합니다.',sourceUrl:OFFICIAL.lumidia});
  addMany('미약한 수호석|안정된 수호석|강화된 수호석|완성된 수호석',{region:'루미디아/노크틸라',category:'강화석',subcategory:'수호석',acquire:'알파·오메가 몬스터 사냥 또는 미니보스 특별 보상·퀘스트 클리어 보상으로 얻습니다.',use:'노크틸라 방어구/성장에 사용합니다.',sourceUrl:OFFICIAL.lumidia});
  addMany('미약한 각성석|안정된 각성석|강화된 각성석|완성된 각성석',{region:'루미디아/노크틸라',category:'강화석',subcategory:'각성석',acquire:'알파·오메가 몬스터 사냥 또는 미니보스 특별 보상·퀘스트 클리어 보상으로 얻습니다.',use:'노크틸라 각성/성장에 사용합니다.',sourceUrl:OFFICIAL.lumidia});
  const runeKinds='파괴|타격|증폭|기습|사냥|지배|개시|처형|한기|화염|자연|뇌전|강철|열상|흡혈|출혈|정밀|치명|역습|반격'.split('|');
  ['루키','커먼','노멀','레어'].forEach(g=>{
    addItem(`${g} 등급 룬`,{region:'루미디아/노크틸라',category:'룬',subcategory:'등급 그룹',acquire:`${g} 룬 랜덤 박스를 열어 얻습니다.`,use:'장비/전투 룬 시스템에 사용합니다.',sourceUrl:OFFICIAL.lumidia});
    addItem(`${g} 등급 룬 랜덤 박스`,{region:'루미디아/노크틸라',category:'룬',subcategory:'랜덤 박스',acquire:'미니보스 특별 보상과 퀘스트 클리어 보상으로 얻습니다.',use:`열면 ${g} 등급 룬 중 하나를 획득합니다.`,sourceUrl:OFFICIAL.lumidia});
    runeKinds.forEach(r=>addItem(`${r}의 룬 (${g})`,{region:'루미디아/노크틸라',category:'룬',subcategory:g,acquire:`${g} 룬 랜덤 박스에서 공식 확률표 기준 각 룬이 5%로 등장합니다.`,use:'노크틸라 룬 시스템에서 해당 효과를 부여합니다.',probability:'해당 등급 룬 랜덤 박스 5%',sourceUrl:OFFICIAL.randomBox}));
  });
  addItem('무한의 증표',{region:'루미디아/노크틸라',category:'인피니티 타워',acquire:'인피니티 타워 클리어 보상으로 얻습니다.',sourceUrl:OFFICIAL.lumidia});
  addItem('인피니티 에테르',{region:'루미디아/노크틸라',category:'인피니티 타워',acquire:'인피니티 타워 클리어 보상으로 얻습니다.',use:'정제 및 인피니티 타워 성장 재료입니다.',sourceUrl:OFFICIAL.lumidia});
  addItem('정제된 인피니티 에테르',{region:'루미디아/노크틸라',category:'인피니티 타워',acquire:'대형 제작대에서 인피니티 에테르를 정제해 제작합니다.',sourceUrl:OFFICIAL.lumidia});
  addItem('인피니티 타워 랜덤 박스',{region:'루미디아/노크틸라',category:'인피니티 타워',acquire:'인피니티 타워 주간 랭킹 보상으로 얻습니다.',use:'열어 인피니티 타워 관련 보상을 획득합니다.',sourceUrl:OFFICIAL.lumidia});
  addMany('입문자의 체력 포션|견습자의 체력 포션|정예의 체력 포션|영웅의 체력 포션',{region:'루미디아/노크틸라',category:'회복/소모품',acquire:'아일랜드 요리를 이용해 도구 제작 시설에서 제작합니다.',use:'체력을 회복하는 소모품입니다.',sourceUrl:OFFICIAL.crafting});
  update('입문자의 체력 포션',{recipe:[['토마토 스파게티',1],['어니언 링',1],['갈릭 케이크',1]],note:'도구 제작 시설에서 4개 단위 제작'});
  update('견습자의 체력 포션',{recipe:[['삼겹살 토마토 찌개',2],['달콤 시리얼',1],['로스트 치킨 파이',1]],note:'도구 제작 시설에서 4개 단위 제작'});
  update('정예의 체력 포션',{recipe:[['토마토 파인애플 피자',3],['양파 수프',2],['삼색 아이스크림',1]],note:'도구 제작 시설에서 3개 단위 제작'});
  update('영웅의 체력 포션',{recipe:[['허브 삼겹살 찜',4],['딥 크림 빠네',4],['스윗 치킨 햄버거',4]],note:'도구 제작 시설에서 2개 단위 제작'});
  addMany('벨페고르의 코어|앨런의 코어|아가레스의 코어|윈스톤의 코어',{region:'루미디아/노크틸라',category:'미니보스',subcategory:'코어',acquire:'해당 미니보스를 사냥해 확률적으로 얻습니다.',use:'노크틸라 성장/제작 재료입니다.',sourceUrl:OFFICIAL.lumidia});
  addMany('봉인 해방의 인장|능력 개방의 문장',{region:'루미디아/노크틸라',category:'미니보스',acquire:'미니보스 특별 보상과 퀘스트 클리어 보상으로 얻습니다.',use:'노크틸라 장비 능력 개방/봉인 해제 계열에 사용합니다.',sourceUrl:OFFICIAL.lumidia});


  // ─────────────────────────────────────────────────────────────
  // 노크틸라 — 장비 / 강화 / 스킬 / 룬 / 편의 시스템
  // 공식 '아이템 정보' 허브 밖에 있는 최신 전투 아이템도 초뉴비 검색에 포함한다.
  // ─────────────────────────────────────────────────────────────
  addMany('골드|루비|크리스탈',{region:'공통',category:'재화',subcategory:'기본 재화',acquire:'서버의 활동·보상·상점·거래 등으로 획득합니다. 정확한 수급 방식은 재화별 콘텐츠에 따라 다릅니다.',use:'상점 구매, 강화, 편의 기능 등 서버 경제 전반에 사용합니다.',sourceUrl:OFFICIAL.currency});

  const noctilaWeapons = [
    ['루트바인 스태프','입문','스태프','자연','벨페고르·앨런·아가레스·윈스톤 특별 보상'],
    ['템페스트 해머','입문','망치','강철','벨페고르·앨런·아가레스·윈스톤 특별 보상'],
    ['아크 블래스터','견습','총','한기','앨런·아가레스·윈스톤 특별 보상'],
    ['레디언트 윙보우','정예','활','뇌전','아가레스·윈스톤 특별 보상'],
    ['글레이셜 스피어','정예','창','한기','아가레스·윈스톤 특별 보상'],
    ['인페르널 클레이모어','영웅','대검','화염','윈스톤 특별 보상'],
    ['팬텀 사이드','영웅(인피니티)','낫','강철','인피니티 타워 클리어 보상']
  ];
  noctilaWeapons.forEach(([name,grade,type,element,acq])=>addItem(name,{
    region:'노크틸라', category:'무기', subcategory:`${grade} · ${type}`,
    acquire:acq, use:'노크틸라 전투 무기입니다. 브론에게 강화하고 시온에게 스킬을 해금·장착하며 애리에게 룬을 장착할 수 있습니다.',
    note:`등급: ${grade} / 종류: ${type} / 속성: ${element}. 무기 강화는 공식 기준 모든 단계 100% 성공하며 +3·+6·+9·+12·+14·+15에서 외형이 변화합니다.`,
    related:['노크틸라 무기 강화','스킬 강화','룬 장착'], sourceUrl:OFFICIAL.noctilaEquipment,
    tags:['노크틸라','무기','강화','브론','시온','애리',grade,type,element]
  }));

  ['펜던트','링','이어링','벨트'].forEach(part=>{
    addItem(`카르벤 ${part}`,{region:'노크틸라',category:'장신구',subcategory:'입문',acquire:'노크틸라 메인 퀘스트에서 획득합니다.',use:'브론에게 강화해 세리온 → 브렉사 → 오브레 단계로 성장시키는 장신구입니다.',related:['장신구 강화','미약한 수호석','어빌리티 스톤'],sourceUrl:OFFICIAL.noctilaEquipment});
    addItem(`세리온 ${part}`,{region:'노크틸라',category:'장신구',subcategory:'견습',acquire:`카르벤 ${part} 5강에서 등급 상승 강화를 성공해 획득합니다.`,use:'브론에게 강화해 브렉사 단계로 성장시키는 장신구입니다.',related:['장신구 강화','안정된 수호석','어빌리티 스톤'],sourceUrl:OFFICIAL.noctilaEquipment});
    addItem(`브렉사 ${part}`,{region:'노크틸라',category:'장신구',subcategory:'정예',acquire:`세리온 ${part} 5강에서 등급 상승 강화를 성공해 획득합니다.`,use:'브론에게 강화해 오브레 단계로 성장시키는 장신구입니다.',related:['장신구 강화','강화된 수호석','어빌리티 스톤'],sourceUrl:OFFICIAL.noctilaEquipment});
    addItem(`오브레 ${part}`,{region:'노크틸라',category:'장신구',subcategory:'영웅',acquire:`브렉사 ${part} 5강에서 등급 상승 강화를 성공해 획득합니다.`,use:'노크틸라 상위 장신구입니다. 브론에게 완성된 수호석으로 +5까지 강화할 수 있습니다.',related:['장신구 강화','완성된 수호석'],sourceUrl:OFFICIAL.noctilaEquipment});
  });

  addItem('노크틸라 무기 강화',{region:'노크틸라',category:'가이드',subcategory:'전투 성장',acquire:'노크틸라 마을 NPC 브론에게 말을 걸고 1번 → 장비 강화하기를 선택합니다.',use:'노크틸라 무기의 공격 성능과 스킬 슬롯 조건을 올리는 시스템입니다.',note:'무기 강화는 공식 위키 기준 전 단계 100% 성공. +3·+6·+9·+12·+14·+15에서 외형이 변화합니다. 등급별로 요구하는 격파석과 골드·전리품·보스 코어가 달라집니다.',related:noctilaWeapons.map(x=>x[0]),sourceUrl:OFFICIAL.noctilaWeaponEnhancement,tags:['브론','무기강화','노크틸라']});
  addItem('장신구 강화',{region:'노크틸라',category:'가이드',subcategory:'전투 성장',acquire:'노크틸라 마을 NPC 브론에게 말을 걸고 1번 → 장비 강화하기를 선택합니다.',use:'장신구의 체력·방어력을 높이고 카르벤 → 세리온 → 브렉사 → 오브레로 성장시키는 시스템입니다.',note:'각 등급은 +1~+5 강화 후 다음 등급으로 승급합니다. 등급 내 성공률은 90/70/50/30/10%, 승급 성공률은 5%이며 확정 강화 시도 횟수가 존재합니다. 승급 시 어빌리티 스톤이 추가로 필요합니다.',related:['미약한 수호석','안정된 수호석','강화된 수호석','완성된 수호석','어빌리티 스톤'],sourceUrl:OFFICIAL.noctilaAccessoryEnhancement,tags:['브론','장신구','강화']});
  addItem('스킬 강화',{region:'노크틸라',category:'가이드',subcategory:'전투 성장',acquire:'노크틸라 마을 NPC 시온에게 말을 겁니다. 1번은 무기 스킬 장착, 2번은 무기 스킬 강화입니다.',use:'무기 스킬 슬롯과 스킬을 해금하고 각성석으로 스킬을 강화하는 시스템입니다.',note:'슬롯 해금: 무기 +3/6/9/12강에서 봉인 해방의 인장 1/3/5/10개. 스킬 해금에는 능력 개방의 문장, 스킬 강화에는 무기 등급에 맞는 각성석이 필요합니다.',related:['봉인 해방의 인장','능력 개방의 문장','미약한 각성석','안정된 각성석','강화된 각성석','완성된 각성석'],sourceUrl:OFFICIAL.noctilaSkillEnhancement,tags:['시온','스킬','스킬슬롯']});
  addItem('룬 장착',{region:'노크틸라',category:'가이드',subcategory:'전투 성장',acquire:'노크틸라 마을 NPC 애리에게 말을 걸고 1번 → 룬 장착하기를 선택합니다.',use:'무기 하나에 최대 3개의 룬을 장착해 전투 효과를 부여합니다.',note:'같은 종류 룬 효과는 중첩됩니다. 장착한 룬을 해제하면 룬은 소멸하므로 실수로 빼지 않도록 주의하세요.',related:['루키 등급 룬','커먼 등급 룬','노멀 등급 룬','레어 등급 룬'],sourceUrl:OFFICIAL.noctilaRune,tags:['애리','룬','장착']});

  update('봉인 해방의 인장',{region:'노크틸라',category:'스킬 재료',acquire:'노크틸라 미니보스 특별 보상에서 3% 확률로 획득하거나 관련 퀘스트 보상으로 얻습니다.',use:'무기 스킬 슬롯 해금에 사용합니다. 슬롯 1/2/3/4 해금에 각각 1/3/5/10개가 필요하며, 최소 무기 강화 +3/+6/+9/+12 조건도 충족해야 합니다.',sourceUrl:OFFICIAL.noctilaSkillEnhancement,related:['스킬 강화']});
  update('능력 개방의 문장',{region:'노크틸라',category:'스킬 재료',acquire:'노크틸라 미니보스 특별 보상에서 5% 확률로 획득하거나 관련 퀘스트 보상으로 얻습니다.',use:'각 무기의 개별 스킬을 해금하는 데 사용합니다. 스킬마다 요구 개수와 해금 골드가 다릅니다.',sourceUrl:OFFICIAL.noctilaSkillEnhancement,related:['스킬 강화']});
  update('미약한 각성석',{use:'입문 등급 무기 스킬 강화에 사용합니다. 공식 스킬 강화표에서 각 강화 시도마다 1개가 필요합니다.',sourceUrl:OFFICIAL.noctilaSkillEnhancement});
  update('안정된 각성석',{use:'견습 등급 무기 스킬 강화에 사용합니다. 공식 스킬 강화표에서 각 강화 시도마다 1개가 필요합니다.',sourceUrl:OFFICIAL.noctilaSkillEnhancement});
  update('강화된 각성석',{use:'정예 등급 무기 스킬 강화에 사용합니다. 공식 스킬 강화표에서 각 강화 시도마다 1개가 필요합니다.',sourceUrl:OFFICIAL.noctilaSkillEnhancement});
  update('완성된 각성석',{use:'영웅 등급 무기 스킬 강화에 사용합니다. 공식 스킬 강화표에서 각 강화 시도마다 1개가 필요합니다.',sourceUrl:OFFICIAL.noctilaSkillEnhancement});

  const skillUnlockStages=[3,6,6,9,12];
  const noctilaSkills = {
    '루트바인 스태프':[['리프 시커',1,30000],['바인 크리프',3,50000],['우드 서지',5,70000],['버던트 메테오',7,100000],['그로브 클랩',10,300000]],
    '템페스트 해머':[['스틸 임팩트',3,50000],['헤비 사이클론',5,70000],['그랜드 크러시',7,100000],['오리진 이지스',10,300000],['팔라딘 저지먼트',15,500000]],
    '아크 블래스터':[['에너지 버스트',5,70000],['브로드 샷',7,100000],['락온 트리거',10,300000],['펄스 레이닝',15,500000],['오버클락 프로토콜',20,700000]],
    '레디언트 윙보우':[['차지 블로우',10,100000],['스위프트 샷',15,300000],['컨비전스 스플릿',20,500000],['리니어 레인',30,700000],['세라핌 디센트',50,1000000]],
    '글레이셜 스피어':[['피어스 폴',10,100000],['스러스트 러시',15,300000],['플리커 랜서',20,500000],['프로스트 드롭',30,700000],['앱솔루트 도미니온',50,1000000]],
    '인페르널 클레이모어':[['플래임 슬래시',20,150000],['리버스 커터',30,500000],['업리프트 임팩트',40,700000],['드래곤 이그니션',50,1000000],['와이번 어웨이크',60,1500000]],
    '팬텀 사이드':[['데스 사이클론',20,150000],['위습 버스트',30,500000],['소울 디스크',40,700000],['커스 소서러',50,1000000],['이터널 나이트메어',60,1500000]]
  };
  const weaponAwakenStone = {'루트바인 스태프':'미약한 각성석','템페스트 해머':'미약한 각성석','아크 블래스터':'안정된 각성석','레디언트 윙보우':'강화된 각성석','글레이셜 스피어':'강화된 각성석','인페르널 클레이모어':'완성된 각성석','팬텀 사이드':'완성된 각성석'};
  Object.entries(noctilaSkills).forEach(([weapon,skills])=>skills.forEach(([skill,seals,gold],idx)=>addItem(skill,{
    region:'노크틸라',category:'무기 스킬',subcategory:weapon,
    acquire:`${weapon}를 최소 +${skillUnlockStages[idx]}강까지 강화한 뒤 노크틸라 마을 시온의 '무기 스킬 장착하기'에서 능력 개방의 문장 ${seals}개와 ${gold.toLocaleString('ko-KR')} G를 사용해 해금합니다.`,
    use:`${weapon} 전용 스킬입니다. 해금 후 스킬 슬롯에 장착해 사용하며, ${weaponAwakenStone[weapon]}으로 최대 7강까지 강화할 수 있습니다.`,
    related:[weapon,'스킬 강화','능력 개방의 문장',weaponAwakenStone[weapon]], sourceUrl:OFFICIAL.noctilaSkillEnhancement,
    tags:['스킬','해금','시온',weapon]
  })));

  addItem('좌표 스크롤',{region:'노크틸라',category:'편의 아이템',subcategory:'이동',
    acquire:'노크틸라 마을 세라에게 1,000,000 G로 계정당 1회 구매(거래 불가)하거나, 로얄상점 루아에게 50,000 크리스탈로 반복 구매(거래 가능)할 수 있습니다.',
    use:'노크틸라에서 원하는 위치를 저장하고 우클릭으로 그 위치로 이동합니다. 쉬프트+우클릭으로 위치 저장, 모든 좌표 스크롤은 1분 쿨타임을 공유합니다.',
    note:'위치 저장은 노크틸라에서만 가능. /좌표스크롤 이름 [이름]은 최대 8자, /좌표스크롤 설명 [설명]은 공백 포함 최대 30자이며 ||로 줄바꿈할 수 있습니다.',
    trade:'세라 구매본 거래 불가 / 루아 구매본 거래 가능', sourceUrl:OFFICIAL.coordinateScroll, tags:['세라','루아','텔레포트','좌표','1000000','50000']});

  // 룬 20종 × 4등급 효과를 공식 룬 문서 기준으로 보강한다.
  const runeEffects = {
    '파괴':['전체 피해량','1%','2%','3%','5%'], '타격':['평타 피해량','2%','3%','5%','7%'], '증폭':['스킬 피해량','2%','3%','5%','7%'],
    '기습':['선제 공격 피해량','3%','5%','7%','10%'], '사냥':['일반 몬스터 피해량','1%','2%','3%','5%'], '지배':['보스 몬스터 피해량','1%','2%','3%','5%'],
    '개시':['체력이 가득 찬 몬스터 대상 피해량','3%','5%','7%','10%'], '처형':['체력 30% 미만 몬스터 대상 피해량','2%','3%','5%','7%'],
    '한기':['한기 속성 피해량','10%','15%','20%','25%'], '화염':['화염 속성 피해량','10%','15%','20%','25%'], '자연':['자연 속성 피해량','10%','15%','20%','25%'],
    '뇌전':['뇌전 속성 피해량','10%','15%','20%','25%'], '강철':['강철 속성 피해량','10%','15%','20%','25%'], '흡혈':['가한 피해량 비례 체력 회복','0.25%','0.5%','0.75%','1%'],
    '열상':['출혈 발동 확률','10%','15%','20%','25%'], '출혈':['출혈 피해량','7%','10%','15%','20%'], '정밀':['치명타 발동 확률','7%','10%','15%','20%'],
    '치명':['치명타 피해량','2%','3%','5%','7%'], '역습':['반격 발동 확률','15%','20%','25%','30%'], '반격':['반격 피해량','2%','3%','5%','7%']
  };
  const runeGradeIndex={루키:1,커먼:2,노멀:3,레어:4};
  Object.entries(runeEffects).forEach(([kind,vals])=>Object.entries(runeGradeIndex).forEach(([grade,idx])=>update(`${kind}의 룬 (${grade})`,{
    use:`무기에 장착하면 ${vals[0]}이 ${vals[idx]} 증가합니다. 무기당 룬은 최대 3개이며 같은 종류도 중첩됩니다.`,
    note:'노크틸라 마을 애리에게 장착합니다. 장착한 룬을 해제하면 소멸하므로 주의하세요.',sourceUrl:OFFICIAL.noctilaRune,related:['룬 장착']
  })));

  // ─────────────────────────────────────────────────────────────
  // 파라다이스
  // ─────────────────────────────────────────────────────────────
  ['노멀','레어','에픽','전설','신화'].forEach(g=>{
    addItem(`${g} 계곡 물고기`,{region:'파라다이스',category:'낚시',subcategory:'계곡 물고기',acquire:'파라다이스 계곡 전역에서 선샤인 낚싯대로 낚습니다.',sourceUrl:OFFICIAL.paradise});
    addItem(`${g} 바다 물고기`,{region:'파라다이스',category:'낚시',subcategory:'바다 물고기',acquire:'파라다이스 바다 전역에서 선샤인 낚싯대로 낚습니다.',sourceUrl:OFFICIAL.paradise});
    addItem(`${g} 계곡 생물`,{region:'파라다이스',category:'낚시',subcategory:'계곡 생물',acquire:'파라다이스 계곡 전역에서 선샤인 낚싯대로 낚습니다.',sourceUrl:OFFICIAL.paradise});
    addItem(`${g} 바다 생물`,{region:'파라다이스',category:'낚시',subcategory:'바다 생물',acquire:'파라다이스 바다 전역에서 선샤인 낚싯대로 낚습니다.',sourceUrl:OFFICIAL.paradise});
  });
  addItem('하급 파도 결정석',{region:'파라다이스',category:'강화 재료',acquire:'파라다이스의 투카니에게 어획물을 합성하여 얻습니다.',use:'파라다이스 강화 재료이며 중급 결정석의 하위 재료입니다.',sourceUrl:OFFICIAL.paradise});
  addItem('중급 파도 결정석',{region:'파라다이스',category:'강화 재료',acquire:'하급 파도 결정석을 교환하여 얻습니다.',use:'파라다이스 강화 재료이며 상급 결정석의 하위 재료입니다.',sourceUrl:OFFICIAL.paradise});
  addItem('상급 파도 결정석',{region:'파라다이스',category:'강화 재료',acquire:'중급 파도 결정석을 교환하여 얻습니다.',use:'파라다이스 상위 강화 재료입니다.',sourceUrl:OFFICIAL.paradise});
  addItem('오로라 조각',{region:'파라다이스',category:'강화 재료',acquire:'파라다이스 계곡과 바다 전역에서 선샤인 낚싯대로 낚습니다.',sourceUrl:OFFICIAL.paradise});
  addItem('파라다이스 랜덤 박스',{region:'파라다이스',category:'랜덤 박스',acquire:'파라다이스 콘텐츠에서 획득합니다.',use:'열어 파라다이스 관련 보상을 획득합니다.',sourceUrl:OFFICIAL.paradise});
  addItem('아쿠아 코인',{region:'파라다이스',category:'화폐',acquire:'파라다이스 콘텐츠 보상으로 획득합니다.',use:'파라다이스 전용 교환/상점 화폐입니다.',sourceUrl:OFFICIAL.paradise});

  // ─────────────────────────────────────────────────────────────
  // 뱃지 — 공식 위키에 등재된 이름 전체
  // ─────────────────────────────────────────────────────────────
  addMany('작은 온기의 증표|희미한 불씨의 증표|뜨거운 열기의 증표|맹렬한 화염의 증표|위대한 불멸의 증표',{region:'공통',category:'뱃지',subcategory:'펀딩 한정',acquire:'사전 펀딩 이벤트 참여 보상으로 획득합니다.',use:'뱃지 시스템에 장착/사용합니다.',sourceUrl:OFFICIAL.badge});
  addMany('성실한 노력의 증표|불변한 신념의 증표',{region:'공통',category:'뱃지',subcategory:'2025 8월 추천',acquire:'2025 8월 추천 이벤트 참여 보상입니다.',use:'뱃지 시스템에 장착/사용합니다.',sourceUrl:OFFICIAL.badge});
  addMany('성탄의 과일 바구니|성탄의 축배|성탄의 붉은 열매',{region:'공통',category:'뱃지',subcategory:'2025 크리스마스',acquire:'2025 크리스마스 이벤트 참여 보상입니다.',use:'뱃지 시스템에 장착/사용합니다.',sourceUrl:OFFICIAL.badge});
  addItem('복이 깃든 부채',{region:'공통',category:'뱃지',subcategory:'2026 설날',acquire:'2026 설날 이벤트 참여 보상입니다.',sourceUrl:OFFICIAL.badge});
  addItem('신나는 풍선 뭉치',{region:'공통',category:'뱃지',subcategory:'2026 가정의 달',acquire:'2026 가정의 달 이벤트 참여 보상입니다.',sourceUrl:OFFICIAL.badge});
  addItem('시원한 오리 튜브',{region:'공통',category:'뱃지',subcategory:'2026 여름',acquire:'2026 여름 이벤트 참여 보상입니다.',sourceUrl:OFFICIAL.badge});
  addItem('소원 들어주는 달토끼',{region:'공통',category:'뱃지',subcategory:'2026 추석',acquire:'2026 추석 이벤트 참여 보상입니다.',sourceUrl:OFFICIAL.badge});
  const normalBadgeGroups = {
    '체력':'순환의 생명 물약 (+1)|견고한 바위 (+1)|생기로운 청과 (+2)|만개한 꽃병 (+2)',
    '회복력':'싱그러운 새싹 (+1)|붉은 장미꽃 (+1)|치유의 고리 (+2)|무지개빛 생화 (+2)',
    '점프력':'청빛의 결정 (+1)|바람의 깃털 (+1)|영롱한 나비 날개 (+2)|비상의 상징 (+2)',
    '공격력':'초심의 검 (+1)|자연의 검 (+1)|찬란한 금검 (+2)|서리의 날 (+2)',
    '민첩성':'날렵한 깃털 (+1)|민첩한 벌의 날개 (+1)|청풍의 부채 (+2)|활강의 가속 망토 (+2)',
    '파괴력':'거친 도끼 (+1)|무거운 곡괭이 (+1)|암흑의 낫 (+2)|적황의 곡괭이 (+2)',
    '낙법':'착지의 지팡이 (+1)|유연한 도마뱀 친구 (+1)|완충의 꽃잎 (+2)|봄빛의 발찌 (+2)',
    '수영 속도':'유영의 물약 (+1)|바다 거북의 등껍질 (+1)|청해의 반지 (+2)|해류의 문장 (+2)',
    '비행 속도':'숲지기의 망토 (+1)|요정의 날개 (+1)|어스름의 날개깃 (+2)|칠흑의 까마귀 (+2)',
    '블록 설치':'대지의 석판 (+1)|장인의 설계서 (+1)|정교한 카드 (+2)|봉인된 시공 고서 (+2)',
    '거인':'장대한 석상 (+1)|거인의 해골 (+1)|영광의 금상 (+2)|태고의 투구 (+2)',
    '요정':'작은 씨앗 (+1)|숲의 도토리 (+1)|작은 고슴도치 친구 (+2)|요정의 꽃핀 (+2)'
  };
  Object.entries(normalBadgeGroups).forEach(([sub,names])=>addMany(names,{region:'공통',category:'뱃지',subcategory:`일반 · ${sub}`,acquire:'하이퍼샵 루아가 판매하는 일반 뱃지 보급품에서 확률적으로 획득합니다.',use:`${sub} 계열 능력치를 제공하는 뱃지입니다.`,sourceUrl:OFFICIAL.badge}));
  const sailBadgeGroups = {
    '체력/생명력':'홍옥의 팔찌 (+1)|맑은 생명의 조각 (+2)|회복의 팔찌 (+1)|재생의 백합 (+2)',
    '점프력/공격력':'도약의 원반 (+1)|경쾌한 새 친구 (+2)|번개의 활 (+1)|심해의 삼지창 (+2)',
    '민첩성/파괴력':'가벼운 바람깃 (+1)|속행의 묘약 (+2)|가벼운 도끼날 (+1)|영혼의 도끼 (+2)',
    '낙법/수영 속도':'완충의 양산 (+1)|분홍 나비 날개 (+2)|심해의 결정 (+1)|해류의 투구 (+2)',
    '비행 속도':'해풍의 나비 (+1)|추락한 날개의 편린 (+1)|활강의 영약 (+2)',
    '블록 설치':'설계자의 서신 (+1)|건축용 톱날 (+1)|불가사의한 상자 (+2)',
    '거인/요정':'거인의 여신상 (+1)|소중한 귀걸이 (+1)',
    '잠행':'은신자의 가면 (+1)|밤의 반지 (+1)',
    '개체 거리':'제사의 창 (+1)|선조의 검 (+1)',
    '블록 거리':'건축가의 가방 (+1)|지혜의 고서 (+1)',
    '계단':'고대의 계단 (+1)|천상의 성배 (+1)'
  };
  Object.entries(sailBadgeGroups).forEach(([sub,names])=>addMany(names,{region:'공통',category:'뱃지',subcategory:`항해/탐사 · ${sub}`,acquire:'항해와 해양 탐사 보상을 통해 획득합니다.',use:`${sub} 계열 능력치를 제공하는 뱃지입니다.`,sourceUrl:OFFICIAL.badge}));

  // ─────────────────────────────────────────────────────────────
  // 공식 확률표에만 등장하는 검색 보강 아이템들
  // ─────────────────────────────────────────────────────────────
  const enchantNames = '상급 행운|상급 효율|상급 날카로움|상급 보호|발화|친수성|물갈퀴|가벼운 착지|호흡|영혼 가속|신속한 잠행|약탈|무한|충성|급류|반격|위력|골절|광휘|백신|탈출|소화|마무리|속박|견갑|흡혈|잠행|복원|혈전|불멸|활력|심호흡|반사|수호|격퇴|창공|벌목|흡혈귀|흡수|가벼운 걸음|투시|서두름|견고함|노련한 손길|상급 약탈'.split('|');
  enchantNames.forEach(n=>addItem(`${n} 인챈트북`,{region:'야생/공통',category:'강화',subcategory:'확률표 인챈트북',acquire:'인챈트 캡슐·보급품·이벤트 상자 등 공식 확률표의 해당 보상군에서 획득합니다.',use:'야생 장비 인챈트에 사용합니다. 괄호로 표시되는 성공 확률은 획득처/등급에 따라 다를 수 있어 해당 확률표를 확인하세요.',sourceUrl:OFFICIAL.capsule}));
  addMany('보초 갑옷 장식|야생 갑옷 장식|사구 갑옷 장식|고요 갑옷 장식|갈비뼈 갑옷 장식|첨탑 갑옷 장식|나사 갑옷 장식|사육사 갑옷 장식|물결 갑옷 장식|양조가 도자기 조각|해골 도자기 조각|광부 도자기 조각|다발 도자기 조각|찢어진 심장 도자기 조각|친구 도자기 조각|불탐 도자기 조각|풍부 도자기 조각|탐험가 도자기 조각|낚시꾼 도자기 조각|긁개 도자기 조각|소용돌이 도자기 조각|13 음반|blocks 음반|far 음반|mellohi 음반|strad 음반|ward 음반|wait 음반|Creator 음반|Precipice 음반|바다의 심장',{region:'공통',category:'캡슐/수집',subcategory:'공식 캡슐 확률표',acquire:'공식 캡슐 확률표의 보상 아이템으로 획득합니다.',use:'장식/수집/기타 서버 콘텐츠 아이템입니다.',sourceUrl:OFFICIAL.capsule});
  addMany('대두 치장 획득권|중두 치장 획득권|코스메틱 코인|드래곤 겉날개 스킨 스크롤|알레이 겉날개 스킨 스크롤|벡스 겉날개 스킨 스크롤|앵무새 겉날개 스킨 스크롤|팬텀 겉날개 스킨 스크롤|글리치 대미지 스킨 획득권|치즈 대미지 스킨 획득권|엘프 대미지 스킨 획득권|POP 대미지 스킨 획득권|혈전 대미지 스킨 획득권|블록 대미지 스킨 획득권|솜사탕 대미지 스킨 획득권|레인보우 스타|체리 블라썸|화이트 스노우|러블리 하트|트윙클 글리터|프리즘 버블|코스믹 갤럭시',{region:'공통',category:'코스메틱',subcategory:'캡슐 보상',acquire:'관련 코스메틱/스킨/실루엣 캡슐의 공식 확률표에서 획득합니다.',use:'외형·연출·코스메틱 기능에 사용합니다.',sourceUrl:OFFICIAL.capsule});
  addMany('해왕의 곡괭이 스킨 스크롤|해왕의 도끼 스킨 스크롤|해왕의 삽 스킨 스크롤|해왕의 괭이 스킨 스크롤|해왕의 검 스킨 스크롤|해왕의 방패 스킨 스크롤|해왕의 활 스킨 스크롤|해왕의 쇠뇌 스킨 스크롤|해왕의 낚싯대 스킨 스크롤',{region:'공통',category:'코스메틱',subcategory:'도구 스킨',acquire:'해왕의 도구 스킨 보급품에서 공식 확률표에 따라 획득합니다.',use:'해당 도구의 외형 스킨에 사용합니다.',sourceUrl:OFFICIAL.supply});
  addMany('학교 초록색 칠판|학교 검정색 칠판|학교 학생용 의자|학교 교사용 의자|학교 책 더미|학교 책장|학교 2인용 책상|학교 1인용 책상|학교 종이|학교 게시판|학교 쓰레기통|학교 벽시계|학교 교사용 책상|정원 아치|정원 관목|정원 울타리|정원 스탠드|정원 기둥|파괴된 정원 기둥|정원 벤치|정원 가로등|정원 격자|정원 의자|정원 테이블|정원 분수|정원 나무|정원 꽃 핀 나무|정원 카트|정원 도구 정리장|정원 물뿌리개|정원 쓰레기통|버스 정류장|콘크리트 바리케이드|공사장 바리케이드|회색 대형 쓰레기통|녹색 대형 쓰레기통|초록 소화전|빨간 소화전|노란 소화전|대형 라바콘|금속 바리케이드|파란 재활용 수거함|초록 재활용 수거함|버스 정류장 표지판|속도 제한 25 표지판|속도 제한 50 표지판|주차 표지판|정지 표지판|양방향 표지판|라바콘|기본 신호등 A형|기본 신호등 B형|기둥 신호등 A형|기둥 신호등 B형|대형 신호등 A형|대형 신호등 B형|공공 쓰레기통|낚시용 양동이|기대어 있는 낚싯대|낚싯대 거치대|낚시 작업대|빈 낚시 작업대|생선 도마|생선 건조대|빈 생선 건조대|대형 생선 건조대|빈 대형 생선 건조대|생선 걸이대|대형 생선 걸이대|상어 전시대|파란 낚시 도구함|빨간 낚시 도구함',{region:'공통',category:'가구',subcategory:'보급품',acquire:'해당 가구 보급품에서 공식 확률표에 따라 획득합니다.',use:'마을/건축 장식용 가구입니다.',sourceUrl:OFFICIAL.supply});
  addMany('산타 인형|[겨울의 기적] 엠블럼 획득권|로즈골드 닉네임 색상 획득권|산타 모자 치장 획득권|프레스티지 멤버십 5일권|벨 코인|빨간 크리스마스 장식|초록 크리스마스 장식|파란 크리스마스 장식|하얀 크리스마스 장식|산타 코인|산타 큐비 입양권 (자석 5칸)|루돌프 큐비 입양권 (자석 3칸)|노움 큐비 입양권|펭귄 큐비 입양권|트리 큐비 입양권|선물 상자 큐비 입양권|진저브레드 큐비 입양권|축제 기관차|축제 객차|축제 화물차|축제 호두까기 인형|축제 호두까기 봉제인형|축제 장식품|축제 바닥 랜턴|축제 천장 랜턴|축제 가로등|축제 순록 봉제인형|축제 순록 벽걸이|축제 순록 흔들의자|축제 썰매|축제 눈사람|축제 전화부스|축제 별 장식|작은 축제 별 가랜드|큰 축제 별 가랜드|겨울 벽난로|겨울 흔들의자|겨울 스노우볼|진저브레드 하우스|진저브레드 러그|크리스마스 트리|크리스마스 노움 봉제인형|크리스마스 양말 장식|사탕 지팡이 장식|축제 종 천장 장식',{region:'이벤트',category:'이벤트',subcategory:'2025 크리스마스',acquire:'2025 크리스마스 이벤트 보상/랜덤 박스/보급품에서 공식 확률표에 따라 획득합니다.',use:'이벤트·코스메틱·가구·펫 관련 아이템입니다.',sourceUrl:OFFICIAL.miscOdds});
  addMany('한글 닉네임 변경권|안경 치장 캡슐|2025 크리스마스 자석 펫 보급품|일반 뱃지 보급품|한글 닉네임 변경 캡슐|프레스티지 멤버십 1일권|카페 가구 보급품|거실 가구 보급품|욕실 가구 보급품|침실 가구 보급품|주방 가구 보급품|정원 가구 보급품',{region:'공통',category:'보급품/유틸',acquire:'공식 기타 아이템 확률표의 랜덤 보상군에서 획득합니다.',use:'이름에 표시된 서버 편의·코스메틱·가구 기능에 사용합니다.',sourceUrl:OFFICIAL.miscOdds});

  // 이모티콘 칭호도 검색 가능하도록 등록
  addMany("[(~˘▾˘)~]|[(ง •̀_•́)ง]|[(๑❛ڡ❛๑)☆]|[٩( 'ω' )و]|[( •̅_•̅ )|[(｡•́︿•̀｡)]|[ʕ•ܫ•ʔ]|[(⇀‸↼‶)]|[•᷄⌓•᷅]|[・ヘ・?]|[꒰ ՞•ﻌ•՞ ꒱]|[(՞៸៸›⩊‹៸៸՞)]|[(◍'ᗜ'◍)]|[(ᗜ ˰ ᗜ꧞)]|[(ㆆ. ㆆ )]",{region:'공통',category:'칭호/코스메틱',subcategory:'이모티콘 칭호',acquire:'이모티콘 칭호 캡슐에서 획득합니다.',use:'닉네임/칭호 연출용 코스메틱입니다.',sourceUrl:OFFICIAL.capsule});

  // ─────────────────────────────────────────────────────────────
  // 레시피에 등장하는 마인크래프트 기본 재료: 뉴비가 막히지 않도록 최소 안내
  // ─────────────────────────────────────────────────────────────
  const vanilla = '사탕수수|금 괭이|버섯불|밀|비트|당근|감자|발광 열매|금 곡괭이|자수정 블록|구리 주괴|다이아몬드|네더라이트 주괴|낚싯대|열대어|금 검|가죽|깃털|썩은 살점|뼈다귀|블레이즈 막대기|엔더 진주|조약돌|심층암 조약돌|구리 블록|레드스톤 블록|청금석 블록|철 블록|다이아몬드 블록|금 블록|에메랄드|철|거미줄|사과|부싯돌|철 곡괭이|응회암|발광 이끼|뾰족한 점적석|석영|금 주괴|흑암|현무암|용암 양동이|참나무 보트|해초|참나무 판자|익힌 대구|익힌 연어|철사 덫 갈고리|케이크|코코아 콩|숫돌|석재 절단기|훈연기|제작대|에메랄드 블록|석탄 블록|네더라이트 블록|신호기|브리즈 막대기|엔더의 눈|대장장이 작업대|마법 부여대|위더 장미|장식된 도자기|앵무조개 껍데기|통|영혼 랜턴|우는 흑요석|네더라이트 곡괭이|모루|경험치병|네더 석영|모닥불|모래|양동이|유리판|대나무|분홍 꽃잎|막대기|자수정 조각|흑요석|시계|점토|흙|자갈|화강암|참나무 잎|가문비나무 잎|자작나무 잎|벚나무 잎|짙은 참나무 잎|철 주괴|불우렁쉥이|유리병|네더랙|마그마 블록|영혼 흙|진홍빛 자루|뒤틀린 자루|죽은 관 산호 블록|죽은 사방산호 블록|죽은 거품 산호 블록'.split('|');
  vanilla.forEach(n=>addItem(n,{region:'마인크래프트 기본',category:'기본 재료',acquire:'마인크래프트 기본 월드 채집·제작·제련·사냥 등으로 얻는 재료입니다. 서버 전용 획득 규칙이 별도로 있으면 공식 공지를 우선 확인하세요.',use:'서버 제작 레시피의 기초 재료입니다.',official:false,sourceLabel:'기본 게임 재료',sourceUrl:'https://minecraft.wiki/'}));


  // ─────────────────────────────────────────────────────────────
  // 모든 공식 상점 카탈로그 + 현재 요리/재료 DB 이름을 검색 인덱스에 합친다.
  // 수작업 백과에 누락된 판매/구매 전용 아이템도 여기서 자동 편입된다.
  // ─────────────────────────────────────────────────────────────
  const shopRows = window.DDING_SHOP_DATA?.items || [];
  const shopGroups = new Map();
  shopRows.forEach(row=>{
    if (!row?.name) return;
    if (!shopGroups.has(row.name)) shopGroups.set(row.name,[]);
    shopGroups.get(row.name).push(row);
  });
  shopGroups.forEach((rows,name)=>{
    let item = byName.get(name);
    if (!item) {
      const buy = rows.find(x=>x.action==='buy');
      const exch = rows.find(x=>x.action==='exchange');
      const sell = rows.find(x=>x.action==='sell');
      const primary = buy || exch || sell || rows[0];
      let acquire = '공식 상점 거래 목록에 확인되는 아이템입니다.';
      if (buy) acquire = `${buy.region} ${buy.location}의 ${buy.npc}에게서 ${buy.value}로 구매할 수 있습니다.`;
      else if (exch) acquire = `${exch.region} ${exch.location}의 ${exch.npc}에게서 ${exch.value} 조건으로 교환할 수 있습니다.`;
      else if (sell) acquire = `공식 상점에서 ${sell.npc}가 매입하는 품목입니다. 직접 획득처는 해당 콘텐츠/기본 게임 수급 경로를 확인하세요.`;
      let use = '서버 상점/거래 카탈로그에 등록된 아이템입니다.';
      if (sell) use += ` ${sell.region} ${sell.location}의 ${sell.npc}에게 ${sell.value}로 판매할 수 있습니다.`;
      item = addItem(name,{region:primary.region||'공통',category:primary.category||'상점/거래',subcategory:'공식 상점 카탈로그',acquire,use,sourceUrl:primary.sourceUrl,verified:primary.verified||'2026-09-30'});
    }
    item.shopEntries = rows.map(x=>({action:x.action,value:x.value,region:x.region,location:x.location,npc:x.npc,category:x.category,note:x.note,sourceUrl:x.sourceUrl}));
    if (!item.trade && rows.length) item.trade = rows.map(x=>`${x.action==='buy'?'구매':x.action==='sell'?'판매':'교환'} ${x.value} · ${x.region}/${x.location}/${x.npc}`).join(' | ');
  });

  const coreData = window.DDING_DATA || {};
  (coreData.foods || []).forEach(f=>{
    if (f?.name && !byName.has(f.name)) addItem(f.name,{region:'세레니티',category:'요리',acquire:'세레니티 요리 제작 시설에서 제작합니다.',use:'골드 수급용 요리이며 다른 제작의 재료가 될 수 있습니다.',sourceUrl:OFFICIAL.crafting});
    if (f?.gold?.name && !byName.has(f.gold.name)) addItem(f.gold.name,{region:'세레니티',category:'황금 요리',acquire:'세레니티 황금 요리 제작 시설에서 제작합니다.',use:'상위 판매용 황금 요리입니다.',sourceUrl:OFFICIAL.crafting});
  });
  Object.values(coreData.ingredients || {}).forEach(x=>{
    if (x?.name && !byName.has(x.name)) addItem(x.name,{region:'세레니티/야생',category:'요리 재료',acquire:x.source||'요리/채집 콘텐츠에서 획득합니다.',use:'요리 제작 재료입니다.',sourceUrl:OFFICIAL.serenity});
  });
  Object.values(coreData.crops || {}).forEach(x=>{
    if (x?.name && !byName.has(x.name)) addItem(x.name,{region:'야생/마을',category:'농작물',acquire:'농장 또는 야생에서 재배·채집합니다.',use:'요리와 가공의 기초 농작물입니다.',sourceUrl:OFFICIAL.serenity});
  });
  addItem('설탕',{region:'마인크래프트 기본',category:'기본 재료',acquire:'사탕수수로 제작하는 마인크래프트 기본 재료입니다. 이 사이트의 서버 레시피에서 설탕 큐브는 설탕이 아니라 사탕수수 64개를 직접 사용합니다.',use:'기본 게임 제작 재료입니다.',official:false,sourceUrl:'https://minecraft.wiki/',sourceLabel:'Minecraft Wiki'});

  const noctilaWeaponEnhancement = {
    '입문':[
      [1,5000,[['빛바랜 낙화',5]]],[2,15000,[['루미디아의 조각',1],['빛바랜 낙화',30]]],[3,35000,[['루미디아의 조각',7],['정제된 빛바랜 낙화',2]]],[4,50000,[['루미디아의 조각',15],['미약한 격파석',1],['정제된 빛바랜 낙화',3],['벨페고르의 코어',1]]],[5,150000,[['루미디아의 조각',40],['미약한 격파석',1],['선홍의 균사',20],['벨페고르의 코어',3]]],[6,250000,[['정제된 루미디아의 조각',2],['미약한 격파석',2],['선홍의 균사',50],['벨페고르의 코어',5]]],[7,350000,[['정제된 루미디아의 조각',3],['미약한 격파석',2],['정제된 선홍의 균사',2],['앨런의 코어',2]]],[8,500000,[['루미디아의 결정',10],['미약한 격파석',3],['고요한 포자',40],['앨런의 코어',5]]],[9,1000000,[['루미디아의 결정',20],['미약한 격파석',4],['정제된 고요한 포자',2],['앨런의 코어',7]]],[10,1500000,[['루미디아의 결정',30],['미약한 격파석',5],['정제된 고요한 포자',4],['아가레스의 코어',3]]],[11,2500000,[['루미디아의 결정',45],['미약한 격파석',6],['갈라진 암석',25],['아가레스의 코어',7]]],[12,3500000,[['루미디아의 결정',60],['미약한 격파석',7],['갈라진 암석',50],['아가레스의 코어',10]]],[13,7000000,[['정제된 루미디아의 결정',2],['미약한 격파석',8],['정제된 갈라진 암석',3],['윈스톤의 코어',5]]],[14,10000000,[['정제된 루미디아의 결정',3],['미약한 격파석',9],['정제된 갈라진 암석',4],['윈스톤의 코어',10]]],[15,15000000,[['정제된 루미디아의 결정',4],['미약한 격파석',10],['정제된 갈라진 암석',9],['윈스톤의 코어',15]]]
    ],
    '견습':[
      [1,10000,[['루미디아의 조각',2],['빛바랜 낙화',10]]],[2,25000,[['루미디아의 조각',14],['빛바랜 낙화',60]]],[3,60000,[['루미디아의 조각',30],['정제된 빛바랜 낙화',4]]],[4,90000,[['정제된 루미디아의 조각',2],['안정된 격파석',1],['정제된 빛바랜 낙화',6],['벨페고르의 코어',3]]],[5,220000,[['정제된 루미디아의 조각',4],['안정된 격파석',1],['선홍의 균사',40],['벨페고르의 코어',5]]],[6,360000,[['정제된 루미디아의 조각',6],['안정된 격파석',2],['정제된 선홍의 균사',2],['벨페고르의 코어',7]]],[7,520000,[['루미디아의 결정',20],['안정된 격파석',2],['정제된 선홍의 균사',4],['앨런의 코어',3]]],[8,750000,[['루미디아의 결정',40],['안정된 격파석',3],['정제된 고요한 포자',2],['앨런의 코어',7]]],[9,1400000,[['루미디아의 결정',60],['안정된 격파석',4],['정제된 고요한 포자',4],['앨런의 코어',10]]],[10,2100000,[['정제된 루미디아의 결정',2],['안정된 격파석',5],['정제된 고요한 포자',8],['아가레스의 코어',5]]],[11,3500000,[['정제된 루미디아의 결정',3],['안정된 격파석',6],['갈라진 암석',50],['아가레스의 코어',10]]],[12,7000000,[['정제된 루미디아의 결정',4],['안정된 격파석',7],['정제된 갈라진 암석',2],['아가레스의 코어',15]]],[13,10000000,[['정제된 루미디아의 결정',6],['안정된 격파석',8],['정제된 갈라진 암석',6],['윈스톤의 코어',10]]],[14,15000000,[['정제된 루미디아의 결정',8],['안정된 격파석',9],['정제된 갈라진 암석',8],['윈스톤의 코어',15]]],[15,20000000,[['정제된 루미디아의 결정',12],['안정된 격파석',10],['정제된 갈라진 암석',18],['윈스톤의 코어',20]]]
    ],
    '정예':[
      [1,15000,[['루미디아의 조각',4],['빛바랜 낙화',20]]],[2,40000,[['루미디아의 조각',28],['정제된 빛바랜 낙화',3]]],[3,90000,[['루미디아의 조각',60],['정제된 빛바랜 낙화',8]]],[4,130000,[['정제된 루미디아의 조각',4],['강화된 격파석',1],['정제된 빛바랜 낙화',12],['벨페고르의 코어',5]]],[5,300000,[['정제된 루미디아의 조각',8],['강화된 격파석',1],['정제된 선홍의 균사',2],['벨페고르의 코어',10]]],[6,500000,[['정제된 루미디아의 조각',12],['강화된 격파석',2],['정제된 선홍의 균사',5],['벨페고르의 코어',15]]],[7,700000,[['루미디아의 결정',40],['강화된 격파석',2],['정제된 선홍의 균사',8],['앨런의 코어',7]]],[8,1000000,[['정제된 루미디아의 결정',2],['강화된 격파석',3],['정제된 고요한 포자',4],['앨런의 코어',13]]],[9,2000000,[['정제된 루미디아의 결정',3],['강화된 격파석',4],['정제된 고요한 포자',8],['앨런의 코어',20]]],[10,3000000,[['정제된 루미디아의 결정',4],['강화된 격파석',5],['정제된 고요한 포자',16],['아가레스의 코어',10]]],[11,5000000,[['정제된 루미디아의 결정',6],['강화된 격파석',6],['정제된 갈라진 암석',2],['아가레스의 코어',20]]],[12,7000000,[['정제된 루미디아의 결정',8],['강화된 격파석',7],['정제된 갈라진 암석',5],['아가레스의 코어',30]]],[13,13000000,[['정제된 루미디아의 결정',12],['강화된 격파석',8],['정제된 갈라진 암석',12],['윈스톤의 코어',20]]],[14,17000000,[['정제된 루미디아의 결정',16],['강화된 격파석',9],['정제된 갈라진 암석',16],['윈스톤의 코어',30]]],[15,23000000,[['정제된 루미디아의 결정',24],['강화된 격파석',10],['정제된 갈라진 암석',36],['윈스톤의 코어',40]]]
    ],
    '영웅':[
      [1,30000,[['루미디아의 조각',8],['빛바랜 낙화',35]]],[2,70000,[['루미디아의 조각',56],['정제된 빛바랜 낙화',5]]],[3,150000,[['정제된 루미디아의 조각',3],['정제된 빛바랜 낙화',14]]],[4,200000,[['정제된 루미디아의 조각',8],['완성된 격파석',1],['정제된 빛바랜 낙화',21],['벨페고르의 코어',10]]],[5,500000,[['정제된 루미디아의 조각',16],['완성된 격파석',1],['정제된 선홍의 균사',3],['벨페고르의 코어',15]]],[6,700000,[['정제된 루미디아의 조각',24],['완성된 격파석',2],['정제된 선홍의 균사',9],['벨페고르의 코어',20]]],[7,1000000,[['정제된 루미디아의 결정',2],['완성된 격파석',2],['정제된 선홍의 균사',14],['앨런의 코어',10]]],[8,1500000,[['정제된 루미디아의 결정',4],['완성된 격파석',3],['정제된 고요한 포자',7],['앨런의 코어',20]]],[9,3000000,[['정제된 루미디아의 결정',6],['완성된 격파석',4],['정제된 고요한 포자',14],['앨런의 코어',30]]],[10,5000000,[['정제된 루미디아의 결정',8],['완성된 격파석',5],['정제된 고요한 포자',28],['아가레스의 코어',15]]],[11,7000000,[['정제된 루미디아의 결정',12],['완성된 격파석',6],['정제된 갈라진 암석',4],['아가레스의 코어',30]]],[12,10000000,[['정제된 루미디아의 결정',16],['완성된 격파석',7],['정제된 갈라진 암석',9],['아가레스의 코어',50]]],[13,15000000,[['정제된 루미디아의 결정',24],['완성된 격파석',8],['정제된 갈라진 암석',21],['윈스톤의 코어',20]]],[14,23000000,[['정제된 루미디아의 결정',32],['완성된 격파석',9],['정제된 갈라진 암석',28],['윈스톤의 코어',40]]],[15,27000000,[['정제된 루미디아의 결정',48],['완성된 격파석',10],['정제된 갈라진 암석',63],['윈스톤의 코어',60]]]
    ],
    '영웅(인피니티)':[
      [1,30000,[['루미디아의 조각',8],['무한의 증표',1],['인피니티 에테르',1]]],[2,70000,[['루미디아의 조각',56],['무한의 증표',1],['인피니티 에테르',2]]],[3,150000,[['정제된 루미디아의 조각',3],['무한의 증표',1],['인피니티 에테르',3]]],[4,200000,[['정제된 루미디아의 조각',8],['완성된 격파석',1],['무한의 증표',1],['인피니티 에테르',4]]],[5,500000,[['정제된 루미디아의 조각',16],['완성된 격파석',1],['무한의 증표',1],['인피니티 에테르',5]]],[6,700000,[['정제된 루미디아의 조각',24],['완성된 격파석',2],['무한의 증표',1],['인피니티 에테르',7]]],[7,1000000,[['정제된 루미디아의 결정',2],['완성된 격파석',2],['무한의 증표',1],['인피니티 에테르',10]]],[8,1500000,[['정제된 루미디아의 결정',4],['완성된 격파석',3],['무한의 증표',1],['인피니티 에테르',15]]],[9,3000000,[['정제된 루미디아의 결정',6],['완성된 격파석',4],['무한의 증표',1],['인피니티 에테르',20]]],[10,5000000,[['정제된 루미디아의 결정',8],['완성된 격파석',5],['무한의 증표',1],['인피니티 에테르',30]]],[11,7000000,[['정제된 루미디아의 결정',12],['완성된 격파석',6],['무한의 증표',1],['정제된 인피니티 에테르',1]]],[12,10000000,[['정제된 루미디아의 결정',16],['완성된 격파석',7],['무한의 증표',1],['정제된 인피니티 에테르',2]]],[13,15000000,[['정제된 루미디아의 결정',24],['완성된 격파석',8],['무한의 증표',1],['정제된 인피니티 에테르',3]]],[14,23000000,[['정제된 루미디아의 결정',32],['완성된 격파석',9],['무한의 증표',2],['정제된 인피니티 에테르',4]]],[15,27000000,[['정제된 루미디아의 결정',48],['완성된 격파석',10],['무한의 증표',3],['정제된 인피니티 에테르',6]]]
    ]
  };
  Object.keys(noctilaWeaponEnhancement).forEach(k=>{ noctilaWeaponEnhancement[k]=noctilaWeaponEnhancement[k].map(([stage,gold,materials])=>({stage,gold,materials,chance:100})); });

  const noctilaAccessoryEnhancement = {
    '카르벤':{stone:'미약한 수호석',count:2,gold:[5000,7000,15000,20000,50000],chance:[90,70,50,30,10],pity:[2,3,3,5,15],next:'세리온',upgradeStone:1,upgradeAbility:1},
    '세리온':{stone:'안정된 수호석',count:2,gold:[5000,10000,25000,35000,70000],chance:[90,70,50,30,10],pity:[2,3,3,5,15],next:'브렉사',upgradeStone:2,upgradeAbility:2},
    '브렉사':{stone:'강화된 수호석',count:3,gold:[7000,14000,34000,47000,94000],chance:[90,70,50,30,10],pity:[2,3,3,5,15],next:'오브레',upgradeStone:3,upgradeAbility:3},
    '오브레':{stone:'완성된 수호석',count:3,gold:[9000,18000,42000,59000,118000],chance:[90,70,50,30,10],pity:[2,3,3,5,15],next:null,upgradeStone:0,upgradeAbility:0}
  };

  // ─────────────────────────────────────────────────────────────
  // 강화 데이터 / 세이지 곡괭이 성능
  // ─────────────────────────────────────────────────────────────
  const enhancement = [
    [1,1,0,0,5000,0,100],[2,2,0,0,25000,0,100],[3,2,0,0,50000,0,80],
    [4,3,1,0,100000,0,80],[5,3,1,0,130000,0,70],[6,4,2,1,150000,0,50],
    [7,4,2,1,170000,5,40],[8,6,3,2,300000,5,30],[9,6,3,2,350000,5,20],
    [10,8,4,3,500000,10,10],[11,8,4,3,700000,10,5],[12,8,4,3,1000000,10,3],
    [13,10,6,4,1300000,30,2],[14,10,6,4,1500000,30,1],[15,10,6,5,2000000,30,1]
  ].map(([stage,low,mid,high,gold,ruby,chance])=>({stage,low,mid,high,gold,ruby,chance}));

  const sagePickaxeStats = [
    [1,20,1.5,2,0,0,null,null,3],[2,25,1.5,3,1,1,null,null,3],[3,30,1.5,3,1,1,null,null,10],[4,40,1.5,3,1,2,null,null,16],[5,50,1.5,4,2,2,null,null,33],
    [6,60,1.5,4,2,3,null,null,34],[7,100,1.5,4,2,3,0,0,36],[8,110,1.5,5,3,4,10,0,50],[9,120,1.5,5,3,5,20,5,50],[10,130,1.0,5,3,6,30,8,51],
    [11,140,1.0,6,5,7,40,11,51],[12,150,1.0,6,5,8,50,14,51],[13,160,1.0,7,5,10,60,17,68],[14,170,1.0,7,5,13,70,20,81],[15,180,0.5,12,10,15,90,23,102]
  ].map(([stage,power,speed,drops,relic,kobi,glowSpeed,glowChance,xp])=>({stage,power,speed,drops,relic,kobi,glowSpeed,glowChance,xp}));

  // 검색용 별칭/핵심 설명 보강
  update('카르세나의 룬',{aliases:['카르세나 룬','룬 카르세나'],tags:['상자','보물상자','전설 보물상자','보물']});
  update('하급 라이프스톤',{aliases:['하급 라이프 스톤','하급라스'],tags:['강화','강화석','세이지']});
  update('중급 라이프스톤',{aliases:['중급 라이프 스톤','중급라스'],tags:['강화','강화석','세이지']});
  update('상급 라이프스톤',{aliases:['상급 라이프 스톤','상급라스'],tags:['강화','강화석','세이지']});
  update('세이지 곡괭이',{aliases:['세이지곡괭이','sage 곡괭이'],tags:['강화','채광','로니','라이프스톤']});

  window.DDING_GUIDE = {
    meta:{
      version:'0.7.0',
      verified:'2026-10-02',
      scope:'공식 위키 아이템 정보 전체 + 공식 상점 전 품목 + 제작/강화/보물상자/확률표 + 노크틸라 장비/스킬/룬 문서를 통합한 초뉴비 검색 인덱스',
      disclaimer:'공식 문서와 현재 사이트 원본 DB에서 이름을 확인할 수 있는 아이템을 최대한 전수 편입했습니다. 공식 위키에 세부 사용처가 적혀 있지 않은 항목은 추측하지 않고 미확인으로 표시합니다. 이벤트/확률표/상점은 운영 중 변경될 수 있어 원문 링크를 함께 제공합니다.'
    },
    sources:OFFICIAL,
    items,
    enhancement,
    sagePickaxeStats,
    noctilaWeaponEnhancement,
    noctilaAccessoryEnhancement
  };
})();
