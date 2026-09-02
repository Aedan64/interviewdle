"use client";
import {useEffect,useMemo,useState} from "react";
import {
  Check,
  ChevronDown,
  Download,
  Flame,
  Mail,
  RotateCcw,
  Share2,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import {SignedIn,SignedOut,SignInButton,UserButton,useAuth} from "@clerk/clerk-react";

const QUESTIONS=[
{category:"Digital Logic",difficulty:"Easy",question:"What is the difference between combinational logic and sequential logic?",terms:["input","memory","state","flip-flop"],ideal:"Combinational logic produces an output based only on its current inputs. Sequential logic also depends on stored state from earlier inputs, usually held in memory elements such as flip-flops or registers."},
{category:"Computer Architecture",difficulty:"Easy",question:"What does a CPU cache do, and why is it faster than main memory?",terms:["frequent","data","close","cpu","latency"],ideal:"A CPU cache stores frequently used data and instructions close to the processor. It uses faster memory and has much lower access latency than main memory, so the CPU spends less time waiting for data."},
{category:"Embedded Systems",difficulty:"Medium",question:"What is an interrupt, and when would you use one instead of polling?",terms:["event","pause","handler","cpu","polling"],ideal:"An interrupt is a signal that temporarily pauses normal execution and runs a handler for an event. I would use it when a device needs a fast response without making the CPU repeatedly check its status, as polling would."},
{category:"FPGA & Debugging",difficulty:"Medium",question:"Your FPGA design works in simulation but not on the physical board. What would you check first?",terms:["pin","clock","reset","timing","voltage"],ideal:"I would verify the pin assignments, power and voltage levels, clock and reset signals, and that the correct bitstream was programmed. Then I would review timing constraints and probe signals stage by stage to isolate the mismatch."}];
type Result={score:number;label:string;hits:string[];misses:string[]};
function streakFrom(dates:string[]){const days=new Set(dates),cursor=new Date();let total=0;for(;;){const key=cursor.toISOString().slice(0,10);if(!days.has(key))break;total++;cursor.setUTCDate(cursor.getUTCDate()-1)}return total}

export default function Home(){
 const {isSignedIn,getToken}=useAuth();
 const [answer,setAnswer]=useState(""),
  [result,setResult]=useState<Result|null>(null),
  [rewrite,setRewrite]=useState(false),
  [menu,setMenu]=useState(false),
  [shareOpen,setShareOpen]=useState(false),
  [shareFormat,setShareFormat]=useState<"story"|"wide">("story");
 const [streak,setStreak]=useState(0),[played,setPlayed]=useState(0);
 const [completedDates,setCompletedDates]=useState<string[]>([]);
 const today=new Date().toISOString().slice(0,10),number=Math.max(1,Math.floor((Date.now()-new Date("2026-09-01").getTime())/86400000)+1);
 const q=useMemo(()=>QUESTIONS[(number-1)%QUESTIONS.length],[number]);
 useEffect(()=>{const s=JSON.parse(localStorage.getItem("interviewdle")||"{}");const dates:string[]=Array.isArray(s.completedDates)?s.completedDates:(s.date&&s.result?[s.date]:[]);setCompletedDates(dates);setStreak(streakFrom(dates));setPlayed(dates.length);if(s.date===today&&s.result){setAnswer(s.answer||"");setResult(s.result)}},[today]);
 useEffect(()=>{if(!isSignedIn)return;void (async()=>{const token=await getToken();const response=await fetch("/api/progress",{headers:{Authorization:`Bearer ${token}`}});if(!response.ok)return;const data=await response.json(),dates:string[]=data.dates||[];setCompletedDates(dates);setPlayed(dates.length);setStreak(streakFrom(dates));const latest=data.latest;if(latest?.question_date===today){const saved={score:latest.score_tenths/10,label:latest.result_label,hits:JSON.parse(latest.hits_json),misses:JSON.parse(latest.misses_json)};setAnswer(latest.answer);setResult(saved)}})()},[isSignedIn,getToken,today]);
 async function saveProgress(clean:string,next:Result){if(!isSignedIn)return;const token=await getToken();await fetch("/api/progress",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({date:today,answer:clean,score:next.score,label:next.label,hits:next.hits,misses:next.misses})})}
 function submit(){const clean=answer.trim();if(clean.length<18)return;const signals=["in conclusion","it is important to note","furthermore","plays a crucial role","delve"];if((clean.length>420||signals.filter(x=>clean.toLowerCase().includes(x)).length>=2)&&!rewrite){setRewrite(true);return}const low=clean.toLowerCase(),hits=q.terms.filter(t=>low.includes(t)),misses=q.terms.filter(t=>!low.includes(t));const score=Math.min(10,Math.round((5.2+hits.length*.9+Math.min(clean.length/180,1)*1.2)*10)/10),next={score,label:score>=8.5?"Strong":score>=7?"Good start":"Needs work",hits,misses};const dates=completedDates.includes(today)?completedDates:[today,...completedDates];setCompletedDates(dates);setResult(next);setRewrite(false);setStreak(streakFrom(dates));setPlayed(dates.length);localStorage.setItem("interviewdle",JSON.stringify({date:today,answer:clean,result:next,completedDates:dates}));void saveProgress(clean,next)}
 return <main className="min-h-screen"><header className="topbar"><div className="brand"><span className="brand-mark">I</span><span>INTERVIEWDLE</span></div><div className="header-stats"><span><Flame size={18}/>{streak} day streak</span><span className="desktop-only"><Trophy size={17}/>{played} completed</span><SignedOut><SignInButton mode="modal"><button className="sign-in">Sign in</button></SignInButton></SignedOut><SignedIn><UserButton/></SignedIn></div></header>
 <div className="shell"><section className="career-row"><div><p className="eyebrow">YOUR CAREER</p><button className="career-select" onClick={()=>setMenu(!menu)}><span className="chip-icon">⌁</span>Computer Hardware Engineer<ChevronDown size={17}/></button>{menu&&<div className="career-menu"><button onClick={()=>setMenu(false)}><Check size={16}/>Computer Hardware Engineer</button><p>More careers coming soon</p></div>}</div><div className="mini-stats"><div><b>{streak}</b><span>DAY STREAK</span></div><div><b>{played?Math.round(((played-1)*82+Math.max(result?.score||0,7)*10)/played):0}%</b><span>AVG. SCORE</span></div></div></section>
 <section className="game-card"><div className="card-head"><div><p className="eyebrow">TODAY&apos;S INTERVIEW</p><h1>Interviewdle <span>#{String(number).padStart(3,"0")}</span></h1></div><div className="tags"><span>{q.category}</span><span className="difficulty">● {q.difficulty}</span></div></div><div className="question-wrap"><span className="question-number">Q</span><h2>{q.question}</h2></div>
 {!result?<><SignedOut><div className="save-note"><span>Play as a guest, or </span><SignInButton mode="modal"><button>sign in to save progress across devices</button></SignInButton>.</div></SignedOut><label htmlFor="answer">Answer like you&apos;re speaking to an interviewer.</label><div className={`answer-box ${rewrite?"warn":""}`}><textarea id="answer" value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Explain it in your own words…" maxLength={900}/><span>{answer.length}/900</span></div>{rewrite&&<div className="rewrite"><Sparkles size={20}/><div><b>This answer sounds unusually polished.</b><p>Try explaining it again in your own words, like you would in a real interview.</p></div></div>}<button className="submit" onClick={submit} disabled={answer.trim().length<18}>{rewrite?"Check My Rewrite":"Submit Answer"}<span>↵</span></button><p className="privacy"><Target size={15}/>Your response is checked for learning—not used to accuse or penalize you.</p></>:
 <section className="results"><div className="score-row"><div className="score-badge"><b>{result.score}</b><span>/ 10</span></div><div><p className="eyebrow">YOUR RESULT</p><h3>{result.label}</h3><p>Own Words Check passed — your answer sounds natural.</p></div></div><div className="feedback-grid"><article><h4>What you covered</h4>{result.hits.length?result.hits.map(x=><p key={x}><Check size={16}/>{x}</p>):<p>Try adding more technical detail.</p>}</article><article><h4>What to add</h4>{result.misses.slice(0,3).map(x=><p key={x}><span>+</span>{x}</p>)}</article></div><article className="ideal"><p className="eyebrow">INTERVIEW-READY ANSWER</p><p>“{q.ideal}”</p></article><div className="result-footer">   <span><Flame size={20}/>{streak} day streak</span>    <div className="result-actions">     <button onClick={()=>setShareOpen(!shareOpen)}>       <Share2 size={16}/>       Share Result     </button>      <button onClick={()=>{setAnswer("");setResult(null);setRewrite(false);setShareOpen(false)}}>       <RotateCcw size={16}/>       Replay demo     </button>   </div> </div>  {shareOpen && (   <div className="share-panel">     <div className="share-panel-head">       <div>         <p className="eyebrow">SHARE YOUR RESULT</p>         <h4>Choose a format</h4>       </div>     </div>      <div className="share-formats">       <button         className={shareFormat==="story" ? "active" : ""}         onClick={()=>setShareFormat("story")}       >         <span>9:16</span>         Instagram Story       </button>        <button         className={shareFormat==="wide" ? "active" : ""}         onClick={()=>setShareFormat("wide")}       >         <span>16:9</span>         Desktop / Social       </button>     </div>      <div className={`share-preview ${shareFormat}`}>       <p className="share-brand">INTERVIEWDLE</p>       <p className="share-number">         Interviewdle #{String(number).padStart(3,"0")}       </p>        <div className="share-score">         <b>{result.score}</b>         <span>/10</span>       </div>        <h3>{result.label}</h3>        <div className="share-details">         <span>{q.category}</span>         <span>{streak} day streak</span>       </div>        <p className="share-tagline">         One question. Every day. A better answer each time.       </p>     </div>      <div className="share-buttons">       <button onClick={downloadShareImage}>         <Download size={16}/>         Save Image       </button>        <button onClick={shareResult}>         <Share2 size={16}/>         Share       </button>      <button onClick={shareToX}>
    𝕏
    Post to X
  </button>    <button onClick={emailResult}>         <Mail size={16}/>         Email       </button>     </div>   </div> )}</section>}
 </section><footer><span>One question. Every day. A better answer each time.</span><span>Built for real interview practice.</span></footer></div></main>}
