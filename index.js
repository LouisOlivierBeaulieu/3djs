const BACKGROUND_COL = "#3c3c3c";
const LINE_COL = "#813d9c"
const POINT_COL = "#c061cb"
const X_AXIS_COL = "#E01B24";
const Y_AXIS_COL = "#33d17a";
const Z_AXIS_COL = "#3584e4";

const FPS = 60;

const NO_ROT = "NO_ROT";
const ROT_LEFT = "ROT_LEFT";
const ROT_RIGHT = "ROT_RIGHT";
const ROT_UP = "ROT_UP";
const ROT_DOWN = "ROT_DOWN";
const ROT_INCREMENT = 0.03;

const NO_TRANSLATION = "NO_TRANSLATION";
const TRANSLATION_LEFT = "TRANSLATION_LEFT";
const TRANSLATION_RIGHT = "TRANSLATION_RIGHT";
const TRANSLATION_UP = "TRANSLATION_UP";
const TRANSLATION_DOWN = "TRANSLATION_DOWN";
const TRANSLATION_INCREMENT = 0.01;

const DRAW_SHAPE_POINT = "point";
const DRAW_SHAPE_LINE = "line";

const Z_NEAR = 0.01;

const X_AXIS = {p1: {x: -1, y: 0, z: 0}, p2: {x: 1, y: 0, z: 0}};
const Y_AXIS = {p1: {x: 0, y: -1, z: 0}, p2: {x: 0, y: 1, z: 0}};
const Z_AXIS = {p1: {x: 0, y: 0, z: -1}, p2: {x: 0, y: 0, z: 1}};

let points = [];

let lines = [];


let mousePoint = null;

let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

let dx = 0;
let dy = 0;    
let dz = 1;
let angleXZ =  Math.PI + 0.5;
let angleYZ = - Math.PI / 8;
let rotDirectionXZ = NO_ROT;
let rotDirectionYZ = NO_ROT;
let translationDirectionX = NO_TRANSLATION;
let translationDirectionY = NO_TRANSLATION;
let pointsAdded = 0;
let drawShape = DRAW_SHAPE_POINT;
let isAxisShown = true;
let isPengerShown = false;
let isPointsShown = true;

canvas.width = 750;
canvas.height = 750;


function handleShowPointChange(checkBox) {
    isPointsShown = checkBox.checked;
}

function handlePengerChange(checkBox) {
    isPengerShown = checkBox.checked;
}

function handleDrawShapeChange(radio) {
    drawShape = radio.value;
}

function handleShowAxisChange(checkBox) {
    isAxisShown = checkBox.checked;
}

function handleAxisLenChange(inputElem) {
    let len = parseFloat(inputElem.value);
    
    if (!len) {
        len = 10;
    }

    X_AXIS.p1.x = -inputElem.value;
    X_AXIS.p2.x = inputElem.value;
    Y_AXIS.p1.y = -inputElem.value;
    Y_AXIS.p2.y = inputElem.value;
    Z_AXIS.p1.z = -inputElem.value;
    Z_AXIS.p2.z = inputElem.value;
}

