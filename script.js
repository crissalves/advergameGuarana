// --- Elementos do Jogo ---
const startButton = document.getElementById('startButton');
const liquido = document.getElementById('liquido');
const volumeDisplay = document.getElementById('volumeDisplay');
const gameView = document.getElementById('game-view');
const winView = document.getElementById('resultado');

// --- Variáveis de Controlo ---
let audioContext;
let analyser;
let microphone;
let gameLoopId;
let dataArray;
let lastTime = 0;
let gameHasEnded = false;
let somVitoriaBuffer = null;

// --- WEB AUDIO API: PRÉ-CARREGAMENTO DO SOM ---
const globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();

async function setupSom() {
    try {
        const response = await fetch('sound/som-vitoria.mp3'); // Caminho corrigido
        const arrayBuffer = await response.arrayBuffer();
        somVitoriaBuffer = await globalAudioContext.decodeAudioData(arrayBuffer);
        console.log("Som de vitória pré-carregado!");
    } catch (err) {
        console.error("Erro ao carregar o som:", err);
    }
}
setupSom();


// --- Iniciar Jogo ---
startButton.addEventListener('click', () => {
    if (globalAudioContext.state === 'suspended') {
        globalAudioContext.resume();
    }

    startButton.style.display = 'none';
    setupMicrofone();
});

async function setupMicrofone() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('O seu navegador não suporta a API de áudio.');
        startButton.style.display = 'block';
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = globalAudioContext;
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        lastTime = performance.now();
        gameLoop();
    } catch (err) {
        console.error("Erro ao aceder ao microfone:", err);
        alert('Precisa de permitir o uso do microfone para jogar!');
        startButton.style.display = 'block';
    }
}

// --- Fim do Jogo ---
function endGame() {
    gameHasEnded = true;
    cancelAnimationFrame(gameLoopId);

    if (microphone) microphone.disconnect();

    if (somVitoriaBuffer) {
        const source = globalAudioContext.createBufferSource();
        source.buffer = somVitoriaBuffer;
        source.connect(globalAudioContext.destination);
        source.start(0);
    }

    gameView.classList.remove('visible');
    gameView.classList.add('hidden');
    
    setTimeout(() => {
        winView.classList.remove('hidden');
        winView.classList.add('visible');
    }, 400);
}

// --- Loop Principal do Jogo ---
function gameLoop(currentTime) {
    if (gameHasEnded) return;
    gameLoopId = requestAnimationFrame(gameLoop);
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    analyser.getByteFrequencyData(dataArray);
    let soma = 0;
    for (let i = 0; i < dataArray.length; i += 8) {
        soma += dataArray[i];
    }
    const volumeMedio = soma / (dataArray.length / 8);
    volumeDisplay.textContent = Math.round(volumeMedio);
    const LIMITE_GRITO = 45;
    let alturaAtual = parseFloat(liquido.style.height) || 0;
    const VELOCIDADE_ENCHER = 25;
    const VELOCIDADE_ESVAZIAR = 10;
    if (volumeMedio > LIMITE_GRITO) {
        alturaAtual += VELOCIDADE_ENCHER * deltaTime;
    } else {
        alturaAtual -= VELOCIDADE_ESVAZIAR * deltaTime;
    }
    if (alturaAtual < 0) alturaAtual = 0;
    if (alturaAtual > 100) alturaAtual = 100;
    liquido.style.height = alturaAtual + '%';
    if (alturaAtual >= 100 && !gameHasEnded) {
        endGame();
    }
}