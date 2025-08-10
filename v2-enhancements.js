
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
