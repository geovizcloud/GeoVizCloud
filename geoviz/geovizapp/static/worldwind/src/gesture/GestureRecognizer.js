/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports GestureRecognizer
 * @version $Id: GestureRecognizer.js 2772 2015-02-10 22:00:36Z dcollins $
 */
define([
        '../error/ArgumentError',
        '../util/Logger',
        '../geom/Vec2'
    ],
    function (ArgumentError,
              Logger,
              Vec2) {
        "use strict";

        /**
         * Constructs a base gesture recognizer. This is an abstract base class and not intended to be instantiated
         * directly.
         * @alias GestureRecognizer
         * @constructor
         * @classdesc Provides an abstract base class for gesture recognizers.
         */
        var GestureRecognizer = function (target) {
            if (!target) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "GestureRecognizer", "constructor", "missingTarget"));
            }

            /**
             * @readonly
             */
            this.target = target;

            /**
             * @readonly
             */
            this.state = WorldWind.POSSIBLE;

            /**
             *
             * @type {boolean}
             */
            this.enabled = true;

            // Internal use only. Intentionally not documented.
            this.listeners = [];

            // Internal use only. Intentionally not documented.
            this.recognizeWithList = [];

            // Internal use only. Intentionally not documented.
            this.dependancies = [];

            // Internal use only. Intentionally not documented.
            this.dependants = [];

            // Internal use only. Intentionally not documented.
            this.pendingState = -1;

            // Internal use only. Intentionally not documented.
            this.buttonMask = 0;

            // Internal use only. Intentionally not documented.
            this.touches = [];

            // Internal use only. Intentionally not documented.
            this.clientLocation = new Vec2(0, 0);

            // Internal use only. Intentionally not documented.
            this.clientStartLocation = new Vec2(0, 0);

            // Internal use only. Intentionally not documented.
            this.touchCentroidShift = new Vec2(0, 0);

            if (!GestureRecognizer.listenerStates) {
                GestureRecognizer.listenerStates = [WorldWind.BEGAN, WorldWind.CHANGED, WorldWind.ENDED,
                    WorldWind.RECOGNIZED];
            }

            if (!GestureRecognizer.dependantStates) {
                GestureRecognizer.dependantStates = [WorldWind.BEGAN, WorldWind.FAILED, WorldWind.RECOGNIZED];
            }

            if (!GestureRecognizer.terminalStates) {
                GestureRecognizer.terminalStates = [WorldWind.ENDED, WorldWind.CANCELLED, WorldWind.FAILED,
                    WorldWind.RECOGNIZED]
            }

            GestureRecognizer.registerMouseEventListeners(this);
            GestureRecognizer.registerTouchEventListeners(this);
        };

        // Internal use only. Intentionally not documented.
        GestureRecognizer.recognizedGestures = [];

        // Internal use only. Intentionally not documented.
        GestureRecognizer.listenerStates = null;

        // Internal use only. Intentionally not documented.
        GestureRecognizer.dependantStates = null;

        // Internal use only. Intentionally not documented.
        GestureRecognizer.terminalStates = null;

        /**
         * @returns {Vec2}
         */
        GestureRecognizer.prototype.location = function () {
            return this.clientLocation;
        };

        /**
         *
         * @returns {Number}
         */
        GestureRecognizer.prototype.touchCount = function () {
            return this.touches.length;
        };

        /**
         *
         * @param index
         * @returns {Vec2}
         */
        GestureRecognizer.prototype.touchLocation = function (index) {
            if (index < 0 || index >= this.touches.length) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "GestureRecognizer", "touchLocation",
                        "indexOutOfRange"));
            }

            return this.touches[index].clientLocation;
        };

        /**
         *
         * @param listener
         */
        GestureRecognizer.prototype.addGestureListener = function (listener) {
            if (!listener) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "GestureRecognizer", "addGestureListener",
                        "missingListener"));
            }

            if (typeof listener != "function") {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "GestureRecognizer", "addGestureListener",
                        "The specified listener is not a function."));
            }

            this.listeners.push(listener);
        };

        /**
         *
         * @param listener
         */
        GestureRecognizer.prototype.removeGestureListener = function (listener) {
            if (!listener) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "GestureRecognizer", "removeGestureListener",
                        "missingListener"));
            }

            var index = this.listeners.indexOf(listener);
            if (index != -1) {
                this.listeners.splice(index, 1);
            }
        };

        //noinspection JSUnusedLocalSymbols
        /**
         * @param newState
         * @protected
         */
        GestureRecognizer.prototype.notifyGestureListeners = function (newState) {
            for (var i = 0, count = this.listeners.length; i < count; i++) {
                var entry = this.listeners[i];
                entry.call(entry, this);
            }
        };

        /**
         *
         * @param gestureRecognizer
         */
        GestureRecognizer.prototype.recognizeWith = function (gestureRecognizer) {
            if (!gestureRecognizer) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "GestureRecognizer", "recognizeWith",
                        "The specified gesture recognizer is null or undefined."));
            }

            this.recognizeWithList.push(gestureRecognizer);
        };

        /**
         *
         * @param gestureRecognizer
         * @returns {boolean}
         */
        GestureRecognizer.prototype.canRecognizeWith = function (gestureRecognizer) {
            var index = this.recognizeWithList.indexOf(gestureRecognizer);
            return index != -1;
        };

        /**
         *
         * @param gestureRecognizer
         */
        GestureRecognizer.prototype.requireFailure = function (gestureRecognizer) {
            if (!gestureRecognizer) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "GestureRecognizer", "requireFailure",
                        "The specified gesture recognizer is null or undefined"));
            }

            // Keep track of the dependancy relationships between gesture recognizers.
            this.dependancies.push(gestureRecognizer);
            gestureRecognizer.dependants.push(this);
        };

        /**
         * @param newState
         * @protected
         */
        GestureRecognizer.prototype.notifyDependants = function (newState) {
            for (var i = 0, count = this.dependants.length; i < count; i++) {
                var entry = this.dependants[i],
                    pendingState = entry.pendingState;

                if (newState == WorldWind.RECOGNIZED || newState == WorldWind.BEGAN) {
                    entry.transitionToState(WorldWind.FAILED);
                } else if (newState == WorldWind.FAILED) {
                    if (pendingState != -1) {
                        entry.pendingState = -1; // pending state may be written to in transitionToState
                        entry.transitionToState(pendingState); // attempt to transition to the pending state
                    }
                }
            }
        };

        /**
         *
         * @param newState
         * @protected
         */
        GestureRecognizer.prototype.transitionToState = function (newState) {
            if (!this.willTransitionToState(newState)) {
                return; // gestures may be prevented from transitioning to the began state
            }

            this.state = newState;

            this.didTransitionToState(newState);
        };

        /**
         *
         * @param newState
         * @returns {boolean}
         * @protected
         */
        GestureRecognizer.prototype.willTransitionToState = function (newState) {
            var recognized = GestureRecognizer.recognizedGestures,
                i, count;

            if (newState == WorldWind.RECOGNIZED || newState == WorldWind.BEGAN) {
                for (i = 0, count = recognized.length; i < count; i++) {
                    if (!recognized[i].canRecognizeWith(this)) {
                        return false; // unable to recognize simultaneously with currently recognized gesture
                    }
                }

                for (i = 0, count = this.dependancies.length; i < count; i++) {
                    if (this.dependancies[i].state != WorldWind.FAILED) {
                        this.pendingState = newState;
                        return false; // waiting for other gesture to fail
                    }
                }
            }

            return true;
        };

        /**
         *
         * @param newState
         * @protected
         */
        GestureRecognizer.prototype.didTransitionToState = function (newState) {
            // Keep track of the continuous gestures that are currently in a recognized state.
            var recognized = GestureRecognizer.recognizedGestures,
                index = recognized.indexOf(this);
            if (newState == WorldWind.BEGAN) {
                if (index == -1) {
                    recognized.push(this);
                }
            } else if (newState == WorldWind.ENDED || newState == WorldWind.CANCELLED) {
                if (index != -1) {
                    recognized.splice(index, 1);
                }
            }

            // Notify listeners of the state transition when the new state is began, changed, ended or recognized.
            var notifyListeners = GestureRecognizer.listenerStates.indexOf(newState) != -1;
            if (notifyListeners) {
                this.notifyGestureListeners(newState);
            }

            // Notify dependants of the state transition when the new state is began or recognized.
            var notifyDependants = GestureRecognizer.dependantStates.indexOf(newState) != -1;
            if (notifyDependants) {
                this.notifyDependants(newState);
            }

            // TODO Modify GestureRecognizer and all concrete subclasses to reset and transition to the possible state
            // TODO upon transitioning to any terminal state, regardless of the input state. That change makes
            // TODO GestureRecognizer more flexible, and eliminates the need for resetting in multiple places.
            // TODO See didHandleMouseEvent and didHandleTouchEvent.
            // Reset the gesture and transition to the possible state when the all input is done and the gesture is in a
            // terminal state: recognized/ended, cancelled, or failed.
            var inTerminalState = GestureRecognizer.terminalStates.indexOf(this.state) != -1;
            if (inTerminalState && this.buttonMask == 0 && this.touchCount() == 0) {
                this.reset();
                this.transitionToState(WorldWind.POSSIBLE);
            }
        };

        /**
         * @protected
         */
        GestureRecognizer.prototype.reset = function () {
            this.pendingState = -1;
            this.buttonMask = 0;
            this.touches = [];
            this.clientLocation.set(0, 0);
            this.clientStartLocation.set(0, 0);
            this.touchCentroidShift.set(0, 0);
        };

        /**
         *
         * @param recognizer
         * @protected
         */
        GestureRecognizer.registerMouseEventListeners = function (recognizer) {
            if (!recognizer) {
                throw new ArgumentError(
                    Logger.getMessage(Logger.LEVEL_SEVERE, "GestureRecognizer", "registerMouseEventListeners",
                        "The specified recognizer is null or undefined"));
            }

            // Register a mouse down listener on the event target and mouse move/up listeners on the global window.
            // Mouse drags started on the target do not generate move and up events outside of the target's bounds. We
            // listen to the window for those events in order to capture mouse dragging that starts on the target but
            // moves outside it or ends outside it. Mouse move and mouse up events are ignored unless they correspond to
            // a mouse down that occurred on the target.
            var eventListener = function (event) {
                recognizer.handleMouseEvent(event);
                recognizer.didHandleMouseEvent(event);
            };
            recognizer.target.addEventListener("mousedown", eventListener, false);
            window.addEventListener("mousemove", eventListener, false);
            window.addEventListener("mouseup", eventListener, false);
        };

        /**
         *
         * @param event
         * @protected
         */
        GestureRecognizer.prototype.handleMouseEvent = function (event) {
            var buttonBit = (1 << event.button);

            if (!this.enabled) {
                return;
            }

            if (this.touches.length > 0) {
                return; // ignore mouse events when touches are active
            }

            if (event.defaultPrevented && this.state == WorldWind.POSSIBLE) {
                return; // ignore cancelled events while in the possible state
            }

            if (event.type == "mousedown") {
                if ((this.buttonMask & buttonBit) == 0) {
                    this.buttonMask |= buttonBit;
                    this.mouseDown(event);
                }
            } else if (event.type == "mousemove") {
                if (this.buttonMask != 0) {
                    this.mouseMove(event);
                }
            } else if (event.type == "mouseup") {
                if ((this.buttonMask & buttonBit) != 0) {
                    this.buttonMask &= ~buttonBit;
                    this.mouseUp(event);
                }
            } else {
                Logger.logMessage(Logger.LEVEL_WARNING, "GestureRecognizer", "handleMouseEvent",
                    "Unrecognized event type: " + event.type);
            }
        };

        //noinspection JSUnusedLocalSymbols
        /**
         *
         * @param event
         * @protected
         */
        GestureRecognizer.prototype.didHandleMouseEvent = function (event) {
            if (!this.enabled) {
                return;
            }

            if (this.touches.length > 0) {
                return; // ignore mouse events when touches are active
            }

            // Reset the gesture and transition to the possible state when the all mouse buttons are up and the
            // gesture is in a terminal state: recognized/ended, cancelled, or failed.
            var inTerminalState = GestureRecognizer.terminalStates.indexOf(this.state) != -1;
            if (inTerminalState && this.buttonMask == 0) {
                this.reset();
                this.transitionToState(WorldWind.POSSIBLE);
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        GestureRecognizer.prototype.mouseDown = function (event) {
            var buttonBit = (1 << event.button);
            if (buttonBit == this.buttonMask) { // first button down
                this.clientLocation.set(event.clientX, event.clientY);
                this.clientStartLocation.set(event.clientX, event.clientY);
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        GestureRecognizer.prototype.mouseMove = function (event) {
            this.clientLocation.set(event.clientX, event.clientY);
        };

        /**
         *
         * @param event
         * @protected
         */
        GestureRecognizer.prototype.mouseUp = function (event) {
        };

        /**
         *
         * @param recognizer
         * @protected
         */
        GestureRecognizer.registerTouchEventListeners = function (recognizer) {
            if (!recognizer) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "GestureRecognizer", "registerTouchEventListeners",
                        "The specified recognizer is null or undefined"));
            }

            // Register touch event listeners on the specified target. Touches started on the target generate touch move
            // and touch end events outside of the target's bounds.
            var eventListener = function (event) {
                recognizer.handleTouchEvent(event);
                recognizer.didHandleTouchEvent(event);
            };
            recognizer.target.addEventListener("touchstart", eventListener, false);
            recognizer.target.addEventListener("touchmove", eventListener, false);
            recognizer.target.addEventListener("touchend", eventListener, false);
            recognizer.target.addEventListener("touchcancel", eventListener, false);
        };

        /**
         *
         * @param event
         * @protected
         */
        GestureRecognizer.prototype.handleTouchEvent = function (event) {
            if (!this.enabled) {
                return;
            }

            if (event.defaultPrevented && this.state == WorldWind.POSSIBLE) {
                return; // ignore cancelled events while in the possible state
            }

            if (event.type == "touchstart") {
                this.touchStart(event);
            } else if (event.type == "touchmove") {
                this.touchMove(event);
            } else if (event.type == "touchend") {
                this.touchEnd(event);
            } else if (event.type == "touchcancel") {
                this.touchCancel(event);
            } else {
                Logger.logMessage(Logger.LEVEL_WARNING, "GestureRecognizer", "handleTouchEvent",
                    "Unrecognized event type: " + event.type);
            }
        };

        //noinspection JSUnusedLocalSymbols
        /**
         *
         * @param event
         * @protected
         */
        GestureRecognizer.prototype.didHandleTouchEvent = function (event) {
            if (!this.enabled) {
                return;
            }

            // Reset the gesture and transition to the possible state when the touches have ended/cancelled and the
            // gesture is in a terminal state: recognized/ended, cancelled, or failed.
            var inTerminalState = GestureRecognizer.terminalStates.indexOf(this.state) != -1;
            if (inTerminalState && this.touchCount() == 0) {
                this.reset();
                this.transitionToState(WorldWind.POSSIBLE);
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        GestureRecognizer.prototype.touchStart = function (event) {
            // Append touch list entries for touches that started.
            for (var i = 0, count = event.changedTouches.length; i < count; i++) {
                var touch = event.changedTouches.item(i),
                    entry = {
                        identifier: touch.identifier,
                        clientLocation: new Vec2(touch.clientX, touch.clientY),
                        clientStartLocation: new Vec2(touch.clientX, touch.clientY)
                    };
                this.touches.push(entry);
            }

            // Update the location and centroid shift to account for touches that started. When the first touch starts
            // the centroid shift is zero. When subsequent touches start the centroid shift is incremented by the
            // difference between the previous centroid and the current centroid.
            if (event.targetTouches.length == event.changedTouches.length) {
                this.touchCentroid(this.clientLocation);
                this.touchCentroidShift.set(0, 0);
                this.clientStartLocation.copy(this.clientLocation);
            } else {
                this.touchCentroidShift.add(this.clientLocation);
                this.touchCentroid(this.clientLocation);
                this.touchCentroidShift.subtract(this.clientLocation);
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        GestureRecognizer.prototype.touchMove = function (event) {
            // Update the touch list entries for touches that moved.
            for (var i = 0, count = event.changedTouches.length; i < count; i++) {
                var touch = event.changedTouches.item(i),
                    index = this.indexOfTouch(touch.identifier),
                    entry;
                if (index != -1) {
                    entry = this.touches[index];
                    entry.clientLocation.set(touch.clientX, touch.clientY);
                }
            }

            // Update the touch centroid to account for touches that moved.
            this.touchCentroid(this.clientLocation);
        };

        /**
         *
         * @param event
         * @protected
         */
        GestureRecognizer.prototype.touchEnd = function (event) {
            // Remove touch list entries for touches that ended.
            this.touchEndOrCancel(event);
        };

        /**
         *
         * @param event
         * @protected
         */
        GestureRecognizer.prototype.touchCancel = function (event) {
            // Remove touch list entries for cancelled touches.
            this.touchEndOrCancel(event);
        };

        /**
         *
         * @param event
         * @protected
         */
        GestureRecognizer.prototype.touchEndOrCancel = function (event) {
            // Remove touch list entries for ended or cancelled touches.
            for (var i = 0, count = event.changedTouches.length; i < count; i++) {
                var touch = event.changedTouches.item(i).identifier,
                    index = this.indexOfTouch(touch);
                if (index != -1) {
                    this.touches.splice(index, 1);
                }
            }

            // Update the touch centroid to account for ended or cancelled touches. When the last touch ends the
            // centroid shift is zero. When subsequent touches end the centroid shift is incremented by the difference
            // between the previous centroid and the current centroid.
            if (event.targetTouches.length == 0) {
                this.clientLocation.set(0, 0);
                this.touchCentroidShift.set(0, 0);
            } else {
                this.touchCentroidShift.add(this.clientLocation);
                this.touchCentroid(this.clientLocation);
                this.touchCentroidShift.subtract(this.clientLocation);
            }
        };

        /**
         *
         * @param identifier
         * @returns {number}
         * @protected
         */
        GestureRecognizer.prototype.indexOfTouch = function (identifier) {
            for (var i = 0, count = this.touches.length; i < count; i++) {
                if (this.touches[i].identifier == identifier) {
                    return i;
                }
            }

            return -1;
        };

        /**
         *
         * @protected
         */
        GestureRecognizer.prototype.touchCentroid = function (result) {
            result[0] = 0;
            result[1] = 0;

            for (var i = 0, count = this.touches.length; i < count; i++) {
                var entry = this.touches[i];
                result[0] += entry.clientLocation[0] / count;
                result[1] += entry.clientLocation[1] / count;
            }
        };

        return GestureRecognizer;
    });
