
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
exports.generateGeoJSON = function( response ) {

    console.log(" ####### generate JSON ######## "+response);
    
    var geoJSON = {"type": "FeatureCollection"};

	geoJSON.features=[];
    for(i=0; i<2; i++)
    {
      geoJSON.features[i] = { id: i };
      geoJSON.features[i].geometry= {};
      geoJSON.features[i].geometry['type'] = 'Point';
      geoJSON.features[i].geometry['coordinates'] = [1.929292,-02929292];
      geoJSON.features[i]['type'] =  "Feature";
      geoJSON.features[i].properties = {};
      geoJSON.features[i].properties["popupContent"] =  "132,Hougang Avenue 7";
    }
	//alert(JSON.stringify(geoJSON));
    return JSON.stringify(geoJSON);
}