/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @version $Id: BasicExample.js 2883 2015-03-06 19:04:42Z tgaskins $
 */

requirejs.config({
	baseUrl: '/geoviz/static/worldwind/',
});
 
requirejs(['src/WorldWind',
		   'src/geom/Vec2',
		   'src/geom/Vec3',
		   'src/geom/Position',
		   'CoordinateController'],
    function (ww,
	          Vec2,
	          Vec3,
			  Position,
			  CoordinateController) {
        "use strict";

        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        var wwd = new WorldWind.WorldWindow("canvasOne");
        
        var scImgPath = "/geoviz/static/data/img/";
        var new3DRayImg = "ray.png";
		var new3DIsoImg = "iso.png";
		var new3DFlowImg = "flow.png";
		
		// Add Mouse Event		
		function getConfig(){
			//variables for config file
			var wwconfig_eyeposition = "";
			var wwconfig_model_matrix = "";
			var wwconfig_projection_matrix = "";
			var wwconfig_window_dimenssion = $('#canvasOne').width() + ", " + $('#canvasOne').height();
			
			//get eyeposition
			var eyePosition = dc.eyePosition;
			var globe = dc.globe;
			var eyePoint = new Vec3(0, 0, 0);
			globe.computePointFromPosition(eyePosition.latitude, eyePosition.longitude, eyePosition.altitude, eyePoint);
			var ex = eyePoint[0];
            var ey = eyePoint[1];
            var ez = eyePoint[2];
			wwconfig_eyeposition = ex + ", " + ey + ", " + ez;
		
			//get model matrix
			var navigatorState = dc.navigatorState;
			var modelview = navigatorState.modelview;
			var modelviewMatrix = [
				[modelview[0],modelview[1],modelview[2],modelview[3]],
				[modelview[4],modelview[5],modelview[6],modelview[7]],
				[modelview[8],modelview[9],modelview[10],modelview[11]],
				[modelview[12],modelview[13],modelview[14],modelview[15]]
			];
			$.each(modelviewMatrix,function(index,value){
				$.each(value,function(index,value){
					wwconfig_model_matrix = wwconfig_model_matrix + value.toString() + ", ";
				});
			});
			wwconfig_model_matrix = wwconfig_model_matrix.substring(0,wwconfig_model_matrix.length-2);
			
			//get projection matrix
			var projection = navigatorState.projection;
			var projectionMatrix = [
				[projection[0],projection[1],projection[2],projection[3]],
				[projection[4],projection[5],projection[6],projection[7]],
				[projection[8],projection[9],projection[10],projection[11]],
				[projection[12],projection[13],projection[14],projection[15]]
			];
			$.each(projectionMatrix,function(index,value){
				$.each(value,function(index,value){
					wwconfig_projection_matrix = wwconfig_projection_matrix + value.toString() + ", ";
				});
			});
			wwconfig_projection_matrix = wwconfig_projection_matrix.substring(0,wwconfig_projection_matrix.length-2);
			//download config file
			var downloadText = "##eye position; geo, world\r\n" + 
							   wwconfig_eyeposition + "\r\n" +
							   "##model matrix, 4 rows\r\n" +
							   wwconfig_model_matrix + "\r\n" +
							   "##projection matrix, 4 rows\r\n" +
							   wwconfig_projection_matrix + "\r\n" +
							   "##width, height\r\n" +
							   wwconfig_window_dimenssion;
			return downloadText;
			//console.log(encodeURIComponent(downloadText));
		}
		
		function writeconfig_ray(configTxt){
			var csrftoken = $.cookie('csrftoken');
			var url=$("#url-writeconfig-ray").val();
			var wwwidth = $('#canvasOne').width();
			var wwheight = $('#canvasOne').height();
			var gpunum = $("#sel-numprocessor").val();
			var datafile = $("#sel-datafile").val();
			var varname3d = $("#var-seq-3d").val();
			var curtime = $("#range-3d-animation").val();
			$.ajax({
				url : url, // the endpoint
				type : "POST", // http method
				data : {configtxt : configTxt,
					csrfmiddlewaretoken: csrftoken,
                                        wwwidth: wwwidth,
                                        wwheight: wwheight,
                                        tasknum: gpunum,
                                        datafile: datafile,
                                        varname3d: varname3d,
                                        curtime: curtime,
				}, // data sent with the delete request
				success : function(json) {
				    console.log("get new 3D image successful");
				    new3DRayImg = json.newimgfile;

					screenImage3DRay[0].removeAllRenderables();
					// Add 3D screen image
					var screenOffset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.5);
					var screenImage = new WorldWind.ScreenImage(screenOffset, scImgPath+new3DRayImg);
					screenImage.imageOffset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.5);
					screenImage.imageScale = 1;

					// Add the screen image to a layer and the layer to the World Window's layer list.
					screenImage3DRay[0].addRenderable(screenImage);
					screenImage3DRay[0].enabled = true;
					wwd.redraw();

				},
				error : function(xhr,errmsg,err) {
					console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
				}
			});
		/*
			var csrftoken = $.cookie('csrftoken');
			var url=$("#url-startcluster").val();
			var form_content = 
				'<form id="hidden-post-form" action="" method="POST">'+
					'<input type="hidden" name="csrfmiddlewaretoken" value="'+csrftoken+'">'+
					'<input type="hidden" name="configtxt" value="'+configTxt+'">'+
				'</form>';
			var form = $(""+form_content);
			form.appendTo('body').submit();
		*/
		}
		
		function writeconfig_iso(configTxt){
			var csrftoken = $.cookie('csrftoken');
			var url=$("#url-writeconfig-iso").val();
			var wwwidth = $('#canvasOne').width();
			var wwheight = $('#canvasOne').height();
			var gpunum = $("#sel-numprocessor").val();
			var datafile = $("#sel-datafile").val();
			var varname3d = $("#var-seq-3d").val();
			var curtime = $("#range-3d-animation").val();
			var isovalue = $("#isovalue").val();
			console.log(isovalue);
			$.ajax({
				url : url, // the endpoint
				type : "POST", // http method
				data : {configtxt : configTxt,
					csrfmiddlewaretoken: csrftoken,
                                        wwwidth: wwwidth,
                                        wwheight: wwheight,
                                        tasknum: gpunum,
                                        datafile: datafile,
                                        varname3d: varname3d,
                                        curtime: curtime,
                                        isovalue: isovalue,
				}, // data sent with the delete request
				success : function(json) {
				    console.log("get new 3D Isosurface image successful");
				    new3DIsoImg = json.newimgfile;
                                    //console.log(scImgPath+new3DIsoImg);
                                    //console.log(screenImage3DIso[0]);

					screenImage3DIso[0].removeAllRenderables();
					// Add 3D screen image
					var screenOffset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.5);
					var screenImage = new WorldWind.ScreenImage(screenOffset, scImgPath+new3DIsoImg);
					screenImage.imageOffset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.5);
					screenImage.imageScale = 1;

					// Add the screen image to a layer and the layer to the World Window's layer list.
					screenImage3DIso[0].addRenderable(screenImage);//console.log(screenImage3DIso[0]);
					screenImage3DIso[0].enabled = true;
					wwd.redraw();

				},
				error : function(xhr,errmsg,err) {
					console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
				}
			});
		}
		
		function writeconfig_flow(configTxt){
			var csrftoken = $.cookie('csrftoken');
			var url=$("#url-writeconfig-flow").val();
			var wwwidth = $('#canvasOne').width();
			var wwheight = $('#canvasOne').height();
			var gpunum = $("#sel-numprocessor").val();
			var datafile = $("#sel-datafile").val();
			var varnameflow = $("#var-seq-3d").val();
			var tseq = $("#range-3d-animation").val();
			var colorselect = $("#sel-colorramp").val();
			var totalclass = $("#sel-colorclass").val();
			$.ajax({
				url : url, // the endpoint
				type : "POST", // http method
				data : {configtxt : configTxt,
					csrfmiddlewaretoken: csrftoken,
                                        wwwidth: wwwidth,
                                        wwheight: wwheight,
                                        tasknum: gpunum,
                                        datafile: datafile,
                                        varnameflow: varnameflow,
                                        tseq: tseq,
										colorselect: colorselect,
										totalclass: totalclass,
				}, // data sent with the delete request
				success : function(json) {
				    console.log("get new 3D Flow image successful");
				    new3DFlowImg = json.newimgfile;

					screenImage3DFlow[0].removeAllRenderables();
					// Add 3D screen image
					var screenOffset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.5);
					var screenImage = new WorldWind.ScreenImage(screenOffset, scImgPath+new3DFlowImg);
					screenImage.imageOffset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.5);
					screenImage.imageScale = 1;

					// Add the screen image to a layer and the layer to the World Window's layer list.
					screenImage3DFlow[0].addRenderable(screenImage);
					screenImage3DFlow[0].enabled = true;
					wwd.redraw();

				},
				error : function(xhr,errmsg,err) {
					console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
				}
			});
		}
		
		function writeconfig_iso_animation(configTxt){
			var csrftoken = $.cookie('csrftoken');
			var url=$("#url-writeconfig-iso").val()+"animation/";
			var wwwidth = $('#canvasOne').width();
			var wwheight = $('#canvasOne').height();
			var gpunum = $("#sel-numprocessor").val();
			var datafile = $("#sel-datafile").val();
			var varname3d = $("#var-seq-3d").val();
			var isovalue = $("#isovalue").val();
			console.log(isovalue);
			$.ajax({
				url : url, // the endpoint
				type : "POST", // http method
				data : {configtxt : configTxt,
					csrfmiddlewaretoken: csrftoken,
                                        wwwidth: wwwidth,
                                        wwheight: wwheight,
                                        tasknum: gpunum,
                                        datafile: datafile,
                                        varname3d: varname3d,
                                        isovalue: isovalue,
				}, // data sent with the delete request
				success : function(json) {
				    console.log("get new 3D Isosurface image successful");
				    new3DIsoImg = json.newimgfile;
                                    //console.log(scImgPath+new3DIsoImg);
                                    //console.log(screenImage3DIso[0]);

					// Add 3D screen image
					var screenOffset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.5);
					for (var t = 0; t < 25; t++) {
						screenImage3DIsoAnimation[t].removeAllRenderables();
						var screenImage = new WorldWind.ScreenImage(screenOffset, scImgPath+new3DIsoImg+"_"+t.toString()+".png");
						screenImage.imageOffset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.5);
						screenImage.imageScale = 1;
						screenImage3DIsoAnimation[t].addRenderable(screenImage);
						screenImage3DIsoAnimation[t].enabled = false;
					}
					$("#range-3d-iso").val(0);
					if ($("#btn-iso-timeplay").hasClass("disabled")){$("#btn-iso-timeplay").removeClass("disabled")}
				},
				error : function(xhr,errmsg,err) {
					console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
				}
			});
		}
		
		function hide3Dimage(){
			if (screenImage3DRay){
				if ($("#check-layer-dust3d").is(':checked')){
					screenImage3DRay[0].enabled = false;
				}
			}
			/*
			if (screenImage3DIso){
				if ($("#check-layer-iso").is(':checked')){
					screenImage3DIso[0].enabled = false;
				}
			}
			*/
			if (screenImage3DFlow){
				if ($("#check-layer-flow").is(':checked')){
					screenImage3DFlow[0].enabled = false;
				}
			}
		}
		
		function show3Dimage(){
			if (screenImage3DRay){
				if ($("#check-layer-dust3d").is(':checked')){
					var configTxt = getConfig();
					writeconfig_ray(configTxt);
				}
			}
			/*
			if (screenImage3DIso){
				if ($("#check-layer-iso").is(':checked')){
					var configTxt = getConfig();
					writeconfig_iso(configTxt);
				}
			}
			*/
			if (screenImage3DFlow){
				if ($("#check-layer-flow").is(':checked')){
					var configTxt = getConfig();
					writeconfig_flow(configTxt);
				}
			}
		}
		
		wwd.addEventListener("mousedown",function (event){
			hide3Dimage();
		});
		
		wwd.addEventListener("mouseup",function (event){
			show3Dimage();
		});

        var layers = [
            {layer: new WorldWind.BMNGLayer(), enabled:  false},
            {layer: new WorldWind.BMNGLandsatLayer(), enabled: false},
            //{layer: new WorldWind.BingAerialLayer(null), enabled: false},
            {layer: new WorldWind.BingAerialWithLabelsLayer(null), enabled: true},
            //{layer: new WorldWind.BingRoadsLayer(null), enabled: false},
            {layer: new WorldWind.CompassLayer(), enabled: true},
			{layer: new WorldWind.ViewControlsLayer(wwd), enabled: true}
        ];

        for (var l = 0; l < layers.length; l++) {
            layers[l].layer.enabled = layers[l].enabled;
            wwd.addLayer(layers[l].layer);
        }
		
		// layer control
		$("#sel-baselayer").change(function(){
			var selected_layer = parseInt($("#sel-baselayer option:selected").val());
			for (var l = 0; l < layers.length; l++) {
				if(layers[l].layer.displayName !== 'Compass' && layers[l].layer.displayName !== 'View Controls'){
					layers[l].layer.enabled = false;
				}
			}
			layers[selected_layer].layer.enabled = true;
			wwd.redraw();
		});		
		
		// Add the surface image to a layer and the layer to the World Window's layer list.
		var surfaceImages = []
		$("#var-seq option").each(function(){
			var var2dname = this.value;
			var surfaceImage = new WorldWind.SurfaceImage(new WorldWind.Sector(23.000000774860382, 50.000001847743988, -128.00000303983688, -92.000001609325409),"/static/worldwind/images/"+var2dname+"_0_a.png");
			var surfaceImageLayer = new WorldWind.RenderableLayer();
			surfaceImageLayer.displayName = "2D image "+var2dname;
			surfaceImageLayer.addRenderable(surfaceImage);
			surfaceImageLayer.enabled = false;
			surfaceImages.push(surfaceImageLayer);
			wwd.addLayer(surfaceImageLayer);
		});
		
		// Change surface image visibility
		$("#check-layer-dust2d").change(function(){
			if (this.checked){
				surfaceImages[$('#var-seq')[0].selectedIndex].enabled = true;
				surfaceImages[$('#var-seq')[0].selectedIndex].opacity = $("#2d-opacity").val();
			}
			else {
				surfaceImages[$('#var-seq')[0].selectedIndex].enabled = false;
			}
			wwd.redraw();
		});
		
		// Add 2D animation surface image
		/*
		var surfaceImages2DAnimation = [];
		$("#var-seq option").each(function(){
			var var2dname = this.value;
			var surfaceImage2DAnimation = [];
			for (var t = 0; t < 25; t++) {
				var surfaceImage = new WorldWind.SurfaceImage(new WorldWind.Sector(23.000000774860382, 50.000001847743988, -128.00000303983688, -92.000001609325409),"/static/worldwind/images/2d_animation/"+var2dname+"_"+t+"_a.png");
				var surfaceImageLayer = new WorldWind.RenderableLayer();
				surfaceImageLayer.displayName = "2D image animation " + var2dname + " " + t;
				surfaceImageLayer.addRenderable(surfaceImage);
				surfaceImageLayer.enabled = false;
				surfaceImage2DAnimation.push(surfaceImageLayer);
				wwd.addLayer(surfaceImageLayer);
			}
			surfaceImages2DAnimation.push(surfaceImage2DAnimation);
		});
		*/
		
		// Change 2D animation surface image visibility
		$("#check-layer-dust2d-animation").change(function(){
			if (this.checked){
				surfaceImages2DAnimation[$('#var-seq')[0].selectedIndex][$("#range-2d-animation").val()].enabled = true;
			}
			else{
				for (var i = 0; i < 25; i++) {
					surfaceImages2DAnimation[$('#var-seq')[0].selectedIndex][i].enabled = false;
				}
			}
			wwd.redraw();
		});
		
		// 2D Animation play control
		//slider control
		$("#range-2d-animation").change(function(){
			if ($('#check-layer-dust2d-animation').is(':checked')){
				for (var i = 0; i < 25; i++) {
					surfaceImages2DAnimation[$('#var-seq')[0].selectedIndex][i].enabled = false;
				}
				surfaceImages2DAnimation[$('#var-seq')[0].selectedIndex][this.value].enabled = true;
				$("#range-2d-animation-text").html(this.value);
				wwd.redraw();
			}
			else {
				$('#alert2d').show();
				$("#range-2d-animation").val(0);
			}
			if (this.value<25) {
				if ($("#btn-2dtimeplay").hasClass("disabled")){
					$("#btn-2dtimeplay").removeClass("disabled");
				}
				$("#btn-2dtimepause").addClass("disabled");
			}
			else{
				if (!$("#btn-2dtimepause").hasClass("disabled")){
					$("#btn-2dtimepause").addClass("disabled");
				}
				if (!$("#btn-2dtimeplay").hasClass("disabled")){
					$("#btn-2dtimeplay").addClass("disabled");
				}
			}
		});
		var time_interval_2d;
		//play button
		$("#btn-2dtimeplay").click(function(){
			if ($('#check-layer-dust2d-animation').is(':checked')){
				var t = parseInt($("#range-2d-animation").val());
				time_interval_2d = setInterval(function(){
					if (t>0 && t<25){surfaceImages2DAnimation[$('#var-seq')[0].selectedIndex][t-1].enabled = false;}
					surfaceImages2DAnimation[$('#var-seq')[0].selectedIndex][t].enabled = true;
					wwd.redraw();
					$("#range-2d-animation").val(t);
					$("#range-2d-animation-text").html(t);
					t = t + 1;
					if (t>24){
						t=0;
						$("#btn-2dtimeplay").addClass("disabled");
						$("#btn-2dtimepause").addClass("disabled");
						clearInterval(time_interval_2d);
					}
				},1000);
				if ($("#btn-2dtimepause").hasClass("disabled")){
					$("#btn-2dtimepause").removeClass("disabled");
				}
				$("#btn-2dtimeplay").addClass("disabled");
			}
			else{
				$('#alert2d').show();
			}
		});
		//pause button
		$("#btn-2dtimepause").click(function(){
			clearInterval(time_interval_2d);
			$("#btn-2dtimepause").addClass("disabled");
			if ($("#btn-2dtimeplay").hasClass("disabled")){
				$("#btn-2dtimeplay").removeClass("disabled");
			}
		});
		
		// Change surface image opacity
		$("#2d-opacity").change(function(){
			surfaceImages[$('#var-seq')[0].selectedIndex].opacity = this.value;
			$.each(surfaceImages2DAnimation,function(index,surfaceImgs){
				$.each(surfaceImgs,function(i,surfaceImg){
					surfaceImg.opacity = $("#2d-opacity").val();
				});
			});
			
			$("#2d-opacity-text").html(this.value);
			wwd.redraw();
		});
		
		// Change 2D image variable
		$('#var-seq').change(function(){
			$.each(surfaceImages,function(index,surfaceImg){
				if(index==$('#var-seq')[0].selectedIndex)
				{
					surfaceImg.enabled = true;
					surfaceImg.opacity = $("#2d-opacity").val();
				}
				else
				{
					surfaceImg.enabled = false;
				}
			});
			$.each(surfaceImages2DAnimation,function(i,surfaceImgs){
				$.each(surfaceImgs,function(j,surfaceImg2){
					if(i==$('#var-seq')[0].selectedIndex && j==parseInt($("#range-2d-animation").val())){
						surfaceImg2.enabled = true;
					}
					else
					{
						surfaceImg2.enabled = false;
					}
					surfaceImg2.opacity = $("#2d-opacity").val();
				});
			});
			wwd.redraw();
		});
		
		// Add 3D screen image for Ray Casting Layer
		var screenOffset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.5);
		var screenImage3DRay = []
		var screenImageRay = new WorldWind.ScreenImage(screenOffset, scImgPath+new3DRayImg);
		screenImageRay.imageOffset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.5);
		screenImageRay.imageScale = 1;
		var screenImageLayer = new WorldWind.RenderableLayer();
		screenImageLayer.displayName = "Screen Image 3D Ray";
		screenImageLayer.addRenderable(screenImageRay);
		wwd.addLayer(screenImageLayer);
		screenImageLayer.enabled = false;
		screenImage3DRay.push(screenImageLayer);
		
		// Add 3D screen image for Isosurface Layer
		var screenOffset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.5);
		var screenImage3DIso = []
		var screenImage3DIsoAnimation = []
		var screenImageIso = new WorldWind.ScreenImage(screenOffset, scImgPath+new3DIsoImg);
		screenImageIso.imageOffset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.5);
		screenImageIso.imageScale = 1;
		var screenImageLayer = new WorldWind.RenderableLayer();
		screenImageLayer.displayName = "Screen Image 3D Iso";
		screenImageLayer.addRenderable(screenImageIso);
		wwd.addLayer(screenImageLayer);
		screenImageLayer.enabled = false;
		screenImage3DIso.push(screenImageLayer);
		for (var t = 0; t < 25; t++) {
			var screenImageLayer2 = new WorldWind.RenderableLayer();
			screenImageLayer2.displayName = "Screen Image 3D Iso Animation - "+t.toString();
			screenImageLayer2.addRenderable(screenImageIso);
			wwd.addLayer(screenImageLayer2);
			screenImageLayer2.enabled = false;
			screenImage3DIsoAnimation.push(screenImageLayer);
		}
		
		// Add 3D screen image for Flow Layer
		var screenOffset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.5);
		var screenImage3DFlow = []
		var screenImageFlow = new WorldWind.ScreenImage(screenOffset, scImgPath+new3DFlowImg);
		screenImageFlow.imageOffset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.5);
		screenImageFlow.imageScale = 1;
		var screenImageLayer = new WorldWind.RenderableLayer();
		screenImageLayer.displayName = "Screen Image 3D Flow";
		screenImageLayer.addRenderable(screenImageFlow);
		wwd.addLayer(screenImageLayer);
		screenImageLayer.enabled = false;
		screenImage3DFlow.push(screenImageLayer);
		
		// Change 3D screen image visibility
		$("#check-layer-dust3d").change(function(){
			if (this.checked){
				//var configTxt = getConfig();
				//writeconfig_ray(configTxt);
                screenImage3DRay[0].enabled = true;
			}
			else{
				screenImage3DRay[0].enabled = false;
			}
			wwd.redraw();
		});
		/*
		$("#check-layer-iso").change(function(){
			if (this.checked){
				//var configTxt = getConfig();
				//writeconfig_iso(configTxt);
                screenImage3DIso[0].enabled = true;
			}
			else{
				screenImage3DIso[0].enabled = false;
			}
			wwd.redraw();
		});
		*/
		$("#check-layer-flow").change(function(){
			if (this.checked){
				//var configTxt = getConfig();
				//writeconfig_flow(configTxt);
                screenImage3DFlow[0].enabled = true;
			}
			else{
				screenImage3DFlow[0].enabled = false;
			}
			wwd.redraw();
		});
		
		$("#btn-iso-render").click(function(){
			var configTxt = getConfig();
			writeconfig_iso(configTxt);
		});
		$("#btn-iso-remove").click(function(){
			screenImage3DIso[0].enabled = false;
			for (var i = 0; i < 25; i++) {
				screenImage3DIsoAnimation[i].enabled = false;
			}
		});
		
		// Load Isosurface Animation
		$("#btn-iso-animation").click(function(){
			var configTxt = getConfig();
			writeconfig_iso_animation(configTxt);
		});
		
				// 3D Isosurface Animation play control
		//slider control
		$("#range-3d-iso").change(function(){
			for (var i = 0; i < 25; i++) {
				screenImage3DIsoAnimation[i].enabled = false;
			}
			screenImage3DIsoAnimation[this.value].enabled = true;
			$("#range-3d-iso-text").html(this.value);
			wwd.redraw();

			if (this.value<25) {
				if ($("#btn-iso-timeplay").hasClass("disabled")){
					$("#btn-iso-timeplay").removeClass("disabled");
				}
				$("#btn-iso-timepause").addClass("disabled");
			}
			else{
				if (!$("#btn-iso-timepause").hasClass("disabled")){
					$("#btn-2dtimepause").addClass("disabled");
				}
				if (!$("#btn-iso-timeplay").hasClass("disabled")){
					$("#btn-iso-timeplay").addClass("disabled");
				}
			}
		});
		var time_interval_iso;
		//play button
		$("#btn-iso-timeplay").click(function(){
			var t = parseInt($("#range-3d-iso").val());
			time_interval_iso = setInterval(function(){
				if (t>0 && t<25){screenImage3DIsoAnimation[t-1].enabled = false;}
				screenImage3DIsoAnimation[t].enabled = true;
				wwd.redraw();
				$("#range-3d-iso").val(t);
				$("#range-3d-iso-text").html(t);
				t = t + 1;
				if (t>24){
					t=0;
					$("#range-3d-iso").val(t);
					$("#btn-iso-timepause").addClass("disabled");
					clearInterval(time_interval_iso);
				}
			},1000);
			if ($("#btn-iso-timepause").hasClass("disabled")){
				$("#btn-iso-timepause").removeClass("disabled");
			}
			$("#btn-iso-timeplay").addClass("disabled");
		});
		//pause button
		$("#btn-iso-timepause").click(function(){
			clearInterval(time_interval_iso);
			$("#btn-iso-timepause").addClass("disabled");
			if ($("#btn-iso-timeplay").hasClass("disabled")){
				$("#btn-iso-timeplay").removeClass("disabled");
			}
		});
		
		// Add 3D screen image for 3D animation
		/*
		var screenOffset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.5);
		var screenImages = []
		for (var t = 0; t < 25; t++) {
			var screenImage = new WorldWind.ScreenImage(screenOffset, "/static/worldwind/images/testgpu/test_"+t+".png");
			screenImage.imageOffset = new WorldWind.Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.5);
			screenImage.imageScale = 1;

			// Add the screen image to a layer and the layer to the World Window's layer list.
			var screenImageLayer = new WorldWind.RenderableLayer();
			screenImageLayer.displayName = "Screen Image";
			screenImageLayer.addRenderable(screenImage);
			wwd.addLayer(screenImageLayer);
			screenImageLayer.enabled = false;
			screenImages.push(screenImageLayer);
		}
		*/
		
		// Change 3D animation screen image visibility
		/*
		$("#check-layer-dust3d-animation").change(function(){
			if (this.checked){
				screenImages[$("#range-3d-animation").val()].enabled = true;
			}
			else{
				for (var i = 0; i < 25; i++) {
					screenImages[i].enabled = false;
				}
			}
			wwd.redraw();
		});
		*/
		
		// 3D Animation play control
		//slider control
		$("#range-3d-animation").change(function(){
			if ($('#check-layer-dust3d-animation').is(':checked')){
				var configTxt = getConfig();
				if ($("#check-layer-dust3d").is(':checked')){
					writeconfig_ray(configTxt);
				}
				/*
				if ($("#check-layer-iso").is(':checked')){
					writeconfig_iso(configTxt);
				}
				*/
				if ($("#check-layer-flow").is(':checked')){
					writeconfig_flow(configTxt);
				}
				$("#range-3d-animation-text").html(this.value);
			}
			else {
				$('#alert3d').show();
			}
			if (this.value<25) {
				if ($("#btn-timeplay").hasClass("disabled")){
					$("#btn-timeplay").removeClass("disabled");
				}
				$("#btn-timepause").addClass("disabled");
			}
			else{
				if (!$("#btn-timepause").hasClass("disabled")){
					$("#btn-timepause").addClass("disabled");
				}
				if (!$("#btn-timeplay").hasClass("disabled")){
					$("#btn-timeplay").addClass("disabled");
				}
			}
		});
		var time_interval;
		//play button
		$("#btn-timeplay").click(function(){
			if ($('#check-layer-dust3d-animation').is(':checked')){
				var t = parseInt($("#range-3d-animation").val());
				time_interval = setInterval(function(){
					var configTxt = getConfig();
					if ($("#check-layer-dust3d").is(':checked')){
						writeconfig_ray(configTxt);
					}
					/*
					if ($("#check-layer-iso").is(':checked')){
						writeconfig_iso(configTxt);
					}
					*/
					if ($("#check-layer-flow").is(':checked')){
						writeconfig_flow(configTxt);
					}
					$("#range-3d-animation").val(t);
					$("#range-3d-animation-text").html(t);
					t = t + 1;
					if (t>24){
						t=0;
						$("#btn-timeplay").addClass("disabled");
						$("#btn-timepause").addClass("disabled");
						clearInterval(time_interval);
					}
				},5000);
				if ($("#btn-timepause").hasClass("disabled")){
					$("#btn-timepause").removeClass("disabled");
				}
				$("#btn-timeplay").addClass("disabled");
			}
			else{
				$('#alert3d').show();
			}
		});
		//pause button
		$("#btn-timepause").click(function(){
			clearInterval(time_interval);
			$("#btn-timepause").addClass("disabled");
			if ($("#btn-timeplay").hasClass("disabled")){
				$("#btn-timeplay").removeClass("disabled");
			}
		});
		
		// Place Markers
		$('#btn-placeMarker').click(function(){
			var markerLat = parseFloat($('#marker-position-lat').val());
			var markerLong = parseFloat($('#marker-position-long').val());
			var markerAlt = parseFloat($('#marker-position-alt').val());
			
			var markerImage = "castshadow-red.png";

			var pinLibrary = "/static/worldwind/images/pushpins/", // location of the image files
				placemark,
				placemarkAttributes = new WorldWind.PlacemarkAttributes(null),
				highlightAttributes,
				placemarkLayer = new WorldWind.RenderableLayer("Placemarks"),
				latitude = markerLat,
				longitude = markerLong,
				altitude = markerAlt;

			// Set up the common placemark attributes.
			placemarkAttributes.imageScale = 1;
			placemarkAttributes.imageOffset = new WorldWind.Offset(
				WorldWind.OFFSET_FRACTION, 0.3,
				WorldWind.OFFSET_FRACTION, 0.0);
			placemarkAttributes.imageColor = WorldWind.Color.WHITE;
			placemarkAttributes.labelAttributes.offset = new WorldWind.Offset(
				WorldWind.OFFSET_FRACTION, 0.5,
				WorldWind.OFFSET_FRACTION, 1.0);
			placemarkAttributes.labelAttributes.color = WorldWind.Color.YELLOW;
			placemarkAttributes.drawLeaderLine = true;
			placemarkAttributes.leaderLineAttributes.outlineColor = WorldWind.Color.RED;

			// For each placemark image, create a placemark with a label.
			placemark = new WorldWind.Placemark(new WorldWind.Position(latitude, longitude, altitude));
			placemark.label = "Lat " + latitude.toPrecision(4).toString() + "\n"
				+ "Lon " + longitude.toPrecision(5).toString() + "\n"
				+ "Alt " + altitude.toPrecision(2).toString();
			placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;

			// Create the placemark attributes for this placemark. Note that the attributes differ only by their
			// image URL.
			placemarkAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
			placemarkAttributes.imagePath = pinLibrary + markerImage;
			placemark.attributes = placemarkAttributes;

			// Create the highlight attributes for this placemark. Note that the normal attributes are specified as
			// the default highlight attributes so that all properties are identical except the image scale. You could
			// instead vary the color, image, or other property to control the highlight representation.
			highlightAttributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);
			highlightAttributes.imageScale = 1.2;
			placemark.highlightAttributes = highlightAttributes;

			// Remove any previously placed markers
			$.each(wwd.layers,function(key,value){
				if(value.displayName=="Placemarks"){
					wwd.removeLayer(value);
				};
			});
			
			// Add the placemark to the layer.
			placemarkLayer.addRenderable(placemark);

			// Add the placemarks layer to the World Window's layer list.
			wwd.addLayer(placemarkLayer);

			// Draw the World Window for the first time.
			wwd.redraw();
		});

		wwd.redraw();
		// ---------------- End of UI functions ---------------- //
		
		// Test Funcitons
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
		
		// download config file
		$('#btn-downloadconfig').click(function(){
			var downloadText = getConfig();
			this.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(downloadText);
		});
    });
