/* 純資料狀態，不依賴相機或 DOM。 */
"use strict";
window.MenuCore = (() => {
  const labels = { restaurant: '本店實拍', reference: '同款料理參考圖', ai: 'AI 生成示意圖' };
  const dishes = [
    { id:'oyako', original:'親子丼', translated:'雞肉親子丼', price:880, currency:'JPY', source:'restaurant', image:'assets/missing.svg', available:false, ingredients:'雞肉、蛋、洋蔥、米飯（模擬）', description:'以雞肉與蛋搭配米飯的料理；本資料不代表任何店家實際配方。', provenance:'尚無可驗證餐廳圖片來源；此圖僅為缺圖占位。' },
    { id:'soba', original:'ざるそば', translated:'日式冷蕎麥麵', price:720, currency:'JPY', source:'reference', image:'assets/missing.svg', available:false, ingredients:'蕎麥麵、海苔、沾醬（模擬）', description:'以冷麵搭配沾醬的料理；參考圖不得視為本店出餐。', provenance:'同款料理參考圖待提供；非本店出餐，目前僅缺圖占位。' },
    { id:'curry', original:'カレーライス', translated:'日式咖哩飯', price:950, currency:'JPY', source:'ai', image:'assets/curry.svg', available:true, ingredients:'米飯、馬鈴薯、紅蘿蔔、咖哩醬（模擬）', description:'濃郁咖哩醬搭配米飯的示意料理，不代表實際份量或食材。', provenance:'本專案 AI 編寫 SVG 示意插畫；非照片，非本店出餐。' }
  ];
  class OverlayGate {
    constructor() { this.session=1; this.epoch=0; this.sequence=0; this.applied=0; this.frozen=false; this.value=null; this.rejected=0; }
    request() { return { session:this.session, epoch:this.epoch, sequence:++this.sequence }; }
    accept(token,value) {
      if (this.frozen || token.session!==this.session || token.epoch!==this.epoch || token.sequence<=this.applied) { this.rejected++; return false; }
      this.applied=token.sequence; this.value=value; return true;
    }
    freeze() { this.frozen=true; }
    resume() { this.frozen=false; this.epoch++; this.applied=0; }
    reset() { this.session++; this.resume(); }
  }
  class Order {
    constructor() { this.quantities=new Map(); }
    quantity(id) { return this.quantities.get(id)||0; }
    change(id,delta) { if (!dishes.some(d=>d.id===id)||!Number.isInteger(delta)) return; const q=Math.max(0,this.quantity(id)+delta); if(q) this.quantities.set(id,q); else this.quantities.delete(id); }
    remove(id) { this.quantities.delete(id); }
  }
  return {labels,dishes,OverlayGate,Order};
})();
