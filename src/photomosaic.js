const getPixels = require("get-pixels")
const savePixels = require("save-pixels")
const distance = require("ndarray-distance")
const fs = require("fs")
const glob = require("glob")
const { crop, rgba, scale, scaleTo, tile } = require("./image.js")

const globPromise = function(pattern, options = {}) {
  return new Promise(function(resolve, reject) {
    glob(pattern, options, function(err, paths) {
      if (err) reject(err)
      else resolve(paths)
    })
  })
}

const getPixelsPromise = function(path, type) {
  return new Promise(function(resolve, reject) {
    getPixels(path, type, function(err, pixels) {
      if (err) reject(err)
      else resolve(pixels)
    })
  })
}

const dataRGBA = function(path) {
  return getPixelsPromise(path).then(rgba)
}

const dataRGBA200 = function(path) {
  return getPixelsPromise(path).then(pixels => {
    global.gc()
    // console.log(Math.floor(process.memoryUsage().heapUsed / 1000) / 1000)
    return rgba(
      crop(scaleTo(pixels, 200, true), {
        hard: true,
        width: 200,
        height: 200,
        align: "c",
        valign: "m"
      })
    )
  })
}

const defaultOptions = {
  shape: 16, // or e.g. [16, 12]
  tileAspectRatio: 1,
  align: "c", // "l", "r"
  valign: "m", // "t", "b"
  tileRecycle: true,
  recycleTilesMax: 5
}

getPixelsPromise("./test_data/7516757216_IMG_1030.JPG").then(function(pixels) {
  const tileAspectRatio = 1 // width / height!
  const xtiles = 30

  let nx = ~~(pixels.shape[0] / xtiles)
  let ymax = ~~(pixels.shape[1] / (nx * tileAspectRatio))
  let ytiles = ~~((xtiles * ymax * tileAspectRatio) / (nx * xtiles))

  let tiles = tile(pixels, { shape: [xtiles, ytiles] })

  let square = cropper({ aspectRatio: 1, align: "c", valign: "m" })
  let squish = scaleToShape(100)

  const processImage = function(path) {
    return getPixelsPromise(path).then(function(pixels) {
      let image = squish(square(pixels))
      return {
        path,
        image,
        rgba: rgba(image)
      }
    })
  }

  globPromise("./test_data/*.@(jpg|jpeg|JPG|JPEG)").then(function(paths) {
    return Promise.all(paths.slice(0, 3).map(processImage)).then(images => {
      console.log(
        images.map(i => ({ path: i.path, rgba: i.rgba, shape: i.image.shape }))
      )
    })
  })
})

function scaleToShape(shape, min) {
  return function(input) {
    return scaleTo(input, shape, min)
  }
}

function cropper(options) {
  return function(input) {
    return crop(input, options)
  }
}