.result-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.share-panel {
  margin-top: 22px;
  padding: 20px;
  border: 1px solid #dfe3e8;
  border-radius: 18px;
  background: #ffffff;
}

.share-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.share-panel-head h4 {
  margin: 3px 0 0;
  font-size: 20px;
}

.share-formats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 18px;
}

.share-formats button {
  border: 1px solid #d8dde3;
  background: #f7f8fa;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  transition: 0.2s ease;
}

.share-formats button span {
  display: block;
  font-size: 12px;
  opacity: 0.6;
  margin-bottom: 2px;
}

.share-formats button.active {
  border-color: #111827;
  background: #111827;
  color: white;
}

.share-preview {
  margin: 0 auto 18px;
  background:
    radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 35%),
    linear-gradient(145deg, #111827, #202938);
  color: white;
  border-radius: 22px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-shadow: 0 16px 40px rgba(0,0,0,0.14);
  overflow: hidden;
}

.share-preview.story {
  width: min(100%, 320px);
  aspect-ratio: 9 / 16;
}

.share-preview.wide {
  width: 100%;
  aspect-ratio: 16 / 9;
}

.share-brand {
  font-size: 13px;
  letter-spacing: 0.18em;
  font-weight: 800;
  opacity: 0.8;
  margin-bottom: 18px;
}

