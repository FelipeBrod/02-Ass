'use strict';

let renderer, scene, camera, orbitControl, plane;
let controls, gui, levels;
let axesHelper;
let pyramidHeight, levelOne, levelTwo, levelThree;
let selectedLevel, restartGui, playGui;
let textMass = 0;

let jsonLoaded,
  startGame,
  isPlaying = false;

let spotLight, hemisphereLight;
let directionalShadowHelper;
let pyramidBase;
const distanceBetweenBoxes = 0.25; // 1/4 of the box size
let boxXInitialPos, boxXPostion;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let groupBox = new THREE.Group();
let INTERSECTED;
const objects = [];
let groundBase = false;
let goldenBox = false;
let maxVelocity = 10;

var textLoader = new THREE.FontLoader();
let lightBoxMesh, heavyBoxMesh;
let position;
let lightBox, heavyBox, box;
let lightBoxColor = 0xff1a00;
let heavyBoxColor = 0xf01af0;

const audioListener = new THREE.AudioListener();
const crackingSound = new THREE.Audio(audioListener);
const audioLoader = new THREE.AudioLoader();
const loader = new THREE.GLTFLoader();
loader.setPath('./assets/textures/');

Physijs.scripts.worker = '../node_modules/physijs_worker.js';
Physijs.scripts.ammo = '../node_modules/ammo.js';

window.addEventListener('mousemove', onMouseMove);
window.addEventListener('pointerdown', onMouseClick);
// initialize the threejs environment
function init() {
  scene = new Physijs.Scene();
  scene.setGravity(new THREE.Vector3(0, -50, 0));
  scene.background = new THREE.Color(0xffffff);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xf2ffa1);
  renderer.shadowMap.enabled = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);
  createUIText('w o r k', 20, 30, -10, 2);
  createUIText('c o n t a c t', 32, 30, -10, 2);
  createUIText('I love making \napplications fun to \nuse', -50, 0, -10, 1);

  //createAxesHelper();
}

function setupCameraAndLight() {
  camera = new THREE.PerspectiveCamera(
    15,
    window.innerWidth / window.innerHeight,
    1,
    1000
  );
  camera.position.set(0, 0, 280);
  camera.add(audioListener);

  spotLight = new THREE.SpotLight(0xeeeeeeee, 2.5);
  spotLight.castShadow = true;
  spotLight.position.set(0, 65, 60);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  hemisphereLight = new THREE.HemisphereLight(0xffeeff, 0x39ffff, 0.2);
  hemisphereLight.position.set(5, 10, 1);

  scene.add(spotLight, hemisphereLight);

  //createShadowHelpers();
  orbitControl = new THREE.OrbitControls(camera, renderer.domElement);
}

function createGeometry() {
  // plane = createMesh('plane', 'standard', 0xf1f1f1, true, true, 20);
  add3DLogo();
  let plane_mat = Physijs.createMaterial(
    new THREE.MeshLambertMaterial(0x1e1e1e),
    0.9, //friction
    0.01 //restituiton
  );

  let plane = new Physijs.BoxMesh(
    new THREE.BoxBufferGeometry(60, 100, 1),
    plane_mat,
    0 //mass
  );

  plane.name = 'plane';
  plane.rotation.x = -0.5 * Math.PI;
  //scene.add(plane);

  plane.addEventListener('collision', function (other_obj, rel_vel, rel_rot) {
    if (rel_vel.y > maxVelocity) {
      if (other_obj.name != 'groundBox') {
        if (other_obj.name === 'goldenBox') {
          playSound('cracking');
          setTimeout(() => {
            playSound('gameOver');
          }, 1300);
          createUIText('loose');
        }
        scene.remove(other_obj);

        playSound('cracking');
      }
    } else if (other_obj.name === 'goldenBox') {
      playSound('win');
      createUIText('win');
      console.log('U win');
    }
  });
}

