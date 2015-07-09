/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports PinchRecognizer
 * @version $Id: PinchRecognizer.js 2808 2015-02-17 01:05:18Z dcollins $
 */
define(['../gesture/GestureRecognizer'],
    function (GestureRecognizer) {
        "use strict";

        /**
         * Constructs a pinch gesture recognizer.
         * @alias PinchRecognizer
         * @constructor
         * @classdesc A concrete gesture recognizer subclass that looks for two finger pinch gestures.
         */
        var PinchRecognizer = function (target) {
            GestureRecognizer.call(this, target);

            // Internal use only. Intentionally not documented.
            this._scale = 1;

            // Internal use only. Intentionally not documented.
            this._offsetScale = 1;

            // Internal use only. Intentionally not documented.
            this.referenceDistance = 0;

            // Internal use only. Intentionally not documented.
            this.threshold = 20;

            // Internal use only. Intentionally not documented.
            this.weight = 0.4;

            // Internal use only. Intentionally not documented.
            this.touchIds = [];
        };

        PinchRecognizer.prototype = Object.create(GestureRecognizer.prototype);

        Object.defineProperties(PinchRecognizer.prototype, {
            scale: {
                get: function () {
                    return this._scale * this._offsetScale;
                }
            }
        });

        /**
         * @param newState
         * @protected
         */
        PinchRecognizer.prototype.didTransitionToState = function (newState) {
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
        PinchRecognizer.prototype.reset = function () {
            GestureRecognizer.prototype.reset.call(this);

            this._scale = 1;
            this._offsetScale = 1;
            this.referenceDistance = 0;
            this.touchIds = [];
        };

        /**
         *
         * @param event
         * @protected
         */
        PinchRecognizer.prototype.mouseDown = function (event) {
            GestureRecognizer.prototype.mouseDown.call(this, event);

            if (this.state == WorldWind.POSSIBLE) {
                this.transitionToState(WorldWind.FAILED); // pinch does not recognize mouse input
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        PinchRecognizer.prototype.touchStart = function (event) {
            GestureRecognizer.prototype.touchStart.call(this, event);

            if (this.touchIds.length < 2) {
                for (var i = 0; i < event.changedTouches.length && this.touchIds.length < 2; i++) {
                    this.touchIds.push(event.changedTouches.item(i).identifier);
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
        PinchRecognizer.prototype.touchMove = function (event) {
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
        PinchRecognizer.prototype.touchEndOrCancel = function (event) {
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
        PinchRecognizer.prototype.touchesStarted = function () {
            var index0 = this.indexOfTouch(this.touchIds[0]),
                index1 = this.indexOfTouch(this.touchIds[1]);

            this.referenceDistance = this.touchDistance(index0, index1);
            this._offsetScale *= this._scale;
            this._scale = 1;
        };

        /**
         *
         * @returns {boolean}
         * @protected
         */
        PinchRecognizer.prototype.shouldRecognizeTouches = function () {
            var index0 = this.indexOfTouch(this.touchIds[0]),
                index1 = this.indexOfTouch(this.touchIds[1]),
                distance = this.touchDistance(index0, index1);

            return Math.abs(distance - this.referenceDistance) > this.threshold
        };

        /**
         * @protected
         */
        PinchRecognizer.prototype.gestureBegan = function () {
            var index0 = this.indexOfTouch(this.touchIds[0]),
                index1 = this.indexOfTouch(this.touchIds[1]);

            this.referenceDistance = this.touchDistance(index0, index1);
            this._scale = 1;
        };

        /**
         * @protected
         */
        PinchRecognizer.prototype.gestureChanged = function () {
            var index0 = this.indexOfTouch(this.touchIds[0]),
                index1 = this.indexOfTouch(this.touchIds[1]),
                distance = this.touchDistance(index0, index1),
                newScale = Math.abs(distance / this.referenceDistance),
                w = this.weight;

            this._scale = this._scale * (1 - w) + newScale * w;
        };

        /**
         *
         * @param indexA
         * @param indexB
         * @returns {number}
         * @protected
         */
        PinchRecognizer.prototype.touchDistance = function (indexA, indexB) {
            var pointA = this.touches[indexA].clientLocation,
                pointB = this.touches[indexB].clientLocation;
            return pointA.distanceTo(pointB);
        };

        return PinchRecognizer;
    });