const sharp = require("sharp")

const stitch = function(tiles, size, shape) {
  const channels = 3
  const mBuffer = Buffer.alloc(size * size * shape[0] * shape[1] * 3)

  return Promise.all(
    tiles.map(tile => {
      sharp(tile.path)
        .raw()
        .toBuffer()
        .then(t => {
          for (let k = 0; k < size; k++) {
            for (let l = 0; l < size; l++) {
              for (let m = 0; m < 3; m++) {
                // work out index entry for buffer
                let nCompleteImages = shape[0] * tile.j * size * size * 3
                let nCompleteRows = shape[0] * l * size * 3
                let nCurrentCompleteRow = tile.i * size * 3
                let nCompletePixels = k * 3
                let index =
                  nCompleteImages +
                  nCompleteRows +
                  nCurrentCompleteRow +
                  nCompletePixels +
                  m
                mBuffer[index] = t[size * l * channels + k * channels + m]
              }
            }
          }
        })
    })
  ).then(_ => {
    return sharp(mBuffer, {
      raw: {
        width: size * shape[0],
        height: size * shape[1],
        channels: 3
      }
    })
  })
}

module.exports = stitch
