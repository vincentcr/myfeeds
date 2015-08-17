var path = require('path');

var gutil = require('gulp-util');
var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var watchify = require('watchify');
var babel = require('babelify');

var SRC_DIR      = './src'
var ENTRY_POINT  = SRC_DIR + '/index.js';
var OUT_DIR      = './assets';
var JS_OUT       = OUT_DIR + '/index.js'
var IS_PRODUCTION = 'production' === process.env['NODE_ENV'];


function compile(watch) {
  var bundler = watchify(browserify(ENTRY_POINT, { debug: true }).transform(babel));
  if (IS_PRODUCTION) {
    bundler.plugin('minifyify', { output: OUT_DIR + '/map.json'  });
  }

  function rebundle() {
    var started = Date.now();
    gutil.log('bundling... →');
    return bundler.bundle()
      .on('error', errorHandler(bundler))
      .pipe(source(JS_OUT))
      .on('error', errorHandler(bundler))
      .pipe(buffer())
      .on('error', errorHandler(bundler))
      .pipe(sourcemaps.init({ loadMaps: true }))
      .on('error', errorHandler(bundler))
      .pipe(sourcemaps.write('./'))
      .on('error', errorHandler(bundler))
      .pipe(gulp.dest(path.dirname(OUT_DIR)))
      .on('error', errorHandler(bundler))
      .on('end', function(){
        var elapsed = (Date.now() - started) / 1000;
        gutil.log('→ rebundle completed in', elapsed.toFixed(2), 'seconds');
      })
    ;
  }

  if (watch) {
    bundler.on('update', function() {
      rebundle();
    });
  }

  return rebundle();
}

function errorHandler(stream) {
  return function(err) {
    console.error(err);
    stream.emit('end');
  }
}

function watch() {
  return compile(true);
};

gulp.task('build', compile);
gulp.task('watch', watch);

gulp.task('default', ['watch']);
