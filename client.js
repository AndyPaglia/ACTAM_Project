
let currentRoomID = null;
let channelID = 1;
let mediaRecorder;
let audioChunks = [];

document.addEventListener('DOMContentLoaded', () => {
    let socket; 
    socket = new WebSocket('ws://localhost:5505'); // Modifica l'URL con l'indirizzo del tuo server

    let URLS = [];
    let START_POSITIONS = [];
    let ENVELOPES = [];
    let JoinFlag = false;

    const currentRoomIDElement = document.getElementById('current-room-id');
    const joinRoomButton = document.getElementById('join-room-button');
    const chatSpace = document.getElementById('chat-container');
    const joinRoomInput = document.getElementById('join-room-input');
    const nicknameInput = document.getElementById('nickname-input');
    const sendMessageButton = document.getElementById('send-message-button');
    const messageInput = document.getElementById('message-input');
    const messageContainer = document.getElementById('message-container');
    const joinForm = document.getElementById('join-room-container');
    const leaveRoomButton = document.getElementById('leave-room-button');
    const deleteTrackButton = document.getElementById('delete-track-button');
    const multitrackColumn = document.getElementById('multitrack-column');
    const bottomButtons = document.getElementById('bottom-buttons');
    const closeShortcutPopup = document.getElementById('close-shortcut-popup');
    const shortcutPopup = document.getElementById('shortcut-popup');
    const exportButton = document.getElementById('export-button');

    document.getElementById('insert-track-button').addEventListener('click', function() {
        document.getElementById('audio-input').click(); // Simula un clic sull'elemento di input
    });
    
    const playButton = document.querySelector('#play');
    const forwardButton = document.querySelector('#forward');
    const backwardButton = document.querySelector('#backward');
    const zoomSlider = document.querySelector('input[type="range"]');

    const loadChannelButton = document.getElementById('channel-number');
    const recordButton = document.getElementById("Start Recording");
    const popupButton = document.getElementById("Effect");
    const audioInput = document.getElementById('audio-input');


    recordButton.addEventListener('click', toggleRecording);

    audioInput.addEventListener('change', handleFiles);
    loadChannelButton.addEventListener('change', selectChannel);
    deleteTrackButton.addEventListener('click', deleteTrack);

    exportButton.addEventListener('click', exportTracks);

    popupButton.addEventListener('click', openPopup);


  

    let tracks = {};

    // Shourtcuts

    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            const text = messageInput.value;
            if (text) {
                sendMessage('chat', { nickname: nicknameInput.value, roomID: currentRoomID, text });
                messageInput.value = '';
                displayMessage(nicknameInput.value, text);
            }
        }
    });
    

    joinRoomInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            const nickname = nicknameInput.value;
            const roomID = joinRoomInput.value;
            if (nickname && roomID) {
                sendMessage('joinRoom', { nickname, roomID });
            } else {
                alert('Please enter a nickname and a room ID');
            }
        }
    });

    let recordingTimeout;

    document.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'r') {
            recordingTimeout = setTimeout(() => {
                if (!isRecording) {
                    startRecording();
                    isRecording = true;
                    console.log('Recording started');
                }
            }, 1000); // Inizia a registrare dopo 1 secondo
        }
    
        if (event.key.toLowerCase() === 's' && isRecording) {
            stopRecording();
            isRecording = false;
            console.log('Recording stopped');
        }
    });
    
    document.addEventListener('keyup', (event) => {
        if (event.key.toLowerCase() === 'r') {
            clearTimeout(recordingTimeout);
        }
    });
    
    let holdStart = null;

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        event.preventDefault();
        if (multitrack.isPlaying()) {
            multitrack.pause();
            playButton.textContent = 'Play';
        } else {
            multitrack.play();
            playButton.textContent = 'Pause';
        }
    } else if (event.code === 'ArrowRight') {
        event.preventDefault();
        multitrack.setTime(multitrack.getCurrentTime() + 30);
    } else if (event.code === 'ArrowLeft') {
        event.preventDefault();
        multitrack.setTime(multitrack.getCurrentTime() - 30);
    } else if (event.key.toLowerCase() === 'p') {
        if (!holdStart) {
            holdStart = setTimeout(() => {
                shortcutPopup.style.display = 'block';
                holdStart = null; // Reset holdStart after triggering
            }, 1000); // 1 second
        }
    } else if (event.key.toLowerCase() === 'e') {
        if (!holdStart) {
            holdStart = setTimeout(() => {
                if(JoinFlag){
                    exportTracks();
                    holdStart = null; // Reset holdStart after triggering
                }
            }, 1000); // 1 second
        }
    }
});

