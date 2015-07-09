/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports TapRecognizer
 * @version $Id: TapRecognizer.js 2858 2015-02-27 19:23:53Z tgaskins $
 */
define([
        '../gesture/GestureRecognizer',
        '../geom/Vec2'
    ],
    function (GestureRecognizer,
              Vec2) {
        "use strict";

        /**
         * Constructs a tap gesture recognizer.
         * @alias TapRecognizer
         * @constructor
         * @augments GestureRecognizer
         * @classdesc A concrete gesture recognizer subclass that looks for single or multiple taps.
         */
        var TapRecognizer = function (target) {
            GestureRecognizer.call(this, target);

            /**
             *
             * @type {number}
             */
            this.numberOfTaps = 1;

            /**
             *
             * @type {Number}
             */
            this.numberOfTouches = 1;

            // Internal use only. Intentionally not documented.
            this.threshold = 20;

            // Internal use only. Intentionally not documented.
            this.tapDuration = 500;

            // Internal use only. Intentionally not documented.
            this.tapInterval = 400;

            // Internal use only. Intentionally not documented.
            this.timeout = null;

            // Internal use only. Intentionally not documented.
            this.taps = [];
        };

        TapRecognizer.prototype = Object.create(GestureRecognizer.prototype);

        Object.defineProperties(TapRecognizer.prototype, {
            /**
             * Returns the X coordinate of this recognizer's tap location.
             * @type {Number}
             * @memberof TapRecognizer.prototype
             */
            clientX: {
                get: function () {
                    return this.taps[0].location[0];
                }
            },

            /**
             * Returns the Y coordinate of this recognizer's tap location.
             * @type {Number}
             * @memberof TapRecognizer.prototype
             */
            clientY: {
                get: function () {
                    return this.taps[0].location[1];
                }
            }
        });

        /**
         * @returns {Vec2}
         */
        TapRecognizer.prototype.location = function () {
            return this.taps.length > 0 ? this.taps[0].location : null;
        };

        /**
         *
         * @param state
         * @protected
         */
        TapRecognizer.prototype.didTransitionToState = function (state) {
            GestureRecognizer.prototype.didTransitionToState.call(this, state);

            var inTerminalState = GestureRecognizer.terminalStates.indexOf(this.state) != -1;
            if (inTerminalState) {
                this.cancelFailAfterDelay();
            }
        };

        /**
         * @protected
         */
        TapRecognizer.prototype.reset = function () {
            GestureRecognizer.prototype.reset.call(this);

            this.cancelFailAfterDelay();
            this.taps = [];
        };

        /**
         *
         * @param event
         * @protected
         */
        TapRecognizer.prototype.mouseDown = function (event) {
            GestureRecognizer.prototype.mouseDown.call(this, event);

            if (this.state == WorldWind.POSSIBLE) {
                this.transitionToState(WorldWind.FAILED); // tap does not recognize mouse input
            }
        };

        /**
         *
         * @param event
         */
        TapRecognizer.prototype.touchStart = function (event) {
            GestureRecognizer.prototype.touchStart.call(this, event);

            if (this.state != WorldWind.POSSIBLE) {
                return;
            }

            if (this.touchCount() > this.numberOfTouches) {
                this.transitionToState(WorldWind.FAILED);
            } else {
                if (this.touchCount() == event.changedTouches.length) { // first touches down
                    this.tapStart();
                } else {
                    this.tapChange();
                }
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        TapRecognizer.prototype.touchMove = function (event) {
            GestureRecognizer.prototype.touchMove.call(this, event);

            if (this.state != WorldWind.POSSIBLE) {
                return;
            }

            var translation = new Vec2(0, 0);
            translation.copy(this.clientLocation);
            translation.subtract(this.clientStartLocation);
            translation.add(this.touchCentroidShift);

            if (translation.magnitude() > this.threshold) {
                this.transitionToState(WorldWind.FAILED);
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        TapRecognizer.prototype.touchEnd = function (event) {
            GestureRecognizer.prototype.touchEnd.call(this, event);

            if (this.state != WorldWind.POSSIBLE) {
                return;
            }

            if (this.touchCount() == 0) { // last touches ended
                this.tapEnd();
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        TapRecognizer.prototype.touchCancel = function (event) {
            GestureRecognizer.prototype.touchCancel.call(this, event);

            if (this.state == WorldWind.POSSIBLE) {
                this.transitionToState(WorldWind.FAILED);
            }
        };

        /**
         *
         */
        TapRecognizer.prototype.tapStart = function () {
            var tap = {
                touchCount: this.touchCount(),
                location: new Vec2(this.clientLocation[0], this.clientLocation[1])
            };

            this.taps.push(tap);
            this.failAfterDelay(this.tapDuration); // fail if the tap takes too long
        };

        /**
         * @protected
         */
        TapRecognizer.prototype.tapChange = function () {
            var tap = this.taps[this.taps.length - 1];
            if (tap.touchCount < this.touchCount()) {
                tap.touchCount = this.touchCount(); // max number of simultaneous touches
                tap.location.copy(this.clientLocation); // touch centroid
            }
        };

        /**
         * @protected
         */
        TapRecognizer.prototype.tapEnd = function () {
            var tapCount = this.taps.length,
                tap = this.taps[tapCount - 1];

            if (tap.touchCount != this.numberOfTouches) {
                this.transitionToState(WorldWind.FAILED);
            } else if (tapCount == this.numberOfTaps) {
                this.transitionToState(WorldWind.RECOGNIZED);
            } else {
                this.failAfterDelay(this.tapInterval); // fail if another tap doesn't start soon enough
            }
        };

        /**
         * @protected
         */
        TapRecognizer.prototype.failAfterDelay = function (delay) {
            var self = this;
            if (self.timeout) {
                window.clearTimeout(self.timeout);
            }

            self.timeout = window.setTimeout(function() {
                self.timeout = null;
                self.transitionToState(WorldWind.FAILED);
            }, delay);
        };

        /**
         * @protected
         */
        TapRecognizer.prototype.cancelFailAfterDelay = function () {
            var self = this;
            if (self.timeout) {
                window.clearTimeout(self.timeout);
                self.timeout = null;
            }
        };

        return TapRecognizer;
    });
