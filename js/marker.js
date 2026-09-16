AFRAME.registerComponent("xr-ray-marker", {

    init: function () {

        // =========================================
        // ESTADO
        // =========================================

        this.triggerPressed = false;
        this.isDrawing = false;

        this.mode = "marker";

        this.lastX = null;
        this.lastY = null;

        this.filteredX = null;
        this.filteredY = null;

        // Suavizado ligero.
        // Más alto = sigue más directamente la mano.
        // Más bajo = más suave, pero más retraso.
        this.smoothing = 0.55;


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

        this.markerWidth = 8;
        this.eraserWidth = 45;


        // =========================================
        // GATILLO
        // =========================================

        this.el.addEventListener(
            "triggerdown",
            () => {

                this.triggerPressed = true;

                this.updateRayColor();
            }
        );


        this.el.addEventListener(
            "triggerup",
            () => {

                this.triggerPressed = false;

                this.stopDrawing();

                this.setRayColor("#808080");
            }
        );


        // =========================================
        // BOTÓN A = ROTULADOR / GOMA
        // =========================================

        this.el.addEventListener(
            "abuttondown",
            () => {

                if (this.mode === "marker") {

                    this.mode = "eraser";

                    console.log("MODO GOMA");

                } else {

                    this.mode = "marker";

                    console.log("MODO ROTULADOR");
                }


                this.stopDrawing();

                this.updateRayColor();
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
            "V0.0.3 preparada — suavizado + goma."
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


        // Configuración general

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

        if (
            !this.triggerPressed ||
            !this.ctx ||
            !this.texture
        ) {

            return;
        }


        const raycasterComponent =
            this.el.components.raycaster;


        if (!raycasterComponent) {

            this.stopDrawing();

            return;
        }


        const intersection =
            raycasterComponent.getIntersection(
                this.board
            );


        if (
            !intersection ||
            !intersection.uv
        ) {

            this.stopDrawing();

            return;
        }


        // =========================================
        // UV → CANVAS
        // =========================================

        const rawX =
            intersection.uv.x *
            this.canvasWidth;

        const rawY =
            (1 - intersection.uv.y) *
            this.canvasHeight;


        // =========================================
        // FILTRO DE SUAVIZADO
        // =========================================

        if (
            this.filteredX === null ||
            this.filteredY === null
        ) {

            this.filteredX = rawX;
            this.filteredY = rawY;

        } else {

            this.filteredX +=
                (rawX - this.filteredX) *
                this.smoothing;

            this.filteredY +=
                (rawY - this.filteredY) *
                this.smoothing;
        }


        this.draw(
            this.filteredX,
            this.filteredY
        );
    },


    draw: function (x, y) {

        // =========================================
        // CONFIGURAR HERRAMIENTA
        // =========================================

        if (this.mode === "eraser") {

            this.ctx.strokeStyle =
                "#FFFFFF";

            this.ctx.fillStyle =
                "#FFFFFF";

            this.ctx.lineWidth =
                this.eraserWidth;

        } else {

            this.ctx.strokeStyle =
                "#111111";

            this.ctx.fillStyle =
                "#111111";

            this.ctx.lineWidth =
                this.markerWidth;
        }


        // =========================================
        // PRIMER PUNTO
        // =========================================

        if (!this.isDrawing) {

            this.isDrawing = true;

            this.lastX = x;
            this.lastY = y;


            this.ctx.beginPath();

            this.ctx.arc(
                x,
                y,
                this.ctx.lineWidth / 2,
                0,
                Math.PI * 2
            );

            this.ctx.fill();


            this.texture.needsUpdate =
                true;

            return;
        }


        // =========================================
        // TRAZO SUAVIZADO
        // =========================================

        const midX =
            (this.lastX + x) / 2;

        const midY =
            (this.lastY + y) / 2;


        this.ctx.beginPath();

        this.ctx.moveTo(
            this.lastX,
            this.lastY
        );


        this.ctx.quadraticCurveTo(
            this.lastX,
            this.lastY,
            midX,
            midY
        );


        this.ctx.stroke();


        this.lastX = midX;
        this.lastY = midY;


        this.texture.needsUpdate =
            true;
    },


    stopDrawing: function () {

        this.isDrawing = false;

        this.lastX = null;
        this.lastY = null;

        this.filteredX = null;
        this.filteredY = null;
    },


    updateRayColor: function () {

        if (!this.triggerPressed) {

            this.setRayColor("#808080");

            return;
        }


        if (this.mode === "eraser") {

            this.setRayColor("#D32F2F");

        } else {

            this.setRayColor("#111111");
        }
    },


    setRayColor: function (color) {

        this.el.setAttribute(
            "line",
            "color",
            color
        );
    }

});
