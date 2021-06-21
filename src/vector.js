function add (a, b) {
  return {
    x: a.x + b.x,
    y: a.y + b.y
  }
}

function subtract (a, b) {
  return {
    x: a.x - b.x,
    y: a.y - b.y
  }
}

function scale (p, scale) {
  return {
    x: p.x * scale,
    y: p.y * scale
  }
}

function rotate (p, a, origin = { x: 0, y: 0 }) {
  const dx = p.x - origin.x
  const dy = p.y - origin.y
  return {
    x: origin.x + (dx * Math.cos(a)) - (dy * Math.sin(a)),
    y: origin.y + (dy * Math.cos(a)) + (dx * Math.sin(a))
  }
}

function direction (v) {
  const a = Math.atan(v.x / v.y)
  if (v.y > 0) return a + Math.PI
  else return a
}

function length (v) {
  return Math.sqrt((v.x * v.x) + (v.y * v.y))
}

export default {
  add,
  subtract,
  sub: subtract,
  scale,
  rotate,
  direction,
  length,
  len: length
}
