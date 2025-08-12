const $ = (id)=>document.getElementById(id);
let currentLang = 'en';
let i18n = {};
let voices = [];
let voiceMap = {};

// Load minimal i18n for direction
async function loadLang(lang){
  try {
    const res = await fetch(`../i18n/${lang}/common.json`);
    i18n[lang] = await res.json();
    currentLang = lang;
    document.documentElement.dir = (lang==='ar') ? 'rtl' : 'ltr';
    $('status').innerText = `Language set to ${lang.toUpperCase()}.`;
  } catch(e){
    $('status').innerText = `Language load failed: ${e?.message || e}`;
  }
}

function refreshVoices(){
  voices = window.speechSynthesis.getVoices();
  voiceMap = {};
  voices.forEach(v => {
    const lang = (v.lang || '').toLowerCase();
    const primary = lang.split('-')[0];
    if(!voiceMap[primary]) voiceMap[primary] = [];
    voiceMap[primary].push(v);
  });
  const list = $('voiceList'); list.innerHTML='';
  voices.forEach(v => {
    const li = document.createElement('li');
    li.textContent = `${v.name} (${v.lang})${v.localService? ' — local':''}`;
    list.appendChild(li);
  });
  updateVoiceInfo();
}

function pickVoice(lang){
  const primary = lang.toLowerCase();
  if(voiceMap[primary]?.length){
    const local = voiceMap[primary].find(v => v.localService);
    return local || voiceMap[primary][0];
  }
  if(primary==='ml' && voiceMap['hi']) return voiceMap['hi'][0];
  if(primary==='hi' && voiceMap['ml']) return voiceMap['ml'][0];
  if(voiceMap['ar']?.length) return voiceMap['ar'][0];
  if(voiceMap['en']?.length) return voiceMap['en'][0];
  return null;
}

function updateVoiceInfo(){
  const v = pickVoice(currentLang);
  $('voiceInfo').innerText = v ? `Voice: ${v.name} (${v.lang})` : 'Voice: none — falling back to system default.';
}

function speak(text){
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(currentLang);
  if(v) u.voice = v;
  if(['ar','hi','ml'].includes(currentLang)) u.rate = 0.95;
  u.lang = (v && v.lang) ? v.lang : (currentLang === 'ar' ? 'ar-SA' : currentLang);
  u.onstart = ()=> $('status').innerText = 'Speaking…';
  u.onend = ()=> $('status').innerText = 'Done.';
  u.onerror = (e)=> $('status').innerText = 'TTS error: ' + (e?.error || 'unknown');
  window.speechSynthesis.speak(u);
}

function stopSpeak(){ window.speechSynthesis.cancel(); $('status').innerText = 'Stopped.'; }

async function init(){
  $('langSel').addEventListener('change', e => { currentLang = e.target.value; updateVoiceInfo(); loadLang(currentLang); });
  await loadLang('en');
  $('phraseSel').addEventListener('change', e => { if(e.target.value) $('ttsText').value = e.target.value; });
  $('speakBtn').addEventListener('click', ()=> {
    const txt = $('ttsText').value.trim();
    if(!txt){ $('status').innerText = 'Type something first.'; return; }
    speak(txt);
  });
  $('stopBtn').addEventListener('click', stopSpeak);
  refreshVoices();
  if (typeof speechSynthesis !== 'undefined'){ speechSynthesis.onvoiceschanged = refreshVoices; }
  $('info').innerText = 'Type a message and click Speak. Switch Lang to test EN/HI/AR/ML. For best Arabic/Hindi/Malayalam speech, install system voices in Windows language settings.';
}
init();
