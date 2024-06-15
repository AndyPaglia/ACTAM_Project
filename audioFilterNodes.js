const playButton = document.getElementById('play');
const stopButton = document.getElementById('stop');
const trackCountInput = document.getElementById('track-count');
const loadTracksButton = document.getElementById('load-tracks');
const trackListContainer = document.getElementById('track-list');
const addTracksButton = document.getElementById('add-tracks');
let totalTrackCount = 0;
let currentTrackCount = 0;
let audioCtx;
let masterGainNode;
let paused = false;
let pauseTime = 0;
let wavesurfers = [];
let loadFlag = new Array(10).fill(0);
let mediaRecorders = new Array(10).fill(null);
var audio;

function createCutBuffer(buffer, trackIndex){
        const wavesurferContainer = document.createElement('div');
        wavesurferContainer.id = `track-${trackIndex+1}-wavesurfer-container`;
        const trackContainer = document.getElementById(`track-${trackIndex+1}-container`);
        trackContainer.appendChild(wavesurferContainer);
        const cut = document.createElement('button');
        const volumeSlider = document.createElement('input');
        volumeSlider.type = 'range';
        volumeSlider.min = 0;
        volumeSlider.max = 1;
        volumeSlider.step = 0.01;
        volumeSlider.value = 0.5;
        volumeSlider.id = `track-${trackIndex+1}-volume`;
        //mette gli slider in ascolto per modificare il volume delle tracce
        volumeSlider.addEventListener('input', function (event) {
          const newVolumeValue = parseFloat(event.target.value);
          setVolume(wavesurfers[trackIndex], newVolumeValue);
        });

        trackContainer.appendChild(volumeSlider);
        const wavesurfer = WaveSurfer.create({
          container: `#track-${trackIndex+1}-wavesurfer-container`,
          waveColor: 'blue',
          progressColor: 'purple',
          cursorWidth: 1,
          interact: true,
          backend: 'WebAudio',
        });
        
        const url = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
        const peaks = [ buffer.getChannelData(0)] //channeldata(1) per gli stereo  
        const duration = buffer.duration
        
        wavesurfer.load(url, peaks, duration)
        wavesurfer.on('ready', function () {
          wavesurfers[trackIndex] = wavesurfer;
        });
    
        wavesurfer.on('play', function () {
          playButton.disabled = true;
          stopButton.disabled = false;
        });
    
        wavesurfer.on('pause', function () {
          playButton.disabled = false;
          stopButton.disabled = true;
        });
    
        wavesurfer.on('finish', function () {
          playButton.disabled = false;
          stopButton.disabled = true;
        });
    
        wavesurfer.on('finish', function () {
          loadFlag[trackIndex] = 1;
        });






}

function dataURLtoBlob(dataURL) {
  // Extract the base64 data part
  var base64Data = dataURL.split(',')[1];

  // Decode the base64 data
  var binaryString = atob(base64Data);

  // Create a Uint8Array from the binary string
  var arrayBuffer = new ArrayBuffer(binaryString.length);
  var uint8Array = new Uint8Array(arrayBuffer);
  for (var i = 0; i < binaryString.length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }

  // Create a Blob from the Uint8Array
  return new Blob([uint8Array], { type: 'image/png' }); // Adjust the type as needed
}



document.addEventListener('DOMContentLoaded', function () {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGainNode = audioCtx.createGain();
  masterGainNode.gain.value = 1;
  masterGainNode.connect(audioCtx.destination);
});

loadTracksButton.addEventListener('click', function () {
  const trackCount = parseInt(trackCountInput.value, 10);
  if (isNaN(trackCount) || trackCount < 1 || trackCount > 10) {
    alert('Please enter a valid number of tracks between 1 and 10.');
    return;
  }
  const confirmationMessage = `Do you want to load ${trackCount} track(s)?`;
  currentTrackCount = trackCount;
  totalTrackCount = trackCount;

  if (!window.confirm(confirmationMessage)) {
    return;
  }

  

  trackListContainer.innerHTML = '';
  wavesurfers.forEach((wavesurfer) => {
    if (!wavesurfer) {
      return;
    }
    wavesurfer.destroy();
  });
  wavesurfers = [];

  for (let i = 0; i < trackCount; i++) {
    const trackIndex = i + 1;
    createTrackContainer(trackIndex);
  }
});

