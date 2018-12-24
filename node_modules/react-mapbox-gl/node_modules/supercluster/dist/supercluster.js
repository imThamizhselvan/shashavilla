(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.supercluster = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var kdbush = require('kdbush');

module.exports = supercluster;
module.exports.default = supercluster;

function supercluster(options) {
    return new SuperCluster(options);
}

function SuperCluster(options) {
    this.options = extend(Object.create(this.options), options);
    this.trees = new Array(this.options.maxZoom + 1);
}

SuperCluster.prototype = {
    options: {
        minZoom: 0,   // min zoom to generate clusters on
        maxZoom: 16,  // max zoom level to cluster the points on
        radius: 40,   // cluster radius in pixels
        extent: 512,  // tile extent (radius is calculated relative to it)
        nodeSize: 64, // size of the KD-tree leaf node, affects performance
        log: false,   // whether to log timing info

        // a reduce function for calculating custom cluster properties
        reduce: null, // function (accumulated, props) { accumulated.sum += props.sum; }

        // initial properties of a cluster (before running the reducer)
        initial: function () { return {}; }, // function () { return {sum: 0}; },

        // properties to use for individual points when running the reducer
        map: function (props) { return props; } // function (props) { return {sum: props.my_value}; },
    },

    load: function (points) {
        var log = this.options.log;

        if (log) console.time('total time');

        var timerId = 'prepare ' + points.length + ' points';
        if (log) console.time(timerId);

        this.points = points;

        // generate a cluster object for each point and index input points into a KD-tree
        var clusters = [];
        for (var i = 0; i < points.length; i++) {
            if (!points[i].geometry) {
                continue;
            }
            clusters.push(createPointCluster(points[i], i));
        }
        this.trees[this.options.maxZoom + 1] = kdbush(clusters, getX, getY, this.options.nodeSize, Float32Array);

        if (log) console.timeEnd(timerId);

        // cluster points on max zoom, then cluster the results on previous zoom, etc.;
        // results in a cluster hierarchy across zoom levels
        for (var z = this.options.maxZoom; z >= this.options.minZoom; z--) {
            var now = +Date.now();

            // create a new set of clusters for the zoom and index them with a KD-tree
            clusters = this._cluster(clusters, z);
            this.trees[z] = kdbush(clusters, getX, getY, this.options.nodeSize, Float32Array);

            if (log) console.log('z%d: %d clusters in %dms', z, clusters.length, +Date.now() - now);
        }

        if (log) console.timeEnd('total time');

        return this;
    },

    getClusters: function (bbox, zoom) {
        if (bbox[0] > bbox[2]) {
            var easternHem = this.getClusters([bbox[0], bbox[1], 180, bbox[3]], zoom);
            var westernHem = this.getClusters([-180, bbox[1], bbox[2], bbox[3]], zoom);
            return easternHem.concat(westernHem);
        }

        var tree = this.trees[this._limitZoom(zoom)];
        var ids = tree.range(lngX(bbox[0]), latY(bbox[3]), lngX(bbox[2]), latY(bbox[1]));
        var clusters = [];
        for (var i = 0; i < ids.length; i++) {
            var c = tree.points[ids[i]];
            clusters.push(c.numPoints ? getClusterJSON(c) : this.points[c.id]);
        }
        return clusters;
    },

    getChildren: function (clusterId) {
        var originId = clusterId >> 5;
        var originZoom = clusterId % 32;
        var errorMsg = 'No cluster with the specified id.';

        var index = this.trees[originZoom];
        if (!index) throw new Error(errorMsg);

        var origin = index.points[originId];
        if (!origin) throw new Error(errorMsg);

        var r = this.options.radius / (this.options.extent * Math.pow(2, originZoom - 1));
        var ids = index.within(origin.x, origin.y, r);
        var children = [];
        for (var i = 0; i < ids.length; i++) {
            var c = index.points[ids[i]];
            if (c.parentId === clusterId) {
                children.push(c.numPoints ? getClusterJSON(c) : this.points[c.id]);
            }
        }

        if (children.length === 0) throw new Error(errorMsg);

        return children;
    },

    getLeaves: function (clusterId, limit, offset) {
        limit = limit || 10;
        offset = offset || 0;

        var leaves = [];
        this._appendLeaves(leaves, clusterId, limit, offset, 0);

        return leaves;
    },

    getTile: function (z, x, y) {
        var tree = this.trees[this._limitZoom(z)];
        var z2 = Math.pow(2, z);
        var extent = this.options.extent;
        var r = this.options.radius;
        var p = r / extent;
        var top = (y - p) / z2;
        var bottom = (y + 1 + p) / z2;

        var tile = {
            features: []
        };

        this._addTileFeatures(
            tree.range((x - p) / z2, top, (x + 1 + p) / z2, bottom),
            tree.points, x, y, z2, tile);

        if (x === 0) {
            this._addTileFeatures(
                tree.range(1 - p / z2, top, 1, bottom),
                tree.points, z2, y, z2, tile);
        }
        if (x === z2 - 1) {
            this._addTileFeatures(
                tree.range(0, top, p / z2, bottom),
                tree.points, -1, y, z2, tile);
        }

        return tile.features.length ? tile : null;
    },

    getClusterExpansionZoom: function (clusterId) {
        var clusterZoom = (clusterId % 32) - 1;
        while (clusterZoom < this.options.maxZoom) {
            var children = this.getChildren(clusterId);
            clusterZoom++;
            if (children.length !== 1) break;
            clusterId = children[0].properties.cluster_id;
        }
        return clusterZoom;
    },

    _appendLeaves: function (result, clusterId, limit, offset, skipped) {
        var children = this.getChildren(clusterId);

        for (var i = 0; i < children.length; i++) {
            var props = children[i].properties;

            if (props && props.cluster) {
                if (skipped + props.point_count <= offset) {
                    // skip the whole cluster
                    skipped += props.point_count;
                } else {
                    // enter the cluster
                    skipped = this._appendLeaves(result, props.cluster_id, limit, offset, skipped);
                    // exit the cluster
                }
            } else if (skipped < offset) {
                // skip a single point
                skipped++;
            } else {
                // add a single point
                result.push(children[i]);
            }
            if (result.length === limit) break;
        }

        return skipped;
    },

    _addTileFeatures: function (ids, points, x, y, z2, tile) {
        for (var i = 0; i < ids.length; i++) {
            var c = points[ids[i]];
            tile.features.push({
                type: 1,
                geometry: [[
                    Math.round(this.options.extent * (c.x * z2 - x)),
                    Math.round(this.options.extent * (c.y * z2 - y))
                ]],
                tags: c.numPoints ? getClusterProperties(c) : this.points[c.id].properties
            });
        }
    },

    _limitZoom: function (z) {
        return Math.max(this.options.minZoom, Math.min(z, this.options.maxZoom + 1));
    },

    _cluster: function (points, zoom) {
        var clusters = [];
        var r = this.options.radius / (this.options.extent * Math.pow(2, zoom));

        // loop through each point
        for (var i = 0; i < points.length; i++) {
            var p = points[i];
            // if we've already visited the point at this zoom level, skip it
            if (p.zoom <= zoom) continue;
            p.zoom = zoom;

            // find all nearby points
            var tree = this.trees[zoom + 1];
            var neighborIds = tree.within(p.x, p.y, r);

            var numPoints = p.numPoints || 1;
            var wx = p.x * numPoints;
            var wy = p.y * numPoints;

            var clusterProperties = null;

            if (this.options.reduce) {
                clusterProperties = this.options.initial();
                this._accumulate(clusterProperties, p);
            }

            // encode both zoom and point index on which the cluster originated
            var id = (i << 5) + (zoom + 1);

            for (var j = 0; j < neighborIds.length; j++) {
                var b = tree.points[neighborIds[j]];
                // filter out neighbors that are already processed
                if (b.zoom <= zoom) continue;
                b.zoom = zoom; // save the zoom (so it doesn't get processed twice)

                var numPoints2 = b.numPoints || 1;
                wx += b.x * numPoints2; // accumulate coordinates for calculating weighted center
                wy += b.y * numPoints2;

                numPoints += numPoints2;
                b.parentId = id;

                if (this.options.reduce) {
                    this._accumulate(clusterProperties, b);
                }
            }

            if (numPoints === 1) {
                clusters.push(p);
            } else {
                p.parentId = id;
                clusters.push(createCluster(wx / numPoints, wy / numPoints, id, numPoints, clusterProperties));
            }
        }

        return clusters;
    },

    _accumulate: function (clusterProperties, point) {
        var properties = point.numPoints ?
            point.properties :
            this.options.map(this.points[point.id].properties);

        this.options.reduce(clusterProperties, properties);
    }
};

function createCluster(x, y, id, numPoints, properties) {
    return {
        x: x, // weighted cluster center
        y: y,
        zoom: Infinity, // the last zoom the cluster was processed at
        id: id, // encodes index of the first child of the cluster and its zoom level
        parentId: -1, // parent cluster id
        numPoints: numPoints,
        properties: properties
    };
}

function createPointCluster(p, id) {
    var coords = p.geometry.coordinates;
    return {
        x: lngX(coords[0]), // projected point coordinates
        y: latY(coords[1]),
        zoom: Infinity, // the last zoom the point was processed at
        id: id, // index of the source feature in the original input array
        parentId: -1 // parent cluster id
    };
}

function getClusterJSON(cluster) {
    return {
        type: 'Feature',
        properties: getClusterProperties(cluster),
        geometry: {
            type: 'Point',
            coordinates: [xLng(cluster.x), yLat(cluster.y)]
        }
    };
}

function getClusterProperties(cluster) {
    var count = cluster.numPoints;
    var abbrev =
        count >= 10000 ? Math.round(count / 1000) + 'k' :
        count >= 1000 ? (Math.round(count / 100) / 10) + 'k' : count;
    return extend(extend({}, cluster.properties), {
        cluster: true,
        cluster_id: cluster.id,
        point_count: count,
        point_count_abbreviated: abbrev
    });
}

// longitude/latitude to spherical mercator in [0..1] range
function lngX(lng) {
    return lng / 360 + 0.5;
}
function latY(lat) {
    var sin = Math.sin(lat * Math.PI / 180),
        y = (0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI);
    return y < 0 ? 0 : y > 1 ? 1 : y;
}

// spherical mercator to longitude/latitude
function xLng(x) {
    return (x - 0.5) * 360;
}
function yLat(y) {
    var y2 = (180 - y * 360) * Math.PI / 180;
    return 360 * Math.atan(Math.exp(y2)) / Math.PI - 90;
}

function extend(dest, src) {
    for (var id in src) dest[id] = src[id];
    return dest;
}

function getX(p) {
    return p.x;
}
function getY(p) {
    return p.y;
}

},{"kdbush":2}],2:[function(require,module,exports){
'use strict';

var sort = require('./sort');
var range = require('./range');
var within = require('./within');

module.exports = kdbush;

function kdbush(points, getX, getY, nodeSize, ArrayType) {
    return new KDBush(points, getX, getY, nodeSize, ArrayType);
}

function KDBush(points, getX, getY, nodeSize, ArrayType) {
    getX = getX || defaultGetX;
    getY = getY || defaultGetY;
    ArrayType = ArrayType || Array;

    this.nodeSize = nodeSize || 64;
    this.points = points;

    this.ids = new ArrayType(points.length);
    this.coords = new ArrayType(points.length * 2);

    for (var i = 0; i < points.length; i++) {
        this.ids[i] = i;
        this.coords[2 * i] = getX(points[i]);
        this.coords[2 * i + 1] = getY(points[i]);
    }

    sort(this.ids, this.coords, this.nodeSize, 0, this.ids.length - 1, 0);
}

KDBush.prototype = {
    range: function (minX, minY, maxX, maxY) {
        return range(this.ids, this.coords, minX, minY, maxX, maxY, this.nodeSize);
    },

    within: function (x, y, r) {
        return within(this.ids, this.coords, x, y, r, this.nodeSize);
    }
};

function defaultGetX(p) { return p[0]; }
function defaultGetY(p) { return p[1]; }

},{"./range":3,"./sort":4,"./within":5}],3:[function(require,module,exports){
'use strict';

module.exports = range;

function range(ids, coords, minX, minY, maxX, maxY, nodeSize) {
    var stack = [0, ids.length - 1, 0];
    var result = [];
    var x, y;

    while (stack.length) {
        var axis = stack.pop();
        var right = stack.pop();
        var left = stack.pop();

        if (right - left <= nodeSize) {
            for (var i = left; i <= right; i++) {
                x = coords[2 * i];
                y = coords[2 * i + 1];
                if (x >= minX && x <= maxX && y >= minY && y <= maxY) result.push(ids[i]);
            }
            continue;
        }

        var m = Math.floor((left + right) / 2);

        x = coords[2 * m];
        y = coords[2 * m + 1];

        if (x >= minX && x <= maxX && y >= minY && y <= maxY) result.push(ids[m]);

        var nextAxis = (axis + 1) % 2;

        if (axis === 0 ? minX <= x : minY <= y) {
            stack.push(left);
            stack.push(m - 1);
            stack.push(nextAxis);
        }
        if (axis === 0 ? maxX >= x : maxY >= y) {
            stack.push(m + 1);
            stack.push(right);
            stack.push(nextAxis);
        }
    }

    return result;
}

},{}],4:[function(require,module,exports){
'use strict';

module.exports = sortKD;

function sortKD(ids, coords, nodeSize, left, right, depth) {
    if (right - left <= nodeSize) return;

    var m = Math.floor((left + right) / 2);

    select(ids, coords, m, left, right, depth % 2);

    sortKD(ids, coords, nodeSize, left, m - 1, depth + 1);
    sortKD(ids, coords, nodeSize, m + 1, right, depth + 1);
}

function select(ids, coords, k, left, right, inc) {

    while (right > left) {
        if (right - left > 600) {
            var n = right - left + 1;
            var m = k - left + 1;
            var z = Math.log(n);
            var s = 0.5 * Math.exp(2 * z / 3);
            var sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (m - n / 2 < 0 ? -1 : 1);
            var newLeft = Math.max(left, Math.floor(k - m * s / n + sd));
            var newRight = Math.min(right, Math.floor(k + (n - m) * s / n + sd));
            select(ids, coords, k, newLeft, newRight, inc);
        }

        var t = coords[2 * k + inc];
        var i = left;
        var j = right;

        swapItem(ids, coords, left, k);
        if (coords[2 * right + inc] > t) swapItem(ids, coords, left, right);

        while (i < j) {
            swapItem(ids, coords, i, j);
            i++;
            j--;
            while (coords[2 * i + inc] < t) i++;
            while (coords[2 * j + inc] > t) j--;
        }

        if (coords[2 * left + inc] === t) swapItem(ids, coords, left, j);
        else {
            j++;
            swapItem(ids, coords, j, right);
        }

        if (j <= k) left = j + 1;
        if (k <= j) right = j - 1;
    }
}

function swapItem(ids, coords, i, j) {
    swap(ids, i, j);
    swap(coords, 2 * i, 2 * j);
    swap(coords, 2 * i + 1, 2 * j + 1);
}

function swap(arr, i, j) {
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
}

},{}],5:[function(require,module,exports){
'use strict';

module.exports = within;

function within(ids, coords, qx, qy, r, nodeSize) {
    var stack = [0, ids.length - 1, 0];
    var result = [];
    var r2 = r * r;

    while (stack.length) {
        var axis = stack.pop();
        var right = stack.pop();
        var left = stack.pop();

        if (right - left <= nodeSize) {
            for (var i = left; i <= right; i++) {
                if (sqDist(coords[2 * i], coords[2 * i + 1], qx, qy) <= r2) result.push(ids[i]);
            }
            continue;
        }

        var m = Math.floor((left + right) / 2);

        var x = coords[2 * m];
        var y = coords[2 * m + 1];

        if (sqDist(x, y, qx, qy) <= r2) result.push(ids[m]);

        var nextAxis = (axis + 1) % 2;

        if (axis === 0 ? qx - r <= x : qy - r <= y) {
            stack.push(left);
            stack.push(m - 1);
            stack.push(nextAxis);
        }
        if (axis === 0 ? qx + r >= x : qy + r >= y) {
            stack.push(m + 1);
            stack.push(right);
            stack.push(nextAxis);
        }
    }

    return result;
}

function sqDist(ax, ay, bx, by) {
    var dx = ax - bx;
    var dy = ay - by;
    return dx * dx + dy * dy;
}

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9rZGJ1c2gvc3JjL2tkYnVzaC5qcyIsIm5vZGVfbW9kdWxlcy9rZGJ1c2gvc3JjL3JhbmdlLmpzIiwibm9kZV9tb2R1bGVzL2tkYnVzaC9zcmMvc29ydC5qcyIsIm5vZGVfbW9kdWxlcy9rZGJ1c2gvc3JjL3dpdGhpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIGtkYnVzaCA9IHJlcXVpcmUoJ2tkYnVzaCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHN1cGVyY2x1c3Rlcjtcbm1vZHVsZS5leHBvcnRzLmRlZmF1bHQgPSBzdXBlcmNsdXN0ZXI7XG5cbmZ1bmN0aW9uIHN1cGVyY2x1c3RlcihvcHRpb25zKSB7XG4gICAgcmV0dXJuIG5ldyBTdXBlckNsdXN0ZXIob3B0aW9ucyk7XG59XG5cbmZ1bmN0aW9uIFN1cGVyQ2x1c3RlcihvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gZXh0ZW5kKE9iamVjdC5jcmVhdGUodGhpcy5vcHRpb25zKSwgb3B0aW9ucyk7XG4gICAgdGhpcy50cmVlcyA9IG5ldyBBcnJheSh0aGlzLm9wdGlvbnMubWF4Wm9vbSArIDEpO1xufVxuXG5TdXBlckNsdXN0ZXIucHJvdG90eXBlID0ge1xuICAgIG9wdGlvbnM6IHtcbiAgICAgICAgbWluWm9vbTogMCwgICAvLyBtaW4gem9vbSB0byBnZW5lcmF0ZSBjbHVzdGVycyBvblxuICAgICAgICBtYXhab29tOiAxNiwgIC8vIG1heCB6b29tIGxldmVsIHRvIGNsdXN0ZXIgdGhlIHBvaW50cyBvblxuICAgICAgICByYWRpdXM6IDQwLCAgIC8vIGNsdXN0ZXIgcmFkaXVzIGluIHBpeGVsc1xuICAgICAgICBleHRlbnQ6IDUxMiwgIC8vIHRpbGUgZXh0ZW50IChyYWRpdXMgaXMgY2FsY3VsYXRlZCByZWxhdGl2ZSB0byBpdClcbiAgICAgICAgbm9kZVNpemU6IDY0LCAvLyBzaXplIG9mIHRoZSBLRC10cmVlIGxlYWYgbm9kZSwgYWZmZWN0cyBwZXJmb3JtYW5jZVxuICAgICAgICBsb2c6IGZhbHNlLCAgIC8vIHdoZXRoZXIgdG8gbG9nIHRpbWluZyBpbmZvXG5cbiAgICAgICAgLy8gYSByZWR1Y2UgZnVuY3Rpb24gZm9yIGNhbGN1bGF0aW5nIGN1c3RvbSBjbHVzdGVyIHByb3BlcnRpZXNcbiAgICAgICAgcmVkdWNlOiBudWxsLCAvLyBmdW5jdGlvbiAoYWNjdW11bGF0ZWQsIHByb3BzKSB7IGFjY3VtdWxhdGVkLnN1bSArPSBwcm9wcy5zdW07IH1cblxuICAgICAgICAvLyBpbml0aWFsIHByb3BlcnRpZXMgb2YgYSBjbHVzdGVyIChiZWZvcmUgcnVubmluZyB0aGUgcmVkdWNlcilcbiAgICAgICAgaW5pdGlhbDogZnVuY3Rpb24gKCkgeyByZXR1cm4ge307IH0sIC8vIGZ1bmN0aW9uICgpIHsgcmV0dXJuIHtzdW06IDB9OyB9LFxuXG4gICAgICAgIC8vIHByb3BlcnRpZXMgdG8gdXNlIGZvciBpbmRpdmlkdWFsIHBvaW50cyB3aGVuIHJ1bm5pbmcgdGhlIHJlZHVjZXJcbiAgICAgICAgbWFwOiBmdW5jdGlvbiAocHJvcHMpIHsgcmV0dXJuIHByb3BzOyB9IC8vIGZ1bmN0aW9uIChwcm9wcykgeyByZXR1cm4ge3N1bTogcHJvcHMubXlfdmFsdWV9OyB9LFxuICAgIH0sXG5cbiAgICBsb2FkOiBmdW5jdGlvbiAocG9pbnRzKSB7XG4gICAgICAgIHZhciBsb2cgPSB0aGlzLm9wdGlvbnMubG9nO1xuXG4gICAgICAgIGlmIChsb2cpIGNvbnNvbGUudGltZSgndG90YWwgdGltZScpO1xuXG4gICAgICAgIHZhciB0aW1lcklkID0gJ3ByZXBhcmUgJyArIHBvaW50cy5sZW5ndGggKyAnIHBvaW50cyc7XG4gICAgICAgIGlmIChsb2cpIGNvbnNvbGUudGltZSh0aW1lcklkKTtcblxuICAgICAgICB0aGlzLnBvaW50cyA9IHBvaW50cztcblxuICAgICAgICAvLyBnZW5lcmF0ZSBhIGNsdXN0ZXIgb2JqZWN0IGZvciBlYWNoIHBvaW50IGFuZCBpbmRleCBpbnB1dCBwb2ludHMgaW50byBhIEtELXRyZWVcbiAgICAgICAgdmFyIGNsdXN0ZXJzID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcG9pbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoIXBvaW50c1tpXS5nZW9tZXRyeSkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2x1c3RlcnMucHVzaChjcmVhdGVQb2ludENsdXN0ZXIocG9pbnRzW2ldLCBpKSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50cmVlc1t0aGlzLm9wdGlvbnMubWF4Wm9vbSArIDFdID0ga2RidXNoKGNsdXN0ZXJzLCBnZXRYLCBnZXRZLCB0aGlzLm9wdGlvbnMubm9kZVNpemUsIEZsb2F0MzJBcnJheSk7XG5cbiAgICAgICAgaWYgKGxvZykgY29uc29sZS50aW1lRW5kKHRpbWVySWQpO1xuXG4gICAgICAgIC8vIGNsdXN0ZXIgcG9pbnRzIG9uIG1heCB6b29tLCB0aGVuIGNsdXN0ZXIgdGhlIHJlc3VsdHMgb24gcHJldmlvdXMgem9vbSwgZXRjLjtcbiAgICAgICAgLy8gcmVzdWx0cyBpbiBhIGNsdXN0ZXIgaGllcmFyY2h5IGFjcm9zcyB6b29tIGxldmVsc1xuICAgICAgICBmb3IgKHZhciB6ID0gdGhpcy5vcHRpb25zLm1heFpvb207IHogPj0gdGhpcy5vcHRpb25zLm1pblpvb207IHotLSkge1xuICAgICAgICAgICAgdmFyIG5vdyA9ICtEYXRlLm5vdygpO1xuXG4gICAgICAgICAgICAvLyBjcmVhdGUgYSBuZXcgc2V0IG9mIGNsdXN0ZXJzIGZvciB0aGUgem9vbSBhbmQgaW5kZXggdGhlbSB3aXRoIGEgS0QtdHJlZVxuICAgICAgICAgICAgY2x1c3RlcnMgPSB0aGlzLl9jbHVzdGVyKGNsdXN0ZXJzLCB6KTtcbiAgICAgICAgICAgIHRoaXMudHJlZXNbel0gPSBrZGJ1c2goY2x1c3RlcnMsIGdldFgsIGdldFksIHRoaXMub3B0aW9ucy5ub2RlU2l6ZSwgRmxvYXQzMkFycmF5KTtcblxuICAgICAgICAgICAgaWYgKGxvZykgY29uc29sZS5sb2coJ3olZDogJWQgY2x1c3RlcnMgaW4gJWRtcycsIHosIGNsdXN0ZXJzLmxlbmd0aCwgK0RhdGUubm93KCkgLSBub3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxvZykgY29uc29sZS50aW1lRW5kKCd0b3RhbCB0aW1lJyk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGdldENsdXN0ZXJzOiBmdW5jdGlvbiAoYmJveCwgem9vbSkge1xuICAgICAgICBpZiAoYmJveFswXSA+IGJib3hbMl0pIHtcbiAgICAgICAgICAgIHZhciBlYXN0ZXJuSGVtID0gdGhpcy5nZXRDbHVzdGVycyhbYmJveFswXSwgYmJveFsxXSwgMTgwLCBiYm94WzNdXSwgem9vbSk7XG4gICAgICAgICAgICB2YXIgd2VzdGVybkhlbSA9IHRoaXMuZ2V0Q2x1c3RlcnMoWy0xODAsIGJib3hbMV0sIGJib3hbMl0sIGJib3hbM11dLCB6b29tKTtcbiAgICAgICAgICAgIHJldHVybiBlYXN0ZXJuSGVtLmNvbmNhdCh3ZXN0ZXJuSGVtKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB0cmVlID0gdGhpcy50cmVlc1t0aGlzLl9saW1pdFpvb20oem9vbSldO1xuICAgICAgICB2YXIgaWRzID0gdHJlZS5yYW5nZShsbmdYKGJib3hbMF0pLCBsYXRZKGJib3hbM10pLCBsbmdYKGJib3hbMl0pLCBsYXRZKGJib3hbMV0pKTtcbiAgICAgICAgdmFyIGNsdXN0ZXJzID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaWRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgYyA9IHRyZWUucG9pbnRzW2lkc1tpXV07XG4gICAgICAgICAgICBjbHVzdGVycy5wdXNoKGMubnVtUG9pbnRzID8gZ2V0Q2x1c3RlckpTT04oYykgOiB0aGlzLnBvaW50c1tjLmlkXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNsdXN0ZXJzO1xuICAgIH0sXG5cbiAgICBnZXRDaGlsZHJlbjogZnVuY3Rpb24gKGNsdXN0ZXJJZCkge1xuICAgICAgICB2YXIgb3JpZ2luSWQgPSBjbHVzdGVySWQgPj4gNTtcbiAgICAgICAgdmFyIG9yaWdpblpvb20gPSBjbHVzdGVySWQgJSAzMjtcbiAgICAgICAgdmFyIGVycm9yTXNnID0gJ05vIGNsdXN0ZXIgd2l0aCB0aGUgc3BlY2lmaWVkIGlkLic7XG5cbiAgICAgICAgdmFyIGluZGV4ID0gdGhpcy50cmVlc1tvcmlnaW5ab29tXTtcbiAgICAgICAgaWYgKCFpbmRleCkgdGhyb3cgbmV3IEVycm9yKGVycm9yTXNnKTtcblxuICAgICAgICB2YXIgb3JpZ2luID0gaW5kZXgucG9pbnRzW29yaWdpbklkXTtcbiAgICAgICAgaWYgKCFvcmlnaW4pIHRocm93IG5ldyBFcnJvcihlcnJvck1zZyk7XG5cbiAgICAgICAgdmFyIHIgPSB0aGlzLm9wdGlvbnMucmFkaXVzIC8gKHRoaXMub3B0aW9ucy5leHRlbnQgKiBNYXRoLnBvdygyLCBvcmlnaW5ab29tIC0gMSkpO1xuICAgICAgICB2YXIgaWRzID0gaW5kZXgud2l0aGluKG9yaWdpbi54LCBvcmlnaW4ueSwgcik7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGlkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGMgPSBpbmRleC5wb2ludHNbaWRzW2ldXTtcbiAgICAgICAgICAgIGlmIChjLnBhcmVudElkID09PSBjbHVzdGVySWQpIHtcbiAgICAgICAgICAgICAgICBjaGlsZHJlbi5wdXNoKGMubnVtUG9pbnRzID8gZ2V0Q2x1c3RlckpTT04oYykgOiB0aGlzLnBvaW50c1tjLmlkXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoY2hpbGRyZW4ubGVuZ3RoID09PSAwKSB0aHJvdyBuZXcgRXJyb3IoZXJyb3JNc2cpO1xuXG4gICAgICAgIHJldHVybiBjaGlsZHJlbjtcbiAgICB9LFxuXG4gICAgZ2V0TGVhdmVzOiBmdW5jdGlvbiAoY2x1c3RlcklkLCBsaW1pdCwgb2Zmc2V0KSB7XG4gICAgICAgIGxpbWl0ID0gbGltaXQgfHwgMTA7XG4gICAgICAgIG9mZnNldCA9IG9mZnNldCB8fCAwO1xuXG4gICAgICAgIHZhciBsZWF2ZXMgPSBbXTtcbiAgICAgICAgdGhpcy5fYXBwZW5kTGVhdmVzKGxlYXZlcywgY2x1c3RlcklkLCBsaW1pdCwgb2Zmc2V0LCAwKTtcblxuICAgICAgICByZXR1cm4gbGVhdmVzO1xuICAgIH0sXG5cbiAgICBnZXRUaWxlOiBmdW5jdGlvbiAoeiwgeCwgeSkge1xuICAgICAgICB2YXIgdHJlZSA9IHRoaXMudHJlZXNbdGhpcy5fbGltaXRab29tKHopXTtcbiAgICAgICAgdmFyIHoyID0gTWF0aC5wb3coMiwgeik7XG4gICAgICAgIHZhciBleHRlbnQgPSB0aGlzLm9wdGlvbnMuZXh0ZW50O1xuICAgICAgICB2YXIgciA9IHRoaXMub3B0aW9ucy5yYWRpdXM7XG4gICAgICAgIHZhciBwID0gciAvIGV4dGVudDtcbiAgICAgICAgdmFyIHRvcCA9ICh5IC0gcCkgLyB6MjtcbiAgICAgICAgdmFyIGJvdHRvbSA9ICh5ICsgMSArIHApIC8gejI7XG5cbiAgICAgICAgdmFyIHRpbGUgPSB7XG4gICAgICAgICAgICBmZWF0dXJlczogW11cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLl9hZGRUaWxlRmVhdHVyZXMoXG4gICAgICAgICAgICB0cmVlLnJhbmdlKCh4IC0gcCkgLyB6MiwgdG9wLCAoeCArIDEgKyBwKSAvIHoyLCBib3R0b20pLFxuICAgICAgICAgICAgdHJlZS5wb2ludHMsIHgsIHksIHoyLCB0aWxlKTtcblxuICAgICAgICBpZiAoeCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5fYWRkVGlsZUZlYXR1cmVzKFxuICAgICAgICAgICAgICAgIHRyZWUucmFuZ2UoMSAtIHAgLyB6MiwgdG9wLCAxLCBib3R0b20pLFxuICAgICAgICAgICAgICAgIHRyZWUucG9pbnRzLCB6MiwgeSwgejIsIHRpbGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh4ID09PSB6MiAtIDEpIHtcbiAgICAgICAgICAgIHRoaXMuX2FkZFRpbGVGZWF0dXJlcyhcbiAgICAgICAgICAgICAgICB0cmVlLnJhbmdlKDAsIHRvcCwgcCAvIHoyLCBib3R0b20pLFxuICAgICAgICAgICAgICAgIHRyZWUucG9pbnRzLCAtMSwgeSwgejIsIHRpbGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRpbGUuZmVhdHVyZXMubGVuZ3RoID8gdGlsZSA6IG51bGw7XG4gICAgfSxcblxuICAgIGdldENsdXN0ZXJFeHBhbnNpb25ab29tOiBmdW5jdGlvbiAoY2x1c3RlcklkKSB7XG4gICAgICAgIHZhciBjbHVzdGVyWm9vbSA9IChjbHVzdGVySWQgJSAzMikgLSAxO1xuICAgICAgICB3aGlsZSAoY2x1c3Rlclpvb20gPCB0aGlzLm9wdGlvbnMubWF4Wm9vbSkge1xuICAgICAgICAgICAgdmFyIGNoaWxkcmVuID0gdGhpcy5nZXRDaGlsZHJlbihjbHVzdGVySWQpO1xuICAgICAgICAgICAgY2x1c3Rlclpvb20rKztcbiAgICAgICAgICAgIGlmIChjaGlsZHJlbi5sZW5ndGggIT09IDEpIGJyZWFrO1xuICAgICAgICAgICAgY2x1c3RlcklkID0gY2hpbGRyZW5bMF0ucHJvcGVydGllcy5jbHVzdGVyX2lkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjbHVzdGVyWm9vbTtcbiAgICB9LFxuXG4gICAgX2FwcGVuZExlYXZlczogZnVuY3Rpb24gKHJlc3VsdCwgY2x1c3RlcklkLCBsaW1pdCwgb2Zmc2V0LCBza2lwcGVkKSB7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IHRoaXMuZ2V0Q2hpbGRyZW4oY2x1c3RlcklkKTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcHJvcHMgPSBjaGlsZHJlbltpXS5wcm9wZXJ0aWVzO1xuXG4gICAgICAgICAgICBpZiAocHJvcHMgJiYgcHJvcHMuY2x1c3Rlcikge1xuICAgICAgICAgICAgICAgIGlmIChza2lwcGVkICsgcHJvcHMucG9pbnRfY291bnQgPD0gb2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNraXAgdGhlIHdob2xlIGNsdXN0ZXJcbiAgICAgICAgICAgICAgICAgICAgc2tpcHBlZCArPSBwcm9wcy5wb2ludF9jb3VudDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBlbnRlciB0aGUgY2x1c3RlclxuICAgICAgICAgICAgICAgICAgICBza2lwcGVkID0gdGhpcy5fYXBwZW5kTGVhdmVzKHJlc3VsdCwgcHJvcHMuY2x1c3Rlcl9pZCwgbGltaXQsIG9mZnNldCwgc2tpcHBlZCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGV4aXQgdGhlIGNsdXN0ZXJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNraXBwZWQgPCBvZmZzZXQpIHtcbiAgICAgICAgICAgICAgICAvLyBza2lwIGEgc2luZ2xlIHBvaW50XG4gICAgICAgICAgICAgICAgc2tpcHBlZCsrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBhZGQgYSBzaW5nbGUgcG9pbnRcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChjaGlsZHJlbltpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVzdWx0Lmxlbmd0aCA9PT0gbGltaXQpIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNraXBwZWQ7XG4gICAgfSxcblxuICAgIF9hZGRUaWxlRmVhdHVyZXM6IGZ1bmN0aW9uIChpZHMsIHBvaW50cywgeCwgeSwgejIsIHRpbGUpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjID0gcG9pbnRzW2lkc1tpXV07XG4gICAgICAgICAgICB0aWxlLmZlYXR1cmVzLnB1c2goe1xuICAgICAgICAgICAgICAgIHR5cGU6IDEsXG4gICAgICAgICAgICAgICAgZ2VvbWV0cnk6IFtbXG4gICAgICAgICAgICAgICAgICAgIE1hdGgucm91bmQodGhpcy5vcHRpb25zLmV4dGVudCAqIChjLnggKiB6MiAtIHgpKSxcbiAgICAgICAgICAgICAgICAgICAgTWF0aC5yb3VuZCh0aGlzLm9wdGlvbnMuZXh0ZW50ICogKGMueSAqIHoyIC0geSkpXG4gICAgICAgICAgICAgICAgXV0sXG4gICAgICAgICAgICAgICAgdGFnczogYy5udW1Qb2ludHMgPyBnZXRDbHVzdGVyUHJvcGVydGllcyhjKSA6IHRoaXMucG9pbnRzW2MuaWRdLnByb3BlcnRpZXNcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIF9saW1pdFpvb206IGZ1bmN0aW9uICh6KSB7XG4gICAgICAgIHJldHVybiBNYXRoLm1heCh0aGlzLm9wdGlvbnMubWluWm9vbSwgTWF0aC5taW4oeiwgdGhpcy5vcHRpb25zLm1heFpvb20gKyAxKSk7XG4gICAgfSxcblxuICAgIF9jbHVzdGVyOiBmdW5jdGlvbiAocG9pbnRzLCB6b29tKSB7XG4gICAgICAgIHZhciBjbHVzdGVycyA9IFtdO1xuICAgICAgICB2YXIgciA9IHRoaXMub3B0aW9ucy5yYWRpdXMgLyAodGhpcy5vcHRpb25zLmV4dGVudCAqIE1hdGgucG93KDIsIHpvb20pKTtcblxuICAgICAgICAvLyBsb29wIHRocm91Z2ggZWFjaCBwb2ludFxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHAgPSBwb2ludHNbaV07XG4gICAgICAgICAgICAvLyBpZiB3ZSd2ZSBhbHJlYWR5IHZpc2l0ZWQgdGhlIHBvaW50IGF0IHRoaXMgem9vbSBsZXZlbCwgc2tpcCBpdFxuICAgICAgICAgICAgaWYgKHAuem9vbSA8PSB6b29tKSBjb250aW51ZTtcbiAgICAgICAgICAgIHAuem9vbSA9IHpvb207XG5cbiAgICAgICAgICAgIC8vIGZpbmQgYWxsIG5lYXJieSBwb2ludHNcbiAgICAgICAgICAgIHZhciB0cmVlID0gdGhpcy50cmVlc1t6b29tICsgMV07XG4gICAgICAgICAgICB2YXIgbmVpZ2hib3JJZHMgPSB0cmVlLndpdGhpbihwLngsIHAueSwgcik7XG5cbiAgICAgICAgICAgIHZhciBudW1Qb2ludHMgPSBwLm51bVBvaW50cyB8fCAxO1xuICAgICAgICAgICAgdmFyIHd4ID0gcC54ICogbnVtUG9pbnRzO1xuICAgICAgICAgICAgdmFyIHd5ID0gcC55ICogbnVtUG9pbnRzO1xuXG4gICAgICAgICAgICB2YXIgY2x1c3RlclByb3BlcnRpZXMgPSBudWxsO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5vcHRpb25zLnJlZHVjZSkge1xuICAgICAgICAgICAgICAgIGNsdXN0ZXJQcm9wZXJ0aWVzID0gdGhpcy5vcHRpb25zLmluaXRpYWwoKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9hY2N1bXVsYXRlKGNsdXN0ZXJQcm9wZXJ0aWVzLCBwKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZW5jb2RlIGJvdGggem9vbSBhbmQgcG9pbnQgaW5kZXggb24gd2hpY2ggdGhlIGNsdXN0ZXIgb3JpZ2luYXRlZFxuICAgICAgICAgICAgdmFyIGlkID0gKGkgPDwgNSkgKyAoem9vbSArIDEpO1xuXG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG5laWdoYm9ySWRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGIgPSB0cmVlLnBvaW50c1tuZWlnaGJvcklkc1tqXV07XG4gICAgICAgICAgICAgICAgLy8gZmlsdGVyIG91dCBuZWlnaGJvcnMgdGhhdCBhcmUgYWxyZWFkeSBwcm9jZXNzZWRcbiAgICAgICAgICAgICAgICBpZiAoYi56b29tIDw9IHpvb20pIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGIuem9vbSA9IHpvb207IC8vIHNhdmUgdGhlIHpvb20gKHNvIGl0IGRvZXNuJ3QgZ2V0IHByb2Nlc3NlZCB0d2ljZSlcblxuICAgICAgICAgICAgICAgIHZhciBudW1Qb2ludHMyID0gYi5udW1Qb2ludHMgfHwgMTtcbiAgICAgICAgICAgICAgICB3eCArPSBiLnggKiBudW1Qb2ludHMyOyAvLyBhY2N1bXVsYXRlIGNvb3JkaW5hdGVzIGZvciBjYWxjdWxhdGluZyB3ZWlnaHRlZCBjZW50ZXJcbiAgICAgICAgICAgICAgICB3eSArPSBiLnkgKiBudW1Qb2ludHMyO1xuXG4gICAgICAgICAgICAgICAgbnVtUG9pbnRzICs9IG51bVBvaW50czI7XG4gICAgICAgICAgICAgICAgYi5wYXJlbnRJZCA9IGlkO1xuXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3B0aW9ucy5yZWR1Y2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fYWNjdW11bGF0ZShjbHVzdGVyUHJvcGVydGllcywgYik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobnVtUG9pbnRzID09PSAxKSB7XG4gICAgICAgICAgICAgICAgY2x1c3RlcnMucHVzaChwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcC5wYXJlbnRJZCA9IGlkO1xuICAgICAgICAgICAgICAgIGNsdXN0ZXJzLnB1c2goY3JlYXRlQ2x1c3Rlcih3eCAvIG51bVBvaW50cywgd3kgLyBudW1Qb2ludHMsIGlkLCBudW1Qb2ludHMsIGNsdXN0ZXJQcm9wZXJ0aWVzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY2x1c3RlcnM7XG4gICAgfSxcblxuICAgIF9hY2N1bXVsYXRlOiBmdW5jdGlvbiAoY2x1c3RlclByb3BlcnRpZXMsIHBvaW50KSB7XG4gICAgICAgIHZhciBwcm9wZXJ0aWVzID0gcG9pbnQubnVtUG9pbnRzID9cbiAgICAgICAgICAgIHBvaW50LnByb3BlcnRpZXMgOlxuICAgICAgICAgICAgdGhpcy5vcHRpb25zLm1hcCh0aGlzLnBvaW50c1twb2ludC5pZF0ucHJvcGVydGllcyk7XG5cbiAgICAgICAgdGhpcy5vcHRpb25zLnJlZHVjZShjbHVzdGVyUHJvcGVydGllcywgcHJvcGVydGllcyk7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gY3JlYXRlQ2x1c3Rlcih4LCB5LCBpZCwgbnVtUG9pbnRzLCBwcm9wZXJ0aWVzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgeDogeCwgLy8gd2VpZ2h0ZWQgY2x1c3RlciBjZW50ZXJcbiAgICAgICAgeTogeSxcbiAgICAgICAgem9vbTogSW5maW5pdHksIC8vIHRoZSBsYXN0IHpvb20gdGhlIGNsdXN0ZXIgd2FzIHByb2Nlc3NlZCBhdFxuICAgICAgICBpZDogaWQsIC8vIGVuY29kZXMgaW5kZXggb2YgdGhlIGZpcnN0IGNoaWxkIG9mIHRoZSBjbHVzdGVyIGFuZCBpdHMgem9vbSBsZXZlbFxuICAgICAgICBwYXJlbnRJZDogLTEsIC8vIHBhcmVudCBjbHVzdGVyIGlkXG4gICAgICAgIG51bVBvaW50czogbnVtUG9pbnRzLFxuICAgICAgICBwcm9wZXJ0aWVzOiBwcm9wZXJ0aWVzXG4gICAgfTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlUG9pbnRDbHVzdGVyKHAsIGlkKSB7XG4gICAgdmFyIGNvb3JkcyA9IHAuZ2VvbWV0cnkuY29vcmRpbmF0ZXM7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgeDogbG5nWChjb29yZHNbMF0pLCAvLyBwcm9qZWN0ZWQgcG9pbnQgY29vcmRpbmF0ZXNcbiAgICAgICAgeTogbGF0WShjb29yZHNbMV0pLFxuICAgICAgICB6b29tOiBJbmZpbml0eSwgLy8gdGhlIGxhc3Qgem9vbSB0aGUgcG9pbnQgd2FzIHByb2Nlc3NlZCBhdFxuICAgICAgICBpZDogaWQsIC8vIGluZGV4IG9mIHRoZSBzb3VyY2UgZmVhdHVyZSBpbiB0aGUgb3JpZ2luYWwgaW5wdXQgYXJyYXlcbiAgICAgICAgcGFyZW50SWQ6IC0xIC8vIHBhcmVudCBjbHVzdGVyIGlkXG4gICAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0Q2x1c3RlckpTT04oY2x1c3Rlcikge1xuICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdGZWF0dXJlJyxcbiAgICAgICAgcHJvcGVydGllczogZ2V0Q2x1c3RlclByb3BlcnRpZXMoY2x1c3RlciksXG4gICAgICAgIGdlb21ldHJ5OiB7XG4gICAgICAgICAgICB0eXBlOiAnUG9pbnQnLFxuICAgICAgICAgICAgY29vcmRpbmF0ZXM6IFt4TG5nKGNsdXN0ZXIueCksIHlMYXQoY2x1c3Rlci55KV1cbiAgICAgICAgfVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIGdldENsdXN0ZXJQcm9wZXJ0aWVzKGNsdXN0ZXIpIHtcbiAgICB2YXIgY291bnQgPSBjbHVzdGVyLm51bVBvaW50cztcbiAgICB2YXIgYWJicmV2ID1cbiAgICAgICAgY291bnQgPj0gMTAwMDAgPyBNYXRoLnJvdW5kKGNvdW50IC8gMTAwMCkgKyAnaycgOlxuICAgICAgICBjb3VudCA+PSAxMDAwID8gKE1hdGgucm91bmQoY291bnQgLyAxMDApIC8gMTApICsgJ2snIDogY291bnQ7XG4gICAgcmV0dXJuIGV4dGVuZChleHRlbmQoe30sIGNsdXN0ZXIucHJvcGVydGllcyksIHtcbiAgICAgICAgY2x1c3RlcjogdHJ1ZSxcbiAgICAgICAgY2x1c3Rlcl9pZDogY2x1c3Rlci5pZCxcbiAgICAgICAgcG9pbnRfY291bnQ6IGNvdW50LFxuICAgICAgICBwb2ludF9jb3VudF9hYmJyZXZpYXRlZDogYWJicmV2XG4gICAgfSk7XG59XG5cbi8vIGxvbmdpdHVkZS9sYXRpdHVkZSB0byBzcGhlcmljYWwgbWVyY2F0b3IgaW4gWzAuLjFdIHJhbmdlXG5mdW5jdGlvbiBsbmdYKGxuZykge1xuICAgIHJldHVybiBsbmcgLyAzNjAgKyAwLjU7XG59XG5mdW5jdGlvbiBsYXRZKGxhdCkge1xuICAgIHZhciBzaW4gPSBNYXRoLnNpbihsYXQgKiBNYXRoLlBJIC8gMTgwKSxcbiAgICAgICAgeSA9ICgwLjUgLSAwLjI1ICogTWF0aC5sb2coKDEgKyBzaW4pIC8gKDEgLSBzaW4pKSAvIE1hdGguUEkpO1xuICAgIHJldHVybiB5IDwgMCA/IDAgOiB5ID4gMSA/IDEgOiB5O1xufVxuXG4vLyBzcGhlcmljYWwgbWVyY2F0b3IgdG8gbG9uZ2l0dWRlL2xhdGl0dWRlXG5mdW5jdGlvbiB4TG5nKHgpIHtcbiAgICByZXR1cm4gKHggLSAwLjUpICogMzYwO1xufVxuZnVuY3Rpb24geUxhdCh5KSB7XG4gICAgdmFyIHkyID0gKDE4MCAtIHkgKiAzNjApICogTWF0aC5QSSAvIDE4MDtcbiAgICByZXR1cm4gMzYwICogTWF0aC5hdGFuKE1hdGguZXhwKHkyKSkgLyBNYXRoLlBJIC0gOTA7XG59XG5cbmZ1bmN0aW9uIGV4dGVuZChkZXN0LCBzcmMpIHtcbiAgICBmb3IgKHZhciBpZCBpbiBzcmMpIGRlc3RbaWRdID0gc3JjW2lkXTtcbiAgICByZXR1cm4gZGVzdDtcbn1cblxuZnVuY3Rpb24gZ2V0WChwKSB7XG4gICAgcmV0dXJuIHAueDtcbn1cbmZ1bmN0aW9uIGdldFkocCkge1xuICAgIHJldHVybiBwLnk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzb3J0ID0gcmVxdWlyZSgnLi9zb3J0Jyk7XG52YXIgcmFuZ2UgPSByZXF1aXJlKCcuL3JhbmdlJyk7XG52YXIgd2l0aGluID0gcmVxdWlyZSgnLi93aXRoaW4nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBrZGJ1c2g7XG5cbmZ1bmN0aW9uIGtkYnVzaChwb2ludHMsIGdldFgsIGdldFksIG5vZGVTaXplLCBBcnJheVR5cGUpIHtcbiAgICByZXR1cm4gbmV3IEtEQnVzaChwb2ludHMsIGdldFgsIGdldFksIG5vZGVTaXplLCBBcnJheVR5cGUpO1xufVxuXG5mdW5jdGlvbiBLREJ1c2gocG9pbnRzLCBnZXRYLCBnZXRZLCBub2RlU2l6ZSwgQXJyYXlUeXBlKSB7XG4gICAgZ2V0WCA9IGdldFggfHwgZGVmYXVsdEdldFg7XG4gICAgZ2V0WSA9IGdldFkgfHwgZGVmYXVsdEdldFk7XG4gICAgQXJyYXlUeXBlID0gQXJyYXlUeXBlIHx8IEFycmF5O1xuXG4gICAgdGhpcy5ub2RlU2l6ZSA9IG5vZGVTaXplIHx8IDY0O1xuICAgIHRoaXMucG9pbnRzID0gcG9pbnRzO1xuXG4gICAgdGhpcy5pZHMgPSBuZXcgQXJyYXlUeXBlKHBvaW50cy5sZW5ndGgpO1xuICAgIHRoaXMuY29vcmRzID0gbmV3IEFycmF5VHlwZShwb2ludHMubGVuZ3RoICogMik7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBvaW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0aGlzLmlkc1tpXSA9IGk7XG4gICAgICAgIHRoaXMuY29vcmRzWzIgKiBpXSA9IGdldFgocG9pbnRzW2ldKTtcbiAgICAgICAgdGhpcy5jb29yZHNbMiAqIGkgKyAxXSA9IGdldFkocG9pbnRzW2ldKTtcbiAgICB9XG5cbiAgICBzb3J0KHRoaXMuaWRzLCB0aGlzLmNvb3JkcywgdGhpcy5ub2RlU2l6ZSwgMCwgdGhpcy5pZHMubGVuZ3RoIC0gMSwgMCk7XG59XG5cbktEQnVzaC5wcm90b3R5cGUgPSB7XG4gICAgcmFuZ2U6IGZ1bmN0aW9uIChtaW5YLCBtaW5ZLCBtYXhYLCBtYXhZKSB7XG4gICAgICAgIHJldHVybiByYW5nZSh0aGlzLmlkcywgdGhpcy5jb29yZHMsIG1pblgsIG1pblksIG1heFgsIG1heFksIHRoaXMubm9kZVNpemUpO1xuICAgIH0sXG5cbiAgICB3aXRoaW46IGZ1bmN0aW9uICh4LCB5LCByKSB7XG4gICAgICAgIHJldHVybiB3aXRoaW4odGhpcy5pZHMsIHRoaXMuY29vcmRzLCB4LCB5LCByLCB0aGlzLm5vZGVTaXplKTtcbiAgICB9XG59O1xuXG5mdW5jdGlvbiBkZWZhdWx0R2V0WChwKSB7IHJldHVybiBwWzBdOyB9XG5mdW5jdGlvbiBkZWZhdWx0R2V0WShwKSB7IHJldHVybiBwWzFdOyB9XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gcmFuZ2U7XG5cbmZ1bmN0aW9uIHJhbmdlKGlkcywgY29vcmRzLCBtaW5YLCBtaW5ZLCBtYXhYLCBtYXhZLCBub2RlU2l6ZSkge1xuICAgIHZhciBzdGFjayA9IFswLCBpZHMubGVuZ3RoIC0gMSwgMF07XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciB4LCB5O1xuXG4gICAgd2hpbGUgKHN0YWNrLmxlbmd0aCkge1xuICAgICAgICB2YXIgYXhpcyA9IHN0YWNrLnBvcCgpO1xuICAgICAgICB2YXIgcmlnaHQgPSBzdGFjay5wb3AoKTtcbiAgICAgICAgdmFyIGxlZnQgPSBzdGFjay5wb3AoKTtcblxuICAgICAgICBpZiAocmlnaHQgLSBsZWZ0IDw9IG5vZGVTaXplKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gbGVmdDsgaSA8PSByaWdodDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgeCA9IGNvb3Jkc1syICogaV07XG4gICAgICAgICAgICAgICAgeSA9IGNvb3Jkc1syICogaSArIDFdO1xuICAgICAgICAgICAgICAgIGlmICh4ID49IG1pblggJiYgeCA8PSBtYXhYICYmIHkgPj0gbWluWSAmJiB5IDw9IG1heFkpIHJlc3VsdC5wdXNoKGlkc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBtID0gTWF0aC5mbG9vcigobGVmdCArIHJpZ2h0KSAvIDIpO1xuXG4gICAgICAgIHggPSBjb29yZHNbMiAqIG1dO1xuICAgICAgICB5ID0gY29vcmRzWzIgKiBtICsgMV07XG5cbiAgICAgICAgaWYgKHggPj0gbWluWCAmJiB4IDw9IG1heFggJiYgeSA+PSBtaW5ZICYmIHkgPD0gbWF4WSkgcmVzdWx0LnB1c2goaWRzW21dKTtcblxuICAgICAgICB2YXIgbmV4dEF4aXMgPSAoYXhpcyArIDEpICUgMjtcblxuICAgICAgICBpZiAoYXhpcyA9PT0gMCA/IG1pblggPD0geCA6IG1pblkgPD0geSkge1xuICAgICAgICAgICAgc3RhY2sucHVzaChsZWZ0KTtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobSAtIDEpO1xuICAgICAgICAgICAgc3RhY2sucHVzaChuZXh0QXhpcyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGF4aXMgPT09IDAgPyBtYXhYID49IHggOiBtYXhZID49IHkpIHtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobSArIDEpO1xuICAgICAgICAgICAgc3RhY2sucHVzaChyaWdodCk7XG4gICAgICAgICAgICBzdGFjay5wdXNoKG5leHRBeGlzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gc29ydEtEO1xuXG5mdW5jdGlvbiBzb3J0S0QoaWRzLCBjb29yZHMsIG5vZGVTaXplLCBsZWZ0LCByaWdodCwgZGVwdGgpIHtcbiAgICBpZiAocmlnaHQgLSBsZWZ0IDw9IG5vZGVTaXplKSByZXR1cm47XG5cbiAgICB2YXIgbSA9IE1hdGguZmxvb3IoKGxlZnQgKyByaWdodCkgLyAyKTtcblxuICAgIHNlbGVjdChpZHMsIGNvb3JkcywgbSwgbGVmdCwgcmlnaHQsIGRlcHRoICUgMik7XG5cbiAgICBzb3J0S0QoaWRzLCBjb29yZHMsIG5vZGVTaXplLCBsZWZ0LCBtIC0gMSwgZGVwdGggKyAxKTtcbiAgICBzb3J0S0QoaWRzLCBjb29yZHMsIG5vZGVTaXplLCBtICsgMSwgcmlnaHQsIGRlcHRoICsgMSk7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdChpZHMsIGNvb3JkcywgaywgbGVmdCwgcmlnaHQsIGluYykge1xuXG4gICAgd2hpbGUgKHJpZ2h0ID4gbGVmdCkge1xuICAgICAgICBpZiAocmlnaHQgLSBsZWZ0ID4gNjAwKSB7XG4gICAgICAgICAgICB2YXIgbiA9IHJpZ2h0IC0gbGVmdCArIDE7XG4gICAgICAgICAgICB2YXIgbSA9IGsgLSBsZWZ0ICsgMTtcbiAgICAgICAgICAgIHZhciB6ID0gTWF0aC5sb2cobik7XG4gICAgICAgICAgICB2YXIgcyA9IDAuNSAqIE1hdGguZXhwKDIgKiB6IC8gMyk7XG4gICAgICAgICAgICB2YXIgc2QgPSAwLjUgKiBNYXRoLnNxcnQoeiAqIHMgKiAobiAtIHMpIC8gbikgKiAobSAtIG4gLyAyIDwgMCA/IC0xIDogMSk7XG4gICAgICAgICAgICB2YXIgbmV3TGVmdCA9IE1hdGgubWF4KGxlZnQsIE1hdGguZmxvb3IoayAtIG0gKiBzIC8gbiArIHNkKSk7XG4gICAgICAgICAgICB2YXIgbmV3UmlnaHQgPSBNYXRoLm1pbihyaWdodCwgTWF0aC5mbG9vcihrICsgKG4gLSBtKSAqIHMgLyBuICsgc2QpKTtcbiAgICAgICAgICAgIHNlbGVjdChpZHMsIGNvb3JkcywgaywgbmV3TGVmdCwgbmV3UmlnaHQsIGluYyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgdCA9IGNvb3Jkc1syICogayArIGluY107XG4gICAgICAgIHZhciBpID0gbGVmdDtcbiAgICAgICAgdmFyIGogPSByaWdodDtcblxuICAgICAgICBzd2FwSXRlbShpZHMsIGNvb3JkcywgbGVmdCwgayk7XG4gICAgICAgIGlmIChjb29yZHNbMiAqIHJpZ2h0ICsgaW5jXSA+IHQpIHN3YXBJdGVtKGlkcywgY29vcmRzLCBsZWZ0LCByaWdodCk7XG5cbiAgICAgICAgd2hpbGUgKGkgPCBqKSB7XG4gICAgICAgICAgICBzd2FwSXRlbShpZHMsIGNvb3JkcywgaSwgaik7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgICBqLS07XG4gICAgICAgICAgICB3aGlsZSAoY29vcmRzWzIgKiBpICsgaW5jXSA8IHQpIGkrKztcbiAgICAgICAgICAgIHdoaWxlIChjb29yZHNbMiAqIGogKyBpbmNdID4gdCkgai0tO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNvb3Jkc1syICogbGVmdCArIGluY10gPT09IHQpIHN3YXBJdGVtKGlkcywgY29vcmRzLCBsZWZ0LCBqKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBqKys7XG4gICAgICAgICAgICBzd2FwSXRlbShpZHMsIGNvb3JkcywgaiwgcmlnaHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGogPD0gaykgbGVmdCA9IGogKyAxO1xuICAgICAgICBpZiAoayA8PSBqKSByaWdodCA9IGogLSAxO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gc3dhcEl0ZW0oaWRzLCBjb29yZHMsIGksIGopIHtcbiAgICBzd2FwKGlkcywgaSwgaik7XG4gICAgc3dhcChjb29yZHMsIDIgKiBpLCAyICogaik7XG4gICAgc3dhcChjb29yZHMsIDIgKiBpICsgMSwgMiAqIGogKyAxKTtcbn1cblxuZnVuY3Rpb24gc3dhcChhcnIsIGksIGopIHtcbiAgICB2YXIgdG1wID0gYXJyW2ldO1xuICAgIGFycltpXSA9IGFycltqXTtcbiAgICBhcnJbal0gPSB0bXA7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gd2l0aGluO1xuXG5mdW5jdGlvbiB3aXRoaW4oaWRzLCBjb29yZHMsIHF4LCBxeSwgciwgbm9kZVNpemUpIHtcbiAgICB2YXIgc3RhY2sgPSBbMCwgaWRzLmxlbmd0aCAtIDEsIDBdO1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgcjIgPSByICogcjtcblxuICAgIHdoaWxlIChzdGFjay5sZW5ndGgpIHtcbiAgICAgICAgdmFyIGF4aXMgPSBzdGFjay5wb3AoKTtcbiAgICAgICAgdmFyIHJpZ2h0ID0gc3RhY2sucG9wKCk7XG4gICAgICAgIHZhciBsZWZ0ID0gc3RhY2sucG9wKCk7XG5cbiAgICAgICAgaWYgKHJpZ2h0IC0gbGVmdCA8PSBub2RlU2l6ZSkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IGxlZnQ7IGkgPD0gcmlnaHQ7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChzcURpc3QoY29vcmRzWzIgKiBpXSwgY29vcmRzWzIgKiBpICsgMV0sIHF4LCBxeSkgPD0gcjIpIHJlc3VsdC5wdXNoKGlkc1tpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBtID0gTWF0aC5mbG9vcigobGVmdCArIHJpZ2h0KSAvIDIpO1xuXG4gICAgICAgIHZhciB4ID0gY29vcmRzWzIgKiBtXTtcbiAgICAgICAgdmFyIHkgPSBjb29yZHNbMiAqIG0gKyAxXTtcblxuICAgICAgICBpZiAoc3FEaXN0KHgsIHksIHF4LCBxeSkgPD0gcjIpIHJlc3VsdC5wdXNoKGlkc1ttXSk7XG5cbiAgICAgICAgdmFyIG5leHRBeGlzID0gKGF4aXMgKyAxKSAlIDI7XG5cbiAgICAgICAgaWYgKGF4aXMgPT09IDAgPyBxeCAtIHIgPD0geCA6IHF5IC0gciA8PSB5KSB7XG4gICAgICAgICAgICBzdGFjay5wdXNoKGxlZnQpO1xuICAgICAgICAgICAgc3RhY2sucHVzaChtIC0gMSk7XG4gICAgICAgICAgICBzdGFjay5wdXNoKG5leHRBeGlzKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXhpcyA9PT0gMCA/IHF4ICsgciA+PSB4IDogcXkgKyByID49IHkpIHtcbiAgICAgICAgICAgIHN0YWNrLnB1c2gobSArIDEpO1xuICAgICAgICAgICAgc3RhY2sucHVzaChyaWdodCk7XG4gICAgICAgICAgICBzdGFjay5wdXNoKG5leHRBeGlzKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHNxRGlzdChheCwgYXksIGJ4LCBieSkge1xuICAgIHZhciBkeCA9IGF4IC0gYng7XG4gICAgdmFyIGR5ID0gYXkgLSBieTtcbiAgICByZXR1cm4gZHggKiBkeCArIGR5ICogZHk7XG59XG4iXX0=
