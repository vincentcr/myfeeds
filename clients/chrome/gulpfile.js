var path = require('path');
var fs = require('fs');

var gutil = require('gulp-util');
var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var watchify = require('watchify');
var babel = require('babelify');

if (null == process.env['NODE_ENV']) {
  process.env['NODE_ENV'] = 'development';
}


var SRC_DIR             = './src'
var OUT_DIR             = './assets';
var DEFAULT_ENTRY_POINT = 'app.js';
var IS_PRODUCTION       = 'production' === process.env['NODE_ENV'];


function compiler(entryPoint, watch) {
  return function() {
    return compile(entryPoint, watch);
  }
}

function compile(entryPoint, watch) {
  updateRuntimeConfig();
  if (entryPoint == null) {
    entryPoint = DEFAULT_ENTRY_POINT;
  }
  var target = path.join(OUT_DIR, entryPoint);

  console.log('compile', entryPoint)

  var bundler = watchify(browserify(path.join(SRC_DIR, entryPoint), { debug: true }).transform(babel));
  if (IS_PRODUCTION) {
    bundler.plugin('minifyify', { output: path.join(OUT_DIR, 'map.json')  });
  }

  function rebundle() {
    var started = Date.now();
    gutil.log('bundling... →');
    return bundler.bundle()
      .on('error', errorHandler(bundler))
      .pipe(source(target))
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

function updateRuntimeConfig() {
  var configSrc = 'config.' + process.env['NODE_ENV'] + ".json";
  var configDst = path.join(SRC_DIR, 'config.json');
  var contents = fs.readFileSync(configSrc);
  console.log('config file:', configSrc);
  fs.writeFileSync(configDst, contents);
}

function errorHandler(stream) {
  return function(err) {
    console.error(err);
    stream.emit('end');
  }
}

function watcher(entryPoint) {
  return function() {
    return compile(entryPoint, true);
  }
};

gulp.task('build', compiler());
gulp.task('watch', watcher());
gulp.task('watch:chrome', watcher('chromext.js'))
gulp.task('default', ['watch']);
