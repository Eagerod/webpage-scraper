# Webpage Scraper
I created this project because I've always found use cases where having the ability to quickly and easily iterate through pages in a website and acquire various pieces of information.
I've written different tools pretty much identical to this one in nearly every language I've known, just because every time I've needed the tool, I've been more proficient in a different language at the time of need.
It can also sometimes be a fun programming exercise.

## Installing
```
npm install webpage-scraper
```

## Usage
The base implementation of the scraper doesn't do anything with the documents it downloads. 

In order to get it doing useful stuff, you'll have to either subclass the basic scraper, or provide an instance with a way of extracting whatever content you want from the document.

## Example
This snippet pulls in this readme from github, and writes it to `/tmp/readme.html`.

```
var miner = new WebpageMiner("/tmp/");

miner.getContent = function(url, document, next) {
    var readme = document.getElementById("readme");
    return next(null, "readme.html",  readme.toString())
};

miner.runIndefinitely("https://github.com/Eagerod/webpage-scraper", function(err) {
    if ( err ) {
        throw err;
    }
});
```

## Features
The scraper provides a serial, and a concurrent method of loading up content. 
The concurrent method isn't as reliable as I'd like it to be right now, but it's reasonably functional.

It currently uses a extremely simple exponential backoff to slow down concurrent requests when you pass the limit you provide, but it would be nice if it used a proper queuing mechanism. 
