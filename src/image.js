const zeros = require("zeros")
const warp = require("ndarray-warp")
const ndarray = require("ndarray")
const ndhelpers = require("./ndarray.js")

const crop = function(input, options = {}) {
  let { aspectRatio, x, y, width, height } = options

  if (!(width && height) && aspectRatio) {
    if (width) {
      height = ~~(width / aspectRatio)
    } else if (height) {
      width = ~~(height * aspectRatio)
    } else if (aspectRatio > input.shape[0] / input.shape[1]) {
      width = input.shape[0]
      height = ~~(width / aspectRatio)
    } else {
      height = input.shape[1]
      width = ~~(height * aspectRatio)
    }
  }

  width = width || input.shape[0]
  height = height || input.shape[1]
  x = x || 0
  y = y || 0

  width = Math.min(width, input.shape[0] - x) // can't be bigger than original
  height = Math.min(height, input.shape[1] - y) // can't be bigger than original

  if (options.align) {
    let align = options.align.substr(0, 1).toLowerCase()

    switch (align) {
      case "l":
        x = 0
        break
      case "c":
        x = Math.floor((input.shape[0] - width) / 2)
        break
      case "r":
        x = Math.floor(input.shape[0] - width)
        break
    }
  }

  if (options.valign) {
    let valign = options.valign.substr(0, 1).toLowerCase()

    switch (valign) {
      case "t":
        y = 0
        break
      case "m":
        y = Math.floor((input.shape[1] - height) / 2)
        break
      case "b":
        y = Math.floor(input.shape[1] - height)
        break
    }
  }

  let result = input.lo(x, y).hi(width, height)

  if (options.hard) {
    let data = reduce(
      result,
      (p, c) => {
        p.push(c)
        return p
      },
      []
    )

    result = ndarray(data, result.shape)
  }

  return result
}

const rgba = function(input) {
  const n = input.size / 4

  return ndhelpers.reduce2(
    input,
    (tally, value, i, j, k) => {
      tally[k] += value / n
      return tally
    },
    [0, 0, 0, 0]
  )
}

const rgb = function(input) {
  const n = input.size / 3

  return ndhelpers.reduce2(
    input,
    (tally, value, i, j, k) => {
      tally[k] += value / n
      return tally
    },
    [0, 0, 0]
  )
}

const reduce = function(input, func, init) {
  for (let i = 0; i < input.shape[0]; i++) {
    for (let j = 0; j < input.shape[1]; j++) {
      for (let k = 0; k < input.shape[2]; k++) {
        init = func(
          init,
          input.get(i, j, k),
          input.shape[1] * i + input.shape[2] * j + k
        )
      }
    }
  }
  return init
}

const scale = function(input, scaleFactor = 1) {
  if (!Array.isArray(scaleFactor)) scaleFactor = [scaleFactor, scaleFactor]

  let output = zeros([
    Math.ceil(input.shape[0] * scaleFactor[0]),
    Math.ceil(input.shape[1] * scaleFactor[1]),
    4
  ])

  warp(output, input, (out, inp) => {
    out[0] = inp[0] / scaleFactor[0]
    out[1] = inp[1] / scaleFactor[1]
    out[2] = inp[2]
  })

  return output
}

const scaleTo = function(input, shape, min = false) {
  if (!Array.isArray(shape)) {
    if (input.shape[0] > input.shape[1] && !min) {
      shape = [shape, (input.shape[1] * shape) / input.shape[0]]
    } else {
      shape = [(input.shape[0] * shape) / input.shape[1], shape]
    }
  }

  return scale(input, [shape[0] / input.shape[0], shape[1] / input.shape[1]])
}

const tile = function(input, options) {
  // 5darray??
  // ignore scaling to begin with...
  // let shape = [
  //   options.shape[0],
  //   options.shape[1],
  //   Math.floor(input.shape[0] / options.shape[0]),
  //   Math.floor(input.shape[1] / options.shape[1]),
  //   4
  // ]
  // let result = ndarray(input.data, shape)
  // hmmm...

  //ndarray of ndarray?
  // ignore cropping for now...

  let nx = ~~(input.shape[0] / options.shape[0])
  let ny = ~~(input.shape[1] / options.shape[1])
  let x0 = ~~((input.shape[0] - options.shape[0] * nx) / 2)
  let y0 = ~~((input.shape[1] - options.shape[1] * ny) / 2)
  let tiles = zeros(options.shape, "array")
  for (let i = 0; i < options.shape[0]; i++) {
    for (let j = 0; j < options.shape[1]; j++) {
      tiles.set(
        i,
        j,
        crop(input, { width: nx, height: ny, x: x0 + i * nx, y: y0 + j * ny })
      )
    }
  }
  return tiles
}

exports.crop = crop
exports.rgb = rgb
exports.rgba = rgba
exports.scale = scale
exports.scaleTo = scaleTo
exports.tile = tile
