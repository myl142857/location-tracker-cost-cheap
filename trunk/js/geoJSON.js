
/* var bicycleRental = {
    "type": "FeatureCollection",
    "features": [
        {
            "geometry": {
                "type": "Point",
                "coordinates": [
                    -104.9998241,
                    39.7471494
                ]
            },
            "type": "Feature",
            "properties": {
                "popupContent": "132,Hougang Avenue 7"
            },
            "id": 51
        },
        {
            "geometry": {
                "type": "Point",
                "coordinates": [
                    -104.9983545,
                    39.7502833
                ]
            },
            "type": "Feature",
            "properties": {
                "popupContent": "1,Hougang Avenue 9"
            },
            "id": 52
        },
		{
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [-104.9998241, 39.7471494],
                    [-104.9983545, 39.7502833]
                ]
            },
            "properties": {
                "popupContent": "Busy traffic",
                "underConstruction": false
            },
            "id": 61
        },        
        {
            "geometry": {
                "type": "Point",
                "coordinates": [
                    -104.9963919,
                    39.7444271
                ]
            },
            "type": "Feature",
            "properties": {
                "popupContent": "This is a B-Cycle Station. Come pick up a bike and pay by the hour. What a deal!"
            },
            "id": 54
        },
 } */
exports.generateGeoJSON = function( locationsJSON ) {

    console.log(" ####### generate JSON ######## "+JSON.stringify(locationsJSON));
    // Parse the response.
    //[{"id":3,"delivery_id":8,"latitude":"39.753838","longitude":"-105.00341","location":null,"accuracy":500,"address":"1900 16th Street, Denver, CO 80202, USA","created_at":"1358346976066"},
    //{"id":4,"delivery_id":8,"latitude":"39.746839","longitude":"-104.9899","location":null,"accuracy":900,"address":"1700-1798 California Street, Denver, CO 80202, USA","created_at":"1358347112583"}]
    /* "style": {
                      "radius": 10,
                      "fillColor": "#920011",
                      "color": "#000",
                      "weight": 1,
                      "opacity": 1,
                      "fillOpacity": 0.8                        
                    } */
    // Create geometry: POINT, geometry: LineString, geometry: POINT --> This way to create the track.
    // POINT circle radius should be based on accuracy.
    for(j =0; j < locationsJSON.length; j++) {
        console.log(" ####### Result ####### "+locationsJSON[j].id+" : "+locationsJSON[j].delivery_id+" : "+locationsJSON[j].latitude+" : "+locationsJSON[j].longitude+" : "+locationsJSON[j].accuracy+" : "+locationsJSON[j].address+" : "+locationsJSON[j].created_at);
    }

    if( locationsJSON.length == 0) {
        return [];
    }
    
    var geoJSON = {"type": "FeatureCollection"};
	geoJSON.features=[];
    var elements = 0;

    // Create the starting point.
    geoJSON.features[elements] = {};  
    geoJSON.features[elements]['id'] = elements;
    geoJSON.features[elements].geometry= {};
    geoJSON.features[elements].geometry['type'] = 'Point';
    geoJSON.features[elements].geometry['coordinates'] = [];
    geoJSON.features[elements].geometry['coordinates'].push(locationsJSON[elements].longitude);
    geoJSON.features[elements].geometry['coordinates'].push(locationsJSON[elements].latitude);
    geoJSON.features[elements]['type'] =  "Feature";
    geoJSON.features[elements].properties = {};
    geoJSON.features[elements].properties["popupContent"] = locationsJSON[elements].address+" \n Accuracy: "+locationsJSON[elements].accuracy;
    geoJSON.features[elements].properties.style = {};
    geoJSON.features[elements].properties.style['radius'] = (1) * 20;
    geoJSON.features[elements].properties.style['fillColor'] = "#ffff00";
    geoJSON.features[elements].properties.style['color'] = "#000";
    geoJSON.features[elements].properties.style['weight'] = 1;
    geoJSON.features[elements].properties.style['opacity'] = 1;
    geoJSON.features[elements].properties.style['fillOpacity'] = 0.8;   
    
    var needToDrawLine = true;    
    var from = [];
    from.push(locationsJSON[elements].longitude);
    from.push(locationsJSON[elements].latitude);
    
    elements += 1;
    
    for(i = 1; i < locationsJSON.length; i ++)
    {
      geoJSON.features[elements] = {};  
      geoJSON.features[elements]['id'] = elements;
      geoJSON.features[elements].geometry= {};
      geoJSON.features[elements].geometry['type'] = 'Point';
      geoJSON.features[elements].geometry['coordinates'] = [];
      geoJSON.features[elements].geometry['coordinates'].push(locationsJSON[i].longitude);
      geoJSON.features[elements].geometry['coordinates'].push(locationsJSON[i].latitude);
      geoJSON.features[elements]['type'] =  "Feature";
      geoJSON.features[elements].properties = {};
      geoJSON.features[elements].properties["popupContent"] = locationsJSON[i].address+"  Accuracy: "+locationsJSON[i].accuracy;
      geoJSON.features[elements].properties.style = {};
      geoJSON.features[elements].properties.style['radius'] = 5;//(i+1) * 20;
      geoJSON.features[elements].properties.style['fillColor'] = "#ffff00";
      geoJSON.features[elements].properties.style['color'] = "#000";
      geoJSON.features[elements].properties.style['weight'] = 1;
      geoJSON.features[elements].properties.style['opacity'] = 1;
      geoJSON.features[elements].properties.style['fillOpacity'] = 0.8;   

      // Draw line if there is a next (lat,long) available.
      if( needToDrawLine ) {
        elements += 1;
        geoJSON.features[elements] = {};  
        geoJSON.features[elements]['id'] = elements;
        geoJSON.features[elements].geometry= {};
        geoJSON.features[elements].geometry['type'] = 'LineString';
        geoJSON.features[elements].geometry['coordinates'] = [];
        
        var to = [];
        to.push(locationsJSON[i].longitude);
        to.push(locationsJSON[i].latitude);
        
        geoJSON.features[elements].geometry['coordinates'].push(from);
        geoJSON.features[elements].geometry['coordinates'].push(to);

        geoJSON.features[elements]['type'] =  "Feature";
        geoJSON.features[elements].properties = {};
        geoJSON.features[elements].properties["popupContent"] =  "This is route";
         if((i+1) < locationsJSON.length) {
            needToDrawLine = true;
            from = [];
            from.push(locationsJSON[i].longitude);
            from.push(locationsJSON[i].latitude);
         }
      }

      elements += 1;
     }
    return geoJSON;
}