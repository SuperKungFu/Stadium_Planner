// Map functionality
let map;
let markers = [];
let selectedMarker;

const MAX_RESULTS = 10;

function initMap () {
	let styles = [
		{
			featureType: 'administrative',
			elementType: 'labels.text.stroke',
			stylers: [
				{color: '#0C2340'},
				{weight: 6}
			]
		}
	];

	map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: 42.090633, lng: -71.26409},
		zoom: 16,
		mapTypeControl: false
	});
//		styles: styles,
}

function mapErrorHandler () {
	alert('Google Maps unavailable currently. Please try later');
}

/* From Udacity course */
function makeMarkerIcon(markerColor) {
	var markerImage = new google.maps.MarkerImage(
	'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
	'|40|_|%E2%80%A2',
	new google.maps.Size(21, 34),
	new google.maps.Point(0, 0),
	new google.maps.Point(10, 34),
	new google.maps.Size(21,34));
	return markerImage;
}

// Page models
let teamNames = ["New England Patriots", "Green Bay Packers", "Houston Texans", "New Orleans Saints",
	"Los Angeles Rams", "Dallas Cowboys", "Carolina Panthers"];
let mainColors = ["#C8102E", "#175E33", "#091F2C", "#A28D5B", "#002244", "#041E42", "#0085CA"];
let secondColors = ["#0C2340", "#FFB81C", "#A6192E", "#101820", "#866D4B", "#869397", "#101820"];

let teams = [];
for (let i=0; i<teamNames.length; i++) {
	teams.push({
		name: teamNames[i],
		maincolor: mainColors[i],
		secondcolor: secondColors[i]
	});
}

let Team = function (data) {
	this.name = ko.observable(data.name);
	this.maincolor = ko.observable(data.maincolor);
	this.secondcolor = ko.observable(data.secondcolor);
}

let ViewModel = function () {
	let self = this;

	let infowindow = new google.maps.InfoWindow();
	self.fsInfo = ko.observable();

	// team info and lists
	self.teamList = ko.observableArray([]);
	self.placeList = ko.observableArray([]);

	teams.forEach(function (team) {
		self.teamList().push(new Team(team));
	});

	self.currentTeam = ko.observable(self.teamList()[0]);
	self.setCurrentTeam = function () {
		self.currentTeam(this);
	}
	self.currentTeam.subscribe(function (team) {
		self.zoomToArea(team.name());
	});

	self.currentPlace = ko.observable();
	self.setCurrentPlace = function (place) {
		self.currentPlace(place);
	}

	// functions
	self.zoomToArea = function (teamName) {
		let geocoder = new google.maps.Geocoder();
		geocoder.geocode(
			{
				address: teamName+" stadium",
			},
			function(results, status) {
				if (status == google.maps.GeocoderStatus.OK) {
					map.setCenter(results[0].geometry.location);
					map.setZoom(16);
				} else {
					window.alert('Error finding stadium. Please try again later.');
				}
		});

		self.clearMarkers();
		self.placeList.removeAll();
	}

	self.findPlaces = function (type) {
		let service = new google.maps.places.PlacesService(map);

		self.clearMarkers();
		self.placeList.removeAll();

		service.nearbySearch({
			location: map.center,
			radius: 2600,
			rankby: 'distance',
			type: type
		}, self.setPlaces);
	}

	self.setPlaces = function (results, status) {
		if (status === google.maps.places.PlacesServiceStatus.OK) {
			let bounds = new google.maps.LatLngBounds();
			for (let i = 0; i < results.length && i < MAX_RESULTS; i++) {
				self.createMarker(results[i]);
				self.placeList.push(results[i]);
				bounds.extend(markers[i].position);
			}
			map.fitBounds(bounds);
		} else {
			alert("No places found");
		}
	}

	/**
	Create the marker and tie the click events to the left hand list items.
	*/
	self.createMarker = function (place) {
        let marker = new google.maps.Marker({
			map: map,
			position: place.geometry.location,
			icon: makeMarkerIcon(self.currentTeam().maincolor().substring(1))
        });
        markers.push(marker);

        google.maps.event.addListener(marker, 'click', function() {
        	// change the selected marker
			if (selectedMarker) {
        		selectedMarker.setIcon(makeMarkerIcon(self.currentTeam().maincolor().substring(1)));
        	}

        	marker.setIcon(makeMarkerIcon(self.currentTeam().secondcolor().substring(1)));
			infowindow.setContent("<b>"+place.name+"</b><br>"+place.vicinity);//JSON.stringify(place)
			infowindow.addListener('closeclick', function() {
				marker.setIcon(makeMarkerIcon(self.currentTeam().maincolor().substring(1)));
				infowindow.marker = null;
				$('[id^="place_"]').each(function () {
					$(this).collapse('hide');
				});
				self.setCurrentPlace(null);
			});

			// sync the left-hand list
			if (self.currentPlace() && self.currentPlace().name != place.name) {
				self.getPlaceInfo(place);
			}
			infowindow.open(map, this);
			selectedMarker = marker;
 
 			$('[id^="place_"]').each(function () {
				if ($(this).prev().text() != place.name) {
					$(this).collapse('hide');
				} else {
					$(this).collapse('show');
				}
			});

       });
        
    }

    self.clearMarkers = function () {
    	markers.forEach(function (marker) {
    		marker.setMap(null);
    	});
    	markers = [];
    }

    self.getPlaceInfo = function (place) {
    	// clicking on the same place to close
    	if (self.currentPlace() && self.currentPlace().name == place.name) {
    		self.setCurrentPlace(null);
    		infowindow.close();
    	} else {
	    	self.setCurrentPlace(place);
	    	self.fsInfo('');
	    	self.getFoursquareInfo(place);
			markers.forEach(function (marker) {
				if (marker.position == place.geometry.location) {
	    			google.maps.event.trigger(marker, 'click');
	    		}
	    	});
		}
    }

    self.getFoursquareInfo = function (place) {
    	// take out query: place.name for now
    	$.ajax({
    		url: "https://api.foursquare.com/v2/venues/search",
			data: {
      			client_id: 'C3GBGOHJOODAGYGPQMCWSWVUZFMZPNWFVXBUQ35Y4YJ1UNPA',
      			client_secret: 'D5G0NQPLIQHVHDQKO1TTLLZKKPVUNXLXJYDZ13OSNA1R3ZNA',
      			v: '20171031',
				ll: place.geometry.location.lat()+","+place.geometry.location.lng(),
				radius: 100,
				limit: 1
			},
			success: function (result) {
				let info = ''
				if (result.response.venues[0]) {
					if (result.response.venues[0].location.address) {
						info += result.response.venues[0].location.address+"<br>";
					}
					if (result.response.venues[0].url) {
						info += "<a href='"+result.response.venues[0].url+"' target='_new'>Website</a><br>";
					}
					if (result.response.venues[0].rating) {
						info += "Rating: "+result.response.venues[0].rating+"<br>";
					}
					info += "Checkins: "+result.response.venues[0].stats.checkinsCount+"<br>";
					if (result.response.venues[0].hasMenu) {
						info += "<a href='"+result.response.venues[0].menu.url+"' target='_new'>Menu</a><br>";
					}
				} else {
					info = "Location not found";
					console.log(this.url);
				}
				self.fsInfo(info);
            },
            error: function (error) {
                alert("Foursquare error: "+JSON.stringify(error));
            }
		});
		
    }
}

$(document).ready(function() {
	ko.applyBindings(new ViewModel());
});
