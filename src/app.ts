import * as THREE from 'three';

import Stats from 'three/examples/jsm/libs/stats.module.js';

import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

import { Octree } from 'three/examples/jsm/math/Octree.js';
import { OctreeHelper } from 'three/examples/jsm/helpers/OctreeHelper.js';

import { Capsule } from 'three/examples/jsm/math/Capsule.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
// import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { TAARenderPass } from "three/examples/jsm/postprocessing/TAARenderPass.js";
import { VRButton } from './VRButton.js';
import { GUI } from './lil-gui.module.min.js';

import "./app.css"
import "./touch-pad.css"
import TouchControls from './touch-controller/TouchControls.js';
import ArtworkFrame, { ARTWORK_BASE_PATH, ArtworkFrameOptions } from './Artwork.js';
import { ArtworksCollection } from './Artworks.js';
import { GamePad } from './Gamepad.js';
// import { Bullets } from './Bullets.js';
// import { Npc } from './Npc.js';
// import { GenerativeLandscape } from './GenerativeLandscape.js';

function isMobile() {
  const regex = /Mobi|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return regex.test(navigator.userAgent);
}

function hasTouchSupport() {
  return 'ontouchstart' in document.documentElement;
}

const TUNING = false;

let textureQuality = isMobile() ? "MD" : "HD";
// Check if quality argument is passed in the url and set the texture quality accordingly
const args = new URLSearchParams(location.search);
if (args.has('quality')) {
  textureQuality = args.get('quality') || "HD";
}
// check if in the url there is "debug" parameter
let debug = window.location.search.indexOf('debug') !== -1;
let monitor = window.location.search.indexOf('monitor') !== -1;
let aa_sl = 1; //textureQuality === "HD" ? 4 : textureQuality === "MD" ? 2 : 1;
if (isMobile() || hasTouchSupport()) aa_sl = 1;
let aa_unbiased = true;
let fpsStats: any = null;
let msStats: any = null;
let memoryStats: any = null;
let selectedShader = GammaCorrectionShader
let selectedToneMapping = "ACESFilmicToneMapping";
let toneMappingExp = 1.0;
let toneMappingMethods = {
  NoToneMapping: THREE.NoToneMapping,
  LinearToneMapping: THREE.LinearToneMapping,
  ReinhardToneMapping: THREE.ReinhardToneMapping,
  CineonToneMapping: THREE.CineonToneMapping,
  ACESFilmicToneMapping: THREE.ACESFilmicToneMapping,
  CustomToneMapping: THREE.CustomToneMapping,
}
let cameraFocalLenght = 12;
let selectedArtwork = 0;

/* @ts-ignore */
window.pictures = [];

const txtLoader = new THREE.TextureLoader();
const clock = new THREE.Clock();
const scene = new THREE.Scene();

// function createSpotlight(color: string) {
//   const newObj = new THREE.SpotLight(color, 100);

//   newObj.castShadow = true;
//   newObj.angle = 0.5;
//   newObj.penumbra = 0.8;
//   newObj.decay = 2;
//   newObj.distance = 50;

//   return newObj;
// }

// scene.fog = new THREE.Fog(0x88ccee, 0, 170);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / (window.innerHeight * 1.5), 0.1, 500);
camera.setFocalLength(cameraFocalLenght);
camera.rotation.order = 'YXZ';

const fillLight1 = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
scene.add(fillLight1);

const directionalLight = new THREE.DirectionalLight(0xfcba03, 3);
directionalLight.color.setHSL(0.1, 1, 0.95);
directionalLight.rotation.set(0.3, -0.4, 1.65);
directionalLight.position.set(510, 60, -200);
directionalLight.position.multiplyScalar(30);
directionalLight.castShadow = true;
directionalLight.shadow.camera.near = 0.01;
directionalLight.shadow.camera.far = 3500;
directionalLight.shadow.camera.right = 30;
directionalLight.shadow.camera.left = - 30;
directionalLight.shadow.camera.top = 30;
directionalLight.shadow.camera.bottom = - 30;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.radius = 4;
directionalLight.shadow.bias = -0.00001;

