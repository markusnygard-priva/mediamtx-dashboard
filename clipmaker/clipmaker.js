// Clipmaker core logic
// Uses ffmpeg.wasm for in-browser video clipping

// ffmpeg.wasm UMD build exposes FFmpegWASM global
if (!window.FFmpegWASM) {
  alert('FFmpeg.wasm failed to load. Please check your internet connection or try reloading the page.');
  throw new Error('FFmpeg.wasm not loaded');
}
const { FFmpeg } = window.FFmpegWASM;
const ffmpeg = new FFmpeg();

const video = document.getElementById('video');

// Enable seeking by clicking the progress bar (if stream supports it)
video.addEventListener('click', function (e) {
  // Only allow seeking if video.duration is finite (not Infinity)
  if (!isFinite(video.duration) || video.duration === 0) {
    statusDiv.textContent = 'Seeking is not available for this live stream.';
    return;
  }
  // Calculate click position as a percentage of the video width
  const rect = video.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const percent = x / rect.width;
  video.currentTime = percent * video.duration;
});
const loadStreamBtn = document.getElementById('loadStream');
const fileInput = document.getElementById('fileInput');
const markInBtn = document.getElementById('markIn');
const markOutBtn = document.getElementById('markOut');
const exportClipBtn = document.getElementById('exportClip');
const inMarkSpan = document.getElementById('inMark');
const outMarkSpan = document.getElementById('outMark');
const statusDiv = document.getElementById('status');

let inMark = null;
let outMark = null;
let loadedFile = null;
let loadedStream = false;

function formatTime(t) {
  if (isNaN(t)) return '--:--';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function resetMarks() {
  inMark = null;
  outMark = null;
  inMarkSpan.textContent = 'In: --:--';
  outMarkSpan.textContent = 'Out: --:--';
  exportClipBtn.disabled = true;
}

loadStreamBtn.onclick = () => {
  const hlsUrl = 'http://192.168.8.23:8888/mystream/index.m3u8';
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = hlsUrl;
  } else if (window.Hls) {
    const hls = new Hls();
    hls.loadSource(hlsUrl);
    hls.attachMedia(video);
  } else {
    statusDiv.textContent = 'HLS not supported in this browser.';
    return;
  }
  loadedStream = true;
  loadedFile = null;
  resetMarks();
  statusDiv.textContent = 'Loaded mystream (HLS).';
};

fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  if (file) {
    video.src = URL.createObjectURL(file);
    loadedFile = file;
    loadedStream = false;
    resetMarks();
    statusDiv.textContent = `Loaded file: ${file.name}`;
  }
};

markInBtn.onclick = () => {
  inMark = video.currentTime;
  inMarkSpan.textContent = `In: ${formatTime(inMark)}`;
  if (outMark && outMark > inMark) exportClipBtn.disabled = false;
};

markOutBtn.onclick = () => {
  outMark = video.currentTime;
  outMarkSpan.textContent = `Out: ${formatTime(outMark)}`;
  if (inMark && outMark > inMark) exportClipBtn.disabled = false;
};

exportClipBtn.onclick = async () => {
  if (!loadedFile || inMark == null || outMark == null || outMark <= inMark) return;
  statusDiv.textContent = 'Loading ffmpeg.wasm...';
  if (!ffmpeg.loaded) await ffmpeg.load();
  statusDiv.textContent = 'Processing clip...';
  // Read file as Uint8Array
  const data = new Uint8Array(await loadedFile.arrayBuffer());
  await ffmpeg.writeFile('input.mp4', data);
  const duration = (outMark - inMark).toFixed(2);
  await ffmpeg.exec(['-ss', inMark.toFixed(2), '-i', 'input.mp4', '-t', duration, '-c', 'copy', 'output.mp4']);
  const out = await ffmpeg.readFile('output.mp4');
  const url = URL.createObjectURL(new Blob([out], { type: 'video/mp4' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'clip.mp4';
  a.click();
  statusDiv.textContent = 'Clip exported!';
};