document.addEventListener('keyup', (event) => {
    if ((event.key.toLowerCase() === 'p' || event.key.toLowerCase() === 'e') && holdStart) {
        clearTimeout(holdStart);
        holdStart = null;
    }
});

    closeShortcutPopup.addEventListener('click', () => {
        shortcutPopup.style.display = 'none';
    });
    

    // Recording Section

  let isRecording = false;
  function encodeWAV(audioBuffer) {
  let numberOfChannels = audioBuffer.numberOfChannels;
  let sampleRate = audioBuffer.sampleRate;
  let samples = audioBuffer.length * numberOfChannels;
  let bytesPerSample = 2; // 16-bit PCM
  let blockAlign = numberOfChannels * bytesPerSample;
  let byteRate = sampleRate * blockAlign;

  // Create a new ArrayBuffer for the WAV file
  let wavBuffer = new ArrayBuffer(44 + samples * bytesPerSample);
  let view = new DataView(wavBuffer);

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples * bytesPerSample, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 8 * bytesPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples * bytesPerSample, true);

  // Write PCM data
  let offset = 44;
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      let channelData = audioBuffer.getChannelData(i);
      for (let j = 0; j < channelData.length; j++) {
          view.setInt16(offset, channelData[j] * 0x7FFF, true);
          offset += 2;
      }
  }

  return wavBuffer;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function selectChannel(){
  console.log(loadChannelButton.value);
  const channelNum = parseInt(loadChannelButton.value, 10);
  if (isNaN(channelNum) || channelNum < 0 || channelNum > 10) {
    alert('Please enter a valid number of tracks between 0 and 10.');
    return;
  }
  const confirmationMessage = `Selected channel ${channelNum}`;
  channelID = channelNum;
  //totalTrackCount = trackCount;

  //if (!window.confirm(confirmationMessage)) {
    //return;
  //}
}
function startRecording() {
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = event => {
          if (event.data.size > 0) {
              audioChunks.push(event.data);
          }
      };

      mediaRecorder.onstop = async () => {
          // Combine audio chunks into a single Blob
          let audioBlob = new Blob(audioChunks, { type: 'audio/webm' }); // Changed type to 'audio/webm'
          audioChunks = []; // Clear the chunks array for the next recording

          // Convert Blob to ArrayBuffer
          let arrayBuffer = await audioBlob.arrayBuffer();
          let audioBuffer = new Uint8Array(arrayBuffer);

          // Process audioBuffer to extract actual PCM data
          let context = new AudioContext();
          let decodedData = await context.decodeAudioData(arrayBuffer);

          // Convert decoded PCM data to WAV format
          let wavBuffer = encodeWAV(decodedData);

          // Create final WAV file Blob
          let wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

          // Download the processed WAV file
          let url = URL.createObjectURL(wavBlob);
          let a = document.createElement('a');
          a.href = url;
          a.download = 'audio.wav';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      };
      mediaRecorder.start();
  }).catch(error => console.error('Error accessing microphone:', error)); 
}


function stopRecording(){
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
}


function toggleRecording() {
  if (isRecording) {
      stopRecording();
      recordButton.textContent = 'Start Recording';
  } else {
      startRecording();
      recordButton.textContent = 'Stop Recording';
  }
  isRecording = !isRecording;
}

