const fs = require("fs")
const glob = require("glob")
const path = require("path")
const sharp = require("sharp")
const buffer = require("./buffer.js")

const globPromise = function(pattern, options = {}) {
  return new Promise(function(resolve, reject) {
    glob(pattern, options, function(err, filePaths) {
      if (err) reject(err)
      else resolve(filePaths)
    })
  })
}

const ensureDirectoryExists = function(filePath) {
  let dirName = path.dirname(filePath)
  if (fs.existsSync(dirName)) return true
  ensureDirectoryExists(dirName)
  fs.mkdirSync(dirName)
}

const process = function(filePath, size) {
  const image = sharp(filePath)

  return image
    .metadata()
    .then(metadata => {
      if (metadata.width !== size || metadata.height !== size)
        // thumbnail is incorrect size
        throw new Error(
          `Thumbnail size is ${metadata.width}x${
            metadata.height
          }. Expected ${size}x${size}.`
        )

      return image
        .resize(10, 10)
        .raw()
        .toBuffer({ resolveWithObject: true })
        .then(({ data, info }) => {
          return {
            path: filePath,
            status: "success",
            data,
            rgb: buffer.meanRGB(data),
            channels: info.channels,
            uses: 0
          }
        })
    })
    .catch(err => {
      return {
        path: filePath,
        status: "failed",
        err
      }
    })
}

const processNew = function(
  filePath,
  size,
  newDirectory,
  newExtension,
  newPrefix,
  suffix
) {
  let name
  if (newPrefix) {
    name = `${newPrefix}${suffix}`
  } else {
    name = path.parse(filePath).name
  }

  if (newExtension.charAt(0) === ".") newExtension = newExtension.substr(1)
  let newFilePath = path.join(newDirectory, `${name}.${newExtension}`)

  ensureDirectoryExists(newFilePath)

  return sharp(filePath)
    .rotate()
    .resize(size, size)
    .toFile(newFilePath)
    .then(_ => {
      return process(newFilePath, size)
    })
    .catch(err => {
      return {
        path: newFilePath,
        status: "failed",
        err
      }
    })
}

const create = function(options) {
  options = Object.assign(
    {
      globPattern: "./*.jpg",
      size: 100,
      newDirectory: "./_thumbnails/",
      newExtension: "jpg"
    },
    options
  )

  return globPromise(options.globPattern).then(function(filePaths) {
    return Promise.all(
      filePaths.map((filePath, i) =>
        processNew(
          filePath,
          options.size,
          options.newDirectory,
          options.newExtension,
          options.newPrefix,
          i + 1
        )
      )
    )
  })
}

const get = function(options) {
  options = Object.assign(
    {
      globPattern: "./_thumbnails/*.jpg",
      size: 100
    },
    options
  )

  return globPromise(options.globPattern).then(function(filePaths) {
    return Promise.all(
      filePaths.map(filePath => process(filePath, options.size))
    )
  })
}

exports.create = create
exports.get = get