// const dirLightHelper = new THREE.DirectionalLightHelper( directionalLight, 1000 );
// scene.add( dirLightHelper );

/* @ts-ignore */
window.directionalLight = directionalLight;
scene.add(directionalLight);

//const texture = txtLoader.load('./textures/general/DSC02177-Modifica.jpg');
// Add spotlights to the scene
// const spotLights = [
//   createSpotlight('#fcba03')
// ];

// spotLights[0].position.set(0, 3.5, 0);
// spotLights[0].castShadow = true;
// spotLights[0].shadow.mapSize.width = 1024;
// spotLights[0].shadow.mapSize.height = 1024;
// spotLights[0].shadow.camera.near = 1;
// spotLights[0].shadow.camera.far = 10;
// spotLights[0].shadow.focus = 1;

// const lightHelper = new THREE.SpotLightHelper(spotLights[0]);
// scene.add(spotLights[0]);
// scene.add(lightHelper);

/* @ts-ignore */
// window.spotLights = spotLights;

const container = document.getElementById('container-renderer') as HTMLElement;

const renderer = new THREE.WebGLRenderer({ antialias: true, failIfMajorPerformanceCaveat: true });
renderer.setPixelRatio(isMobile() || hasTouchSupport() ? window.devicePixelRatio : 1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
// renderer.outputColorSpace = THREE.NoColorSpace;

renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = toneMappingExp;
renderer.xr.enabled = true;
container.appendChild(renderer.domElement);

/*const texture = */txtLoader.load(
  `./textures/general/HD/giau_ground.jpg`, // Always use HD texture for the sky
  (t) => {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envMap = pmremGenerator.fromEquirectangular(t).texture;

    scene.background = envMap;
    scene.environment = envMap;
  });

document.body.appendChild(VRButton.createButton(renderer));

const target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBAFormat,
  encoding: THREE.sRGBEncoding, // todo: open issue on three.js
  //type: THREE.FloatType,
  anisotropy: renderer.capabilities.getMaxAnisotropy()
});

const composer = new EffectComposer(renderer, target);

const taaRenderPass = new TAARenderPass(scene, camera, 0xffffff, 1);
taaRenderPass.unbiased = aa_unbiased;
taaRenderPass.sampleLevel = aa_sl;
composer.addPass(taaRenderPass); // default

// const rp = new RenderPass(scene, camera);
// rp.enabled = false;
// composer.addPass(rp);
composer.addPass(new ShaderPass(selectedShader));

composer.setPixelRatio(window.devicePixelRatio);
composer.setSize(window.innerWidth, window.innerHeight)


const GRAVITY = 30;

const STEPS_PER_FRAME = 5;

const worldOctree = new Octree();

const playerCollider = new Capsule(new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(0, 1, 0), 0.35);

const playerVelocity = new THREE.Vector3();
const playerDirection = new THREE.Vector3();

let playerOnFloor = false;
//let mouseTime = 0;

const keyStates = {} as { [key: string]: boolean };
let ctrlKey = false;
let shiftKey = false;

// Gamepad
const gamepad = new GamePad();

// Bullets
// const bullets = new Bullets({
//   scene,
//   camera,
//   playerCollider,
//   playerDirection,
//   playerVelocity,
//   mouseTime: 0,
//   gravity: GRAVITY
// });

// const npc = new Npc({
//   scene
// });

if (!isMobile() || !hasTouchSupport()) {
  document.addEventListener('keydown', (event) => {
    keyStates[event.code] = true;
    ctrlKey = event.ctrlKey;
    shiftKey = event.shiftKey;
  });

  document.addEventListener('keyup', (event) => {
    keyStates[event.code] = false;
    ctrlKey = event.ctrlKey;
    shiftKey = event.shiftKey;
  });

  container.addEventListener('mousedown', () => {
    //console.log('requestPointerLock')
    document.body.requestPointerLock();
    // bullets.setMouseTime(performance.now());
  });

  // document.addEventListener('mouseup', () => {
  //   //console.log('exitPointerLock')
  //   if ( document.pointerLockElement !== null) bullets.throwBall();
  // });

  document.body.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === document.body) {
      camera.rotation.y -= event.movementX / 500;
      camera.rotation.x -= event.movementY / 500;
    }
  });
}

