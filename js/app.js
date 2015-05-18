// app.js
// by chris howard May 2015

// model: list of locations for the map
// view1: google map of the locations in the model
// view2: form of controls for hiding, showing, filtering locations shown
// viewmodel: uses knockoutjs MVVm model to connect model & views

// model data
// in addition to the typical name, address, etc.
// each location will have a list of links generated from a google search api request
var locationData = [
    {
        name: "Nahm Thai Cuisine",
        stAddr: "5310 Windward Parkway West",
        city: "Alpharetta",
        state: "GA",
        zip: "30004",
        url: "http://www.nahmthaicuisine.com/#_=_",
        linksList: [],
    },
    {
        name: "La Parrilla Mexican Restaurant",
        stAddr: "865 North Main Street",
        city: "Alpharetta",
        state: "GA",
        zip: "30004",
        url: "http://laparrilla.com/",
        linksList: [],
    },
    {
        name: "Mambo's Cafe",
        stAddr: "4915 Windward Parkway West",
        city: "Alpharetta",
        state: "GA",
        zip: "30004",
        url: "http://mambos-cafe.com/#/",
        linksList: [],
    },
    {
        name: "Smokejack",
        stAddr: "29 S Main St",
        city: "Alpharetta",
        state: "GA",
        zip: "30009",
        url: "http://smokejackbbq.com/#_=_",
        linksList: [],
    },
    {
        name: "Sage Woodfire Tavern",
        stAddr: "11405 Haynes Bridge Rd",
        city: "Alpharetta",
        state: "GA",
        zip: "30009",
        url: "http://www.restaurantalpharetta-ga.com/",
        linksList: [],
    },
    {
        name: "Village Tavern",
        stAddr: "11555 Rainwater Dr",
        city: "Alpharetta",
        state: "GA",
        zip: "30009",
        url: "http://www.villagetavern.com/",
        linksList: [],
    },
    {
        name: "Pure Taqueria",
        stAddr: "103 Roswell St",
        city: "Alpharetta",
        state: "GA",
        zip: "30009",
        url: "http://puretaqueria.com/",
        linksList: [],
    },
];



// uses google map api to show a map with locations marked
// make a google map object
// this will essentially be the view of the map and will show the list of map locations
var mapView = {

    init: function(divId, locationList) {

        var mapOptions = {
            disableDefaultUI: true
        };
       
        //console.log(document.getElementById(divId));
       
        this.map = new google.maps.Map(document.getElementById(divId), mapOptions);   
        
        this.service = new google.maps.places.PlacesService(this.map);
        
        // sets the boundaries of the map based on marker locations
        this.mapBounds = new google.maps.LatLngBounds();   

        // list of markers and their visibility property
        // will be parallel with the model data list
        this.markerList = [];
        
        for (var i = 0; i < locationList.length; i++) {
            // add an empty object to the marker list to avoid undefined errors
            this.markerList.push({});

            // create the request for map marker info
            var request = {
                query: locationList[i].stAddr + " " + locationList[i].city + " " + locationList[i].state + " " + locationList[i].zip
            };            
            
            // use an iffe to capture location index and this
            this.service.textSearch(request, (function(locationIndex, self) {
                return function(results, status) {
                    if (status == google.maps.places.PlacesServiceStatus.OK) {
                    
                        var lat  = results[0].geometry.location.lat();  // latitude from the place service
                        var lon  = results[0].geometry.location.lng();  // longitude from the place service
                        var name = results[0].formatted_address;  
                        
                        self.mapBounds.extend(results[0].geometry.location);
                    
                        self.map.fitBounds(self.mapBounds);
                        // center the map
                        self.map.setCenter(self.mapBounds.getCenter());
                        
                        // make a marker for this location
                        self.markerList[locationIndex].marker = new google.maps.Marker( {
                            map: self.map,
                            position: results[0].geometry.location,
                            title: locationList[locationIndex].name,
                        });
                        
                        // make the info window for this location
                        self.markerList[locationIndex].infoWindow = new google.maps.InfoWindow({
                          content: locationList[locationIndex].name,
                          maxWidth: 200
                        });

                        google.maps.event.addListener(self.markerList[locationIndex].marker, 'click', function() {                         
                            
                            // tell the controller about the change in marker selection
                            mapAppVM.changeSelectedIndex(locationIndex);
                        });
                    }
                };
            })(i, this));
            
            
        }
    
    },

    //change the selected marker        
    changeSelectedLocation: function(index) {
        for (var i=0; i < this.markerList.length; i++) {
            this.markerList[i].marker.setAnimation(null);
            this.markerList[i].infoWindow.close(mapView.map);  
        }
    
        if (index >= 0) {
            this.markerList[index].marker.setAnimation(google.maps.Animation.BOUNCE);
            this.markerList[index].infoWindow.open(mapView.map, this.markerList[index].marker);  
        }
    },    
    
    // change the visibility of markers (and info windows) due to filtering
    // not that the visible property is an observable so must be accessed with function syntax
    changeVisibility: function(locationList) {
        for (var i=0; i < locationList.length; i++) {
            if (locationList[i].visible()) {
                this.markerList[i].marker.setVisible(true);
            } 
            else {
                this.markerList[i].marker.setVisible(false);
                this.markerList[i].infoWindow.close(mapView.map);
            }
        }        
    },
    
    // resize/recenter the map
    resizeRecenter: function() {             
        google.maps.event.trigger(this.map, "resize");
        this.map.setCenter(this.mapBounds.getCenter());
        mapView.map.fitBounds(mapView.mapBounds);
    },   

};


// a form view is not needed as it can be folded into Knockoutjs's viewmodel


