const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const loading = document.getElementById('loading');
const detectedCount = document.getElementById('detected-count');

let lastSpokenObjects = new Set();
let debounceSpeech = false;

async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }, // Use 'environment' for back camera
        });
        video.srcObject = stream;
        return new Promise((resolve) => {
            video.onloadedmetadata = () => resolve(video);
        });
    } catch (error) {
        alert('Camera access denied: ' + error.message);
        console.error(error);
    }
}

async function loadModelAndDetect() {
    const model = await cocoSsd.load();
    console.log('COCO-SSD model loaded.');
    loading.style.display = 'none';

    detectObjects(video, model);
}

function detectObjects(video, model) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    async function detect() {
        const predictions = await model.detect(video);
        renderPredictions(predictions);
        debounceSpeechSynthesis(predictions);
        requestAnimationFrame(detect);
    }
    detect();
}

function renderPredictions(predictions) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    predictions.forEach((prediction) => {
        const [x, y, width, height] = prediction.bbox;
        const text = `${prediction.class} (${(prediction.score * 100).toFixed(1)}%)`;

        // Draw bounding box
        ctx.strokeStyle = '#e63946';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        // Draw label background
        ctx.fillStyle = '#e63946';
        ctx.fillRect(x, y - 20, ctx.measureText(text).width + 10, 20);

        // Draw label text
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.fillText(text, x + 5, y - 5);
    });

    // Update detected count
    detectedCount.textContent = predictions.length;
}

function debounceSpeechSynthesis(predictions) {
    if (debounceSpeech) return;

    const currentObjects = new Set(predictions.map((p) => p.class));
    const newObjects = Array.from(currentObjects).filter((obj) => !lastSpokenObjects.has(obj));

    if (newObjects.length > 0) {
        speakText(`I see ${newObjects.join(', ')}.`);
        lastSpokenObjects = currentObjects;
        debounceSpeech = true;

        setTimeout(() => {
            debounceSpeech = false;
        }, 2000); // Speak every 2 seconds at most
    }
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1; // Adjust speaking rate
        utterance.pitch = 1; // Adjust pitch
        utterance.volume = 1; // Adjust volume
        speechSynthesis.speak(utterance);
    } else {
        console.warn('Speech Synthesis not supported in this browser.');
    }
}

async function startApp() {
    await setupCamera();
    video.play();
    loadModelAndDetect();
}

startApp();