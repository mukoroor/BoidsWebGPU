let MAP_WIDTH, MAP_HEIGHT, CANVAS, currTimeout, interval;

const timeStep = 5;
const defaulCURSOR = [-2, -2, 0.01, 0];
let CURSOR = new Float32Array(defaulCURSOR);
CANVAS = document.createElement("canvas");

CANVAS.addEventListener('mousemove', e => {
    if (currTimeout) clearTimeout(currTimeout);
    CURSOR[0] = (2 * e.offsetX / CANVAS.offsetWidth - 1.) * MAP.RATIO;
    CURSOR[1] = -2 * e.offsetY / CANVAS.offsetHeight + 1.;
    currTimeout = setTimeout(clearCursor, 1000);
})

CANVAS.addEventListener('mousedown', () => {
    clearInterval(interval);
    interval = setInterval(() => {
        if(CURSOR[2] == 1) clearInterval(interval);
        else {
            CURSOR[2] = Math.min(CURSOR[2] + .005, 1);
        }
    }, timeStep);
})

CANVAS.addEventListener('mouseup', () => {
    clearInterval(interval);
    interval = setInterval(() => {
        if(CURSOR[2] == 0.01) clearInterval(interval);
        else {
            CURSOR[2] = Math.max(CURSOR[2] - .005, 0.01);
        }
    }, timeStep);
})

function randomDirection() {
    const ang = 2 * Math.random() * Math.PI;
    return [Math.cos(ang), Math.sin(ang)];
}

function randomLocation() {
    return [(Math.random() * 2 - 1.) * MAP.RATIO, Math.random() * 2 - 1.]
}

function clearCursor() {
    [CURSOR[0], CURSOR[1]] = [...defaulCURSOR]
    if (currTimeout) clearTimeout(currTimeout);
}

export function setupData() {
    MAP_WIDTH = CANVAS.width;
    MAP_HEIGHT = CANVAS.height;
    MAP.RATIO = MAP_WIDTH / MAP_HEIGHT;
}

export function distributeItems(count) {
    const positions = [];
    for (let i = 0; i < count; i++) {
        positions.push(...randomLocation(), ...randomDirection(), 1., 0.);
    }
    return positions;
}

export function resize() {
    const DEVICE_PIXEL_RATIO = window.devicePixelRatio;
    CANVAS.width = CANVAS.offsetWidth * DEVICE_PIXEL_RATIO;
    CANVAS.height = CANVAS.offsetHeight * DEVICE_PIXEL_RATIO;
}

const MAP = { CANVAS, CURSOR, RATIO: 1 }

export default MAP;