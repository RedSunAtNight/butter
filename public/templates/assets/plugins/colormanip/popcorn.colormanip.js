/*
*   popcorn.colormanip.js
*   Change the colors on a segment of video.
*   Color options are black and white, sepia, and custom.
*
*   This will NOT work cross-domain. It works by copying the image data from
*   a canvas which contains a frame of video, manipulating the image, and
*   re-placing the image on a canvas. For security reasons, most browsers
*   will not allow reading data that has been copied from an external
*   source onto an invisible canvas.
*
*   TODO: Figure out how to play nice with aspect ratio.
*
*   Color Manipulation Plug-in
*
*   @param {Object} options
*
*   Required parameters: start, end, coloring
*   Optional parameters: customRed, customGreen, customBlue
*
*       start: the time in seconds when the change in color should be applied
*
*       end: the time in seconds when the colors should return to normal
*
*       coloring: values may be "color-no-change", "blackwhite", "sepia", or "custom"
*                 The change in color to be applied.
*
*       customRed: the amount of red, from 0 to 255, to add to the video image
*
*       customGreen: the amount of green, from 0 to 255, to add to the video image
*
*       customBlue: the amount of blue, from 0 to 255, to add to the video image
*
*   Example:
*
*   // We want more green, a little more red, but less blue
*   Popcorn( function(){
*       var popcorn = Popcorn("#video");
*       popcorn.colormanip({
*           "start": 1.4,
*           "end": 5.2,
*           "coloring": "custom",
*           "customRed": 10,
*           "customGreen": 30,
*           "customBlue": -30
*       });
*   });
*/

