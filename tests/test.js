"use strict";

var HTMLElement = require("html-cruncher");

var WebpageScraper = require("..");

var testSource = "http://localhost:8080";

module.exports = {
    setUp: function(done) {
        this.server = require("http").createServer(function(req, res) {
            res.writeHead(200);
            res.write("");
            res.end();
        });
        this.server.listen(8080);
        this.miner = new WebpageScraper("/dev");
        this.miner.getContent = function(url, document, callback) {
            setTimeout(function() {
                callback(null, "null", "");
            }, 0);
        };
        done();
    },
    tearDown: function(done) {
        this.server.close(function() {
            done();
        });
    },
    "Test methods": {
        "Test content returns nothing useful": function(test) {
            test.expect(3);
            this.miner = new WebpageScraper("/dev/null");
            this.miner.getContent(testSource, HTMLElement.fromString(""), function(err, filename, content) {
                test.equal(err, null);
                test.equal(filename, null);
                test.equal(content, "");
                test.done();
            });
        },
        "Test next source returns nothing useful": function(test) {
            test.expect(2);
            this.miner.getNextSource(testSource, HTMLElement.fromString(""), function(err, nextSource) {
                test.equal(err, null);
                test.equal(nextSource, null);
                test.done();
            });
        }
    },
    "Test indefinite": {
        "Test get content error": function(test) {
            test.expect(1);
            this.miner.getContent = function(a, b, callback) {
                callback(new Error("Uh oh boo boo."));
            };
            this.miner.runIndefinitely(testSource, function(err) {
                test.equal(err.message, "Uh oh boo boo.");
                test.done();
            });
        },
        "Test get next source error": function(test) {
            test.expect(1);
            this.miner.getNextSource = function(a, b, callback) {
                callback(new Error("Uh oh boo boo."));
            };
            this.miner.runIndefinitely(testSource, function(err) {
                test.equal(err.message, "Uh oh boo boo.");
                test.done();
            });
        },
        "Test success": function(test) {
            test.expect(4);
            var i = 3;
            this.miner.getNextSource = function(url, document, next) {
                if ( i-- === 0 ) {
                    next(null, null);
                }
                else {
                    test.ok(true);
                    next(null, url);
                }
            };
            this.miner.runIndefinitely(testSource, function(err) {
                test.ifError(err);
                test.done();
            });
        }
    },
    "Test concurrent": {
        "Test bad call args": function(test) {
            test.expect(1);
            this.miner.runConcurrent(testSource, "5", function(err) {
                test.equal(err.message, "maxConcurrent must be a number.");
                test.done();
            });
        },
        "Test get content error": function(test) {
            test.expect(1);
            this.miner.getNextSource = function(a, b, callback) {
                callback(null, null);
            };
            this.miner.getContent = function(a, b, callback) {
                callback(new Error("Uh oh boo boo."));
            };
            this.miner.runConcurrent(testSource, 1, function(err) {
                test.equal(err.message, "Uh oh boo boo.");
                test.done();
            });
        },
        "Test get next source error": function(test) {
            test.expect(1);
            this.miner.getNextSource = function(a, b, callback) {
                callback(new Error("Uh oh boo boo."));
            };
            this.miner.runConcurrent(testSource, 1, function(err) {
                test.equal(err.message, "Uh oh boo boo.");
                test.done();
            });
        },
        "Test get next source error no callback": function(test) {
            test.expect(1);
            this.miner.getNextSource = function(a, b, callback) {
                callback(new Error("Uh oh boo boo."));
            };
            test.throws(function() {
                this.miner.runConcurrent(testSource, 1);
            });
            test.done();
        },
        "Test success": function(test) {
            test.expect(9);
            var i = 6;
            this.miner.getNextSource = function(url, document, next) {
                setTimeout(function() {
                    test.ok(true);
                    if ( --i === 0 ) {
                        next(null, null);
                    }
                    else {
                        next(null, url);
                    }
                }, 0);
            };
            this.miner.getContent = function(url, document, next) {
                setTimeout(function() {
                    next(null, "null", "");
                }, 50);
            };
            var start = new Date();
            this.miner.runConcurrent(testSource, 5, function(err) {
                test.ifError(err);
                var end = new Date();
                var taken = end.getTime() - start.getTime();
                test.ok(taken > 100, "Took less than 100 ms (" + taken + ")");
                test.ok(taken < 200, "Took more than 200 ms (" + taken + ")");
                test.done();
            });
        }
    }
};
