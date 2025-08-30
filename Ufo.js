class Ufo {
    constructor(color = 'red', moving = true) {
        const randomSign = Math.random() < 0.5 ? -1 : 1;
        if (randomSign < 0) {
            this.x = baseWidth;
            this.speed = -96;
        } else {
            this.x = -64;
            this.speed = 96;
        }

        this.y = 145;
        this.width = 16;
        this.height = 8;
        this.active = false;
        this.color = color;
        this.moving = moving;
    }

    update(delta) {
        if (this.active && this.moving) {
            this.x += this.speed * delta;
                 if (this.speed < 0) {
                if (this.x < -64) {
                    this.active = false;
                    ufoTimer = Math.floor(Math.random() * 11) + 20;
                }
            } else {
                if (this.x > baseWidth) {
                    this.active = false;
                    ufoTimer = Math.floor(Math.random() * 11) + 20;
                }
            }
        }
    }

    draw() {
        if (!this.active) return;

        const sprite = [
            [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
            [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0],
            [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ];

        drawSprite(context, sprite, this.x, this.y, 4, this.color);
    }

    isActive() {
        return this.active;
    }

    setActive(active) {
        this.active = active;
    }

    setX(x) {
        this.x = x;
    }

    setY(y) {
        this.y = y;
    }
}
