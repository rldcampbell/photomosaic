const sharp = require("sharp")
const buffer = require("./buffer.js")

const fromPath = function(filePath, shape) {
  return sharp(filePath)
    .metadata()
    .then(info => {
      const step = 10
      const dims = shape.map(v => step * v)

      const resized = sharp(filePath)
        .rotate()
        .resize(...dims)

      const tiles = []

      for (let i = 0; i < shape[0]; i++) {
        for (let j = 0; j < shape[1]; j++) {
          tiles[i * shape[1] + j] = resized
            .clone()
            .extract({
              width: step,
              height: step,
              left: i * step,
              top: j * step
            })
            .raw()
            .toBuffer({ resolveWithObject: true })
            .then(({ data, info }) => {
              return {
                i: i,
                j: j,
                data: data,
                rgb: buffer[info.channels === 3 ? "meanRGB" : "meanRGBA"](
                  data
                ).slice(0, 3),
                channels: info.channels
              }
            })
        }
      }

      return Promise.all(tiles)
    })
}

exports.fromPath = fromPath
