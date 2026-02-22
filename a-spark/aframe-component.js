/**
 * A-Spark: A-Frame Gaussian Splat Component
 * 
 * Registers the 'gaussian-splat' component for A-Frame.
 * Uses SparkRenderer (added once per scene) + SplatMesh per entity.
 * 
 * Usage:
 *   <a-entity gaussian-splat="url: path/to/file.spz"></a-entity>
 *   <a-entity gaussian-splat="url: file.spz; scale: 1 -1 -1; opacity: 0.8"></a-entity>
 */

// Scene-level system to manage the shared SparkRenderer
if (typeof AFRAME !== 'undefined') {

    AFRAME.registerSystem('gaussian-splat', {
        schema: {},

        init: function () {
            this.sparkRenderer = null;
            this.splatMeshes = [];
            this._rendererReady = false;

            // We need to wait for the scene's renderer to be available
            this.el.addEventListener('renderstart', () => {
                this._initSparkRenderer();
            });
        },

        _initSparkRenderer: function () {
            if (this.sparkRenderer) return;

            const sceneEl = this.el;
            const renderer = sceneEl.renderer;

            if (!renderer) {
                console.warn('[A-Spark] No WebGL renderer found yet, retrying...');
                setTimeout(() => this._initSparkRenderer(), 100);
                return;
            }

            try {
                this.sparkRenderer = new SparkRenderer({
                    renderer: renderer,
                    premultipliedAlpha: true,
                    autoUpdate: true
                });

                // Add SparkRenderer to the Three.js scene
                sceneEl.object3D.add(this.sparkRenderer);
                this._rendererReady = true;

                console.log('[A-Spark] SparkRenderer initialized');

                // Process any queued splat meshes
                this.splatMeshes.forEach(entry => {
                    if (entry.mesh && !entry.added) {
                        sceneEl.object3D.add(entry.mesh);
                        entry.added = true;
                    }
                });
            } catch (err) {
                console.error('[A-Spark] Failed to initialize SparkRenderer:', err);
            }
        },

        registerSplatMesh: function (mesh, component) {
            const entry = { mesh, component, added: false };
            this.splatMeshes.push(entry);

            if (this._rendererReady) {
                this.el.object3D.add(mesh);
                entry.added = true;
            }

            return entry;
        },

        unregisterSplatMesh: function (entry) {
            const idx = this.splatMeshes.indexOf(entry);
            if (idx !== -1) {
                this.splatMeshes.splice(idx, 1);
            }

            if (entry.mesh && entry.added) {
                this.el.object3D.remove(entry.mesh);
            }
        }
    });


    AFRAME.registerComponent('gaussian-splat', {
        schema: {
            url: { type: 'string', default: '' },
            opacity: { type: 'number', default: 1.0 },
            // Scale override: use "1 -1 -1" for World Labs exports (upside-down fix)
            splatScale: { type: 'vec3', default: { x: 1, y: 1, z: 1 } },
            // Cutoff for max SH level (0-3)
            maxSh: { type: 'int', default: 3 },
            // Whether the splat is editable (allows SplatEdits)
            editable: { type: 'boolean', default: true }
        },

        init: function () {
            this._splatMesh = null;
            this._systemEntry = null;
            this._loaded = false;

            if (this.data.url) {
                this._createSplat();
            }
        },

        update: function (oldData) {
            const data = this.data;

            // URL changed — rebuild
            if (oldData.url !== undefined && oldData.url !== data.url) {
                this._destroySplat();
                if (data.url) {
                    this._createSplat();
                }
                return;
            }

            // Live-update properties
            if (this._splatMesh) {
                if (oldData.opacity !== data.opacity) {
                    this._splatMesh.opacity = data.opacity;
                }
                if (oldData.maxSh !== data.maxSh) {
                    this._splatMesh.maxSh = data.maxSh;
                    this._splatMesh.updateGenerator();
                }
            }
        },

        remove: function () {
            this._destroySplat();
        },

        _createSplat: function () {
            const data = this.data;
            const system = this.system;

            const splat = new SplatMesh({
                url: data.url,
                editable: data.editable,
                onLoad: (mesh) => {
                    this._loaded = true;
                    this.el.emit('splat-loaded', { mesh: mesh }, false);
                    console.log(`[A-Spark] Splat loaded: ${data.url} (${mesh.numSplats} splats)`);
                }
            });

            // Apply scale (e.g., for upside-down World Labs exports)
            splat.scale.set(data.splatScale.x, data.splatScale.y, data.splatScale.z);

            // Apply opacity
            splat.opacity = data.opacity;

            // Apply max SH
            splat.maxSh = data.maxSh;

            this._splatMesh = splat;

            // Register with the system's SparkRenderer
            this._systemEntry = system.registerSplatMesh(splat, this);

            // Also parent under this entity's Object3D so transforms work
            // The system adds it to the scene root for SparkRenderer,
            // but we sync position/rotation/scale from the entity
            this._syncTransform();
        },

        _syncTransform: function () {
            if (!this._splatMesh) return;

            // Get the world matrix from the A-Frame entity
            const obj = this.el.object3D;
            obj.updateMatrixWorld(true);

            // Copy the entity's position/rotation to the splat mesh
            this._splatMesh.position.copy(obj.getWorldPosition(new THREE.Vector3()));
            this._splatMesh.quaternion.copy(obj.getWorldQuaternion(new THREE.Quaternion()));

            // Scale combines entity scale + splat scale
            const entityScale = obj.getWorldScale(new THREE.Vector3());
            this._splatMesh.scale.set(
                entityScale.x * this.data.splatScale.x,
                entityScale.y * this.data.splatScale.y,
                entityScale.z * this.data.splatScale.z
            );
        },

        tick: function () {
            this._syncTransform();
        },

        _destroySplat: function () {
            if (this._systemEntry) {
                this.system.unregisterSplatMesh(this._systemEntry);
                this._systemEntry = null;
            }

            if (this._splatMesh) {
                this._splatMesh.dispose();
                this._splatMesh = null;
            }

            this._loaded = false;
        }
    });

    console.log('[A-Spark] A-Frame components registered: gaussian-splat');
}
