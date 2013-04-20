/*global EditorHelper*/

// HC - modify
EditorHelper.addPlugin( "aspectratio", function( trackEvent ) {

  var _popcornOptions = trackEvent.popcornTrackEvent,
      _container = _popcornOptions._container,
      _target = _popcornOptions._target;

  if ( window.jQuery ) {

    //if ( _popcornOptions.src ) {
      //window.EditorHelper.droppable( trackEvent, _container );
    //}

    window.EditorHelper.draggable( trackEvent, _container, _target );
    window.EditorHelper.resizable( trackEvent, _container, _target, {
      minWidth: 5,
      minHeight: 5,
      handlePositions: "e,s,se,n,w"
    });
  }
});
