class Shield {
    constructor(x, y, rows = 16, cols = 24, tileSize = 1) {
        this.x = x;
        this.y = y;
        this.rows = rows;
        this.cols = cols;
        this.tileSize = tileSize;
        const shieldShape = [
            "000000000000000000000000",
            "000000111111111111000000",
            "000011111111111111110000",
            "000111111111111111111000",
            "001111111111111111111100",
            "011111111111111111111110",
            "011111111111111111111110",
            "111111111111111111111111",
            "111111111111111111111111",
            "111111110000000011111111",
            "111111100000000001111111",
            "111111000000000000111111",
            "111110000000000000011111",
            "111100000000000000001111",
            "111000000000000000000111",
            "011000000000000000000110"
        ];

        this.tiles = shieldShape.map(row =>
            row.split("").map(char => (char === "1" ? 0 : 3)) // 3 = destroyed
        );

        this.damageVisuals = Array.from({ length: this.rows }, () =>
            Array.from({ length: this.cols }, () => ({
                chipX: Math.floor(Math.random() * 3),
                chipY: Math.floor(Math.random() * 3),
                scuffX: Math.floor(Math.random() * 2),
                scuffY: Math.floor(Math.random() * 2),
                extraChip: Math.random() < 0.5
            }))
        );

    }

    draw(ctx, shieldsOn) {

        if (shieldsOn == true) {

            const pixelSize = this.tileSize * 4;
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    const tile = this.tiles[r][c];
                    if (tile === 3) continue;
                    const px = this.x + c * this.tileSize * pixelSize;
                    const py = this.y + r * this.tileSize * pixelSize;
                    const visual = this.damageVisuals[r][c];

                    if (tile === 0) {
                        // Fresh shield – bright red
                        ctx.fillStyle = "#FF3030"; // Firebrick
                        ctx.fillRect(px, py, pixelSize, pixelSize);
                    } else if (tile === 1) {
                        // Slightly damaged – medium red
                        ctx.fillStyle = "#B22222"; // Crimson
                        ctx.fillRect(px, py, pixelSize, pixelSize);
                        ctx.clearRect(px + 1 + visual.chipX, py + 1 + visual.chipY, 2, 2);
                    } else if (tile === 2) {
                        // Heavily damaged – deep red
                        ctx.fillStyle = "#8B0000"; // DarkRed
                        ctx.fillRect(px, py, pixelSize, pixelSize);
                        ctx.clearRect(px + visual.scuffX, py + visual.scuffY, 3, 3);
                        if (visual.extraChip) {
                            const chipX = px + Math.floor(Math.random() * (pixelSize - 2));
                            const chipY = py + Math.floor(Math.random() * (pixelSize - 2));
                            ctx.clearRect(chipX, chipY, 1, 1);
                        }
                    }
                }
            }

        }

    }

    applyBlastDamage(row, col) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const r = row + dr;
                const c = col + dc;
                if (
                    r >= 0 && r < this.rows &&
                    c >= 0 && c < this.cols &&
                    this.tiles[r][c] < 3
                ) {
                    this.tiles[r][c]++;
                }
            }
        }
    }

    checkCollision(missile) {
        if (shieldsOn == true) {
            const pixelSize = this.tileSize * 4;
            const relX = missile.x - this.x;
            const col = Math.floor(relX / pixelSize);
            const startY = Math.min(missile.prevY, missile.y);
            const endY = Math.max(missile.prevY + missile.height * pixelSize, missile.y + missile.height * pixelSize);
            const step = 1;
            let hitRow = -1;
            for (let y = startY; y <= endY; y += step) {
                const relY = y - this.y;
                const row = Math.floor(relY / pixelSize);
                if (
                    row >= 0 && row < this.rows &&
                    col >= 0 && col < this.cols &&
                    this.tiles[row][col] < 3
                ) {
                    hitRow = row;
                    break;
                }
            }
            if (hitRow !== -1) {
                let targetRow = hitRow;
                if (missile.direction === 'down') {
                    for (let r = hitRow; r >= 0; r--) {
                        if (this.tiles[r][col] < 3) {
                            targetRow = r;
                        }
                    }
                }
                if (missile.direction === 'up') {
                    for (let r = hitRow; r < this.rows; r++) {
                        if (this.tiles[r][col] < 3) {
                            targetRow = r;
                        }
                    }
                }
                this.applyBlastDamage(targetRow, col);
                // this.tiles[targetRow][col] += 1;
                missile.active = false;
                return true;
            }
            return false;
        } else {
            return false;
        }

    }

}
