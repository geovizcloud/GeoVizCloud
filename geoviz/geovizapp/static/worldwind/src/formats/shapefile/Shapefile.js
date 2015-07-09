/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports Shapefile
 * @version $Id: Shapefile.js 2896 2015-03-13 00:23:38Z tgaskins $
 */
define([
        '../../error/ArgumentError',
        '../../util/Logger'
    ],
    function (ArgumentError,
              Logger) {
        "use strict";

        /**
         * Constructs a shapefile object for a specified shapefile URL. Call {@link Shapefile#load} to retrieve the
         * shapefile and create shapes for it.
         * @alias Shapefile
         * @constructor
         * @classdesc Parses a shapefile and creates shapes representing its contents. Points in the shapefile are
         * represented by [Placemarks]{@link Placemark}, lines are represented by [Paths]{@link Path}, and polygons
         * are represented by [SurfacePolygons]{@link SurfacePolygon}. A completion callback may be specified and is
         * called when the shapefile is fully parsed and all its shapes are created.
         * <p>
         * An attribute callback may also be specified to examine each record and modify the shape created for it as
         * the shapefile is parsed. This function enables the application to assign independent attributes to each
         * shape. An argument to this function provides any attributes specified in an attribute file accompanying
         * the shapefile. That attribute file is automatically detected and retrieved along with the shapefile.
         * @param {String} url The location of the shapefile.
         * @throws {ArgumentError} If the specified URL is null or undefined.
         */
        var Shapefile = function (url) {
            if (!url) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "Shapefile", "constructor", "missingUrl"));
            }

            // Documented in defineProperties below.
            this._url = url;

            // Documented in defineProperties below.
            this._shapeType = null;

            // Documented in defineProperties below.
            this._layer = null;

            // Documented in defineProperties below.
            this._attributeCallback = null;

            // Documented in defineProperties below.
            this._loadCallback = null;
        };

        Object.defineProperties(Shapefile.prototype, {
            /**
             * The shapefile URL as specified to this shapefile's constructor.
             * @memberof Shapefile.prototype
             * @type {String}
             * @readonly
             */
            url: {
                get: function () {
                    return this._url;
                }
            },

            /**
             * The shape type of the shapefile. The type can be one of the following:
             * <ul>
             *     <li>WorldWind.POINT</li>
             *     <li>WorldWind.MULTI_POINT</li>
             *     <li>WorldWind.POLYLINE</li>
             *     <li>WorldWind.POLYGON</li>
             * </ul>
             * This value is defined during shapefile loading.
             * @memberof Shapefile.prototype
             * @type {String}
             * @readonly
             */
            shapeType: {
                get: function () {
                    return this._shapeType;
                }
            },

            /**
             * The layer containing the shapes representing the records in the shapefile. This property is null until
             * the shapefile has been retrieved, parsed and the shapes created and added to the new layer.
             * @memberof Shapefile.prototype
             * @type {Layer}
             * @readonly
             */
            layer: {
                get: function () {
                    return this._layer;
                }
            },

            /**
             * The completion callback specified to {@link Shapefile#load}. See that method's description for details.
             * @memberof Shapefile.prototype
             * @type {Function}
             * @default null
             * @readonly
             */
            completionCallback: {
                get: function () {
                    return this._completionCallback;
                }
            },

            /**
             * The attribute callback specified to {@link Shapefile#load}. See that method's description for details.
             * @memberof Shapefile.prototype
             * @type {Function}
             * @default null
             * @readonly
             */
            attributeCallback: {
                get: function () {
                    return this._attributeCallback;
                }
            }
        });

        /**
         * Retrieves the shapefile, parses it and creates shapes representing its contents. The result is a layer
         * containing the created shapes. A function can be specified to be called when the process is complete.
         * A function can also be specified to be called for each shape created so that its attributes can be
         * assigned.
         *
         * @param {Function} completionCallback An optional function called when shapefile loading and shape
         * creation are complete. The single argument to this function is this shapefile object. When this function is
         * called, the layer containing the shapes is available via the {@link Shapefile#layer} property. Applications
         * typically add this layer to their World Window's layer list within this callback function.
         *
         * @param {Function} attributeCallback An optional function called just after a shape is created. This function
         * can be used to assign attributes to the newly created shapes. The callback function's first argument is an
         * object containing the properties read from the corresponding shapefile attributes file, if any.
         * This file, which has a .dbf suffix, is automatically detected, retrieved and parsed if it exists. The second
         * argument to the callback function is the {@link ShapefileRecord} currently being operated on. The return
         * value of the callback function must be either null, a {@link PlacemarkAttributes} object if the shapefile
         * contains points, a {@link PathAttributes} object if the shapefile contains polylines, or a
         * {@link ShapeAttributes} object if the shapefile contains polygons. If the callback function returns null
         * then the newly created shape's default attributes are used.
         *
         */
        Shapefile.prototype.load = function (completionCallback, attributeCallback) {
            this._completionCallback = completionCallback;
            this._attributeCallback = attributeCallback;
        };

        /**
         * Iterates over this shapefile's records and creates shapes for them. This method may be overridden by
         * subclasses to change the default shape creation behavior.
         * @param {Layer} layer The layer in which to place the newly created shapes.
         * @protected
         */
        Shapefile.prototype.addRenderablesForShapefile = function (layer) {
            if (this.shapeType === WorldWind.POINT) {
                this.addRenderablesForPoints(layer);
            } else if (this.shapeType === WorldWind.MULTI_POINT) {
                this.addRenderablesForMultiPoints(layer);
            } else if (this.shapeType === WorldWind.POLYLINE) {
                this.addRenderablesForPolylines(layer);
            } else if (this.shapeType === WorldWind.POLYGON) {
                this.addRenderablesForPolygons(layer);
            }
        };

        /**
         * Iterates over this shapefile's records and creates placemarks for the shapefile's point records.
         * This method may be overridden by subclasses to change the default behavior.
         * @param {Layer} layer The layer in which to place the newly created shapes.
         * @protected
         */
        Shapefile.prototype.addRenderablesForPoints = function (layer) {
        };

        /**
         * Iterates over this shapefile's records and creates placemarks for the shapefile's multi-point records.
         * This method may be overridden by subclasses to change the default behavior.
         * @param {Layer} layer The layer in which to place the newly created shapes.
         * @protected
         */
        Shapefile.prototype.addRenderablesForMultiPoints = function (layer) {
        };

        /**
         * Iterates over this shapefile's records and creates paths for the shapefile's polyline records.
         * This method may be overridden by subclasses to change the default behavior.
         * @param {Layer} layer The layer in which to place the newly created shapes.
         * @protected
         */
        Shapefile.prototype.addRenderablesForPolylines = function (layer) {
        };

        /**
         * Iterates over this shapefile's records and creates surface polygons or extruded polygons for the shapefile's
         * polygon records. If a shape record's attributes contain a non-zero field named "height", "Height" or
         * "HEIGHT" then [ExtrudedPolygons]{@link ExtrudedPolygon} are created, otherwise
         * [SurfacePolygons]{@link SurfacePolygon} are created. This method may be overridden by subclasses to change
         * the default behavior.
         * @param {Layer} layer The layer in which to place the newly created shapes.
         * @protected
         */
        Shapefile.prototype.addRenderablesForPolygons = function (layer) {
        };

        /**
         * Returns the next {@link ShapefileRecord} in the shapefile, or null if no more records exist. This method
         * can be used to iterate through the shapefile records. Only one such iteration is possible.
         *
         * @returns {ShapefileRecord} The next shapefile record in the shapefile, or null if no more records exist.
         */
        Shapefile.prototype.next = function () {
        };

        return Shapefile;
    })
;