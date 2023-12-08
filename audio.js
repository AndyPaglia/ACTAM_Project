const fileSelector = document.getElementById('file-selector');
const fileNameElement = document.getElementById('fileName');
const duration = document.getElementById('duration');
const playButton = document.getElementById('play');
const stopButton = document.getElementById('stop');
let audioCtx;
let source;  
let pauseFlag = false;
audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const gainNode = audioCtx.createGain();


fileSelector.addEventListener('change', (event) => {
  const fileList = event.target.files;
  if (fileList.length > 0) {
    const fileType = fileList[0].type;
    var fileName = fileList[0].name;
    fileNameElement.textContent = fileName;

    if (fileType.startsWith('audio/')) {
        createBuffer(fileList[0]);
    } else {
      alert('Seleziona un file audio.');
      fileNameElement.textContent = '';
      fileSelector.value = '';
    }
  } else {
    console.log('Nessun file selezionato');
  }
});



function createBuffer(file) {
  if(source)
    {
      source.stop();
    }
  const reader = new FileReader();
  reader.onload = function (event) {
    const audioData = event.target.result;

    //audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    audioCtx.decodeAudioData(audioData, function(buffer) {
     
      console.log(buffer);
      
   
      sumeffects(buffer);
   
    });
  };

  reader.readAsArrayBuffer(file);
  console.log(reader);
}

function sumeffects(buffer) {
 
  source = audioCtx.createBufferSource();
  
  //buffer dovrà essere inserito in una funzione chiamata modifyBuffer prima di essere
  //inserito in source
  //se inseriamo il valore in secondi e lo moltiplichiamo in sr, otteniamo il campione
  //dal quale partire
  source.buffer = buffer;

  gainNode.gain.value = 0.5; 
  source.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  source.loop = true;
  //reset the flags
  playButton.disabled = false;
  stopButton.disabled = true;
  pauseFlag = false;
}




playButton.addEventListener("click", playSound, pauseFlag);
stopButton.addEventListener("click", stopSound, pauseFlag);
function playSound() {
  if (source) {
    playButton.disabled = true;
    if (pauseFlag == true){
      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime+0.05);
      setTimeout(resumeFlag, 100);
    } 
    else{
      source.start();
      console.log(source);
      stopButton.disabled = false;
    }
    pauseFlag = false;
  }
}
function stopFlag(){
  audioCtx.suspend();
  playButton.disabled = false;
}
function resumeFlag(){
  audioCtx.resume();
  stopButton.disabled = false;
}
function stopSound() {
  pauseFlag = true;
  stopButton.disabled = true;
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime+0.05);
  setTimeout(stopFlag, 100);
}
