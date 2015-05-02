const lFunction = require('loophole').Function
const gFunction = global.Function

global.Function = lFunction

const isRequire = require('is-require')('require')
const core      = require('resolve/lib/core.json')
const position  = require('file-position')
const seval     = require('static-eval')
const acorn     = require('acorn')
const clone     = require('clone')
const path      = require('path')
const astw      = require('astw')

global.Function = gFunction

module.exports = selected

function selected(editor) {
  editor = editor || atom.workspace.getActiveEditor()

  var ranges = editor.getSelectedBufferRanges().slice()
  var buffer = editor.getBuffer()
  var fpn    = editor.getPath()
  var src    = buffer.getText()
  var ast    = acorn.parse(src, {
    locations: true,
    ecmaVersion: 6,
    allowReturnOutsideFunction: true,
    allowHashBang: true
  })

  var packages = []
  var lookup   = position(src)
  var dir      = path.dirname(fpn)
  var env      = {}

  env.__dirname  = dir
  env.__filename = fpn

  astw(ast)(function(node) {
    if (!isRequire(node)) return
    if (!node.arguments) return
    if (!node.arguments.length) return

    var dst = node.evalled = node.evalled || seval(node.arguments[0], env)
    if (!dst) return
    if (core.indexOf(dst) !== -1) return

    var included = false

    for (var i = 0; i < ranges.length; i++) {
      var loc = clone(node.loc)

      loc.start.line--
      loc.end.line--

      var a = getIndex(lookup, ranges[i])
      var b = getIndex(lookup, loc)

      if (included = overlap(a, b)) break
    }

    if (!included) return

    packages.push(dst)
  })

  return packages
}

function overlap(a, b) {
  if (a.end >= b.start && a.start <= b.start) return true
  if (b.end >= a.start && b.start <= a.start) return true
  if (a.start <= b.start && a.end >= b.end) return true
  if (b.start <= a.start && b.end >= a.end) return true
}

function getIndex(lookup, range, off) {
  off = off || 0

  return {
    start: lookup((range.start.row || range.start.line) + off, range.start.column)
    , end: lookup((range.end.row || range.end.line) + off, range.end.column)
  }
}
