const meanRGBA = function(buff) {
  const len = buff.length
  const n = len / 4
  return reduce(
    buff,
    (p, c, i) => {
      p[i % 4] += c / n
      return p
    },
    [0, 0, 0, 0]
  )
}

const meanRGB = function(buff) {
  const len = buff.length
  const n = len / 3
  return reduce(
    buff,
    (p, c, i) => {
      p[i % 3] += c / n
      return p
    },
    [0, 0, 0]
  )
}

const reduce = function(buff, func, init) {
  const len = buff.length
  for (let i = 0; i < len; i++) {
    init = func(init, buff.readUInt8(i), i)
  }
  return init
}

exports.meanRGB = meanRGB
exports.meanRGBA = meanRGBA
