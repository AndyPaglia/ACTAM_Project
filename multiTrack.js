//In  ultitrack.ts in initAudio add audioContext.connect eq node by extending the multitrack class
//Class multitrackEq extends multitrack, private initAudio(trackOptions) add the eq node and trackOptions eqNode?: datatypeofnode
/*const recordButton = document.createElement('button');
recordButton.textContent = `Record Track ${trackID}`;
recordButton.addEventListener('click', function () {
startRecording(trackID);*/

//to modify the url you can act by using offlineaudiocontext .startrendering or createmediastreamdestination from base audio context

let channelID = 0;


document.addEventListener('DOMContentLoaded', () => {
  const audioInput = document.getElementById('audio-input');
  const loadChannelButton = document.getElementById('channel-number');
  audioInput.addEventListener('change', handleFiles);
  function handleFiles(event) {
      const files = event.target.files;
      const reader = new FileReader();
      for (let file of files) {
        if (file) {
          const newUrl=URL.createObjectURL(file);
          console.log("File read");
          multitrack.addTrack({
            id:channelID,
            url: newUrl,
            startPosition: 0,
            draggable: true,
            envelope: true,
            options: {
              waveColor: 'hsl(25, 87%, 49%)',
              progressColor: 'hsl(25, 87%, 20%)',
            },
          });
        }
      }
  }
  loadChannelButton.addEventListener('change', selectChannel);
  function selectChannel(){
    console.log(loadChannelButton.value);
    const channelNum = parseInt(loadChannelButton.value, 10);
    if (isNaN(channelNum) || channelNum < 1 || channelNum > 10) {
      alert('Please enter a valid number of tracks between 1 and 10.');
      return;
    }
    const confirmationMessage = `Selected channel ${channelNum}`;
    channelID = channelNum;
    //totalTrackCount = trackCount;
  
    if (!window.confirm(confirmationMessage)) {
      return;
    }
  }
});


// Call Multitrack.create to initialize a multitrack mixer
// Pass a tracks array and WaveSurfer options with a container element
const multitrack = Multitrack.create(
  [
    {
      id: 0,
    },
    {
      id: 1,
      draggable: false,
      startPosition: 14, // start time relative to the entire multitrack
      url: '',
      envelope: [
        { time: 2, volume: 0.5 },
        { time: 10, volume: 0.8 },
        { time: 255, volume: 0.8 },
        { time: 264, volume: 0 },
      ],
      volume: 0.95,
      options: {
        waveColor: 'hsl(46, 87%, 49%)',
        progressColor: 'hsl(46, 87%, 20%)',
      },
      intro: {
        endTime: 16,
        label: 'Intro',
        color: '#FFE56E',
      },
      markers: [
        {
          time: 21,
          label: 'M1',
          color: 'hsla(600, 100%, 30%, 0.5)',
        },
        {
          time: 22.7,
          label: 'M2',
          color: 'hsla(400, 100%, 30%, 0.5)',
        },
        {
          time: 24,
          label: 'M3',
          color: 'hsla(200, 50%, 70%, 0.5)',
        },
        {
          time: 27,
          label: 'M4',
          color: 'hsla(200, 50%, 70%, 0.5)',
        },
      ],
      // peaks: [ [ 0, 0, 2.567, -2.454, 10.5645 ] ], // optional pre-generated peaks
    },
    {
      id: 2,
      draggable: true,
      startPosition: 1,
      startCue: 2.1,
      endCue: 20,
      fadeInEnd: 8,
      fadeOutStart: 14,
      envelope: true,
      volume: 0.8,
      options: {
        waveColor: 'hsl(161, 87%, 49%)',
        progressColor: 'hsl(161, 87%, 20%)',
      },
      url: '',
    },
    {
      id: 3,
      draggable: true,
      startPosition: 290,
      volume: 0.8,
      options: {
        waveColor: 'hsl(161, 87%, 49%)',
        progressColor: 'hsl(161, 87%, 20%)',
      },
      url: '',
    },
  ],
  {
    container: document.querySelector('#container'), // required!
    minPxPerSec: 10, // zoom level
    rightButtonDrag: false, // set to true to drag with right mouse button
    cursorWidth: 2,
    cursorColor: '#D72F21',
    trackBackground: '#2D2D2D',
    trackBorderColor: '#7C7C7C',
    dragBounds: true,
    envelopeOptions: {
      lineColor: 'rgba(255, 0, 0, 0.7)',
      lineWidth: 4,
      dragPointSize: window.innerWidth < 600 ? 20 : 10,
      dragPointFill: 'rgba(255, 255, 255, 0.8)',
      dragPointStroke: 'rgba(255, 255, 255, 0.3)',
    },
  },
)
// Events
multitrack.on('start-position-change', ({ id, startPosition }) => {
  console.log(`Track ${id} start position updated to ${startPosition}`)
})

multitrack.on('start-cue-change', ({ id, startCue }) => {
  console.log(`Track ${id} start cue updated to ${startCue}`)
})

multitrack.on('end-cue-change', ({ id, endCue }) => {
  console.log(`Track ${id} end cue updated to ${endCue}`)
})

multitrack.on('volume-change', ({ id, volume }) => {
  console.log(`Track ${id} volume updated to ${volume}`)
})

multitrack.on('fade-in-change', ({ id, fadeInEnd }) => {
  console.log(`Track ${id} fade-in updated to ${fadeInEnd}`)
})

multitrack.on('fade-out-change', ({ id, fadeOutStart }) => {
  console.log(`Track ${id} fade-out updated to ${fadeOutStart}`)
})

