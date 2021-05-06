'use strict';

const _VS = `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const _FS = `
void main() {
  gl_FragColor = vec4(.9, .3, .3, 1.0);
}`;

let isPlaying = false;

//Bloom
var renderTarget1 = new THREE.WebGLRenderTarget(); // <- Opaque objects
var renderTarget2 = new THREE.WebGLRenderTarget(); // <- Glowing objects
let composer;
let renderScene, effectFXAA;
let params = {
  bloomStrength: 0.5,
  bloomThreshold: 0.6,
  bloomRadius: 1.6,
};

let sky, sun;

//Car

//const carSpotLight;
let truck, backLightMesh;

let movingBack = false;
let rr, rl, fl, fr;
let car;
let wheel_material, wheel_geometry, big_wheel_geometry;
let damping = 0.7;
let friction = 0.9; //high
let frConstraint, flConstraint, rrConstraint, rlConstraint;

//Scene
let ground, material;
let render_stats, physics_stats;
let renderer, scene, camera, orbitControl;
let moon = new THREE.Object3D();
let sceneThree;
let controls, gui, levels;
let axesHelper;
let selectedLevel, restartGui, playGui;
let textMass = 0;
let spotLight, hemisphereLight, logoSpotLight;
let directionalShadowHelper;
const lightGroup = new THREE.Group();

//camera
let tween;
let goal = new THREE.Object3D();
var follow = new THREE.Object3D();

var temp = new THREE.Vector3();
var dir = new THREE.Vector3(0, -200, -800);
let dis;
var a = new THREE.Vector3();
var b = new THREE.Vector3();
var initalScene = new THREE.Vector3(0, 0, 0);
var cameraDistance = 3;

//Assets
const textLoader = new THREE.FontLoader();

const regularFontPath = '../../assets/fonts/Poppins_Light_Regular.json';
const loader = new THREE.GLTFLoader();
const audioLoader = new THREE.AudioLoader();
loader.setPath('./assets/textures/');
//fonts
const boldFontPath = '../assets/fonts/Poppins_Bold.json';
const lightFontPath = '../assets/fonts/Poppins_ExtraLight_Regular.json';

const audioListener = new THREE.AudioListener();
const crackingSound = new THREE.Audio(audioListener);
const objects = [];

//Game
let input = {
  power: null,
  direction: null,
  forward: null,
  steering: 0,
};
let vehicle;
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('pointerdown', onMouseClick);
// window.onkeydown = handleKeyDown;
// window.onkeyup = handleKeyUp;
let INTERSECTED;
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

const btnsContainerElem = document.querySelector('#menuBtns');
const elem = document.createElement('div');
elem.textContent = 'Work';

//Physics
Physijs.scripts.worker = '../src/lib/physijs_worker.js';
Physijs.scripts.ammo = './ammo.js';

window.addEventListener('resize', onWindowResize, true);

function onWindowResize() {
  console.log(' window changed');
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}
function init() {
  scene = new Physijs.Scene();
  scene.setGravity(new THREE.Vector3(0, 0, -80));
  // scene.background = new THREE.Color(0xe1e1e1);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  render_stats = new Stats();
  render_stats.domElement.style.position = 'absolute';
  render_stats.domElement.style.top = '1px';
  render_stats.domElement.style.zIndex = 100;

  document.body.appendChild(renderer.domElement);
  document.getElementById('viewport').appendChild(render_stats.domElement);
  const workButton = document.getElementById('startButton');
  workButton.addEventListener(
    'click',
    function () {
      playGame();
    },
    false
  );
}

function setupCamera() {
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    10,
    20000
  );
  camera.position.set(0, 0, 100);
  camera.lookAt(scene);

  follow.position.z = -cameraDistance;
}

function setupLight() {
  const ambientLight = new THREE.AmbientLight(0xeeeeee, 0.2);
  scene.add(ambientLight);

  logoSpotLight = new THREE.DirectionalLight(0xffffff, 0.5);
  logoSpotLight.castShadow = true;
  logoSpotLight.position.set(-80, 32, 30);
  scene.add(logoSpotLight.target);
  //scene.add(logoSpotLight);

  const sunLight = new THREE.PointLight(0xeeeeee, 1.0);
  sunLight.position.set(10, 1000, 10);
  scene.add(sunLight);

  const topLight = new THREE.PointLight(0xffffff, 1.0);
  topLight.position.set(0, 0, 100);
  //scene.add(topLight);

  var light = new THREE.DirectionalLight(0xffffff, 0.2);
  light.position.setScalar(100);
  scene.add(light);
}

function createGeometry() {
  var date = new Date();
  var pn = new Perlin('rnd' + date.getTime());
  var map = createHeightMap(pn);
  scene.add(map);

  const sunGeo = new THREE.SphereBufferGeometry(200, 128, 128);
  const sunMat = new THREE.MeshLambertMaterial({
    color: 'yellow',
    emissive: 0xffff00,
  });

  const sun = new THREE.Mesh(sunGeo, sunMat);
  sun.position.set(0, 10000, 0);
  scene.add(sun);

  add3DGLTF('Logo3D.gltf', -55, 21, 8, 1, 0);
  const heroArray = ['I make applications', '\nfun to use'];

  for (let index = 0; index < heroArray.length; index++) {
    createUIText(` ${heroArray[index]}`, -50, -2, 3, 1);
  }

  const name = createUIText('F E L I P E \nR O D R I G U E S', -44, 26, 2, 3);
  const workLink = createUIText('W O R K', 20, 30, 2, 2);
  const contactLink = createUIText('C O N T A C T', 32, 30, 2, 2);
  createCar();
  createIgloo(90, 520, 0, 60, true);
  //createBloom();
}

function createBloom() {
  renderScene = new THREE.RenderPass(scene, camera);
  effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
  effectFXAA.uniforms.resolution.value.set(
    1 / window.innerWidth,
    1 / window.innerHeight
  );

  let copyShader = new THREE.ShaderPass(THREE.CopyShader);
  copyShader.renderToScreen = true;

  let bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    params.bloomStrength,
    params.bloomRadius,
    params.bloomThreshold
  );

  composer = new THREE.EffectComposer(renderer, renderTarget2);

  bloomPass.threshold = params.bloomThreshold;
  bloomPass.strength = params.bloomStrength;
  bloomPass.radius = params.bloomRadius;
  bloomPass.renderToScreen = true;

  composer.setSize(window.innerWidth, window.innerHeight);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);
  composer.addPass(effectFXAA);
  composer.addPass(copyShader);

  renderer.gammaFactor = 2.2;
  renderer.outputEncoding = THREE.GammaEncoding;
  renderer.toneMappingExposure = Math.pow(0.9, 4.0);

  let gui = new dat.GUI();

  let blm = gui.addFolder('Bloom Setting');

  blm
    .add(params, 'bloomStrength', 0, 10)
    .step(0.01)
    .onChange(function (value) {
      bloomPass.strength = Number(value);
    });
  blm
    .add(params, 'bloomThreshold', 0, 1)
    .step(0.01)
    .onChange(function (value) {
      bloomPass.threshold = Number(value);
    });
  blm
    .add(params, 'bloomRadius', 0, 2)
    .step(0.01)
    .onChange(function (value) {
      bloomPass.radius = Number(value);
    });
  blm.open();

  let playGame = gui.addFolder('Game');

  playGame = new (function () {
    this.playGame = function () {};
  })();

  gui.add(playGame, 'playGame');
}

function playGame() {
  var targetPosition = new THREE.Vector3(0, -90, 40);

  var duration = 4000;

  tweenCamera(targetPosition, duration);
}

function createIgloo(
  posX = 0,
  posY = 0,
  posZ = 0,
  radius = 20,
  isTreeInside = false
) {
  let iglooGeo = new THREE.CylinderGeometry(radius, radius, 200, 64, 32);
  let iglooMat = new THREE.MeshPhysicalMaterial({
    color: 0xcccccccc,
    wireframe: true,
    metalness: 0.9,
    vertexColors: true,
    wireframeLinewidth: 5,
  });
  let iglooMesh = new THREE.Mesh(iglooGeo, iglooMat);
  let physicalglooMat = new Physijs.createMaterial(
    new THREE.MeshLambertMaterial({
      color: 0xc4c4c455,
      transparent: true,
      opacity: 0.4,
    })
  );

  let physicalIglooMesh = new Physijs.CylinderMesh(
    iglooGeo,
    physicalglooMat,
    0
  );

  iglooMesh.position.set(posX, posY, posZ);
  iglooMesh.castShadow = true;
  scene.add(iglooMesh);
  physicalIglooMesh.position.set(posX, posY, posZ - 0.2);
  scene.add(physicalIglooMesh);

  const numberOfTrees = calculateTreesInIglooArea(radius);
}

function calculateTreesInIglooArea(radius) {
  const treeArea = 625; //25*25
  const area = 3.141592 * (radius * radius);
  const numberOfTrees = Math.floor(area / treeArea);
  console.log(numberOfTrees / 4); //1/4 of the space used for trees

  return numberOfTrees;
}

function createTree(posX = 0, posY = 0, posZ = 0) {
  const random = Math.random();
  const random2 = Math.random();
  const crownHeight = random * 20 + 10;
  const crownBottonRadius = random * 15 + 10;
  const crownRadius = random * 6 + 10;
  const crownColor = new THREE.Color();
  crownColor.setHex(random * 0x00ff00);
  crownColor.b = random * 0.3; //getting variants of green
  crownColor.r = random * 0.4; //getting variants of green

  const icoDetail = Math.floor(random * 2);

  const crownGeometry =
    random2 < 0.3
      ? new THREE.ConeGeometry(crownBottonRadius, crownHeight, 32)
      : random2 < 0.6
      ? new THREE.IcosahedronGeometry(crownRadius, icoDetail)
      : new THREE.DodecahedronGeometry(crownRadius, icoDetail);

  const crownMaterial = new THREE.MeshBasicMaterial({
    color: crownColor,
  });
  const crownMesh = new THREE.Mesh(crownGeometry, crownMaterial);

  const trunkRadius = 2;
  const trunkHeight = 25;
  const trunkColor = 0x42280e;
  const trunkGeometry = new THREE.CylinderGeometry(
    trunkRadius,
    trunkRadius,
    trunkHeight,
    6
  );
  const trunkMaterial = new THREE.MeshBasicMaterial({ color: trunkColor });
  const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);

  crownMesh.position.set(0, trunkHeight - crownRadius, 0);
  trunkMesh.rotation.x = Math.PI / 2;
  trunkMesh.position.set(posX, posY, trunkHeight / 2);
  trunkMesh.add(crownMesh);

  scene.add(trunkMesh);
}

function importTrees() {
  new THREE.BufferGeometryLoader()
    .setPath('./assets/textures/')
    .load('palm-realviz.gltf', function (geometry) {
      material = new THREE.MeshNormalMaterial();

      console.log('tree added');
      geometry.computeVertexNormals();

      makeInstanced(geometry);
    });
}

function makeInstanced(geometry) {
  const matrix = new THREE.Matrix4();
  const mesh = new THREE.InstancedMesh(geometry, material, 30);

  for (let i = 0; i < 30; i++) {
    randomizeMatrix(matrix);
    mesh.setMatrixAt(i, matrix);
  }

  scene.add(mesh);
}

function createCar() {
  // camera.position.set(0, -200, 80);
  add3DGLTF('CyberTruck.gltf', 0, 0, 4, 6, 2, 0);

  let carMaterial = Physijs.createMaterial(
    new THREE.MeshLambertMaterial({
      color: 0xff0000,
      visible: false,
    }),
    0.8,
    0.6
  );
  let carWidth = 12;
  let hoodGeometry = new THREE.BoxGeometry(carWidth, 17, 4);
  let hoodMesh = new Physijs.BoxMesh(hoodGeometry, carMaterial, 1);
  hoodMesh.position.set(0, 9, 1);
  hoodMesh.rotation.x = -Math.PI / 10;
  let bucketGeometry = new THREE.BoxGeometry(carWidth, 16, 4);
  let bucketMesh = new Physijs.BoxMesh(bucketGeometry, carMaterial, 1);
  bucketMesh.position.set(0, -6, 2);
  bucketMesh.rotation.x = Math.PI / 16;

  let bodyGeometry = new THREE.BoxGeometry(16, 35, 0.01);
  let frameGeometry = new THREE.BoxGeometry(14, 35, 4);
  let frameMesh = new Physijs.BoxMesh(frameGeometry, carMaterial, 1);
  frameMesh.add(hoodMesh);
  frameMesh.add(bucketMesh);
  frameMesh.position.z = 4;

  let carMass = 800;
  car = new Physijs.BoxMesh(bodyGeometry, carMaterial, carMass);
  car.add(frameMesh);
  car.castShadow = car.receiveShadow = true;
  car.position.set(0, 10, 2.5);

  //Car Lights
  let backLight = new THREE.RectAreaLight({
    color: 0xff0000,
    intensity: 10,
    width: carWidth,
    height: 1,
  });

  backLight.position.set(0, -17.4, -4.5);
  const backLightGeo = new THREE.BoxGeometry(backLight.width, 0.4, 0.2);

  //backLight.rotateX(90);
  const backLightMat = new THREE.MeshPhongMaterial({
    color: 'red',
    emissive: 0xff0000,
  });
  backLightMesh = new THREE.Mesh(backLightGeo, backLightMat);

  backLightMesh.position.set(
    backLight.position.x,
    backLight.position.y,
    backLight.position.z
  );

  backLight.position.set(0, 0, 10);

  let headLight = new THREE.RectAreaLight({
    color: 'white',
  });

  headLight.position.set(0, 19.4, 0);

  const headLightGeo = new THREE.BoxGeometry(6.8, 0.5, 0.6);
  const headLightMat = new THREE.MeshPhongMaterial({
    color: 'white',
  });
  let headLightMesh = new THREE.Mesh(headLightGeo, headLightMat);
  headLightMesh.position.set(headLight.position);

  backLight.add(backLightMesh);
  headLight.add(headLightMesh);

  car.add(follow);
  car.add(backLight);
  car.add(headLight);
  goal.add(camera);

  let suspension_stiffness = 18.5;
  let suspension_compression = 1.25;
  let suspension_damping = 2;
  let max_suspension_travel = 800;
  let friction_slip = 10.5;
  let max_suspension_force = 1000000;

  vehicle = new Physijs.Vehicle(
    car,
    new Physijs.VehicleTuning(
      suspension_stiffness,
      suspension_compression,
      suspension_damping,
      max_suspension_travel,
      friction_slip,
      max_suspension_force
    )
  );
  let wheelGeo = new THREE.CylinderGeometry(2.5, 2.5, 2.5, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  let wheelMat = new THREE.MeshStandardMaterial({
    color: 'black',
    visible: true,
  });

  function createPhysicsWheel(posX, posY, posZ) {
    let wheelPhysicsMat = new Physijs.createMaterial(
      new THREE.MeshStandardMaterial({
        color: 'green',
        visible: false,
      }),
      0.2,
      0.2
    );
    let wheelPhysics = new Physijs.BoxMesh(
      new THREE.BoxGeometry(4, 4, 4),
      wheelPhysicsMat,
      10
    );

    wheelPhysics.position.set(posX, posY, posZ);

    return wheelPhysics;
  }

  scene.add(vehicle);
  let vec2 = new THREE.Vector3(0, 0, -1);
  for (let i = 0; i < 4; i++) {
    let PosWheenInVehicle = new THREE.Vector3(
      i % 2 === 0 ? -7 : 7,
      i < 2 ? 12 : -10.5,
      -2
    );
    let physicalWheel = createPhysicsWheel(
      PosWheenInVehicle.x,
      PosWheenInVehicle.y,
      1
    );
    car.add(physicalWheel);
    vehicle.addWheel(
      wheelGeo,
      wheelMat,
      PosWheenInVehicle,
      vec2,
      new THREE.Vector3(1, 0, 0),
      0.2,
      3,
      i < 2 ? false : true
    );

    console.log('wheel added');
  }

  document.addEventListener('keydown', function (event) {
    let keyInput = event.key.toLowerCase();
    switch (keyInput) {
      case 'a':
      case 'ArrowLeft':
        input.direction = 1;
        break;

      case 'd':
      case 'ArrowRight':
        input.direction = -1;
        break;
      case 'w':
      case 'ArrowUp':
        input.forward = 1;
        input.power = true;
        backLightMesh.emissive = false;
        break;

      case 's':
      case 'ArrowDown':
        input.forward = -1;
        input.power = true;
        backLightMesh.emissive = true;
        break;
    }
    if (event.code === 'Space') {
      console.log('brack');
      vehicle.setBrake(200, 2);
      vehicle.setBrake(200, 3);
    }
  });

  document.addEventListener('keyup', function (event) {
    let keyInput = event.key.toLowerCase();
    switch (keyInput) {
      case 'a':
      case 'ArrowLeft':
        input.direction = null;
        break;

      case 'd':
      case 'ArrowRight':
        input.direction = null;
        break;

      case 'w':
      case 'ArrowUp':
        input.power = null;
        input.forward = null;
        break;

      case 's':
      case 'ArrowDown':
        input.power = null;
        input.forward = null;
        break;
    }
    if (event.code === 'Space') {
      console.log('brack go');
      input.power = null;
      input.forward = null;
    }
  });

  scene.addEventListener('update', function () {
    if (input.direction !== null) {
      input.steering += input.direction / 30;
      if (input.steering < -0.4) input.steering = -0.4;
      if (input.steering > 0.4) input.steering = 0.4;
    }
    vehicle.setSteering(input.steering, 0);
    vehicle.setSteering(input.steering, 1);

    if (input.power === true) {
      vehicle.applyEngineForce(5000 * input.forward);
      if (input.forward < 0) {
      }
    } else {
      vehicle.applyEngineForce(0);
    }
    if (isPlaying) {
      animate();
    }
  });
}

function add3DGLTF(itemName, posX = 0, posY = 0, posZ = 0, scale = 1) {
  loader.load(
    itemName,
    function (data) {
      data.scene.traverse(function (child) {
        if (child.isMesh) {
          let m = child;
          m.receiveShadow = true;
          m.castShadow = true;
        }
        if (child.isLight) {
          let l = glft;
          l.castShadow = true;
          l.shadow.bias = -0.01;
          l.shadow.mapSize.width = 1024;
          l.shadow.mapSize.height = 1024;
        }
      });

      // console.log(mesh);
      // console.log(moon);
      //const mesh =

      const model = data.scene;
      model.position.set(posX, posY, posZ);
      model.scale.set(scale, scale, scale);

      if (itemName === 'CyberTruck.gltf') {
        model.rotation.x = Math.PI / 2;
        car.add(model);
        return;
      }
      if (itemName === 'tree01.gltf') {
        model.rotation.x = Math.PI / 2;
        scene.add(model);
        return;
      }

      scene.add(model);
    },

    (xhr) => {
      console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
      console.log(error);
    }
  );
}

function clearScene() {
  let group = []; // = new THREE.Group();
  for (let i = 0; i < scene.children.length; i++) {
    group.push(scene.children[i]);
    group.forEach((e) => {
      scene.remove(e);
    });
  }
}

function onMouseMove() {}

function onMouseClick(event) {
  //console.log(truck);

  //scene.add(truck);
  if (INTERSECTED) {
    let selectedObject = scene.getObjectById(INTERSECTED.id);
    //scene.remove(selectedObject);
    console.log(selectedObject);
  }
}

function tweenCamera(targetPosition, duration) {
  var position = new THREE.Vector3().copy(camera.position);

  const tween = new TWEEN.Tween(position)
    .to(targetPosition, duration)
    .easing(TWEEN.Easing.Back.Out)
    .onUpdate(function () {
      camera.position.copy(position);
      camera.lookAt(vehicle.mesh.position);
    })
    .onComplete(function () {
      console.log(camera.position);
      isPlaying = true;
    });
  tween.start();
}

function animate() {
  camera.position
    .copy(vehicle.mesh.position)
    .add(new THREE.Vector3(0, -100, 36.5));
  camera.lookAt(vehicle.mesh.position);
}

function render() {
  requestAnimationFrame(render);
  render_stats.update();
  scene.simulate(undefined, 1);
  TWEEN.update();

  renderer.render(scene, camera);

  camera.updateProjectionMatrix();
}

window.onload = () => {
  init();
  setupCamera();
  setupLight();
  createGeometry();
  initSky();
  render();
};

let createMesh = (
  geometryType,
  materialType,
  color = 'red',
  willCastShadow = true,
  willReceiveShadow = true,
  width = 2,
  height = 2,
  depth = 2,
  mass = 10,
  friction = 0.5,
  bouciness = 0.5
) => {
  let shape;
  switch (geometryType) {
    case 'sphere':
      shape = new THREE.SphereGeometry(1000, 64, 64);
      break;
    case 'box':
      shape = new THREE.BoxBufferGeometry(size, size, size);
      break;
    case 'plane':
      shape = new THREE.PlaneGeometry(size, size);
      break;
    case 'cylinder':
      shape = new THREE.CylinderBufferGeometry(size, size, size);
      break;
    default:
      console.log('Object type not defined correctly');
      break;
  }

  let material;
  switch (materialType) {
    case 'lambert':
      material = new Physijs.createMaterial(
        new THREE.MeshLambertMaterial({
          color: color,
          transparent: true,
          opacity: 0.8,
        })
      );
      break;
    case 'phong':
      material = new THREE.MeshPhongMaterial({ color: color });
      break;
    case 'standard':
      material = new THREE.MeshStandardMaterial({ color: color });
      break;
    case 'physical':
      material = new THREE.MeshPhysicalMaterial({
        color: color,
        side: THREE.DoubleSide,
      });
      break;

    default:
      console.log('Object material not defined correctly');
      break;
  }

  let mesh = new THREE.Mesh(shape, material, friction, bouciness, mass);

  mesh.castShadow = willCastShadow;
  mesh.receiveShadow = willReceiveShadow;
  return mesh;
};

async function playSound(sound) {
  switch (sound) {
    case 'cracking':
      audioLoader.load('./assets/audio/cracking.flac', function (audioBuffer) {
        crackingSound.setBuffer(audioBuffer);
        crackingSound.play();
      });
      break;
    case 'win':
      audioLoader.load('./assets/audio/win.wav', function (audioBuffer) {
        crackingSound.setBuffer(audioBuffer);
        crackingSound.play();
      });
    case 'gameOver':
      audioLoader.load('./assets/audio/gameOver.wav', function (audioBuffer) {
        crackingSound.setBuffer(audioBuffer);
        crackingSound.play();
      });
      break;
    default:
      console.log('Sound not defined correctly');
      break;
  }
}

function createUIText(
  text,
  posX = 0,
  posY = 0,
  posZ = -10,
  visualHirearchy = 2
) {
  let _color, _size, _font, _bevelSize;
  switch (visualHirearchy) {
    case 1:
      _font = boldFontPath;
      _size = 3;
      _color = 0x6d6e71;
      break;
    case 2:
      _font = regularFontPath;
      _size = 1.5;
      _color = 0x6d6e71;
      break;
    case 3:
      _font = lightFontPath;
      _size = 1.3;
      _color = '0x6d6e71';
      break;
    case 4:
      _font = regularFontPath;
      _size = 1.5;
      _color = 0xffaa0f;
      break;
    case 5:
      _font = regularFontPath;
      _size = 1.5;
      _color = 0xfff000;
      break;
  }

  textLoader.load(_font, (e) => {
    let textUI = text,
      height = 0.05,
      size = _size,
      curveSegments = 4,
      bevelThickness = 0,
      bevelSize = 0.01,
      bevelSegments = 3,
      bevelEnabled = true,
      font = e,
      weight = 'normal ', // normal bold
      style = 'normal'; // normal italic

    var textGeo = new THREE.TextGeometry(textUI, {
      size: size,
      height: height,
      curveSegments: curveSegments,

      font: font,
      weight: weight,
      style: style,

      bevelThickness: bevelThickness,
      bevelSize: bevelSize,
      bevelEnabled: bevelEnabled,
    });

    let materialText = Physijs.createMaterial(
      new THREE.MeshBasicMaterial({
        color: 'white',
      }),
      0.9, //friction
      0.2 //restituiton
    );

    let mesh = new Physijs.BoxMesh(textGeo, materialText, textMass);

    mesh.position.set(posX, posY, posZ);
    mesh.castShadow = true;
    // mesh.layers.enable(1);
    mesh.name = text;
    scene.add(mesh);
  });
}

function createAxesHelper(size = 40) {
  axesHelper = new THREE.AxesHelper(size);

  //ddscene.add(axesHelper);
}

function createShadowHelpers() {
  //shadow Helpers;

  lightGroup.children.forEach((e) => {
    if (e.shadow) {
      directionalShadowHelper = new THREE.CameraHelper(e.shadow.camera);
      directionalShadowHelper.visible = true;
      directionalShadowHelper.scale.set(80, 80, 80);
    }
    scene.add(directionalShadowHelper);
  });
}

function createHeightMap(pn) {
  const texture = new THREE.TextureLoader().load(
    '../assets/textures/marsSurface.jpg',
    function (texture) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.offset.set(12, 12);
      texture.repeat.set(64, 64);
    }
  );

  const groundMaterial = Physijs.createMaterial(
    new THREE.MeshStandardMaterial({
      map: texture,
      specular: 0x111111,
      shininess: 1,
    })
  );

  const groundGeometry = new THREE.PlaneGeometry(2000, 2000, 100, 100);
  for (let i = 0; i < groundGeometry.vertices.length; i++) {
    let vertex = groundGeometry.vertices[i];
    let value = pn.noise(vertex.x / 12, vertex.y / 12, 0);
    vertex.z = value * 10;
  }
  groundGeometry.computeFaceNormals();
  groundGeometry.computeVertexNormals();

  const ground = new Physijs.HeightfieldMesh(
    groundGeometry,
    groundMaterial,
    0,
    100,
    100
  );
  // ground.rotation.y = Math.PI / -2;
  //ground.rotation.y = -0.25;
  ground.receiveShadow = true;
  ground.position.z = -10;

  return ground;
}

function initSky() {
  // Add Sky
  sky = new THREE.Sky();
  sky.scale.setScalar(45000);
  scene.add(sky);

  sun = new THREE.Vector3();

  /// GUI

  const effectController = {
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    elevation: 2,
    azimuth: 180,
    exposure: renderer.toneMappingExposure,
  };

  function guiChanged() {
    const uniforms = sky.material.uniforms;
    uniforms['turbidity'].value = effectController.turbidity;
    uniforms['rayleigh'].value = effectController.rayleigh;
    uniforms['mieCoefficient'].value = effectController.mieCoefficient;
    uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

    const phi = THREE.MathUtils.degToRad(effectController.elevation - 90);
    const theta = THREE.MathUtils.degToRad(90 + effectController.azimuth);

    sun.setFromSphericalCoords(1, phi, theta);

    uniforms['sunPosition'].value.copy(sun);

    renderer.toneMappingExposure = effectController.exposure;
  }

  const gui = new dat.GUI();

  gui.add(effectController, 'turbidity', 0.0, 20.0, 0.1).onChange(guiChanged);
  gui.add(effectController, 'rayleigh', 0.0, 4, 0.001).onChange(guiChanged);
  gui
    .add(effectController, 'mieCoefficient', 0.0, 0.1, 0.001)
    .onChange(guiChanged);
  gui
    .add(effectController, 'mieDirectionalG', 0.0, 1, 0.001)
    .onChange(guiChanged);
  gui.add(effectController, 'elevation', 0, 90, 0.1).onChange(guiChanged);
  gui.add(effectController, 'azimuth', -180, 180, 0.1).onChange(guiChanged);
  gui.add(effectController, 'exposure', 0, 1, 0.0001).onChange(guiChanged);

  guiChanged();
}
