const sharp = require("sharp")
const { reduce2 } = require("./ndarray.js")

const stitch = function(pathndarray, size, shape) {
  // assumes all images have same dimensions!
  // may change input format, this is just proof of concept...
  // concept is very good!
  const channels = 3
  const mBuffer = Buffer.alloc(size * size * shape[0] * shape[1] * channels)

  return Promise.all(
    reduce2(
      pathndarray,
      (promises, tile, i, j) => {
        promises.push(
          sharp(tile)
            .raw()
            .toBuffer()
            .then(t => {
              for (let k = 0; k < size; k++) {
                for (let l = 0; l < size; l++) {
                  for (let m = 0; m < 3; m++) {
                    // work out index entry for buffer
                    let nCompleteImages = shape[0] * j * size * size * 3
                    let nCompleteRows = shape[0] * l * size * 3
                    let nCurrentCompleteRow = i * size * 3
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
        )
        return promises
      },
      []
    )
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

// const stitch = function(pathndarray, size, shape) {
//   const baseOptions = {
//     create: {
//       width: size * shape[0],
//       height: size * shape[1],
//       channels: 3,
//       background: "black"
//     }
//   }

//   const canvasOptions = {
//     raw: {
//       width: size * shape[0],
//       height: size * shape[1],
//       channels: 3
//     }
//   }

//   let base = sharp(baseOptions)
//     .raw()
//     .toBuffer()

//   return reduce2(
//     pathndarray,
//     (p, c, i, j) => {
//       return p.then(canvas => {
//         global.gc()
//         // console.log(process.memoryUsage())
//         return sharp(canvas, canvasOptions)
//           .overlayWith(c, {
//             left: i * size,
//             top: j * size
//           })
//           .raw()
//           .toBuffer()
//       })
//     },
//     base
//   ).then(canvas => sharp(canvas, canvasOptions))
// }

module.exports = stitch
