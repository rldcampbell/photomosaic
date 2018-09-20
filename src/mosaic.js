const thumbnails = require("./thumbnails.js")
const buffer = require("./buffer.js")
const sharp = require("sharp")
const tiles = require("./tiles.js")
const { reduce2 } = require("./ndarray.js")
const stitch = require("./stitch.js")

// temp
const inputFilePath = "./test_data/7516757216_IMG_1030.JPG"
const size = 100
const shape = [50, 50]
const outputFilePath = "./_LATEST_TEST.jpg"
const reuseLimit = 10

// make more modular - so it's easy to change comparison method, pool reuse, ...

console.time("total time")
console.time("thumbnail time")

let thumbs = thumbnails
  .create({
    globPattern: "./test_data/*.*",
    size: size,
    newDirectory: "./_thumbnails/",
    newExtension: "jpg"
  })
  .then(ts => {
    console.timeEnd("thumbnail time")
    let succeeded = ts.filter(t => t.status === "success")
    if (reuseLimit > 0 && succeeded.length * reuseLimit < shape[0] * shape[1]) {
      throw new Error("Not enough thumbnails to create photomosaic")
    }
    return Promise.all(
      succeeded.map(t => {
        return sharp(t.path)
          .raw()
          .toBuffer()
          .then(data => ({
            path: t.path,
            rgba: buffer.meanRGB(data),
            uses: 0
          }))
      })
    )
  })

let picture = tiles.fromPath(inputFilePath, shape)

const best = function(pool, distFunc) {
  let index = 0
  let best = 255 * 3
  let len = pool.length
  for (let i = 0; i < len; i++) {
    let d = distFunc(pool[i].rgba)
    if (d < best) {
      best = d
      index = i
    }
  }

  pool[index].uses += 1

  return index
}

Promise.all([thumbs, picture])
  .then(a => {
    console.time("assign time")
    let tms = a[0]
    let pic = a[1]
    for (let i = 0; i < pic.shape[0]; i++) {
      for (let j = 0; j < pic.shape[1]; j++) {
        let rgbVals = getRGB(pic.get(i, j)).slice(0, 3)
        let dist = function(rgb) {
          return [
            rgbVals[0] - rgb[0],
            rgbVals[1] - rgb[1],
            rgbVals[2] - rgb[2]
          ].reduce((p, c) => p + Math.abs(c), 0)
        }
        // tms.sort((a, b) => {
        //   return dist(a.rgba) - dist(b.rgba)
        // })
        // pic.set(i, j, tms[0].path)
        let index = best(tms, dist)

        pic.set(i, j, tms[index].path)

        if (tms[index].uses === reuseLimit) {
          // remove...
          tms.splice(index, 1)
        }
      }
    }
    return pic
  })
  .then(pic => {
    console.timeEnd("assign time")
    console.time("render time")
    return stitch(pic, size, shape)
  })
  .then(img => img.toFile(outputFilePath))
  .then(_ => {
    console.timeEnd("render time")
    console.log(`"${outputFilePath}" created`)
    console.timeEnd("total time")
  })

function getRGB(input) {
  const n = input.size / input.shape[2]
  return reduce2(
    input,
    (tally, value, i, j, k) => {
      tally[k] += value / n
      return tally
    },
    new Array(input.shape[2]).fill(0)
  )
}
