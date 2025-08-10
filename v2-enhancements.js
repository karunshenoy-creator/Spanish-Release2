
(function(){
  const $ = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>Array.from(el.querySelectorAll(s));

  document.addEventListener("DOMContentLoaded", () => {
    const sel = $("#daySelect");
    if (sel){
      for (let i=1;i<=31;i++){
        const o=document.createElement("option");
        o.value=String(i); o.textContent="Day "+i; sel.appendChild(o);
      }
    }

    // Runtime safeguard: Flip -> Translate
    $$("button").forEach(b=>{
      const t=(b.textContent||"").trim();
      if (/\bFlip\b/i.test(t)) b.textContent=t.replace(/\bFlip\b/gi,"Translate");
    });

    const beep=$("#rpSelectBeep");
    const tryBeep=()=>{try{beep&&beep.play&&beep.play();}catch(e){}}

    function simulateOldDaySelection(day){
      const trySel=[`[data-day="${day}"]`,`[data-index="${day}"]`,`#day-${day}`,`button[data-day="${day}"]`];
      for (const qs of trySel){
        const el=document.querySelector(qs);
        if (el){ el.click(); return true; }
      }
      const all=$$("button,[role='button'],.tile,.day,.day-tile");
      for (const b of all){
        const t=(b.textContent||"").trim().toLowerCase();
        if (t===String(day) || t===("day "+day)){ b.click(); return true; }
      }
      window.currentDay=day;
      document.dispatchEvent(new CustomEvent("day-changed",{detail:{day}}));
      return false;
    }

    sel && sel.addEventListener("change", tryBeep);
    $("#dayStartBtn")?.addEventListener("click", ()=>{
      const d=parseInt($("#daySelect")?.value||"1",10);
      simulateOldDaySelection(d);
      tryBeep();
    });

    function enhanceQuiz(){
      const day=window.currentDay || parseInt($("#daySelect")?.value||"1",10);
      let vocab=[];
      if (Array.isArray(window.vocab)) vocab=window.vocab;
      if (window.dayVocab && Array.isArray(window.dayVocab[day])) vocab=window.dayVocab[day];

      let quizPool=null;
      if (window.dailyQuiz && Array.isArray(window.dailyQuiz[day])) quizPool=window.dailyQuiz[day];
      else if (Array.isArray(window.quiz)) quizPool=window.quiz;

      if (quizPool){
        const desired = Math.min(5, Math.max(3, quizPool.length||3));
        const extra=[];
        if (Array.isArray(vocab) && vocab.length){
          const pick=(arr,n)=>arr.slice().sort(()=>Math.random()-0.5).slice(0,n);
          const chosen=pick(vocab, Math.max(1, 5 - quizPool.length));
          for (const w of chosen){
            const term = (w&& (w.term||w.word||w.es||w.spanish||w)) || "";
            const ans  = (w&& (w.meaning||w.translation||w.en||w.english||"")) || "";
            if (term && ans){
              extra.push({type:"vocab-meaning", prompt:`What does "${term}" mean in English?`, answer:String(ans), options:null});
            }
          }
        }
        quizPool.push(...extra);
        while (quizPool.length < 3) quizPool.push({type:"truefalse", prompt:"Spain is in Europe.", answer:"true"});
        while (quizPool.length > 5) quizPool.pop();
      }
    }

    function enhanceListenSpeak(){
      const day=window.currentDay || parseInt($("#daySelect")?.value||"1",10);
      let sentences=null;
      if (window.listenSpeak && Array.isArray(window.listenSpeak[day])) sentences=window.listenSpeak[day];
      else if (Array.isArray(window.listenSpeak)) sentences=window.listenSpeak;
      if (sentences){
        const min=3, max=4;
        let vocab=[];
        if (Array.isArray(window.vocab)) vocab=window.vocab;
        if (window.dayVocab && Array.isArray(window.dayVocab[day])) vocab=window.dayVocab[day];
        const simpleLine=(w)=>{
          const t=(w&&(w.term||w.word||w.es||w.spanish||w))||"Hola";
          return `${t}.`;
        };
        while (sentences.length < min){
          if (vocab && vocab.length) sentences.push(simpleLine(vocab[Math.floor(Math.random()*vocab.length)]));
          else sentences.push("Hola. ¿Cómo estás?");
        }
        while (sentences.length > max) sentences.pop();
      }
    }

    setTimeout(()=>{enhanceQuiz(); enhanceListenSpeak();}, 800);
    document.addEventListener("day-changed", ()=> setTimeout(()=>{enhanceQuiz(); enhanceListenSpeak();}, 300));
  });
})();


