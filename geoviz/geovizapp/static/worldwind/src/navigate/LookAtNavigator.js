/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports LookAtNavigator
 * @version $Id: LookAtNavigator.js 2940 2015-03-30 17:58:36Z tgaskins $
 */
define([
        '../geom/Angle',
        '../gesture/DragRecognizer',
        '../geom/Frustum',
        '../gesture/GestureRecognizer',
        '../geom/Line',
        '../util/Logger',
        '../geom/Matrix',
        '../navigate/Navigator',
        '../gesture/PanRecognizer',
        '../gesture/PinchRecognizer',
        '../geom/Position',
        '../gesture/RotationRecognizer',
        '../gesture/TiltRecognizer',
        '../geom/Vec2',
        '../geom/Vec3',
        '../util/WWMath'
    ],
    function (Angle,
              DragRecognizer,
              Frustum,
              GestureRecognizer,
              Line,
              Logger,
              Matrix,
              Navigator,
              PanRecognizer,
              PinchRecognizer,
              Position,
              RotationRecognizer,
              TiltRecognizer,
              Vec2,
              Vec3,
              WWMath) {
        "use strict";

        /**
         * Constructs a look-at navigator.
         * @alias LookAtNavigator
         * @constructor
         * @augments Navigator
         * @classdesc Represents a navigator that enables the user to pan, zoom and tilt the globe.
         * This navigator automatically responds to user-input events and gestures.
         * @param {WorldWindow} worldWindow The world window to associate with this navigator.
         */
        var LookAtNavigator = function (worldWindow) {
            Navigator.call(this, worldWindow);

            // Prevent the browser's default actions for touches on the WorldWindow's canvas, and prevent the context
            // menu from appearing when the WorldWindow's canvas is right-clicked. Register these event listeners on the
            // World Window before creating gesture recognizers so these listeners will be called last.
            var preventDefaultListener = function (event) {
                event.preventDefault();
            };
            worldWindow.addEventListener("touchstart", preventDefaultListener);
            worldWindow.addEventListener("touchmove", preventDefaultListener);
            worldWindow.addEventListener("touchend", preventDefaultListener);
            worldWindow.addEventListener("touchcancel", preventDefaultListener);
            worldWindow.addEventListener("wheel", preventDefaultListener);
            worldWindow.addEventListener("contextmenu", preventDefaultListener);

            var self = this;
            var commonGestureListener = function (recognizer) {
                self.gestureStateChanged(recognizer);
            };

            /**
             * The geographic position this navigator is directed towards.
             * @type {Position}
             */
            this.lookAtPosition = new Position(30, -110, 0);

            /**
             * The distance of the eye from this navigator's look-at position.
             * @type {Number}
             * @default 10,000 kilometers
             */
            this.range = 10e6; // TODO: Compute initial range to fit globe in viewport.

            // Development testing only. Set this to false to suppress default navigator limits on 2D globes.
            this.enable2DLimits = true;

            // Internal use only. Intentionally not documented.
            this.primaryDragRecognizer = new DragRecognizer(worldWindow);
            this.primaryDragRecognizer.addGestureListener(function (recognizer) {
                self.handlePanOrDrag(recognizer);
            });
            this.primaryDragRecognizer.addGestureListener(commonGestureListener);

            // Internal use only. Intentionally not documented.
            this.secondaryDragRecognizer = new DragRecognizer(worldWindow);
            this.secondaryDragRecognizer.buttons = 4; // secondary mouse button
            this.secondaryDragRecognizer.addGestureListener(function (recognizer) {
                self.handleSecondaryDrag(recognizer);
            });
            this.secondaryDragRecognizer.addGestureListener(commonGestureListener);

            // Internal use only. Intentionally not documented.
            this.panRecognizer = new PanRecognizer(worldWindow);
            this.panRecognizer.addGestureListener(function (recognizer) {
                self.handlePanOrDrag(recognizer);
            });
            this.panRecognizer.addGestureListener(commonGestureListener);

            // Internal use only. Intentionally not documented.
            this.pinchRecognizer = new PinchRecognizer(worldWindow);
            this.pinchRecognizer.addGestureListener(function (recognizer) {
                self.handlePinch(recognizer);
            });
            this.pinchRecognizer.addGestureListener(commonGestureListener);

            // Internal use only. Intentionally not documented.
            this.rotationRecognizer = new RotationRecognizer(worldWindow);
            this.rotationRecognizer.addGestureListener(function (recognizer) {
                self.handleRotation(recognizer);
            });
            this.rotationRecognizer.addGestureListener(commonGestureListener);

            // Internal use only. Intentionally not documented.
            this.tiltRecognizer = new TiltRecognizer(worldWindow);
            this.tiltRecognizer.addGestureListener(function (recognizer) {
                self.handleTilt(recognizer);
            });
            this.tiltRecognizer.addGestureListener(commonGestureListener);

            // Establish the dependencies between gesture recognizers. The pan, pinch and rotate gesture may recognize
            // simultaneously with each other.
            this.panRecognizer.recognizeWith(this.pinchRecognizer);
            this.panRecognizer.recognizeWith(this.rotationRecognizer);
            this.pinchRecognizer.recognizeWith(this.panRecognizer);
            this.pinchRecognizer.recognizeWith(this.rotationRecognizer);
            this.rotationRecognizer.recognizeWith(this.panRecognizer);
            this.rotationRecognizer.recognizeWith(this.pinchRecognizer);

            // Since the tilt gesture is a subset of the pan gesture, pan will typically recognize before tilt,
            // effectively suppressing tilt. Establish a dependency between the other touch gestures and tilt to provide
            // tilt an opportunity to recognize.
            this.panRecognizer.requireFailure(this.tiltRecognizer);
            this.pinchRecognizer.requireFailure(this.tiltRecognizer);
            this.rotationRecognizer.requireFailure(this.tiltRecognizer);

            // Internal. Intentionally not documented.
            this.beginPoint = new Vec2(0, 0);
            this.lastPoint = new Vec2(0, 0);
            this.beginHeading = 0;
            this.beginTilt = 0;
            this.beginRange = 0;
            this.lastRotation = 0;

            // Register wheel event listeners on the WorldWindow's canvas.
            worldWindow.addEventListener("wheel", function (event) {
                self.handleWheelEvent(event);
            });
        };

        LookAtNavigator.prototype = Object.create(Navigator.prototype);

        // Documented in superclass.
        LookAtNavigator.prototype.currentState = function () {
            this.applyLimits();

            var modelview = Matrix.fromIdentity();
            modelview.multiplyByLookAtModelview(this.lookAtPosition, this.range, this.heading, this.tilt, this.roll,
                this.worldWindow.globe);

            return this.currentStateForModelview(modelview);
        };

        /* INTENTIONALLY NOT DOCUMENTED.
         * Performs navigation changes in response to pan gestures using the primary mouse button or any number of
         * touches.
         *
         * @param recognizer The gesture recognizer that identified the gesture.
         */
        LookAtNavigator.prototype.handlePanOrDrag = function (recognizer) {
            if (this.worldWindow.globe.is2D()) {
                this.handlePanOrDrag2D(recognizer);
            } else {
                this.handlePanOrDrag3D(recognizer);
            }
        };

        // Intentionally not documented.
        LookAtNavigator.prototype.handlePanOrDrag3D = function (recognizer) {
            var state = recognizer.state,
                translation = recognizer.translation,
                viewport = this.worldWindow.viewport,
                globe = this.worldWindow.globe,
                globeRadius = WWMath.max(globe.equatorialRadius, globe.polarRadius),
                distance = WWMath.max(1, this.range),
                metersPerPixel = WWMath.perspectivePixelSize(viewport, distance),
                forwardPixels, sidePixels,
                forwardMeters, sideMeters,
                forwardDegrees, sideDegrees,
                sinHeading, cosHeading;

            if (state == WorldWind.BEGAN) {
                this.lastPoint.set(0, 0);
            } else if (state == WorldWind.CHANGED) {
                // Compute the current translation in screen coordinates.
                forwardPixels = translation[1] - this.lastPoint[1];
                sidePixels = translation[0] - this.lastPoint[0];
                this.lastPoint.copy(translation);

                // Convert the translation from screen coordinates to meters. Use this navigator's range as a distance
                // metric for converting screen pixels to meters. This assumes that the gesture is intended to translate
                // a surface that is 'range' meters away form the eye point.
                forwardMeters = forwardPixels * metersPerPixel;
                sideMeters = -sidePixels * metersPerPixel;

                // Convert the translation from meters to arc degrees. The globe's radius provides the necessary context
                // to perform this conversion.
                forwardDegrees = (forwardMeters / globeRadius) * Angle.RADIANS_TO_DEGREES;
                sideDegrees = (sideMeters / globeRadius) * Angle.RADIANS_TO_DEGREES;

                // Apply the change in latitude and longitude to this navigator, relative to the current heading.
                sinHeading = Math.sin(this.heading * Angle.DEGREES_TO_RADIANS);
                cosHeading = Math.cos(this.heading * Angle.DEGREES_TO_RADIANS);
                this.lookAtPosition.latitude += forwardDegrees * cosHeading - sideDegrees * sinHeading;
                this.lookAtPosition.longitude += forwardDegrees * sinHeading + sideDegrees * cosHeading;
                this.applyLimits();
            }
        };

        // Intentionally not documented.
        LookAtNavigator.prototype.handlePanOrDrag2D = function (recognizer) {
            var state = recognizer.state,
                translation = recognizer.translation,
                globe = this.worldWindow.globe,
                navState = this.currentState(),
                x1, y1,
                x2, y2,
                ray,
                point1 = new Vec3(0, 0, 0),
                point2 = new Vec3(0, 0, 0),
                origin = new Vec3(0, 0, 0),
                modelview,
                params;

            if (state == WorldWind.BEGAN) {
                this.beginPoint.copy(recognizer.location());
                this.lastPoint.copy(recognizer.location());
            } else if (state == WorldWind.CHANGED) {
                x1 = this.lastPoint[0];
                y1 = this.lastPoint[1];
                x2 = this.beginPoint[0] + translation[0];
                y2 = this.beginPoint[1] + translation[1];
                this.lastPoint.set(x2, y2);

                ray = navState.rayFromScreenPoint(this.worldWindow.canvasCoordinates(x1, y1));
                if (!globe.intersectsLine(ray, point1)) {
                    return;
                }

                ray = navState.rayFromScreenPoint(this.worldWindow.canvasCoordinates(x2, y2));
                if (!globe.intersectsLine(ray, point2)) {
                    return;
                }

                // Transform the original navigator state's modelview matrix to account for the gesture's change.
                modelview = Matrix.fromIdentity();
                modelview.copy(navState.modelview);
                modelview.multiplyByTranslation(point2[0] - point1[0], point2[1] - point1[1], point2[2] - point1[2]);

                // Compute the globe point at the screen center from the perspective of the transformed navigator state.
                modelview.extractEyePoint(ray.origin);
                modelview.extractForwardVector(ray.direction);
                if (!globe.intersectsLine(ray, origin)) {
                    return;
                }

                // Convert the transformed modelview matrix to a set of navigator properties, then apply those
                // properties to this navigator.
                params = modelview.extractViewingParameters(origin, this.roll, globe, {});
                this.lookAtPosition.copy(params.origin);
                this.range = params.range;
                this.heading = params.heading;
                this.tilt = params.tilt;
                this.roll = params.roll;
                this.applyLimits();
            }
        };

        /* INTENTIONALLY NOT DOCUMENTED.
         * Performs navigation changes in response to pan gestures using the secondary mouse button.
         *
         * @param recognizer The gesture recognizer that identified the gesture.
         */
        LookAtNavigator.prototype.handleSecondaryDrag = function (recognizer) {
            var state = recognizer.state,
                translation = recognizer.translation,
                viewport = this.worldWindow.viewport,
                headingPixels, tiltPixels,
                headingDegrees, tiltDegrees;

            if (state == WorldWind.BEGAN) {
                this.beginHeading = this.heading;
                this.beginTilt = this.tilt;
            } else if (state == WorldWind.CHANGED) {
                // Compute the current translation in screen coordinates.
                headingPixels = translation[0];
                tiltPixels = translation[1];

                // Convert the translation from screen coordinates to degrees. Use the viewport dimensions as a metric
                // for converting the gesture translation to a fraction of an angle.
                headingDegrees = 180 * headingPixels / viewport.width;
                tiltDegrees = 90 * tiltPixels / viewport.height;

                // Apply the change in heading and tilt to this navigator's corresponding properties.
                this.heading = this.beginHeading + headingDegrees;
                this.tilt = this.beginTilt + tiltDegrees;
                this.applyLimits();
            }
        };

        /* INTENTIONALLY NOT DOCUMENTED.
         * Performs navigation changes in response to two finger pinch gestures.
         *
         * @param recognizer The gesture recognizer that identified the gesture.
         */
        LookAtNavigator.prototype.handlePinch = function (recognizer) {
            var state = recognizer.state,
                scale = recognizer.scale;

            if (state == WorldWind.BEGAN) {
                this.beginRange = this.range;
            } else if (state == WorldWind.CHANGED) {
                if (scale != 0) {
                    // Apply the change in pinch scale to this navigator's range, relative to the range when the gesture
                    // began.
                    this.range = this.beginRange / scale;
                    this.applyLimits();
                }
            }
        };

        /* INTENTIONALLY NOT DOCUMENTED.
         * Performs navigation changes in response to two finger rotation gestures.
         *
         * @param recognizer The gesture recognizer that identified the gesture.
         */
        LookAtNavigator.prototype.handleRotation = function (recognizer) {
            var state = recognizer.state,
                rotation = recognizer.rotation;

            if (state == WorldWind.BEGAN) {
                this.lastRotation = 0;
            } else if (state == WorldWind.CHANGED) {
                // Apply the change in gesture rotation to this navigator's current heading. We apply relative to the
                // current heading rather than the heading when the gesture began in order to work simultaneously with
                // pan operations that also modify the current heading.
                this.heading -= rotation - this.lastRotation;
                this.lastRotation = rotation;
                this.applyLimits();
            }
        };

        /* INTENTIONALLY NOT DOCUMENTED.
         * Performs navigation changes in response to two finger tilt gestures. 
         *
         * @param recognizer The gesture recognizer that identified the gesture. 
         */
        LookAtNavigator.prototype.handleTilt = function (recognizer) {
            var state = recognizer.state,
                translation = recognizer.translation,
                viewport = this.worldWindow.viewport,
                pixels,
                degrees;

            if (state == WorldWind.BEGAN) {
                this.beginTilt = this.tilt;
            } else if (state == WorldWind.CHANGED) {
                // Compute the current translation in screen coordinates. 
                pixels = -translation[1];

                // Convert the translation from screen coordinates to degrees. Use the viewport dimensions as a metric 
                // for converting the gesture translation to a fraction of an angle. 
                degrees = 90 * pixels / viewport.height;

                // Apply the change in heading and tilt to this navigator's corresponding properties.
                this.tilt = this.beginTilt + degrees;
                this.applyLimits();
            }
        };

        /* INTENTIONALLY NOT DOCUMENTED.
         * Recognizes wheel gestures indicating navigation. Upon recognizing a gesture this delegates the task of
         * responding to that gesture to one of this navigator's handleWheel* functions, and cancels the default actions
         * associated with the corresponding events.
         *
         * @param {WheelEvent} event A wheel event associated with the WorldWindow.
         */
        LookAtNavigator.prototype.handleWheelEvent = function (event) {
            var wheelDelta;

            if (event.type == "wheel") {
                // Convert the wheel delta value from its current units to screen coordinates. The default wheel unit
                // is DOM_DELTA_PIXEL.
                wheelDelta = event.deltaY;
                if (event.deltaMode == WheelEvent.DOM_DELTA_LINE) {
                    wheelDelta *= 10;
                } else if (event.deltaMode == WheelEvent.DOM_DELTA_PAGE) {
                    wheelDelta *= 100;
                }

                this.handleWheelZoom(wheelDelta);
            } else {
                Logger.logMessage(Logger.LEVEL_WARNING, "LookAtNavigator", "handleWheelEvent",
                    "Unrecognized event type: " + event.type);
            }
        };

        /* INTENTIONALLY NOT DOCUMENTED.
         * Translates wheel zoom gestures to changes in this navigator's properties.
         * @param wheelDelta The wheel's translation.
         */
        LookAtNavigator.prototype.handleWheelZoom = function (wheelDelta) {
            var viewport,
                distance,
                metersPerPixel,
                meters;

            // Convert the translation from screen coordinates to meters. Use this navigator's range as a distance
            // metric for converting screen pixels to meters. This assumes that the gesture is intended to translate
            // a surface that is 'range' meters away form the eye point.
            viewport = this.worldWindow.viewport;
            distance = WWMath.max(1, this.range);
            metersPerPixel = WWMath.perspectivePixelSize(viewport, distance);
            meters = 0.5 * wheelDelta * metersPerPixel;

            // Apply the change in range to this navigator's properties.
            this.range += meters;
            this.applyLimits();
            this.sendRedrawEvent();
        };

        /* INTENTIONALLY NOT DOCUMENTED.
         * Called whenever any of the navigator's gesture recognizers change state. Performs common actions in response
         * to any navigator gesture, such as causing the navigator's World Window to redraw.
         *
         * @param recognizer
         */
        LookAtNavigator.prototype.gestureStateChanged = function (recognizer) {
            this.sendRedrawEvent();
        };

        /* INTENTIONALLY NOT DOCUMENTED.
         * Limit the navigator's position and orientation appropriately for the current scene.
         */
        LookAtNavigator.prototype.applyLimits = function () {
            // Clamp latitude to between -90 and +90, and normalize longitude to between -180 and +180.
            this.lookAtPosition.latitude = WWMath.clamp(this.lookAtPosition.latitude, -90, 90);
            this.lookAtPosition.longitude = Angle.normalizedDegreesLongitude(this.lookAtPosition.longitude);

            // Clamp range to values greater than 1 in order to prevent degenerating to a first-person navigator when
            // range is zero.
            this.range = WWMath.clamp(this.range, 1, Number.MAX_VALUE);

            // Normalize heading to between -180 and +180.
            this.heading = Angle.normalizedDegrees(this.heading);

            // Clamp tilt to between 0 and +90 to prevent the viewer from going upside down.
            this.tilt = WWMath.clamp(this.tilt, 0, 90);

            // Normalize heading to between -180 and +180.
            this.roll = Angle.normalizedDegrees(this.roll);

            // Apply 2D limits when the globe is 2D.
            if (this.worldWindow.globe.is2D() && this.enable2DLimits) {
                // Clamp range to prevent more than 360 degrees of visible longitude.
                var nearDist = this.nearDistance,
                    nearWidth = WWMath.perspectiveFrustumRectangle(this.worldWindow.viewport, nearDist).width,
                    maxRange = 2 * Math.PI * this.worldWindow.globe.equatorialRadius * (nearDist / nearWidth);
                this.range = WWMath.clamp(this.range, 1, maxRange);

                // Force tilt to 0 when in 2D mode to keep the viewer looking straight down.
                this.tilt = 0;
            }
        };

        /* INTENTIONALLY NOT DOCUMENTED.
         * Sends a redraw event to this navigator's world window.
         */
        LookAtNavigator.prototype.sendRedrawEvent = function () {
            var e = document.createEvent('Event');
            e.initEvent(WorldWind.REDRAW_EVENT_TYPE, true, true);
            this.worldWindow.canvas.dispatchEvent(e);
        };

        return LookAtNavigator;
    });