// knockoutjs's view model controller
var mapAppVM = {
    // maximum number of links to retain & show the user from the google search request
    maxNumLinks: 6,
    
    // hidden form opens with the hamburger icon
    // open form will have the following % width and map will have the rest
    // closed form will have 0% width
    formOpenWd: 33.33,
    
    
    init: function() {
        var self = this;
        
        // observables to tell us whether the form is open and its css style width in %
        this.isFormOpen = ko.observable(false);
        this.formWd = ko.observable(0);
        
        // a list of locations to choose from
        this.locationList = ko.observableArray();
        
        // a list of additional links about the selected location
        // this will come from an ajax query from the google search api
        this.linksList = ko.observableArray([]);         

        // the index of the selected location by the user
        // -1 means no location selected yet
        this.selectedIndex = ko.observable(-1);
        

        // add in the location list items to the observable array
        for (var locIndex=0; locIndex < locationData.length; locIndex++) {
            // add an index to each location object for easy identification
            locationData[locIndex].index = locIndex;
            
            // use google search api to get additional links on each location
            // error handling will be done as follows:
            // assume the request/query does not produce results so that each location has an empty list of links
            // as the ajax reqests come in, we will fill this list up to maxNumLinks
            // in the html, there is an error message that will be hidden or shown based on whether the links list is empty or not
            var url = "https://www.googleapis.com/customsearch/v1?key=AIzaSyB53pwMA4aj0FAh1Yho1-ehtanOcu84hG0&cx=017290458089839839299:ggwygvbjdlo&q=";
            
            // bad url below to test for error handling
            //var url = "https://www.googleapis.com/customsearch/v1?key=AIzaSyB53pwMA4aj0FAh1Yho1-ehtanOcu84hG0&cx=017290458089839299:ggwygvbjdlo&q=";
            
            url = url + locationData[locIndex].name + " " + 
                        locationData[locIndex].stAddr + " " + 
                        locationData[locIndex].city + " " + 
                        locationData[locIndex].state + " " + 
                        locationData[locIndex].zip;
            
            // use an iffe to capture the location index            
            $.getJSON( url, (function(locIndex, self) {
                return function( data ) {
                    // check for error condition - no links in data 
                    for (var i = 0; i < Math.min(self.maxNumLinks, data.items.length); i++) {
                        console.log(data.items[i].link);
                        
                        locationData[locIndex].linksList[i] = data.items[i].link;
                        
                        
                    }
                    
                    // code to test error handling - will fill in a location with an empty list of links as if an ajax request failed
                    // locationData[2].linksList = [];
                    
                };
            })(locIndex, this));
            
            this.locationList.push(locationData[locIndex]);            
            
            // unfortunately, knockoutjs does not make object members in an observable array also observable
            // so we make a visible property observable so we can show/hide locations based on filtering
            this.locationList()[locIndex].visible = ko.observable(true);
        }     
        
        this.selectedIndex.subscribe(function(newValue) {
        
            // change the kolinksList
            if (newValue >= 0) {
                self.linksList(self.locationList()[newValue].linksList);
            }
            else {
                // -1 index means no location selected
                self.linksList([]);
            }
        
            // change the selected map marker
            mapView.changeSelectedLocation(newValue);
            
        });

        // hamburger icon will toggle the form
        this.formToggleClickCB = function() {
            if (self.isFormOpen() ) {
                self.isFormOpen(false)
                self.formWd(0);
            }
            else {
                self.isFormOpen(true)
                self.formWd(self.formOpenWd);
            }

            // Make sure the map bounds get updated on map view resize
            mapView.resizeRecenter();
        };
        
        // each location can be selected and will invoke this callback
        // the user selected location index will change or toggle
        this.locClickCB = function() {
            // in this callback, "this" will be a location object
            // if the new location is already selected then toggle it
            if (this.index == self.selectedIndex()) {
                self.selectedIndex(-1);
            }
            else {
                self.selectedIndex(this.index);
            }        
        };
        
        // the filter button will invoke this callback and show/hide certain locations
        this.filterClickCB = function() {
            // convert all strings to upper case for a case insensitive search
            var filterText = document.getElementById('filterTxtId').value.toUpperCase();
            var tokenList = filterText.split(" ");
            // for each location
            for (var locIndex=0; locIndex < this.locationList().length; locIndex++) {
            
                // assume not visible or filtered
                var visible = false;

                // if any token is found in the name, make this location visible
                for (var tokenIndex=0; tokenIndex < tokenList.length; tokenIndex++) {
                    
                    if (this.locationList()[locIndex].name.toUpperCase().search(tokenList[tokenIndex]) >= 0) {
                        visible = true;
                        break;
                    }
                }
                
                this.locationList()[locIndex].visible(visible);
                
                // if current selection is filtered out then change selected index to -1
                if (visible == false && locIndex == this.selectedIndex()) {
                    this.selectedIndex(-1);
                }

            }

            // update the map view to show/hide filtered markers
            mapView.changeVisibility(this.locationList());
            
        };
        
        // the reset button will invoke this callback
        // reset removes an filtering and toggles the currently selected location (if any)        
        this.resetClickCB  = function() {
            // clear the current filter and user selection
            document.getElementById('filterTxtId').value = "";
            this.selectedIndex(-1);
            
            self.filterClickCB();
        };

        // event handlers for window resize or orientation change to resize/recenter map
        window.addEventListener('resize', function(e) {
            // Make sure the map bounds get updated on page resize
            mapView.resizeRecenter();
        });
        
        window.addEventListener('orientationchange', function(e) {
            // Make sure the map bounds get updated on page resize
            mapView.resizeRecenter();
        });
        
    },
};

// start the ko controller when dom loads
window.addEventListener('load', function() {

    // bind the view model
    mapAppVM.init();
    ko.applyBindings(mapAppVM);

    // create the google map
    mapView.init("mapDivId", locationData);
});








