/**
 *
 *@Author - Eugene Mutai
 *@Twitter - JheneKnights
 *
 * Date: 7/14/13
 * Time: 7:14 AM
 * Description:
 *
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.opensource.org/licenses/gpl-2.0.php
 *
 * Copyright (C) 2013
 * @Version -
 */

var map, markersArray = [], bubbleArray = [], boundsArray = []; //global mapping variable
var searchArray = [], placesArray = [];
var displayDirections, directionsService;
var getMap = {

    options: {},
    dirTo: false, //will contain the place to be directed to onclick
    distance: {
        "aroundme": 1000,
        "surrounding": 3000,
        "townarea": 10000,
        "countrywide": 50000
    },

    //Geo locate user
    geoLocate: function() {

        var position;
        if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(showPosition, showGeoError, {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 250*60*60
            })
        }

        function showPosition(pos) {
            /**
             * @param lat - pos.coords.latitude
             * @param long - pos.coords.longitude
             * @type {{center: google.maps.LatLng, zoom: number, mapTypeId: *}}
             */
            position = {
                lat: pos.coords.latitude,
                long: pos.coords.longitude,
                eventData: pos
            };

            getMap.initMap({detail: position})

            /*
            //create event passing user's geo data
            var geoEvent = new CustomEvent('geolocated', {detail: position});
            //trigger event
            document.dispatchEvent(geoEvent);
            */
            console.log("User's location acquired, initialising google maps...")
        }

        function showGeoError(e) {
            switch(e.code) {
                case e.PERMISSION_DENIED:
                    //if permission was denied
                    break;
                case e.POSITION_UNAVAILABLE:
                    //if javascript failed to acquire the coordinates
                    break;
                case e.TIMEOUT:
                    //if the request timed out, do the request again
                    break;
            }

            //Create a false fallback location option
            position = {
                lat: -1.2929228217223805,
                long: 36.893903334293405,
                code: e.code,
                error: e.message
            }

            getMap.initMap({detail: position})

            /* APP DOES NOT RECOGNISE THIS
            //create event passing FALSE user's geo data
            var geoEvent = new CustomEvent('geolocated', {detail: position});
            //trigger event
            document.dispatchEvent(geoEvent);
            */

            //tell the user if an error occurs
            //console.log(e.message);
        }
    },

    //Initialise the map
    initMap: function(pos) {
        //If app initialised and a position object has been passed
        if(pos) {
            //If an error Occured
            if(pos.detail.error) console.log(pos.detail.error);

            var position = pos.detail;

            //Build up the MAP now
            var mapOptions = {
                center: new google.maps.LatLng(position.lat, position.long), //(user.lat, user.long),
                zoom: 15,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                //Map options
                panControl: true,
                panControlOptions: {
                    position: google.maps.ControlPosition.RIGHT_BOTTOM
                },
                zoomControl: true,
                zoomControlOptions: {
                    position: google.maps.ControlPosition.LEFT_BOTTOM,
                    style: google.maps.ZoomControlStyle.LARGE
                },
                mapTypeControl: false,
                scaleControl: false,
                streetViewControl: false,
                overviewMapControl: false,
                rotateControl: false
            };
            console.log(google.maps.ControlPosition, position, pos);

            //draw the map
            map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
            map.setOptions({draggable: true}); // make the map draggable

            //instantiate the direction renderer
            displayDirections = new google.maps.DirectionsRenderer();
            directionsService = new google.maps.DirectionsService();
            displayDirections.setMap(map);

            //set MAP defaults to be used in other functions
            getMap.options = mapOptions;
            getMap.status = {
                "walking": google.maps.TravelMode.WALKING,
                "driving": google.maps.TravelMode.DRIVING
            }
            getMap.selected = { //DEFAULT options from above
                "status": getMap.status.walking,
                "distance": getMap.distance.surrounding
            }

            //Point out the user's position
            var marker = new google.maps.Marker({
                position: mapOptions.center,
                icon: {
                    url: "./images/appbar.location.circle.png",
                    size: new google.maps.Size(75, 75),
                    origin: new google.maps.Point(0, 0),
                    anchor: new google.maps.Point(20, 20),
                    scaledSize: new google.maps.Size(40, 40)
                }
            });
            marker.setMap(map);

            //Cute pointer pop up.
            var infoBubble = getMap.addBubble(mapOptions.center, "You are here.", marker,  "my location");
            infoBubble.open();

            //Show user's address
            var geocoder = new google.maps.Geocoder();
            if(geocoder) {
                var latlng = mapOptions.center;
                geocoder.geocode({'latLng': latlng}, function(results, status) {
                    if(status == google.maps.GeocoderStatus.OK) {
                        viewModel.activitybar(results[0]['formatted_address']);
                        getMap.options.address = viewModel.activitybar();

                        //joyride, show user's position
                        $('.myLoc').html(viewModel.activitybar());
                    };
                });
            }

            //do a test location search
            //getMap.search(["bank", "gas_station"]);
        }else{
            //If no location has been acquired
            getMap.geoLocate();
        }
    },

    search: function(keyword, typeArray) {
        //If only one argument has been given
        if(arguments.length == 1) {
            typeArray = $.isArray(keyword) ? keyword: false;
        }
        //Now get the nearest banks, petrol stations around this nigga
        var request = {
            location: getMap.options.center,
            radius: getMap.selected.distance, //15 km radius.
            keyword: $.isArray(keyword) ? "": keyword
            //,rankBy: google.maps.places.RankBy.DISTANCE
        };
        if(typeArray) request.types = typeArray;
        console.log(request);
        getMap.clearOverlays();
        //instantiate the Places search
        var service = new google.maps.places.PlacesService(map);
        //do the search, pass the results into a callback
        service.nearbySearch(request, getMap.placesResults)
    },

    //@info - This will place markers onto the MAP, no listing
    placesResults: function(results, status, more) {
        var bound = new google.maps.LatLngBounds();
        if (status == google.maps.places.PlacesServiceStatus.OK) {
            //Create the markers
            $.map(results, function(place, idx) {
                var placeLoc = place.geometry.location;
                var image;
                //console.log(place.types);
                if($.inArray("gas_station", place.types) > -1) {
                    image = "./images/appbar.gas.png"
                }else{
                    image = "./images/appbar.home.variant.enter.png"
                };

                var marker = new google.maps.Marker({
                    map: map,
                    position: placeLoc,
                    icon: {
                        url: image,
                        size: new google.maps.Size(75, 75),
                        origin: new google.maps.Point(0, 0),
                        anchor: new google.maps.Point(20, 20),
                        scaledSize: new google.maps.Size(40, 40)
                    },
                    title: place.name
                });

                marker.setMap(map);
                markersArray.push({type: "search", marker: marker});

                //show Label when the marker is clicked.
                google.maps.event.addListener(marker, "click", function() {
                    //do something
                    var bound = new google.maps.LatLngBounds();
                    $.map([getMap.options.center, this.getPosition()], function(loc) {
                        bound.extend(loc);
                    });
                    map.fitBounds(bound);
                    var bubble = getMap.addBubble(this.getPosition(), this.getTitle(), this, "search");
                    bubble.open();
                    console.log(this.getTitle(), this.getPosition())

                    //If the person will want directions to that place;
                    getMap.dirTo = {
                        place: this.getTitle(),
                        directions: this.getPosition()
                    }
                    // console.log(getMap.dirTo);
                    viewModel.getdirections(true);
                });
                boundsArray.push(place.geometry.location);
            })


            map.panTo(getMap.options.center);
            //map.setZoom(15);
            //If there are more results, get them
            if(more.hasNextPage) {
                setTimeout(function() { more.nextPage(); }, 2000);
            }else{
                $.map(boundsArray, function(bounds) { bound.extend(bounds);})
                map.fitBounds(bound); //fit map into these areas
                boundsArray = [];
            }
            console.log("Is there more results: " + more.hasNextPage);
        }
    },

    //Search results, function, list
    searchResults: function(results, status, more) {
        //console.log(results);
        $('#stuff').empty(); //remove all search results
        if (status == google.maps.places.PlacesServiceStatus.OK) {
            viewModel.placeHolder("Just a minute, searching for matching places...");
            //Create the markers
            $.map(results, function(place, idx) {
                var hapo = {
                    name: place.name,
                    vicinity: place.vicinity,
                    id: place.id,
                    location: JSON.stringify(place.geometry.location)
                }
                placesArray.push(hapo);
                searchArray.push(place);
            });
            //If there are more results, get them
            if(more.hasNextPage) {
                setTimeout(function() { more.nextPage(); }, 2000);
            }else{
                //Create the markers
                viewModel.placesNo(placesArray.length);
                viewModel.places_list(placesArray);
                viewModel.placeHolder("Matching places found.");
            }
        }
        //if no results were acquired
        else if(status == google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            console.log("No results were found.")
        }
    },

    //If one of the search RESULTS is clicked on
    getPlace: function(obj, ev) {
        getMap.clearOverlays(); //clear the MAP

        var place;
        if(arguments.length == 1) { //in the case of a bookmark
            place = [obj]
        }else{
            place = $.grep(searchArray, function(pro) {
                return obj.id == pro.id;
            })
        }

        //process the bookmark
        if(place.length > 0) {
            place = place[0];
            console.log(place);

            var icon = {
                // Star
                path: 'M 0,-24 6,-7 24,-7 10,4 15,21 0,11 -15,21 -10,4 -24,-7 -6,-7 z',
                fillColor: '#ffff00',
                fillOpacity: 1,
                scale: 1/2,
                strokeColor: '#bd8d2c',
                strokeWeight: 2
            }

            var pts = JSON.parse(place.location);
            place.geometry = {
                location: new google.maps.LatLng(pts.nb, pts.ob)
            }

            var marker = new google.maps.Marker({
                map: map,
                icon: icon,
                title: place.name,
                position: place.geometry.location
            });

            var bubble = getMap.addBubble(place.geometry.location, place.name, marker, "search");
            bubble.open();

            //If the person will want directions to that place;
            getMap.dirTo = {place: place.name,  directions: pts}; //.geometry.location;
            viewModel.getdirections(true);

            //if Clicked, plot the directions to there
            google.maps.event.addListener(marker, "click", function() {
                // getMap.getDirections(this.getPosition());
                viewModel.getdirections(true);
                //console.log(this.getPosition())
            })

            var bound = new google.maps.LatLngBounds();
            $.map([getMap.options.center, place.geometry.location], function(loc) {
                bound.extend(loc);
            });
            map.fitBounds(bound);
        }
        //close if any pop up is still open
        $('.close').click();
    },

    backToPointX: function(bool) {
        // var user = {lat: -1.9536, long: 30.0606} //getMap.geoLocate();
        if(bool) getMap.clearAll();
        map.panTo(getMap.options.center);
    },

    getDirections: function(towhere) {
        console.log(towhere);
        //get the co-ordinates
        var pts = towhere
        console.info("Lat long of position heading to -- " + pts)
        var request = {
            origin: getMap.options.center,
            destination: new google.maps.LatLng(pts.nb, pts.ob),
            travelMode: getMap.selected.status,
            unitSystem: google.maps.UnitSystem.METRIC
        };

        console.log(request);
        directionsService.route(request, function(response, status) {
            console.log("direction status:"  + status, response)
            if (status == google.maps.DirectionsStatus.OK) {
                displayDirections.setDirections(response);
            }
        });
        //Hide the the option bar nw
        viewModel.getdirections(false);

        var bookmarks = getMap.bookMark();
        if(bookmarks) {
            //search for existence of the bookmark in the bookmarks array
            var search = $.grep(bookmarks, function(el, i) {
                return el.directions == JSON.stringify(getMap.dirTo.directions);
            })
            //if none, add it
            if(search.length > 0)
                //show the bookmark option if he wants to bookmark the place
                viewModel.bookmark(true);
        }
        //getMap.dirTo = false;
    },

    /**
     * @param place
     * place object - {place: name of place, directions: {nb, ob}}
     */
    bookMark: function(place) {
        //get the Bookmarks
        var places = getMap.storeThisSmartly("placesBookmark"); //[b, b, b]
        places = places ? places: [{place: "Greenspan Mall", directions: JSON.stringify({nb: -1, ob: 36})}];
        if(place) { //if the place is defined
            //if the bookmarks exist
            var addplace = {
                place: place.place,
                directions: JSON.stringify(place.directions)
            }

            if(places) { //if one or few bookmarks exist
                var content = places.push(addplace); //b++
                getMap.storeThisSmartly("placesBookmark",  {
                    local: true,
                    content: places
                })
            }else{ //if it dsnt exist
                getMap.storeThisSmartly("placesBookmark",  {
                    local: true,
                    content: [addplace] //b == {place: name, directions: {ob, nb}}
                })
            }

            //empty
            $('#bookmarks').empty();
            //relist the bookmarks
            var newPlaces = getMap.storeThisSmartly("placesBookmark");
            viewModel.bookmark_list(getMap.bookMark());
        }else{ //if no bookmark was sent to function, just list all the current bookmarks available
            if($("#bookmarks").children().length == 0) {
                bookmarkArray = places;
                viewModel.bookmark_list(bookmarkArray);
            }
        }

        //Hide the the option bar now
        viewModel.bookmark(false);
        return places;
    },

    addBubble: function(position, message, marker, type) {
        var canvas = $('#map-canvas')
        var bubble = new InfoBubble({
            map: map,
            content: '<div class="pointer">' + message + '</div>',
            position: position,
            minWidth: canvas.width() > canvas.height() ? canvas.width() * 0.2: canvas.width() * 0.45,
            maxWidth: canvas.width() * 0.8,
            padding: "5%",
            backgroundColor: '#212121',
            //backgroundClassName: 'pointer-bg',
            borderRadius: 4,
            borderWidth: 0,
            borderColor: '#212121',
            disableAutoPan: true, //auto padding
            hideCloseButton: true,
            arrowSize: 13,
            arrowStyle: 0,
            arrowPosition: 50,
            shadowStyle: 1
        });
        //console.log(marker.getPosition())
        //add it to the bubble array
        bubbleArray.push({type: type, bubble: bubble, marker: marker ? marker: ""});
        google.maps.event.addListener(bubble, 'click', function() {
            this.close();
        })
        return bubble
    },

    clearOverlays: function() {
        //Remove all markers from the MAP.
        if(markersArray.length > 0) $.map(markersArray, function(a, b) { a.marker.setMap(null); });
    },

    clearBubbles: function() {
        //Remove all bubble markers from the MAP.
        if(bubbleArray.length > 0) $.map(bubbleArray, function(a, b) {
            //only remove added bub
            if(a.type == "search")  {
                a.bubble.setMap(null);
                if(a.marker) a.marker.setMap(null);
            }
        });
    },

    clearAll: function() {
        getMap.clearOverlays();
        getMap.clearBubbles();
    },

    /**
     * @param options - local(bool), content(object), backup(bool)
     * @param key
     * STORE CONTENT locally or in cookie or BOTH
     */
    storeThisSmartly: function(key, options) {
        if (options) { //store this data
            if (options.local) {
                localStorage.setItem(key, JSON.stringify(options.content));
            } else { //also in cookie too
                if ($.cookie) $.cookie(key, options.content);
                localStorage.setItem(key, JSON.stringify(options.content));
            }
        } else if (options == false) { //if options == false
            localStorage.removeItem(key);
            if ($.cookie) $.cookie(key, false); //remove everything
        }

        //if only one argument is given retrieve that data from localstorage
        return arguments.length == 1 ? JSON.parse(localStorage.getItem(key)) : false;
    }
}
