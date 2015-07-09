/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports Placemark
 * @version $Id: Placemark.js 3023 2015-04-15 20:24:17Z tgaskins $
 */
define([
        '../error/ArgumentError',
        '../shaders/BasicTextureProgram',
        '../util/Color',
        '../util/Font',
        '../util/Logger',
        '../geom/Matrix',
        '../pick/PickedObject',
        '../shapes/PlacemarkAttributes',
        '../render/Renderable',
        '../geom/Vec2',
        '../geom/Vec3',
        '../util/WWMath'
    ],
    function (ArgumentError,
              BasicTextureProgram,
              Color,
              Font,
              Logger,
              Matrix,
              PickedObject,
              PlacemarkAttributes,
              Renderable,
              Vec2,
              Vec3,
              WWMath) {
        "use strict";

        /**
         * Constructs a placemark.
         * @alias Placemark
         * @constructor
         * @augments Renderable
         * @classdesc Represents a Placemark shape. A placemark displays an image, a label and a leader line connecting
         * the placemark's geographic position to the ground. All three of these items are optional. By default, the
         * leader line is not pickable. See [enableLeaderLinePicking]{@link Placemark#enableLeaderLinePicking}.
         * <p>
         * Placemarks may be drawn with either an image or as single-color square with a specified size. When the
         * placemark attributes indicate a valid image, the placemark's image is drawn as a rectangle in the
         * image's original dimensions, scaled by the image scale attribute. Otherwise, the placemark is drawn as a
         * square with width and height equal to the value of the image scale attribute, in pixels.
         * @param {Position} position The placemark's geographic position.
         * @throws {ArgumentError} If the specified position is null or undefined.
         */
        var Placemark = function (position) {
            if (!position) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "Placemark", "constructor", "missingPosition"));
            }

            Renderable.call(this);

            /**
             * The placemark's attributes. If null and this placemark is not highlighted, this placemark is not
             * drawn.
             * @type {PlacemarkAttributes}
             * @default see [PlacemarkAttributes]{@link PlacemarkAttributes}
             */
            this.attributes = new PlacemarkAttributes(null);

            /**
             * The attributes used when this placemark's highlighted flag is true. If null and the
             * highlighted flag is true, this placemark's normal attributes are used. If they, too, are null, this
             * placemark is not drawn.
             * @type {PlacemarkAttributes}
             * @default null
             */
            this.highlightAttributes = null;

            /**
             * Indicates whether this placemark uses its highlight attributes rather than its normal attributes.
             * @type {Boolean}
             * @default false
             */
            this.highlighted = false;

            /**
             * This placemark's geographic position.
             * @type {Position}
             */
            this.position = position;

            /**
             * This placemark's textual label. If null, no label is drawn.
             * @type {String}
             * @default null
             */
            this.label = null;

            /**
             * This placemark's altitude mode. May be one of
             * <ul>
             *  <li>[WorldWind.ABSOLUTE]{@link WorldWind#ABSOLUTE}</li>
             *  <li>[WorldWind.RELATIVE_TO_GROUND]{@link WorldWind#RELATIVE_TO_GROUND}</li>
             *  <li>[WorldWind.CLAMP_TO_GROUND]{@link WorldWind#CLAMP_TO_GROUND}</li>
             * </ul>
             * @default WorldWind.ABSOLUTE
             */
            this.altitudeMode = WorldWind.ABSOLUTE;

            /**
             * Indicates whether this placemark has visual priority over other shapes in the scene.
             * @type {Boolean}
             * @default false
             */
            this.alwaysOnTop = false;

            /**
             * Indicates whether this placemark's leader line, if any, is pickable.
             * @type {Boolean}
             * @default false
             */
            this.enableLeaderLinePicking = false;

            /**
             * Indicates whether this placemark's image should be re-retrieved even if it has already been retrieved.
             * Set this property to true when the image has changed but has the same image path.
             * The property is set to false when the image is re-retrieved.
             * @type {Boolean}
             */
            this.updateImage = true;

            // Internal use only. Intentionally not documented.
            this.activeAttributes = null;

            // Internal use only. Intentionally not documented.
            this.activeTexture = null;

            // Internal use only. Intentionally not documented.
            this.labelTexture = null;

            // Internal use only. Intentionally not documented.
            this.placePoint = new Vec3(0, 0, 0); // Cartesian point corresponding to this placemark's geographic position

            // Internal use only. Intentionally not documented.
            this.groundPoint = new Vec3(0, 0, 0); // Cartesian point corresponding to ground position below this placemark

            // Internal use only. Intentionally not documented.
            this.imageTransform = Matrix.fromIdentity();

            // Internal use only. Intentionally not documented.
            this.labelTransform = Matrix.fromIdentity();

            // Internal use only. Intentionally not documented.
            this.texCoordMatrix = Matrix.fromIdentity();

            // Internal use only. Intentionally not documented.
            this.imageBounds = null;

            // Internal use only. Intentionally not documented.
            this.layer = null;

            // Internal use only. Intentionally not documented.
            this.depthOffset = -0.003;
        };

        // Internal use only. Intentionally not documented.
        Placemark.screenPoint = new Vec3(0, 0, 0); // scratch variable
        Placemark.matrix = Matrix.fromIdentity(); // scratch variable
        Placemark.scratchPoint = new Vec3(0, 0, 0); // scratch variable

        Placemark.prototype = Object.create(Renderable.prototype);

        /**
         * Copies the contents of a specified placemark to this placemark.
         * @param {Placemark} that The placemark to copy.
         */
        Placemark.prototype.copy = function (that) {
            this.position = that.position;
            this.attributes = that.attributes;
            this.highlightAttributes = that.highlightAttributes;
            this.highlighted = that.highlighted;
            this.enabled = that.enabled;
            this.label = that.label;
            this.altitudeMode = that.altitudeMode;
            this.pickDelegate = that.pickDelegate;
            this.alwaysOnTop = that.alwaysOnTop;
            this.depthOffset = that.depthOffset;

            return this;
        };

        /**
         * Creates a new placemark that is a copy of this placemark.
         * @returns {Placemark} The new placemark.
         */
        Placemark.prototype.clone = function () {
            var clone = new Placemark(this.position);

            clone.copy(this);
            clone.pickDelegate = this.pickDelegate ? this.pickDelegate : this;

            return clone;
        };

        /**
         * Renders this placemark. This method is typically not called by applications but is called by
         * {@link RenderableLayer} during rendering. For this shape this method creates and
         * enques an ordered renderable with the draw context and does not actually draw the placemark.
         * @param {DrawContext} dc The current draw context.
         */
        Placemark.prototype.render = function (dc) {
            if (!this.enabled) {
                return;
            }

            if (dc.globe.projectionLimits
                && !dc.globe.projectionLimits.containsLocation(this.position.latitude, this.position.longitude)) {
                return;
            }

            // Create an ordered renderable for this placemark. If one has already been created this frame then we're
            // in 2D-continuous mode and another needs to be created for one of the alternate globe offsets.
            var orderedPlacemark;
            if (this.lastFrameTime !== dc.timestamp) {
                orderedPlacemark = this.makeOrderedRenderable(dc);
            } else {
                var placemarkCopy = this.clone();
                orderedPlacemark = placemarkCopy.makeOrderedRenderable(dc);
            }

            if (!orderedPlacemark) {
                return;
            }

            if (!orderedPlacemark.isVisible(dc)) {
                return;
            }

            orderedPlacemark.layer = dc.currentLayer;

            this.lastFrameTime = dc.timestamp;
            dc.addOrderedRenderable(orderedPlacemark);
        };

        /**
         * Draws this shape as an ordered renderable. Applications do not call this function. It is called by
         * [WorldWindow]{@link WorldWindow} during rendering.
         * @param {DrawContext} dc The current draw context.
         */
        Placemark.prototype.renderOrdered = function (dc) {
            this.drawOrderedPlacemark(dc);

            if (dc.pickingMode) {
                var po = new PickedObject(this.pickColor.clone(), this.pickDelegate ? this.pickDelegate : this,
                    this.position, this.layer, false);

                if (dc.pickPoint && this.mustDrawLabel()) {
                    if (this.labelBounds.containsPoint(
                            dc.navigatorState.convertPointToViewport(dc.pickPoint, Placemark.scratchPoint))) {
                        po.labelPicked = true;
                    }
                }
                dc.resolvePick(po);
            }
        };

        /* INTENTIONALLY NOT DOCUMENTED
         * Creates an ordered renderable for this shape.
         * @protected
         * @param {DrawContext} dc The current draw context.
         * @returns {OrderedRenderable} The ordered renderable. May be null, in which case an ordered renderable
         * cannot be created or should not be created at the time this method is called.
         */
        Placemark.prototype.makeOrderedRenderable = function (dc) {
            var w, h, s,
                offset;

            this.determineActiveAttributes(dc);
            if (!this.activeAttributes) {
                return null;
            }

            // Compute the placemark's model point and corresponding distance to the eye point. If the placemark's
            // position is terrain-dependent but off the terrain, then compute it ABSOLUTE so that we have a point for
            // the placemark and are thus able to draw it. Otherwise its image and label portion that are potentially
            // over the terrain won't get drawn, and would disappear as soon as there is no terrain at the placemark's
            // position. This can occur at the window edges.
            dc.terrain.surfacePointForMode(this.position.latitude, this.position.longitude, this.position.altitude,
                this.altitudeMode, this.placePoint);

            this.eyeDistance = this.alwaysOnTop ? 0 : dc.navigatorState.eyePoint.distanceTo(this.placePoint);

            if (this.mustDrawLeaderLine(dc)) {
                dc.terrain.surfacePointForMode(this.position.latitude, this.position.longitude, 0,
                    this.altitudeMode, this.groundPoint);
            }

            // Compute the placemark's screen point in the OpenGL coordinate system of the WorldWindow by projecting its model
            // coordinate point onto the viewport. Apply a depth offset in order to cause the placemark to appear above nearby
            // terrain. When a placemark is displayed near the terrain portions of its geometry are often behind the terrain,
            // yet as a screen element the placemark is expected to be visible. We adjust its depth values rather than moving
            // the placemark itself to avoid obscuring its actual position.
            if (!dc.navigatorState.projectWithDepth(this.placePoint, this.depthOffset, Placemark.screenPoint)) {
                return null;
            }

            // Compute the placemark's transform matrix and texture coordinate matrix according to its screen point, image size,
            // image offset and image scale. The image offset is defined with its origin at the image's bottom-left corner and
            // axes that extend up and to the right from the origin point. When the placemark has no active texture the image
            // scale defines the image size and no other scaling is applied.
            if (this.activeTexture) {
                w = this.activeTexture.originalImageWidth;
                h = this.activeTexture.originalImageHeight;
                s = this.activeAttributes.imageScale;
                offset = this.activeAttributes.imageOffset.offsetForSize(w, h);

                this.imageTransform.setTranslation(
                    Placemark.screenPoint[0] - offset[0] * s,
                    Placemark.screenPoint[1] - offset[1] * s,
                    Placemark.screenPoint[2]);

                this.imageTransform.setScale(w * s, h * s, 1);
            } else {
                s = this.activeAttributes.imageScale;
                offset = this.activeAttributes.imageOffset.offsetForSize(s, s);

                this.imageTransform.setTranslation(
                    Placemark.screenPoint[0] - offset[0],
                    Placemark.screenPoint[1] - offset[1],
                    Placemark.screenPoint[2]);

                this.imageTransform.setScale(s, s, 1);
            }

            this.imageBounds = WWMath.boundingRectForUnitQuad(this.imageTransform);

            // If there's a label, perform these same operations for the label texture, creating that texture if it
            // doesn't already exist.

            if (this.mustDrawLabel()) {
                var labelFont = this.activeAttributes.labelAttributes.font,
                    labelKey = this.label + labelFont.toString();

                this.labelTexture = dc.gpuResourceCache.resourceForKey(labelKey);
                if (!this.labelTexture) {
                    this.labelTexture = dc.textSupport.createTexture(dc, this.label, labelFont);
                    dc.gpuResourceCache.putResource(labelKey, this.labelTexture, this.labelTexture.size);
                }

                w = this.labelTexture.imageWidth;
                h = this.labelTexture.imageHeight;
                s = this.activeAttributes.labelAttributes.scale;
                offset = this.activeAttributes.labelAttributes.offset.offsetForSize(w, h);

                this.labelTransform.setTranslation(
                    Placemark.screenPoint[0] - offset[0] * s,
                    Placemark.screenPoint[1] - offset[1] * s,
                    Placemark.screenPoint[2]);

                this.labelTransform.setScale(w * s, h * s, 1);

                this.labelBounds = WWMath.boundingRectForUnitQuad(this.labelTransform);
            }

            return this;
        };

        // Internal. Intentionally not documented.
        Placemark.prototype.determineActiveAttributes = function (dc) {
            if (this.highlighted && this.highlightAttributes) {
                this.activeAttributes = this.highlightAttributes;
            } else {
                this.activeAttributes = this.attributes;
            }

            if (this.activeAttributes && this.activeAttributes.imageSource) {
                this.activeTexture = dc.gpuResourceCache.resourceForKey(this.activeAttributes.imageSource);

                if (!this.activeTexture || this.updateImage) {
                    this.activeTexture = dc.gpuResourceCache.retrieveTexture(dc.currentGlContext,
                        this.activeAttributes.imageSource);
                    this.updateImage = false;
                }
            }
        };

        // Internal. Intentionally not documented.
        Placemark.prototype.isVisible = function (dc) {
            if (dc.pickingMode) {
                return dc.pickRectangle && (this.imageBounds.intersects(dc.pickRectangle)
                    || (this.mustDrawLabel() && this.labelBounds.intersects(dc.pickRectangle))
                    || (this.mustDrawLeaderLine(dc)
                    && dc.pickFrustum.intersectsSegment(this.groundPoint, this.placePoint)));
            } else {
                return this.imageBounds.intersects(dc.navigatorState.viewport)
                    || (this.mustDrawLabel() && this.labelBounds.intersects(dc.navigatorState.viewport))
                    || (this.mustDrawLeaderLine(dc)
                    && dc.navigatorState.frustumInModelCoordinates.intersectsSegment(this.groundPoint, this.placePoint));
            }
        };

        // Internal. Intentionally not documented.
        Placemark.prototype.drawOrderedPlacemark = function (dc) {
            this.beginDrawing(dc);

            try {
                this.doDrawOrderedPlacemark(dc);
                if (!dc.pickingMode) {
                    this.drawBatchOrderedPlacemarks(dc);
                }
            } finally {
                this.endDrawing(dc);
            }
        };

        // Internal. Intentionally not documented.
        Placemark.prototype.drawBatchOrderedPlacemarks = function (dc) {
            // Draw any subsequent placemarks in the ordered renderable queue, removing each from the queue as it's
            // processed. This avoids the overhead of setting up and tearing down OpenGL state for each placemark.

            var or;

            while ((or = dc.peekOrderedRenderable()) && or.doDrawOrderedPlacemark) {
                dc.popOrderedRenderable(); // remove it from the queue

                try {
                    or.doDrawOrderedPlacemark(dc)
                } catch (e) {
                    Logger.logMessage(Logger.LEVEL_WARNING, 'Placemark', 'drawBatchOrderedPlacemarks',
                        "Error occurred while rendering placemark using batching: " + e.message);
                }
                // Keep going. Render the rest of the ordered renderables.
            }
        };

        // Internal. Intentionally not documented.
        Placemark.prototype.beginDrawing = function (dc) {
            var gl = dc.currentGlContext,
                program;

            dc.findAndBindProgram(gl, BasicTextureProgram);

            // Configure GL to use the draw context's unit quad VBOs for both model coordinates and texture coordinates.
            // Most browsers can share the same buffer for vertex and texture coordinates, but Internet Explorer requires
            // that they be in separate buffers, so the code below uses the 3D buffer for vertex coords and the 2D
            // buffer for texture coords.
            program = dc.currentProgram;
            gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, dc.unitQuadBuffer());
            gl.vertexAttribPointer(program.vertexTexCoordLocation, 2, WebGLRenderingContext.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(program.vertexPointLocation);
            gl.enableVertexAttribArray(program.vertexTexCoordLocation);

            // Tell the program which texture unit to use.
            program.loadTextureUnit(gl, WebGLRenderingContext.TEXTURE0);
            program.loadModulateColor(gl, dc.pickingMode);
            program.loadOpacity(gl, !dc.pickingMode ? this.layer.opacity : 1);

            // The currentTexture field is used to avoid re-specifying textures unnecessarily. Clear it to start.
            Placemark.currentTexture = null;
        };

        // Internal. Intentionally not documented.
        Placemark.prototype.endDrawing = function (dc) {
            var gl = dc.currentGlContext,
                program = dc.currentProgram;

            // Clear the vertex attribute state.
            gl.disableVertexAttribArray(program.vertexPointLocation);
            gl.disableVertexAttribArray(program.vertexTexCoordLocation);

            // Clear GL bindings.
            dc.bindProgram(gl, null);
            gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, null);
            gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, null);

            // Avoid keeping a dangling reference to the current texture.
            Placemark.currentTexture = null;
        };

        // Internal. Intentionally not documented.
        Placemark.prototype.doDrawOrderedPlacemark = function (dc) {
            var gl = dc.currentGlContext,
                program = dc.currentProgram,
                depthTest = true,
                textureBound;

            if (dc.pickingMode) {
                this.pickColor = dc.uniquePickColor();
            }

            // Draw the leader line first so that the image and label have visual priority.
            if (this.mustDrawLeaderLine(dc)) {
                if (!this.leaderLinePoints) {
                    this.leaderLinePoints = new Float32Array(6);
                }

                this.leaderLinePoints[0] = this.groundPoint[0]; // computed during makeOrderedRenderable
                this.leaderLinePoints[1] = this.groundPoint[1];
                this.leaderLinePoints[2] = this.groundPoint[2];
                this.leaderLinePoints[3] = this.placePoint[0]; // computed during makeOrderedRenderable
                this.leaderLinePoints[4] = this.placePoint[1];
                this.leaderLinePoints[5] = this.placePoint[2];

                if (!this.leaderLineCacheKey) {
                    this.leaderLineCacheKey = dc.gpuResourceCache.generateCacheKey();
                }

                var leaderLineVboId = dc.gpuResourceCache.resourceForKey(this.leaderLineCacheKey);
                if (!leaderLineVboId) {
                    leaderLineVboId = gl.createBuffer();
                    dc.gpuResourceCache.putResource(this.leaderLineCacheKey, leaderLineVboId,
                        this.leaderLinePoints.length * 4);
                }

                program.loadTextureEnabled(gl, false);
                program.loadColor(gl, dc.pickingMode ? this.pickColor :
                    this.activeAttributes.leaderLineAttributes.outlineColor);

                Placemark.matrix.copy(dc.navigatorState.modelviewProjection);
                program.loadModelviewProjection(gl, Placemark.matrix);

                if (!this.activeAttributes.leaderLineAttributes.depthTest) {
                    gl.disable(WebGLRenderingContext.DEPTH_TEST);
                }

                gl.lineWidth(this.activeAttributes.leaderLineAttributes.outlineWidth);

                gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, leaderLineVboId);
                gl.bufferData(WebGLRenderingContext.ARRAY_BUFFER, this.leaderLinePoints, WebGLRenderingContext.STATIC_DRAW);
                dc.frameStatistics.incrementVboLoadCount(1);
                gl.vertexAttribPointer(program.vertexPointLocation, 3, WebGLRenderingContext.FLOAT, false, 0, 0);
                gl.drawArrays(WebGLRenderingContext.LINES, 0, 2);
            }

            // Turn off depth testing for the placemark image if requested. The placemark label and leader line have
            // their own depth-test controls.
            if (!this.activeAttributes.depthTest) {
                depthTest = false;
                gl.disable(WebGLRenderingContext.DEPTH_TEST);
            }

            // Suppress frame buffer writes for the placemark image and its label.
            gl.depthMask(false);

            gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, dc.unitQuadBuffer3());
            gl.vertexAttribPointer(program.vertexPointLocation, 3, WebGLRenderingContext.FLOAT, false, 0, 0);

            // Compute and specify the MVP matrix.
            Placemark.matrix.copy(dc.screenProjection);
            Placemark.matrix.multiplyMatrix(this.imageTransform);
            program.loadModelviewProjection(gl, Placemark.matrix);

            // Enable texture for both normal display and for picking. If picking is enabled in the shader (set in
            // beginDrawing() above) then the texture's alpha component is still needed in order to modulate the
            // pick color to mask off transparent pixels.
            program.loadTextureEnabled(gl, true);

            if (dc.pickingMode) {
                program.loadColor(gl, this.pickColor);
            } else {
                program.loadColor(gl, this.activeAttributes.imageColor);
            }

            this.texCoordMatrix.setToIdentity();
            if (this.activeTexture) {
                this.texCoordMatrix.multiplyByTextureTransform(this.activeTexture);
            }
            program.loadTextureMatrix(gl, this.texCoordMatrix);

            if (this.activeTexture && this.activeTexture != Placemark.currentTexture) { // avoid unnecessary texture state changes
                textureBound = this.activeTexture.bind(dc); // returns false if active texture is null or cannot be bound
                program.loadTextureEnabled(gl, textureBound);
                Placemark.currentTexture = this.activeTexture;
            }

            // Draw the placemark's image quad.
            gl.drawArrays(WebGLRenderingContext.TRIANGLE_STRIP, 0, 4);

            if (this.mustDrawLabel()) {
                Placemark.matrix.copy(dc.screenProjection);
                Placemark.matrix.multiplyMatrix(this.labelTransform);
                program.loadModelviewProjection(gl, Placemark.matrix);

                if (!dc.pickingMode && this.labelTexture) {
                    this.texCoordMatrix.setToIdentity();
                    this.texCoordMatrix.multiplyByTextureTransform(this.labelTexture);

                    program.loadTextureMatrix(gl, this.texCoordMatrix);
                    program.loadColor(gl, this.activeAttributes.labelAttributes.color);

                    textureBound = this.labelTexture.bind(dc);
                    program.loadTextureEnabled(gl, textureBound);
                    Placemark.currentTexture = this.labelTexture;
                } else {
                    program.loadTextureEnabled(gl, false);
                    program.loadColor(gl, this.pickColor);
                }

                if (this.activeAttributes.labelAttributes.depthTest && !depthTest) {
                    depthTest = true;
                    gl.enable(WebGLRenderingContext.DEPTH_TEST);
                } else if (depthTest) {
                    depthTest = false;
                    gl.disable(WebGLRenderingContext.DEPTH_TEST);
                }

                gl.drawArrays(WebGLRenderingContext.TRIANGLE_STRIP, 0, 4);
            }

            if (!depthTest) {
                gl.enable(WebGLRenderingContext.DEPTH_TEST);
            }

            gl.depthMask(true);
        };

        // Internal. Intentionally not documented.
        Placemark.prototype.mustDrawLabel = function () {
            return this.label && this.label.length > 0 && this.activeAttributes.labelAttributes;
        };

        // Internal. Intentionally not documented.
        Placemark.prototype.mustDrawLeaderLine = function (dc) {
            return this.activeAttributes.drawLeaderLine && this.activeAttributes.leaderLineAttributes
                && (!dc.pickingMode || this.enableLeaderLinePicking);
        };

        return Placemark;
    });