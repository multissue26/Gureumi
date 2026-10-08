(()=>{"use strict";
  const MARKET_API="https://cmimycfvvhugiyrwsior.supabase.co/functions/v1/ddingfarm-market-api";
  const tokenKey="ddingfarmAdminStatsToken";
  const $=s=>document.querySelector(s);
  const fmt=n=>Math.round(Number(n||0)).toLocaleString("ko-KR");
  const gold=n=>Number.isFinite(Number(n))?fmt(n)+" G":"—";
  const pct=n=>Number.isFinite(Number(n))?((Number(n)>=0?"+":"")+Number(n).toLocaleString("ko-KR",{maximumFractionDigits:1})+"%"):"—";
  const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

  async function post(action,body={}){
    const r=await fetch(MARKET_API,{
      method:"POST",cache:"no-store",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action,...(body||{})})
    });
    const j=await r.json().catch(()=>({}));
    if(!r.ok){const e=new Error(j.error||("HTTP "+r.status));e.data=j;e.status=r.status;throw e}
    return j;
  }
  const market=(action,body={})=>post(action,body);
  const marketOffers=()=>post("market-offers");

  function offerUnit(o){
    const q=Number(o?.quantity||0),p=Number(o?.listing_price);
    return q>0&&Number.isFinite(p)?p/q:null;
  }
  function offerText(o){
    if(!o)return "—";
    return gold(o.listing_price)+" / "+fmt(o.quantity)+"개";
  }
  function offerNormalizedText(o){
    const u=offerUnit(o);
    return Number.isFinite(u)?"개당 "+gold(u)+" · /64 "+gold(u*64):"—";
  }

  function normalizeChrome(){
    $("#loginView")?.remove();
    $("#appView")?.classList.remove("hidden");
    $("#logoutBtn")?.remove();

    document.querySelectorAll(".brand").forEach(a=>a.setAttribute("href","market.html"));
    document.querySelectorAll(".brand small").forEach(el=>el.textContent="MARKET DATA");
    document.querySelectorAll(".eyebrow").forEach(el=>{
      if(el.textContent?.includes("PRIVATE"))el.textContent=el.textContent.replace("PRIVATE","DDINGFARM");
    });

    const nav=document.querySelector(".navbar");
    if(nav){
      const home=nav.querySelector('a[href="admin-market.html"]');
      if(home)home.setAttribute("href","market.html");

      if(!nav.querySelector('[data-site-back]')){
        const back=document.createElement("a");
        back.href="index.html";back.dataset.siteBack="1";back.className="site-back";back.textContent="← 띵팜";
        nav.prepend(back);
      }
      if(!nav.querySelector('a[href="admin-market-bundle.html"]')){
        const link=document.createElement("a");
        link.href="admin-market-bundle.html";link.textContent="묶음 차익";
        const crafting=nav.querySelector('a[href="admin-market-crafting.html"]');
        crafting?.insertAdjacentElement("afterend",link);
      }

      const file=(location.pathname.split("/").pop()||"market.html").toLowerCase();
      nav.querySelectorAll("a").forEach(a=>{
        if(a.dataset.siteBack)return;
        const href=(a.getAttribute("href")||"").toLowerCase();
        const active=(file==="market.html"||file==="admin-market.html")&&href==="market.html" || href===file;
        a.classList.toggle("active",!!active);
      });
    }
  }

  async function boot(render){
    normalizeChrome();
    try{await render?.()}catch(e){console.error(e)}
  }

  function updateScanAge(scannedAt){
    const age=$("#scanAge"),dot=$("#scanDot"),title=$("#scanTitle"),copy=$("#scanCopy");
    if(!age||!dot||!title||!copy)return;
    const ts=Date.parse(scannedAt||"");
    if(!Number.isFinite(ts)||ts<=0){
      age.textContent="—";
      dot.classList.remove("stale");dot.classList.add("idle");
      age.classList.remove("stale");
      title.textContent="아직 시장 스캔 기록이 없습니다";
      copy.innerHTML="Minecraft에서 <b>/스캔</b>을 실행하면 첫 시장 데이터가 이곳에 표시됩니다.";
      return;
    }
    dot.classList.remove("idle");
    const mins=Math.max(0,Math.floor((Date.now()-ts)/60000));
    const stale=mins>=30;
    age.textContent=mins<1?"방금 스캔":mins+"분 전";
    age.classList.toggle("stale",stale);dot.classList.toggle("stale",stale);
    title.textContent=stale?"시장 데이터 갱신을 권장합니다":"시장 데이터가 아직 최신입니다";
    copy.innerHTML=stale
      ?"마지막 스캔 후 "+mins+"분이 지났습니다. 정확한 분석을 위해 Minecraft에서 <b>/스캔</b> 실행을 권장합니다."
      :"마지막 스캔 후 "+mins+"분 경과 · 30분이 지나면 <b>/스캔</b>을 권장합니다.";
  }
  function dateTime(v){
    if(!v)return "—";
    const d=new Date(v);if(Number.isNaN(d.getTime()))return "—";
    return d.toLocaleString("ko-KR",{timeZone:"Asia/Seoul",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
  }
  function errorState(message="데이터를 불러오지 못했습니다."){
    return '<div class="empty-state"><strong>데이터 조회 실패</strong><p>'+escapeHtml(message)+'</p></div>';
  }

  window.MarketAdmin={boot,market,marketOffers,fmt,gold,pct,offerUnit,offerText,offerNormalizedText,escapeHtml,updateScanAge,dateTime,errorState,tokenKey};
})();