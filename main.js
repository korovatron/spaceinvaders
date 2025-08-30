// #region set event handlers etc.
"use strict";
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);

// Unified key state
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

const minDelta = 2;

// #region touch screen event listeners

let startX, startY;
let lastX, lastY;
let swipeDirection = null;
const swipeThreshold = 10;
let isTap = false;
let moveTouchId = null;
let hasMovedBeyondThreshold = false;

function setKey(key, state) {
    if (keys[key] !== undefined) {
        keys[key] = state;
    }
}

// --- Keyboard ---
document.addEventListener('keydown', e => {
    setKey(e.code === 'Space' ? 'Space' : e.key, true);
});
document.addEventListener('keyup', e => {
    setKey(e.code === 'Space' ? 'Space' : e.key, false);
});

// --- Touch ---
function handleTouchStart(e) {
    e.preventDefault();
    for (let touch of e.changedTouches) {
        if (moveTouchId === null) {
            moveTouchId = touch.identifier;
            startX = touch.clientX;
            startY = touch.clientY;
            lastX = startX;
            lastY = startY;
            swipeDirection = null;
            isTap = true;
            hasMovedBeyondThreshold = false;
        } else {
            setKey('Space', true);
            setTimeout(() => setKey('Space', false), 50);
        }
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    for (let touch of e.changedTouches) {
        if (touch.identifier === moveTouchId) {
            const dx = touch.clientX - lastX;
            const dy = touch.clientY - lastY;

            lastX = touch.clientX;
            lastY = touch.clientY;

            if (!hasMovedBeyondThreshold) {
                const totalDx = touch.clientX - startX;
                const totalDy = touch.clientY - startY;
                if (Math.abs(totalDx) > swipeThreshold || Math.abs(totalDy) > swipeThreshold) {
                    hasMovedBeyondThreshold = true;
                    isTap = false;
                } else {
                    return;
                }
            }

            if (Math.abs(dx) < minDelta && Math.abs(dy) < minDelta) {
                return;
            }

            let newDirection = Math.abs(dx) > Math.abs(dy)
                ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft')
                : (dy > 0 ? 'ArrowDown' : 'ArrowUp');

            if (newDirection !== swipeDirection) {
                if (swipeDirection) setKey(swipeDirection, false);
                swipeDirection = newDirection;
                setKey(swipeDirection, true);
            }
        }
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    for (let touch of e.changedTouches) {
        if (touch.identifier === moveTouchId) {
            if (swipeDirection) {
                setKey(swipeDirection, false);
                swipeDirection = null;
            } else if (isTap) {
                // Calculate tap position relative to canvas
                let rect = canvas.getBoundingClientRect();
                let tapX = (touch.clientX - rect.left) / scale;
                let tapY = (touch.clientY - rect.top) / scale;

                // Check mute button area
                if (tapX > baseWidth / 2 - 25 && tapX < baseWidth / 2 + 25 && tapY > 915 && tapY < 973) {
                    toggleMute();
                } else {
                    if (gameState === 1) {
                        fireMissile();
                    } else if (gameState === 0 || gameState === 2) {
                        // For title/game over, mimic spacebar tap
                        setKey('Space', true);
                        setTimeout(() => setKey('Space', false), 50);
                    }
                }
            }
            moveTouchId = null;
            hasMovedBeyondThreshold = false;
            lastX = null;
            lastY = null;
        }
    }
}

document.addEventListener('touchstart', handleTouchStart, { passive: false });
document.addEventListener('touchmove', handleTouchMove, { passive: false });
document.addEventListener('touchend', handleTouchEnd, { passive: false });
// Handle iOS/system gesture interruptions
document.addEventListener('touchcancel', function handleTouchCancel(e) {
    // Reset all touch state variables
    swipeDirection = null;
    startX = null;
    startY = null;
    isTap = false;
    moveTouchId = null;
    hasMovedBeyondThreshold = false;
    setKey('ArrowLeft', false);
    setKey('ArrowRight', false);
    setKey('ArrowUp', false);
    setKey('ArrowDown', false);
}, { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });

// #endregion

// #region manifest for progressive web app

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => {
                console.log('Service Worker registered:', reg);
            })
            .catch(err => {
                console.error('Service Worker registration failed:', err);
            });
    });
}

// #endregion


// #region allows audio to resume when reopened, esp in PWA in iOS
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.userAgent.includes('Macintosh') && 'ontouchend' in document);
}

let audioOverlay = null;
function showAudioOverlay() {
    if (!audioOverlay) {
        audioOverlay = document.createElement('div');
        audioOverlay.id = 'audio-resume-overlay';
        // Set styles for fullscreen, z-index, background, etc.
        audioOverlay.style.position = 'fixed';
        audioOverlay.style.top = '0';
        audioOverlay.style.left = '0';
        audioOverlay.style.width = '100vw';
        audioOverlay.style.height = '100vh';
        audioOverlay.style.background = 'rgba(0,0,0,0.85)';
        audioOverlay.style.display = 'flex';
        audioOverlay.style.flexDirection = 'column';
        audioOverlay.style.justifyContent = 'center';
        audioOverlay.style.alignItems = 'center';
        audioOverlay.style.zIndex = '9999';
        audioOverlay.innerHTML = '<div style="color: white; font-size: 2em; text-align: center; margin-bottom: 1em;">Audio paused by iOS.<br>Tap anywhere to resume.</div>';
        document.body.appendChild(audioOverlay);
    } else {
        audioOverlay.style.display = 'flex';
    }
}
function hideAudioOverlay() {
    if (audioOverlay) {
        audioOverlay.style.display = 'none';
    }
}

