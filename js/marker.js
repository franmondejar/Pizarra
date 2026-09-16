AFRAME.registerComponent("xr-marker", {

    init: function () {

        // ===============================
        // ESTADO
        // ===============================

        this.markerEnabled = false;
        this.isDrawing = false;
        this.touching = false;

        this.lastX = null;
        this.lastY = null;


        // ===============================
        // PIZARRA
        // ===============================

        this.board = null;
        this.boardMesh = null;

        this.boardWidth = 2.4;
        this.boardHeight = 1.35;


        // ===============================
        // CANVAS
        // ===============================

        this.canvas = null;
        this.ctx = null;
        this.texture = null;

        this.canvasWidth = 2048;
        this.canvasHeight = 1152;


        // ===============================
        // ROTULADOR
        // ===============================

        this.tip = null;

        this.tipWorld =
            new THREE.Vector3();

        this.localPoint =
            new THREE.Vector3();


        // Zona de contacto:
        // 4 cm delante/detrás del plano

        this.contactDistance = 0.04;


        // ===============================
        // EVENTOS
        // ===============================

        this.toggleMarker =
            this.toggleMarker.bind(this);

        this.el.addEventListener(
            "triggerdown",
            this.toggleMarker
        );


        // Algunos controladores/WebXR pueden
        // entregar selectstart de forma más fiable.

        this.el.addEventListener(
            "selectstart",
            this.toggleMarker
        );


        this.el.sceneEl.addEventListener(
            "loaded",
            () => this.setup()
        );


        // Por si la escena ya estaba cargada

        if (this.el.sceneEl.hasLoaded) {

            this.setup();
        }
    },


    setup: function () {

        if (this.boardMesh) {
            return;
        }


        this.board =
            document.querySelector(
                "#boardSurface"
            );

        this.tip =
            document.querySelector(
                "#markerTip"
            );


        if (!this.board || !this.tip) {

            console.error(
                "No se encontró pizarra o punta."
            );

            return;
        }


        this.boardMesh =
            this.board.getObject3D("mesh");


        if (!this.boardMesh) {

            // A-Frame puede tardar un instante
            // en crear el mesh.

            setTimeout(
                () => this.setup(),
                100
            );

            return;
        }


        this.createCanvas();

        console.log(
            "Pizarra V0.0.1 preparada."
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


        // Rotulador negro

        this.ctx.strokeStyle =
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


    toggleMarker: function (event) {

        // Evita doble activación si Quest
        // dispara triggerdown y selectstart
        // prácticamente simultáneamente.

        const now =
            performance.now();


        if (
            this.lastToggle &&
            now - this.lastToggle < 250
        ) {
            return;
        }


        this.lastToggle = now;


        this.markerEnabled =
            !this.markerEnabled;


        this.stopDrawing();

        this.updateTipColor();


        console.log(
            "ROTULADOR",
            this.markerEnabled
                ? "ON"
                : "OFF"
        );
    },


    updateTipColor: function () {

        if (!this.tip) {
            return;
        }


        let color = "#808080";


        // OFF = gris

        if (this.markerEnabled) {

            // ON = negro

            color = "#111111";
        }


        if (
            this.markerEnabled &&
            this.touching
        ) {

            // CONTACTO = rojo

            color = "#FF0000";
        }


        this.tip.setAttribute(
            "color",
            color
        );
    },


    tick: function () {

        if (
            !this.boardMesh ||
            !this.tip ||
            !this.ctx
        ) {
            return;
        }


        // ===============================
        // POSICIÓN REAL DE LA PUNTA
        // ===============================

        this.tip.object3D.getWorldPosition(
            this.tipWorld
        );


        // Convertimos esa posición mundial
        // al espacio local de la pizarra.

        this.localPoint.copy(
            this.tipWorld
        );


        this.boardMesh.worldToLocal(
            this.localPoint
        );


        const halfWidth =
            this.boardWidth / 2;

        const halfHeight =
            this.boardHeight / 2;


        // ===============================
        // ¿ESTÁ DENTRO DE LA PIZARRA?
        // ===============================

        const insideX =
            this.localPoint.x >= -halfWidth &&
            this.localPoint.x <= halfWidth;


        const insideY =
            this.localPoint.y >= -halfHeight &&
            this.localPoint.y <= halfHeight;


        const closeToSurface =
            Math.abs(
                this.localPoint.z
            ) <= this.contactDistance;


        const wasTouching =
            this.touching;


        this.touching =
            insideX &&
            insideY &&
            closeToSurface;


        if (
            wasTouching !==
            this.touching
        ) {

            this.updateTipColor();
        }


        // ===============================
        // NO ESCRIBIR SI ESTÁ OFF
        // ===============================

        if (!this.markerEnabled) {

            this.stopDrawing();

            return;
        }


        // ===============================
        // NO HAY CONTACTO
        // ===============================

        if (!this.touching) {

            this.stopDrawing();

            return;
        }


        // ===============================
        // PIZARRA → CANVAS
        // ===============================

        const u =
            (
                this.localPoint.x +
                halfWidth
            )
            /
            this.boardWidth;


        const v =
            (
                this.localPoint.y +
                halfHeight
            )
            /
            this.boardHeight;


        const x =
            u *
            this.canvasWidth;


        const y =
            (1 - v) *
            this.canvasHeight;


        this.draw(
            x,
            y
        );
    },


    draw: function (x, y) {

        // Primer punto del trazo

        if (!this.isDrawing) {

            this.isDrawing = true;

            this.lastX = x;
            this.lastY = y;


            // Dibujamos también un punto.
            // Así un simple toque deja marca.

            this.ctx.beginPath();

            this.ctx.arc(
                x,
                y,
                4,
                0,
                Math.PI * 2
            );

            this.ctx.fillStyle =
                "#111111";

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
    }

});
