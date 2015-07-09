/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports TiltRecognizer
 * @version $Id: TiltRecognizer.js 2709 2015-01-30 20:30:26Z dcollins $
 */
define([
        '../gesture/GestureRecognizer',
        '../gesture/PanRecognizer'
    ],
    function (GestureRecognizer,
              PanRecognizer) {
        "use strict";

        /**
         * Constructs a tilt gesture recognizer.
         * @alias TiltRecognizer
         * @constructor
         * @classdesc A concrete gesture recognizer subclass that looks for two finger tilt gestures.
         */
        var TiltRecognizer = function (target) {
            PanRecognizer.call(this, target);

            // Internal use only. Intentionally not documented.
            this.maximumTouchDistance = 250;

            // Internal use only. Intentionally not documented.
            this.maximumTouchDivergence = 50;
        };

        // Internal use only. Intentionally not documented.
        TiltRecognizer.LEFT = (1 << 0);

        // Internal use only. Intentionally not documented.
        TiltRecognizer.RIGHT = (1 << 1);

        // Internal use only. Intentionally not documented.
        TiltRecognizer.UP = (1 << 2);

        // Internal use only. Intentionally not documented.
        TiltRecognizer.DOWN = (1 << 3);

        TiltRecognizer.prototype = Object.create(PanRecognizer.prototype);

        /**
         *
         * @returns {boolean}
         * @protected
         */
        TiltRecognizer.prototype.shouldInterpret = function () {
            for (var i = 0, count = this.touches.length; i < count; i++) {
                var entry = this.touches[i],
                    distance = entry.clientLocation.distanceTo(entry.clientStartLocation);
                if (distance > this.threshold) {
                    return true; // interpret touches when any touch moves far enough
                }
            }

            return false;
        };

        /**
         *
         * @returns {boolean}
         * @protected
         */
        TiltRecognizer.prototype.shouldRecognize = function () {
            var touchCount = this.touchCount();
            if (touchCount != 2) {
                return false;
            }

            var touch0 = this.touches[0],
                touch1 = this.touches[1],
                distance = touch0.clientLocation.distanceTo(touch1.clientLocation),
                startDistance = touch0.clientStartLocation.distanceTo(touch1.clientStartLocation),
                divergence = Math.abs(distance - startDistance);
            if (startDistance > this.maximumTouchDistance || divergence > this.maximumTouchDivergence) {
                return false; // touches must be close together and be moving somewhat parallel
            }

            var verticalMask = TiltRecognizer.UP | TiltRecognizer.DOWN,
                dirMask0 = this.touchDirection(touch0) & verticalMask,
                dirMask1 = this.touchDirection(touch1) & verticalMask;
            return (dirMask0 & dirMask1) != 0; // touches must move in the same vertical direction
        };

        /**
         *
         * @param touch
         * @returns {number}
         * @protected
         */
        TiltRecognizer.prototype.touchDirection = function (touch) {
            var dx = touch.clientLocation[0] - touch.clientStartLocation[0],
                dy = touch.clientLocation[1] - touch.clientStartLocation[1],
                dirMask = 0;

            if (Math.abs(dx) > Math.abs(dy)) {
                dirMask |= (dx < 0 ? TiltRecognizer.LEFT : 0);
                dirMask |= (dx > 0 ? TiltRecognizer.RIGHT : 0);
            } else {
                dirMask |= (dy < 0 ? TiltRecognizer.UP : 0);
                dirMask |= (dy > 0 ? TiltRecognizer.DOWN : 0);
            }

            return dirMask;
        };

        return TiltRecognizer;
    });