const progress = document.querySelector('#loader-box') as HTMLElement;

function setLoaderPercentage(percentage: number) {
  const loader = document.querySelector('.loader') as HTMLElement;
  const loaderWidth = percentage / 100 * window.innerWidth * 0.9; // 90% of window width
  loader.style.width = `${loaderWidth}px`;
}

const welcomeTexts = [
  { text: 'Hi!', delay: 1000, size: "30vw" },
  { text: 'Welcome to my', delay: 1000, size: "12vw" },
  { text: 'Virtual Gallery', delay: 1500, size: "10vw" },
  { text: 'Enjoy your visit =)', delay: 1000, size: "8vw" },
];

function setWelcomeText(text: string, size: string) {
  const welcomeText = document.querySelector('#welcomeText') as HTMLElement;
  welcomeText.innerText = text;
  welcomeText.style.fontSize = size;
}

function startWelcomeTextCarosel(index: number) {
  setTimeout(() => {
    setWelcomeText(welcomeTexts[index].text, welcomeTexts[index].size);
    index++;
    if (index < welcomeTexts.length) {
      startWelcomeTextCarosel(index++);
    }
  }, welcomeTexts[index].delay);
}

const blocker = document.getElementById('blocker') as HTMLElement;
const instructions = document.getElementById('instructions') as HTMLElement;
const artworkDetailsPanel = document.getElementById('artworkDetailsPanel') as HTMLElement;
const closeArtworkDetailsPanel = document.getElementById('closeArtworkDetailsPanel') as HTMLElement;
let closingArtworkDetailsPanel = false;

closeArtworkDetailsPanel.addEventListener('click', () => {
  closingArtworkDetailsPanel = true;

  setTimeout(() => {
    closingArtworkDetailsPanel = false;
  }, 500);

  artworkDetailsPanel.classList.remove('show-05');
  artworkDetailsPanel.classList.add('hidden-05');

  // clean the panel
  const img = document.getElementById('artworkDetailsPanelImage') as HTMLImageElement;
  img.src = '';
  const redirectUrl = document.getElementById('artworkDetailsPanelUrl') as HTMLAnchorElement;
  redirectUrl.href = '';
  const title = document.getElementById('artworkDetailsPanelTitle') as HTMLElement;
  title.innerText = '';
  const description = document.getElementById('artworkDetailsPanelDescription') as HTMLElement;
  description.innerText = '';
  const author = document.getElementById('artworkDetailsPanelAuthor') as HTMLElement;
  author.innerText = '';
  const year = document.getElementById('artworkDetailsPanelYear') as HTMLElement;
  year.innerText = '';

  // restore pointer lock
  hideInstructions();
  document.body.requestPointerLock();
});

const distanzaMassima = 4; // Soglia di distanza per attivare il cursore
let highlightedArtwork: ArtworkFrame | undefined = undefined;

if (!isMobile() || !hasTouchSupport()) {
  instructions.addEventListener('click', function () {
    hideInstructions();
    document.body.requestPointerLock();
  });
}

function hideInstructions() {
  blocker.classList.remove('show-05');
  blocker.classList.add('hidden-05');
  /*instructions.style.display = 'none';
  blocker.style.display = 'none';*/
}

function showInstructions() {
  blocker.classList.remove('hidden-05');
  blocker.classList.add('show-05');
  /*instructions.style.display = 'block';
  blocker.style.display = 'block';*/
}

if (!isMobile() || !hasTouchSupport()) {
  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement !== document.body && artworkDetailsPanel.classList.contains('hidden-05')) {
      showInstructions();
    } else {
      hideInstructions();
    }
  });
}

