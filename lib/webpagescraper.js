"use strict";

var fs = require("fs");

var request = require("request");
var HTMLElement = require("html-cruncher");

function WebpageScraper(writeRoot) {
    this.itemIndex = 0;
    this.runningTasks = 0;
    this.waitingTasks = 0;
    this.writeRoot = writeRoot;
}

WebpageScraper.defaultCallback = function(err) {
    if ( err ) {
        throw err;
    }
}
WebpageScraper.prototype.getContent = function(source, document, next) {
    setTimeout(function() {
        return next(null, null, "");
    }, 0);
};

WebpageScraper.prototype.getNextSource = function(source, document, next) {
    setTimeout(function() {
        return next(null, null);
    }, 0);
};

WebpageScraper.prototype.runIndefinitely = function(source, callback) {
    callback = callback || WebpageScraper.defaultCallback;
    var self = this;
    var index = self.itemIndex++;
    request(source, function(err, response, body) {
        if ( err ) {
            return callback(err);
        }

        source = response.request.uri.href; // Actual URL after possible redirs.

        var document = HTMLElement.fromString(body.toString());
        self.getContent(source, document, function(err, filename, body) {
            if ( err ) {
                return callback(err);
            }
            filename = filename || index;
            var writePath = self.writeRoot + "/" + filename;
            fs.writeFile(writePath, body, "binary", function(err) {
                if ( err ) {
                    return callback(err);
                }
                self.getNextSource(source, document, function(err, nextSource) {
                    if ( err ) {
                        return callback(err);
                    }
                    if ( nextSource != null ) {
                        self.runIndefinitely(nextSource, callback);
                    }
                    else {
                        callback();
                    }
                });
            });
        });
    });
};

WebpageScraper.prototype.runConcurrent = function(source, maxConcurrent, callback) {
    callback = callback || WebpageScraper.defaultCallback;
    var self = this;

    if ( typeof maxConcurrent !== "number" ) {
        return callback(new Error("maxConcurrent must be a number."));
    }

    self._runConcurrentWait(source, maxConcurrent, 100, callback);
};

WebpageScraper.prototype._runConcurrentWait = function(source, maxConcurrent, wait, callback) {
    var self = this;
    if ( this.runningTasks === maxConcurrent ) {
        if ( wait === 100 ) {
            ++this.waitingTasks;
        }
        setTimeout(function() {
            self._runConcurrentWait(source, maxConcurrent, wait * 2, callback);
        }, wait);
    }
    else {
        if ( wait !== 100 ) {
            --this.waitingTasks;
        }
        self._runConcurrent(source, maxConcurrent, callback);
    }
};

WebpageScraper.prototype._runConcurrent = function(source, maxConcurrent, callback) {
    var self = this;
    var index = self.itemIndex++;
    ++self.runningTasks;
    request(source, function(err, response, body) {
        if ( err ) {
            return callback(err);
        }

        var document = HTMLElement.fromString(body.toString());
        self.getNextSource(source, document, function(err, nextSource) {
            if ( err ) {
                return callback(err);
            }

            if ( nextSource ) {
                self.runConcurrent(nextSource, maxConcurrent, callback);
            }

            self.getContent(source, document, function(err, filename, body) {
                if ( err ) {
                    return callback(err);
                }

                filename = filename || index;
                var writePath = self.writeRoot + "/" + filename;
                fs.writeFile(writePath, body, "binary", function(err) {
                    if ( err ) {
                        return callback(err);
                    }

                    if ( --self.runningTasks === 0 && self.waitingTasks === 0 ) {
                        callback();
                    }
                });
            });
        });
    });
};

module.exports = WebpageScraper;
