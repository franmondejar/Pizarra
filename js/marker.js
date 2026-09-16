AFRAME.registerComponent("xr-ray-marker", {

    init: function () {

        // =========================================
        // ESTADO
        // =========================================

        this.markerEnabled = false;
        this.isDrawing = false;

        this.lastX = null;
        this.lastY = null;


        // =========================================
        // PIZARRA
        // =========================================

        this.board =
            document.querySelector("#boardSurface");

        this.boardMesh = null;


        // =========================================
        // CANVAS
        // =========================================

        this.canvas = null;
        this.ctx = null;
        this.texture = null;

        this.canvasWidth = 2048;
        this.canvasHeight = 1152;


        // =========================================
        // GATILLO = INTERRUPTOR ON / OFF
        // =========================================

        this.el.addEventListener(
            "triggerdown",
            () => {

                this.markerEnabled =
                    !this.markerEnabled;


                if (this.markerEnabled) {

                    // ROTULADOR ON
                    this.setRayColor("#111111");

                    console.log(
                        "ROTULADOR ON"
                    );

                } else {

                    // ROTULADOR OFF
                    this.setRayColor("#808080");

                    this.stopDrawing();

                    console.log(
                        "ROTULADOR OFF"
                    );
                }
            }
        );


        // =========================================
        // PREPARAR PIZARRA
        // =========================================

        if (this.el.sceneEl.hasLoaded) {

            this.setupBoard();

        } else {

            this.el.sceneEl.addEventListener(
                "loaded",
                () => this.setupBoard()
            );
        }
    },


    setupBoard: function () {

        if (!this.board) {

            console.error(
                "No se encontró #boardSurface"
            );

            return;
        }


        this.boardMesh =
            this.board.getObject3D("mesh");


        if (!this.boardMesh) {

            setTimeout(
                () => this.setupBoard(),
                100
            );

            return;
        }


        this.createCanvas();


        console.log(
            "Rotulador ON/OFF preparado."
        );
    },


    createCanvas: function () {

        this.canvas =
            document.createElement("canvas");


        this.canvas.width =
            this.canvasWidth;

        this.canvas.height =
            this.canvasHeight;


        this.ctx =
            this.canvas.getContext("2d");


        // Fondo blanco

        this.ctx.fillStyle =
            "#FFFFFF";

        this.ctx.fillRect(
            0,
            0,
            this.canvasWidth,
            this.canvasHeight
        );


        // Rotulador

        this.ctx.strokeStyle =
            "#111111";

        this.ctx.fillStyle =
            "#111111";

        this.ctx.lineWidth = 8;

        this.ctx.lineCap =
            "round";

        this.ctx.lineJoin =
            "round";


        // Textura

        this.texture =
            new THREE.CanvasTexture(
                this.canvas
            );


        if ("colorSpace" in this.texture) {

            this.texture.colorSpace =
                THREE.SRGBColorSpace;
        }


        this.texture.needsUpdate =
            true;


        this.boardMesh.material.map =
            this.texture;

        this.boardMesh.material.color.set(
            0xffffff
        );

        this.boardMesh.material.needsUpdate =
            true;
    },


    tick: function () {

        // =========================================
        // ROTULADOR APAGADO
        // =========================================

        if (!this.markerEnabled) {

            return;
        }


        if (
            !this.ctx ||
            !this.texture
        ) {

            return;
        }


        // =========================================
        // RAYCASTER
        // =========================================

        const raycasterComponent =
            this.el.components.raycaster;


        if (!raycasterComponent) {

            this.stopDrawing();

            return;
        }


        // =========================================
        // INTERSECCIÓN
        // =========================================

        const intersection =
            raycasterComponent.getIntersection(
                this.board
            );


        if (!intersection) {

            this.stopDrawing();

            return;
        }


        if (!intersection.uv) {

            this.stopDrawing();

            return;
        }


        // =========================================
        // UV → CANVAS
        // =========================================

        const u =
            intersection.uv.x;

        const v =
            intersection.uv.y;


        const x =
            u * this.canvasWidth;


        const y =
            (1 - v) *
            this.canvasHeight;


        // =========================================
        // DIBUJAR
        // =========================================

        this.draw(
            x,
            y
        );
    },


    draw: function (x, y) {

        // Primer punto

        if (!this.isDrawing) {

            this.isDrawing = true;

            this.lastX = x;
            this.lastY = y;


            this.ctx.beginPath();

            this.ctx.arc(
                x,
                y,
                4,
                0,
                Math.PI * 2
            );

            this.ctx.fill();


            this.texture.needsUpdate =
                true;

            return;
        }


        // Segmento

        this.ctx.beginPath();


        this.ctx.moveTo(
            this.lastX,
            this.lastY
        );


        this.ctx.lineTo(
            x,
            y
        );


        this.ctx.stroke();


        this.lastX = x;
        this.lastY = y;


        this.texture.needsUpdate =
            true;
    },


    stopDrawing: function () {

        this.isDrawing = false;

        this.lastX = null;
        this.lastY = null;
    },


    setRayColor: function (color) {

        this.el.setAttribute(
            "line",
            "color",
            color
        );
    }

});