function recreateHowlerAndResume() {
    // Close and delete old Howler context
    try {
        if (Howler.ctx && Howler.ctx.close) {
            Howler.ctx.close();
        }
    } catch (e) { }
    try {
        delete Howler.ctx; Howler._setup();
    } catch (e) { }

    // Recreate Howler instance and sprite player
    window.duffSounds = new Howl({
        src: [
            'sounds/duffAudioSprite.ogg',
            'sounds/duffAudioSprite.m4a',
            'sounds/duffAudioSprite.mp3',
            'sounds/duffAudioSprite.ac3'
        ],
        sprite: {
            duff1: [0, 74.97],
            duff2: [1500, 110.0],
            duff3: [3000, 129.48],
            duff4: [4500, 128.93]
        }
    });

    window.laserShoot = new Howl({
        src: ['sounds/laserShoot.wav'], // Path to your .wav file
        volume: 1.0,             // Optional: set volume (0.0 to 1.0)
        preload: true,           // Optional: preload the sound
    });

    window.explosion = new Howl({
        src: ['sounds/explosion.wav'], // Path to your .wav file
        volume: 1.0,             // Optional: set volume (0.0 to 1.0)
        preload: true,           // Optional: preload the sound
    });

    window.ufoExplosionSound = new Howl({
        src: ['sounds/ufoExplosion.wav'], // Path to your .wav file
        volume: 1.0,             // Optional: set volume (0.0 to 1.0)
        preload: true,           // Optional: preload the sound
    });

    window.ufoSound = new Howl({
        src: ['sounds/ufo.wav'], // Path to your .wav file
        volume: 1.0,             // Optional: set volume (0.0 to 1.0)
        preload: true,           // Optional: preload the sound
    });

    window.cannonHit = new Howl({
        src: ['sounds/cannonHit.wav'], // Path to your .wav file
        volume: 1.0,             // Optional: set volume (0.0 to 1.0)
        preload: true,           // Optional: preload the sound
    });

    window.playIfIdle = createPerSpriteIdlePlayer(duffSounds);

    // Respect mute state
    if (mute) {
        window.Howler.mute(true);
    } else {
        window.Howler.mute(false);
    }

    // Play a silent sound to unlock audio (iOS hack)
    try {
        var ctx = Howler.ctx;
        var buffer = ctx.createBuffer(1, 1, 22050);
        var source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
    } catch (e) { }

    hideAudioOverlay();
}

const resumeAudio = () => {
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume().catch(() => { if (isIOS()) showAudioOverlay(); });
    } else if (isIOS() && (!Howler.ctx || Howler.ctx.state !== 'running')) {
        showAudioOverlay();
    }
    window.removeEventListener('touchstart', resumeAudio);
    window.removeEventListener('click', resumeAudio);
};

document.addEventListener('visibilitychange', () => {
    // Always reset touch state and keys on visibility change (both hidden and visible)
    swipeDirection = null;
    startX = null;
    startY = null;
    isTap = false;
    moveTouchId = null;
    hasMovedBeyondThreshold = false;
    setKey('ArrowLeft', false);
    setKey('ArrowRight', false);
    setKey('ArrowUp', false);
    setKey('ArrowDown', false);

    if (document.visibilityState === 'visible') {
        // Remove and re-add touch event listeners
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);

        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });

        if (isIOS()) {
            // Always show overlay after backgrounding on iOS
            showAudioOverlay();
        } else {
            if (Howler.ctx && Howler.ctx.state === 'suspended') {
                window.addEventListener('touchstart', resumeAudio, { once: true });
                window.addEventListener('click', resumeAudio, { once: true });
            } else if (Howler.ctx && Howler.ctx.resume) {
                Howler.ctx.resume().catch(() => {
                    window.addEventListener('touchstart', resumeAudio, { once: true });
                    window.addEventListener('click', resumeAudio, { once: true });
                });
            }
        }
    }
});

document.addEventListener('click', function overlayTapHandler(e) {
    if (audioOverlay && audioOverlay.style.display === 'flex') {
        recreateHowlerAndResume();
        // Play the 'munch' sound to help unlock audio and give feedback
        try {
            if (window.duffSounds && typeof window.duffSounds.play === 'function') {
                window.duffSounds.play('duff1');
            }
        } catch (e) { }
        // After trying to resume, check if audio is unlocked, then hide overlay
        setTimeout(() => {
            if (Howler.ctx && Howler.ctx.state === 'running') {
                hideAudioOverlay();
                // Reset touch state variables and re-attach listeners
                swipeDirection = null;
                startX = null;
                startY = null;
                isTap = false;
                moveTouchId = null;
                hasMovedBeyondThreshold = false;
                document.removeEventListener('touchstart', handleTouchStart);
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
                document.addEventListener('touchstart', handleTouchStart, { passive: false });
                document.addEventListener('touchmove', handleTouchMove, { passive: false });
                document.addEventListener('touchend', handleTouchEnd, { passive: false });
            }
        }, 100);
    }
}, true);
document.addEventListener('touchstart', function overlayTouchHandler(e) {
    if (audioOverlay && audioOverlay.style.display === 'flex') {
        recreateHowlerAndResume();
        // Play the 'munch' sound to help unlock audio and give feedback
        try {
            if (window.duffSounds && typeof window.duffSounds.play === 'function') {
                window.duffSounds.play('duff1');
            }
        } catch (e) { }
        setTimeout(() => {
            if (Howler.ctx && Howler.ctx.state === 'running') {
                hideAudioOverlay();
                // Reset touch state variables and re-attach listeners
                swipeDirection = null;
                startX = null;
                startY = null;
                isTap = false;
                moveTouchId = null;
                document.removeEventListener('touchstart', handleTouchStart);
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
                document.addEventListener('touchstart', handleTouchStart, { passive: false });
                document.addEventListener('touchmove', handleTouchMove, { passive: false });
                document.addEventListener('touchend', handleTouchEnd, { passive: false });
            }
        }, 100);
    }
}, true);



// #endregion

let canvas;
let context;
let secondsPassed = 0;
let oldTimeStamp = 0;
document.addEventListener("mousedown", function (e) {
    getMouseClickPosition(canvas, e);
});

// #endregion

// #region gameLoop
function gameLoop(timeStamp) {
    // Calculate how much time has passed
    secondsPassed = (timeStamp - oldTimeStamp) / 1000;
    oldTimeStamp = timeStamp;
    update(secondsPassed);
    // Move forward in time with a maximum amount
    secondsPassed = Math.min(secondsPassed, 0.1);
    draw(secondsPassed);
    // Keep requesting new frames
    window.requestAnimationFrame(gameLoop);
}
// #endregion

// #region pre-load images etc and start the gameLoop... (doesn't seem to work with audio so do that in game variables section)
window.onload = init;
function init() {
    // #region Load Images
    let imagesLoaded = 0;
    const numberImages = 4; // Set number of images to load
    invaderLogo.src = "images/invaderLogo.png";
    invaderLogo.onload = function () {
        imagesLoaded++;
        if (imagesLoaded == numberImages) {
            createCanvas();
        }
    }
    controls.src = "images/controls.png";
    controls.onload = function () {
        imagesLoaded++;
        if (imagesLoaded == numberImages) {
            createCanvas();
        }
    }
    soundOff.src = "images/soundOff.png";
    soundOff.onload = function () {
        imagesLoaded++;
        if (imagesLoaded == numberImages) {
            createCanvas();
        }
    }
    soundOn.src = "images/soundOn.png";
    soundOn.onload = function () {
        imagesLoaded++;
        if (imagesLoaded == numberImages) {
            createCanvas();
        }
    }

    // #endregion
}
function createCanvas() {
    canvas = document.getElementById('canvas');
    context = canvas.getContext('2d');
    canvas.height = baseHeight;
    canvas.width = baseWidth;
    resizeCanvas();

    // Start the first frame request
    window.requestAnimationFrame(gameLoop);
    gameLoad();
}
//   #endregion

