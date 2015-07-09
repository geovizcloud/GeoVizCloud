/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports BingTiledImageLayer
 * @version $Id: BingTiledImageLayer.js 2889 2015-03-11 17:35:58Z tgaskins $
 */
define([
        '../geom/Angle',
        '../geom/Location',
        '../geom/Sector',
        '../layer/TiledImageLayer',
        '../geom/Vec2',
        '../util/WWMath',
        '../util/WWUtil'
    ],
    function (Angle,
              Location,
              Sector,
              TiledImageLayer,
              Vec2,
              WWMath,
              WWUtil) {
        "use strict";

        /**
         * Constructs a base Bing layer. This constructor is meant to be called only by subclasses.
         * @alias BingTiledImageLayer
         * @constructor
         * @augments TiledImageLayer
         * @classdesc Provides an abstract base layer for Bing imagery. This class is not intended to be constructed
         * independently but as a base layer for subclasses.
         * See {@link BingAerialLayer}, {@link BingAerialWithLabelsLayer} and {@link BingRoadsLayer}.
         *
         * @param {String} displayName This layer's display name.
         */
        var BingTiledImageLayer = function (displayName) {
            this.imageSize = 256;

            TiledImageLayer.call(this,
                new Sector(-85.05, 85.05, -180, 180), new Location(85.05, 180), 23, "image/jpeg", displayName,
                this.imageSize, this.imageSize);

            this.displayName = displayName;
            this.pickEnabled = false;
            this.detailHintOrigin = 2.6; // layer looks better at higher resolution

            // Create a canvas we can use when unprojecting retrieved images.
            this.destCanvas = document.createElement("canvas");
            this.destContext = this.destCanvas.getContext("2d");

            this.mapAncestorToTile = false;
            this.detectBlankImages = true;

            // These pixels are tested in retrieved images to determine whether the image is blank.
            this.testPixels = [
                new Vec2(20, 20),
                new Vec2(235, 20),
                new Vec2(20, 235),
                new Vec2(235, 235)
            ];

            //this.creditImage = WWUtil.currentUrlSansFilePart() + "/static/worldwind/images/powered-by-bing.png"
			this.creditImage = "/geoviz/static/worldwind/images/powered-by-bing.png"
        };

        BingTiledImageLayer.prototype = Object.create(TiledImageLayer.prototype);

        BingTiledImageLayer.prototype.doRender = function (dc) {
            TiledImageLayer.prototype.doRender.call(this, dc);
            if (this.inCurrentFrame) {
                dc.screenCreditController.addImageCredit(this.creditImage);
            }
        };

        // Overridden from TiledImageLayer.
        BingTiledImageLayer.prototype.createTopLevelTiles = function (dc) {
            this.topLevelTiles = [];

            this.topLevelTiles.push(this.createTile(null, this.levels.firstLevel(), 0, 0));
            this.topLevelTiles.push(this.createTile(null, this.levels.firstLevel(), 0, 1));
            this.topLevelTiles.push(this.createTile(null, this.levels.firstLevel(), 1, 0));
            this.topLevelTiles.push(this.createTile(null, this.levels.firstLevel(), 1, 1));
        };

        // Overridden from TiledImageLayer. Computes a tile's sector and creates the tile.
        // Unlike typical tiles, Bing tiles at the same level do not have the same sector size.
        BingTiledImageLayer.prototype.createTile = function (sector, level, row, column) {
            var mapSize = this.mapSizeForLevel(level.levelNumber),
                swX = WWMath.clamp(column * this.imageSize - 0.5, 0, mapSize),
                neY = WWMath.clamp(row * this.imageSize - 0.5, 0, mapSize),
                neX = WWMath.clamp(swX + (this.imageSize) + 0.5, 0, mapSize),
                swY = WWMath.clamp(neY + (this.imageSize) + 0.5, 0, mapSize),
                x, y, swLat, swLon, neLat, neLon;

            x = (swX / mapSize) - 0.5;
            y = 0.5 - (swY / mapSize);
            swLat = 90 - 360 * Math.atan(Math.exp(-y * 2 * Math.PI)) / Math.PI;
            swLon = 360 * x;

            x = (neX / mapSize) - 0.5;
            y = 0.5 - (neY / mapSize);
            neLat = 90 - 360 * Math.atan(Math.exp(-y * 2 * Math.PI)) / Math.PI;
            neLon = 360 * x;

            sector = new Sector(swLat, neLat, swLon, neLon);

            return TiledImageLayer.prototype.createTile.call(this, sector, level, row, column);
        };

        // Determines the Bing map size for a specified level number.
        BingTiledImageLayer.prototype.mapSizeForLevel = function (levelNumber) {
            return 256 << (levelNumber + 1);
        };

        // Overridden from TiledImageLayer to unproject the retrieved image prior to creating a texture for it.
        BingTiledImageLayer.prototype.createTexture = function (dc, tile, image) {
            var srcCanvas = dc.canvas2D,
                srcContext = dc.ctx2D,
                srcImageData,
                destCanvas = this.destCanvas,
                destContext = this.destContext,
                destImageData = destContext.createImageData(image.width, image.height),
                sector = tile.sector,
                tMin = WWMath.gudermannianInverse(sector.minLatitude),
                tMax = WWMath.gudermannianInverse(sector.maxLatitude),
                lat, g, srcRow, kSrc, kDest, sy, dy;

            srcCanvas.width = image.width;
            srcCanvas.height = image.height;
            destCanvas.width = image.width;
            destCanvas.height = image.height;

            // Draw the original image to a canvas so image data can be had for it.
            srcContext.drawImage(image, 0, 0, image.width, image.height);
            srcImageData = srcContext.getImageData(0, 0, image.width, image.height);

            // If it's a blank image, mark it as permanently absent.
            if (this.detectBlankImages && this.isBlankImage(image, srcImageData)) {
                this.absentResourceList.markResourceAbsentPermanently(tile.imagePath);
                return null;
            }

            // Unproject the retrieved image.
            for (var n = 0; n < 1; n++) {
                for (var y = 0; y < image.height; y++) {
                    sy = 1 - y / (image.height - 1);
                    lat = sy * sector.deltaLatitude() + sector.minLatitude;
                    g = WWMath.gudermannianInverse(lat);
                    dy = 1 - (g - tMin) / (tMax - tMin);
                    dy = WWMath.clamp(dy, 0, 1);
                    srcRow = Math.floor(dy * (image.height - 1));
                    for (var x = 0; x < image.width; x++) {
                        kSrc = 4 * (x + srcRow * image.width);
                        kDest = 4 * (x + y * image.width);

                        destImageData.data[kDest] = srcImageData.data[kSrc];
                        destImageData.data[kDest + 1] = srcImageData.data[kSrc + 1];
                        destImageData.data[kDest + 2] = srcImageData.data[kSrc + 2];
                        destImageData.data[kDest + 3] = srcImageData.data[kSrc + 3];
                    }
                }
            }

            destContext.putImageData(destImageData, 0, 0);

            return TiledImageLayer.prototype.createTexture.call(this, dc, tile, destCanvas);
        };

        // Determines whether a retrieved image is blank.
        BingTiledImageLayer.prototype.isBlankImage = function (image, srcImageData) {
            var pixel, k, pixelValue = null;

            for (var i = 0, len = this.testPixels.length; i < len; i++) {
                pixel = this.testPixels[i];
                k = 4 * (pixel[0] + pixel[1] * image.width);

                if (!pixelValue) {
                    pixelValue = [
                        srcImageData.data[k],
                        srcImageData.data[k + 1],
                        srcImageData.data[k + 2]
                    ];
                } else {
                    if (srcImageData.data[k] != pixelValue[0]
                        || srcImageData.data[k + 1] != pixelValue[1]
                        || srcImageData.data[k + 2] != pixelValue[2]) {
                        return false;
                    }
                }
            }

            return true;
        };

        return BingTiledImageLayer;
    }
)
;