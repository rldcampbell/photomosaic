const sharp = require("sharp")

const stitch = function(tiles, size, shape) {
  const channels = 3
  const mBuffer = Buffer.alloc(size * size * shape[0] * shape[1] * 3)

  // temp
  const colour = "rgb" // "none" | "tint" | "rgb"

  return Promise.all(
    tiles.map(tile => {
      let shrp = sharp(tile.path)

      if (colour === "tint") shrp = shrp.tint(tile.rgb)

      shrp
        .raw()
        .toBuffer()
        .then(t => {
          let multiplier =
            colour === "rgb"
              ? [
                  tile.rgb[0] / tile.rgbThumb[0],
                  tile.rgb[1] / tile.rgbThumb[1],
                  tile.rgb[2] / tile.rgbThumb[2]
                ]
              : [1, 1, 1]
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
                mBuffer[index] = Math.min(
                  t[size * l * channels + k * channels + m] * multiplier[m],
                  255
                )
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