// #region game Variables
// Images must pre-loaded in the initialise section above
// #region images & sprite sheets
const invaderLogo = new Image(888, 390);
const controls = new Image(785, 363);
const soundOff = new Image(100, 117);
const soundOn = new Image(100, 117);
// #endregion
// Native canvas size (will scale with window size changes, but coordinate system remains at this)
const baseWidth = 896;
const baseHeight = 1024;
const keyboardDelay = 0.3; // seconds before a pressed key will repeat

window.duffSounds = new Howl({
    src: [
        'sounds/duffAudioSprite.ogg',
        'sounds/duffAudioSprite.m4a',
        'sounds/duffAudioSprite.mp3',
        'sounds/duffAudioSprite.ac3'
    ],
    sprite: {
        duff1: [0, 74.97],
        duff2: [1500, 110.0],
        duff3: [3000, 129.48],
        duff4: [4500, 128.93]
    }
});
window.laserShoot = new Howl({
    src: ['sounds/laserShoot.wav'], // Path to your .wav file
    volume: 1.0,             // Optional: set volume (0.0 to 1.0)
    preload: true,           // Optional: preload the sound
});
window.explosion = new Howl({
    src: ['sounds/explosion.wav'], // Path to your .wav file
    volume: 1.0,             // Optional: set volume (0.0 to 1.0)
    preload: true,           // Optional: preload the sound
});
window.ufoExplosionSound = new Howl({
    src: ['sounds/ufoExplosion.wav'], // Path to your .wav file
    volume: 1.0,             // Optional: set volume (0.0 to 1.0)
    preload: true,           // Optional: preload the sound
});
window.ufoSound = new Howl({
    src: ['sounds/ufo.wav'], // Path to your .wav file
    volume: 1.0,             // Optional: set volume (0.0 to 1.0)
    preload: true,           // Optional: preload the sound
});
window.cannonHit = new Howl({
    src: ['sounds/cannonHit.wav'], // Path to your .wav file
    volume: 1.0,             // Optional: set volume (0.0 to 1.0)
    preload: true,           // Optional: preload the sound
});

// #region Invaders
const invaders = {
    typeA: [ // Top row invaders (e.g., squid-like)
        [
            [0, 0, 1, 0, 0, 1, 0, 0],
            [0, 0, 0, 1, 1, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 0, 1, 1, 0, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 0, 0, 1, 0]
        ],
        [
            [0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 1, 1, 0, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 0, 1, 1, 0, 1, 1],
            [0, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 1, 1, 1, 1, 0, 0],
            [0, 1, 0, 0, 0, 0, 1, 0],
            [1, 0, 0, 0, 0, 0, 0, 1]
        ]
    ],
    typeB: [ // Middle row invaders (e.g., crab-like)
        [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0, 1, 0],
            [0, 0, 1, 1, 1, 1, 0, 0],
            [1, 1, 0, 1, 1, 0, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [0, 1, 1, 0, 0, 1, 1, 0],
            [0, 0, 1, 0, 0, 1, 0, 0],
            [1, 0, 0, 0, 0, 0, 0, 1]
        ],
        [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0, 1, 0],
            [0, 0, 1, 1, 1, 1, 0, 0],
            [1, 1, 0, 1, 1, 0, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [0, 0, 1, 1, 1, 1, 0, 0],
            [0, 1, 0, 0, 0, 0, 1, 0],
            [0, 0, 1, 0, 0, 1, 0, 0]
        ]
    ],
    typeC: [ // Bottom row invaders (e.g., bug-like)
        [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 0, 0],
            [0, 1, 1, 0, 0, 1, 1, 0],
            [1, 1, 0, 1, 1, 0, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [0, 1, 0, 0, 0, 0, 1, 0],
            [1, 0, 1, 0, 0, 1, 0, 1],
            [0, 0, 0, 1, 1, 0, 0, 0]
        ],
        [
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 0, 0],
            [0, 1, 1, 0, 0, 1, 1, 0],
            [1, 1, 0, 1, 1, 0, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1],
            [0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 1, 1, 0, 1, 0],
            [1, 0, 0, 0, 0, 0, 0, 1]
        ]
    ],
    typeD: [
        [ // Frame 1: Initial burst
            [0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 1, 1, 0, 1, 0],
            [1, 0, 1, 1, 1, 1, 0, 1],
            [0, 1, 1, 0, 0, 1, 1, 0],
            [0, 1, 1, 0, 0, 1, 1, 0],
            [1, 0, 1, 1, 1, 1, 0, 1],
            [0, 1, 0, 1, 1, 0, 1, 0],
            [0, 0, 1, 0, 0, 1, 0, 0]
        ],
        [ // Frame 2: Dissipating fragments
            [0, 1, 0, 0, 0, 0, 1, 0],
            [1, 0, 1, 0, 0, 1, 0, 1],
            [0, 1, 0, 1, 1, 0, 1, 0],
            [1, 0, 1, 0, 0, 1, 0, 1],
            [0, 1, 0, 1, 1, 0, 1, 0],
            [1, 0, 1, 0, 0, 1, 0, 1],
            [0, 1, 0, 0, 0, 0, 1, 0],
            [0, 0, 0, 1, 1, 0, 0, 0]
        ],
        [ // Frame 3: Final fade
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 1, 0, 0],
            [0, 1, 0, 0, 0, 0, 1, 0],
            [0, 0, 0, 1, 1, 0, 0, 0],
            [0, 0, 1, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0, 1, 0],
            [0, 0, 0, 0, 0, 0, 0, 0]
        ]
    ]
};

// #endregion

