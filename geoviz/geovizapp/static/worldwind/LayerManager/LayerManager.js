/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports LayerManager
 * @version $Id: LayerManager.js 2764 2015-02-09 23:54:59Z tgaskins $
 */
define(function () {
    "use strict";

    /**
     * Constructs a layer manager for a specified {@link WorldWindow}.
     * @alias LayerManager
     * @constructor
     * @classdesc Provides a layer manager to interactively control layer visibility for a World Window.
     * @param {String} layerManagerName The name of the layer manager div in the HTML document. This layer manager
     * will populate that element with an unordered list containing list items for each layer in the specified
     * World Window's layer list. To keep the layer manager in synch with the World Window, the application must call
     * this layer manager's [update]{@link LayerManager#update} method when the contents of the World Window's layer
     * list changes. The application should also call [update]{@link LayerManager#update} after each frame in order
     * to keep the layer visibility indicator in synch with the rendered frame.
     * @param {WorldWindow} worldWindow The World Window to associated this layer manager with.
     */
    var LayerManager = function (layerManagerName, worldWindow) {
        this.layerManagerName = layerManagerName;
        this.wwd = worldWindow;

        // Add a redraw callback in order to update the layer visibility state for each frame.
        var layerManger = this;
        this.wwd.redrawCallbacks.push(function (wwd) {
            layerManger.update();
        });

        // Initially populate the controls.
        this.update();
    };

    LayerManager.prototype.update = function () {
        this.updateProjectionControl();
        this.updateLayers();
    };

    LayerManager.prototype.updateProjectionControl = function () {
        var layerManager = this,
            lm = document.querySelector('#' + this.layerManagerName),
            projectionDiv = lm.querySelector("#projectionDiv"),
            selections = ["3D", "Equirectangular", "Mercator", "North Polar", "South Polar", "North UPS", "South UPS"],
            form, div, label, option;

        // If no projection div, create one.
        if (!projectionDiv) {
            lm.className = "layerManager";

            projectionDiv = document.createElement('div');
            projectionDiv.id = "projectionDiv";
            projectionDiv.className = "projectionDivOuter";
            lm.appendChild(projectionDiv);

            form = document.createElement('form');
            form.className = "projectionForm";
            projectionDiv.appendChild(form);

            div = document.createElement("div");
            div.className = "projectionDivInner";
            form.appendChild(div);

            label = document.createElement("label");
            label.for = "projection";
            label.innerHTML = "Projection";
            label.className = "projectionLabel";
            div.appendChild(label);

            this.projectionSelect = document.createElement("select");
            this.projectionSelect.id = "projection";
            div.appendChild(this.projectionSelect);

            for (var s = 0; s < selections.length; s++) {
                option = document.createElement("option");
                option.value = selections[s];
                option.innerHTML = option.value;
                this.projectionSelect.appendChild(option);
            }

            this.projectionSelect.addEventListener("change", function (e) {
                layerManager.onProjectionChange(e);
            }, false);
        }

        var currentGlobe = this.wwd.globe;

        if (currentGlobe instanceof WorldWind.Globe2D) {
            this.flatGlobe = this.wwd.globe;
            var projection = this.wwd.globe.projection;
            if (projection instanceof WorldWind.ProjectionEquirectangular) {
                this.projectionSelect.selectedIndex = selections.indexOf("Equirectangular");
            } else if (projection instanceof WorldWind.ProjectionMercator) {
                this.projectionSelect.selectedIndex = selections.indexOf("Mercator");
            } else if (projection instanceof WorldWind.ProjectionPolarEquidistant) {
                if (projection.pole === "North") {
                    this.projectionSelect.selectedIndex = selections.indexOf("North Polar");
                } else if (projection.pole === "South") {
                    this.projectionSelect.selectedIndex = selections.indexOf("South Polar");
                }
            } else if (projection instanceof WorldWind.ProjectionUPS) {
                if (projection.pole === "North") {
                    this.projectionSelect.selectedIndex = selections.indexOf("North UPS");
                } else if (projection.pole === "South") {
                    this.projectionSelect.selectedIndex = selections.indexOf("South UPS");
                }
            }
        } else {
            this.roundGlobe = this.wwd.globe;
            this.projectionSelect.selectedIndex = selections.indexOf("3D");
        }
    };

    /**
     * Synchronizes this layer manager with its associated World Window. This method should be called whenever the
     * World Window's layer list changes as well as after each rendering frame.
     */
    LayerManager.prototype.updateLayers = function () {
        var layerManager = this,
            layerList = this.wwd.layers,
            lm = document.querySelector('#' + this.layerManagerName),
            layersDiv = document.querySelector("#layersDiv"),
            ul, form, fieldset, legend;

        // If no layers div, create one.
        if (!layersDiv) {
            layersDiv = document.createElement('div');
            layersDiv.id = "layersDiv";
            lm.appendChild(layersDiv);

            form = document.createElement('form');
            layersDiv.appendChild(form);

            fieldset = document.createElement('fieldset');
            fieldset.className = "layersFieldset";
            form.appendChild(fieldset);

            legend = document.createElement('legend');
            //legend.innerHTML = "Layers";
            fieldset.appendChild(legend);

            // Create the layer list.
            ul = document.createElement('ul');
            fieldset.appendChild(ul);
        }

        // Get all the li nodes in the ul.
        var q = [], // queue to contain existing li's for reuse.
            li,
            lis = document.querySelectorAll('li');
        for (var i = 0, liLength = lis.length; i < liLength; i++) {
            q.push(lis[i]);
        }

        // For each layer in the layer list:
        for (var j = 0, llLength = layerList.length; j < llLength; j++) {
            var layer = layerList[j],
                isNewNode = false;

            // Get or create an li element.
            if (q.length > 0) {
                li = q[0];
                q.splice(0, 1);
            } else {
                li = document.createElement('li');
                li.addEventListener('click', function (event) {
                    layerManager.onLayerClick(event);
                });
                isNewNode = true;
            }

            // Set the li's text to the layer's display name.
            if (li.firstChild) {
                li.firstChild.nodeValue = layer.displayName;
            } else {
                li.appendChild(document.createTextNode(layer.displayName));
            }

            // Determine the layer's class and set that on the li.
            if (layer.enabled) {
                li.className = layer.inCurrentFrame ? 'layerVisible' : 'layerEnabled';
            } else {
                li.className = 'layerDisabled';
            }

            if (isNewNode) {
                ul.appendChild(li);
            }
        }

        // Remove unused existing li's.
        if (q.length > 0) {
            for (var k = 0, qLength = q.length; k < qLength; k++) {
                ul.removeChild(q[k]);
            }
        }
    };

    /**
     * Event handler for click events on this layer manager's list items.
     * @param {Event} event The click event that occurred.
     */
    LayerManager.prototype.onLayerClick = function (event) {
        var layerName = event.target.firstChild.nodeValue;

        // Update the layer state for each layer in the current layer list.
        for (var i = 0, len = this.wwd.layers.length; i < len; i++) {
            var layer = this.wwd.layers[i];
            if (layer.displayName === layerName) {
                layer.enabled = !layer.enabled;
                this.update();
                this.wwd.redraw();
            }
        }
    };

    LayerManager.prototype.onProjectionChange = function (event) {
        var projectionName = event.target.value;

        if (projectionName === "3D") {
            if (!this.roundGlobe) {
                this.roundGlobe = new WorldWind.Globe(new WorldWind.EarthElevationModel());
            }

            if (this.wwd.globe !== this.roundGlobe) {
                this.wwd.globe = this.roundGlobe;
            }
        } else {
            if (!this.flatGlobe) {
                this.flatGlobe = new WorldWind.Globe2D();
            }

            if (projectionName === "Equirectangular") {
                this.flatGlobe.projection = new WorldWind.ProjectionEquirectangular();
            } else if (projectionName === "Mercator") {
                this.flatGlobe.projection = new WorldWind.ProjectionMercator();
            } else if (projectionName === "North Polar") {
                this.flatGlobe.projection = new WorldWind.ProjectionPolarEquidistant("North");
            } else if (projectionName === "South Polar") {
                this.flatGlobe.projection = new WorldWind.ProjectionPolarEquidistant("South");
            } else if (projectionName === "North UPS") {
                this.flatGlobe.projection = new WorldWind.ProjectionUPS("North");
            } else if (projectionName === "South UPS") {
                this.flatGlobe.projection = new WorldWind.ProjectionUPS("South");
            }

            if (this.wwd.globe !== this.flatGlobe) {
                this.wwd.globe = this.flatGlobe;
            }
        }

        this.updateProjectionControl();
        this.wwd.redraw();
    };

    return LayerManager;
});