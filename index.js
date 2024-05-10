import init from "./computeSimulator.js";
import BOID_MAP, { resize, setupData } from "./Map.js";

document.querySelector('body').append(BOID_MAP.CANVAS);

document.addEventListener('DOMContentLoaded', () => {
    resize();
    setupData();
    init();
});