window.addEventListener('resize', onWindowResize);
function onWindowResize() {
  camera.aspect = window.innerWidth / (window.innerHeight * 1.5);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

// Event Listener per il click del mouse
document.addEventListener('click', onMouseClick, false);

// Funzione per gestire il click del mouse
function onMouseClick(_event: any) {
  if (highlightedArtwork && artworkDetailsPanel.classList.contains('hidden-05') && !closingArtworkDetailsPanel) {
    // disable pointer lock
    document.exitPointerLock();

    console.log('click on artwork', highlightedArtwork);
    const img = document.getElementById('artworkDetailsPanelImage') as HTMLImageElement;
    img.src = `${ARTWORK_BASE_PATH}HD/${highlightedArtwork?.picture}`;
    if (highlightedArtwork?.redirectUrl) {
      // add redirect url to the image click
      img.addEventListener('click', () => {
        window.open(highlightedArtwork?.redirectUrl, '_blank');
      });
      const redirectUrl = document.getElementById('artworkDetailsPanelUrl') as HTMLAnchorElement;
      redirectUrl.href = highlightedArtwork.redirectUrl || '';
    }
    const title = document.getElementById('artworkDetailsPanelTitle') as HTMLElement;
    title.innerText = highlightedArtwork.title || '';
    const description = document.getElementById('artworkDetailsPanelDescription') as HTMLElement;
    description.innerText = highlightedArtwork.description || '';
    const author = document.getElementById('artworkDetailsPanelAuthor') as HTMLElement;
    author.innerText = highlightedArtwork.author || '';
    const year = document.getElementById('artworkDetailsPanelYear') as HTMLElement;
    year.innerText = highlightedArtwork.year ? highlightedArtwork.year.toString() : '';
    artworkDetailsPanel.classList.remove('hidden-05');
    artworkDetailsPanel.classList.add('show-05');
  }
}

// Funzione per calcolare il Cono di Selezione
function calculateSelectionCone() {
  // Ottieni la posizione della camera
  const cameraPosition = camera.position.clone();

  // Ottieni la direzione in cui guarda la camera (vettore di direzione)
  const cameraDirection = getForwardVector(); // Assumi che getForwardVector() restituisca il vettore di direzione della camera

  // Calcola un punto nel mondo 3D in cui inizia il cono di selezione
  const selectionStartPoint = cameraPosition.clone();

  // Calcola un punto nel mondo 3D in cui termina il cono di selezione
  const selectionEndPoint = cameraPosition.clone().add(cameraDirection.multiplyScalar(distanzaMassima)); // Modifica "distanzaMassima" con la distanza massima desiderata

  // Calcola la direzione del cono
  const coneDirection = cameraDirection.clone().normalize();

  // Calcola l'angolo del cono (ad esempio, 45 gradi)
  const coneAngle = Math.PI / 4; // Modifica l'angolo come desiderato

  // Restituisci il cono di selezione come oggetto contenente i punti di inizio, fine, direzione e angolo
  return {
    start: selectionStartPoint,
    end: selectionEndPoint,
    direction: coneDirection,
    angle: coneAngle
  };
}

// Funzione per verificare se un'opera d'arte è all'interno del Cono di Selezione
function isArtworkInSelectionCone(artwork: ArtworkFrame, selectionCone: any) {
  // Ottieni la posizione dell'opera d'arte nel mondo 3D
  const artworkPosition = artwork.getPosition(); // Modifica questa funzione in base al tuo sistema di posizionamento delle opere d'arte

  // Calcola il vettore dalla posizione della camera all'opera d'arte
  const vectorToArtwork = artworkPosition.clone().sub(selectionCone.start);

  // Calcola l'angolo tra il vettore e la direzione del cono
  const angleToArtwork = selectionCone.direction.angleTo(vectorToArtwork);

  // Verifica se l'opera d'arte è all'interno del cono di selezione
  return angleToArtwork <= selectionCone.angle / 2 && vectorToArtwork.length() < 3;
}

// Funzione per gestire le Opere d'Arte all'Interno del Cono di Selezione
function handleArtworksInSelectionCone(artworksInSelectionCone: ArtworkFrame[]) {
  // Itera attraverso le opere d'arte all'interno del Cono di Selezione
  if (artworksInSelectionCone.length > 0)
    return artworksInSelectionCone[0].highlight();
  else
    return undefined;
}

function playerCollisions() {
  const result = worldOctree.capsuleIntersect(playerCollider);
  playerOnFloor = false;

  if (result) {
    playerOnFloor = result.normal.y > 0;
    if (!playerOnFloor) {
      playerVelocity.addScaledVector(result.normal, - result.normal.dot(playerVelocity));
    }

    playerCollider.translate(result.normal.multiplyScalar(result.depth));
  }
}

function updatePlayer(deltaTime: number) {
  let damping = Math.exp(- 4 * deltaTime) - 1;

  if (!playerOnFloor) {
    playerVelocity.y -= GRAVITY * deltaTime;
    // small air resistance
    damping *= 0.1;
  }

  playerVelocity.addScaledVector(playerVelocity, damping);

  const deltaPosition = playerVelocity.clone().multiplyScalar(deltaTime);
  playerCollider.translate(deltaPosition);

  playerCollisions();
  camera.position.copy(playerCollider.end);
}

function getForwardVector() {
  camera.getWorldDirection(playerDirection);
  playerDirection.y = 0;
  playerDirection.normalize();
  return playerDirection;
}

function getSideVector() {
  camera.getWorldDirection(playerDirection);
  playerDirection.y = 0;
  playerDirection.normalize();
  playerDirection.cross(camera.up);

  return playerDirection;
}

function controls(deltaTime: number) {
  // gives a bit of air control
  const speedDelta = deltaTime * (playerOnFloor ? 25 : 8);

  if (keyStates['KeyW']) {
    playerVelocity.add(getForwardVector().multiplyScalar(speedDelta));
  }

  if (keyStates['KeyS']) {
    playerVelocity.add(getForwardVector().multiplyScalar(- speedDelta));
  }

  if (keyStates['KeyA']) {
    playerVelocity.add(getSideVector().multiplyScalar(- speedDelta));
  }

  if (keyStates['KeyD']) {
    playerVelocity.add(getSideVector().multiplyScalar(speedDelta));
  }

  // Manage Gamepad
  if (gamepad.pan.x < -0.1 || gamepad.pan.x > 0.1) {
    playerVelocity.add(getSideVector().multiplyScalar(gamepad.pan.x * speedDelta));
  }
  if (gamepad.pan.y < -0.1 || gamepad.pan.y > 0.1) {
    playerVelocity.add(getForwardVector().multiplyScalar(gamepad.pan.y * -speedDelta));
  }

  if (gamepad.roll.x < -0.1 || gamepad.roll.x > 0.1) {
    camera.rotation.x += gamepad.roll.x * 0.02;
  }
  if (gamepad.roll.y < -0.1 || gamepad.roll.y > 0.1) {
    camera.rotation.y += gamepad.roll.y * 0.02;
  }

  if (playerOnFloor) {
    if (keyStates['Space'] || gamepad.buttons[0]) {
      playerVelocity.y = 10;
    }
  }

  // manage shooting
  // if (gamepad.buttons[1] && performance.now() - bullets.getMouseTime() > 100) {
  //   bullets.setMouseTime(performance.now());
  //   bullets.throwBall();
  // }

  if (TUNING) {
    const precision = shiftKey ? 0.1 : 1;
    const multiplier = 0.01 * precision;
    if (keyStates['PageUp']) {
      /* @ts-ignore */
      window.pictures[selectedArtwork].increasePosition(0, multiplier, 0);
    }
    if (keyStates['PageDown']) {
      /* @ts-ignore */
      window.pictures[selectedArtwork].increasePosition(0, -multiplier, 0);
    }
    if (keyStates['ArrowLeft']) {
      /* @ts-ignore */
      window.pictures[selectedArtwork].increasePosition(-multiplier, 0, 0);
    }
    if (keyStates['ArrowRight']) {
      /* @ts-ignore */
      window.pictures[selectedArtwork].increasePosition(multiplier, 0, 0);
    }
    if (keyStates['ArrowUp']) {
      /* @ts-ignore */
      window.pictures[selectedArtwork].increasePosition(0, 0, -multiplier);
    }
    if (keyStates['ArrowDown']) {
      /* @ts-ignore */
      window.pictures[selectedArtwork].increasePosition(0, 0, multiplier);
    }
    const v = ctrlKey ? multiplier : -multiplier;
    if (keyStates['KeyZ']) {
      /* @ts-ignore */
      window.pictures[selectedArtwork].increaseRotation(0, v, 0);
    }
    if (keyStates['KeyX']) {
      /* @ts-ignore */
      window.pictures[selectedArtwork].increaseRotation(v, 0, 0);
    }
    if (keyStates['KeyY']) {
      /* @ts-ignore */
      window.pictures[selectedArtwork].increaseRotation(0, 0, v);
    }
    if (keyStates['NumpadAdd']) {
      /* @ts-ignore */
      window.pictures[selectedArtwork].increaseSize(multiplier);
    }
    if (keyStates['NumpadSubtract']) {
      /* @ts-ignore */
      window.pictures[selectedArtwork].increaseSize(-multiplier);
    }

    // Print the current position, rotation and size of the selected artwork
    if (keyStates['KeyP']) {
      /* @ts-ignore */
      console.log(window.pictures[selectedArtwork].getPosition());
      /* @ts-ignore */
      console.log(window.pictures[selectedArtwork].getRotation());
      /* @ts-ignore */
      console.log(window.pictures[selectedArtwork].getSize());
    }
  }
}

if (isMobile() || hasTouchSupport()) {
  const padElement = document.getElementById('container3d') as HTMLDivElement
  new TouchControls(padElement) as any

  padElement.addEventListener('YawPitch', (event: any) => {
    //console.log(event)
    camera.rotation.x -= event.detail.deltaY / 200;
    camera.rotation.y -= event.detail.deltaX / 200;
  })

  padElement.addEventListener('move', (event: any) => {
    //console.log(event.detail.deltaY)
    const x = -(event.detail.deltaX)
    const y = event.detail.deltaY

    const speedDelta = 0.01 * (playerOnFloor ? 12 : 4);
    playerVelocity.add(getForwardVector().multiplyScalar(y * speedDelta));
    playerVelocity.add(getSideVector().multiplyScalar(x * speedDelta));
  })
}

// Instantiate a loader
// let mixers: THREE.AnimationMixer[] = [];
const manager = new THREE.LoadingManager();

manager.onLoad = function () {
  console.log('GLTF Loading complete!');
};

manager.onError = function (url) {
  console.log('There was an error loading ' + url);
};

manager.onProgress = function (_url, itemsLoaded, itemsTotal) {
  //console.log('Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.');
  const percentage = itemsLoaded / itemsTotal * 100;
  setLoaderPercentage(percentage);
};

const loader = new GLTFLoader(manager).setPath(`./models/gltf/${textureQuality}/`);
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('./loader/');
loader.setDRACOLoader(dracoLoader);

async function init() {
  // load a room model
  const gltf: GLTF = await loader.loadAsync('Virtual Gallery.gltf')
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  //gltf.scene.scale.set(0.05, 0.05, 0.05);

  gltf.scene.traverse((child: any) => {
    if (child.material) {
      child.material.anisotropy = maxAnisotropy;
      child.material.envMapIntensity = 1.0;
      // make more transparent the glass
      if (child.material.name === "glass") {
        child.material.transparent = true;
        child.material.opacity = 0.08;
      }
      // Make the floor more reflective
      if (child.material.name === "floor" || child.material.name === "walls") {
        child.material.roughness = 0.1;
        child.material.metalness = 0.5;
      }
      child.material.needsUpdate = true;
    }
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material.map) {
        child.material.map.anisotropy = maxAnisotropy;
      }

    }
  });

  await renderer.compileAsync(gltf.scene, camera, scene);

  worldOctree.fromGraphNode(gltf.scene);
  scene.add(gltf.scene);

  const helper = new OctreeHelper(worldOctree, 0x00ff00);
  helper.visible = false;
  scene.add(helper);

  /* @ts-ignore */
  const gui = new GUI({ width: 200 }) as any;
  gui.add({ debug: debug }, 'debug')
    .onChange(function (value: boolean) {
      helper.visible = value;
      debug = value;
    });
  gui.add({ monitor: monitor }, 'monitor')
    .onChange(function (value: boolean) {
      monitor = value;
      if (value) {
        fpsStats = new (Stats as any)();
        fpsStats.showPanel(0);
        fpsStats.domElement.style.position = 'absolute';
        fpsStats.domElement.style.top = '0px';
        msStats = new (Stats as any)();
        msStats.showPanel(1);
        msStats.domElement.style.position = 'absolute';
        msStats.domElement.style.top = '50px';
        memoryStats = new (Stats as any)();
        memoryStats.showPanel(2);
        memoryStats.domElement.style.position = 'absolute';
        memoryStats.domElement.style.top = '100px';
        container.appendChild(fpsStats.domElement);
        container.appendChild(msStats.domElement);
        container.appendChild(memoryStats.domElement);
      } else {
        container.removeChild(fpsStats.domElement);
        container.removeChild(msStats.domElement);
        container.removeChild(memoryStats.domElement);
      }
    });
  gui.add({ "Camera Focal Lenght": cameraFocalLenght }, 'Camera Focal Lenght', [8, 10, 12, 14, 20, 28, 35, 50, 70, 100, 135, 200])
    .onChange(function (value: number) {
      cameraFocalLenght = value;
      camera.setFocalLength(cameraFocalLenght);
    });
  gui.add({ "Antialiasing Level": aa_sl }, 'Antialiasing Level', [1, 2, 3, 4])
    .onChange(function (value: number) {
      aa_sl = value;
      taaRenderPass.sampleLevel = aa_sl;
    });

  if (TUNING) {
    gui.add({ "Antialiasing unbiased": aa_unbiased }, 'Antialiasing unbiased')
      .onChange(function (value: boolean) {
        aa_unbiased = value;
        taaRenderPass.unbiased = aa_unbiased;
      });
  }

  gui.add({ quality: textureQuality }, 'quality', ['LD', 'SD', 'MD', 'HD'])
    .onChange(function (value: string) {
      textureQuality = value;
      location.replace(`?quality=${value}`)
    });

  if (TUNING) {
    gui.add({ "Tone Mapping": selectedToneMapping }, 'Tone Mapping', Object.keys(toneMappingMethods))
      .onChange(function (value: string) {
        selectedToneMapping = value;
        /* @ts-ignore */
        renderer.toneMapping = toneMappingMethods[selectedToneMapping];
        refreshScene();
      });

    gui.add({ "Tone Mapping Exposure": toneMappingExp }, 'Tone Mapping Exposure')
      .onChange(function (value: number) {
        toneMappingExp = value;
        renderer.toneMappingExposure = toneMappingExp;
        refreshScene();
      });
    // Organizzazione mostra!!!
    gui.add({ "Selected Artwork": selectedArtwork }, 'Selected Artwork', ArtworksCollection.map((_a, i) => i))
      .onChange(function (value: number) {
        selectedArtwork = value;
      });
  }

  gui.close();

  for (var i = 0; i < ArtworksCollection.length; i++) {
    const picture = {
      picture: ArtworksCollection[i].url,
      quality: textureQuality,
      size: ArtworksCollection[i].size,
      x: ArtworksCollection[i].position.x,
      y: ArtworksCollection[i].position.y,
      z: ArtworksCollection[i].position.z,
      rotationX: ArtworksCollection[i].rotation.x,
      rotationY: ArtworksCollection[i].rotation.y,
      rotationZ: ArtworksCollection[i].rotation.z,
      thickness: 0.03,
      scene: scene,
      worldOctree: worldOctree,
      title: ArtworksCollection[i].name,
      description: ArtworksCollection[i].description,
      year: ArtworksCollection[i].year,
      author: ArtworksCollection[i].author,
      redirectUrl: ArtworksCollection[i].redirectUrl
    } as ArtworkFrameOptions;
    /* @ts-ignore */
    window.pictures.push(new ArtworkFrame(picture))
  }

  // // Load the generative landscape
  // const landscape = new GenerativeLandscape({ width: 4000, height: 4000, worldWidth: 64, worldDepth: 128 });
  // await renderer.compileAsync(landscape.mesh, camera, scene);
  // // translate the terrain to the bottom
  // landscape.mesh.position.y = -800;
  // /* @ts-ignore */
  // window.landscape = landscape;
  // scene.add(landscape.mesh);
  // worldOctree.fromGraphNode(landscape.mesh);

  // Loading done
  progress.classList.add('hidden');
  if (!isMobile() || !hasTouchSupport()) {
    showInstructions();
  }
  animate();
}

