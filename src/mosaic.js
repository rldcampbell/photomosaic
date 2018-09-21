const sort = require("./sort.js")
const stitch = require("./stitch.js")
const thumbnails = require("./thumbnails.js")
const tiles = require("./tiles.js")

// temp
const inputFilePath = "./test_data/7516757216_IMG_1055.JPG"
const size = 100
const shape = [25, 25]
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
    return Promise.all(succeeded)
  })

let picture = tiles.fromPath(inputFilePath, shape)

const reduce2 = function(arr1, arr2, func, init) {
  const len = Math.min(arr1.length, arr2.length)

  for (let i = 0; i < len; i++) {
    init = func(init, arr1[i], arr2[i], i)
  }

  return init
}

const dist2 = function(arr1, arr2) {
  return reduce2(
    arr1,
    arr2,
    (p, c1, c2) => {
      return p + Math.abs(c1 - c2)
    },
    0
  )
}

const norm2 = function(arr1, arr2) {
  return dist2(arr1, arr2) / (255 * Math.min(arr1.length, arr2.length))
}

const best = function(pool, distFunc) {
  let index = 0
  let best = 1
  let len = pool.length
  for (let i = 0; i < len; i++) {
    let d = distFunc(pool[i])
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

    pic.sort(sort.light)

    pic.forEach(p => {
      // let dist = function(thumb) {
      //   return (
      //     [
      //       p.rgb[0] - thumb.rgb[0],
      //       p.rgb[1] - thumb.rgb[1],
      //       p.rgb[2] - thumb.rgb[2]
      //     ].reduce((p, c) => p + Math.abs(c), 0) /
      //     (3 * 255)
      //   ) // normalize to 1
      // }

      let dist = function(thumb) {
        return norm2(thumb.data, p.data)
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
