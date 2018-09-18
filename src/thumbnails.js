const fs = require("fs")
const glob = require("glob")
const path = require("path")
const sharp = require("sharp")

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

const processFilePathSharp = function(
  filePath,
  size,
  newDirectory,
  newExtension
) {
  let { name } = path.parse(filePath)
  let newFilePath = path.join(newDirectory, `${name}.${newExtension}`)

  ensureDirectoryExists(newFilePath)

  return sharp(filePath)
    .rotate()
    .resize(size, size)
    .toFile(newFilePath)
    .then(_ => {
      return {
        path: newFilePath,
        status: "success"
      }
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
      filePaths.map(filePath =>
        processFilePathSharp(
          filePath,
          options.size,
          options.newDirectory,
          options.newExtension
        )
      )
    )
  })
}

exports.create = create
