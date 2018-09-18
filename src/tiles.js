const sharp = require("sharp")
const ndarray = require("ndarray")
const zeros = require("zeros")
const { crop } = require("./image.js")

const fromPath = function(filePath, shape) {
  return sharp(filePath)
    .metadata()
    .then(info => {
      let dims = [info.width, info.height]
      let ratioA = info.width / info.height // image
      let ratioB = shape[0] / shape[1] // desired
      if (ratioA > ratioB) {
        dims[0] = dims[1] * ratioB
      } else {
        dims[1] = dims[0] / ratioB
      }
      let step = ~~(dims[0] / shape[0])
      dims[0] = shape[0] * step // make sure dimensions exactly divisible by tile numbers
      dims[1] = shape[1] * step
      return sharp(filePath)
        .rotate()
        .resize(...dims)
        .raw()
        .toBuffer()
        .then(buff => {
          // return ndarray(buff, [dims[0], dims[1], info.channels])
          return ndarray(
            buff,
            [dims[0], dims[1], info.channels],
            [info.channels, info.channels * dims[0], 1] // to get picture 'right way up'!
          )
        })
        .then(image => {
          let tiles = zeros(shape, "array")
          for (let i = 0; i < shape[0]; i++) {
            for (let j = 0; j < shape[1]; j++) {
              tiles.set(
                i,
                j,
                crop(image, {
                  x: i * step,
                  y: j * step,
                  width: step,
                  height: step
                })
              )
            }
          }
          return tiles
        })
    })
}

exports.fromPath = fromPath
