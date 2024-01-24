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
    const wavesurferContainer = document.createElement('div');
    wavesurferContainer.id = `track-${trackIndex}-wavesurfer-container`;
    const trackContainer = document.getElementById(`track-${trackIndex}-container`);
    trackContainer.appendChild(wavesurferContainer);

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
      backend: 'WebAudio',
    });

    wavesurfer.loadBlob(new Blob([audioData]));

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
  
  
  };
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
