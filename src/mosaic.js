const thumbnails = require("./thumbnails.js")
const buffer = require("./buffer.js")
const sharp = require("sharp")
const tiles = require("./tiles.js")
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

    pic.forEach(p => {
      let dist = function(rgb) {
        return [p.rgb[0] - rgb[0], p.rgb[1] - rgb[1], p.rgb[2] - rgb[2]].reduce(
          (p, c) => p + Math.abs(c),
          0
        )
      }
      let index = best(tms, dist)

      p.path = tms[index].path

      if (tms[index].uses === reuseLimit) {
        // remove...
        tms.splice(index, 1)
      }
    })

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