(function( Popcorn ) {
    Popcorn.plugin("colormanip", (function() {
        // plugin-wide variables go here
            
        function makeBW(media, bufctx, colctx, w, h, framecount) {
            framecount += 1;
            //console.log('in function makeBW()');
            bufctx.drawImage(media, 0, 0);
            var imgD = bufctx.getImageData(0, 0, w, h), // will not work cross-domain
                pixels = imgD.data;
            // change pixels to black-and-white pixels
            for (var i = 0; i < pixels.length; i += 4) {
                var red = pixels[i],
                    green = pixels[i+1],
                    blue = pixels[i+2],
                    gray = ( red + green + blue ) / 3;
                pixels[i] = gray;
                pixels[i+1] = gray;
                pixels[i+2] = gray;
                // keep pixels[i+3] the same, as that's alpha - the opacity.
            }
            colctx.putImageData(imgD, 0, 0);
            var redrawID = setTimeout(makeBW, 20, media, bufctx, colctx, w, h, framecount); // this is WAY better than telling it to redraw on timeupdate
            // No need to have it keep drawing when the video is paused:
            var colorsPaused = function() {clearTimeout(redrawID)};
            media.addEventListener('pause', colorsPaused);
            if (framecount === 1) {
                return redrawID;
            }
        }
        
        function makeSepia(media, bufctx, colctx, w, h, framecount) {
            framecount += 1;
            //console.log('in function makeSepia');
            bufctx.drawImage(media, 0, 0);
            var imgD = bufctx.getImageData(0, 0, w, h), // will not work cross-domain
                pixels = imgD.data;
            // change pixels to black-and-white pixels
            for (var i = 0; i < pixels.length; i += 4) {
                var red = pixels[i],
                    green = pixels[i+1],
                    blue = pixels[i+2],
                    gray = ( red + green + blue ) / 3;
                pixels[i] = gray + 46;
                pixels[i+1] = gray; // was + 56
                pixels[i+2] = gray - 46;
                // keep pixels[i+3] the same, as that's alpha - the opacity.
            }
            colctx.putImageData(imgD, 0, 0);
            var redrawID = setTimeout(makeSepia, 20, media, bufctx, colctx, w, h, framecount); // this is WAY better than telling it to redraw on timeupdate
            var colorsPaused = function() {clearTimeout(redrawID)};
            media.addEventListener('pause', colorsPaused);
            if (framecount === 1) {
                return redrawID;
            }
        }
        
        function adjustColor(media, bufctx, colctx, w, h, framecount, redAdd, greenAdd, blueAdd) {
            //console.log('in adjustColor()');
            framecount += 1;
            bufctx.drawImage(media, 0, 0);
            var imgD = bufctx.getImageData(0, 0, w, h), // will not work cross-domain
                pixels = imgD.data;
            // add values to each color in each pixel
            for (var i = 0; i < pixels.length; i += 4) {
                pixels[i] += redAdd;
                pixels[i+1] += greenAdd;
                pixels[i+2] += blueAdd;
                // keep pixels[i+3] the same, as that's alpha - the opacity.
            }
            colctx.putImageData(imgD, 0, 0);
            var redrawID = setTimeout(adjustColor, 20, media, bufctx, colctx, w, h, framecount, redAdd, greenAdd, blueAdd); // this is WAY better than telling it to redraw on timeupdate
            var colorsPaused = function() {clearTimeout(redrawID)};
            media.addEventListener('pause', colorsPaused);
            if (framecount === 1) {
                return redrawID;
            }
        }
        
        return {
            // Next is the manifest, which tells Butter how to build a form
            manifest: {
                about: {
                    name: "Color Manipulation",
                    version: "0.1",
                    author: "Helenka Casler",
                },
                options: {
                    start: {
                        elem: "input",
                        type: "text",
                        label: "Start"
                    },
                    end: {
                        elem: "input",
                        type: "text",
                        label: "End"
                    },
                    //target: "#video", // should 'stick' to a particular video element
                    coloring: {
                        elem: "select",
                        options: ["As-is", "Black & White", "Sepia", "Custom"],
                        values:["color-no-change", "blackwhite", "sepia", "custom"],
                        label: "Colors",
                        "default": "color-no-change"
                    },
                    customRed: {
                        elem: "input",
                        type: "number",
                        label: "Red",
                        "default": 0
                    },
                    customGreen: {
                        elem: "input",
                        type: "number",
                        label: "Green",
                        "default": 0
                    },
                    customBlue: {
                        elem: "input",
                        type: "number",
                        label: "Blue",
                        "default": 0
                    }
                }
            }, // end manifest
            
            // For everything below:
            //  "this" refers to the popcorn object
            //  track (passed in as an argument) refers to the trackevent created by the options passed
            //  event refers to the event object
            _setup: function (options) {
                console.log('setting up colormanip...');
                
                options.makeBW = function(media, bufctx, colctx, w, h, framecount) {
                    framecount += 1;
                    console.log('in function makeBW()');
                    bufctx.drawImage(media, 0, 0);
                    console.log('drew the video frame on the buffer canvas');
                    var imgD = bufctx.getImageData(0, 0, w, h), // Will only work if the video comes from the same domain as the code
                        pixels = imgD.data;
                    console.log('got image data');
                    // change pixels to black-and-white pixels
                    for (var i = 0; i < pixels.length; i += 4) {
                        var red = pixels[i],
                            green = pixels[i+1],
                            blue = pixels[i+2],
                            gray = ( red + green + blue ) / 3;
                        pixels[i] = gray;
                        pixels[i+1] = gray;
                        pixels[i+2] = gray;
                        // keep pixels[i+3] the same, as that's alpha - the opacity.
                    }
                    colctx.putImageData(imgD, 0, 0);
                    console.log('placed new image data');
                    var redrawID = setTimeout(options.makeBW, 20, media, bufctx, colctx, w, h, framecount); // this is WAY better than telling it to redraw on timeupdate
                    console.log('timeout is set');
                    // No need to have it keep drawing when the video is paused:
                    options.colorsPaused = function() {clearTimeout(redrawID)};
                    console.log('made clear-timeout function');
                    media.addEventListener('pause', options.colorsPaused);
                    console.log('set pause event listener');
                    if (framecount === 1) {
                        console.log('Started up makeBW()');
                        return redrawID;
                    }
                }
                
                options.makeSepia = function(media, bufctx, colctx, w, h, framecount) {
                    framecount += 1;
                    //console.log('in function makeSepia');
                    bufctx.drawImage(media, 0, 0);
                    var imgD = bufctx.getImageData(0, 0, w, h), // will not work cross-domain
                        pixels = imgD.data;
                    // change pixels to black-and-white pixels
                    for (var i = 0; i < pixels.length; i += 4) {
                        var red = pixels[i],
                            green = pixels[i+1],
                            blue = pixels[i+2],
                            gray = ( red + green + blue ) / 3;
                        pixels[i] = gray + 46;
                        pixels[i+1] = gray; // was + 56
                        pixels[i+2] = gray - 46;
                        // keep pixels[i+3] the same, as that's alpha - the opacity.
                    }
                    colctx.putImageData(imgD, 0, 0);
                    var redrawID = setTimeout(options.makeSepia, 20, media, bufctx, colctx, w, h, framecount); // this is WAY better than telling it to redraw on timeupdate
                    options.colorsPaused = function() {clearTimeout(redrawID)};
                    media.addEventListener('pause', options.colorsPaused);
                    if (framecount === 1) {
                        console.log('started up makeSepia()');
                        return redrawID;
                    }
                }
                
                options.adjustColor = function(media, bufctx, colctx, w, h, framecount, redAdd, greenAdd, blueAdd) {
                    //console.log('in adjustColor()');
                    framecount += 1;
                    bufctx.drawImage(media, 0, 0);
                    var imgD = bufctx.getImageData(0, 0, w, h), // will not work cross-domain
                        pixels = imgD.data;
                    // add values to each color in each pixel
                    for (var i = 0; i < pixels.length; i += 4) {
                        pixels[i] += redAdd;
                        pixels[i+1] += greenAdd;
                        pixels[i+2] += blueAdd;
                        // keep pixels[i+3] the same, as that's alpha - the opacity.
                    }
                    colctx.putImageData(imgD, 0, 0);
                    var redrawID = setTimeout(options.adjustColor, 20, media, bufctx, colctx, w, h, framecount, redAdd, greenAdd, blueAdd); // this is WAY better than telling it to redraw on timeupdate
                    options.colorsPaused = function() {clearTimeout(redrawID)};
                    media.addEventListener('pause', options.colorsPaused);
                    if (framecount === 1) {
                        console.log('started up adjustColor()');
                        return redrawID;
                    }
                }
                
                
                
                var _this = this,
                    _mediaHolder,
                    _coloring = options.coloring,
                    _colorCanvas,
                    _bufferCanvas,
                    _media,
                    _redAdd = options.customRed,
                    _greenAdd = options.customGreen,
                    _blueAdd = options.customBlue,
                    _bufctx,
                    _colctx,
                    w,
                    h;
                    
                if (_this.media.tagName === 'video'){
                    // If you're using this as a Popcorn plugin without Butter
                    console.log('... Popcorn.media property is a video element');
                    _media = _this.media;
                    options.isTargetingVideo = true;
                } else if (_this.sequenceIDs){
                    console.log('... getting media from sequenceIDs object');
                    Popcorn.forEach(_this.sequenceIDs, function(value, key, item){
                        // key is the id of a video element used in a sequence.
                        // value is an object containing the start and end times for the clip.
                        // if the aspect ratio event starts before the clip is over AND ends after the clip starts
                        if (options.start < value.end && options.end > value.start){
                            console.log('Using video element ' + key);
                            _media = document.getElementById(key);
                            options.isTargetingVideo = true;
                        }
                    });
                } else {
                    console.log('Using non-video Popcorn.media property');
                    _media = _this.media;
                    options.isTargetingVideo = false;
                }
                
                options.media = _media;
                _mediaHolder = _media.parentNode;
                options.colorID = Popcorn.guid('colormanip-color-');
                    
                //console.log('Popcorn media is ' + media);
                    
                function makeCanvases() {
                    if (options.isTargetingVideo) {
                        // If this is coming from Popcorn Maker, the video itself may have different proportions than the video element.
                        // This should get the values for the video itself.
                        h = _media.offsetHeight; // height of video element
                        w = _media.offsetWidth; // width of video element
                        var vidH = _media.videoHeight, // height of video itself
                            vidW = _media.videoWidth; // width of video itself
                        if (h != vidH || w != vidW) {
                            // if the video has "shorter and wider" proportions than the video element
                            if (vidW/vidH > w/h) {
                                // use the width of the video element, get the correct height
                                h = w * vidH / vidW;
                                options.isHeightDiff = true;
                                options.isWidthDiff = false;
                            }
                            // if the video has "taller and skinnier" proportions than the video element
                            else if (vidW/vidH < w/h) {
                                // use the height of the video element, get the correct width
                                w = h * vidW / vidH;
                                options.isHeightDiff = false;
                                options.isWidthDiff = true;
                            }
                            // if the proportions are the same
                            else {
                                // Do nothing, w and h are already fine.
                                options.isHeightDiff = false;
                                options.isWidthDiff = false;
                            }
                        }
                    } else {
                        w = _media.width;
                        h = _media.height;
                        options.isHeightDiff = false;
                        options.isWidthDiff = false;
                    }
                    options.canvasHeight = h;
                    options.canvasWidth = w;
                    
                    // create a canvas to display the color-changed video, and a div to hold the canvas
                    var candiv = document.createElement('div');
                    candiv.style.position = 'absolute';
                    _mediaHolder.appendChild(candiv);
                    // If the video is not the same dimensions as the video element, we need to make sure the canvas is centered
                    if (options.isHeightDiff) {
                        var topPosition = (_media.offsetHeight - h) / 2;
                        candiv.style.top = topPosition + 'px';
                    } else {
                        candiv.style.top = _media.offsetTop + 'px';
                    }
                    if (options.isWidthDiff) {
                        var leftPosition = (_media.offsetWidth - w) / 2;
                        candiv.style.left = leftPosition + 'px';
                    } else {
                        candiv.style.left = _media.offsetLeft + 'px';
                    }
                    _colorCanvas = document.createElement('canvas');
                    _colorCanvas.setAttribute('id', options.colorID);
                    _colorCanvas.style.display = 'none';
                    _colorCanvas.width = w;
                    _colorCanvas.height = h;
                    candiv.appendChild(_colorCanvas);
                    
                    _colctx = _colorCanvas.getContext('2d');
                    options.colorCanvas = _colorCanvas;
                    
                    // create a buffer canvas to hold each frame for processing
                    // note that it just "floats" and is never appended to the document
                    _bufferCanvas = document.createElement('canvas');
                    _bufferCanvas.style.display = 'none';
                    _bufferCanvas.width = w;
                    _bufferCanvas.height = h;
                    _bufctx = _bufferCanvas.getContext('2d');
                    options.bufferCanvas = _bufferCanvas;
                    console.log('The variable bufctx is ' + _bufctx);
                    
                    // handlers for blackwhite, sepia, and custom
                    options.bwHandler = function(){
                        var framecounter = 0;
                        console.log('Playing. The variable bufctx is ' + _bufctx);
                        options.redrawID = options.makeBW(_media, _bufctx, _colctx, w, h, framecounter);
                    };
                    options.sepiaHandler = function(){
                        var framecounter = 0;
                        options.redrawID = options.makeSepia(_media, _bufctx, _colctx, w, h, framecounter);
                    };
                    options.customColorHandler = function(){
                        var framecounter = 0;
                        options.redrawID = options.adjustColor(_media, _bufctx, _colctx, w, h, framecounter, _redAdd, _greenAdd, _blueAdd);
                    };
                    
                    
                    if (_coloring === "color-no-change"){
                        return;
                    }
                    else if (_coloring === "blackwhite"){
                        _media.addEventListener('play', options.bwHandler);
                    }
                    else if (_coloring === "sepia"){
                        _media.addEventListener('play', options.sepiaHandler);
                    }
                    else if (_coloring === "custom"){
                        _media.addEventListener('play', options.customColorHandler);
                    }
                }
                
                if (_media.readyState >= 3) {
                    makeCanvases();
                }
                else {
                    window.addEventListener('load', makeCanvases);
                }
                
                console.log('setup complete');
            },
            _update: function (trackEvent, options) {
                /* code for update of plugin-created track event
                    mostly redoes _setup */
                console.log('color manipulation updating...');
                
                // will need to:
                //  pull down old color canvas
                //  make new color canvas
                //  re-call makeBW/makeSepia/adjustColor
                //  put new data into trackEvent
                
                if ((options.coloring && options.coloring != trackEvent.coloring) || (options.customRed && options.customRed != trackEvent.customRed) || (options.customGreen && options.customGreen != trackEvent.customGreen) || (options.customBlue && options.customBlue != trackEvent.customBlue)) {
                    // what to do if "coloring" is an updated option, and it's not the same as the old coloring option,
                    // or if new custom colors were entered
                    console.log('updating color scheme...')
                    var newColoring = options.coloring || trackEvent.coloring;
                    console.log('Old color scheme was ' + trackEvent.coloring + ' and new is ' + newColoring);
                    
                    // no reason to make a whole new canvas - just remove the old event listeners
                    if (trackEvent.coloring === 'blackwhite') {
                        console.log('removing black and white listener');
                        trackEvent.media.removeEventListener('play', trackEvent.bwHandler);
                    } else if (trackEvent.coloring === 'sepia') {
                        trackEvent.media.removeEventListener('play', trackEvent.sepiaHandler);
                    } else if (trackEvent.coloring === 'custom') {
                        trackEvent.media.removeEventListener('play', trackEvent.customColorHandler);
                    }
                    
                    if (trackEvent.coloring != 'color-no-change') {
                        console.log('removing pause listener');
                        trackEvent.media.removeEventListener('pause', trackEvent.colorsPaused); // fails here
                    }
                    console.log('removed all event listeners');
                    
                    // set up variable names here
                    var _media = trackEvent.media,
                        _bufctx = trackEvent.bufferCanvas.getContext('2d'),
                        _colctx = trackEvent.colorCanvas.getContext('2d'),
                        w = trackEvent.canvasWidth,
                        h = trackEvent.canvasHeight,
                        framecounter = 0,
                        _redAdd = options.customRed || trackEvent.customRed,
                        _greenAdd = options.customGreen || trackEvent.customGreen,
                        _blueAdd = options.customBlue || trackEvent.customBlue;
                        
                    
                    console.log('variable names are all set');
                        
                    
                    // new handlers for blackwhite, sepia, and custom
                    // Did this to make sure the new values are used
                    trackEvent.bwHandler = function(){
                        var framecounter = 0;
                        console.log('Playing. BW has been updated at some point.');
                        trackEvent.redrawID = trackEvent.makeBW(_media, _bufctx, _colctx, w, h, framecounter);
                    };
                    trackEvent.sepiaHandler = function(){
                        console.log('Playing. Sepia has been updated at some point.');
                        var framecounter = 0;
                        trackEvent.redrawID = trackEvent.makeSepia(_media, _bufctx, _colctx, w, h, framecounter);
                    };
                    trackEvent.customColorHandler = function(){
                        console.log('Playing. Custom has been updated at some point.');
                        var framecounter = 0;
                        trackEvent.redrawID = trackEvent.adjustColor(_media, _bufctx, _colctx, w, h, framecounter, _redAdd, _greenAdd, _blueAdd);
                    };
                    console.log('color handlers are made');
                    
                    // Now, to make the actual changes
                    if (newColoring === "color-no-change"){
                        console.log('New coloring is: no manipulation');
                        return;
                    }
                    else if (newColoring === "blackwhite"){
                        console.log('New coloring is: black and white');
                        _media.addEventListener('play', trackEvent.bwHandler);
                    }
                    else if (newColoring === "sepia"){
                        console.log('New coloring is: sepia');
                        _media.addEventListener('play', trackEvent.sepiaHandler);
                    }
                    else if (newColoring === "custom"){
                        console.log('New coloring is: red: ' + _redAdd + ', green: ' + _greenAdd + ', blue: ' + _blueAdd);
                        _media.addEventListener('play', trackEvent.customColorHandler);
                    }
                    trackEvent.coloring = newColoring;
                    trackEvent.customRed = _redAdd;
                    trackEvent.customGreen = _greenAdd;
                    trackEvent.customBlue = _blueAdd;
                    console.log('updated track event data');
                }
                // if the new coloring option is the same as the old, and it's either sepia or black and white, no need to change anything
                
                console.log('update complete');
            },
            _teardown: function (options) {
                /* code for removal of plugin or destruction of instance */
                console.log('removing event listeners...');
                // remove event listeners
                options.media.removeEventListener('play', options.bwHandler);
                options.media.removeEventListener('play', options.sepiaHandler);
                options.media.removeEventListener('play', options.customColorHandler);
                options.media.removeEventListener('pause', colorsPaused);
                console.log('...event listeners removed.');
                // remove canvas and the div that held it
                canvasDiv = options.colorCanvas.parentNode;
                canvasDiv.removeChild(options.colorCanvas);
                console.log('color canvas removed');
                divParent = canvasDiv.parentNode;
                divParent.removeChild(canvasDiv);
                console.log('canvas container removed');
            },
            start: function (event, options) {
                console.log('colormanip starting');
                options.colorCanvas.style.display = '';
            },
            end: function (event, options) {
                console.log('colormanip ending');
                options.colorCanvas.style.display = 'none';
            },
            frame: function (event, track) {/* code will fire on every frame between end and start, if frameAnimation is enabled*/},
            toString: function () {
                /* provides a string representation for the plugin */
                return 'Color adjustment'
            }
        };
    })());
})(Popcorn);