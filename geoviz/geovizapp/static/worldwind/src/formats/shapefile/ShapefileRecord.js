/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports ShapefileRecord
 * @version $Id: ShapefileRecord.js 2896 2015-03-13 00:23:38Z tgaskins $
 */
define([
        '../../error/ArgumentError',
        '../../util/Logger'
    ],
    function (ArgumentError,
              Logger) {
        "use strict";

        /**
         * Constructs a shapefile record. Applications typically do not call this constructor. It is called by
         * {@link Shapefile} as shapefile records are read.
         * @alias ShapefileRecord
         * @constructor
         * @classdesc Contains the data associated with a shapefile record.
         * @param {Shapefile} shapefile The shapefile containing this record.
         * @param {Float64Array} pointBuffer An array containing this records points.
         * @throws {ArgumentError} If either the specified shapefile or point buffer are null or undefined.
         */
        var ShapefileRecord = function (shapefile, pointBuffer) {
            if (!shapefile) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ShapefileRecord", "constructor",
                        "The specified shapefile is null or undefined"));
            }

            if (!pointBuffer) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ShapefileRecord", "constructor",
                        "The specified point buffer is null or undefined"));
            }

            // All these are documented in their property definition below. All but the shapefile and point buffer
            // are determined when the record is read by this class.
            this._shapefile = shapefile;
            this._recordNumber = -1;
            this._attributes = {};
            this._numberOfParts = 0;
            this._firstPartNumber = 0;
            this._lastPartNumber = 0;
            this._numberOfPoints = 0;
            this._pointBuffer = pointBuffer;
            this._boundingRectangle = [];
            this._zRange = null;
            this._zValues = null;
            this._mRange = null;
            this._mValues = null;
        };

        Object.defineProperties(ShapefileRecord.prototype, {
            /**
             * The shapefile containing this record.
             * @memberof ShapefileRecord.prototype
             * @type {Shapefile}
             * @readonly
             */
            shapefile: {
                get: function () {
                    return this._shapefile;
                }
            },

            /**
             * This record's ordinal position in the shapefile. 0 indicates the first record in the shapefile.
             * @memberof ShapefileRecord.prototype
             * @type {Number}
             * @readonly
             */
            recordNumber: {
                get: function () {
                    return this._recordNumber;
                }
            },

            /**
             * The attributes associated with this record, as read from the attribute file associated with the
             * shapefile. Empty if there are no attributes associated with this record or with the shapefile.
             * @memberof ShapefileRecord.prototype
             * @type {Object}
             * @readonly
             */
            attributes: {
                get: function () {
                    return this._attributes;
                }
            },

            /**
             * The number of parts in the shapefile.
             * @memberof ShapefileRecord.prototype
             * @type {Number}
             * @readonly
             */
            numberOfParts: {
                get: function () {
                    return this._numberOfParts;
                }
            },

            /**
             * The first part number in the record.
             * @memberof ShapefileRecord.prototype
             * @type {Number}
             * @readonly
             */
            firstPartNumber: {
                get: function () {
                    return this._firstPartNumber;
                }
            },

            /**
             * The last part number in the record.
             * @memberof ShapefileRecord.prototype
             * @type {Number}
             * @readonly
             */
            lastPartNumber: {
                get: function () {
                    return this._lastPartNumber;
                }
            },

            /**
             * The number of points in the record.
             * @memberof ShapefileRecord.prototype
             * @type {Number}
             * @readonly
             */
            numberOfPoints: {
                get: function () {
                    return this._numberOfPoints;
                }
            },

            /**
             * A four-element array containing this record's bounding rectangle, or null if this record has no
             * bounding rectangle. The returned array is ordered as follows: minimum Y, maximum Y, minimum X,
             * maximum X. If the shapefile's coordinate system is geographic then the elements can be interpreted
             * as angular degrees in the order minimum latitude, maximum latitude, minimum longitude, maximum
             * longitude.
             * @memberof ShapefileRecord.prototype
             * @type {Number[]}
             * @readonly
             */
            boundingRectangle: {
                get: function () {
                    return this._boundingRectangle;
                }
            },

            /**
             * The record's Z range if the shapefile's shape type is a Z type, otherwise null.
             * @memberof ShapefileRecord.prototype
             * @type {Number[]}
             * @readonly
             */
            zRange: {
                get: function () {
                    return this._zRange;
                }
            },

            /**
             * The record's Z values if the shapefile's shape type is a Z type, otherwise null.
             * @memberof ShapefileRecord.prototype
             * @type {Number[]}
             * @readonly
             */
            zValues: {
                get: function () {
                    return this._zValues;
                }
            },

            /**
             * The record's M range if the shapefile's shape type is an M type, otherwise null.
             * @memberof ShapefileRecord.prototype
             * @type {Number[]}
             * @readonly
             */
            mRange: {
                get: function () {
                    return this._mRange;
                }
            },

            /**
             * The record's M values if the shapefile's shape type is an M type, otherwise null.
             * @memberof ShapefileRecord.prototype
             * @type {Number[]}
             * @readonly
             */
            mValues: {
                get: function () {
                    return this._mValues;
                }
            }
        });

        /**
         * Returns the points of a specified part of this record.
         * @param {Number} partNumber The part number of interest. The range of part numbers can be determined via
         * [firstPartNumber]{@link ShapefileRecord#firstPartNumber} and
         * [lastPartNumber]{@link ShapefileRecord#lastPartNumber}.
         * @returns {Float64Array} The part's points in the order X0, Y0, X1, Y1, ..., Xn, Yn, where n is the number
         * of points in the part minus one. Returns null if the specified part does not exist.
         */
        ShapefileRecord.prototype.pointBuffer = function (partNumber) {
        };

        return ShapefileRecord;
    })
;