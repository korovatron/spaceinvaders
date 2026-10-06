// High score name entry screen (gameState 3). The text is drawn on the canvas and the
// input and buttons are HTML elements laid over it so mobile keyboards work.

const NAME_STORAGE_KEY = 'spaceInvadersPlayerName';
const NAME_DISALLOWED_CHARS = /[^A-Za-z0-9 _-]/g;
const NAME_PANEL_Y = 575; // centre of the input and buttons, in canvas coordinates
const NAME_SAVED_DELAY_MS = 1000;

const nameEntry = { score: 0, wave: 1, rank: 1, message: '', messageColour: 'white', busy: false };
let nameEntryElements = null;

function getNameEntryElements() {
    if (nameEntryElements) {
        return nameEntryElements;
    }
    nameEntryElements = {
        panel: document.getElementById('nameEntry'),
        input: document.getElementById('nameInput'),
        submit: document.getElementById('nameSubmit'),
        skip: document.getElementById('nameSkip')
    };
    const { input, submit, skip } = nameEntryElements;

    input.addEventListener('input', () => {
        const cleaned = input.value.replace(NAME_DISALLOWED_CHARS, '').toUpperCase();
        if (cleaned !== input.value) {
            input.value = cleaned;
        }
        if (!nameEntry.busy) {
            setNameEntryMessage('');
        }
    });
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitName();
        } else if (e.key === 'Escape') {
            skipNameEntry();
        }
    });
    submit.addEventListener('click', submitName);
    skip.addEventListener('click', skipNameEntry);
    return nameEntryElements;
}

function setNameEntryMessage(text, colour = 'white') {
    nameEntry.message = text;
    nameEntry.messageColour = colour;
}

function setNameEntryBusy(busy) {
    const { input, submit, skip } = getNameEntryElements();
    nameEntry.busy = busy;
    input.disabled = busy;
    submit.disabled = busy;
    skip.disabled = busy;
}

function startNameEntry() {
    const { panel, input } = getNameEntryElements();
    nameEntry.score = finalScore;
    nameEntry.wave = finalWave;
    nameEntry.rank = leaderboardRankFor(finalScore);
    setNameEntryMessage('');
    setNameEntryBusy(false);
    try {
        input.value = (localStorage.getItem(NAME_STORAGE_KEY) || '').replace(NAME_DISALLOWED_CHARS, '').toUpperCase();
    } catch (e) {
        input.value = '';
    }
    gameState = 3;
    panel.style.display = 'flex';
    updateNameEntryLayout();
    input.focus({ preventScroll: true });
    input.select();
}

function hideNameEntry() {
    const { panel, input } = getNameEntryElements();
    panel.style.display = 'none';
    input.blur();
}

// Keeps the HTML controls aligned with the canvas as it scales
function updateNameEntryLayout() {
    if (gameState !== 3) {
        return;
    }
    const { panel } = getNameEntryElements();
    const canvasRect = canvas.getBoundingClientRect();
    const canvasScale = canvasRect.width / baseWidth;
    panel.style.left = `${canvasRect.left + (baseWidth / 2) * canvasScale}px`;
    panel.style.top = `${canvasRect.top + NAME_PANEL_Y * canvasScale}px`;
    panel.style.transform = `translate(-50%, -50%) scale(${canvasScale})`;
}

function submitName() {
    if (nameEntry.busy) {
        return;
    }
    const { input } = getNameEntryElements();
    const name = input.value.replace(/\s+/g, ' ').trim();
    if (name.length === 0) {
        setNameEntryMessage('ENTER A NAME', 'red');
        return;
    }
    if (!isNameAllowed(name)) {
        setNameEntryMessage('NAME NOT ALLOWED', 'red');
        return;
    }
    try {
        localStorage.setItem(NAME_STORAGE_KEY, name);
    } catch (e) {
        // storage unavailable; the name just won't be remembered
    }

    setNameEntryBusy(true);
    setNameEntryMessage('SAVING...');
    submitLeaderboardEntry(name, nameEntry.score, nameEntry.wave)
        .then(() => {
            const index = insertLeaderboardEntryLocally({ name, score: nameEntry.score, wave: nameEntry.wave, createdAt: new Date() });
            setNameEntryMessage('SCORE SAVED!', '#7CFC00');
            setTimeout(() => {
                if (gameState === 3) {
                    hideNameEntry();
                    returnToTitle();
                    showLeaderboardPageForRank(index);
                }
            }, NAME_SAVED_DELAY_MS);
        })
        .catch(err => {
            console.warn('Could not save score:', err);
            setNameEntryBusy(false);
            setNameEntryMessage('COULD NOT SAVE - TRY AGAIN', 'red');
        });
}

function skipNameEntry() {
    if (nameEntry.busy) {
        return;
    }
    hideNameEntry();
    returnToTitle();
}

function drawNameEntry(ctx) {
    ctx.drawImage(invaderLogo, 0, 0, 888, 390, baseWidth / 2 - 222, 0, 444, 195);

    ctx.font = "bold 50px Courier New";
    ctx.fillStyle = "yellow";
    drawCentredText(ctx, "NEW HIGH SCORE!", 290);

    ctx.font = "bold 30px Courier New";
    ctx.fillStyle = "white";
    drawCentredText(ctx, "SCORE " + nameEntry.score + "   WAVE " + nameEntry.wave, 345);
    drawCentredText(ctx, "RANK #" + nameEntry.rank, 390);
    drawCentredText(ctx, "ENTER YOUR NAME", 470);

    if (nameEntry.message) {
        ctx.fillStyle = nameEntry.messageColour;
        drawCentredText(ctx, nameEntry.message, 730);
    }
}
