'use strict';

const _VS = `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const _FS = `
void main() {
  gl_FragColor = vec4(.6, .6, .6, 1.0);
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

//Car

//const carSpotLight;
let truck;

let movingBack = false;
let rr, rl, fl, fr;
let car;
let wheel_material, wheel_geometry, big_wheel_geometry;
let damping = 0.7;
let friction = 0.9; //high
let frConstraint, flConstraint, rrConstraint, rlConstraint;

//Scene
let ground;
let render_stats, physics_stats;
let renderer, scene, camera, orbitControls;
let moon = new THREE.Object3D();
let sceneThree;
let controls, gui, levels;
let axesHelper;
let selectedLevel, restartGui, playGui;
let textMass = 50;
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
var cameraDistance = 3;

//Assets
const textLoader = new THREE.FontLoader();
const textureLoader = new THREE.TextureLoader();
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
  render_stats = new Stats();
  render_stats.domElement.style.position = 'absolute';
  render_stats.domElement.style.top = '1px';
  render_stats.domElement.style.zIndex = 100;
  document.getElementById('viewport').appendChild(render_stats.domElement);

  scene = new Physijs.Scene();
  scene.setGravity(new THREE.Vector3(0, 0, -30));
  //scene.background = new THREE.Color(0x000000);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  // renderer.setClearColor(0x101000);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  renderer.shadowMap.enabled = true;

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
    10000
  );
  camera.position.set(0, 0, 100);
  camera.lookAt(scene.position);
  follow.position.z = -cameraDistance;
  // orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
  // orbitControls.enableDamping = true;
  // orbitControls.dampingFactor = 0.25;
  // orbitControls.dampingFactor = 0.25;
  // orbitControls.enableZoom = true;
}

function setupLight() {
  const ambientLight = new THREE.AmbientLight(0xeeeeee, 2.0);
  scene.add(ambientLight);

  logoSpotLight = new THREE.DirectionalLight(0xffffff, 0.5);
  logoSpotLight.castShadow = true;
  logoSpotLight.position.set(-80, 32, 30);
  // logoSpotLight.target.position.set(logo.position);
  scene.add(logoSpotLight.target);
  scene.add(logoSpotLight);

  const sunLight = new THREE.PointLight(0xeeeeee, 10.0);
  sunLight.position.set(10, 1000, 10);
  scene.add(sunLight);

  const topLight = new THREE.PointLight(0xffffff, 1.0);
  topLight.position.set(0, 0, 100);
  scene.add(topLight);

  var light = new THREE.DirectionalLight(0xffffff, 0.2);
  light.position.setScalar(100);
  scene.add(light);

  //createShadowHelpers();
}

function createGeometry() {
  var ground_geometry = new THREE.PlaneGeometry(3000, 3000, 100, 100);
  // for (var i = 0; i < ground_geometry.vertices.length; i++) {
  //   var vertex = ground_geometry.vertices[i];
  //   //vertex.z = NoiseGen.noise(vertex.x / 30, vertex.z / 30) * -1;
  // }
  // ground_geometry.computeFaceNormals();
  // ground_geometry.computeVertexNormals();

  let ground_material = new Physijs.createMaterial(
    new THREE.MeshBasicMaterial({
      color: 'grey',
    }),
    0.8, //friction
    0.5 //restituiton
  );

  ground = new Physijs.BoxMesh(ground_geometry, ground_material, 0);

  ground.receiveShadow = true;
  scene.add(ground);

  const sunGeo = new THREE.SphereBufferGeometry(2000, 128, 128);
  const sunMat = new THREE.MeshBasicMaterial({ color: 'yellow' });
  const sun = new THREE.Mesh(sunGeo, sunMat);

  sun.position.set(0, 1000, 100);
  sun.layers.enable(0);
  scene.add(sun);

  add3DGLTF('Logo3D.gltf', -55, 21, 1, 1, 0);
  const heroArray = ['I make applications', '\nfun to use'];

  for (let index = 0; index < heroArray.length; index++) {
    createUIText(` ${heroArray[index]}`, -50, -2, 3, 1);
  }

  const name = createUIText('F E L I P E \nR O D R I G U E S', -44, 26, 2, 3);
  const workLink = createUIText('W O R K', 20, 30, 2, 2);
  const contactLink = createUIText('C O N T A C T', 32, 30, 2, 2);

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
  if (!car) {
    console.clear();
    createCar();
  } else {
    console.log('Car on scence');
  }
}