function clear() {
    ctx.fillStyle = BACKGROUND_COL;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function screen(p) {
    return {
        x: (p.x + 1) / 2 * canvas.width,
        y: (- p.y + 1) / 2 * canvas.height,
    }
}

function project(p) {
    let newX = p.x / p.z;
    let newY = p.y / p.z;
    return {x: newX, y: newY};
}

function clipLine(p1, p2) {

    if (p1.z < Z_NEAR && p2.z < Z_NEAR) {
        return null;
    }

    if (p1.z >= Z_NEAR && p2.z >= Z_NEAR) {
        return { p1, p2 };
    }

    const frontP = p1.z >= Z_NEAR ? p1 : p2;
    const backP = p1.z < Z_NEAR ? p1 : p2;


    const t = (Z_NEAR - frontP.z) / (backP.z - frontP.z);

    const intersectionP = {
        x: frontP.x + t * (backP.x - frontP.x),
        y: frontP.y + t * (backP.y - frontP.y),
        z: Z_NEAR
    };

    if (p1.z < Z_NEAR) {
        return { p1: intersectionP, p2: p2 };
    } else {
        return { p1: p1, p2: intersectionP };
    }
}

function translateCamera({x, y, z}) {
    return {x: x + dx, y: y + dy, z: z + dz};
}

function drawPoint(p, d) {
    ctx.strokeStyle = POINT_COL;
    ctx.fillStyle = POINT_COL;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(4 / d, 1) , 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
}

function drawLine(p1, p2) {
    ctx.strokeStyle = LINE_COL;
    ctx.lineWidth = Math.max((1 / dz ), 1);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
}

function rotateXZ({x, y, z}, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return {
        x: x*c-z*s,
        y,
        z: x*s+z*c,
    }
}

function rotateYZ({x, y, z}, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return {
        x,
        y: y*c-z*s,
        z: y*s+z*c,
    }
}


function screenPointTo3D({x, y}) {

    const cX = Math.cos(angleXZ);
    const sX = Math.sin(angleXZ);
        
    const cY = Math.cos(angleYZ);
    const sY = Math.sin(angleYZ);

    let preScreenPoint = {
        x: (x * 2) / canvas.width - 1, 
        y: 1 - (y * 2) / canvas.height
    };
    
    const preProjectionPoint = {
        x: preScreenPoint.x * 0.5,
        y: preScreenPoint.y * 0.5,
        z: 0.5
    };
        
    const preTranslationZPoint = {
        x: preProjectionPoint.x - dx, 
        y: preProjectionPoint.y - dy, 
        z: preProjectionPoint.z - dz
    };
    
    let newPoint = rotateXZ(rotateYZ(preTranslationZPoint, -angleYZ) , -angleXZ)
    
    return newPoint;
}

function drawAxis() {

    ctx.lineWidth = 2;
    
    // ------ x axis ------
    ctx.strokeStyle = X_AXIS_COL;
    let rotatedP1 = rotateYZ(rotateXZ(X_AXIS.p1, angleXZ), angleYZ);
    let translatedP1 = translateCamera(rotatedP1);
    
    let rotatedP2 = rotateYZ(rotateXZ(X_AXIS.p2, angleXZ), angleYZ);
    let translatedP2 = translateCamera(rotatedP2);
    
    let clipped = clipLine(translatedP1, translatedP2);
    
    let p1 = screen(project(clipped.p1));
    let p2 = screen(project(clipped.p2));
    
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    
    // ------ y axis ------
    ctx.strokeStyle = Y_AXIS_COL;
    rotatedP1 = rotateYZ(rotateXZ(Y_AXIS.p1, angleXZ), angleYZ);
    translatedP1 = translateCamera(rotatedP1);
    
    rotatedP2 = rotateYZ(rotateXZ(Y_AXIS.p2, angleXZ), angleYZ);
    translatedP2 = translateCamera(rotatedP2);

    clipped = clipLine(translatedP1, translatedP2);
    
    p1 = screen(project(clipped.p1));
    p2 = screen(project(clipped.p2));
    
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    
    // ------ z axis ------
    ctx.strokeStyle = Z_AXIS_COL;
    rotatedP1 = rotateYZ(rotateXZ(Z_AXIS.p1, angleXZ), angleYZ);
    translatedP1 = translateCamera(rotatedP1);
    
    rotatedP2 = rotateYZ(rotateXZ(Z_AXIS.p2, angleXZ), angleYZ);
    translatedP2 = translateCamera(rotatedP2);

    clipped = clipLine(translatedP1, translatedP2);
    
    p1 = screen(project(clipped.p1));
    p2 = screen(project(clipped.p2));
    
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    

}

document.addEventListener('keydown', (event) => {
    if (event.key === 'd') {
        rotDirectionXZ = ROT_RIGHT;
    } else if (event.key === 'a') {
        rotDirectionXZ = ROT_LEFT;
    }
    
    if (event.key === 'w') {
        rotDirectionYZ = ROT_UP;
    } else if (event.key === 's') {
        rotDirectionYZ = ROT_DOWN;
    }
    
    if (event.key === "ArrowRight") {
        translationDirectionX = TRANSLATION_RIGHT;
    } else if (event.key === "ArrowLeft") {
        translationDirectionX = TRANSLATION_LEFT;
    }
    
    if (event.key === "ArrowUp") {
        translationDirectionY = TRANSLATION_UP;
    } else if (event.key === "ArrowDown") {
        translationDirectionY = TRANSLATION_DOWN;
    }

});

document.addEventListener('keyup', (event) => {
    if (event.key === 'd' || event.key === 'a') {
        rotDirectionXZ = NO_ROT;
    }
    
    if (event.key === 'w' || event.key === 's') {
        rotDirectionYZ = NO_ROT;
    }
    
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        translationDirectionX = NO_TRANSLATION;
    }
    
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        translationDirectionY = NO_TRANSLATION;
    }
});

canvas.addEventListener('wheel', (event) => {
    if (event.deltaY < 0) {
        dz = Math.max(dz - (0.1 * dz), 0.1);
    } else if (event.deltaY > 0) {
        dz = Math.min(dz + (0.1 * dz), 10);
    };
});

