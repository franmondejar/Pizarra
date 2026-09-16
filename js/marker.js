AFRAME.registerComponent("xr-marker", {

    init: function () {

        this.markerEnabled = false;
        this.isDrawing = false;

        this.lastX = null;
        this.lastY = null;

        this.board = null;
        this.boardMesh = null;

        this.canvas = null;
        this.ctx = null;
        this.texture = null;

        this.tipWorld = new THREE.Vector3();
        this.localPoint = new THREE.Vector3();

        // Tamaño físico de la pizarra
        this.boardWidth = 2.4;
        this.boardHeight = 1.35;

        // Resolución interna
        this.canvasWidth = 2048;
        this.canvasHeight = 1152;

        // Distancia considerada "contacto"
        this.contactDistance = 0.025;

        // Grosor inicial
        this.lineWidth = 6;

        this.el.addEventListener(
            "triggerdown",
            this.toggleMarker.bind(this)
        );

        this.el.sceneEl.addEventListener(
            "loaded",
            this.setupBoard.bind(this)
        );
    },


    setupBoard: function () {

        this.board =
            document.querySelector("#boardSurface");

        if (!this.board) {
            console.error("No se encontró la pizarra.");
            return;
        }

        this.boardMesh =
            this.board.getObject3D("mesh");

        if (!this.boardMesh) {
            console.error("No se encontró el mesh de la pizarra.");
            return;
        }


        // ================================
        // CREAR CANVAS
        // ================================

        this.canvas =
            document.createElement("canvas");

        this.canvas.width =
            this.canvasWidth;

        this.canvas.height =
            this.canvasHeight;

        this.ctx =
            this.canvas.getContext("2d");


        // Fondo blanco

        this.ctx.fillStyle = "#FFFFFF";

        this.ctx.fillRect(
            0,
            0,
            this.canvasWidth,
            this.canvasHeight
        );


        // Configuración del trazo

        this.ctx.strokeStyle = "#111111";

        this.ctx.lineWidth =
            this.lineWidth;

        this.ctx.lineCap = "round";

        this.ctx.lineJoin = "round";


        // ================================
        // TEXTURA THREE.JS
        // ================================

        this.texture =
            new THREE.CanvasTexture(this.canvas);

        this.texture.colorSpace =
            THREE.SRGBColorSpace;

        this.texture.needsUpdate = true;


        // Aplicar textura

        this.boardMesh.material.map =
            this.texture;

        this.boardMesh.material.color.set(
            0xffffff
        );

        this.boardMesh.material.needsUpdate =
            true;

        console.log(
            "Pizarra XR preparada."
        );
    },


    toggleMarker: function () {

        this.markerEnabled =
            !this.markerEnabled;

        const tip =
            document.querySelector("#markerTip");

        if (tip) {

            tip.setAttribute(
                "color",
                this.markerEnabled
                    ? "#111111"
                    : "#777777"
            );
        }

        this.stopDrawing();

        console.log(
            "Rotulador:",
            this.markerEnabled
                ? "ON"
                : "OFF"
        );
    },


    tick: function () {

        if (
            !this.markerEnabled ||
            !this.boardMesh ||
            !this.ctx
        ) {
            return;
        }


        // ================================
        // POSICIÓN MUNDIAL DE LA PUNTA
        // ================================

        const tip =
            document.querySelector("#markerTip");

        if (!tip) {
            return;
        }

        tip.object3D.getWorldPosition(
            this.tipWorld
        );


        // ================================
        // CONVERTIR A COORDENADAS
        // LOCALES DE LA PIZARRA
        // ================================

        this.localPoint.copy(
            this.tipWorld
        );

        this.boardMesh.worldToLocal(
            this.localPoint
        );


        // Distancia perpendicular
        // respecto al plano

        const distance =
            Math.abs(this.localPoint.z);


        // ================================
        // COMPROBAR LÍMITES
        // ================================

        const halfWidth =
            this.boardWidth / 2;

        const halfHeight =
            this.boardHeight / 2;


        const insideBoard =
            this.localPoint.x >= -halfWidth &&
            this.localPoint.x <= halfWidth &&
            this.localPoint.y >= -halfHeight &&
            this.localPoint.y <= halfHeight;


        const touching =
            insideBoard &&
            distance <= this.contactDistance;


        if (!touching) {

            this.stopDrawing();

            return;
        }


        // ================================
        // COORDENADAS PIZARRA → CANVAS
        // ================================

        const u =
            (this.localPoint.x + halfWidth)
            / this.boardWidth;

        const v =
            (this.localPoint.y + halfHeight)
            / this.boardHeight;


        const x =
            u * this.canvasWidth;

        const y =
            (1 - v) * this.canvasHeight;


        this.draw(x, y);
    },


    draw: function (x, y) {

        if (!this.isDrawing) {

            this.isDrawing = true;

            this.lastX = x;
            this.lastY = y;

            return;
        }


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
    }

});