/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports RotationRecognizer
 * @version $Id: RotationRecognizer.js 2808 2015-02-17 01:05:18Z dcollins $
 */
define([
        '../geom/Angle',
        '../gesture/GestureRecognizer'
    ],
    function (Angle,
              GestureRecognizer) {
        "use strict";

        /**
         * Constructs a rotation gesture recognizer.
         * @alias RotationRecognizer
         * @constructor
         * @classdesc A concrete gesture recognizer subclass that looks for two finger rotation gestures.
         */
        var RotationRecognizer = function (target) {
            GestureRecognizer.call(this, target);

            // Internal use only. Intentionally not documented.
            this._rotation = 0;

            // Internal use only. Intentionally not documented.
            this._offsetRotation = 0;

            // Internal use only. Intentionally not documented.
            this.referenceAngle = 0;

            // Internal use only. Intentionally not documented.
            this.threshold = 20;

            // Internal use only. Intentionally not documented.
            this.weight = 0.4;

            // Internal use only. Intentionally not documented.
            this.touchIds = [];
        };

        RotationRecognizer.prototype = Object.create(GestureRecognizer.prototype);

        Object.defineProperties(RotationRecognizer.prototype, {
            rotation: {
                get: function () {
                    return this._rotation + this._offsetRotation;
                }
            }
        });

        /**
         * @param newState
         * @protected
         */
        RotationRecognizer.prototype.didTransitionToState = function (newState) {
            GestureRecognizer.prototype.didTransitionToState.call(this, newState);

            if (newState == WorldWind.BEGAN) {
                this.gestureBegan();
            } else if (newState == WorldWind.CHANGED) {
                this.gestureChanged();
            }
        };

        /**
         * @protected
         */
        RotationRecognizer.prototype.reset = function () {
            GestureRecognizer.prototype.reset.call(this);

            this._rotation = 0;
            this._offsetRotation = 0;
            this.referenceAngle = 0;
            this.touchIds = [];
        };

        /**
         *
         * @param event
         * @protected
         */
        RotationRecognizer.prototype.mouseDown = function (event) {
            GestureRecognizer.prototype.mouseDown.call(this, event);

            if (this.state == WorldWind.POSSIBLE) {
                this.transitionToState(WorldWind.FAILED); // rotation does not recognize mouse input
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        RotationRecognizer.prototype.touchStart = function (event) {
            GestureRecognizer.prototype.touchStart.call(this, event);

            if (this.touchIds.length < 2) {
                for (var i = 0; i < event.changedTouches.length && this.touchIds.length < 2; i++) {
                    var touch = event.changedTouches.item(i);
                    this.touchIds.push(touch.identifier);
                }

                if (this.touchIds.length == 2) {
                    this.touchesStarted();
                }
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        RotationRecognizer.prototype.touchMove = function (event) {
            GestureRecognizer.prototype.touchMove.call(this, event);

            if (this.touchIds.length == 2) {
                if (this.state == WorldWind.POSSIBLE) {
                    if (this.shouldRecognizeTouches()) {
                        this.transitionToState(WorldWind.BEGAN);
                    }
                } else if (this.state == WorldWind.BEGAN || this.state == WorldWind.CHANGED) {
                    this.transitionToState(WorldWind.CHANGED);
                }
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        RotationRecognizer.prototype.touchEndOrCancel = function (event) {
            GestureRecognizer.prototype.touchEndOrCancel.call(this, event);

            // Remove touch identifier entries for the touches that ended or cancelled.
            for (var i = 0, count = event.changedTouches.length; i < count; i++) {
                var touch = event.changedTouches.item(i),
                    index = this.touchIds.indexOf(touch.identifier);
                if (index != -1) {
                    this.touchIds.splice(index, 1);
                }
            }

            if (event.targetTouches.length == 0) { // last touches ended
                if (this.state == WorldWind.BEGAN || this.state == WorldWind.CHANGED) {
                    this.transitionToState(event.type == "touchend" ? WorldWind.ENDED : WorldWind.CANCELLED);
                }
            }
        };

        /**
         * @protected
         */
        RotationRecognizer.prototype.touchesStarted = function () {
            var index0 = this.indexOfTouch(this.touchIds[0]),
                index1 = this.indexOfTouch(this.touchIds[1]);

            this.referenceAngle = this.touchAngle(index0, index1);
            this._offsetRotation += this._rotation;
            this._rotation = 0;
        };

        /**
         *
         * @returns {boolean}
         * @protected
         */
        RotationRecognizer.prototype.shouldRecognizeTouches = function () {
            var index0 = this.indexOfTouch(this.touchIds[0]),
                index1 = this.indexOfTouch(this.touchIds[1]),
                angle = this.touchAngle(index0, index1),
                rotation = Angle.normalizedDegrees(angle - this.referenceAngle);

            return Math.abs(rotation) > this.threshold;
        };

        /**
         *
         */
        RotationRecognizer.prototype.gestureBegan = function () {
            var index0 = this.indexOfTouch(this.touchIds[0]),
                index1 = this.indexOfTouch(this.touchIds[1]);

            this.referenceAngle = this.touchAngle(index0, index1);
            this._rotation = 0;
        };

        /**
         *
         * @protected
         */
        RotationRecognizer.prototype.gestureChanged = function () {
            var index0 = this.indexOfTouch(this.touchIds[0]),
                index1 = this.indexOfTouch(this.touchIds[1]),
                angle = this.touchAngle(index0, index1),
                newRotation = Angle.normalizedDegrees(angle - this.referenceAngle),
                w = this.weight;

            this._rotation = this._rotation * (1 - w) + newRotation * w;
        };

        /**
         *
         * @param index0
         * @param index1
         * @returns {number}
         * @protected
         */
        RotationRecognizer.prototype.touchAngle = function (index0, index1) {
            var point0 = this.touches[index0].clientLocation,
                point1 = this.touches[index1].clientLocation,
                dx = point0[0] - point1[0],
                dy = point0[1] - point1[1];

            return Math.atan2(dy, dx) * Angle.RADIANS_TO_DEGREES;
        };

        return RotationRecognizer;
    });