let shortTimer = 0;
let keyboardTimer;
let canvasColour = "black";
let loseLifeTimer;
let scale = 1; // scale that the canvas is drawn. Will change afcter resize
let xOffset = 10;
let yOffset = 93;
let mouseX = 0;
let gameOverTimer;
let gameOverAnimateFrameTimer = 0.5; // seconds between flashing game over
let gameOverDisplay = false;
let mouseY = 0;
let mute = false;
let gameState;
let invaderFrame = 0;
let invaderFrameTimer = 0;
let currentLevel = 1;
let fleet = createInvaderFleet();
Invader.direction = "left";
const titleFleet = createTitleFleet();
let titleUfo = new Ufo('red', false);
titleUfo.setX(280);
titleUfo.setY(370);
titleUfo.setActive(true);
let startingFleetSize = fleet.length;
let invaderStepSize = 4;
let ufo = new Ufo();
const invaderDropSize = 32;
let duffTimer = 0;
let duffInterval = calculateTempo(fleet.length, startingFleetSize); // same tempo logic
let stepIndex = 0;
const duffs = ['duff1', 'duff2', 'duff3', 'duff4'];
const cannon = new Cannon(baseWidth / 2 - 32, 27 * 32);
const cannonSpeed = 200;
let activeMissile = null;
let pixelSize = 4;
const invaderMissiles = [];
let lastMissileTime = 0;
let shieldsOn = true;
let shields = [
    new Shield(64, 768),
    new Shield(288, 768),
    new Shield(512, 768),
    new Shield(740, 768)
];
let score = 0;
let lives = 3;
let dx = 0;
let titleAnimateTimer = 0;
let ufoTimer = 0;
window.playIfIdle = createPerSpriteIdlePlayer(duffSounds);
let laserID;
const cannonExplosion = [
    [ // Frame 1: Sudden impact
        [0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 0, 0],
        [0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0],
        [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0],
        [0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1],
        [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0],
        [0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0]
    ],
    [ // Frame 2: Jagged burst
        [0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0],
        [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
        [1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        [0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0],
        [1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        [1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1],
        [0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0]
    ],
    [ // Frame 3: Chaotic scatter
        [1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
        [0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        [1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
        [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
        [0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        [1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1],
        [0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0]
    ],
    [ // Frame 4: Radial scatter
        [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
        [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
        [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
        [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
        [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        [0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]
    ],
    [ // Frame 5: Fragmenting
        [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
        [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
        [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
        [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        [0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0]
    ],
    [ // Frame 6: Sparse flicker
        [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0]
    ],
    [ // Frame 7: Dimming
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    [ // Frame 8: Final flicker
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    [ // Frame 9: Residual glow
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ],
    [ // Frame 10: Empty
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ]
];

let cannonExplosionFrame = 0;
let cannonExplosionFrameTimer = 0;
let ufoExplosion = false;
let ufoExplosionFrame = 0;
let ufoExplosionFrameTimer = 0;
let ufoExplosionX = 0;
let ufoExplosionY = 0;
let newWaveTimer = 5;

// #endregion

// #region gameLoad
function gameLoad() {
    gameState = 0;
    shieldsOn = true;
}
// #endregion

// #region update game state
function update(secondsPassed) {

    if (secondsPassed > 0.03) {
        secondsPassed = 0.03;
    }

    if (isNaN(secondsPassed) || secondsPassed <= 0) {
        console.warn('Invalid secondsPassed:', secondsPassed);
        return;
    }

    shortTimer -= secondsPassed;
    keyboardTimer -= secondsPassed;

    switch (gameState) {
        case 0: // title screen
            checkMouseClickButtons();
            if ((keys.Space)) {
                if (shortTimer < 0) {
                    newGame();
                }
            }
            titleAnimateTimer += secondsPassed;
            if (titleAnimateTimer > 0.5) {
                titleAnimateTimer = 0;
                titleFleet.forEach(invader => {
                    invader.toggleFrame();
                });
            }
            break;
        case 1: // playing

            fleet.forEach(invader => {
                if (invader.isExploding() == true) {
                    if (invader.updateExplosion(secondsPassed) == true) {
                        //invader dead and needs removing
                    }
                }
            });

            removeDeadInvaders();
            invaderStepSize = 4;
            if (ufo.isActive() == true) {
                ufo.update(secondsPassed);
            }

            ufoTimer -= secondsPassed;
            if (ufoTimer < 0) {
                ufoTimer = 100;
                ufo = new Ufo();
                ufo.setActive(true);
                ufoSound.play();
            }
            if (fleet.length < 22) {
                invaderStepSize = 6;
            }
            if (fleet.length < 11) {
                invaderStepSize = 8;
            }
            if (fleet.length < 4) {
                invaderStepSize = 12;
            }
            if (fleet.length < 2) {
                invaderStepSize = 20;
            }
            invaderFrameTimer += secondsPassed;
            updateDuffSound(secondsPassed);

            maybeDropInvaderMissile(fleet, invaderMissiles, performance.now(), currentLevel);

            // if (keyboardTimer < 0) {

            if (keys.ArrowLeft) {
                cannon.moveLeft(cannonSpeed * secondsPassed);
            }
            if (keys.ArrowRight) {
                cannon.moveRight(cannonSpeed * secondsPassed);
            }
            if ((keys.Space)) {
                fireMissile();
            }
            // }
            checkMouseClickButtons();
            const currentTempo = calculateTempo(fleet.length, startingFleetSize);
            invaderFrameTimer += secondsPassed;
            if (invaderFrameTimer > currentTempo) {
                invaderFrameTimer = 0;
                updateAllInvadersPositions();
            }

            if (activeMissile) {
                activeMissile.update(secondsPassed);
                if (shieldsOn == true) {

                    for (const shield of shields) {
                        if (shield.checkCollision(activeMissile)) break;
                    }
                }

                // Check if it hits any invader
                for (let i = 0; i < fleet.length; i++) {
                    const invader = fleet[i];
                    if (isColliding(activeMissile, invader)) {
                        if (invader.isExploding() == false) {
                            activeMissile = null;
                            explosion.play();
                            invader.setExplode(true);
                            switch (invader.getType()) {
                                case "A":
                                    score += 10;
                                    break;
                                case "B":
                                    score += 20;
                                    break;
                                case "C":
                                    score += 30;
                                    break;
                                default:
                                    break;
                            }
                            invader.setType("D");
                            break;
                        }
                    }
                }

                if (ufo.isActive() == true) {
                    if (isColliding(activeMissile, ufo)) {
                        ufoSound.stop();
                        ufoExplosionSound.play();
                        ufo.setActive(false);
                        ufoExplosionX = ufo.x;
                        ufoExplosionY = ufo.y;
                        ufoExplosion = true;
                        ufoExplosionFrame = 0;
                        score += getRandomUfoScore();
                        ufoTimer = Math.floor(Math.random() * 11) + 20;
                    }
                }



                // Remove missile if it leaves screen
                if (!activeMissile?.active) {
                    activeMissile = null;
                }
            }
            for (let i = invaderMissiles.length - 1; i >= 0; i--) {
                const missile = invaderMissiles[i];

                for (const shield of shields) {
                    shield.checkCollision(missile); // Check BEFORE movement
                }

                missile.update(secondsPassed); // Then move

                if (!missile.active) {
                    invaderMissiles.splice(i, 1);
                    continue;
                }

                if (isColliding(missile, cannon)) {
                    invaderMissiles.splice(i, 1);
                    cannonHit.play();
                    fleet.forEach(invader => {
                        invader.setMoving(false);
                    });
                    ufo.setActive(false);
                    gameState = 1.5;
                    ufoSound.stop();
                    loseLifeTimer = 3;
                    cannonExplosionFrame = 0
                    cannonExplosionFrameTimer = 0.1;
                    invaderMissiles.length = 0;
                    if (activeMissile) {
                        activeMissile = null;
                    }
                    continue;
                }
            }
            updateUfoExplosion();
            break;

        case 1.2:// wave completed
            newWaveTimer -= secondsPassed;
            if (ufo.isActive() == true) {
                ufo.update(secondsPassed);
            }
            if (activeMissile) {
                activeMissile.update(secondsPassed);
                if (shieldsOn == true) {

                    for (const shield of shields) {
                        if (shield.checkCollision(activeMissile)) break;
                    }
                }

                // Check if it hits any invader
                for (let i = 0; i < fleet.length; i++) {
                    const invader = fleet[i];
                    if (isColliding(activeMissile, invader)) {
                        if (invader.isExploding() == false) {
                            activeMissile = null;
                            explosion.play();
                            invader.setExplode(true);
                            switch (invader.getType()) {
                                case "A":
                                    score += 10;
                                    break;
                                case "B":
                                    score += 20;
                                    break;
                                case "C":
                                    score += 30;
                                    break;
                                default:
                                    break;
                            }
                            invader.setType("D");
                            break;
                        }
                    }
                }

                if (ufo.isActive() == true) {
                    if (isColliding(activeMissile, ufo)) {
                        ufoSound.stop();
                        ufoExplosionSound.play();
                        ufo.setActive(false);
                        ufoExplosionX = ufo.x;
                        ufoExplosionY = ufo.y;
                        ufoExplosion = true;
                        ufoExplosionFrame = 0;
                        score += getRandomUfoScore();
                        ufoTimer = Math.floor(Math.random() * 11) + 20;
                    }
                }



                // Remove missile if it leaves screen
                if (!activeMissile?.active) {
                    activeMissile = null;
                }
            }
            for (let i = invaderMissiles.length - 1; i >= 0; i--) {
                const missile = invaderMissiles[i];

                for (const shield of shields) {
                    shield.checkCollision(missile); // Check BEFORE movement
                }

                missile.update(secondsPassed); // Then move

                if (!missile.active) {
                    invaderMissiles.splice(i, 1);
                    continue;
                }

                if (isColliding(missile, cannon)) {
                    invaderMissiles.splice(i, 1);
                    cannonHit.play();
                    fleet.forEach(invader => {
                        invader.setMoving(false);
                    });
                    ufo.setActive(false);
                    gameState = 1.5;
                    ufoSound.stop();
                    loseLifeTimer = 3;
                    cannonExplosionFrame = 0
                    cannonExplosionFrameTimer = 0.1;
                    invaderMissiles.length = 0;
                    if (activeMissile) {
                        activeMissile = null;
                    }
                    continue;
                }
            }
            updateUfoExplosion();
            if (newWaveTimer < 0) {
                currentLevel += 1;
                fleet.length = 0;
                fleet = createInvaderFleet();
                Invader.direction = "left";
                invaderMissiles.length = 0;
                if (activeMissile) {
                    activeMissile = null;
                }
                shields.length = 0;
                shields = [
                    new Shield(64, 768),
                    new Shield(288, 768),
                    new Shield(512, 768),
                    new Shield(740, 768)
                ];
                shieldsOn = true;
                ufo.setActive(false);
                cannon.x = baseWidth / 2 - 32;

                gameState = 1;
            }
            break;

        case 1.5: // lose life
            loseLifeTimer -= secondsPassed;
            cannonExplosionFrameTimer -= secondsPassed;
            if (cannonExplosionFrameTimer < 0) {
                cannonExplosionFrame += 1;
                cannonExplosionFrameTimer = 0.1;
                if (cannonExplosionFrame == 10) {
                    cannonExplosionFrame = 9;
                }
            }

            fleet.forEach(invader => {
                if (invader.isExploding() == true) {
                    if (invader.updateExplosion(secondsPassed) == true) {
                        //invader dead and needs removing
                    }
                }
            });
            removeDeadInvaders();
            if (ufo.isActive() == true) {
                ufo.update(secondsPassed);
            }
            updateUfoExplosion();

            if (loseLifeTimer < 0) {
                lives -= 1;
                if (lives == 0) {
                    gameState = 2;
                    gameOverTimer = 15;
                    gameOverAnimateFrameTimer = 0.5;
                    shortTimer = 1;
                } else {
                    fleet.forEach(invader => {
                        invader.setMoving(true);
                    });
                    gameState = 1;
                    cannon.x = baseWidth / 2 - 32;
                }

            }
            break;

        case 2: // game over
            checkMouseClickButtons();
            gameOverTimer -= (secondsPassed);
            if (gameOverTimer < 0) {
                shortTimer = 1; // 2 second delay otherwise the key press will instantly start new game
                currentLevel = 1;
                resetGame();
                gameState = 0;
            }
            gameOverAnimateFrameTimer -= (secondsPassed);
            if (gameOverAnimateFrameTimer < 0) {
                if (gameOverDisplay == true) {
                    gameOverDisplay = false;
                } else {
                    gameOverDisplay = true;
                }
                gameOverAnimateFrameTimer = 0.5;
            }

            if ((keys.Space)) {
                if (shortTimer < 0) {
                    shortTimer = 1; // 2 second delay otherwise the key press will instantly start new game
                    currentLevel = 1;
                    resetGame();
                    gameState = 0;
                }

            }
            break;

        default:
            break;
    }
}
// #endregion

// #region draw Each Frame to Canvas
function draw() {
    context.clearRect(0, 0, baseWidth, baseHeight);
    context.fillStyle = canvasColour;
    context.fillRect(0, 0, baseWidth, baseHeight);

    dx = dx + 2 * Math.PI / 180;
    if (dx > 2 * Math.PI) {
        dx = 0;
    }

    switch (gameState) {
        case 0:
            context.drawImage(invaderLogo, 0, 0, 888, 390, baseWidth / 2 - 222, 0, 444, 195);
            context.font = "bold 30px Courier New";
            context.fillStyle = "white";

            drawCentredText(context, "SCORE ADVANCE TABLE", 300);
            drawCentredText(context, "= ? MYSTERY", 395);
            drawCentredText(context, "= 30 POINTS", 440);
            drawCentredText(context, "= 20 POINTS", 485);
            drawCentredText(context, "= 10 POINTS", 530);

            titleFleet.forEach(invader => {
                switch (invader.getType()) {
                    case "A":
                        invader.setX(270 + 10 * Math.sin(dx));
                        break;
                    case "B":
                        invader.setX(270 + 10 * Math.sin(dx + Math.PI / 4));
                        break;
                    case "C":
                        invader.setX(270 + 10 * Math.sin(dx + 3 * Math.PI / 4));
                        break;

                    default:
                        break;
                }

                invader.draw(context);
                titleUfo.setX(260 + 10 * Math.sin(dx));
                if (titleUfo.isActive() == true) {
                    titleUfo.draw(context);
                }
            });

            context.drawImage(controls, 0, 0, 785, 363, baseWidth / 2 - 175, 650, 350, 162);
            context.fillStyle = "white";
            drawCentredText(context, "tap or space to fire", 835);
            context.fillStyle = "yellow";
            drawCentredText(context, "a javaScript game by Neil Kendall 2025", baseHeight - 20);
            break;
        case 1:
            // drawBackGrid();
            if (ufo.isActive() == true) {
                ufo.draw(context);
            }

            drawUfoExplosion();

            fleet.forEach(invader => {
                invader.draw(context);
            })

            if (activeMissile) {
                activeMissile.draw(context);
            }
            invaderMissiles.forEach(missile => {
                missile.draw(context, "#ffffff");
            })
            cannon.draw(context);

            shields.forEach(shield => shield.draw(context, shieldsOn));

            context.fillStyle = "#000000";
            context.fillRect(
                0,
                0,
                baseWidth,
                4 * 32
            );

            context.fillStyle = "#000000";
            context.fillRect(
                0,
                28 * 32 + 8,
                baseWidth,
                baseHeight - 28 * 32 + 8
            );

            context.fillStyle = "#B22222"; // Crimson
            context.fillRect(
                0,
                28 * 32,
                baseWidth,
                8
            );

            context.drawImage(invaderLogo, 0, 0, 888, 390, baseWidth / 2 - 218 / 2, 16, 218, 96);
            drawLivesScoreLevel();
            break;

        case 1.2:
            if (ufo.isActive() == true) {
                ufo.draw(context);
            }

            drawUfoExplosion();

            fleet.forEach(invader => {
                invader.draw(context);
            })

            if (activeMissile) {
                activeMissile.draw(context);
            }
            invaderMissiles.forEach(missile => {
                missile.draw(context, "#ffffff");
            })
            cannon.draw(context);

            shields.forEach(shield => shield.draw(context, shieldsOn));

            context.fillStyle = "#000000";
            context.fillRect(
                0,
                0,
                baseWidth,
                4 * 32
            );

            context.fillStyle = "#000000";
            context.fillRect(
                0,
                28 * 32 + 8,
                baseWidth,
                baseHeight - 28 * 32 + 8
            );

            context.fillStyle = "#B22222"; // Crimson
            context.fillRect(
                0,
                28 * 32,
                baseWidth,
                8
            );

            context.drawImage(invaderLogo, 0, 0, 888, 390, baseWidth / 2 - 218 / 2, 16, 218, 96);
            drawLivesScoreLevel();
            context.font = "bold 50px Courier New";
            const opacity = getOpacity(newWaveTimer); // currentTimerValue goes from 5 to 0
            context.fillStyle = `rgba(255, 255, 255, ${opacity})`; // white with dynamic opacity
            drawCentredText(context, "WAVE DESTROYED ...", baseHeight / 2 - 100);

            break;

        case 1.5:
            if (ufo.isActive() == true) {
                ufo.draw(context);
            }

            drawUfoExplosion();

            fleet.forEach(invader => {
                invader.draw(context);
            })

            // cannon explosion
            let colour;
            if (cannonExplosionFrame % 2 == 0) {
                colour = "yellow";
            } else {
                colour = "red";
            }
            drawSprite(context, cannonExplosion[cannonExplosionFrame], cannon.x, cannon.y, pixelSize, colour);

            shields.forEach(shield => shield.draw(context, shieldsOn));

            context.fillStyle = "#000000";
            context.fillRect(
                0,
                0,
                baseWidth,
                4 * 32
            );

            context.fillStyle = "#000000";
            context.fillRect(
                0,
                28 * 32 + 8,
                baseWidth,
                baseHeight - 28 * 32 + 8
            );

            context.fillStyle = "#B22222"; // Crimson
            context.fillRect(
                0,
                28 * 32,
                baseWidth,
                8
            );

            context.drawImage(invaderLogo, 0, 0, 888, 390, baseWidth / 2 - 218 / 2, 16, 218, 96);
            drawLivesScoreLevel();
            break;

        case 2:
            //  drawBackGrid();
            fleet.forEach(invader => {
                invader.draw(context);
            })

            if (activeMissile) {
                activeMissile.draw(context);
            }

            shields.forEach(shield => shield.draw(context, shieldsOn));

            context.fillStyle = "#000000";
            context.fillRect(
                0,
                0,
                baseWidth,
                4 * 32
            );

            context.fillStyle = "#000000";
            context.fillRect(
                0,
                28 * 32 + 8,
                baseWidth,
                baseHeight - 28 * 32 + 8
            );

            context.fillStyle = "#B22222"; // Crimson
            context.fillRect(
                0,
                28 * 32,
                baseWidth,
                8
            );

            context.drawImage(invaderLogo, 0, 0, 888, 390, baseWidth / 2 - 218 / 2, 16, 218, 96);
            drawLivesScoreLevel();

            if (gameOverDisplay == true) {
                const text = "GAME OVER";
                context.font = "bold 75px Courier New";
                const metrics = context.measureText(text);
                const textWidth = metrics.width;
                const rectWidth = textWidth + 40; // 20px padding left/right
                const rectHeight = 80; // Fixed height for the rectangle
                const rectX = (baseWidth / 2) - (rectWidth / 2);
                const rectY = (baseHeight / 2) - (rectHeight / 2);
                context.fillStyle = "yellow";
                context.fillRect(rectX, rectY, rectWidth, rectHeight);

                // Draw red text centered inside the rectangle
                context.fillStyle = "red";
                drawCentredText(context, text, baseHeight / 2 + 25); // 25px offset to visually center text in 100px rect
            }

            break;
        default:
            break;

    }
    displaySound();
}
// #endregionred

// #region other methods

function resizeCanvas() {
    const gameWidth = canvas.width;
    const gameHeight = canvas.height;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const scaleX = windowWidth / gameWidth;
    const scaleY = windowHeight / gameHeight;
    scale = Math.min(scaleX, scaleY);
    canvas.style.transform = `scale(${scale})`;
    canvas.style.position = 'absolute';
    canvas.style.left = `${(windowWidth - gameWidth * scale) / 2}px`;
    canvas.style.top = `${(windowHeight - gameHeight * scale) / 2}px`;
}

function getMouseClickPosition(canvas, event) {
    let rect = canvas.getBoundingClientRect();
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;
    mouseX = Math.round(x / scale);
    mouseY = Math.round(y / scale);
}

function getInvaderSprite(type, frame) {
    const typeMap = {
        'A': 'typeA',
        'B': 'typeB',
        'C': 'typeC',
        'D': 'typeD'
    };

    const key = typeMap[type.toUpperCase()];
    if (!key || !invaders[key] || !invaders[key][frame]) {
        throw new Error(`Invalid type '${type}' or frame '${frame}'`);
    }

    return invaders[key][frame];
}

function drawSprite(ctx, sprite, x, y, pixelSize = 4, color = 'white') {
    x = Math.floor(x);
    y = Math.floor(y);
    for (let row = 0; row < sprite.length; row++) {
        for (let col = 0; col < sprite[row].length; col++) {
            if (sprite[row][col]) {
                ctx.fillStyle = color;
                ctx.fillRect(
                    x + col * pixelSize,
                    y + row * pixelSize,
                    pixelSize,
                    pixelSize
                );
            }
        }
    }
}

function drawBackGrid() {
    context.strokeStyle = "gray";
    for (let row = 0; row < baseHeight / 32; row++) {
        for (let column = 0; column < baseHeight / 32; column++) {
            context.strokeRect(column * 32, row * 32, 32, 32);
        }
    }
}

function newGame() {
    gameState = 1;
    invaderFrameTimer = 0;
    shieldsOn = true;
    score = 0;
    lives = 3;
    currentLevel = 1;
    titleAnimateTimer = 0;
    ufoTimer = Math.floor(Math.random() * 11) + 20;
}

function createPerSpriteIdlePlayer(howlInstance) {
    const activeIds = {};

    return function playIfIdle(spriteName, options = {}) {
        const currentId = activeIds[spriteName];

        if (!currentId || !howlInstance.playing(currentId)) {
            const newId = howlInstance.play(spriteName);
            activeIds[spriteName] = newId;

            // Set loop if specified
            if (options.loop !== undefined) {
                howlInstance.loop(options.loop, newId);
            }

            // Set volume if specified
            if (options.volume !== undefined) {
                howlInstance.volume(options.volume, newId);
            }

            // Set rate if specified
            if (options.rate !== undefined) {
                howlInstance.rate(options.rate, newId);
            }

            // Clear tracking when sound ends (if not looping)
            if (!options.loop) {
                howlInstance.once('end', (id) => {
                    if (activeIds[spriteName] === id) {
                        delete activeIds[spriteName];
                    }
                });
            }

            return newId;
        }

        return null;
    };
}

function toggleMute() {
    // Try to resume audio context (helps on iOS)
    /*
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume().then(() => {
            console.log('Audio context resumed via mute toggle');
        }).catch(err => {
            console.warn('Audio resume failed:', err);
        });
    } */
    if (mute == true) {
        mute = false;
        Howler.mute(false);
    } else {
        mute = true;
        Howler.mute(true);
    }
    mouseX = 0;
    mouseY = 0;
}

function checkMouseClickButtons() {
    if (mouseX > baseWidth / 2 - 25 && mouseX < baseWidth / 2 + 25 && mouseY > 915 && mouseY < 973) {
        toggleMute();
    }
}

function createInvaderFleet() {
    const invaders = [];
    const cols = 11;
    const rows = 5;
    const tileSize = 32;
    const xPadding = 64; // left/right spacing from edge
    let yStart;
    switch (true) {
        case (currentLevel === 1):
            yStart = 6 * 32;
            break;
        case (currentLevel === 2):
            yStart = 8 * 32;
            break;
        case (currentLevel === 3):
            yStart = 10 * 32;
            break;
        case (currentLevel >= 4):
            yStart = 12 * 32;
            break;
        default:
            yStart = 0; // Optional fallback
    }

    const xSpacing = tileSize + 32; // horizontal space between invaders
    const ySpacing = tileSize + 32; // vertical space between rows

    const types = ["C", "B", "B", "A", "A"]; // top-down classification

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = xPadding + col * xSpacing;
            const y = yStart + row * ySpacing;
            const type = types[row];
            const frame = 0;
            invaders.push(new Invader(type, frame, x, y));
        }
    }
    return invaders;
}

function createTitleFleet() {
    const invaders = [];

    invaders.push(new Invader("C", 0, 280, 415));
    invaders.push(new Invader("B", 0, 290, 460));
    invaders.push(new Invader("A", 0, 300, 505));

    invaders.forEach(invader => {
        invader.setMoving(false);
    });
    return invaders;
}

function updateAllInvadersPositions() {
    let directionChanged = false;
    let invaderReachedBottom = false;

    for (const invader of fleet) {
        invader.toggleFrame();
        const willHitEdge = (Invader.direction === "left" && invader.x - invaderStepSize < 0) ||
            (Invader.direction === "right" && invader.x + invaderStepSize > baseWidth - 32);
        if (willHitEdge) {
            directionChanged = true;
            break; // no need to check the rest
        }
    }

    if (directionChanged) {
        Invader.toggleDirection();
        fleet.forEach(invader => {
            invader.y += 32; // drop the fleet when bouncing

            if (invader.y >= 736) { // reached shields
                shieldsOn = false;
            }

            if (invader.y + 32 >= baseHeight - 4 * 32) {
                invaderReachedBottom = true;
            }
        });
    }

    // Move all invaders in the current direction
    fleet.forEach(invader => {
        invader.x += (Invader.direction === "right" ? invaderStepSize : -invaderStepSize);
        if (invader.y + 32 >= baseHeight) {
            invaderReachedBottom = true;
        }
    });


    if (invaderReachedBottom) {
        fleet.forEach(invader => {
            invader.setMoving("false");
        })
        gameState = 2;
    }
}

function calculateTempo(fleetSize, initialSize) {
    const minTempo = 0.05;
    const initialTempo = 1.5;

    const decayFactor = 3; // Tweak this for curve steepness
    const progress = 1 - (fleetSize / initialSize);

    return minTempo + (initialTempo - minTempo) * Math.pow(1 - progress, decayFactor);
}

function updateDuffSound(secondsPassed) {
    duffInterval = calculateTempo(fleet.length, startingFleetSize); // same tempo logic
    if (duffInterval < 0.15) {
        duffInterval = 0.15;
    }
    if (duffInterval > 1) {
        duffInterval = 1;
    }
    duffTimer += secondsPassed;
    if (duffTimer >= duffInterval) {
        duffTimer = 0;
        playIfIdle('duff' + (stepIndex + 1));
        stepIndex = (stepIndex + 1) % duffs.length;
    }
}

function isColliding(a, b) {
    if (!a || !b) {
        console.warn('Collision check failed:', { a, b });
        return false;
    }

    const ax = a.x;
    const ay = a.y;
    const aw = a.width * pixelSize;
    const ah = a.height * pixelSize;

    const bx = b.x;
    const by = b.y;
    const bw = b.width * pixelSize;
    const bh = b.height * pixelSize;

    return (
        ax < bx + bw &&
        ax + aw > bx &&
        ay < by + bh &&
        ay + ah > by
    );
}

function fireMissile() {
    if (!activeMissile) {
        activeMissile = new Missile(
            cannon.x + 32,
            cannon.y,
            750, 'up'
        );
        fireLaserSound();
    }
}

function getBottomInvaders(invaders) {
    const bottomMap = new Map();
    fleet.forEach(inv => {
        const col = Math.floor(inv.x); // or use logical column index
        if (!bottomMap.has(col) || inv.y > bottomMap.get(col).y) {
            bottomMap.set(col, inv);
        }
    });
    return Array.from(bottomMap.values());
}

function tryDropInvaderMissile(invaders, invaderMissiles) {
    if (invaderMissiles.length >= 4) return;

    const bottomInvaders = getBottomInvaders(invaders);
    const shooter = bottomInvaders[Math.floor(Math.random() * bottomInvaders.length)];
    invaderMissiles.push(new Missile(shooter.x + 8, shooter.y, 300, 'down'));

}

function maybeDropInvaderMissile(invaders, invaderMissiles, currentTime, level) {
    const maxMissiles = 4;
    const cooldown = Math.max(1000 - level * 100, 300); // faster drops at higher levels
    const dropChance = Math.min(0.01 + level * 0.005, 0.1); // higher chance at higher levels

    if (invaderMissiles.length >= maxMissiles) return;
    if (currentTime - lastMissileTime < cooldown) return;
    if (Math.random() > dropChance) return;

    tryDropInvaderMissile(invaders, invaderMissiles);
    lastMissileTime = currentTime;
}

function drawLivesScoreLevel() {
    context.font = "bold 50px Courier New";
    context.fillStyle = "white";
    context.fillText("SCORE " + score, 16, 80);
    context.fillText("WAVE " + currentLevel, 680, 80);

    let x = -64;
    for (let index = 0; index < lives - 1; index++) {
        x += 64;
        drawSprite(context, cannon.sprite, x, 930, 4, "yellow");
        x += 20;
    }
}

function drawCentredText(ctx, textString, y) {
    let textWidth = ctx.measureText(textString).width;
    ctx.fillText(textString, (baseWidth / 2) - (textWidth / 2), y);
}

// this functions stops too many laserShoots playing at once, which can cause overload in the browser
function fireLaserSound() {
    if (!laserShoot.playing()) {
        laserShoot.play();
    }
}

function removeDeadInvaders() {
    for (let i = 0; i < fleet.length; i++) {
        const invader = fleet[i];
        if (invader.isDead() == true) {
            fleet.splice(i, 1); // remove the invader
        }
    }
    if (fleet.length == 0) {
        gameState = 1.2;
        newWaveTimer = 5;
    }
}

function resetGame(currentLevel = 1) {
    fleet.length = 0;
    fleet = createInvaderFleet();
    Invader.direction = "left";
    invaderMissiles.length = 0;
    lives = 3;
    score = 0;
    if (activeMissile) {
        activeMissile = null;
    }
    shields.length = 0;
    shields = [
        new Shield(64, 768),
        new Shield(288, 768),
        new Shield(512, 768),
        new Shield(740, 768)
    ];
    ufo.setActive(false);
    cannon.x = baseWidth / 2 - 32;
    newGame();
}

function updateUfoExplosion() {
    if (ufoExplosion == true) {
        ufoExplosionFrameTimer -= secondsPassed;
        if (ufoExplosionFrameTimer < 0) {
            ufoExplosionFrame += 1;
            ufoExplosionFrameTimer = 0.1;
            if (ufoExplosionFrame == 10) {
                ufoExplosion = false;
            }
        }
    }
}

function drawUfoExplosion() {
    if (ufoExplosion == true) {
        let colour;
        if (ufoExplosionFrame % 2 == 0) {
            colour = "yellow";
        } else {
            colour = "red";
        }
        drawSprite(context, cannonExplosion[ufoExplosionFrame], ufoExplosionX, ufoExplosionY, pixelSize, colour);
    }
}

function getRandomUfoScore() {
    const scores = [50, 100, 150, 300];
    const randomIndex = Math.floor(Math.random() * scores.length);
    return scores[randomIndex];
}

function getOpacity(timer) {
    const duration = 5; // total seconds
    const midpoint = duration / 2;

    if (timer <= 0 || timer >= duration) return 0;

    // Fade in until midpoint, then fade out
    if (timer <= midpoint) {
        return timer / midpoint; // 0 to 1
    } else {
        return (duration - timer) / midpoint; // 1 to 0
    }
}

function displaySound() {
    if (mute == true) {
        context.drawImage(soundOff, baseWidth / 2 - 25, 915, 50, 58);
    } else {
        context.drawImage(soundOn, baseWidth / 2 - 25, 915, 50, 58);
    }
}

// #endregion
