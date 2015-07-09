/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports TextSupport
 * @version $Id: TextSupport.js 2941 2015-03-30 21:11:43Z tgaskins $
 */
define([
        '../error/ArgumentError',
        '../shaders/BasicTextureProgram',
        '../util/Color',
        '../util/Logger',
        '../geom/Matrix',
        '../render/Texture',
        '../geom/Vec2'
    ],
    function (ArgumentError,
              BasicTextureProgram,
              Color,
              Logger,
              Matrix,
              Texture,
              Vec2) {
        "use strict";

        /**
         * Constructs a TextSupport instance.
         * @alias TextSupport
         * @constructor
         * @classdesc Provides methods useful for displaying text. An instance of this class is attached to the
         * World Window {@link DrawContext} and is not intended to be used independently of that. Applications typically do
         * not create instances of this class.
         */
        var TextSupport = function () {

            // Internal use only. Intentionally not documented.
            this.canvas2D = document.createElement("canvas");

            // Internal use only. Intentionally not documented.
            this.ctx2D = this.canvas2D.getContext("2d");

            // Internal use only. Intentionally not documented.
            this.lineSpacing = 0.15; // fraction of font size
        };

        /**
         * Returns the width and height of a specified text string upon applying a specified font.
         * @param {string} text The text string.
         * @param {Font} font The font to apply when drawing the text.
         * @returns {Vec2} A vector indicating the text's width and height, respectively, in pixels.
         */
        TextSupport.prototype.textSize = function (text, font) {
            if (text.length === 0) {
                return new Vec2(0, 0);
            }

            this.ctx2D.font = font.fontString;

            var lines = text.split("\n"),
                height = lines.length * (font.size * (1 + this.lineSpacing)),
                maxWidth = 0;

            for (var i = 0; i < lines.length; i++) {
                maxWidth = Math.max(maxWidth, this.ctx2D.measureText(lines[i]).width);
            }

            return new Vec2(maxWidth, height);
        };

        /**
         * Creates a texture for a specified text string and font.
         * @param {DrawContext} dc The current draw context.
         * @param {String} text The text string.
         * @param {Font} font The font to use.
         * @returns {Texture} A texture for the specified text string and font.
         */
        TextSupport.prototype.createTexture = function (dc, text, font) {
            var gl = dc.currentGlContext,
                ctx2D = this.ctx2D,
                canvas2D = this.canvas2D,
                textSize = this.textSize(text, font),
                lines = text.split("\n"),
                x, y;

            canvas2D.width = Math.ceil(textSize[0]);
            canvas2D.height = Math.ceil(textSize[1]);

            ctx2D.font = font.fontString;
            ctx2D.textBaseline = "top";
            ctx2D.textAlign = font.horizontalAlignment;
            ctx2D.fillStyle = Color.WHITE.toHexString(false);

            if (font.horizontalAlignment === "left") {
                x = 0;
            } else if (font.horizontalAlignment === "right") {
                x = canvas2D.width;
            } else {
                x = canvas2D.width / 2;
            }

            for (var i = 0; i < lines.length; i++) {
                y = i * font.size * (1 + this.lineSpacing);
                ctx2D.fillText(lines[i], x, y);
            }

            return new Texture(gl, canvas2D);
        };

        return TextSupport;
    });