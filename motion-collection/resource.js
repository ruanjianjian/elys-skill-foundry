/** Original studio miniature, with deterministic choreography. Capability illustration. */
export const films = [{
  id: "mac-dev-resource-guard", duration: 16, bpm: 120,
  genre: "studio-house", style: "桌面整理术", posterTime: 6.4,
}];
const sans = '-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif';
const mono = 'ui-monospace,SFMono-Regular,Menlo,monospace';
const ink = "#113c3c", paper = "#f0f3e9", mint = "#83e4bd";
const clamp = v => Math.max(0, Math.min(1, v));
const ease = v => 1 - Math.pow(1 - clamp(v), 3);
const mix = (a,b,p) => a + (b-a)*p;
export async function loadAssets() {
  const art = new Image();
  art.src = "media/collection-art/mac-dev-resource-guard.jpg";
  await art.decode();
  return {art};
}
function text(c,s,x,y,size=24,color=paper,weight=500,font=sans) {
  c.font=`${weight} ${size}px ${font}`; c.fillStyle=color;
  c.textAlign="left"; c.textBaseline="middle"; c.fillText(s,x,y);
}
function rect(c,x,y,w,h,color,r=15) {
  c.beginPath(); c.roundRect(x,y,w,h,r); c.fillStyle=color; c.fill();
}
function line(c,x,y,x2,y2,color,width=1) {
  c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke();
}
function circle(c,x,y,r,color) {
  c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.fillStyle=color;c.fill();
}
function layer(c,opacity,fn) {
  c.save();c.globalAlpha*=clamp(opacity);fn();c.restore();
}
function panel(c,x,y,w,h,fn) {
  c.save();c.shadowColor="#001d2866";c.shadowBlur=34;c.shadowOffsetY=22;
  rect(c,x,y,w,h,paper,22);c.restore();
  rect(c,x+2,y+2,w-4,h-4,"#fafbf4",20);
  circle(c,x+22,y+23,4,"#b8c8bb");circle(c,x+37,y+23,4,"#b8c8bb");
  text(c,"资源看板",x+55,y+24,14,ink,650);
  line(c,x+18,y+47,x+w-18,y+47,"#dce3d9");
  fn(x,y);
}
function key(c,label,x,y,w,alpha=1) {
  layer(c,alpha,()=>{
    c.save();c.shadowColor="#001b2544";c.shadowBlur=7;c.shadowOffsetY=7;
    rect(c,x,y,w,62,"#aab7ad",10);c.restore();
    rect(c,x,y-3,w,60,"#f0f2e8",10);
    c.textAlign="center";c.textBaseline="middle";c.fillStyle=ink;
    c.font=`500 27px ${sans}`;c.fillText(label,x+w/2,y+26);
  });
}
function keys(c,x,y,t,scale=1) {
  c.save();c.translate(x,y);c.scale(scale,scale);
  ["⌃","⌥","⌘","S"].forEach((s,i)=>{
    const p=ease((t-i*.12)/.6);
    key(c,s,i*76,(1-p)*22,64,p);
  });c.restore();
}
function dial(c,x,y,r,t) {
  c.save();c.shadowColor="#001c2a55";c.shadowBlur=32;c.shadowOffsetY=18;
  const metal=c.createLinearGradient(x-r,y-r,x+r,y+r);
  metal.addColorStop(0,"#f0f4eb");metal.addColorStop(.45,"#aebfb4");metal.addColorStop(1,"#edf2e7");
  circle(c,x,y,r,metal);c.restore();circle(c,x,y,r-13,"#174c48");
  for(let i=0;i<40;i++){
    const a=i*Math.PI/20-Math.PI/2;
    line(c,x+Math.cos(a)*(r-31),y+Math.sin(a)*(r-31),x+Math.cos(a)*(r-25),y+Math.sin(a)*(r-25),i<29?mint:"#477069",2);
  }
  c.beginPath();c.arc(x,y,r-44,-Math.PI/2,-Math.PI/2+Math.PI*1.45);
  c.strokeStyle=mint;c.lineWidth=9;c.lineCap="round";c.stroke();
  const angle=-Math.PI/2+Math.PI*1.45+Math.sin(t*2)*.035;
  circle(c,x+Math.cos(angle)*(r-44),y+Math.sin(angle)*(r-44),7,"#f0f7dd");
  text(c,"留住现场",x-56,y-7,28,paper,650);
  text(c,"RESOURCE GUARD",x-64,y+25,12,mint,500,mono);
}
function copy(c,a,b,sub,t) {
  const p=ease(t/.65);
  layer(c,p,()=>{
    text(c,a,76,211+(1-p)*20,65,paper,720);
    text(c,b,76,291+(1-p)*20,65,paper,720);
    text(c,sub,80,365,23,"#c9dbce",450);
  });
}
function cache(c,x,y,label,color,alpha=1) {
  layer(c,alpha,()=>{
    c.save();c.shadowColor="#00292766";c.shadowBlur=14;c.shadowOffsetY=10;
    rect(c,x,y,158,72,color,10);c.restore();
    rect(c,x+4,y+3,150,7,"#ffffff44",5);
    text(c,label,x+15,y+40,20,ink,650);
  });
}
export function render(c,{art},id,t) {
  c.drawImage(art,0,0,1280,720);
  const shade=c.createLinearGradient(0,0,1150,300);
  shade.addColorStop(0,"#062f39e8");shade.addColorStop(.55,"#07343c88");shade.addColorStop(1,"#07343c05");
  c.fillStyle=shade;c.fillRect(0,0,1280,720);
  text(c,"MAC DEV RESOURCE GUARD",77,68,15,"#a8d1c0",550,mono);
  rect(c,1052,49,150,34,"#082f35bd",17);
  circle(c,1069,66,4,mint);text(c,"运行中 · 保留",1081,66,15,mint,600);
  const act=Math.min(3,Math.floor(t/4)), local=t-act*4;
  const opacity=clamp(local/.3)*clamp((4-local)/.23);
  layer(c,opacity,()=>{
    if(act===0){
      copy(c,"开发现场，","轻一点。","内存、磁盘，一个入口看清。",local);
      keys(c,81,445,local-.45,.9);
      layer(c,ease((local-.7)/.8),()=>{
        const y=300+35*(1-ease((local-.7)/.8));
        panel(c,713,y,427,244,(x,y)=>{
          text(c,"内存压力",x+27,y+82,19,ink,600);
          [42,64,51,86,67,71,48,60,78,65,52,69].forEach((h,i)=>rect(c,x+30+i*29,y+188-h,17,h,i<8?"#178773":"#99baa0",4));
          text(c,"磁盘缓存  /  开发后台",x+27,y+214,15,"#557368");
        });
      });
      text(c,"菜单栏常驻 · 按需唤起",81,547,18,"#c9dbce");
    }else if(act===1){
      copy(c,"先看清，","再清理。","分类扫描，先看预览和保留原因。",local);
      panel(c,678,250,496,319,(x,y)=>{
        const rows=[['构建中间缓存','可回收','#1746a3'],['开发后台','待复核','#8b6833'],['运行中的任务','保留','#16705d']];
        rows.forEach(([label,state,color],i)=>{
          const p=ease((local-.25-i*.22)/.5);
          layer(c,p,()=>{
            const yy=y+86+i*67;
            circle(c,x+29,yy,5,color);text(c,label,x+46,yy,21,ink,600);
            rect(c,x+365,yy-17,104,34,color,17);text(c,state,x+382,yy,16,"#f5f5ec",600);
            if(i<2)line(c,x+26,yy+33,x+470,yy+33,"#dce3d9");
          });
        });
        text(c,"清理前由原工具再次检查",x+27,y+286,15,"#577369");
      });
    }else if(act===2){
      copy(c,"只收尾，","留住现场。","复用 dev-storage / dev-memory。",local);
      const confirm=ease((local-.8)/.5), clear=ease((local-1.75)/1.1);
      layer(c,1-ease((local-1.65)/.35),()=>{
        panel(c,714,238,430,153,(x,y)=>{
          text(c,"预览后，确认回收",x+25,y+81,22,ink,650);
          rect(c,x+253,y+58,153,46,confirm>.6?"#0c594d":"#178773",12);
          text(c,confirm>.6?"已确认":"确认清理",x+279,y+82,18,"#f5f6ed",650);
        });
      });
      cache(c,mix(720,1120,clear),mix(430,245,clear),"中间缓存","#b8d2c1",1-clear);
      cache(c,mix(906,1145,ease((local-2)/1)),mix(430,275,ease((local-2)/1)),"闲置后台","#c6d1ba",1-ease((local-2)/1));
      layer(c,ease((local-2.4)/.6),()=>{
        rect(c,746,365,383,103,"#f0f3e9ed",18);
        circle(c,780,404,7,"#13816a");text(c,"活跃 · 受保护 · 状态不明",800,405,20,ink,650);
        text(c,"保留，不直接删除任务目录",774,442,17,"#4c6b61");
      });
      text(c,"范围内回收，确认后执行。",81,463,20,"#c9dbce");
    }else{
      layer(c,ease(local/.65),()=>{
        text(c,"资源看板。",76,224,86,paper,740);
        text(c,"平时藏起来，需要时叫出来。",81,310,27,"#d2e3d3",500);
        keys(c,81,391,local-.2,.9);
        text(c,"macOS 13+  /  开源  /  默认不开自动回收",81,503,20,"#c9dbce");
        text(c,"github.com/ruanjianjian/mac-dev-resource-guard",81,549,17,"#9fc8b8",500,mono);
        dial(c,950,371,137,local);
      });
    }
  });
  line(c,77,628,1202,628,"#c6e0ce44");
  text(c,"能力示意 · 清理范围与保护状态由原工具复核",78,661,15,"#bad1c4",450);
  text(c,`${String(act+1).padStart(2,'0')} / 04`,1124,661,15,"#bad1c4",500,mono);
  rect(c,78,699,1124,2,"#9fb6a84d",1);
  rect(c,78,699,1124*t/16,2,mint,1);
}
