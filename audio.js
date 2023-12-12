const fileSelector = document.getElementById('file-selector');
const fileNameElement = document.getElementById('fileName');
const playButton = document.getElementById('play');
const stopButton = document.getElementById('stop');
let audioCtx;
let source;
let wavesurfer;

audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const gainNode = audioCtx.createGain();

fileSelector.addEventListener('change', (event) => {
  const fileList = event.target.files;
  if (fileList.length > 0) {
    const fileType = fileList[0].type;
    const fileName = fileList[0].name;
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
  if (source) {
    source.stop();
  }
  const reader = new FileReader();
  reader.onload = function (event) {
    const audioData = event.target.result;

    audioCtx.decodeAudioData(audioData, function (buffer) {
      console.log(buffer);
      sumeffects(buffer, audioData);
    });
  };

  reader.readAsArrayBuffer(file);
}

function sumeffects(buffer, audioData) {
  source = audioCtx.createBufferSource();
  source.buffer = buffer;

  gainNode.gain.value = 0.5;
  source.connect(gainNode);
  source.loop = true;

  wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: 'rgb(200, 0, 200)',
    progressColor: 'rgb(100, 0, 100)',
    backend: 'WebAudio',
  });

  wavesurfer.loadBlob(new Blob([audioData]));

  playButton.disabled = false;
  stopButton.disabled = true;  

  playButton.addEventListener('click', function () {
    wavesurfer.play();
    playButton.disabled = true;
    stopButton.disabled = false;  
  });

  stopButton.addEventListener('click', function () {
    wavesurfer.pause();
    playButton.disabled = false;
    stopButton.disabled = true;
  });
}


// Rimossi i codici di play e stop, perchè la libreria di wavesurfer si occupa 
// in autonomia della gestione di queste features


