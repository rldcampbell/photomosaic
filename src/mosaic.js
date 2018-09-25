const sort = require("./sort.js")
const stitch = require("./stitch.js")
const thumbnails = require("./thumbnails.js")
const imageTiles = require("./tiles.js")
const path = require("path")
const fs = require("fs")
const stripJSONComments = require("strip-json-comments")

const extend = function(a, ...args) {
  return args.reduce(merge, a || {})
}

const merge = function(a, b) {
  if (typeof b === "object") {
    for (let key in b) {
      a[key] = b[key]
    }
  }
  return a
}

let options

try {
  let configPath = path.resolve(process.argv[2] || "config.json")
  let configJSON = fs.readFileSync(configPath, "utf-8")
  configJSON = stripJSONComments(configJSON)
  options = JSON.parse(configJSON)
} catch (err) {
  options = {}
  console.warn("Warning: No configuration file found. Using default settings.")
}

const { image, shape, colour, tiles, assign, output } = extend(
  {
    image: "original.jpg",
    shape: [20, 20],
    colour: "none",
    tiles: {
      size: 100,
      get: "./_thumbnails/*.*"
    },
    assign: {
      method: "pixel",
      priority: "middle",
      reuse: 0
    },
    output: "photomosaic.jpg"
  },
  options
)

const size = tiles.size

// make more modular - so it's easy to change comparison method, pool reuse, ...

console.time("total time")
console.time("thumbnail time")

let thumbs = tiles.create
  ? thumbnails.create({
      globPattern: tiles.source,
      size,
      newDirectory: tiles.target.directory,
      newExtension: tiles.target.extension
    })
  : thumbnails.get({
      size,
      globPattern: tiles.get
    })

thumbs = thumbs.then(ts => {
  console.timeEnd("thumbnail time")
  const len = ts.length
  let succeeded = ts.filter(t => t.status === "success")
  const lenSucceeded = succeeded.length
  const lenFailed = len - lenSucceeded
  if (lenFailed)
    console.warn(
      `Warning: ${lenFailed} out of ${len} matched path${
        lenFailed === 1 ? "" : "s"
      } failed during loading`
    )
  if (lenSucceeded === 0)
    throw new Error("No thumbnails loaded. Cannot create photomosaic.")
  if (assign.reuse > 0 && lenSucceeded * assign.reuse < shape[0] * shape[1]) {
    throw new Error(
      `Not enough thumbnails to create photomosaic. ${Math.ceil(
        (shape[0] * shape[1]) / assign.reuse
      )} required, ${lenSucceeded} loaded`
    )
  }
  return Promise.all(succeeded)
})

let picture = imageTiles.fromPath(image, shape)

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

    pic.sort(sort[assign.priority])

    pic.forEach(p => {
      let distRGB = function(thumb) {
        return (
          [
            p.rgb[0] - thumb.rgb[0],
            p.rgb[1] - thumb.rgb[1],
            p.rgb[2] - thumb.rgb[2]
          ].reduce((p, c) => p + Math.abs(c), 0) /
          (3 * 255)
        ) // normalize to 1
      }

      let dist = function(thumb) {
        return norm2(thumb.data, p.data)
      }

      let index = best(tms, assign.method === "rgb" ? distRGB : dist)

      p.path = tms[index].path
      p.rgbThumb = tms[index].rgb

      if (tms[index].uses === assign.reuse) {
        // remove once reached reuse limit
        tms.splice(index, 1)
      }
    })

    return pic
  })
  .then(pic => {
    console.timeEnd("assign time")
    console.time("render time")
    return stitch(pic, size, shape, colour)
  })
  .then(img => img.toFile(output))
  .then(_ => {
    console.timeEnd("render time")
    console.log(`"${output}" created`)
    console.timeEnd("total time")
  })
  .catch(console.error)
