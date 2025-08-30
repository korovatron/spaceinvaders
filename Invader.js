class Invader {

    static direction = "left";
    type = "A"; // A, B or C
    frame = 0; // 0 or 1
    x = 0;
    y = 0;
    explode = false;
    dead = false;
    moving = true;
    width = 8;  // logical units, adjust to match sprite width
    height = 8;  // logical units, adjust to match sprite height
    explosionFrame = 0;
    explosionTimer;

    constructor(type, frame, x, y) {
        this.type = type;
        this.frame = frame;
        this.x = x;
        this.y = y;
        this.dead = false;
        this.explode = false;
        this.moving = true;
        this.explosionFrame = 0;
        this.explosionTimer = 0.05;
    }

    static toggleDirection() {
        Invader.direction = (Invader.direction === "left") ? "right" : "left";
    }

    toggleFrame() {
        if (this.type != "D") {
            this.frame = this.frame === 0 ? 1 : 0;
        }
    }

    draw(ctx) {
        let sprite;
        if (this.dead) return; // Skip if destroyed
        if (this.type == "D") {
            sprite = getInvaderSprite(this.type, this.explosionFrame);
        } else {

            sprite = getInvaderSprite(this.type, this.frame);

        }

        const pixelSize = 4; // Scaled up from original
        let color;
        switch (this.type) {
            case "A":
                color = "magenta";
                break;
            case "B":
                color = "cyan";
                break;
            case "C":
                color = "#39FF14";
                break;
            case "D":
                switch (this.explosionFrame) {
                    case 0:
                        color = "yellow";
                        break;
                    case 1:
                        color = "red";
                        break;
                    case 2:
                        color = "yellow";
                        break;
                    default:
                        break;
                }
                break;
            default:
                color = "white";
                break;
        }

        drawSprite(ctx, sprite, this.x, this.y, pixelSize, color);
    }

    isMoving() {
        return this.moving;
    }

    setMoving(val) {
        this.moving = val;
    }

    getType() {
        return this.type;
    }

    setType(value) {
        this.type = value;
    }

    setX(x) {
        this.x = x;
    }

    getX() {
        return this.x;
    }

    setExplode(value) {
        this.explode = value;
    }

    isExploding() {
        return this.explode;
    }

    updateExplosion(deltaTime) {
        this.explosionTimer -= deltaTime;
        if (this.explosionTimer < 0) {
            this.explosionFrame += 1;
            if (this.explosionFrame == 3) {
                this.dead = true;
                this.explosionTimer = 0.05;
                return true;
            } else {
                this.explosionTimer = 0.05;
                return false;
            }
        }
    }

    isDead() {
        return this.dead;
    }

}