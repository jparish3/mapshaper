/* @requires topojson-common */


TopoJSON.decodeArcs = function(arcs, transform) {
  var mx = transform.scale[0],
      my = transform.scale[1],
      bx = transform.translate[0],
      by = transform.translate[1];

  utils.forEach(arcs, function(arc) {
    var prevX = 0,
        prevY = 0,
        xy, x, y;
    for (var i=0, len=arc.length; i<len; i++) {
      xy = arc[i];
      x = xy[0] + prevX;
      y = xy[1] + prevY;
      xy[0] = x * mx + bx;
      xy[1] = y * my + by;
      prevX = x;
      prevY = y;
    }
  });
};

// TODO: consider removing dupes...
TopoJSON.roundCoords = function(arcs, precision) {
  var round = getRoundingFunction(precision),
      p;
  utils.forEach(arcs, function(arc) {
    for (var i=0, len=arc.length; i<len; i++) {
      p = arc[i];
      p[0] = round(p[0]);
      p[1] = round(p[1]);
    }
  });
};

TopoJSON.importObject = function(obj, opts) {
  if (obj.type != 'GeometryCollection') {
    obj = {
      type: "GeometryCollection",
      geometries: [obj]
    };
  }
  return TopoJSON.importGeometryCollection(obj, opts);
};

TopoJSON.importGeometryCollection = function(obj, opts) {
  var importer = new TopoJSON.GeometryImporter(opts);
  utils.forEach(obj.geometries, importer.addGeometry, importer);
  return importer.done();
};

//
//
TopoJSON.GeometryImporter = function(opts) {
  var idField = opts && opts.id_field || null,
      properties = [],
      shapes = [], // topological ids
      collectionType = null;

  this.addGeometry = function(geom) {
    var type = GeoJSON.translateGeoJSONType(geom.type),
        shapeId = shapes.length,
        rec;
    this.updateCollectionType(type);

    if (idField || geom.properties) {
      rec = geom.properties || {};
      if (idField) {
        rec[idField] = geom.id || null;
      }
      properties[shapeId] = rec;
    }

    var shape = null;
    if (type == 'point') {
      shape = this.importPointGeometry(geom);
    } else if (geom.type in TopoJSON.pathImporters) {
      shape = TopoJSON.pathImporters[geom.type](geom.arcs);
    } else {
      if (geom.type) {
        verbose("[TopoJSON] Unknown geometry type:", geom.type);
      }
      // null geometry -- ok
    }
    shapes.push(shape);
  };

  this.importPointGeometry = function(geom) {
    var shape = null;
    if (geom.type == 'Point') {
      shape = [geom.coordinates];
    } else if (geom.type == 'MultiPoint') {
      shape = geom.coordinates;
    } else {
      stop("Invalid TopoJSON point geometry:", geom);
    }
    return shape;
  };

  this.updateCollectionType = function(type) {
    if (!collectionType) {
      collectionType = type;
    } else if (type && collectionType != type) {
      collectionType = 'mixed';
    }
  };

  this.done = function() {
    var lyr = {
      shapes: shapes,
      geometry_type: collectionType
    };
    if (properties.length > 0) {
      lyr.data = new DataTable(properties);
    }
    // console.log(lyr.shapes)
    return lyr;
  };
};

TopoJSON.pathImporters = {
  LineString: function(arcs) {
    return [arcs];
  },
  MultiLineString: function(arcs) {
    return arcs;
  },
  Polygon: function(arcs) {
    return arcs;
  },
  MultiPolygon: function(arcs) {
    return utils.reduce(arcs, function(memo, arr) {
      return memo ? memo.concat(arr) : arr;
    }, null);
  }
};