function createTrackContainer(trackIndex) {
  const trackContainer = document.createElement('div');
  trackContainer.className = 'track-container';
  trackContainer.id = `track-${trackIndex}-container`;

  const trackFileNameElement = document.createElement('p');
  trackFileNameElement.id = `track-${trackIndex}-fileName`;

  const loadTrackButton = document.createElement('button');
  loadTrackButton.textContent = `Load Track ${trackIndex}`;
  loadTrackButton.addEventListener('click', function () {
    if (loadFlag[trackIndex - 1] === 1) {
      playButton.disabled = true;
      stopButton.disabled = false;
      removeTrack(trackIndex);
      fileInput.value = '';
    }
    document.getElementById(`track-${trackIndex}-file-selector`).click();
    loadFlag[trackIndex - 1] = 1;
  });

  const removeTrackButton = document.createElement('button');
  removeTrackButton.textContent = `Remove Track ${trackIndex}`;
  removeTrackButton.addEventListener('click', function () {
    removeTrack(trackIndex);
    fileInput.value = '';
    loadFlag[trackIndex - 1] = 0;
  });

  const recordButton = document.createElement('button');
  recordButton.textContent = `Record Track ${trackIndex}`;
  recordButton.addEventListener('click', function () {
    if (loadFlag[trackIndex - 1] === 1) {
    
      removeTrack(trackIndex);
      fileInput.value = '';
    }
    startRecording(trackIndex);
  });

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = `track-${trackIndex}-file-selector`;
  fileInput.accept = 'audio/*';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', function () {
    const fileNameElement = document.getElementById(`track-${trackIndex}-fileName`);
    const fileList = fileInput.files;
    if (fileList.length > 0) {
      const fileType = fileList[0].type;
      const fileName = fileList[0].name;

      fileNameElement.textContent = fileName;

      if (fileType.startsWith('audio/')) {
        createWaveSurfer(fileList[0], trackIndex);
      } else {
        alert(`Please select an audio file for Track ${trackIndex}.`);
        fileNameElement.textContent = '';
      }
    }
  });

  trackContainer.appendChild(fileInput);
  trackContainer.appendChild(trackFileNameElement);
  trackContainer.appendChild(loadTrackButton);
  trackContainer.appendChild(removeTrackButton);
  trackContainer.appendChild(recordButton);
  trackListContainer.appendChild(trackContainer);
}

