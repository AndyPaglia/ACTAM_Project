document.addEventListener('DOMContentLoaded', () => {
  let newUrl;
  let gainValues = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  let threshold=-5;
  let ratio=2;
  let attackCompr=0.05;
  let volume=1;
  let pan=0;

  function handleFiles(event) {
    const files = event.target.files;
    const reader = new FileReader();
    for (let file of files) {
      if (file) {
        newUrl = URL.createObjectURL(file);
        console.log("File read");
        const audio = new Audio();
        audio.controls = true;
        audio.src = newUrl;
        document.getElementById('audio-new').style.display = "none";
        document.getElementById('info').style.display = "none";
        document.getElementById('renderButton').style.display = "block";
        const wavesurfer = WaveSurfer.create({
          container: document.body,
          waveColor: 'rgb(200, 0, 200)',
          progressColor: 'rgb(100, 0, 100)',
          media: audio,
        });
        document.body.appendChild(audio);

        const audioContext = new AudioContext();
        const eqBands = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        const filters = eqBands.map((band) => {
          const filter = audioContext.createBiquadFilter();
          filter.type = band <= 32 ? 'lowshelf' : band >= 16000 ? 'highshelf' : 'peaking';
          filter.gain.value = Math.random() * 40 - 20;
          filter.Q.value = 1;
          filter.frequency.value = band;
          return filter;
        });
        const compressor = audioContext.createDynamicsCompressor();
        const gain = audioContext.createGain();
        const panner = audioContext.createStereoPanner();
        compressor.attack.value = 0.05;
        compressor.threshold.value = -5;
        compressor.ratio.value = 2;
        gain.gain.value = 1;
        panner.pan.value = 0;
        audio.addEventListener('canplay', () => {
          const mediaNode = audioContext.createMediaElementSource(audio);
          const equalizer = filters.reduce((prev, curr) => {
            prev.connect(curr);
            return curr;
          }, mediaNode);
          equalizer.connect(compressor);
          compressor.connect(panner);
          panner.connect(gain);
          gain.connect(audioContext.destination);
        }, { once: true });

        const controlPanel = document.getElementById('controlPanel');
        controlPanel.innerHTML = ''; // Clear previous controls

        const addControl = (labelText, inputAttributes, onChange) => {
          const control = document.createElement('div');
          control.className = 'control';
          const label = document.createElement('label');
          label.textContent = labelText;
          const input = document.createElement('input');
          Object.entries(inputAttributes).forEach(([key, value]) => input.setAttribute(key, value));
          input.oninput = onChange;
          control.appendChild(label);
          control.appendChild(input);
          controlPanel.appendChild(control);
        };

        filters.forEach((filter, index) => {
          addControl(`Band ${eqBands[index]} Hz`, {
            type: 'range',
            min: -40,
            max: 40,
            value: filter.gain.value,
            step: 0.1,
          }, (e) => {
            filter.gain.value = e.target.value;
            gainValues[index] = e.target.value;
          });
        });

        addControl('Ratio', {
          type: 'range',
          min: 1,
          max: 20,
          value: compressor.ratio.value,
          step: 0.1,
        }, (e) => {
          compressor.ratio.value = e.target.value;
          ratio = e.target.value;
        });

        addControl('Threshold', {
          type: 'range',
          min: -100,
          max: 0,
          value: compressor.threshold.value,
          step: 0.5,
        }, (e) => {
          compressor.threshold.value = e.target.value;
          threshold = e.target.value;
        });

        addControl('Attack', {
          type: 'range',
          min: 0,
          max: 1,
          value: compressor.attack.value,
          step: 0.02,
        }, (e) => {
          compressor.attack.value = e.target.value;
          attackCompr = e.target.value;
        });

        addControl('Volume', {
          type: 'range',
          min: 0,
          max: 2,
          value: gain.gain.value,
          step: 0.02,
        }, (e) => {
          gain.gain.value = e.target.value;
          volume = e.target.value;
        });

        addControl('Pan', {
          type: 'range',
          min: -1,
          max: 1,
          value: panner.pan.value,
          step: 0.01,
        }, (e) => {
          panner.pan.value = e.target.value;
          pan = e.target.value;
        });
      }
    }
  }

  function bufferToWave(abuffer, len) {
    const numOfChan = abuffer.numberOfChannels;
    const length = len * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let offset = 0;
    let pos = 0;

    function writeString(view, offset, str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    writeString(view, pos, 'RIFF');
    view.setUint32(pos + 4, 36 + len * 2, true);
    writeString(view, pos + 8, 'WAVE');
    writeString(view, pos + 12, 'fmt ');
    view.setUint32(pos + 16, 16, true);
    view.setUint16(pos + 20, 1, true);
    view.setUint16(pos + 22, numOfChan, true);
    view.setUint32(pos + 24, abuffer.sampleRate, true);
    view.setUint32(pos + 28, abuffer.sampleRate * 2 * numOfChan, true);
    view.setUint16(pos + 32, numOfChan * 2, true);
    view.setUint16(pos + 34, 16, true);
    writeString(view, pos + 36, 'data');
    view.setUint32(pos + 40, len * 2, true);

    for (let i = 0; i < numOfChan; i++) {
      channels.push(abuffer.getChannelData(i));
    }

    for (let i = 0; i < len; i++) {
      for (let j = 0; j < numOfChan; j++) {
        let sample = Math.max(-1, Math.min(1, channels[j][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos + 44 + i * numOfChan * 2 + j * 2, sample, true);
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  async function generateProcessedWav(audioBuffer) {
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    const eqBands = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    const filter1 = offlineContext.createBiquadFilter();
    filter1.type = 'lowshelf';
    filter1.gain.value = gainValues[0];
    filter1.Q.value = 1;
    filter1.frequency.value = eqBands[0];
    const filter2 = offlineContext.createBiquadFilter();
    filter2.type = 'peaking';
    filter2.gain.value = gainValues[1];
    filter2.Q.value = 1;
    filter2.frequency.value = eqBands[1];
    const filter3 = offlineContext.createBiquadFilter();
    filter3.type = 'peaking';
    filter3.gain.value = gainValues[2];
    filter3.Q.value = 1;
    filter3.frequency.value = eqBands[2];
    const filter4 = offlineContext.createBiquadFilter();
    filter4.type = 'peaking';
    filter4.gain.value = gainValues[3];
    filter4.Q.value = 1;
    filter4.frequency.value = eqBands[3];
    const filter5 = offlineContext.createBiquadFilter();
    filter5.type = 'peaking';
    filter5.gain.value = gainValues[4];
    filter5.Q.value = 1;
    filter5.frequency.value = eqBands[4];
    const filter6 = offlineContext.createBiquadFilter();
    filter6.type = 'peaking';
    filter6.gain.value = gainValues[5];
    filter6.Q.value = 1;
    filter6.frequency.value = eqBands[5];
    const filter7 = offlineContext.createBiquadFilter();
    filter7.type = 'peaking';
    filter7.gain.value = gainValues[6];
    filter7.Q.value = 1;
    filter7.frequency.value = eqBands[6];
    const filter8 = offlineContext.createBiquadFilter();
    filter8.type = 'peaking';
    filter8.gain.value = gainValues[7];
    filter8.Q.value = 1;
    filter8.frequency.value = eqBands[7];
    const filter9 = offlineContext.createBiquadFilter();
    filter9.type = 'peaking';
    filter9.gain.value = gainValues[8];
    filter9.Q.value = 1;
    filter9.frequency.value = eqBands[8];
    const filter10 = offlineContext.createBiquadFilter();
    filter10.type = 'highshelf';
    filter10.gain.value = gainValues[9];
    filter10.Q.value = 1;
    filter10.frequency.value = eqBands[9];
    const compressorRender = offlineContext.createDynamicsCompressor();
    const gainRender = offlineContext.createGain();
    const pannerRender = offlineContext.createStereoPanner();
    compressorRender.ratio.value = ratio;
    compressorRender.threshold.value = threshold;
    compressorRender.attack.value = attackCompr;
    gainRender.gain.value = volume;
    pannerRender.pan.value = pan;
    source.connect(filter1);
    filter1.connect(filter2);
    filter2.connect(filter3);
    filter3.connect(filter4);
    filter4.connect(filter5);
    filter5.connect(filter6);
    filter6.connect(filter7);
    filter7.connect(filter8);
    filter8.connect(filter9);
    filter9.connect(filter10);
    filter10.connect(compressorRender);
    compressorRender.connect(gainRender);
    gainRender.connect(pannerRender);
    pannerRender.connect(offlineContext.destination);
    source.start(0);
    const renderedBuffer = await offlineContext.startRendering();
    const wavBlob = bufferToWave(renderedBuffer, renderedBuffer.length);
    return wavBlob;
  }

  async function onRenderButtonClick() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await fetch(newUrl)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer));

    const wavBlob = await generateProcessedWav(audioBuffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'processed-audio.wav';
    document.body.appendChild(a);
    a.click();
  }

  const notify = document.getElementById('info');
  const audioNew = document.getElementById('audio-new');
  audioNew.addEventListener('change', handleFiles);
  const renderNew = document.getElementById('renderButton');
  renderNew.style.display = "none";
  renderNew.addEventListener('click', onRenderButtonClick);
});