canvas.addEventListener('click', (event) => {
    points = [
        ...points, 
        screenPointTo3D({x: event.offsetX, y: event.offsetY})
    ];
    

    if (drawShape === DRAW_SHAPE_LINE) {
        pointsAdded += 1;
    
        if (pointsAdded % 2 === 0) {
            lines = [
                ...lines,
                [points.length - 1, points.length - 2]
            ]
        }
    }
});

canvas.addEventListener('mousemove', (event) => {
    mousePoint = {x: event.offsetX, y: event.offsetY};
});

function updateCameraAngles() {
    if (rotDirectionXZ === ROT_RIGHT) {
        angleXZ -= ROT_INCREMENT;
        angleXZ = angleXZ % (2 * Math.PI);
    } else if (rotDirectionXZ === ROT_LEFT) {
        angleXZ += ROT_INCREMENT;
        angleXZ = angleXZ % (2 * Math.PI);
    }
    
    if (rotDirectionYZ === ROT_UP) {
        angleYZ -= ROT_INCREMENT;
        angleYZ = angleYZ % (2 * Math.PI);
    } else if (rotDirectionYZ === ROT_DOWN) {
        angleYZ += ROT_INCREMENT;
        angleYZ = angleYZ % (2 * Math.PI);
    }
}

function updateCameraTranslations() {
    if (translationDirectionX === TRANSLATION_RIGHT) {
        dx -= TRANSLATION_INCREMENT;
    } else if (translationDirectionX === TRANSLATION_LEFT) {
        dx += TRANSLATION_INCREMENT;
    }
    
    if (translationDirectionY === TRANSLATION_UP) {
        dy -= TRANSLATION_INCREMENT;
    } else if (translationDirectionY === TRANSLATION_DOWN) {
        dy += TRANSLATION_INCREMENT;
    }
}

function drawPointGroup(pointGroup) {
    for (const point of pointGroup) {
        const rotatedP = rotateYZ(rotateXZ(point, angleXZ), angleYZ);
        const translatedP = translateCamera(rotatedP);
        
        if (translatedP.z >= Z_NEAR) {
            drawPoint(screen(project(translatedP)), translatedP.z);
        }
    }
}

function drawLineGroup(lineGroup, pointGroup) {
    for (const line of lineGroup) {
        
        for (let i = 0; i < line.length; ++i) {
            const p1 = pointGroup[line[i]];
            const p2 = pointGroup[line[(i + 1) % line.length]];
            
            const rotatedP1 = rotateYZ(rotateXZ(p1, angleXZ), angleYZ);
            const translatedP1 = translateCamera(rotatedP1);
        
            const rotatedP2 = rotateYZ(rotateXZ(p2, angleXZ), angleYZ);
            const translatedP2 = translateCamera(rotatedP2);
            
            const clipped = clipLine(translatedP1, translatedP2);

            if (clipped) {
                drawLine(screen(project(clipped.p1)), screen(project(clipped.p2)));
            }
        }
    }
}

function drawPenger() {
    
    drawLineGroup(pengerLines, pengerPoints);
    if (isPointsShown) {
        drawPointGroup(pengerPoints);
    }
}

function frame() {
    const dt = 0.1/FPS;

    clear();
    updateCameraAngles();
    updateCameraTranslations();
    
    if(isAxisShown) drawAxis();
    
    drawLineGroup(lines, points);
    
    if (isPointsShown) {
        drawPointGroup(points);
    }
    
    if (isPengerShown) {
        drawPenger();
    }
    
    if (mousePoint) {
        drawPoint(mousePoint, 0.5);
        
            if (drawShape === DRAW_SHAPE_LINE) {
            
            if (pointsAdded % 2 !== 0) {
                const lastP = points[points.length - 1];
                const rotatedLastP = rotateYZ(rotateXZ(lastP, angleXZ), angleYZ);
                const translatedLastP = translateCamera(rotatedLastP);
                
                if (translatedLastP.z >= Z_NEAR) {
                     drawLine(screen(project(translatedLastP)), mousePoint);
                }
            }
        }
    }
    
    setTimeout(frame, 1000/FPS)
}


function init() {
    const drawShapeRadio = document.querySelector('input[name="draw-shape"]:checked');
    handleDrawShapeChange(drawShapeRadio);
    
    const showAxisCheckBox = document.getElementById('toggle-axis');
    handleShowAxisChange(showAxisCheckBox);
    
    const showPengerCheckBox = document.getElementById('penger');
    handlePengerChange(showPengerCheckBox);
    
    const showPointsCheckBox = document.getElementById('show-points');
    handleShowPointChange(showPointsCheckBox);
    
    const axisLenInputElem = document.getElementById('axis-len');
    handleAxisLenChange(axisLenInputElem);
    
    
    setTimeout(frame, 1000/FPS);
}
