const sharp = require("sharp")
const { reduce2 } = require("./ndarray.js")

const stitch = function(pathndarray, size, shape) {
  const baseOptions = {
    create: {
      width: size * shape[0],
      height: size * shape[1],
      channels: 3,
      background: "black"
    }
  }

  const canvasOptions = {
    raw: {
      width: size * shape[0],
      height: size * shape[1],
      channels: 3
    }
  }

  let base = sharp(baseOptions)
    .raw()
    .toBuffer()

  return reduce2(
    pathndarray,
    (p, c, i, j) => {
      return p.then(canvas => {
        global.gc()
        // console.log(process.memoryUsage())
        return sharp(canvas, canvasOptions)
          .overlayWith(c, {
            left: i * size,
            top: j * size
          })
          .raw()
          .toBuffer()
      })
    },
    base
  ).then(canvas => sharp(canvas, canvasOptions))
}

module.exports = stitch
