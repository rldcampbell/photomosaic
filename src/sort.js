const light = function(a, b) {
  return b.brightness - a.brightness
}

const middle = function(a, b) {
  return Math.abs(a.brightness - 127.5) - Math.abs(b.brightness - 127.5)
}

const dark = function(a, b) {
  return a.brightness - b.brightness
}

exports.light = light
exports.middle = middle
exports.dark = dark