.share-number {
  font-size: 14px;
  opacity: 0.72;
}

.share-score {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 12px 0 2px;
}

.share-score b {
  font-size: clamp(54px, 10vw, 82px);
  line-height: 1;
}

.share-score span {
  font-size: 22px;
  opacity: 0.65;
}

.share-preview h3 {
  font-size: 28px;
  margin: 6px 0 18px;
}

.share-details {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.share-details span {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.15);
  padding: 7px 10px;
  border-radius: 999px;
  font-size: 12px;
}

.share-tagline {
  margin-top: auto;
  padding-top: 22px;
  font-size: 13px;
  opacity: 0.7;
}

.share-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.share-buttons button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 11px;
  border-radius: 11px;
  border: 1px solid #d8dde3;
  background: white;
  cursor: pointer;
  font-weight: 600;
}

@media (max-width: 640px) {
  .share-formats {
    grid-template-columns: 1fr;
  }

  .share-buttons {
    grid-template-columns: 1fr;
  }

  .result-actions {
    width: 100%;
  }

  .result-actions button {
    flex: 1;
  }
  function downloadShareImage() {
  if (!result) return;

  const isStory = shareFormat === "story";
  const width = isStory ? 1080 : 1600;
  const height = isStory ? 1920 : 900;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#111827");
  gradient.addColorStop(1, "#202938");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.arc(width * 0.85, height * 0.12, width * 0.28, 0, Math.PI * 2);
  ctx.fill();

  const left = isStory ? 90 : 110;

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `700 ${isStory ? 34 : 30}px Arial`;
  ctx.fillText("INTERVIEWDLE", left, isStory ? 180 : 110);

  ctx.font = `${isStory ? 30 : 26}px Arial`;
  ctx.fillText(
    `Interviewdle #${String(number).padStart(3, "0")}`,
    left,
    isStory ? 270 : 180
  );

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${isStory ? 210 : 150}px Arial`;
  ctx.fillText(
    String(result.score),
    left,
    isStory ? 650 : 430
  );

  const scoreWidth = ctx.measureText(String(result.score)).width;

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `${isStory ? 58 : 44}px Arial`;
  ctx.fillText(
    "/10",
    left + scoreWidth + 20,
    isStory ? 650 : 430
  );

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${isStory ? 70 : 50}px Arial`;
  ctx.fillText(
    result.label,
    left,
    isStory ? 760 : 520
  );

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `${isStory ? 34 : 28}px Arial`;
  ctx.fillText(
    q.category,
    left,
    isStory ? 880 : 610
  );

  ctx.fillText(
    `${streak} day streak`,
    left,
    isStory ? 940 : 660
  );

  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = `${isStory ? 30 : 24}px Arial`;
  ctx.fillText(
    "One question. Every day. A better answer each time.",
    left,
    height - (isStory ? 140 : 80)
  );

  const link = document.createElement("a");
  link.download = `interviewdle-${number}-${shareFormat}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}function downloadShareImage() {
  if (!result) return;

  const isStory = shareFormat === "story";
  const width = isStory ? 1080 : 1600;
  const height = isStory ? 1920 : 900;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#111827");
  gradient.addColorStop(1, "#202938");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.arc(width * 0.85, height * 0.12, width * 0.28, 0, Math.PI * 2);
  ctx.fill();

  const left = isStory ? 90 : 110;

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = `700 ${isStory ? 34 : 30}px Arial`;
  ctx.fillText("INTERVIEWDLE", left, isStory ? 180 : 110);

  ctx.font = `${isStory ? 30 : 26}px Arial`;
  ctx.fillText(
    `Interviewdle #${String(number).padStart(3, "0")}`,
    left,
    isStory ? 270 : 180
  );

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${isStory ? 210 : 150}px Arial`;
  ctx.fillText(
    String(result.score),
    left,
    isStory ? 650 : 430
  );

  const scoreWidth = ctx.measureText(String(result.score)).width;

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = `${isStory ? 58 : 44}px Arial`;
  ctx.fillText(
    "/10",
    left + scoreWidth + 20,
    isStory ? 650 : 430
  );

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${isStory ? 70 : 50}px Arial`;
  ctx.fillText(
    result.label,
    left,
    isStory ? 760 : 520
  );

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `${isStory ? 34 : 28}px Arial`;
  ctx.fillText(
    q.category,
    left,
    isStory ? 880 : 610
  );

  ctx.fillText(
    `${streak} day streak`,
    left,
    isStory ? 940 : 660
  );

  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = `${isStory ? 30 : 24}px Arial`;
  ctx.fillText(
    "One question. Every day. A better answer each time.",
    left,
    height - (isStory ? 140 : 80)
  );

  const link = document.createElement("a");
  link.download = `interviewdle-${number}-${shareFormat}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
async function shareResult() {
  if (!result) return;

  const text =
    `I scored ${result.score}/10 on Interviewdle #${String(number).padStart(3,"0")} — ${result.label}. ` +
    `${streak} day streak.`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: "My Interviewdle Result",
        text,
        url: window.location.href,
      });
      return;
    } catch {
      // User closed the share menu
    }
  }

  await navigator.clipboard.writeText(`${text} ${window.location.href}`);
  alert("Result copied to clipboard!");
}

function emailResult() {
  if (!result) return;

  const subject = encodeURIComponent(
    `My Interviewdle #${String(number).padStart(3,"0")} Result`
  );

  const body = encodeURIComponent(
    `I scored ${result.score}/10 on Interviewdle #${String(number).padStart(3,"0")} — ${result.label}.\n\n` +
    `${streak} day streak\n${q.category}\n\n` +
    `Try it here: ${window.location.href}`
  );

  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}
function shareToX() {
  if (!result) return;

  const text = encodeURIComponent(
    `I scored ${result.score}/10 on Interviewdle #${String(number).padStart(3,"0")} — ${result.label}. ${streak} day streak.`
  );

  const url = encodeURIComponent(window.location.href);

  window.open(
    `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    "_blank",
    "noopener,noreferrer"
  );
}
}