function createWaveSurfer(file, trackIndex) {
  const reader = new FileReader();
  reader.onload = function (event) {
    const audioData = event.target.result;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audio = new Audio();
    const url = URL.createObjectURL(new Blob([audioData], { type: 'audio/wav' }))
    audio.src = url; //audioData;
    const mediaNode = audioCtx.createMediaElementSource(audio);
    //mediaNode.connect(audioCtx.destination);
    //var audioSource = audioCtx.createMediaElementSource(audio);
    //audioSource.connect(audioCtx.destination);
    //var blob = dataURLtoBlob(audioData);
    const wavesurferContainer = document.createElement('div');
    wavesurferContainer.id = `track-${trackIndex}-wavesurfer-container`;
    const trackContainer = document.getElementById(`track-${trackIndex}-container`);
    trackContainer.appendChild(wavesurferContainer);
    
    const cut = document.createElement('button');
    //elemento utilizzato per testare decodeAudioData
    cut.textContent= 'cut';
    cut.id=`track-${trackIndex}-cutButton`;
    trackContainer.appendChild(cut);
    cut.addEventListener('click', function () {
      audioCtx.decodeAudioData(audioData, function(buffer){
        if(buffer)
        console.log("ok");
  
      });
    });

    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = 0;
    volumeSlider.max = 1;
    volumeSlider.step = 0.01;
    volumeSlider.value = 0.5;
    volumeSlider.id = `track-${trackIndex}-volume`;

    volumeSlider.addEventListener('input', function (event) {
      const newVolumeValue = parseFloat(event.target.value);
      setVolume(wavesurfers[trackIndex - 1], newVolumeValue);
    });

    trackContainer.appendChild(volumeSlider);

    const wavesurfer = WaveSurfer.create({
      container: `#track-${trackIndex}-wavesurfer-container`,
      waveColor: 'blue',
      progressColor: 'purple',
      cursorWidth: 1,
      interact: true,
      media: audio,
    });
    /*  backend: 'WebAudio',
    });*/
    //wavesurfer.loadBlob(blob);
    //wavesurfer.loadBlob(new Blob([audioData]));
    //wavesurfer.load(audioCtx);

    wavesurfer.on('ready', function () {
      wavesurfers[trackIndex - 1] = wavesurfer;
    });

    wavesurfer.on('play', function () {
      playButton.disabled = true;
      stopButton.disabled = false;
    });

    wavesurfer.on('pause', function () {
      playButton.disabled = false;
      stopButton.disabled = true;
    });

    wavesurfer.on('finish', function () {
      playButton.disabled = false;
      stopButton.disabled = true;
    });

    wavesurfer.on('finish', function () {
      loadFlag[trackIndex - 1] = 1;
    });
  

    const eqBands = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]

// Create a biquad filter for each band
const filters = eqBands.map((band) => {
  const filter = audioCtx.createBiquadFilter()
  filter.type = band <= 32 ? 'lowshelf' : band >= 16000 ? 'highshelf' : 'peaking'
  filter.gain.value = Math.random() * 40 - 20
  filter.Q.value = 1 // resonance
  filter.frequency.value = band // the cut-off frequency
  return filter
})




// Connect the audio to the equalizer
audio.addEventListener(
  'canplay',
  () => {
    // Create a MediaElementSourceNode from the audio element
    //const mediaNode = audioCtx.createMediaElementSource(audio)

    // Connect the filters and media node sequentially
    const equalizer = filters.reduce((prev, curr) => {        //equalizer è assegnato a un array di filtri
      prev.connect(curr)                              //reduce applies a function to each element of the array, starting from medianode
      return curr
    }, mediaNode)

    // Connect the filters to the audio output
    equalizer.connect(audioCtx.destination)
  },
  { once: true },
)
// Create a vertical slider for each band
const container = document.createElement('p')
filters.forEach((filter) => {
  const slider = document.createElement('input')
  slider.type = 'range'
  slider.orient = 'vertical'
  slider.style.appearance = 'slider-vertical'
  slider.style.width = '8%'
  slider.min = -40
  slider.max = 40
  slider.value = filter.gain.value
  slider.step = 0.1
  slider.oninput = (e) => (filter.gain.value = e.target.value)
  container.appendChild(slider)
})
document.body.appendChild(container)



  
  };
  //reader.readAsDataURL(file);
  reader.readAsArrayBuffer(file);
}

function startRecording(trackIndex) {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then((stream) => {
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        createWaveSurfer(blob, trackIndex);
        loadFlag[trackIndex - 1] = 1;
        stopRecordingButton.remove();
      };

      mediaRecorder.start();
      mediaRecorders[trackIndex - 1] = mediaRecorder;

      const stopRecordingButton = document.createElement('button');
      stopRecordingButton.textContent = `Stop Recording`;
      stopRecordingButton.addEventListener('click', function () {
        stopRecording(trackIndex);
      });

      const trackContainer = document.getElementById(`track-${trackIndex}-container`);
      trackContainer.appendChild(stopRecordingButton);
    })
    .catch((error) => {
      console.error('Error accessing microphone:', error);
    });
}

function stopRecording(trackIndex) {
  const mediaRecorder = mediaRecorders[trackIndex - 1];

  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
}

playButton.addEventListener('click', function () {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (wavesurfers.length > 0) {
      if (paused) {
        
        wavesurfers.forEach(wavesurfer => {
          if (wavesurfer.isPlaying()) {
            wavesurfer.play();
          }
        });
        paused = false;
      } else {
        
        wavesurfers.forEach(wavesurfer => {
          if (wavesurfer) {
            wavesurfer.seekTo(0);
            wavesurfer.play();
          }
        });
      }
    }

    playButton.disabled = true;
    stopButton.disabled = false;
});

stopButton.addEventListener('click', function () {
    stop();
});

