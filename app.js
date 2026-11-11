const $ = (id) => document.getElementById(id);
const COLORS = {daily:"#55e8f5",life:"#b695ff",buffer:"#f5c65c",free:"#f5c65c",goal:"#ff70b8"};
const LABELS = {daily:"DAILY TASK",life:"LIFE ROUTINE",buffer:"BUFFER",free:"FREE TIME",goal:"LONG-TERM GOAL"};
const defaultState = {tasks:[],goals:[],settings:{dayStart:"19:30",bedtime:"00:00"},timelineBuilt:false};
let state = loadState(); let dragId = null;
function loadState(){try{return {...defaultState,...JSON.parse(localStorage.getItem("neonCityState")||"{}")}}catch{return structuredClone(defaultState)}}
function save(){localStorage.setItem("neonCityState",JSON.stringify(state))}
function mins(t){const [h,m]=t.split(":").map(Number);return h*60+m}
function fmt(n){n=((n%1440)+1440)%1440;return `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`}
function durationText(n){return n>=60?`${Math.floor(n/60)}時間${n%60?` ${n%60}分`:""}`:`${n}分`}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(s){const el=$("toast");el.textContent=s;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2200)}
function render(){
  $("taskCount").textContent=state.tasks.length;
  $("emptyState").style.display=state.tasks.length?"none":"block";
  $("cardTray").querySelectorAll(".task-card").forEach(e=>e.remove());
  state.tasks.forEach((t,i)=>{
    const el=document.createElement("article");el.className="task-card";el.draggable=true;el.dataset.id=t.id;el.style.setProperty("--accent",COLORS[t.type]||COLORS.daily);
    el.innerHTML=`<div class="card-tools"><button class="mini-btn edit" aria-label="編集">✎</button><button class="mini-btn delete" aria-label="削除">×</button></div><div class="kind">${LABELS[t.type]||"TASK"}</div><div class="name ${t.done?"is-done":""}">${esc(t.name)}</div><div class="duration">${t.duration} MIN${t.fixed?` · ${esc(t.start)}`:""}</div><button class="complete-btn ${t.done?"completed":""}" aria-label="完了状態を切り替え">${t.done?"✓ DONE":"○ 完了"}</button>`;
    el.addEventListener("dragstart",()=>{dragId=t.id;el.classList.add("dragging")});el.addEventListener("dragend",()=>{dragId=null;el.classList.remove("dragging");document.querySelectorAll(".drag-over").forEach(x=>x.classList.remove("drag-over"))});
    el.addEventListener("dragover",e=>{e.preventDefault();el.classList.add("drag-over")});el.addEventListener("dragleave",()=>el.classList.remove("drag-over"));
    el.addEventListener("drop",e=>{e.preventDefault();el.classList.remove("drag-over");reorder(dragId,t.id)});
    el.querySelector(".complete-btn").onclick=()=>{t.done=!t.done;save();render()};
    el.querySelector(".delete").onclick=()=>{state.tasks=state.tasks.filter(x=>x.id!==t.id);state.timelineBuilt=false;save();render()};
    el.querySelector(".edit").onclick=()=>editTask(t.id);
    $("cardTray").appendChild(el);
  });
  renderGoals();updateHero();
  $("todayLabel").textContent=new Date().toLocaleDateString("ja-JP",{month:"2-digit",day:"2-digit",weekday:"short"});
  if(state.timelineBuilt)renderTimeline();
}
function reorder(from,to){if(!from||from===to)return;const a=state.tasks.findIndex(t=>t.id===from),b=state.tasks.findIndex(t=>t.id===to);const [item]=state.tasks.splice(a,1);state.tasks.splice(b,0,item);state.timelineBuilt=false;save();render()}
function renderGoals(){const box=$("goalPreview");if(!state.goals.length){box.innerHTML='<p class="muted">長期目標はノルマにせず、やりたいときに少しずつ。</p>';return}
 box.innerHTML=state.goals.map(g=>`<div class="goal-row"><div><strong>${esc(g.name)}</strong><small>${esc(g.step||"小さな一歩を決めてみよう")}</small></div><button class="goal-add-btn" data-goal="${g.id}">今日に追加 ＋</button></div>`).join("");
 box.querySelectorAll("button").forEach(btn=>btn.onclick=()=>{const g=state.goals.find(x=>x.id===btn.dataset.goal);openTask({name:g.step||g.name,duration:15,type:"goal"})});
}
function updateHero(){
 const now=new Date(),start=mins(state.settings.dayStart),bed=mins(state.settings.bedtime);let bedToday=new Date(now);bedToday.setHours(Math.floor(bed/60),bed%60,0,0);if(bedToday<=now)bedToday.setDate(bedToday.getDate()+1);
 const end=bedToday.getTime(),remaining=Math.max(0,Math.floor((end-now.getTime())/60000));
 const h=Math.floor(remaining/60),m=remaining%60;$("freeTime").textContent=`${h}h ${String(m).padStart(2,"0")}m`;
 $("bedtimeLabel").textContent=fmt(bed);$("remainingLabel").textContent=remaining?`就寝まで ${durationText(remaining)}`:"就寝目標時刻を過ぎています";
 const total=((bed-start+1440)%1440)||1440;const elapsed=Math.max(0,Math.min(total,total-remaining));$("timeProgress").style.width=`${Math.min(100,elapsed/total*100)}%`;
}
function openTask(task=null){$("taskForm").dataset.edit=task?.id||"";$("taskName").value=task?.name||"";$("taskDuration").value=task?.duration||30;$("taskType").value=task?.type||"daily";$("taskFixed").checked=!!task?.fixed;$("taskStart").value=task?.start||"20:00";$("fixedTimeWrap").classList.toggle("hidden",!task?.fixed);$("taskDialog").showModal()}
function editTask(id){openTask(state.tasks.find(t=>t.id===id))}
$("taskFixed").onchange=()=> $("fixedTimeWrap").classList.toggle("hidden",!$("taskFixed").checked);
$("addTaskBtn").onclick=()=>openTask();
$("saveTaskBtn").onclick=e=>{e.preventDefault();const name=$("taskName").value.trim();if(!name)return;const id=$("taskForm").dataset.edit;const item={id:id||crypto.randomUUID(),name,duration:Math.max(1,Number($("taskDuration").value)||1),type:$("taskType").value,fixed:$("taskFixed").checked,start:$("taskStart").value};if(id){state.tasks=state.tasks.map(t=>t.id===id?item:t)}else state.tasks.push(item);state.timelineBuilt=false;save();$("taskDialog").close();render()};
$("settingsBtn").onclick=()=>{$("dayStart").value=state.settings.dayStart;$("bedtime").value=state.settings.bedtime;$("settingsDialog").showModal()};
$("saveSettingsBtn").onclick=e=>{e.preventDefault();state.settings.dayStart=$("dayStart").value;state.settings.bedtime=$("bedtime").value;save();$("settingsDialog").close();updateHero();if(state.timelineBuilt)renderTimeline();toast("生活時間を保存したよ")};
$("addGoalBtn").onclick=()=>$("goalDialog").showModal();
$("saveGoalBtn").onclick=e=>{e.preventDefault();const name=$("goalName").value.trim();if(!name)return;state.goals.push({id:crypto.randomUUID(),name,step:$("goalStep").value.trim()});save();$("goalDialog").close();$("goalName").value="";$("goalStep").value="";renderGoals()};
$("suggestBtn").onclick=()=>toast("AIおすすめ機能は、次の開発段階で接続する予定だよ");
$("buildBtn").onclick=()=>{state.timelineBuilt=true;save();renderTimeline();toast("今夜のタイムラインを組んだよ ✦")};
function renderTimeline(){
 const box=$("timeline");if(!state.tasks.length){box.innerHTML='<div class="timeline-empty">カードを追加すると、ここに時間の流れが表示されるよ。</div>';return}
 const start=mins(state.settings.dayStart);let cursor=start;const items=[];
 // Build a simple sequential timeline. Fixed-time cards are placed at their chosen time.
 state.tasks.forEach(t=>{let s=cursor;if(t.fixed){s=mins(t.start);if(s<start)s+=1440}if(s>cursor)items.push({name:"空き時間",start:cursor,end:s,type:"free",virtual:true});items.push({name:t.name,start:s,end:s+t.duration,type:t.type,id:t.id});cursor=s+t.duration});
 let bed=mins(state.settings.bedtime);if(bed<=start)bed+=1440;if(cursor<bed)items.push({name:"自由時間",start:cursor,end:bed,type:"free",virtual:true});
 const now=new Date();let nowM=now.getHours()*60+now.getMinutes();if(nowM<start)nowM+=1440;
 box.innerHTML=items.map(it=>{const color=COLORS[it.type]||COLORS.daily;const done=it.id&&state.tasks.find(t=>t.id===it.id)?.done;return `<div class="timeline-item ${done?"done":""}" style="--accent:${color}"><div class="timeline-time">${fmt(it.start)}</div><div class="timeline-rail"><span class="timeline-dot"></span></div><div class="timeline-content"><div class="timeline-title">${esc(it.name)}</div><div class="timeline-meta">${fmt(it.start)} – ${fmt(it.end)} · ${durationText(it.end-it.start)}</div></div></div>${nowM>=it.start&&nowM<it.end?'<div class="now-line">NOW · 現在時刻</div>':""}`}).join("")+`<div class="timeline-item"><div class="timeline-time">${fmt(cursor>bed?cursor:bed)}</div><div class="timeline-rail"><span class="timeline-dot" style="background:var(--pink)"></span></div><div class="timeline-content"><div class="timeline-title" style="color:var(--pink)">☾ BEDTIME</div><div class="timeline-meta">就寝目標 ${fmt(bed)}</div></div></div>`;
}
render();setInterval(updateHero,30000);
if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