function createCar() {
  // camera.position.set(0, -200, 80);
  add3DGLTF('CyberTruck.gltf', 0, 0, 2, 6, 2, 0);

  let carMaterial = Physijs.createMaterial(
    new THREE.MeshLambertMaterial({
      color: 0xffff00,
      opacity: 0.4,
      transparent: true,
    }),
    0.8,
    0.9
  );
  let bodyGeometry = new THREE.BoxGeometry(16, 35, 0.01);
  let bodyPhysicMesh = new Physijs.BoxMesh(bodyGeometry, carMaterial, 20);
  //bodyPhysicMesh.position.z = 5;

  let frameGeometry = new THREE.BoxGeometry(1, 0.1, 0.1);
  //let frameMesh = new THREE.Mesh(frameGeometry, carMaterial);

  car = new Physijs.BoxMesh(frameGeometry, carMaterial, 1000);
  car.add(bodyPhysicMesh);
  car.castShadow = car.receiveShadow = true;

  car.position.set(14, 10, 3.0);

  //Car Lights
  let backLight = new THREE.RectAreaLight({
    color: 0xff0000,
    intensity: 10,
    width: frameGeometry.width,
    height: 1,
  });

  backLight.position.set(0, 0, 19.6);
  const backLightGeo = new THREE.BoxGeometry(backLight.width, 1, 0.2);

  backLight.rotateX(90);
  const backLightMat = new THREE.MeshPhongMaterial({
    color: 'red',
    emissive: 0xff0000,
  });
  let backLightMesh = new THREE.Mesh(backLightGeo, backLightMat);

  backLightMesh.position.set(
    backLight.position.x,
    backLight.position.y,
    backLight.position.z
  );

  backLight.position.set(0, 0, 10);

  let headLight = new THREE.RectAreaLight({
    color: 'white',
    intensity: 10,
    width: 5,
    height: 1,
  });

  headLight.position.set(0, 19.4, 0);

  const headLightGeo = new THREE.BoxGeometry(6.8, 0.5, 0.6);
  const headLightMat = new THREE.MeshPhongMaterial({
    color: 'red',
    emissive: 0xffffff,
  });
  let headLightMesh = new THREE.Mesh(headLightGeo, headLightMat);

  headLightMesh.position.set(headLight.position.copy);

  headLight.position.set(0, 0, 9);

  let carSpotLight = new THREE.DirectionalLight(0xff0000, 10.5);
  carSpotLight.castShadow = true;
  carSpotLight.position.set(0, -20, 0);

  carSpotLight.target.position.set(car.position);
  scene.add(carSpotLight.target);

  backLight.add(backLightMesh);
  headLight.add(headLightMesh);

  car.add(carSpotLight);
  car.add(follow);
  car.add(backLight);
  goal.add(camera);

  let suspension_stiffness = 8;
  let suspension_compression = 2.5;
  let suspension_damping = 3;
  let max_suspension_travel = 500;
  let friction_slip = 10.5;
  let max_suspension_force = 30000;

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
  scene.add(vehicle);
  let wheelGeo = new THREE.CylinderGeometry(2.5, 2.5, 2, 12);
  wheelGeo.rotateZ(Math.PI / 2);

  for (let i = 0; i < 4; i++) {
    vehicle.addWheel(
      wheelGeo,
      new THREE.MeshStandardMaterial({ color: 'black' }),
      new THREE.Vector3(i % 2 === 0 ? -8 : 8, i < 2 ? 12 : -10.5, -2),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(1, 0, 0),
      0.5,
      8,
      true
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
        break;

      case 's':
      case 'ArrowDown':
        input.forward = -1;
        input.power = true;
        break;
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
  });

  scene.addEventListener('update', function () {
    if (input && vehicle) {
      if (input.direction !== null) {
        input.steering += input.direction / 50;
        if (input.steering < -0.6) input.steering = -0.6;
        if (input.steering > 0.6) input.steering = 0.6;
      }
      vehicle.setSteering(input.steering, 0);
      vehicle.setSteering(input.steering, 1);

      if (input.power === true) {
        if (input.forward) {
          vehicle.applyEngineForce(5000 * input.forward);
        }
      } else if (input.power === false) {
        vehicle.setBrake(20, 2);
        vehicle.setBrake(20, 3);
      } else {
        vehicle.applyEngineForce(0);
      }
    }
  });

  var targetPosition = new THREE.Vector3(0, -80, 40);
  var duration = 4000;

  scene.simulate();
  tweenCamera(targetPosition, duration);
}

function add3DGLTF(
  itemName,
  posX = 0,
  posY = 0,
  posZ = 0,
  scale,
  rotationOnXAxis = 1,
  rotationOnZAxis = 1,
  wheel = null,
  right
) {
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
      }
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
      camera.position.copy(targetPosition);
      camera.lookAt(vehicle.mesh.position);
    });
  tween.start();
}

function animate() {
  a.lerp(vehicle.mesh.position, 0.4);
  b.copy(goal.position);

  dir.copy(a).sub(b).normalize();
  dis = a.distanceTo(b);
  goal.position.addScaledVector(dir, dis);
  goal.position.lerp(temp, 0.4);
  temp.setFromMatrixPosition(follow.matrixWorld);
  camera.lookAt(vehicle.mesh.position);
}

function render() {
  requestAnimationFrame(render);
  render_stats.update();
  scene.simulate(undefined, 1);

  TWEEN.update();
  renderer.render(scene, camera);
  // camera.updateProjectionMatrix();

  if (vehicle) {
    animate();
  }
}

window.onload = () => {
  init();
  setupCamera();
  setupLight();
  createGeometry();
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
      bevelThickness = 0.2,
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
    mesh.name = 'text';
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
