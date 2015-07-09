/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports ScreenText
 * @version $Id: ScreenText.js 2951 2015-03-31 23:31:08Z tgaskins $
 */
define([
        '../error/ArgumentError',
        '../util/Logger',
        '../shapes/Text',
        '../geom/Vec3'
    ],
    function (ArgumentError,
              Logger,
              Text,
              Vec3) {
        "use strict";

        /**
         * Constructs a screen text shape at a specified screen position.
         * @alias ScreenText
         * @constructor
         * @augments Text
         * @classdesc Represents a string of text displayed at a screen position.
         * <p>
         * See also {@link GeographicText}.
         *
         * @param {Vec2} screenPosition The text's screen position in screen coordinates (upper left origin).
         * @param {String} text The text to display.
         * @throws {ArgumentError} If either the specified screen position or text is null or undefined.
         */
        var ScreenText = function (screenPosition, text) {
            if (!screenPosition) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "Text", "constructor", "missingPosition"));
            }

            Text.call(this, text);

            /**
             * This text's screen position.
             * The [TextAttributes.offset]{@link TextAttributes#offset} property indicates the relationship of the
             * text string to this position.
             * @type {Vec2}
             */
            this.screenPosition = screenPosition;

            /**
             * Inherited from [Text]{@link Text#altitudeMode} but not utilized by screen text.
             */
            this.altitudeMode = null;
        };

        ScreenText.prototype = Object.create(Text.prototype);

        // Documented in superclass.
        ScreenText.prototype.render = function (dc) {
            // Ensure that this text is drawn only once per frame.
            if (this.lastFrameTime != dc.timestamp) {
                Text.prototype.render.call(this, dc);
            }
        };

        // Documented in superclass.
        ScreenText.prototype.computeScreenPointAndEyeDistance = function (dc) {
            dc.navigatorState.convertPointToViewport(this.screenPosition, this.screenPoint);
            this.screenPoint[2] = 1;

            this.eyeDistance = 0;
        };

        return ScreenText;
    });