// v2.1 additions
(function(){
  let audioUnlocked = false;
  function unlockAudio(){
    if (audioUnlocked) return;
    const beep = document.getElementById("rpSelectBeep");
    try{ beep && beep.play && beep.play().catch(()=>{}); }catch(e){}
    audioUnlocked = true;
    window.removeEventListener("pointerdown", unlockAudio, true);
    window.removeEventListener("keydown", unlockAudio, true);
  }
  window.addEventListener("pointerdown", unlockAudio, true);
  window.addEventListener("keydown", unlockAudio, true);

  // default the dropdown to Day 1
  document.addEventListener("DOMContentLoaded", ()=>{
    const sel=document.getElementById("daySelect");
    if (sel && !sel.value) sel.value="1";
  });

  // Expand simulateOldDaySelection with more heuristics: look for buttons whose text contains the number,
  // or a data attribute like data-dayindex
  const _origSim = (typeof simulateOldDaySelection==='function') ? simulateOldDaySelection : null;
  window.simulateOldDaySelection = function(day){
    // Original first
    if (_origSim && _origSim(day)) return true;
    // Heuristic 2: any element with data-dayindex or data-day-num
    const q2 = document.querySelector(`[data-dayindex="${day}"], [data-day-num="${day}"]`);
    if (q2){ q2.click(); return true; }
    // Heuristic 3: buttons or anchors containing the number as standalone or "Day X"
    const candidates = Array.from(document.querySelectorAll("button,a,div,span"));
    for (const el of candidates){
      const t = (el.textContent||"").trim().toLowerCase();
      if (t === String(day) || t === ("day "+day)) { el.click(); return true; }
    }
    // Heuristic 4: set globally known vars and call start functions if present
    window.currentDay = day;
    if (typeof window.selectDay === "function"){ window.selectDay(day); return true; }
    if (typeof window.startDay === "function"){ window.startDay(day); return true; }
    document.dispatchEvent(new CustomEvent("day-changed",{detail:{day}}));
    return false;
  };

  // When user clicks Start, also scroll to main study area if present
  document.addEventListener("DOMContentLoaded", ()=>{
    const startBtn = document.getElementById("dayStartBtn");
    if (startBtn){
      startBtn.addEventListener("click", ()=>{
        const main = document.querySelector("main") || document.querySelector("[data-role='main']") || document.body;
        if (main && main.scrollIntoView) setTimeout(()=>main.scrollIntoView({behavior:"smooth", block:"start"}), 50);
      });
    }
  });
})();


// v2.2: stronger audio unlock and quiz/listen guards
(function(){
  let audioUnlocked=false;
  function unlockAudio(){
    if (audioUnlocked) return;
    const beep=document.getElementById("rpSelectBeep");
    if (beep && beep.play) { try{beep.play().catch(()=>{});}catch(e){} }
    audioUnlocked=true;
    window.removeEventListener("pointerdown", unlockAudio, true);
    window.removeEventListener("keydown", unlockAudio, true);
    window.removeEventListener("touchstart", unlockAudio, true);
  }
  window.addEventListener("pointerdown", unlockAudio, true);
  window.addEventListener("keydown", unlockAudio, true);
  window.addEventListener("touchstart", unlockAudio, true);

  // Always ensure dropdown exists and defaults to 1
  document.addEventListener("DOMContentLoaded", ()=>{
    const sel=document.getElementById("daySelect");
    if (sel && !sel.value) sel.value="1";
  });

  // Force enhancements after any click on Start or tab-switch
  const reEnhance = ()=> setTimeout(()=>{
    try{ if (typeof enhanceQuiz==='function') enhanceQuiz(); }catch(e){}
    try{ if (typeof enhanceListenSpeak==='function') enhanceListenSpeak(); }catch(e){}
  }, 500);
  document.addEventListener("click", (e)=>{
    const id=(e.target && e.target.id)||'';
    if (id==='dayStartBtn') reEnhance();
  }, true);

  // If only one quiz question found, synthesize more (3–5 total)
  function synthesizeQuizIfNeeded(){
    const day=window.currentDay || parseInt(document.getElementById("daySelect")?.value||"1",10);
    let vocab=[];
    if (Array.isArray(window.vocab)) vocab=window.vocab;
    if (window.dayVocab && Array.isArray(window.dayVocab[day])) vocab=window.dayVocab[day];
    let quiz=null;
    if (window.dailyQuiz && Array.isArray(window.dailyQuiz[day])) quiz=window.dailyQuiz[day];
    else if (Array.isArray(window.quiz)) quiz=window.quiz;
    if (!Array.isArray(quiz)) return;
    const ensureN=(min,max)=>{
      while (quiz.length < min){
        if (vocab && vocab.length){
          const w=vocab[Math.floor(Math.random()*vocab.length)];
          const term=(w&&(w.term||w.word||w.es||w.spanish||w))||"hola";
          const ans=(w&&(w.meaning||w.translation||w.en||w.english||"hello"))||"hello";
          quiz.push({type:"vocab-meaning", prompt:`What does "${term}" mean in English?`, answer:String(ans), options:null});
        } else {
          // simple cultural fallbacks
          const pool=[
            {type:"mc", prompt:"Which country is Madrid in?", answer:"Spain", options:["Spain","Mexico","Argentina","Chile"]},
            {type:"truefalse", prompt:"Buenos Aires is in Argentina.", answer:"true"},
            {type:"mc", prompt:"Official language of Spain?", answer:"Spanish", options:["Spanish","Portuguese","French","Italian"]},
          ];
          quiz.push(pool[Math.floor(Math.random()*pool.length)]);
        }
      }
      while (quiz.length > max) quiz.pop();
    };
    ensureN(3,5);
  }

  // Hook synthesize after our existing enhanceQuiz/listen
  setInterval(synthesizeQuizIfNeeded, 1000);
})();
