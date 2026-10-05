(()=>{"use strict";
  const ADMIN_API="https://cmimycfvvhugiyrwsior.supabase.co/functions/v1/ddingfarm-admin-v2";
  const tokenKey="ddingfarmAdminStatsToken";
  const $=s=>document.querySelector(s);
  const fmt=n=>Math.round(Number(n||0)).toLocaleString("ko-KR");
  const gold=n=>Number.isFinite(Number(n))?fmt(n)+" G":"—";
  const pct=n=>Number.isFinite(Number(n))?((Number(n)>=0?"+":"")+Number(n).toLocaleString("ko-KR",{maximumFractionDigits:1})+"%"):"—";
  const escapeHtml=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

  async function call(path,body,token){
    const r=await fetch(ADMIN_API+"/"+path,{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{})},body:JSON.stringify(body||{})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok){const e=new Error(j.error||("HTTP "+r.status));e.data=j;e.status=r.status;throw e}
    return j;
  }
  async function market(action,body={}){
    const token=sessionStorage.getItem(tokenKey);
    if(!token) throw new Error("unauthorized");
    try{return await call(action,body,token)}
    catch(err){
      if(err?.status===401){
        sessionStorage.removeItem(tokenKey);
        showLogin("로그인 시간이 끝났어요. 다시 로그인해 주세요.");
      }
      throw err;
    }
  }

  function showLogin(message=""){
    $("#appView")?.classList.add("hidden");
    $("#loginView")?.classList.remove("hidden");
    if($("#loginMsg")) $("#loginMsg").textContent=message;
    if($("#pw")){$("#pw").value="";$("#pw").focus()}
  }
  function showApp(){
    $("#loginView")?.classList.add("hidden");
    $("#appView")?.classList.remove("hidden");
  }
  function bindLogout(){
    $("#logoutBtn")?.addEventListener("click",()=>{sessionStorage.removeItem(tokenKey);showLogin("로그아웃했어요.")});
  }
  function bindLogin(render){
    $("#loginForm")?.addEventListener("submit",async e=>{
      e.preventDefault();$("#loginMsg").textContent="확인 중이에요...";
      try{
        const r=await call("login",{password:$("#pw").value});
        sessionStorage.setItem(tokenKey,r.token);
        showApp();
        await render?.();
      }catch(err){
        if(err.data?.error==="blocked"){
          const until=err.data.blocked_until?new Date(err.data.blocked_until).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"}):"";
          $("#loginMsg").textContent="비밀번호를 여러 번 틀렸어요. "+(until?until+" 이후에 다시 시도해 주세요.":"잠시 뒤 다시 시도해 주세요.");
        }else $("#loginMsg").textContent="비밀번호가 맞지 않아요."+(err.data?.remaining!=null?" 남은 시도 "+err.data.remaining+"회":"");
      }
    });
  }
  async function boot(render){
    bindLogin(render);bindLogout();
    const token=sessionStorage.getItem(tokenKey);
    if(!token){showLogin();return}
    try{
      await call("stats",{},token);
      showApp();
      await render?.();
    }catch(err){
      if(err?.status===401||err?.data?.error==="unauthorized"){
        sessionStorage.removeItem(tokenKey);
        showLogin("로그인 시간이 끝났어요. 다시 로그인해 주세요.");
      }else{
        showApp();
        await render?.(err);
      }
    }
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
    const d=new Date(v); if(Number.isNaN(d.getTime()))return "—";
    return d.toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
  }
  function errorState(message="데이터를 불러오지 못했습니다."){
    return '<div class="empty-state"><strong>데이터 조회 실패</strong><p>'+escapeHtml(message)+'</p></div>';
  }

  window.MarketAdmin={boot,call,market,fmt,gold,pct,escapeHtml,updateScanAge,dateTime,errorState,tokenKey};
})();