/* @requires
mapshaper-cli-utils
mapshaper-file-types
mapshaper-commands
*/

var cli = api.cli = {};

function getVersion() {
  var v;
  try {
    var scriptDir = utils.parseLocalPath(require.main.filename).directory,
        packagePath = require('path').join(scriptDir, "..", "package.json"),
        obj = JSON.parse(cli.readFile(packagePath, 'utf-8'));
    v = obj.version;
  } catch(e) {}
  return v || "";
}

cli.isFile = function(path) {
  var ss = cli.statSync(path);
  return ss && ss.isFile() || false;
};

cli.fileSize = function(path) {
  var ss = cli.statSync(path);
  return ss && ss.size || 0;
};

cli.isDirectory = function(path) {
  var ss = cli.statSync(path);
  return ss && ss.isDirectory() || false;
};

// @charset (optional) e.g. 'utf8'
cli.readFile = function(fname, charset) {
  return require('rw').readFileSync(fname, charset || void 0);
};

// @content Buffer, ArrayBuffer or string
cli.writeFile = function(path, content) {
  if (content instanceof ArrayBuffer) {
    content = cli.convertArrayBuffer(content);
  }
  require('fs').writeFileSync(path, content, 0, null, 0);
};

// Returns Node Buffer
cli.convertArrayBuffer = function(buf) {
  var src = new Uint8Array(buf),
      dest = new Buffer(src.length);
  for (var i = 0, n=src.length; i < n; i++) {
    dest[i] = src[i];
  }
  return dest;
};

cli.expandFileName = function(name) {
  if (name.indexOf('*') == -1) return [name];
  var path = utils.parseLocalPath(name),
      dir = path.directory || '.',
      listing = require('fs').readdirSync(dir),
      rxp = utils.wildcardToRegExp(path.filename),
      matches;
  return listing.reduce(function(memo, item) {
    var path = require('path').join(dir, item);
    if (rxp.test(item) && cli.isFile(path)) {
      memo.push(path);
    }
    return memo;
  }, []);
};

cli.validateInputFiles = function(files) {
  // wildcard expansion (usually already handled by shell)
  var expanded = files.reduce(function(memo, name) {
    return memo.concat(cli.expandFileName(name));
  }, []);
  return expanded.reduce(function(memo, path) {
    cli.validateInputFile(path);
    return memo.concat(path);
  }, []);
};

cli.validateInputFile = function(ifile) {
  var opts = {};
  cli.checkFileExists(ifile);
  //if (!cli.validateFileExtension(ifile)) {
  //   error("File has an unsupported extension:", ifile);
  //}
  return ifile;
};

cli.checkFileExists = function(path) {
  if (!cli.isFile(path)) {
    stop("File not found (" + path + ")");
  }
};

cli.statSync = function(fpath) {
  var obj = null;
  try {
    obj = require('fs').statSync(fpath);
  } catch(e) {}
  return obj;
};

cli.printRepairMessage = function(info) {
  if (info.intersections_initial > 0) {
    message(utils.format(
        "Repaired %'i intersection%s; unable to repair %'i intersection%s.",
        info.intersections_repaired, "s?", info.intersections_remaining, "s?"));
    /*
    if (info.intersections_remaining > 10) {
      if (!opts.snapping) {
        message("Tip: use --auto-snap to fix minor topology errors.");
      }
    }*/
  }
};

cli.validateEncoding = function(raw) {
  var enc = raw.replace(/-/, '').toLowerCase();
  if (!utils.contains(MapShaper.getEncodings(), enc)) {
    console.error("[Unsupported encoding:", raw + "]");
    MapShaper.printEncodings();
    process.exit(0);
  }
  return enc;
};

// Expose internal objects for testing
utils.extend(api.internal, {
  BinArray: BinArray,
  DouglasPeucker: DouglasPeucker,
  Visvalingam: Visvalingam,
  ShpReader: ShpReader,
  ShpType: ShpType,
  Bounds: Bounds
});

api.T = T;
C.VERBOSE = false;

if (typeof define === "function" && define.amd) {
  define("mapshaper", api);
} else if (typeof module === "object" && module.exports) {
  module.exports = api;
}
this.mapshaper = api;
