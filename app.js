// Basic offline app with localStorage progress, TTS, simple STT check, and SRS-lite
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>document.querySelectorAll(s);

let LESSONS = [];
let state = {
  dayIndex: 0,
  flashIndex: 0,
  speakIndex: 0,
  questAnswered: false,
  voices: []
};

function loadVoices(){
  function setVoices(){
    state.voices = speechSynthesis.getVoices();
  }
  setVoices();
  speechSynthesis.onvoiceschanged = setVoices;
}

function tts(text, lang='es-MX'){
  const utter = new SpeechSynthesisUtterance(text);
  let v = state.voices.find(v=>v.lang.startsWith('es-MX')) ||
          state.voices.find(v=>v.lang.startsWith('es-ES')) ||
          state.voices[0];
  if(v) utter.voice = v;
  utter.lang = (v && v.lang) || lang;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

function getStore(){
  try{
    return JSON.parse(localStorage.getItem('ryp_store')||'{}');
  }catch(e){ return {}; }
}
function setStore(data){
  localStorage.setItem('ryp_store', JSON.stringify(data));
}
function getProgress(){
  const s = getStore();
  return s.progress || { completed: {}, streak: 0, lastDay: null, xp:0, target:15 };
}
function setProgress(p){
  const s = getStore();
  s.progress = p;
  setStore(s);
  $('#streak').textContent = p.streak;
  $('#xp').textContent = p.xp;
  $('#dailyTarget').value = p.target;
}

function calcStreak(progress){
  const today = new Date().toDateString();
  const last = progress.lastDay;
  if(!last){ progress.streak = 1; progress.lastDay = today; return; }
  const d1 = new Date(last);
  const d2 = new Date(today);
  const diff = Math.round((d2 - d1)/86400000);
  if(diff === 0) return; // already counted
  if(diff === 1) progress.streak += 1;
  else progress.streak = 1;
  progress.lastDay = today;
}

async function init(){
  loadVoices();
  const resp = await fetch('lessons.json');
  LESSONS = await resp.json();
  const prog = getProgress();
  setProgress(prog);
  renderDays();
  $('#dailyTarget').addEventListener('change', e=>{
    const p = getProgress(); p.target = parseInt(e.target.value,10); setProgress(p);
  });
  wireTabs();
}

function renderDays(){
  const container = $('#days');
  container.innerHTML = '';
  const prog = getProgress();
  for(let i=0;i<LESSONS.length;i++){
    const d = document.createElement('button');
    d.className = 'day';
    const locked = false; // allow free navigation
    if(locked) d.classList.add('locked');
    if(prog.completed[i]) d.classList.add('complete');
    d.innerHTML = `<strong>Day ${i+1}</strong><br><small>${LESSONS[i].theme}</small>`;
    d.addEventListener('click', ()=> openDay(i));
    container.appendChild(d);
  }
}

function openDay(i){
  state.dayIndex = i;
  state.flashIndex = 0;
  state.speakIndex = 0;
  state.questAnswered = false;
  $('#lesson').classList.remove('hidden');
  $('#dayTitle').textContent = `Day ${i+1} — ${LESSONS[i].theme}`;
  $('.tab.active')?.classList.remove('active');
  $('#btnFlash').classList.add('active');
  $('#flashcards').classList.remove('hidden');
  $('#speak').classList.add('hidden');
  $('#quest').classList.add('hidden');
  loadFlashcard();
  loadSpeak();
  loadQuest();
}

function wireTabs(){
  $('#btnFlash').addEventListener('click', ()=>{
    setActiveTab('#flashcards', '#btnFlash');
  });
  $('#btnSpeak').addEventListener('click', ()=>{
    setActiveTab('#speak', '#btnSpeak');
  });
  $('#btnQuest').addEventListener('click', ()=>{
    setActiveTab('#quest', '#btnQuest');
  });
  $('#btnPrev').addEventListener('click', ()=>{ state.flashIndex = Math.max(0, state.flashIndex-1); loadFlashcard(); });
  $('#btnNext').addEventListener('click', ()=>{ state.flashIndex = Math.min(getFlash().length-1, state.flashIndex+1); loadFlashcard(); });
  $('#btnFlip').addEventListener('click', ()=>{
    const b = $('#flashBack'); b.style.display = (b.style.display==='none' ? 'block' : 'none');
  });
  $('#btnSpeakCard').addEventListener('click', ()=>{
    const f = getFlash()[state.flashIndex];
    tts(f.es);
  });
  $$('.srs button').forEach(btn=>btn.addEventListener('click', ()=>{
    const rate = btn.dataset.rate;
    const p = getProgress();
    p.xp += (rate==='easy'?6:rate==='good'?5:rate==='hard'?3:1);
    setProgress(p);
  }));
  $('#btnPlayLine').addEventListener('click', speakLine);
  $('#btnRecord').addEventListener('click', startSTT);
  $('#btnCompleteDay').addEventListener('click', completeDay);
}

function setActiveTab(stageSel, btnSel){
  $$('.stage').forEach(s=>s.classList.add('hidden'));
  $(stageSel).classList.remove('hidden');
  $$('.tab').forEach(t=>t.classList.remove('active'));
  $(btnSel).classList.add('active');
}

function getDay(){ return LESSONS[state.dayIndex]; }
function getFlash(){ return getDay().speed_cards; }
function getDialogue(){ return getDay().dialogue; }
function getQuest(){ return getDay().cultural_quiz; }

function loadFlashcard(){
  const f = getFlash()[state.flashIndex];
  $('#flashFront').textContent = f.es;
  $('#flashBack').textContent = `${f.en}${f.note ? ' · '+f.note : ''}`;
  $('#flashBack').style.display = 'none';
}

function loadSpeak(){
  const d = getDialogue();
  $('#dialogueContext').textContent = d.context;
  const box = $('#dialogueBox');
  box.innerHTML = '';
  d.lines.forEach((ln,idx)=>{
    const div = document.createElement('div');
    div.className = 'line ' + (ln.lang==='es'?'es':'en');
    div.dataset.idx = idx;
    div.textContent = (ln.lang==='es'?'ES: ':'EN: ') + ln.text;
    div.addEventListener('click', ()=>{
      if(ln.lang==='es') tts(ln.text);
    });
    box.appendChild(div);
  });
}

function speakLine(){
  const d = getDialogue();
  const lines = d.lines.filter(l=>l.lang==='es');
  if(lines.length===0) return;
  const ln = lines[state.speakIndex % lines.length];
  tts(ln.text);
  state.speakIndex++;
}

function startSTT(){
  const status = $('#recStatus');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition){ status.textContent = 'Speech recognition not supported on this device.'; return; }
  const rec = new SpeechRecognition();
  rec.lang = 'es-ES';
  rec.interimResults = false; rec.maxAlternatives = 1;
  status.textContent = 'Listening...';
  rec.start();
  rec.onresult = (e)=>{
    const heard = e.results[0][0].transcript.toLowerCase();
    status.textContent = 'Heard: ' + heard;
    // very light scoring: does heard include any ES line fragments?
    const lines = getDialogue().lines.filter(l=>l.lang==='es');
    let score = 0;
    for(const ln of lines){
      const token = ln.text.toLowerCase().split(/[ ,.!?¿¡]/).filter(Boolean)[0];
      if(token && heard.includes(token)) score++;
    }
    const p = getProgress(); p.xp += Math.min(5, score); setProgress(p);
  };
  rec.onerror = ()=> status.textContent = 'Recognition error.';
  rec.onend = ()=>{ if(status.textContent==='Listening...') status.textContent = 'No input.'; };
}

function loadQuest(){
  const q = getQuest();
  $('#questPrompt').textContent = q.q;
  const opts = $('#questOptions'); opts.innerHTML='';
  $('#questFeedback').textContent = '';
  q.options.forEach((opt,i)=>{
    const b = document.createElement('button');
    b.textContent = opt;
    b.addEventListener('click', ()=>{
      if(state.questAnswered) return;
      state.questAnswered = true;
      if(i===q.answer_idx){
        $('#questFeedback').textContent = '✅ Correct! Bonus phrase: ' + q.unlock;
        tts(q.unlock);
        const p = getProgress(); p.xp += 8; setProgress(p);
      }else{
        $('#questFeedback').textContent = '❌ Not quite. Correct: ' + q.options[q.answer_idx];
      }
    });
    opts.appendChild(b);
  });
}

function completeDay(){
  const p = getProgress();
  p.completed[state.dayIndex] = true;
  p.xp += 10;
  calcStreak(p);
  setProgress(p);
  renderDays();
  alert('Day marked complete. Buen trabajo!');
}

init();
