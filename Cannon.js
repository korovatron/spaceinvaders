class Cannon {
  #x;
  #y;

  constructor(x, y) {
    this.#x = x;
    this.#y = y;
    this.width = 16;
    this.height = 8;
    this.pixelSize = 4;
    this.sprite = [
      [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ];
  }

  get x() {
    return this.#x;
  }

  set x(value) {
    this.#x = value;
  }

  get y() {
    return this.#y;
  }

  set y(value) {
    this.#y = value;
  }

  moveLeft(distance, boundary = 0) {
    this.#x = Math.max(boundary, this.#x - distance);
  }

  moveRight(distance, boundary = baseWidth) {
    const cannonPixelWidth = this.width * this.pixelSize;
    this.#x = Math.min(boundary - cannonPixelWidth, this.#x + distance);
  }

  draw() {
    drawSprite(context, this.sprite, this.x, this.y, this.pixelSize, "yellow");
  }
}
