/*
*   aspectratio.js
*   This plugin changes the aspect ratio of the video.
*
*   currently broken. problem is on line 157
*
*   TODO: Needs to update origHeight and origWidth when the video changes.
*       in _update: Needs to check that the targetVideo is the same as it was in _setup, and update if it has not
*       the height and width parameters need to work in both div and video element versions.
*       This is going to have to be different for plain Popcorn vs Butter, I think.
*           Otherwise: need a way to definitely get a video, while only getting the right video.
*/

(function( Popcorn ) {
    Popcorn.plugin("aspectratio", (function() {
        // plugin-wide variables go here
        var _plid = 0,
            identifiers = {};
        
            
        // function for getting the coordinates of an object in the window, even if it lacks absolute position.
        // Stolen from StackOverflow, user YOU posted as an answer here:
        // http://stackoverflow.com/questions/1769584/get-position-of-element-by-javascript
        function getCoords(obj) {
            var theObj = obj;
            var left = theObj.offsetLeft,
                top = theObj.offsetTop;
            while (theObj = theObj.offsetParent) {
                left += theObj.offsetLeft;
            }
            theObj = obj;
            while (theObj = theObj.offsetParent) {
                top += theObj.offsetTop;
            }
            return [left, top];
        }
        
        // function to make the necessary style elements to deform the video:
        function createStyle(oldRatio, newRatio, className, width, oldHeight){
            var heightRatio = oldRatio / newRatio;
            var cssString = '.' + className + ' { transform:scale(1 ,' + heightRatio + '); -ms-transform:scale(1,' + heightRatio + '); -moz-transform:scale(1,' + heightRatio + '); -webkit-transform:scale(1,' + heightRatio + '); -o-transform:scale(1,' + heightRatio + '); }';
            var styleElem = document.createElement('style');
            styleElem.setAttribute('type', 'text/css');
            styleElem.setAttribute('id', className); // so we can find and remove it later, if necessary
            styleElem.innerHTML = cssString;
            document.head.appendChild(styleElem);
        }
        
        // function to make the black bars over the edges of the video
        function createBars(media, oldRatio, newRatio, barId, width, height){
            // step one: determine the dimensions and orientation of the bars
            var heightRatio = oldRatio / newRatio,
                barOrient,
                barWidth;
            if (heightRatio < 1) {
                barOrient = "horizontal";
                barWidth = height * (1 - heightRatio) / 2;
            }
            else if (heightRatio > 1) {
                barOrient = "vertical";
                barWidth = (width - (newRatio * height)) / 2;
            }
                    
            // step two: make the div to hold the canvas, and the canvas itself
            var vidContainer = media.parentNode,
                barContainer = document.createElement('div'),
                barCanvas = document.createElement('canvas'),
                mediaPosition = [media.offsetLeft, media.offsetTop],
                ctx = barCanvas.getContext('2d');
            
            barContainer.setAttribute('id', 'barContainer-'+barId);            
            barContainer.style.position = 'absolute';
            // if necessary, account for the video itself having different dimensions from the video element
            if (media.offsetWidth > width) {
                mediaPosition[0] += (media.offsetWidth - width)/2;
            } else if (media.offsetHeight > height) {
                mediaPosition[1] += (media.offsetHeight - height)/2;
            }
            barContainer.style.top = mediaPosition[1] + 'px';
            barContainer.style.left = mediaPosition[0] + 'px';
                    
            barCanvas.setAttribute('width', width);
            barCanvas.setAttribute('height', height);
            barCanvas.setAttribute('id', barId);
            barCanvas.style.display = 'none';
                    
            vidContainer.appendChild(barContainer);
            barContainer.appendChild(barCanvas);
                    
            // step three: draw the bars
            ctx.fillStyle = '#000000';
            if (barOrient === "horizontal"){
                ctx.fillRect(0, 0, width, barWidth);
                ctx.fillRect(0, height-barWidth, width, barWidth);
            }
            else if (barOrient === "vertical"){
                ctx.fillRect(0, 0, barWidth, height);
                ctx.fillRect(width-barWidth, 0, barWidth, height);
            }                    
        }
        
        
        return {
            // Next is the manifest, which tells Butter how to build a form
            manifest: {
                about: {
                    name: "Aspect Ratio",
                    version: "0.2",
                    author: "Helenka Casler",
                    website: "author url"
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
                    ratio: {
                        elem: "select",
                        options: ["As-is", "4:3", "16:9", "1.85:1", "2.39:1"],
                        values:["aspect-no-change", "aspect-4-3", "aspect-16-9", "aspect-1p85-1", "aspect-2p39-1"],
                        label: "Aspect Ratio",
                        "default": "aspect-no-change"
                    },
                    m_o: {
                        elem: "select",
                        options: ["Deform", "Black bars"],
                        values: ["deform", "blackbars"],
                        label: "Method",
                        "default": "blackbars"
                    }
                }
            }, // end manifest
            
            // For everything below:
            //  "this" refers to the popcorn object
            //  track (passed in as an argument) refers to the trackevent created by the options passed
            //  event refers to the event object
            _setup: function (options) {
                /* code for initializing plugin, fires on init
                    Gotta find that video element, make sure it really exists
                    Get the dimensions of the video element
                    Establish what the new dimensions will have to be
                    
                    Also - all the stuff involving showing on the timeline
                    Maybe put a mark on the video's representation on the timeline?*/
                console.log('Aspect ratio setting up...');
                
                if (! _plid){
                    _plid = 0;
                }
                
                _plid++;
                options.plid = _plid; // lets you keep multiple instances separate
                var _this = this;
                var _media;
                console.log(_this.media.tagName); // prints "undefined". wtf
                console.log('Popcorn instance id: ' + _this.id);
                console.log('Video element: ' + _this['video'].id);
                console.log('Object sequenceIDs is ' + _this.sequenceIDs);
                //console.log(document.getElementByTagName('video')); // locks up code. This is the problem.
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
                
                options.targetVideo = _media;
                
                function doIt(){
                
                    var h,
                        w;
                    if (options.isTargetingVideo){
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
                        h = _media.height;
                        w = _media.width;
                        options.isHeightDiff = false;
                        options.isWidthDiff = false;
                    }
                    var oldAspectRatio = w / h,
                        newAspectRatio,
                        cssClass = options.ratio + '-' + options.plid,
                        barId = cssClass;
                        
                    options.identifier = cssClass; // so you can get at it later
                    options.origHeight = h;
                    options.origWidth = w;
                    
                    var strPlid = options.plid + '';
                    identifiers[strPlid] = options.identifier;
                    
                    console.log('The media item here is ' + _media);
                    console.log('The identifier here is ' + options.identifier);
                
                    console.log('Old video height is ' + w); // sanity check -- makes sure it's loaded right
                
                    // set the value of newAspectRatio
                    if (options.ratio === "aspect-no-change") {
                        newAspectRatio = oldAspectRatio;
                    }
                    else if (options.ratio === "aspect-4-3") {
                        newAspectRatio = 4/3;
                    }
                    else if (options.ratio === "aspect-16-9") {
                        newAspectRatio = 16/9;
                    }
                    else if (options.ratio === "aspect-1p85-1") {
                        newAspectRatio = 1.85;
                    }
                    else if (options.ratio === "aspect-2p39-1") {
                        newAspectRatio = 2.39;
                    }
                    else {
                        throw 'Error: nonexistent aspect ratio option selected.';
                    }
                    options.ratioNum = newAspectRatio;
                    
                    // Make the style or canvas elements
                    if (options.m_o === "deform"){
                        createStyle(oldAspectRatio, newAspectRatio, cssClass, w, h);
                    }
                    else if (options.m_o === "blackbars"){
                        createBars(_media, oldAspectRatio, newAspectRatio, barId, w, h);
                    }
                    else {
                        throw 'Error: nonexistent method for changing aspect ratio';
                    }
                    
                    console.log('...setup complete');
                }
                
                // Lines below exists because without it, video dimensions were being read as zero
                if (_media.readyState >= 3){
                    doIt();
                }
                else {
                    window.addEventListener('load', doIt);
                }
                
            },
            _update: function (trackEvent, options) {
                // HC - trackEvent contains the old data, options contains the new data.
                console.log('aspect ratio updating...');
                
                var _this = this,
                    h = trackEvent.origHeight,
                    w = trackEvent.origWidth,
                    oldAspectRatio = w / h,
                    newAspectRatio,
                    cssClass,
                    barId,
                    strPlid = trackEvent.plid + '',
                    oldIdentifier = trackEvent.identifier;
                    console.log('Old identifier is '+ oldIdentifier);
                    console.log('Old aspect ratio ' + trackEvent.ratio);
                    
                    options.isHeightDiff = trackEvent.isHeightDiff;
                    options.isWidthDiff = trackEvent.isWidthDiff;
                    
                    // determine the new aspect ratio
                    if (options.ratio && options.ratio !== trackEvent.ratio){
                        console.log('... changing aspect ratio');
                        cssClass = options.ratio + '-' + strPlid;
                        barId = cssClass;
                        // set new identifier. If the aspect ratio is not actually changed, then the identifier is not changed.
                        trackEvent.identifier = cssClass;
                        console.log('New identifier is ' + cssClass);
                        if (options.ratio === "aspect-no-change") {
                            newAspectRatio = oldAspectRatio;
                        }
                        else if (options.ratio === "aspect-4-3") {
                            newAspectRatio = 4/3;
                        }
                        else if (options.ratio === "aspect-16-9") {
                            newAspectRatio = 16/9;
                        }
                        else if (options.ratio === "aspect-1p85-1") {
                            newAspectRatio = 1.85;
                        }
                        else if (options.ratio === "aspect-2p39-1") {
                            newAspectRatio = 2.39;
                        }
                        else {
                            throw 'Error: nonexistent aspect ratio option selected.';
                        }
                        trackEvent.ratio = options.ratio;
                        // End of what to do for a new aspect ratio
                    } else {
                        console.log('... same aspect ratio');
                        newAspectRatio = trackEvent.ratioNum;
                    }
                    
                    // remove old style or canvas element associated with the un-updated track event,
                    // replace with new ones
                    // Not necessary if only the start or end time changes
                    if (options.m_o || options.ratio) {
                        if (trackEvent.m_o === "deform"){
                            console.log('... removing old style element');
                            var oldStyleElem = document.getElementById(oldIdentifier);
                            console.log('... found style element ' + oldIdentifier+'. It is a ' + oldStyleElem);
                            var styleParent = oldStyleElem.parentNode;
                            console.log('... and its parent node is ' + styleParent);
                            styleParent.removeChild(oldStyleElem);
                            console.log('... removed it');
                            if (trackEvent.targetVideo.classList.contains(oldIdentifier)){
                                console.log('removing old identifier from class list');
                                trackEvent.targetVideo.classList.remove(oldIdentifier);
                            } else {
                                console.log('style removal complete');
                            }
                        } else if (trackEvent.m_o === "blackbars"){
                            console.log('... removing old canvas element');
                            var oldBarCanvas = document.getElementById(oldIdentifier);
                            console.log('... found canvas element ' + oldIdentifier);
                            var oldBarContainer = document.getElementById('barContainer-'+oldIdentifier);
                            console.log('... found canvas div');
                            var divParent = oldBarContainer.parentNode;
                            oldBarContainer.removeChild(oldBarCanvas);
                            console.log('... canvas removed');
                            divParent.removeChild(oldBarContainer);
                            console.log('removed div element');
                        }
                                        
                        // put in the new style or canvas elements for the updated track event
                        if (options.m_o === "deform" || (trackEvent.m_o === "deform" && !(options.m_o))){
                            console.log('... making new style element');
                            createStyle(oldAspectRatio, newAspectRatio, trackEvent.identifier, w, h);
                            trackEvent.m_o = "deform";
                        }
                        else if (options.m_o === "blackbars" || (trackEvent.m_o === "blackbars" && !(options.m_o))){
                            console.log('... making new canvas element');
                            createBars(trackEvent.targetVideo, oldAspectRatio, newAspectRatio, trackEvent.identifier, w, h);
                            trackEvent.m_o = "blackbars";
                        }
                        else {
                            throw 'Error: nonexistent method for changing aspect ratio';
                        }
                        trackEvent.ratioNum = newAspectRatio;
                    }
                
                console.log('...update complete');
            },
            _teardown: function (options) {
                /* code for removal of plugin or destruction of instance
                    Clean up all references to the aspect ratio on the timeline
                    Clear all event listeners made for this plugin
                    Remove the <style> element added by start, if it's still there*/
                console.log('removing aspect ratio event');
                if (options.m_o === "deform") {
                    // find the right CSS style element and remove it
                    var deadStyleElem = document.getElementById(options.identifier);
                    document.head.removeChild(deadStyleElem);
                    if (options.targetVideo.classList.contains(options.identifier)){
                        options.targetVideo.classList.remove(options.identifier);
                    }
                }
                else if (options.m_o === "blackbars") {
                    console.log('need to remove bar canvas and its container.');
                    // find the canvas with the bars on it, and remove it and its container
                    var deadBarCanvas = document.getElementById(options.identifier),
                        deadBarContainer = document.getElementById('barContainer-'+options.identifier),
                        containerParent = deadBarContainer.parentNode;
                    console.log('canvas and container are identified. Identifier is '+options.identifier);
                    console.log('canvas returns ' + deadBarCanvas);
                    console.log('container returns ' + deadBarContainer); // things are right up to here
                    deadBarContainer.removeChild(deadBarCanvas);
                    containerParent.removeChild(deadBarContainer);
                    console.log('canvas and container are removed.');
                }
                console.log('teardown complete');
            },
            start: function (event, options) {
                /* code to run on track.start*/
                console.log('starting aspect ratio event');
                if (options.m_o === "deform") {
                    // find the right CSS class, and add it to the video element
                    options.targetVideo.classList.add(options.identifier);
                    // TODO: If the clip changes before the end time, need to add this class to the other clip??
                }
                else if (options.m_o === "blackbars") {
                    // find the canvas with the bars on it, and show it
                    var barCanvas = document.getElementById(options.identifier);
                    barCanvas.style.display = '';
                }
            },
            end: function (event, options) {
                /* code to run on track.end*/
                console.log('aspect ratio event is over');
                if (options.m_o === "deform") {
                    // find the right CSS class, and remove it from the video element
                    options.targetVideo.classList.remove(options.identifier);
                    // TODO: if the clip changed during the aspect ratio time, need to remove the class from all clips??
                }
                else if (options.m_o === "blackbars") {
                    // find the canvas with the bars on it, and hide it
                    var barCanvas = document.getElementById(options.identifier);
                    barCanvas.style.display = 'none';
                }
            },
            frame: function (event, track) {/* code will fire on every frame between end and start, if frameAnimation is enabled*/},
            toString: function (options) {
                /* provides a string representation for the plugin */
                return options.ratio;
            }
        };
    })());
})(Popcorn);