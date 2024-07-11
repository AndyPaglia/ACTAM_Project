# Web DAW for manipulation of audios
The project we implemented consists on a WEB page able to deal with audio files, where the audio files could be files uploaded from the user or could be recording of real time sounds obtained using the computer's microphone. The user can upload multiple tracks since the project is built to support multi-track uploading.
The audio files waveforms are then visualized in a container with horizontal control, so the file can be moved left or right in the space deliberately to change the order of execution while listening. The first feature we can use on the tracks is the volume control. This is handled through an envelope that can be built directly in the track, at the user's convenience. 
The WEB page gives various possibility to the user: 
1) play/Forward 30s/Back 30s: the track can be played and moved in time.
2) Select audio file: an audio file can be selected and then uploaded in the WEB page.
3) Start recording: the user can record a sound file directly from the device they're using.
4) Modify the audio file: if clicked, it opens a different window where the user can modify, using different effects, the track uploaded.

The window opened by the "Modify the audo file", gives the possibility to upload a track and modify it by using different effects on it.
The effects implemented in this project are: the compressor, the equalizer, the gain control and the panning. 
Once the track has been modified, the user can use the render button to render the new track and save it in the computer, so that we can re-upload the new version in the track container of the main WEB page.

Another feature managed by the project, is the possibility to have a multi-user experience. 
Multiple users can log on the same workspace, by specifying the name of the project they want to enter in, and modify together the project. The communication between users is secured by a message box present in the user interface, where it can be written a text and is certain that it will be sent to the right workspace, since the users are on a specific and "private" workspace.

This project is useful because gives an easy interface to work with audio files. It can be seen as the starting point to understand which are the functionalities of certain effects when superimposed to a track and understand the concept of ordering sound files in time to create a fluid output.

To sum up, the code implemented is a Javascript application that integrates with the WEB Audio API and the Wavesurfer library to create a multi-track audio mixer with recording capabilities. 
Wavesurfer.js is an open-source audio visualization library for creating interactive, customizable waveforms that gives easy way to work with audio files.
The Web Audio API provides a powerful and versatile system for controlling audio on the Web, allowing developers to choose audio sources, add effects to audio, create audio visualizations, apply spatial effects and many other functionalities.

We encountered some problems during the implementation of the code:
1) WaveSurfer.js is a library that has many limitations: limited file format support, performance, complexity in integrating it with other parts of a web application, also the documentation, even though is decent, find some gaps in information. To compensate the WaveSurfer's limitations we integrated Web Audio API to lighten the computation.

2) Calling asynchronous functions (like DecodeAudioData). This caused many problems in the buffer managing. The primary purpose of DecodeAudioData, for example, is to asynchronously decode audio file data, such as MP3 or WAV,  into a form that can be played back or manipulated using other Web Audio API features.

3) Managing the high number of messages from the server to the client. To adjust this problem, we used only functions able to work with high number of messages.
