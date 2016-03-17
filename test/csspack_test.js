'use strict'

const csspack = require('../lib/csspack')
const fs = require('../lib/promise/fs')
const glob = require('../lib/promise/glob')
const path = require('path')
const utils = require('./test_utils')
const assert = require('power-assert')

const expected = {}

describe('csspack', () => {
  before(() => {
    return Promise.all([
      'expected/foo.html',
      'expected/bar.html',
    ].map((p) => {
      const name = path.basename(p, path.extname(p))
      return fs.readFile(path.join(utils.fixtures, p))
        .then((content) => expected[name] = content)
    }))
  })

  afterEach(() => {
    return utils.cleanUp()
  })

  it('should generate files', () => {
    const writer = new Buffer(1000)
    return csspack({
      context: utils.fixtures,
      entry: 'src/html/**/*.html',
      output: 'dist',
      outWriter: writer,
    })
      .then(() => {
        assert(writer.toString().indexOf('Hash') === 0)
      })
      .then(() => Promise.all([
        fs.readFile(path.join(utils.fixtures, 'dist/foo.html')),
        fs.readFile(path.join(utils.fixtures, 'dist/zig/bar.html')),
      ]))
      .then((contents) => {
        assert(contents[0] === expected.foo)
        assert(contents[1] === expected.bar)
      })
  })

  it('should clean up temporary files', () => {
    const writer = new Buffer(1000)
    return csspack({
      context: utils.fixtures,
      entry: 'src/html/**/*.html',
      output: 'dist',
      outWriter: writer,
    })
      .then(() => {
        assert(writer.toString().indexOf('Hash') === 0)
      })
      .catch((err) => {
        console.log('catch err')
      })
      .then(() => glob(path.join(utils.fixtures, 'src/**/.*.?(js|js~)')))
      .then((paths) => {
        assert(paths.length === 0)
      })
  })

  describe('watch', () => {

    it('should regenerate when added/changed and remove when removed', () => {
      const writer = new Buffer(1000)
      csspack({
        context: utils.fixtures,
        entry: 'src/html/**/*.html',
        output: 'dist',
        outWriter: writer,
      })
        .then((c) => {
          return Promise.resolve()
            .then(() => {
              return new Promise((resolve, reject) => {
                c
                  .on('generate', () => {
                    fs.readFile(path.join(utils.fixtures, 'dist/testing.html'))
                      .then((content) => {
                        assert(content === expected.foo)
                        resolve()
                      })
                  })
                fs.readFile(path.join(utils.fixtures, 'src/foo.html'))
                  .then((content) => writeFile(path.join(utils.fixtures, 'src/testing.html'), content))
              })
            })
            .then(() => {
              return new Promise((resolve, reject) => {
                c
                  .on('update', () => {
                    fs.readFile(path.join(utils.fixtures, 'dist/testing.html'))
                      .then((content) => {
                        assert(content === expected.foo)
                        resolve()
                      })
                  })
                fs.readFile(path.join(utils.fixtures, 'src/foo.html'))
                  .then((content) => writeFile(path.join(utils.fixtures, 'src/testing.html'), content))
              })
            })
            .then(() => {
              return new Promise((resolve, reject) => {
                c
                  .on('delete', () => {
                    fs.stat(path.join(utils.fixtures, 'dist/testing.html'))
                      .then(() => reject('should be error'))
                      .catch((err) => resolve())
                  })
                del(path.join(utils.fixtures, 'src/testing.html'))
              })
            })
        })
    })
  })
})
