/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @version $Id: BasicExample.js 2883 2015-03-06 19:04:42Z tgaskins $
 */

requirejs.config({
	baseUrl: '/static/worldwind/',
});
 
requirejs(['src/WorldWind',
		   'src/geom/Vec2',
		   'src/geom/Vec3',
		   'src/geom/Position',
		   'LayerManager/LayerManager'],
    function (ww,
	          Vec2,
	          Vec3,
			  Position,
              LayerManager) {
        "use strict";

        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        var wwd = new WorldWind.WorldWindow("canvasOne");

        var layers = [
            {layer: new WorldWind.BMNGLayer(), enabled: true},
            {layer: new WorldWind.BMNGLandsatLayer(), enabled: false},
            {layer: new WorldWind.BingAerialLayer(null), enabled: false},
            {layer: new WorldWind.BingAerialWithLabelsLayer(null), enabled: true},
            {layer: new WorldWind.BingRoadsLayer(null), enabled: false},
            {layer: new WorldWind.CompassLayer(), enabled: true}
        ];

        for (var l = 0; l < layers.length; l++) {
            layers[l].layer.enabled = layers[l].enabled;
            wwd.addLayer(layers[l].layer);
        }
		
		// Add the surface image to a layer and the layer to the World Window's layer list.
		var surfaceImage = new WorldWind.SurfaceImage(new WorldWind.Sector(23.000000774860382, 50.000001847743988, -128.00000303983688, -92.000001609325409),"/static/worldwind/images/acp_0_a.png");
        var surfaceImageLayer = new WorldWind.RenderableLayer();
        surfaceImageLayer.displayName = "Surface Image";
        surfaceImageLayer.addRenderable(surfaceImage);
        wwd.addLayer(surfaceImageLayer);

        wwd.redraw();

        var layerManger = new LayerManager('divLayerManager', wwd);
		
		var dc = wwd.drawContext;
		var globe = dc.globe;
		var eyePoint = new Vec3(0, 0, 0);
		
		$('#btn-convert').click(function(){
			var gLat = parseFloat($('#geoLat').val());
			var gLong = parseFloat($('#geoLong').val());
			var gAlt = parseFloat($('#geoAlt').val());
			var gPosition = new Position(gLat,gLong,gAlt);
			
			var globe = dc.globe;
			var cPoint = new Vec3(0, 0, 0);
			globe.computePointFromPosition(gPosition.latitude, gPosition.longitude, gPosition.altitude, cPoint);
			var ex = cPoint[0];
            var ey = cPoint[1];
            var ez = cPoint[2];
			$('#cartX').val(ex);
			$('#cartY').val(ey);
			$('#cartZ').val(ez);
		});
		
		$('#btn-eyeposition').click(function(){
			var eyePosition = dc.eyePosition;
			$('#eyeGeoLat').val(eyePosition.latitude);
			$('#eyeGeoLong').val(eyePosition.longitude);
			$('#eyeGeoAlt').val(eyePosition.altitude);
			//alert("Eye Position: Latitude: "+eyePosition.latitude+", Longitude: "+eyePosition.longitude+", Altitude: "+eyePosition.altitude);
			
			var globe = dc.globe;
			var eyePoint = new Vec3(0, 0, 0);
			globe.computePointFromPosition(eyePosition.latitude, eyePosition.longitude, eyePosition.altitude, eyePoint);
			var ex = eyePoint[0];
            var ey = eyePoint[1];
            var ez = eyePoint[2];
			$('#eyeCartX').val(ex);
			$('#eyeCartY').val(ey);
			$('#eyeCartZ').val(ez);
			//alert("Eye Position to Cartesian Coordinates: X: "+ex+", Y: "+ey+", Z: "+ez);
		});
		
		$('#btn-computeRay').click(function(){
			var navigatorState = dc.navigatorState;
			screenX = parseFloat($('#rayX').val());
			screenY = parseFloat($('#rayY').val());
			var screenPoint = new Vec2(screenX,screenY);
			var ray = navigatorState.rayFromScreenPoint(screenPoint);
			$('#rayOrigin').val(ray.origin);
			$('#rayDirection').val(ray.direction);
			//alert("origin: "+ray.origin);
			//alert("direction: "+ray.direction);
		});
		
		$('#btn-projectionMatrix').click(function(){
			var navigatorState = dc.navigatorState;
			var projection = navigatorState.projection;
			var projectionMatrix = [
				[projection[0],projection[1],projection[2],projection[3]],
				[projection[4],projection[5],projection[6],projection[7]],
				[projection[8],projection[9],projection[10],projection[11]],
				[projection[12],projection[13],projection[14],projection[15]]
			];
			var strProjectionMatrix = "";
			$.each(projectionMatrix,function(index,value){
				var strRow = "(";
				$.each(value,function(index,value){
					strRow = strRow + value.toString() + ", "
				});
				strRow = strRow.substring(0,strRow.length-2) + ")";
				strProjectionMatrix = strProjectionMatrix + strRow + ",\r\n";
			});
			$('#projectionMatrix').val(strProjectionMatrix.substring(0,strProjectionMatrix.length-3));
			//alert("Projection Matrix: "+ strProjectionMatrix);
		});
		
		$('#btn-modelviewMatrix').click(function(){
			var navigatorState = dc.navigatorState;
			var modelview = navigatorState.modelview;
			var modelviewMatrix = [
				[modelview[0],modelview[1],modelview[2],modelview[3]],
				[modelview[4],modelview[5],modelview[6],modelview[7]],
				[modelview[8],modelview[9],modelview[10],modelview[11]],
				[modelview[12],modelview[13],modelview[14],modelview[15]]
			];
			var strModelviewMatrix = "";
			$.each(modelviewMatrix,function(index,value){
				var strRow = "(";
				$.each(value,function(index,value){
					strRow = strRow + value.toString() + ", "
				});
				strRow = strRow.substring(0,strRow.length-2) + ")";
				strModelviewMatrix = strModelviewMatrix + strRow + ",\r\n";
			});
			$('#modelviewMatrix').val(strModelviewMatrix.substring(0,strModelviewMatrix.length-3));
			//alert("Modelview Matrix: "+ strModelviewMatrix);
		});
		
		$('#btn-screenProjectionMatrix').click(function(){
			var screenProjection = dc.screenProjection;
			var screenProjectionMatrix = [
				[screenProjection[0],screenProjection[1],screenProjection[2],screenProjection[3]],
				[screenProjection[4],screenProjection[5],screenProjection[6],screenProjection[7]],
				[screenProjection[8],screenProjection[9],screenProjection[10],screenProjection[11]],
				[screenProjection[12],screenProjection[13],screenProjection[14],screenProjection[15]]
			];
			var strScreenProjectionMatrix = "";
			$.each(screenProjectionMatrix,function(index,value){
				var strRow = "(";
				$.each(value,function(index,value){
					strRow = strRow + value.toString() + ", "
				});
				strRow = strRow.substring(0,strRow.length-2) + ")";
				strScreenProjectionMatrix = strScreenProjectionMatrix + strRow + ",\r\n";
			});
			$('#screenProjectionMatrix').val(strScreenProjectionMatrix.substring(0,strScreenProjectionMatrix.length-3));
			//alert("Screen Projection Matrix: "+ strScreenProjectionMatrix);
		});
		
		// Place Markers
		$('#btn-placeMarker').click(function(){
			alert($('#marker-position-lat').text());
			alert($('#marker-position-long').text());
			alert($('#marker-position-alt').text());
		});
    });