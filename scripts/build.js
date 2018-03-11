#!/usr/bin/env node

const getEntryFile = require('./util/get-entry-file');
const simpleHtmlIndex = require('simple-html-index');
const htmlInjectMeta = require('html-inject-meta');
const minifyStream = require('minify-stream');
const indexhtmlify = require('indexhtmlify');
const browserify = require('browserify');
const glslify = require('glslify');
const mkdirp = require('mkdirp');
const assert = require('assert');
const es2040 = require('es2040');
const Idyll = require('idyll');
const path = require('path');
const brfs = require('brfs');
const cpr = require('cpr');
const fs = require('fs');

const projectDir = process.argv[2];
const entryFile = getEntryFile(projectDir);
const outputDir = projectDir.replace(/^src\//, 'docs/');

switch (entryFile.type) {
  case 'idl':
    const idyll = Idyll({
      inputFile: path.join(__dirname, '..', projectDir, entryFile.name),
      defaultComponents: path.join(__dirname, '..', 'lib', 'default-idyll-components'),
      components: path.join(__dirname, '..', projectDir, 'components'),
      output: path.join(__dirname, '..', outputDir),
      css: path.join(__dirname, '..', 'lib', 'css', 'styles.css'),
      watch: false,
      minify: true,
      ssr: true,
      theme: 'none',
      layout: 'none',
      transform: ['glslify']
    });

    idyll.build();

    ['images'].forEach(dir => {
      console.log('dir:', dir);
      var cpInputDir = path.join(__dirname, '..', projectDir, dir);
      var cpOutputDir = path.join(__dirname, '..', outputDir, dir);

      if (fs.existsSync(cpInputDir)) {
        //mkdirp.sync(cpOutputDir);
        cpr(cpInputDir, cpOutputDir, {});
      }
    });

    break;
  case 'html':
    break;
  case 'js':
    var metadata = {};
    try {
      const metadataPath = require.resolve(path.join(__dirname, '..', projectDir, 'metadata.json'));
      metadata = require(metadataPath);
    } catch (e) { }

    mkdirp.sync(path.join(__dirname, '..', outputDir));

    const cssInputPath = path.join(__dirname, '..', projectDir, 'index.css');
    if (fs.existsSync(cssInputPath)) {
      const cssOutputPath = path.join(__dirname, '..', outputDir, 'index.css');
      fs.createReadStream(cssInputPath).pipe(fs.createWriteStream(cssOutputPath));
    }

    const htmlOutputPath = path.join(__dirname, '..', outputDir, 'index.html');
    const bundleOutputPath = path.join(__dirname, '..', outputDir, 'bundle.js');

    var b = browserify(path.join(__dirname, '..', projectDir, entryFile.name), {
      transform: [
        glslify,
        es2040,
        brfs
      ],
      debug: false
    });

    b.bundle()
      .pipe(minifyStream({sourceMap: false}))
      .pipe(fs.createWriteStream(bundleOutputPath));

    simpleHtmlIndex({
        entry: 'bundle.js',
        title: metadata.title
      })
      .pipe(htmlInjectMeta({
        name: metadata.title,
        description: metadata.description,
        author: metadata.author ||  "Ricky Reusser",
      }))
      .pipe(fs.createWriteStream(htmlOutputPath));

    break;
  case 'md':
    break;
  default:
    assert(entryFile.type, 'Unknown filetype for file "' + entryFile.name + '"');
}