function setVolume(wavesurfer, volume) {
  if (wavesurfer) {
    wavesurfer.setVolume(volume);
  }
}


function stop() {
    wavesurfers.forEach(wavesurfer => {
      if(!wavesurfer)
      {
        return;
      }
      if (wavesurfer.isPlaying()) {
        wavesurfer.stop();
      }
    });
    paused = false;
    playButton.disabled = false;
    stopButton.disabled = true;
}

  function removeTrack(trackIndex) {
    const fileNameElement = document.getElementById(`track-${trackIndex}-fileName`);
    fileNameElement.textContent = '';
  
    const volumeSlider = document.getElementById(`track-${trackIndex}-volume`);
    if (volumeSlider) {
      volumeSlider.remove();
    }
  
    const wavesurferContainer = document.getElementById(`track-${trackIndex}-wavesurfer-container`);
    if (wavesurferContainer) {
      wavesurferContainer.innerHTML = '';
      wavesurferContainer.remove();
    }
  
    const wavesurfer = wavesurfers[trackIndex - 1];
    if (wavesurfer) {
      wavesurfer.destroy();
      wavesurfers[trackIndex - 1] = null;
    }
  
    playButton.disabled = false;
    stopButton.disabled = true;

    mediaRecorders[trackIndex - 1] = null;
  }



  addTracksButton.addEventListener('click', function () {
    const trackCountToAdd = parseInt(trackCountInput.value, 10);

    if (isNaN(trackCountToAdd) || trackCountToAdd < 1 || trackCountToAdd > 10) {
      alert('Please enter a valid number of tracks between 1 and 10.');
      return;
    }

    
    currentTrackCount = totalTrackCount;
    totalTrackCount = currentTrackCount + trackCountToAdd;

    if (totalTrackCount > 10) {
      alert('The total number of tracks cannot exceed 10.');
      return;
    }

    for (let i = 1; i <= trackCountToAdd; i++) {
      const trackIndex = currentTrackCount + i;
      const trackContainer = document.createElement('div');
      trackContainer.className = 'track-container';
      trackContainer.id = `track-${trackIndex}-container`;

      const trackFileNameElement = document.createElement('p');
      trackFileNameElement.id = `track-${trackIndex}-fileName`;
      const loadTrackButton = document.createElement('button');
      loadTrackButton.textContent = `Load Track ${trackIndex}`;
      loadTrackButton.addEventListener('click', function () {
        if (loadFlag[trackIndex - 1] === 1) {
          removeTrack(trackIndex);
          fileInput.value = '';
        }
        document.getElementById(`track-${trackIndex}-file-selector`).click();
        loadFlag[trackIndex - 1] = 1;
      });

      const removeTrackButton = document.createElement('button');
      removeTrackButton.textContent = `Remove Track ${trackIndex}`;
      removeTrackButton.addEventListener('click', function () {
        removeTrack(trackIndex);
        fileInput.value = '';
        loadFlag[trackIndex - 1] = 0;
      });

      const recordButton = document.createElement('button');
      recordButton.textContent = `Record Track ${trackIndex}`;
      recordButton.addEventListener('click', function () {
      startRecording(trackIndex);
      });

      

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = `track-${trackIndex}-file-selector`;
      fileInput.accept = 'audio/*';
      fileInput.style.display = 'none';
      fileInput.addEventListener('change', function () {
        const fileNameElement = document.getElementById(`track-${trackIndex}-fileName`);
        const fileList = fileInput.files;
        if (fileList.length > 0) {
          const fileType = fileList[0].type;
          const fileName = fileList[0].name;

          fileNameElement.textContent = fileName;

          if (fileType.startsWith('audio/')) {
            createWaveSurfer(fileList[0], trackIndex);
          } else {
            alert(`Please select an audio file for Track ${trackIndex}.`);
            fileNameElement.textContent = '';
          }
        }
      });

      trackContainer.appendChild(fileInput);
      trackContainer.appendChild(trackFileNameElement);
      trackContainer.appendChild(loadTrackButton);
      trackContainer.appendChild(removeTrackButton);
      trackContainer.appendChild(recordButton);
      trackListContainer.appendChild(trackContainer);
    }
    
  });
