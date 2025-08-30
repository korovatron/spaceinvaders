class Missile {
  constructor(x, y, speed = 200  , direction='up' ) {
    this.x = x;
    this.y = y;
    this.width = 1;
    this.height = 8;
    this.speed = speed;
    this.direction = direction;
    this.active = true;
  }

  update(secondsPassed) {
  this.prevY = this.y;

  // Speed is now pixels per second
  const distance = this.speed * secondsPassed;
  this.y += this.direction === 'down' ? distance : -distance;

  // Deactivate if off-screen
  if (this.direction === 'up' && (this.y + this.height) < 3*32) {
    this.active = false;
  } else if (this.direction === 'down' && this.y >  28 * 32) {
    this.active = false;
  }
}

  draw(ctx, color = '#fff') {
    ctx.fillStyle = color;
    ctx.fillRect(
      this.x,
      this.y,
      this.width * pixelSize,
      this.height * pixelSize
    );
  }
}
  