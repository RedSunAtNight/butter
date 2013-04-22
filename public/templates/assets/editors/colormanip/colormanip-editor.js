/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

// HC - this code needs:
//      Handlers for the canvas and css methods

(function( Butter ) {

  var Editor = Butter.Editor;

  Editor.register( "aspectratio", "load!{{baseDir}}templates/assets/editors/colormanip/colormanip-editor.html",
                   function( rootElement, butter, compiledLayout ) {

    var _rootElement = rootElement,
        _this = this,
        _colorSelect = _rootElement.querySelector('#coloring-select'),
        _trackEvent,
        _popcornInstance,
        _inSetup,
        _cachedValues;

    function updateTrackEvent( te, props ) {
      _this.setErrorState();
      _this.updateTrackEventSafe( te, props );
    }


    function isEmptyInput( value ) {
      return value === "";
    }



    // HC - may need to modify this slightly
    // Mode specifies what values should be retrieved from the cached values
    function displayCachedValues( mode ) {
      var element;

      // Repopulate fields with old values to prevent confusion
      for ( var i in _cachedValues ) {
        if ( _cachedValues.hasOwnProperty( i ) ) {
          element = _rootElement.querySelector( "[data-manifest-key='" + i + "']" );

          if ( _cachedValues[ i ].type === mode ) {
            element.value = _cachedValues[ i ].data;
            
          }
        }
      }
    }

    // HC - will def need this
    function setup( trackEvent ) {
      var container = _rootElement.querySelector( ".editor-options" ),
          startEndElement,
          manifestOpts = trackEvent.popcornTrackEvent._natives.manifest.options;

      _inSetup = true;

      function callback( elementType, element, trackEvent, name ) {
        if ( elementType === "select" ) {
          _this.attachSelectChangeHandler( element, trackEvent, name );
        }
      }

      function attachHandlers() {
        _this.attachSelectChangeHandler(_colorSelect, trackEvent, "coloring");
        

        _this.createTooltip( _colorSelect, {
          name: "coloring-tooltip" + Date.now(),
          element: _colorSelect.parentElement,
          message: "Change the colors in the video in a variety of ways",
          top: "105%",
          left: "50%",
          hidden: true,
          hover: false
        });
        
        // Only show the inputs for specific colors if "custom" is selected
        if (_colorSelect.value === "custom" && ! _rootElement.querySelector('.custom-color-inputs')) {
          // make some input elements
          var customColors = document.createElement('fieldset');
          customColors.setAttribute('class', 'custom-color-inputs');
          customColors.innerHTML = '<label>Adjust RGB values</label> \n <label for="red-input" id="red-input-label">Red</label><input type="number" id="red-input" data-manifest-key="customRed"> \n <label for="green-input" id="green-input-label">Green</label><input type="number" id="green-input" data-manifest-key="customGreen"> \n <label for="blue-input" id="blue-input-label">blue</label><input type="number" id="blue-input" data-manifest-key="customBlue">';
          _rootElement.appendChild(customColors);
          // Now the inputs are added. Next, connect them to the trackevent properties.
          var redInput = _rootElement.querySelector('red-input'),
            greenInput = _rootElement.querySelector('green-input'),
            blueInput = _rootElement.querySelector('blue-input');
            
          _this.attachInputChangeHandler(redInput, trackEvent, "customRed");
          _this.attachInputChangeHandler(greenInput, trackEvent, "customGreen");
          _this.attachInputChangeHandler(blueInput, trackEvent, "customBlue");
          
          _this.createTooltip( redInput, {
            name: "customRed-tooltip" + Date.now(),
            element: redInput.parentElement,
            message: "Enter a amount by which to increase the level of red in the image. RGB values run from 0 to 255.",
            top: "105%",
            left: "50%",
            hidden: true,
            hover: false
          });
          
          _this.createTooltip( greenInput, {
            name: "customGreen-tooltip" + Date.now(),
            element: greenInput.parentElement,
            message: "Enter a amount by which to increase the level of green in the image. RGB values run from 0 to 255.",
            top: "105%",
            left: "50%",
            hidden: true,
            hover: false
          });
          
          _this.createTooltip( blueInput, {
            name: "customBlue-tooltip" + Date.now(),
            element: blueInput.parentElement,
            message: "Enter a amount by which to increase the level of blue in the image. RGB values run from 0 to 255.",
            top: "105%",
            left: "50%",
            hidden: true,
            hover: false
          });
        } else if (_colorSelect.value != "custom"){
          // if "custom" is not selected, do not show the color inputs
          if (_rootElement.querySelector('.custom-color-inputs')) {
            var colorIns = _rootElement.querySelector('.custom-color-inputs');
            _rootElement.removeChild(colorIns);
          }
        }
        // Note that if _colorSelect.value is custom, but the fieldset we need is already visible, there is no need to add it on again.

        //attachDropHandlers();
      }

      startEndElement = _this.createStartEndInputs( trackEvent, updateTrackEvent );
      container.insertBefore( startEndElement, container.firstChild );

      // HC - this may need to change a bit
      //_this.createPropertiesFromManifest({
        //trackEvent: trackEvent,
        //callback: callback,
        //basicContainer: container,
        //manifestKeys: [ "transition" ]
      //});

      attachHandlers();

      _this.updatePropertiesFromManifest( trackEvent );
      _this.setTrackEventUpdateErrorCallback( _this.setErrorState );


      _this.scrollbar.update();
      _inSetup = false;
    }


    function clickPrevention() {
      return false;
    }

    // HC - will need to modify this
    function onTrackEventUpdated( e ) {
      _trackEvent = e.target;
      _this.updatePropertiesFromManifest( _trackEvent );
      _this.setErrorState( false );
      

      _this.scrollbar.update();
    }

    // HC - modify
    Editor.TrackEventEditor.extend( _this, butter, rootElement, {
      open: function( parentElement, trackEvent ) {
        var popcornOptions = trackEvent.popcornOptions,
            manifestOpts = trackEvent.popcornTrackEvent._natives.manifest.options;

        if ( !_cachedValues ) {
          _cachedValues = {
            coloring: {
              data: popcornOptions.coloring || manifestOpts.coloring.default
            },
            customRed: {
              data: popcornOptions.customRed || manifestOpts.customRed.default
            },
            customGreen: {
              data: popcornOptions.customGreen || manifestOpts.customGreen.default
            },
            customBlue: {
              data: popcornOptions.customBlue || manifestOpts.customBlue.default
            }
          };
        }

        _popcornInstance = trackEvent.track._media.popcorn.popcorn;

        _this.applyExtraHeadTags( compiledLayout );
        _trackEvent = trackEvent;

        // HC - saving the below to be able to look at error states later
        // The current popcorn instance
        //_popcornInstance.on( "invalid-flickr-image", function() {
         // _this.setErrorState( "Invalid Flicker Gallery URL. E.G: http://www.flickr.com/photos/etherworks/sets/72157630563520740/" );
        //});

        _trackEvent.listen( "trackeventupdated", onTrackEventUpdated );

        setup( trackEvent );
      },
      close: function() {
        _this.removeExtraHeadTags();
        _trackEvent.unlisten( "trackeventupdated", onTrackEventUpdated );
      }
    });
  });
}( window.Butter ));
