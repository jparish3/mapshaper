/* @requires mapshaper-export */

// Export buttons and their behavior
//
var ExportControl = function(dataset, options) {

  El('#g-export-control').show();

  // TODO: URL.createObjectURL() is available in Safari 7.0 but downloading
  // fails. Need to handle.
  // Consider: listening for window.onbeforeunload
  //
  if (typeof URL == 'undefined' || !URL.createObjectURL) {
    El('#g-export-control .g-label').text("Exporting is not supported in this browser");
    return;
  }

  var anchor = El('#g-export-control').newChild('a').attr('href', '#').node(),
      blobUrl;

  El('#g-export-buttons').css('display:inline');

  var geoBtn = exportButton("#g-geojson-btn", "geojson"),
      shpBtn = exportButton("#g-shapefile-btn", "shapefile"),
      topoBtn = exportButton("#g-topojson-btn", "topojson");

  function exportButton(selector, format) {

    function onClick(e) {
      btn.active(false);
      setTimeout(function() {
        exportAs(format, function() {
          btn.active(true);
        });
      }, 10);
    }

    var btn = new SimpleButton(selector).active(true).on('click', onClick);
    return btn;
  }

  function exportAs(format, done) {
    var opts = utils.defaults({format: format}, options),
        files = MapShaper.exportFileContent(dataset, opts);

    if (!utils.isArray(files) || files.length === 0) {
      error("[exportAs()] Nothing to export");
    } else if (files.length == 1) {
      saveBlob(files[0].filename, new Blob([files[0].content]));
      done();
    } else {
      name = MapShaper.getCommonFileBase(utils.pluck(files, 'filename')) || "out";
      saveZipFile(name + ".zip", files, done);
    }
  }

  function saveBlob(filename, blob) {
    if (window.navigator.msSaveBlob) {
      window.navigator.msSaveBlob(blob, filename);
      return;
    }

    try {
      // revoke previous download url, if any. TODO: do this when download completes (how?)
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = URL.createObjectURL(blob);
    } catch(e) {
      alert("Mapshaper can't export files from this browser. Try switching to Chrome or Firefox.");
      return;
    }

    anchor.href = blobUrl;
    anchor.download = filename;
    var clickEvent = document.createEvent("MouseEvent");
    clickEvent.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false,
        false, false, false, 0, null);
    anchor.dispatchEvent(clickEvent);
  }

  function saveZipFile(zipfileName, files, done) {
    var toAdd = files;
    try {
      zip.createWriter(new zip.BlobWriter("application/zip"), addFile, zipError);
    } catch(e) {
      if (utils.parseUrl(Browser.getPageUrl()).protocol == 'file') {
        alert("This browser doesn't support offline .zip file creation.");
      } else {
        alert("This browser doesn't support .zip file creation.");
      }
    }

    function zipError(msg) {
      error(msg);
    }

    function addFile(archive) {
      if (toAdd.length === 0) {
        archive.close(function(blob) {
          saveBlob(zipfileName, blob);
          done();
        });
      } else {
        var obj = toAdd.pop(),
            blob = new Blob([obj.content]);
        archive.add(obj.filename, new zip.BlobReader(blob), function() {addFile(archive);});
      }
    }
  }

  /*
  function blobToDataURL(blob, cb) {
    var reader = new FileReader();
    reader.onload = function() {
      cb(reader.result);
    };
    reader.readAsDataURL(blob);
  }
  */
};
