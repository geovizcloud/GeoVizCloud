/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports WorldWindow
 * @version $Id: WorldWindow.js 3044 2015-04-23 00:42:44Z danm $
 */
define([
        './error/ArgumentError',
        './render/DrawContext',
        './globe/EarthElevationModel',
        './util/FrameStatistics',
        './globe/Globe',
        './globe/Globe2D',
        './cache/GpuResourceCache',
        './util/Logger',
        './navigate/LookAtNavigator',
        './navigate/NavigatorState',
        './geom/Rectangle',
        './geom/Sector',
        './shapes/SurfaceShape',
        './shapes/SurfaceShapeTileBuilder',
        './globe/Terrain',
        './geom/Vec2'],
    function (ArgumentError,
              DrawContext,
              EarthElevationModel,
              FrameStatistics,
              Globe,
              Globe2D,
              GpuResourceCache,
              Logger,
              LookAtNavigator,
              NavigatorState,
              Rectangle,
              Sector,
              SurfaceShape,
              SurfaceShapeTileBuilder,
              Terrain,
              Vec2) {
        "use strict";

        /**
         * Constructs a World Wind window for an HTML canvas.
         * @alias WorldWindow
         * @constructor
         * @classdesc Represents a World Wind window for an HTML canvas.
         * @param {String} canvasName The name assigned to the canvas in the HTML page.
         */
        var WorldWindow = function (canvasName) {
            if (!(window.WebGLRenderingContext)) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "WorldWindow", "constructor",
                        "The specified canvas does not support WebGL."));
            }

            this.canvas = document.getElementById(canvasName);

            this.canvas.addEventListener("webglcontextlost", handleContextLost, false);
            this.canvas.addEventListener("webglcontextrestored", handleContextRestored, false);

            var thisWindow = this;

            function handleContextLost(event) {
                event.preventDefault();
                thisWindow.gpuResourceCache.clear();

                if (thisWindow.pickingFrameBuffer) {
                    thisWindow.pickingFrameBuffer = null;
                }
            }

            function handleContextRestored(event) {
            }

            var gl = this.getWebGLContext();

            // Internal. Intentionally not documented. Must be initialized before the navigator is created.
            this.eventListeners = {};

            /**
             * The number of bits in the depth buffer associated with this World Window.
             * @type {number}
             */
            this.depthBits = gl.getParameter(WebGLRenderingContext.DEPTH_BITS);

            /**
             * The current viewport of this World Window.
             * @type {Rectangle}
             */
            this.viewport = new Rectangle(0, 0, this.canvas.width, this.canvas.height);

            /**
             * The globe displayed.
             * @type {Globe}
             */
            this.globe = new Globe(new EarthElevationModel());

            /**
             * The layers to display in this world window.
             * This property is read-only. Use [addLayer]{@link WorldWindow#addLayer} or
             * [insertLayer]{@link WorldWindow#insertLayer} to add layers to this world window.
             * Use [removeLayer]{@link WorldWindow#removeLayer} to remove layers from this world window.
             * @type {Layer[]}
             * @readonly
             */
            this.layers = [];

            /**
             * The navigator used to manipulate the globe.
             * @type {LookAtNavigator}
             * @default [LookAtNavigator]{@link LookAtNavigator}
             */
            this.navigator = new LookAtNavigator(this);

            /**
             * The vertical exaggeration to apply to the terrain.
             * @type {Number}
             */
            this.verticalExaggeration = 1;

            /**
             * Indicates that picking will return all objects at the pick point, if any. The top-most object will have
             * its isOnTop flag set to true.
             * If deep picking is false, the default, only the top-most object is returned, plus
             * the picked-terrain object if the pick point is over the terrain.
             * @type {boolean}
             * @default false
             */
            this.deepPicking = false;

            /**
             * Performance statistics for this WorldWindow.
             * @type {FrameStatistics}
             */
            this.frameStatistics = new FrameStatistics();

            /**
             * The list of callbacks to call immediately after performing a redraw. The callbacks have a single
             * argument: this world window, e.g., <code>redrawCallback(WorldWindow);</code>
             * @type {function[]}
             */
            this.redrawCallbacks = [];

            // Internal. Intentionally not documented.
            this.gpuResourceCache = new GpuResourceCache(WorldWind.configuration.gpuCacheSize,
                0.8 * WorldWind.configuration.gpuCacheSize);

            // Internal. Intentionally not documented.
            this.drawContext = new DrawContext();
            this.drawContext.canvas = this.canvas;
            this.drawContext.gpuResourceCache = this.gpuResourceCache;

            // Internal. Intentionally not documented.
            this.pickingFrameBuffer = null;

            // Create a virtual canvas for capturing texture maps of SVG text and other SVG 2D renderings.
            this.drawContext.canvas2D = document.createElement("canvas");
            this.drawContext.ctx2D = this.drawContext.canvas2D.getContext("2d");

            // Internal. Intentionally not documented.
            this.frameRequested = false;
            this.frameRequestCallback = null;

            /**
             * Create a surface shape tile builder to accumulate and render surface shapes.
             * @type {SurfaceShapeTileBuilder}
             */
            this.surfaceShapeTileBuilder = new SurfaceShapeTileBuilder();

            // Set up to handle redraw requests sent to the canvas and the global window. Imagery uses the canvas
            // because images are generally specific to the WebGL context associated with the canvas. Elevation models
            // use the global window because they can be shared among world windows.
            var redrawEventListener = function () {
                thisWindow.redraw();
            };
            this.canvas.addEventListener(WorldWind.REDRAW_EVENT_TYPE, redrawEventListener, false);
            window.addEventListener(WorldWind.REDRAW_EVENT_TYPE, redrawEventListener, false);
        };

        /**
         * Converts window coordinates to coordinates relative to this World Window's canvas.
         * @param {Number} x The X coordinate to convert.
         * @param {Number} y The Y coordinate to convert.
         * @returns {Vec2} The converted coordinates.
         */
        WorldWindow.prototype.canvasCoordinates = function (x, y) {
            var bbox = this.canvas.getBoundingClientRect(),
                xc = x - (bbox.left + this.canvas.clientLeft),// * (this.canvas.width / bbox.width),
                yc = y - (bbox.top + this.canvas.clientTop);// * (this.canvas.height / bbox.height);

            return new Vec2(xc, yc);
        };

        /**
         * Registers an event listener for the specified event type on this World Window's canvas. This function
         * delegates the processing of events to the World Window's canvas. For details on this function and its
         * arguments, see the W3C [EventTarget]{@link http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-EventTarget}
         * documentation.
         *
         * Registering event listeners using this function enables applications to prevent the World Window's default
         * navigation behavior. To prevent default navigation behavior, call the [Event]{@link http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-Event}'s
         * preventDefault method from within an event listener for any events the navigator should not respond to.
         *
         * When an event occurs, this calls the registered event listeners in order of reverse registration. Since the
         * World Window registers its navigator event listeners first, application event listeners are called before
         * navigator event listeners.
         *
         * @param type The event type to listen for.
         * @param listener The function to call when the event occurs.
         * @throws {ArgumentError} If any argument is null or undefined.
         */
        WorldWindow.prototype.addEventListener = function (type, listener) {
            if (!type) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "WorldWindow", "addEventListener", "missingType"));
            }

            if (!listener) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "WorldWindow", "addEventListener", "missingListener"));
            }

            var thisWorldWindow = this;
            var entry = this.eventListeners[type];
            if (!entry) {
                entry = {
                    listeners: [],
                    callback: function (event) { // calls listeners in reverse registration order
                        for (var i = entry.listeners.length - 1; i >= 0; i--) {
                            event.worldWindow = thisWorldWindow;
                            entry.listeners[i](event);
                        }
                    }
                };
                this.eventListeners[type] = entry;
            }

            var index = entry.listeners.indexOf(listener);
            if (index == -1) { // suppress duplicate listeners
                entry.listeners.push(listener); // add the listener to the list

                if (entry.listeners.length == 1) { // first listener added, add the event listener callback
                    this.canvas.addEventListener(type, entry.callback, false);
                }
            }
        };

        /**
         * Removes an event listener for the specified event type from this World Window's canvas. The listener must be
         * the same object passed to addEventListener. Calling removeEventListener with arguments that do not identify a
         * currently registered listener has no effect.
         *
         * @param type Indicates the event type the listener registered for.
         * @param listener The listener to remove. Must be the same function object passed to addEventListener.
         * @throws {ArgumentError} If any argument is null or undefined.
         */
        WorldWindow.prototype.removeEventListener = function (type, listener) {
            if (!type) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "WorldWindow", "removeEventListener", "missingType"));
            }

            if (!listener) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "WorldWindow", "removeEventListener", "missingListener"));
            }

            var entry = this.eventListeners[type];
            if (!entry) {
                return; // no entry for the specified type
            }

            var index = entry.listeners.indexOf(listener);
            if (index != -1) {
                entry.listeners.splice(index, 1); // remove the listener from the list

                if (entry.listeners.length == 0) { // last listener removed, remove the event listener callback
                    this.canvas.removeEventListener(type, entry.callback, false);
                }
            }
        };

        /**
         * Causes a redraw event for this World Window to be enqueued with the browser. The redraw occurs on the main
         * thread at a time of the browser's discretion. Applications should call redraw after changing the World
         * Window's state, but should not expect that change to be reflected on screen immediately after this function
         * returns. This is the preferred method for requesting a redraw of the World Window.
         */
        WorldWindow.prototype.redraw = function () {
            if (this.frameRequested) {
                return; // coalesce redundant redraw requests
            }

            if (!this.frameRequestCallback) {
                var self = this;
                this.frameRequestCallback = function () {
                    self.doRedraw();
                };
            }

            window.requestAnimationFrame(this.frameRequestCallback);
            this.frameRequested = true;
        };

        WorldWindow.prototype.doRedraw = function () {
            this.frameRequested = false;

            try {
                this.resetDrawContext();
                this.drawFrame();

                for (var i = 0, len = this.redrawCallbacks.length; i < len; i++) {
                    this.redrawCallbacks[i](this);
                }
            } catch (e) {
                Logger.logMessage(Logger.LEVEL_SEVERE, "WorldWindow", "redraw",
                    "Exception occurred during rendering: " + e.toString());
            }
        };

        /**
         * Requests the World Wind objects displayed at a specified screen-coordinate point.
         *
         * If the point intersects the terrain, the returned list contains an object identifying the associated geographic
         * position. This returns an empty list when nothing in the World Wind scene intersects the specified point.
         *
         * @param pickPoint The point to examine in this World Window's screen coordinates.
         * @returns {PickedObjectList} A list of picked World Wind objects at the specified pick point.
         * @throws {ArgumentError} If the specified pick point is null or undefined.
         */
        WorldWindow.prototype.pick = function (pickPoint) {
            if (!pickPoint) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "WorldWindow", "pick", "missingPoint"));
            }

            this.resetDrawContext();
            this.drawContext.pickingMode = true;
            this.drawContext.regionPicking = false;
            this.pickTerrainOnly = false;
            this.drawContext.pickPoint = pickPoint;
            this.drawFrame();

            return this.drawContext.objectsAtPickPoint;
        };

        /**
         * Requests the position of the World Wind terrain at a specified screen-coordinate point. If the point
         * intersects the terrain, the returned list contains a single object identifying the associated geographic
         * position. Otherwise this returns an empty list.
         * @param pickPoint The point to examine in this World Window's screen coordinates.
         * @returns {PickedObjectList} A list containing the picked World Wind terrain position at the specified point,
         * or an empty list if the point does not intersect the terrain.
         * @throws {ArgumentError} If the specified pick point is null or undefined.
         */
        WorldWindow.prototype.pickTerrain = function (pickPoint) {
            if (!pickPoint) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "WorldWindow", "pickTerrain", "missingPoint"));
            }

            this.resetDrawContext();
            this.drawContext.pickingMode = true;
            this.drawContext.regionPicking = false;
            this.pickTerrainOnly = true;
            this.drawContext.pickPoint = pickPoint;
            this.drawFrame();

            return this.drawContext.objectsAtPickPoint;
        };

        /**
         * Requests the World Wind objects displayed within a specified screen-coordinate region. This returns all
         * objects that intersect the specified region, regardless of whether or not an object is actually visible, and
         * marks objects that are visible as on top.
         * @param {Rectangle} rectangle The screen coordinate rectangle identifying the region to search.
         * @returns {PickedObjectList} A list of visible World Wind objects within the specified region.
         * @throws {ArgumentError} If the specified rectangle is null or undefined.
         */
        WorldWindow.prototype.pickShapesInRegion = function (rectangle) {
            if (!rectangle) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "WorldWindow", "pickShapesInRegion", "missingRectangle"));
            }

            this.resetDrawContext();
            this.drawContext.pickingMode = true;
            this.drawContext.regionPicking = true;
            this.pickTerrainOnly = false;
            this.drawContext.pickRectangle =
                new Rectangle(rectangle.x, this.canvas.height - rectangle.y, rectangle.width, rectangle.height);
            this.drawFrame();

            return this.drawContext.objectsAtPickPoint;
        };

        // Internal. Intentionally not documented.
        WorldWindow.prototype.resetDrawContext = function () {
            var dc = this.drawContext;

            dc.reset();
            this.globe.offset = 0;
            dc.globe = this.globe;
            dc.layers = this.layers;
            dc.navigatorState = this.navigator.currentState();
            dc.verticalExaggeration = this.verticalExaggeration;
            dc.frameStatistics = this.frameStatistics;
            dc.deepPicking = this.deepPicking;
            dc.update();
        };

        /* useful stuff to debug WebGL */
        /*
         function logGLCall(functionName, args) {
         console.log("gl." + functionName + "(" +
         WebGLDebugUtils.glFunctionArgsToString(functionName, args) + ")");
         };

         function validateNoneOfTheArgsAreUndefined(functionName, args) {
         for (var ii = 0; ii < args.length; ++ii) {
         if (args[ii] === undefined) {
         console.error("undefined passed to gl." + functionName + "(" +
         WebGLDebugUtils.glFunctionArgsToString(functionName, args) + ")");
         }
         }
         };

         WorldWindow.prototype.logAndValidate = function logAndValidate(functionName, args) {
         logGLCall(functionName, args);
         validateNoneOfTheArgsAreUndefined (functionName, args);
         };

         WorldWindow.prototype.throwOnGLError = function throwOnGLError(err, funcName, args) {
         throw WebGLDebugUtils.glEnumToString(err) + " was caused by call to: " + funcName;
         };
         */

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.drawFrame = function () {
            this.drawContext.frameStatistics.beginFrame();

            var gl = this.getWebGLContext();

            // uncomment to debug WebGL
            //var gl = WebGLDebugUtils.makeDebugContext(this.canvas.getContext("webgl"),
            //        this.throwOnGLError,
            //        this.logAndValidate
            //);

            this.drawContext.currentGlContext = gl;

            this.viewport = new Rectangle(0, 0, this.canvas.width, this.canvas.height);

            if (!this.pickingFrameBuffer) {
                this.createPickBuffer(gl);
            }

            if (this.drawContext.pickingMode) {
                gl.bindFramebuffer(WebGLRenderingContext.FRAMEBUFFER, this.pickingFrameBuffer);
            }

            try {
                this.beginFrame(this.drawContext, this.viewport);
                if (this.drawContext.globe instanceof Globe2D && this.drawContext.globe.continuous) {
                    this.do2DContiguousRepaint(this.drawContext);
                } else {
                    this.doNormalRepaint(this.drawContext);
                }
            } finally {
                this.endFrame(this.drawContext);
                if (this.drawContext.pickingMode) {
                    gl.bindFramebuffer(WebGLRenderingContext.FRAMEBUFFER, null);
                }
                this.drawContext.frameStatistics.endFrame();
            }
        };

        WorldWindow.prototype.getWebGLContext = function () {
            // Request a WebGL context with antialiasing is disabled. Antialiasing causes gaps to appear at the edges of
            // terrain tiles.
            var glAttrs = {antialias: false},
                gl = this.canvas.getContext("webgl", glAttrs);
            if (!gl) {
                gl = this.canvas.getContext("experimental-webgl", glAttrs);
            }

            return gl;
        };

        WorldWindow.prototype.doNormalRepaint = function (dc) {
            this.createTerrain(this.drawContext);
            this.clearFrame(this.drawContext);
            if (this.drawContext.pickingMode) {
                if (this.drawContext.makePickFrustum()) {
                    this.doPick(this.drawContext);
                }
            } else {
                this.doDraw(this.drawContext);
            }
        };

        WorldWindow.prototype.do2DContiguousRepaint = function (dc) {
            this.createTerrain2DContiguous(this.drawContext);
            this.clearFrame(this.drawContext);
            if (this.drawContext.pickingMode) {
                if (this.drawContext.makePickFrustum()) {
                    this.pick2DContiguous(this.drawContext);
                }
            } else {
                this.draw2DContiguous(this.drawContext);
            }
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.beginFrame = function (dc, viewport) {
            var gl = dc.currentGlContext;

            gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

            gl.enable(WebGLRenderingContext.BLEND);
            gl.blendFunc(WebGLRenderingContext.ONE, WebGLRenderingContext.ONE_MINUS_SRC_ALPHA);

            gl.enable(WebGLRenderingContext.CULL_FACE);
            gl.enable(WebGLRenderingContext.DEPTH_TEST);
            gl.depthFunc(WebGLRenderingContext.LEQUAL);
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.endFrame = function (dc) {
            var gl = dc.currentGlContext;

            gl.disable(WebGLRenderingContext.BLEND);
            gl.disable(WebGLRenderingContext.CULL_FACE);
            gl.disable(WebGLRenderingContext.DEPTH_TEST);
            gl.blendFunc(WebGLRenderingContext.ONE, WebGLRenderingContext.ZERO);
            gl.depthFunc(WebGLRenderingContext.LESS);
            gl.clearColor(0, 0, 0, 1);
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.clearFrame = function (dc) {
            var gl = dc.currentGlContext;

            gl.clearColor(dc.clearColor.red, dc.clearColor.green, dc.clearColor.blue, dc.clearColor.alpha);
            gl.clear(WebGLRenderingContext.COLOR_BUFFER_BIT | WebGLRenderingContext.DEPTH_BUFFER_BIT);
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.doDraw = function (dc) {
            this.drawContext.surfaceShapeTileBuilder = this.surfaceShapeTileBuilder;
            this.surfaceShapeTileBuilder.clear();

            this.drawLayers();

            this.surfaceShapeTileBuilder.doRender(dc);

            if (!this.deferOrderedRendering) {
                this.drawOrderedRenderables();
            }

            dc.screenCreditController.drawCredits(dc);
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.doPick = function (dc) {
            if (dc.terrain) {
                dc.terrain.pick(dc);
            }

            if (!this.pickTerrainOnly) {
                this.drawContext.surfaceShapeTileBuilder = this.surfaceShapeTileBuilder;
                this.surfaceShapeTileBuilder.clear();

                this.drawLayers();

                this.surfaceShapeTileBuilder.doRender(dc);

                if (!this.deferOrderedRendering) {
                    this.drawOrderedRenderables();
                }
            }

            if (this.pickTerrainOnly) {
                this.resolveTerrainPick();
            } else if (this.drawContext.regionPicking) {
                this.resolveRegionPick();
            } else {
                this.resolveTopPick();
            }
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.createTerrain = function (dc) {
            dc.terrain = this.globe.tessellator.tessellate(dc);

            dc.frameStatistics.setTerrainTileCount(dc.terrain ? dc.terrain.surfaceGeometry.length : 0);
        };

        WorldWindow.prototype.makeCurrent = function (dc, offset) {
            dc.globe.offset = offset;
            dc.globeStateKey = dc.globe.stateKey;

            switch (offset) {
                case -1:
                    dc.terrain = this.terrainLeft;
                    break;

                case 0:
                    dc.terrain = this.terrainCenter;
                    break;

                case 1:
                    dc.terrain = this.terrainRight;
                    break;
            }
        };

        WorldWindow.prototype.createTerrain2DContiguous = function (dc) {
            this.terrainCenter = null;
            dc.globe.offset = 0;
            dc.globeStateKey = dc.globe.stateKey;
            if (dc.globe.intersectsFrustum(dc.navigatorState.frustumInModelCoordinates)) {
                this.terrainCenter = dc.globe.tessellator.tessellate(dc);
            }

            this.terrainRight = null;
            dc.globe.offset = 1;
            dc.globeStateKey = dc.globe.stateKey;
            if (dc.globe.intersectsFrustum(dc.navigatorState.frustumInModelCoordinates)) {
                this.terrainRight = dc.globe.tessellator.tessellate(dc);
            }

            this.terrainLeft = null;
            dc.globe.offset = -1;
            dc.globeStateKey = dc.globe.stateKey;
            if (dc.globe.intersectsFrustum(dc.navigatorState.frustumInModelCoordinates)) {
                this.terrainLeft = dc.globe.tessellator.tessellate(dc);
            }
        };

        WorldWindow.prototype.draw2DContiguous = function (dc) {
            var drawing = "";

            if (this.terrainCenter) {
                drawing += " 0 ";
                this.makeCurrent(dc, 0);
                this.deferOrderedRendering = this.terrainLeft || this.terrainRight;
                this.doDraw(dc);
            }

            if (this.terrainRight) {
                drawing += " 1 ";
                this.makeCurrent(dc, 1);
                this.deferOrderedRendering = this.terrainLeft || this.terrainLeft;
                this.doDraw(dc);
            }

            this.deferOrderedRendering = false;

            if (this.terrainLeft) {
                drawing += " -1 ";
                this.makeCurrent(dc, -1);
                this.doDraw(dc);
            }
            //
            //console.log(drawing);
        };

        WorldWindow.prototype.pick2DContiguous = function (dc) {
            if (this.terrainCenter) {
                this.makeCurrent(dc, 0);
                this.deferOrderedRendering = this.terrainLeft || this.terrainRight;
                this.doPick(dc);
            }

            if (this.terrainRight) {
                this.makeCurrent(dc, 1);
                this.deferOrderedRendering = this.terrainLeft || this.terrainLeft;
                this.doPick(dc);
            }

            this.deferOrderedRendering = false;

            if (this.terrainLeft) {
                this.makeCurrent(dc, -1);
                this.doPick(dc);
            }
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.drawLayers = function () {
            // Draw all the layers attached to this WorldWindow.

            var beginTime = Date.now(),
                dc = this.drawContext,
                layers = this.drawContext.layers,
                layer;

            for (var i = 0, len = layers.length; i < len; i++) {
                layer = layers[i];
                if (layer) {
                    dc.currentLayer = layer;
                    try {
                        layer.render(dc);
                    } catch (e) {
                        Logger.log(Logger.LEVEL_SEVERE, "Error while rendering layer " + layer.displayName + ".\n"
                        + e.toString());
                        // Keep going. Render the rest of the layers.
                    }
                }
            }

            var now = Date.now();
            dc.frameStatistics.layerRenderingTime = now - beginTime;
        };

        /**
         * Adds a specified layer to the end of this world window.
         * @param {Layer} layer The layer to add. May be null or undefined, in which case this world window is not modified.
         */
        WorldWindow.prototype.addLayer = function (layer) {
            this.layers.push(layer);
        };

        /**
         * Removes the first instance of a specified layer from this world window.
         * @param {Layer} layer The layer to remove. May be null or undefined, in which case this world window is not
         * modified. This world window is also not modified if the specified layer does not exist in this world
         * window's layer list.
         */
        WorldWindow.prototype.removeLayer = function (layer) {
            if (!layer)
                return;

            var index = -1;
            for (var i = 0, len = this.layers.length; i < len; i++) {
                if (this.layers[i] == layer) {
                    index = i;
                    break;
                }
            }

            if (index >= 0) {
                this.layers.splice(index, 1);
            }
        };

        /**
         * Inserts a specified layer at a specified position in this world window's layer list.
         * @param {number} index The index at which to insert the layer. May be negative to specify the position
         * from the end of the array.
         * @param {Layer} layer The layer to insert. This world window's layer list is not changed if the specified
         * layer is null or undefined.
         */
        WorldWindow.prototype.insertLayer = function (index, layer) {
            if (layer) {
                this.layers.splice(index, 0, layer);
            }
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.drawOrderedRenderables = function () {
            var beginTime = Date.now(),
                dc = this.drawContext,
                or;

            dc.sortOrderedRenderables();
            dc.orderedRenderingMode = true;

            while (or = dc.popOrderedRenderable()) {
                try {
                    or.renderOrdered(dc);
                } catch (e) {
                    Logger.logMessage(Logger.LEVEL_WARNING, "WorldWindow", "drawOrderedRenderables",
                        "Error while rendering a shape:" + e.message);
                    // Keep going. Render the rest of the ordered renderables.
                }
            }

            dc.orderedRenderingMode = false;

            dc.frameStatistics.orderedRenderingTime = Date.now() - beginTime;
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.createPickBuffer = function (gl) {
            var pickingTexture = gl.createTexture();
            gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, pickingTexture);
            gl.texImage2D(WebGLRenderingContext.TEXTURE_2D, 0, WebGLRenderingContext.RGBA,
                this.viewport.width, this.viewport.height, 0, WebGLRenderingContext.RGBA,
                WebGLRenderingContext.UNSIGNED_BYTE, null);
            gl.texParameteri(WebGLRenderingContext.TEXTURE_2D, WebGLRenderingContext.TEXTURE_MIN_FILTER,
                WebGLRenderingContext.LINEAR);

            var pickingDepthBuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(WebGLRenderingContext.RENDERBUFFER, pickingDepthBuffer);
            gl.renderbufferStorage(WebGLRenderingContext.RENDERBUFFER, WebGLRenderingContext.DEPTH_COMPONENT16,
                this.viewport.width, this.viewport.height);

            this.pickingFrameBuffer = gl.createFramebuffer();
            gl.bindFramebuffer(WebGLRenderingContext.FRAMEBUFFER, this.pickingFrameBuffer);
            gl.framebufferTexture2D(WebGLRenderingContext.FRAMEBUFFER, WebGLRenderingContext.COLOR_ATTACHMENT0,
                WebGLRenderingContext.TEXTURE_2D, pickingTexture, 0);
            gl.framebufferRenderbuffer(WebGLRenderingContext.FRAMEBUFFER, WebGLRenderingContext.DEPTH_ATTACHMENT,
                WebGLRenderingContext.RENDERBUFFER, pickingDepthBuffer);

            var e = gl.checkFramebufferStatus(WebGLRenderingContext.FRAMEBUFFER);
            if (e != WebGLRenderingContext.FRAMEBUFFER_COMPLETE) {
                Logger.logMessage(Logger.LEVEL_WARNING, "WorldWindow", "createPickBuffer",
                    "Error creating pick buffer: " + gl.checkFramebufferStatus());
            }

            gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, null);
            gl.bindRenderbuffer(WebGLRenderingContext.RENDERBUFFER, null);
            gl.bindFramebuffer(WebGLRenderingContext.FRAMEBUFFER, null);
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.resolveTopPick = function () {
            if (this.drawContext.objectsAtPickPoint.objects.length == 0) {
                return; // nothing picked; avoid calling readPickColor unnecessarily
            }

            // Make a last reading to determine what's on top.

            var pickedObjects = this.drawContext.objectsAtPickPoint,
                pickColor = this.drawContext.readPickColor(this.drawContext.pickPoint),
                topObject = null,
                terrainObject = null;

            if (pickColor) {
                // Find the picked object with the top color code and set its isOnTop flag.
                for (var i = 0, len = pickedObjects.objects.length; i < len; i++) {
                    var po = pickedObjects.objects[i];

                    if (po.isTerrain) {
                        terrainObject = po;
                    }

                    if (po.color.equals(pickColor)) {
                        po.isOnTop = true;
                        topObject = po;

                        if (terrainObject) {
                            break; // no need to search for more than the top object and the terrain object
                        }
                    }
                }

                // In single-pick mode provide only the top-most object and the terrain object, if any.
                if (!this.drawContext.deepPicking) {
                    pickedObjects.clear();
                    if (topObject) {
                        pickedObjects.add(topObject);
                    }
                    if (terrainObject && terrainObject != topObject) {
                        pickedObjects.add(terrainObject);
                    }
                }
            } else {
                pickedObjects.clear(); // nothing drawn at the pick point
            }
        };

        // Internal. Intentionally not documented.
        WorldWindow.prototype.resolveTerrainPick = function () {
            var pickedObjects = this.drawContext.objectsAtPickPoint,
                po;

            // Mark the first picked terrain object as "on top". The picked object list should contain only one entry
            // indicating the picked terrain object, but we iterate over the list contents anyway.
            for (var i = 0, len = pickedObjects.objects.length; i < len; i++) {
                po = pickedObjects.objects[i];
                if (po.isTerrain) {
                    po.isOnTop = true;
                    break;
                }
            }
        };

        // Internal. Intentionally not documented.
        WorldWindow.prototype.resolveRegionPick = function () {
            if (this.drawContext.objectsAtPickPoint.objects.length == 0) {
                return; // nothing picked; avoid calling readPickColors unnecessarily
            }

            // Mark every picked object with a color in the pick buffer as "on top".

            var pickedObjects = this.drawContext.objectsAtPickPoint,
                uniquePickColors = this.drawContext.readPickColors(this.drawContext.pickRectangle),
                po,
                color;

            for (var i = 0, len = pickedObjects.objects.length; i < len; i++) {
                po = pickedObjects.objects[i];
                if (!po) continue;
                var poColor = po.color.toByteString();
                color = uniquePickColors[poColor];
                if (color) {
                    po.isOnTop = true;
                } else if (po.userObject instanceof SurfaceShape) {
                    // SurfaceShapes ALWAYS get added to the pick list, since their rendering is deferred
                    // until the tile they are cached by is rendered. So a SurfaceShape may be in the pick list
                    // but is not seen in the pick rectangle.
                    //
                    // Remove the SurfaceShape that was not visible to the pick rectangle.
                    pickedObjects.objects.splice(i, 1);
                    i -= 1;
                }
            }
        };

        return WorldWindow;
    }
)
;