function teleportPlayerIfOob() {
  if (camera.position.y <= - 25) {
    playerCollider.start.set(0, 0.35, 0);
    playerCollider.end.set(0, 1, 0);
    playerCollider.radius = 0.35;
    camera.position.copy(playerCollider.end);
    camera.rotation.set(0, 0, 0);
  }
}

let frames = 0;
let lastTime = performance.now();
function checkPerformance() {
  frames++;
  var time = (performance || Date).now();
  if (time >= lastTime + 1000) {
    let fps = (frames * 1000) / (time - lastTime);
    // console.log(fps);
    lastTime = time;
    frames = 0;

    if (fps < 30 && aa_sl > 1) {
      console.log('low fps', fps);
      // decrease antialiasing
      aa_sl--;
      taaRenderPass.sampleLevel = aa_sl;
      refreshScene();
      console.log('anti aliasing decreased to:', aa_sl);
    } else if (fps > 60 && aa_sl < 4) {
      console.log('high fps', fps);
      // increase antialiasing
      aa_sl++;
      taaRenderPass.sampleLevel = aa_sl;

      refreshScene();
      console.log('anti aliasing increased to:', aa_sl);
    }
  }
}

function refreshScene() {
  scene.traverse((child: any) => {
    if (child.material) {
      child.material.needsUpdate = true;
    }
  });
}

