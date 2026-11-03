"use strict";
(() => {
  const {dishes,labels,OverlayGate,Order}=MenuCore;
  const $=id=>document.getElementById(id), gate=new OverlayGate(), order=new Order();
  let stream=null, cameraGeneration=0, cameraBusy=false, simulation=true, revision=0, active=null, holdTimer=null, lock=null;
  const delayed=new Set(), LONG_PRESS=450;
  const sourceText=d=>labels[d.source]+(!d.available?' · 待提供圖片':'');
  function renderOrder() {
    $('orderCount').textContent=[...order.quantities.values()].reduce((a,b)=>a+b,0);
    $('orderList').replaceChildren();
    for(const d of dishes) {
      const q=order.quantity(d.id); $('qty-'+d.id).textContent=q;
      if(!q) continue;
      const row=document.createElement('div'); row.className='order-item';
      row.innerHTML=`<div><strong>${d.original}</strong><small>原始單價 ${d.price} ${d.currency}</small><small>數量 ${q}</small></div><div class="quantity"><button aria-label="減少${d.original}" data-delta="-1">−</button><output>${q}</output><button aria-label="增加${d.original}" data-delta="1">＋</button><button class="remove">移除</button></div>`;
      row.querySelectorAll('[data-delta]').forEach(b=>b.onclick=()=>change(d.id,Number(b.dataset.delta)));
      row.querySelector('.remove').onclick=()=>{order.remove(d.id);renderOrder();}; $('orderList').append(row);
    }
    if(!order.quantities.size) $('orderList').textContent='尚未選餐，按菜品旁的 ＋ 開始。';
  }
  function change(id,delta) { if(gate.frozen) return; order.change(id,delta);renderOrder(); }
  function buildControls() {
    dishes.forEach((d,i)=>{
      const row=document.createElement('div');row.className='dish-control';row.style.top=(60+i*160)+'px';
      row.innerHTML=`<button class="thumb" aria-label="長按查看${d.original}" data-dish="${d.id}"><img src="${d.image}" alt="${d.available?'咖哩飯 AI 插畫':'缺圖占位，並非料理照片'}" draggable="false"></button><span class="source">${labels[d.source]}</span><span class="availability">${!d.available?(d.source==='reference'?'待提供 · 非本店出餐':'待提供圖片 · 非實拍'):'長按 450ms 查看'}</span><div class="quantity"><button aria-label="減少${d.original}" data-delta="-1">−</button><output id="qty-${d.id}">0</output><button aria-label="選取或增加${d.original}" data-delta="1">＋</button></div>`;
      row.querySelectorAll('[data-delta]').forEach(b=>b.onclick=()=>change(d.id,Number(b.dataset.delta)));
      const thumb=row.querySelector('.thumb');thumb.oncontextmenu=e=>e.preventDefault();thumb.addEventListener('click',e=>e.preventDefault());
      thumb.addEventListener('pointerdown',e=>beginHold(e,d,thumb)); $('dishControls').append(row);
    });
  }
  function renderOverlay(value) {
    $('translations').replaceChildren();
    const list=value.flip?[...dishes].reverse():dishes;
    list.forEach(d=>{
      const i=dishes.indexOf(d), el=document.createElement('div');el.className='translation';el.dataset.dish=d.id;
      // 譯文只在印刷菜單每列的留白區內移動，維持原文與價格可讀。
      el.style.top=`calc(${(i*200+80)/6}% + ${value.flip?3:0}px)`;el.style.paddingLeft=value.flip?'9px':'6px';
      el.innerHTML=`${d.translated}<small>${value.flip?'繁體中文譯名':'Demo 翻譯'} · ${i+1}</small>`;$('translations').append(el);
    });
  }
  function status() { $('overlayStatus').textContent=`${gate.frozen?'長按凍結':'可更新'} · 世代 ${gate.epoch} · 版本 ${gate.value?.revision||0} · 已丟棄 ${gate.rejected}`; }
  function schedule(delay=220) {
    if(document.hidden) return;
    const token=gate.request(), value={revision:++revision,flip:revision%2===0};
    const timer=setTimeout(()=>{delayed.delete(timer);if(gate.accept(token,value)) renderOverlay(value);status();},delay);delayed.add(timer);
  }
  function beginHold(e,d,thumb) {
    if(active||e.button!==0) return;
    e.preventDefault(); active={id:e.pointerId,thumb,d,shown:false};thumb.setPointerCapture(e.pointerId);
    holdTimer=setTimeout(()=>{
      if(!active) return;active.shown=true;gate.freeze();
      lock=[...$('overlay').querySelectorAll('*')].map(el=>({el,style:el.getAttribute('style'),css:getComputedStyle(el)})).map(entry=>({el:entry.el,style:entry.style,values:Object.fromEntries([...entry.css].map(key=>[key,entry.css.getPropertyValue(key)]))}));
      for(const entry of lock)for(const [key,value] of Object.entries(entry.values))entry.el.style.setProperty(key,value);
      $('overlay').style.width=$('overlay').clientWidth+'px';$('overlay').style.height=$('overlay').clientHeight+'px';
      $('cardContent').innerHTML=`<img src="${d.image}" alt="${d.available?'AI 生成料理示意圖':'尚無料理圖片'}"><div class="source">${sourceText(d)}</div><h2>${d.translated}</h2><small>${d.original} · ${d.price} ${d.currency}</small><p><strong>食材</strong>　${d.ingredients}</p><p>${d.description}</p><small>${d.provenance}</small>`;
      $('dishCard').hidden=false;status();
    },LONG_PRESS);
  }
  function endHold(e) {
    if(!active||(e&&e.pointerId!==undefined&&e.pointerId!==active.id)) return;
    clearTimeout(holdTimer);const previous=active;active=null;$('dishCard').hidden=true;
    if(previous.thumb.hasPointerCapture(previous.id)) previous.thumb.releasePointerCapture(previous.id);
    if(previous.shown) { gate.resume();for(const entry of lock){if(entry.style===null)entry.el.removeAttribute('style');else entry.el.setAttribute('style',entry.style);} $('overlay').style.width='';$('overlay').style.height='';lock=null;layoutControls();if(simulation&&!document.hidden)schedule();status(); }
  }
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>document.addEventListener(type,endHold,true));
  window.addEventListener('blur',()=>endHold());
  $('recommendToggle').onclick=()=>{if(gate.frozen)return;const expanded=$('recommendToggle').getAttribute('aria-expanded')==='true';$('recommendToggle').setAttribute('aria-expanded',String(!expanded));$('recommendBody').hidden=expanded;$('recommendArrow').textContent=expanded?'展開 ＋':'收合 −';};
  $('simulationToggle').onclick=()=>{if(gate.frozen)return;simulation=!simulation;if(!simulation)gate.resume();$('simulationToggle').textContent=simulation?'暫停更新':'開始更新';$('simulationToggle').setAttribute('aria-pressed',String(simulation));if(simulation)schedule();};
  function stopCamera(message='相機已停止，可按啟用／重試重新開啟。') {
    cameraGeneration++; if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;$('preview').srcObject=null;$('cameraEmpty').hidden=false;$('cameraEmpty').style.display='grid';$('cameraStatus').textContent=message;cameraBusy=false;$('cameraStart').disabled=false;
  }
  async function startCamera() {
    if(cameraBusy)return;stopCamera('正在請求相機權限…');cameraBusy=true;$('cameraStart').disabled=true;const generation=cameraGeneration;
    try {
      if(!window.isSecureContext)throw new Error('請使用 HTTPS 網址，或電腦 localhost；一般區網 HTTP 不支援相機。');
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('此瀏覽器無法使用相機 API，請改用 Chrome 並確認安全網址。');
      const acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      if(generation!==cameraGeneration||document.hidden){acquired.getTracks().forEach(t=>t.stop());return;}
      stream=acquired;$('preview').srcObject=stream;await $('preview').play();if(generation!==cameraGeneration)return;
      $('cameraEmpty').style.display='none';$('cameraStatus').textContent='真實相機已啟動 · 請確認為後置鏡頭';
      acquired.getVideoTracks()[0]?.addEventListener('ended',()=>{if(stream===acquired)stopCamera('相機連線已中止，請重試。');});
    } catch(error) {
      if(generation!==cameraGeneration)return;
      const messages={NotAllowedError:'未取得相機權限。請在 Chrome 網站設定允許相機後重試。',NotFoundError:'找不到可用鏡頭，請確認裝置相機。',NotReadableError:'相機可能被其他程式占用，請關閉後重試。',OverconstrainedError:'鏡頭不符合條件，請確認可用相機。'};
      stopCamera(messages[error.name]||error.message||'相機啟動失敗，請重試。');
    } finally {if(generation===cameraGeneration){cameraBusy=false;$('cameraStart').disabled=false;}}
  }
  $('cameraStart').onclick=startCamera;$('cameraStop').onclick=()=>{endHold();stopCamera();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden){endHold();gate.reset();stopCamera('已離開頁面並釋放相機。返回後請按啟用／重試。');}else if(simulation)schedule();});
  window.addEventListener('pagehide',()=>{endHold();stopCamera();gate.reset();delayed.forEach(clearTimeout);delayed.clear();});
  function layoutControls(){if(gate.frozen)return;document.querySelectorAll('.dish-control').forEach((el,i)=>{el.style.top=(56+i*$('menuFrame').clientHeight/3)+'px';});}
  window.addEventListener('resize',layoutControls);
  buildControls();layoutControls();renderOrder();renderOverlay({revision:0,flip:false});status();
  setInterval(()=>{if(simulation&&!document.hidden){schedule(180);schedule(2600);}},2000);
  startCamera();
})();