// Multitrack Section

function openPopup() {
    var url = "popUp.html"; // Cambia con l'URL che vuoi aprire
    // Specifica il nome della finestra. Può essere una stringa vuota o un nome specifico.
    var nomeFinestra = "Effect";
    // Specifica le caratteristiche della finestra
    var caratteristiche = "width=600,height=400,left=100,top=100";
    // Apri la finestra di popup
    window.open(url, nomeFinestra, caratteristiche);
}

function handleFiles(event) {
    const files = event.target.files;
    const reader = new FileReader();
    for (let file of files) {
        if (file) {
            const newUrl = URL.createObjectURL(file);
            URLS[channelID] = newUrl;  // Assicurati di tenere traccia delle URL per ogni ID canale
            console.log("File read");

            // Aggiungi la traccia al multitrack
            multitrack.addTrack({
                id: channelID,
                url: newUrl,
                startPosition: 0,
                envelope: [],
                volume: 0.8,
                draggable: true,
                trackBackground: '#2D2D2D',
                trackBorderColor: '#7C7C7C',
                options: {
                    waveColor: 'hsl(25, 87%, 49%)',
                    progressColor: 'hsl(25, 87%, 20%)'
                }
            });
            sendTrackEvent({
                id: channelID,
                url: newUrl,
                startPosition: 0,
                envelope: [],
                volume: 0.8
            });
            START_POSITIONS[channelID] = 0;

        const input = document.getElementById('audio-input');
        if (input) {
            input.value = ''; // Resetta l'input del file
        }
        }
    }
}


const multitrack = Multitrack.create(
    [
      {
        id:1,
        draggable: true,
        url:'',
      },
      {
        id:2,
        draggable: true,
        url:'',
      },
      {
        id:3,
        draggable: true,
        url:'',
      },
      {
        id:4,
        draggable: true,
        url:'',
      },
      {
        id:5,
        draggable: true,
        url:'',
      },
      {
        id:6,
        draggable: true,
        url:'',
      },
      {
        id:7,
        draggable: true,
        url:'',
      },
      {
        id:8,
        draggable: true,
        url:'',
      },
      {
        id:9,
        draggable: true,
        url:'',
      },
      {
        id:10,
        draggable: true,
        url:'',
      }
    ],
    {
        container: document.querySelector('#container'), // required!
        minPxPerSec: 10, // zoom level
        rightButtonDrag: false, // set to true to drag with right mouse button
        cursorWidth: 2,
        cursorColor: '#D72F21',
        trackBackground: '#2D2D2D',
        trackBorderColor: '#7C7C7C',
        envelopeOptions: {
          lineColor: 'rgba(255, 0, 0, 0.7)',
          lineWidth: 4,
          dragPointSize: window.innerWidth < 600 ? 20 : 10,
          dragPointFill: 'rgba(255, 255, 255, 0.8)',
          dragPointStroke: 'rgba(255, 255, 255, 0.3)',
        }
    },
);