function animate() {
  // Calcola il Cono di Visione o Rettangolo di Selezione
  const selectionCone = calculateSelectionCone();

  // Verifica quali Artwork sono all'interno dell'Area di Selezione
  /* @ts-ignore */
  const artworksInSelectionCone = window.pictures.filter(artwork => isArtworkInSelectionCone(artwork, selectionCone));

  // Gestisci le Opere d'Arte all'Interno del cono di Selezione
  highlightedArtwork = handleArtworksInSelectionCone(artworksInSelectionCone);

  const deltaTime = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;
  // we look for collisions in substeps to mitigate the risk of
  // an object traversing another too quickly for detection.
  gamepad.update();
  // lightHelper.update()
  // npc.update(deltaTime);

  for (let i = 0; i < STEPS_PER_FRAME; i++) {
    controls(deltaTime);
    updatePlayer(deltaTime);
    // bullets.updateSpheres(deltaTime, worldOctree);
    teleportPlayerIfOob();
  }

  // limit the camera to avoid upside down
  camera.rotation.x = Math.max(- Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));

  renderer.render(scene, camera);
  composer.render();
  if (monitor) {
    fpsStats.update();
    msStats.update();
    memoryStats.update();
  }
  checkPerformance();

  //requestAnimationFrame(animate);
  renderer.setAnimationLoop(animate);
  // const delta = clock.getDelta();
  // mixers.forEach(mixer => mixer.update(delta))
}

startWelcomeTextCarosel(0);
init();