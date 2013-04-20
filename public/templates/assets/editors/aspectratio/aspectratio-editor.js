/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at https://raw.github.com/mozilla/butter/master/LICENSE */

// HC - this code needs:
//      Handlers for the canvas and css methods

(function( Butter ) {

  var Editor = Butter.Editor;

  Editor.register( "aspectratio", "load!{{baseDir}}templates/assets/editors/aspectratio/aspectratio-editor.html",
                   function( rootElement, butter, compiledLayout ) {

    var _rootElement = rootElement,
        _this = this,
        _ratioSelect = _rootElement.querySelector('#ratio-select'),
        _methodSelect = _rootElement.querySelector('#m_o-select'),
        _trackEvent,
        _popcornInstance,
        _inSetup,
        _cachedValues;

    function updateTrackEvent( te, props ) {
      _this.setErrorState();
      _this.updateTrackEventSafe( te, props );
    }

/*
    // HC - may not need this
    function attachDropHandlers() {
      window.EditorHelper.droppable( _trackEvent, _dropArea );

      butter.listen( "droppable-unsupported", function unSupported() {
        _this.setErrorState( "Sorry, but your browser doesn't support this feature." );
      });

      // HC - def don't need the below
      butter.listen( "filetype-unsupported", function invalidType() {
        _this.setErrorState( "Sorry but that file type isn't supported. Please use JPEG, PNG or GIF." );
      });
    }
  */


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
        _this.attachSelectChangeHandler(_ratioSelect, trackEvent, "ratio");
        _this.attachSelectChangeHandler(_methodSelect, trackEvent, "m_o");
        

        _this.createTooltip( _methodSelect, {
          name: "m_o-tooltip" + Date.now(),
          element: _methodSelect.parentElement,
          message: "Aspect ratio can be changed by either adding black bars to the edge of the video, or by deforming the video itself.",
          top: "105%",
          left: "50%",
          hidden: true,
          hover: false
        });

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
      
      // HC - should there be something else here?
      // HC - TEST - can we reach data in the Popcorn instance from here?
      console.log('Just a reminder: the sequenceIDs object is ' + JSON.stringify(_this.sequenceIDs));

      _this.scrollbar.update();
    }

    // HC - modify
    Editor.TrackEventEditor.extend( _this, butter, rootElement, {
      open: function( parentElement, trackEvent ) {
        var popcornOptions = trackEvent.popcornOptions,
            manifestOpts = trackEvent.popcornTrackEvent._natives.manifest.options;

        if ( !_cachedValues ) {
          _cachedValues = {
            ratio: {
              data: popcornOptions.ratio || manifestOpts.ratio.default
            },
            m_o: {
              data: popcornOptions.m_o || manifestOpts.m_o.default
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
