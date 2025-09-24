// Elementos do DOM
const startButton = document.getElementById('startButton');
const liquido = document.getElementById('liquido');
const volumeDisplay = document.getElementById('volumeDisplay');
const gameView = document.getElementById('game-view');
const winView = document.getElementById('resultado');

// Variáveis de Controlo do Jogo
let audioContext;
let analyser;
let microphone;
let gameLoopId;
let dataArray;
let lastTime = 0;
let gameHasEnded = false;
let somVitoriaBuffer = null;

// --- Web Audio API: Pré-carregamento do som para performance ---
const globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();

// Esta função busca e descodifica o ficheiro de áudio assim que a página carrega.
// Isto evita o "soluço" na hora da vitória.
async function setupSom() {
    try {
        const response = await fetch('sound/som-vitoria.mp3');
        const arrayBuffer = await response.arrayBuffer();
        somVitoriaBuffer = await globalAudioContext.decodeAudioData(arrayBuffer);
    } catch (err) {
        console.error("Erro ao carregar o som:", err);
    }
}
setupSom();


// --- Lógica de Início do Jogo ---
startButton.addEventListener('click', () => {
    // É essencial "acordar" o AudioContext após uma interação do utilizador.
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

// --- Lógica de Fim de Jogo ---
function endGame() {
    gameHasEnded = true;
    cancelAnimationFrame(gameLoopId);

    if (microphone) microphone.disconnect();

    // Toca o som que já está na memória (operação muito rápida).
    if (somVitoriaBuffer) {
        const source = globalAudioContext.createBufferSource();
        source.buffer = somVitoriaBuffer;
        source.connect(globalAudioContext.destination);
        source.start(0);
    }

    // Orquestra a animação de transição entre os ecrãs.
    gameView.classList.remove('visible');
    gameView.classList.add('hidden');
    
    setTimeout(() => {
        winView.classList.remove('hidden');
        winView.classList.add('visible');
    }, 400); // Este tempo deve corresponder à duração da transição no CSS.
}

// --- Loop Principal do Jogo ---
function gameLoop(currentTime) {
    if (gameHasEnded) return;

    gameLoopId = requestAnimationFrame(gameLoop);

    // O cálculo de DeltaTime garante que a velocidade do jogo seja a mesma em qualquer computador.
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    analyser.getByteFrequencyData(dataArray);

    let soma = 0;
    // Otimização: verificamos apenas alguns pontos do array de frequência para medir o volume.
    for (let i = 0; i < dataArray.length; i += 8) {
        soma += dataArray[i];
    }
    const volumeMedio = soma / (dataArray.length / 8);
    volumeDisplay.textContent = Math.round(volumeMedio);

    // Parâmetros de dificuldade do jogo
    const LIMITE_GRITO = 45;
    const VELOCIDADE_ENCHER = 25; // percentagem por segundo
    const VELOCIDADE_ESVAZIAR = 10; // percentagem por segundo
    
    let alturaAtual = parseFloat(liquido.style.height) || 0;

    if (volumeMedio > LIMITE_GRITO) {
        alturaAtual += VELOCIDADE_ENCHER * deltaTime;
    } else {
        alturaAtual -= VELOCIDADE_ESVAZIAR * deltaTime;
    }

    if (alturaAtual < 0) alturaAtual = 0;
    if (alturaAtual > 100) alturaAtual = 100;
    liquido.style.height = alturaAtual + '%';

    // Condição de vitória, verifica a flag para acontecer apenas uma vez.
    if (alturaAtual >= 100 && !gameHasEnded) {
        endGame();
    }
}