function add3DLogo() {
  loader.load(
    'Logo3D.gltf',
    function (data) {
      data.scene.traverse(function (child) {
        if (child.isMesh) {
          let m = child;
          //m.receiveShadow = true;
          m.castShadow = true;
        }
        if (child.isLight) {
          let l = child;
          // l.castShadow = true;
          // l.shadow.bias = -0.003;
          l.shadow.mapSize.width = 2048;
          l.shadow.mapSize.height = 2048;
        }
      });

      const model = data.scene;
      // model.scale(100, 100, 100);
      console.log(model);
      model.position.set(-50, 22, 20);
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

function setupDatGui() {
  controls = new (function () {
    this.url = 'localhost';
    this.port = '5500';
    this.filename = 'felipe.json';
    this.loadLevels = function () {
      loadLevels(this.filename);
    };
    this.levels = [];

    this.play = function () {
      if (isPlaying) {
        gui.remove(playGui);
      } else {
        playGame();
      }
    };

    this.restart = function () {
      gui.remove(restartGui);
      clearScene();
      setTimeout(() => {
        playGame();
      }, 1000);
    };
  })();
  gui = new dat.GUI();
  gui.add(controls, 'url');
  gui.add(controls, 'port');
  gui.add(controls, 'filename');
  gui.add(controls, 'loadLevels');
}

function playGame() {
  createUIText('instruction2');
  restartGui = gui.add(controls, 'restart');
  console.log('play');
  createPyramid(selectedLevel, 2);
  isPlaying = true;
}

function clearScene() {
  let group = []; // = new THREE.Group();
  for (let i = 0; i < scene.children.length; i++) {
    let box = scene.children[i];

    if (box.name.slice(-3) === 'Box' || box.name === 'text') {
      group.push(box);
    }
  }
  group.forEach((e) => {
    scene.remove(e);
  });
}

function clearUIText() {
  let group = []; // = new THREE.Group();
  for (let i = 0; i < scene.children.length; i++) {
    let textUI = scene.children[i];

    if (textUI.name === 'text') {
      group.push(textUI);
    }
  }
  group.forEach((e) => {
    scene.remove(e);
  });
}

function loadLevels(url) {
  let request = new XMLHttpRequest(); //creates a XMLHttpRequest object
  request.open('GET', 'felipe.json'); //set the command and the url
  request.responseType = 'json'; //sets the response format
  request.send(); //send the command to the service
  request.onload = () => {
    //what to do when load is completed
    levels = request.response;
    parseJson(levels);
  };
  createUIText('instructions');

  if (levelOne) {
    if (jsonLoaded) return;
    gui
      .add(controls, 'levels', {
        easy: levelOne,
        moderate: levelTwo,
        hard: levelThree,
      })
      .onChange((e) => {
        selectedLevel = e;
        startGame = true;
        if (isPlaying) return;
        playGui = gui.add(controls, 'play');
      });
    //console.log(selectedLevel);
    jsonLoaded = true;
  }
}

function onMouseMove(event) {
  // calculate mouse position in normalized device coordinates
  // (-1 to +1) for both components
  //event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(scene.children);

  if (intersects.length > 0) {
    if (INTERSECTED != intersects[0].object) {
      if (INTERSECTED) {
        if (INTERSECTED.mesh.name != 'text') {
          INTERSECTED.material.__proto__.color.setHex(INTERSECTED.currentHex);

          INTERSECTED = intersects[0].object;
          INTERSECTED.currentHex = INTERSECTED.material.__proto__.color.getHex();
          INTERSECTED.material.__proto__.color.setHex(0xd3d3ffff);
        } else {
          if (INTERSECTED) {
            INTERSECTED.material.__proto__.color.setHex(INTERSECTED.currentHex);
          }

          INTERSECTED = null;
        }
      }
    }
  }
}

function onMouseClick(event) {
  if (
    (INTERSECTED && INTERSECTED.name.slice(-3) === 'Box') ||
    INTERSECTED.name === 'text'
  ) {
    var selectedObject = scene.getObjectById(INTERSECTED.id);
    console.log(selectedObject);
    scene.remove(selectedObject);
  }
}

function render() {
  requestAnimationFrame(render);
  scene.simulate(undefined, 1);
  orbitControl.update();
  renderer.render(scene, camera);
}

window.onload = () => {
  init();
  setupDatGui();
  setupCameraAndLight();
  createGeometry();
  render();
};

let createMesh = (
  geometryType,
  materialType,
  color,
  willCastShadow,
  willReceiveShadow,
  size,
  mass,
  friction,
  bouciness
) => {
  let shape;
  switch (geometryType) {
    case 'sphere':
      shape = new THREE.SphereGeometry(size, 20, 20);
      break;
    case 'box':
      shape = new THREE.BoxBufferGeometry(size, size, size);
      break;
    case 'plane':
      shape = new THREE.PlaneGeometry(size, size);
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

  let mesh = new Physijs.BoxMesh(shape, material, friction, bouciness, mass);

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
  let _color, _size;
  switch (visualHirearchy) {
    case 1:
      _size = 3;
      _color = 0x605a5a;

      break;
    case 2:
      _size = 1.5;
      _color = 0x6d6e71;
      break;
    case 3:
      _size = 1.5;
      _color = 0xd4af37;
      break;
    case 4:
      _size = 1.5;
      _color = 0xffaa0f;
      break;
    case 5:
      _size = 1.5;
      _color = 0xfff000;
      break;
  }

  textLoader.load(
    '../node_modules/three/examples/fonts/Poppins_Light_Regular.json',
    (e) => {
      let textUI = text,
        height = 0.1,
        size = _size,
        curveSegments = 4,
        bevelThickness = 0.1,
        bevelSize = 0.02,
        bevelSegments = 3,
        bevelEnabled = true,
        font = e,
        weight = 2, // normal bold
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
      //var material = new THREE.MeshBasicMaterial({ color: 0x11ff00 });
      // var textGeo = new THREE.Mesh(textGeo, material);

      let materialText = Physijs.createMaterial(
        new THREE.MeshBasicMaterial({ color: _color }),
        0.2, //friction
        10 //restituiton
      );

      let mesh = new Physijs.BoxMesh(textGeo, materialText, textMass);

      mesh.position.set(posX, posY, posZ);
      mesh.name = 'text';
      scene.add(mesh);
    }
  );
}

function createAxesHelper() {
  axesHelper = new THREE.AxesHelper(20);

  scene.add(axesHelper);
}

function createShadowHelpers() {
  //shadow Helpers;
  directionalShadowHelper = new THREE.CameraHelper(spotLight.shadow.camera);
  directionalShadowHelper.visible = true;
  directionalShadowHelper.scale.set(80, 80, 80);

  scene.add(directionalShadowHelper);
}
