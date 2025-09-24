// Pega os elementos do HTML que vamos usar
const startButton = document.getElementById('startButton');
const liquido = document.getElementById('liquido');
const resultado = document.getElementById('resultado');
const volumeDisplay = document.getElementById('volumeDisplay');

let audioContext;
let analyser;
let microphone;
let gameLoopId;
let dataArray;

// Variável para controlo de tempo (Delta Time)
let lastTime = 0;

startButton.addEventListener('click', async () => {
    startButton.style.display = 'none';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('O seu navegador não suporta a API de áudio necessária para este jogo.');
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);

        // Inicia o loop do jogo
        lastTime = performance.now(); // Marca o tempo inicial
        gameLoop();

    } catch (err) {
        console.error("Erro ao aceder ao microfone:", err);
        alert('Precisa de permitir o uso do microfone para jogar!');
        startButton.style.display = 'block';
    }
});

function gameLoop(currentTime) {
    gameLoopId = requestAnimationFrame(gameLoop);

    // --- CÁLCULO DO DELTA TIME ---
    // Isto garante que a velocidade do jogo é a mesma em qualquer computador.
    const deltaTime = (currentTime - lastTime) / 1000; // Tempo em segundos desde o último quadro
    lastTime = currentTime;

    analyser.getByteFrequencyData(dataArray);

    let soma = 0;
    const tamanhoArray = dataArray.length;
    for (let i = 0; i < tamanhoArray; i += 8) {
        soma += dataArray[i];
    }
    const volumeMedio = soma / (tamanhoArray / 8);

    volumeDisplay.textContent = Math.round(volumeMedio);

    // --- LÓGICA DE JOGO AJUSTADA E CONTROLADA ---

    const LIMITE_GRITO = 45; // Um pouco mais difícil
    let alturaAtual = parseFloat(liquido.style.height) || 0;

    // A velocidade agora é medida em "percentagem por segundo"
    const VELOCIDADE_ENCHER = 25; // Enche 25% da barra por segundo de grito
    const VELOCIDADE_ESVAZIAR = 10; // Esvazia 10% por segundo de silêncio

    if (volumeMedio > LIMITE_GRITO) {
        // Multiplicamos a velocidade pelo deltaTime
        alturaAtual += VELOCIDADE_ENCHER * deltaTime;
    } else {
        alturaAtual -= VELOCIDADE_ESVAZIAR * deltaTime;
    }

    if (alturaAtual < 0) alturaAtual = 0;
    if (alturaAtual > 100) alturaAtual = 100;

    liquido.style.height = alturaAtual + '%';

    if (alturaAtual >= 100) {
        if (audioContext.state !== 'closed') {
            audioContext.close();
            cancelAnimationFrame(gameLoopId);
        }
        resultado.classList.remove('hidden');
        document.getElementById('garrafa-container').style.display = 'none';
        document.getElementById('debug-info').style.display = 'none';
    }
}