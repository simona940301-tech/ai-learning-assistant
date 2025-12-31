// Lightweight stub for the native `canvas` package used by pdfjs-dist in Node builds.
// We don't rely on server-side canvas rendering, so a no-op implementation avoids
// native bindings while keeping module resolution happy.

class StubCanvas {
  constructor(width = 0, height = 0) {
    this.width = width
    this.height = height
  }

  // Minimal 2D context with the methods pdfjs might touch during import-time checks
  getContext() {
    return {
      fillRect: () => {},
      clearRect: () => {},
      drawImage: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      bezierCurveTo: () => {},
      save: () => {},
      restore: () => {},
      scale: () => {},
      rotate: () => {},
      translate: () => {},
      setTransform: () => {},
      transform: () => {},
      stroke: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createPattern: () => null,
    }
  }

  toBuffer() {
    return Buffer.alloc(0)
  }
}

function createCanvas(width = 0, height = 0) {
  return new StubCanvas(width, height)
}

function loadImage() {
  return Promise.reject(new Error('canvas loadImage is not available in this environment'))
}

module.exports = {
  Canvas: StubCanvas,
  createCanvas,
  loadImage,
  default: {
    Canvas: StubCanvas,
    createCanvas,
    loadImage,
  },
}
