/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports SurfacePolygon
 * @version $Id: SurfacePolygon.js 3014 2015-04-14 01:06:17Z danm $
 */
define([
        '../error/ArgumentError',
        '../util/Logger',
        '../shapes/ShapeAttributes',
        '../shapes/SurfaceShape'
    ],
    function (ArgumentError,
              Logger,
              ShapeAttributes,
              SurfaceShape) {
        "use strict";

        /**
         * Constructs a surface polygon.
         * @alias SurfacePolygon
         * @constructor
         * @augments SurfaceShape
         * @classdesc Represents a polygon draped over the terrain surface. The polygon may have multiple boundaries in
         * order to define holes or empty regions.
         * <p>
         * SurfacePolygon uses the following attributes from its associated shape attributes bundle:
         * <ul>
         *         <li>Draw interior</li>
         *         <li>Draw outline</li>
         *         <li>Interior color</li>
         *         <li>Outline color</li>
         *         <li>Outline width</li>
         *         <li>Outline stipple factor</li>
         *         <li>Outline stipple pattern</li>
         * </ul>
         * @param {Array} boundaries The polygons boundary locations. If this argument is an array of
         * [Locations]{@link Location} they define this polygons outer boundary. If it is an array of arrays of
         * Locations then each internal array defines one of this polygon's boundaries.
         * @param {ShapeAttributes} attributes The attributes to apply to this shape. May be null, in which case
         * attributes must be set directly before the shape is drawn.
         * @throws {ArgumentError} If the specified boundaries are null or undefined.
         */
        var SurfacePolygon = function (boundaries, attributes) {
            if (!boundaries) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "SurfacePolygon", "constructor",
                        "The specified boundary array is null or undefined."));
            }

            SurfaceShape.call(this, attributes);

            /**
             * This shape's boundaries, specified as an array locations if the polygon has a single boundary, or
             * an array of arrays of locations if the polygon has multiple boundaries.
             * @type {Array}
             */
            this._boundaries = boundaries;
        };

        SurfacePolygon.prototype = Object.create(SurfaceShape.prototype);

        // Internal use only. Intentionally not documented.
        SurfacePolygon.staticStateKey = function(shape) {
            var shapeStateKey = SurfaceShape.staticStateKey(shape);

            return shapeStateKey;
        };

        // Internal use only. Intentionally not documented.
        SurfacePolygon.prototype.computeStateKey = function() {
            return SurfacePolygon.staticStateKey(this);
        };

        return SurfacePolygon;
    });