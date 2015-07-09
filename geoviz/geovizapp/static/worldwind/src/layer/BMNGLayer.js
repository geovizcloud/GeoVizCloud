/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports BMNGLayer
 * @version $Id: BMNGLayer.js 2939 2015-03-30 16:50:49Z tgaskins $
 */
define([
        '../geom/Location',
        '../geom/Sector',
        '../layer/TiledImageLayer',
        '../util/WmsUrlBuilder'
    ],
    function (Location,
              Sector,
              TiledImageLayer,
              WmsUrlBuilder) {
        "use strict";

        /**
         * Constructs a Blue Marble image layer.
         * @alias BMNGLayer
         * @constructor
         * @augments TiledImageLayer
         * @classdesc Displays a Blue Marble image layer that spans the entire globe.
         */
        var BMNGLayer = function () {
            TiledImageLayer.call(this,
                Sector.FULL_SPHERE, new Location(45, 45), 5, "image/jpeg", "BMNG256", 256, 256);

            this.displayName = "Blue Marble";
            this.pickEnabled = false;

            this.urlBuilder = new WmsUrlBuilder("http://worldwind25.arc.nasa.gov/wms",
                "BlueMarble-200405", "", "1.3.0");
        };

        BMNGLayer.prototype = Object.create(TiledImageLayer.prototype);

        return BMNGLayer;
    });