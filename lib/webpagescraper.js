"use strict";

var fs = require("fs");

var request = require("request");
var HTMLElement = require("html-cruncher");

/**
    @class WebpageScraper
    @classdesc Simple class that provides an interface through which you can 
    iterate through pages and pull some useful stuff off of it.

    @property itemIndex {Number} A running index of the current download 
    task that's running.
    @property runningTasks {Number} The current number of tasks that are in 
    progress.
    @property waitingTasks {Number} The number of tasks that are waiting to
    execute.
    @property writeRoot {String} The local path that the scraper will write to
    when content is found.
*/
function WebpageScraper(writeRoot) {
    this.itemIndex = 0;
    this.runningTasks = 0;
    this.waitingTasks = 0;
    this.writeRoot = writeRoot;
}

/**
    Callback that gets assigned to callback blocks when no explicit callback
    is specified.

    @param err {Error} An Error object or null/undefined.
*/
WebpageScraper.defaultCallback = function(err) {
    if ( err ) {
        throw err;
    }
}

/**
    Fetch the desired content from a provided document.

    @param source {String} The URL from which the document was loaded.
    @param document {HTMLElement} The html document that was loaded from the source.
    @param next {Function} A 3-parameter function(error, suggestedFilename, content)
    that must be called when the desired content has been extracted.
*/
WebpageScraper.prototype.getContent = function(source, document, next) {
    setTimeout(function() {
        return next(null, null, "");
    }, 0);
};

/**
    Get the url of the next item to fall through this process.

    @param source {String} The URL from which the document was loaded.
    @param document {HTMLElement} The html document that was loaded from the source.
    @param next {Function} A 2-parameter function(error, nextURL) that must be called
    when the URL of the next document is ready.
*/
WebpageScraper.prototype.getNextSource = function(source, document, next) {
    setTimeout(function() {
        return next(null, null);
    }, 0);
};

/**
    Run the scraper in a serial format.

    @param source {String} The URL of the item to fetch and save.
    @param callback {Function} A 1-parameter function(error) that will be called
    when execution completes (i.e. when there are no more sources to fetch, or
    there was an error).
*/
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

/**
    Run the scraper concurrently. Starts the next document retrieval before fetching
    the content from the initial document.

    @param source {String} The URL of the item to fetch and save.
    @param maxConcurrent {Number} The maximum number of requests to have in 
    progress at one time. 
    @param callback {Function} A 1-parameter function(error) that will be called
    when execution completes (i.e. when there are no more sources to fetch, or
    there was an error).
*/
WebpageScraper.prototype.runConcurrent = function(source, maxConcurrent, callback) {
    callback = callback || WebpageScraper.defaultCallback;
    var self = this;

    if ( typeof maxConcurrent !== "number" ) {
        return callback(new Error("maxConcurrent must be a number."));
    }

    self._runConcurrentWait(source, maxConcurrent, 100, callback);
};

/**
    Private method for holding onto a request's arguments and using exponential 
    backoff to prevent busywaiting.

    @param source {String} The URL of the item to fetch and save.
    @param maxConcurrent {Number} The maximum number of requests to have in 
    progress at one time. 
    @param wait {Number} Number of milliseconds to wait if there isn't an enqueuable
    slot available.
    @param callback {Function} A 1-parameter function(error) that will be called
    when execution completes (i.e. when there are no more sources to fetch, or
    there was an error).
*/
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

/**
    Execute a concurrent task.

    @param source {String} The URL of the item to fetch and save.
    @param maxConcurrent {Number} The maximum number of requests to have in 
    progress at one time. 
    @param callback {Function} A 1-parameter function(error) that will be called
    when execution completes (i.e. when there are no more sources to fetch, or
    there was an error).
*/
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