multitrack.on('intro-end-change', ({ id, endTime }) => {
  console.log(`Track ${id} intro end updated to ${endTime}`)
})

multitrack.on('envelope-points-change', ({ id, points }) => {
  console.log(`Track ${id} envelope points updated to`, points)
})

multitrack.on('drop', ({ id }) => {
  multitrack.addTrack({
    id,
    url: '/examples/audio/demo.wav',
    startPosition: 0,
    draggable: true,
    options: {
      waveColor: 'hsl(25, 87%, 49%)',
      progressColor: 'hsl(25, 87%, 20%)',
    },
  })
})

// Play/pause button
const button = document.querySelector('#play')
button.disabled = true
multitrack.once('canplay', () => {
  button.disabled = false
  button.onclick = () => {
    multitrack.isPlaying() ? multitrack.pause() : multitrack.play()
    button.textContent = multitrack.isPlaying() ? 'Pause' : 'Play'
  }
})

// Forward/back buttons
const forward = document.querySelector('#forward')
forward.onclick = () => {
  multitrack.setTime(multitrack.getCurrentTime() + 30)
}
const backward = document.querySelector('#backward')
backward.onclick = () => {
  multitrack.setTime(multitrack.getCurrentTime() - 30)
}

// Zoom
const slider = document.querySelector('input[type="range"]')
slider.oninput = () => {
  multitrack.zoom(slider.valueAsNumber)
}

// Destroy all wavesurfer instances on unmount
// This should be called before calling initMultiTrack again to properly clean up
window.onbeforeunload = () => {
  multitrack.destroy()
}


// Set sinkId
/*
multitrack.once('canplay', async () => {
  await multitrack.setSinkId('default');
  console.log('Set sinkId to default')
})*/
/*
function startRecording(trackID) {
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
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
        const audioURL = window.URL.createObjectURL(blob);
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

function stopRecording(trackID) {
  const mediaRecorder = mediaRecorders[trackIndex - 1];

  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
}
*/
/*
// Create an OfflineAudioContext
const sampleRate = 44100;
const length = sampleRate * 2; // 2 seconds
const offlineAudioContext = new OfflineAudioContext(2, length, sampleRate);

// Create an oscillator node (as an example source node)
const oscillator = offlineAudioContext.createOscillator();
oscillator.type = 'sine';
oscillator.frequency.setValueAtTime(440, offlineAudioContext.currentTime); // A4 note

// Create gain node (as an example effect node)
const gainNode = offlineAudioContext.createGain();
gainNode.gain.setValueAtTime(0.5, offlineAudioContext.currentTime);

// Connect the nodes
oscillator.connect(gainNode).connect(offlineAudioContext.destination);

// Start the oscillator
oscillator.start();
oscillator.stop(2); // Stop after 2 seconds

// Render the audio
offlineAudioContext.startRendering().then(renderedBuffer => {
    // Convert the renderedBuffer to a Blob
    const audioBlob = bufferToWaveBlob(renderedBuffer);

    // Create a URL from the Blob
    const audioUrl = URL.createObjectURL(audioBlob);

    // Create an audio element to play the audio
    const audioElement = document.createElement('audio');
    audioElement.src = audioUrl;
    audioElement.controls = true;
    document.body.appendChild(audioElement);

    // Log the URL to the console
    console.log(audioUrl);
});

// Function to convert an AudioBuffer to a Blob
function bufferToWaveBlob(buffer) {
    const numOfChan = buffer.numberOfChannels,
        length = buffer.length * numOfChan * 2 + 44,
        bufferData = new ArrayBuffer(length),
        view = new DataView(bufferData),
        channels = [],
        sampleRate = buffer.sampleRate;

    // Write the WAV container
    setUint32(0, 0x46464952); // "RIFF"
    setUint32(4, length - 8); // file length - 8
    setUint32(8, 0x45564157); // "WAVE"

    // Write the format chunk
    setUint32(12, 0x20746D66); // "fmt " chunk
    setUint32(16, 16); // length = 16
    setUint16(20, 1); // PCM (uncompressed)
    setUint16(22, numOfChan);
    setUint32(24, sampleRate);
    setUint32(28, sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(32, numOfChan * 2); // block-align
    setUint16(34, 16); // 16-bit (hardcoded in this demo)

    // Write the data chunk
    setUint32(36, 0x61746164); // "data" - chunk
    setUint32(40, length - 44); // data length

    // Write the PCM samples
    for (let i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
        for (let channel = 0; channel < numOfChan; channel++) {
            let sample = Math.max(-1, Math.min(1, channels[channel][i]));
            sample = (0.5 + sample < 0 ? sample * 0x8000 : sample * 0x7FFF) | 0;
            view.setInt16(offset, sample, true);
            offset += 2;
        }
    }

    // Create a Blob from the buffer
    return new Blob([bufferData], { type: 'audio/wav' });

    function setUint16(offset, data) {
        view.setUint16(offset, data, true);
    }

    function setUint32(offset, data) {
        view.setUint32(offset, data, true);
    }
}

Create an OfflineAudioContext: This context allows rendering audio without playing it.
Create and connect audio nodes: Set up your audio processing chain as usual.
Render the audio: Use startRendering to process the audio offline.
Convert the rendered buffer to a WAV Blob: The bufferToWaveBlob function takes an AudioBuffer and converts it to a WAV file format stored in a Blob.
Create a URL object from the Blob: This URL can be used for playback or other purposes.

*/