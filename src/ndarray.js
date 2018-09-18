const ndarray = require("ndarray")

const reduce = function(input, func, init) {
  const len = input.shape.length
  let it = 0

  const nested = function(ns, input, func, init) {
    if (ns.length === len) {
      init = func(init, input.get(...ns), it++)
    } else {
      for (let i = 0; i < input.shape[ns.length]; i++) {
        init = nested(ns.slice().concat(i), input, func, init)
      }
    }
    return init
  }

  return nested([], input, func, init)
}

const reduce2 = function(input, func, init) {
  const len = input.shape.length

  const nested = function(ns, input, func, init) {
    if (ns.length === len) {
      init = func(init, input.get(...ns), ...ns)
    } else {
      for (let i = 0; i < input.shape[ns.length]; i++) {
        init = nested(ns.slice().concat(i), input, func, init)
      }
    }
    return init
  }

  return nested([], input, func, init)
}

const map = function(input, func) {
  let data = reduce(
    input,
    (p, c, i) => {
      p.push(func(c, i))
      return p
    },
    []
  )
  return ndarray(data, input.shape)
}

const map2 = function(input, func) {
  let data = reduce2(
    input,
    (p, c, ...ns) => {
      p.push(func(c, ...ns))
      return p
    },
    []
  )
  return ndarray(data, input.shape)
}

exports.map = map
exports.map2 = map2
exports.reduce = reduce
exports.reduce2 = reduce2

// needs testing!