function deleteTrack() {
    if (confirm('Are you sure you want to delete the track?')) {
        delete URLS[channelID]; // Rimuovi l'URL dalla lista
        multitrack.addTrack({
            id: channelID,
            url: '',
            draggable: true,
            trackBackground: '#2D2D2D',
            trackBorderColor: '#7C7C7C',
            options: {
                waveColor: 'hsl(25, 87%, 49%)',
                progressColor: 'hsl(25, 87%, 20%)'
            }
        });
        sendTrackEvent({
            id: channelID,
            url: '',
        });

        const input = document.getElementById('audio-input');
        if (input) {
            input.value = ''; // Resetta l'input del file
        }
    }
}

    // Eventi del mixer

    playButton.disabled = true;
    multitrack.once('canplay', () => {
        playButton.disabled = false;
        playButton.onclick = () => {
            multitrack.isPlaying() ? multitrack.pause() : multitrack.play();
            playButton.textContent = multitrack.isPlaying() ? 'Pause' : 'Play';
        };
    });

    forwardButton.onclick = () => {
        multitrack.setTime(multitrack.getCurrentTime() + 30);
    };

    backwardButton.onclick = () => {
        multitrack.setTime(multitrack.getCurrentTime() - 30);
    };

    zoomSlider.oninput = () => {
        multitrack.zoom(zoomSlider.valueAsNumber);
    };

   

        socket.onopen = () => {
            console.log('Connected to the server');
        };

        socket.onmessage = (event) => {
            try{
                var message = JSON.parse(event.data);
            }catch(e){
                console.error('Error parsing message:', e);
            }
            console.log('Received message:', message); // Debug log
            handleMessage(message);
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            displayErrorMessage('Connection error. Please try again later.');
        };

        socket.onclose = () => {
            console.log('Disconnected from the server');
            displayErrorMessage('Disconnected from server.');
        };
    

        function handleMessage(message) {
            console.log('Handling message:', message); // Debug log
            if (message.type === 'roomID') {
                currentRoomID = message.roomID;
                currentRoomIDElement.textContent = currentRoomID;
                chatSpace.style.display = 'block';
                joinForm.style.display = 'none';
                displayInfoMessage(`You joined room ${currentRoomID}`);
                JoinFlag = true;
                showElements();
            } else if (message.type === 'history') {
                const messages = message.messages || [];
                messages.forEach(msg => {
                    if (msg.type === 'chat') {
                        displayMessage(msg.nickname, msg.text);
                    } else if (msg.type === 'info') {
                        displayInfoMessage(msg.text);
                    } else if (msg.type === 'track') {
                        handleTrackEvent(msg.event);
                    }
                });
            } else if (message.type === 'chat') {
                displayMessage(message.nickname, message.text);
            } else if (message.type === 'info') {
                displayInfoMessage(message.text);
            } else if (message.type === 'error') {
                displayErrorMessage(message.text);
            } else if (message.type === 'track') {
                handleTrackEvent(message.event);
            } else {
                console.log('Unknown message type:', message.type);
            }
        }

        function sendMessage(type, data) {
            const message = JSON.stringify({ type, ...data });
            console.log('Sending message:', message); // Debug log
            socket.send(message);
        }
    
        function sendTrackEvent(event) {
            if (currentRoomID) {
                const nickname = nicknameInput.value;
                sendMessage('track', { roomID: currentRoomID, nickname, event });
            }
        }

        function showElements() {
            multitrackColumn.style.display = 'block';
            bottomButtons.style.display = 'block';
        }
    
        
        function hideElements() {
            multitrackColumn.style.display = 'none';
            bottomButtons.style.display = 'none';
        }

    joinRoomButton.addEventListener('click', (event) => {
        const nickname = nicknameInput.value;
        const roomID = joinRoomInput.value;
        if (nickname && roomID ) {
            sendMessage('joinRoom', { nickname, roomID });
        } else {
            alert('Please enter a nickname and a room ID');
        }
    });

    leaveRoomButton.addEventListener('click', () => {
        if (currentRoomID) {
            sendMessage('leaveRoom', { roomID: currentRoomID, nickname: nicknameInput.value });
            currentRoomID = null;
            chatSpace.style.display = 'none';
            joinForm.style.display = 'block';
            currentRoomIDElement.textContent = '';
            clearMessages();
            hideElements();
            JoinFlag = false;
        }
    });

   

    sendMessageButton.addEventListener('click', () => {
        const text = messageInput.value;
        if (text) {
            sendMessage('chat', { nickname: nicknameInput.value, roomID: currentRoomID, text });
            messageInput.value = '';
            displayMessage(nicknameInput.value, text);
        }
    });

    function displayMessage(nickname, text) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message';

        const nicknameElement = document.createElement('span');
        nicknameElement.className = 'nickname';
        nicknameElement.textContent = nickname;

        if (nickname === nicknameInput.value) {
            nicknameElement.classList.add('self');
        } else {
            nicknameElement.classList.add('other');
        }

        messageElement.appendChild(nicknameElement);
        messageElement.appendChild(document.createTextNode(`: ${text}`));
        messageContainer.appendChild(messageElement);
    }

    function displayInfoMessage(text) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message system';
        messageElement.textContent = text;
        messageContainer.appendChild(messageElement);
    }

    function displayErrorMessage(text) {
        alert(text);
    }

    function clearMessages() {
        messageContainer.innerHTML = '';
    }

    function handleTrackEvent(event) {
        console.log('Handling track event:', event); // Debug log
        if (event) {
            URLS[event.id] = event.url;
            multitrack.addTrack({
                id: event.id,
                url: event.url,
                startPosition: event.startPosition,
                envelope: event.envelope,
                draggable: true,
                trackBackground: '#2D2D2D',
                trackBorderColor: '#7C7C7C',
                options: {
                    waveColor: 'hsl(25, 87%, 49%)',
                    progressColor: 'hsl(25, 87%, 20%)',
                },
            });
            START_POSITIONS[event.id] = event.startPosition;
        } else {
            console.log('Unknown track event: error');
        }
    }
    
    // Eventi del mixer
   
    multitrack.on('drop', ({ id }) => {
        addEventListener('drop', (event) => {
            event.preventDefault();
            const files = event.dataTransfer.files;
            const reader = new FileReader();

            for (let file of files) {
                if (file) {
                    const newUrl = URL.createObjectURL(file);
                    console.log("File dropped and read");
                    URLS[channelID] = newUrl;

                    // Incrementa il contatore per ogni nuova traccia

                    multitrack.addTrack({
                        id: channelID, // Assicurati di avere un valore valido per id
                        url: newUrl,
                        startPosition: 0,
                        volume: 0.8,
                        envelope: [],
                        trackBackground: '#2D2D2D',
                        trackBorderColor: '#7C7C7C',
                        draggable: true,
                        options: {
                            waveColor: 'hsl(25, 87%, 49%)',
                            progressColor: 'hsl(25, 87%, 20%)',
                        },

                        
                    });

                    START_POSITIONS[channelID]= 0;

                    sendTrackEvent({
                        id: channelID, // Assicurati di avere un valore valido per id
                        url: newUrl,
                        startPosition: 0,
                        envelope: [],
                        volume: 0.8,
                    });
                }
            }
        });
    });

    multitrack.on('start-position-change', ({ id, startPosition }) => {
        console.log(`Track ${id} start position updated to ${startPosition}`)
        START_POSITIONS[id] = startPosition;
      })

      multitrack.on('envelope-points-change', ({ id, points }) => {
        console.log(`Track ${id} envelope points updated to`, points)
        ENVELOPES[id] = points;
      })

    window.onbeforeunload = () => {
        multitrack.destroy();
    };

    // Export Section
    async function exportTracks() {
        const sampleRate = 48000; // Sample rate for the output audio
        const channels = 2; // Stereo output
    
        let maxDuration = 0;
        const audioBuffers = [];
        const audioContext = new AudioContext();
    
        for (let channelID = 1; channelID <= 10; channelID++) {
            if (URLS[channelID]) {
                const response = await fetch(URLS[channelID]);
                const arrayBuffer = await response.arrayBuffer();
                let audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
                // Verifica se la frequenza di campionamento è diversa
                if (audioBuffer.sampleRate !== sampleRate) {
                    audioBuffer = await resampleAudioBuffer(audioBuffer, sampleRate);
                }
    
                const startPosition = (START_POSITIONS[channelID] || 0); // Assume 0 if not defined
                const totalDuration = startPosition + audioBuffer.duration;
                if (totalDuration > maxDuration) {
                    maxDuration = totalDuration;
                }
                audioBuffers[channelID] = { buffer: audioBuffer, startPosition: startPosition };
            }
        }
    
        // Creare il contesto con la durata massima trovata
        const context = new OfflineAudioContext(channels, sampleRate * maxDuration, sampleRate);
    
        audioBuffers.forEach((track, trackID) => {
            if (track) {
                const source = context.createBufferSource();
                source.buffer = track.buffer;
    
                // Creare un GainNode per gestire l'envelope
                const gainNode = context.createGain();

                gainNode.gain.setValueAtTime(0, 0);
    
                // Impostare i punti dell'envelope
                const envelope = ENVELOPES[trackID];
                if (envelope && envelope.length > 0) {
                    // Imposta il valore iniziale del gain
                    gainNode.gain.linearRampToValueAtTime(envelope[0].volume, track.startPosition + envelope[0].time);
    
                    // Crea rampe lineari tra ogni coppia di punti successivi
                    for (let i = 1; i < envelope.length; i++) {
                        const currentPoint = envelope[i];
                        gainNode.gain.linearRampToValueAtTime(currentPoint.volume, track.startPosition + currentPoint.time);
                    }
                }
    
                // Collegare il GainNode alla destinazione
                source.connect(gainNode);
                gainNode.connect(context.destination);
    
                source.start(track.startPosition);
            }
        });
    
        // Render the mixed audio
        const renderedBuffer = await context.startRendering();
    
        // Convert the rendered buffer to a WAV file
        const wavBlob = encodeWAV(renderedBuffer);
    
        // Create a download link for the WAV file
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mixed-audio.wav';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    async function resampleAudioBuffer(audioBuffer, targetSampleRate) {
        const offlineContext = new OfflineAudioContext(audioBuffer.numberOfChannels, (audioBuffer.duration * targetSampleRate), targetSampleRate);
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start(0);
        return await offlineContext.startRendering();
    }
    
    function encodeWAV(abuffer) {
        const numOfChan = abuffer.numberOfChannels;
        const length = abuffer.length;
        const sampleRate = abuffer.sampleRate;
        const buffer = new ArrayBuffer(44 + length * numOfChan * 2); // Il buffer deve essere lungo il file +44
        const view = new DataView(buffer);
        const channels = [];
        let offset = 0;
        let pos = 0;
    
        // Scrivi l'intestazione WAV
        function writeString(view, offset, str) {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i));
            }
        }
    
        // Chunk RIFF
        writeString(view, pos, 'RIFF');
        view.setUint32(pos + 4, 36 + length * numOfChan * 2, true); // Lunghezza del file - 8 (per la firma RIFF)
        writeString(view, pos + 8, 'WAVE');
        // Chunk fmt
        writeString(view, pos + 12, 'fmt ');
        view.setUint32(pos + 16, 16, true); // Lunghezza del chunk fmt
        view.setUint16(pos + 20, 1, true); // Formato PCM (senza compressione)
        view.setUint16(pos + 22, numOfChan, true); // Numero di canali
        view.setUint32(pos + 24, sampleRate, true); // Frequenza di campionamento
        view.setUint32(pos + 28, sampleRate * 2 * numOfChan, true); // Avg bytes/sec
        view.setUint16(pos + 32, numOfChan * 2, true); // Block-align
        view.setUint16(pos + 34, 16, true); // Bit per campione
    
        // Chunk data
        writeString(view, pos + 36, 'data');
        view.setUint32(pos + 40, length * numOfChan * 2, true); // Lunghezza del chunk data
    
        // Scrivi i dati audio nel buffer
        for (let i = 0; i < numOfChan; i++) {
            channels.push(abuffer.getChannelData(i));
        }
    
        for (let i = 0; i < length; i++) {
            for (let j = 0; j < numOfChan; j++) {
                // Scrivi i campioni a 16 bit
                let sample = Math.max(-1, Math.min(1, channels[j][i]));
                sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(pos + 44 + i * numOfChan * 2 + j * 2, sample, true);
            }
        }
    
        return new Blob([buffer], { type: 'audio/wav' });
    }
    
});