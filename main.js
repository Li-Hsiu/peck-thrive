import * as THREE from 'three';
import { Woodpecker } from './woodpeckerController.js';
import { ChunkManager } from './chunkManager.js';

Physijs.scripts.worker = 'physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

var scene, renderer, camera, ambientLight, directionalLight, keys, woodpecker, chunkManager, lastTime, isRunning = true, isSimulationPaused = false;

function initKeys() {
    keys = {
        w: false,
        a: false,
        s: false,
        d: false,
        space: false
    };
    window.addEventListener('keydown', (event) => {
        switch (event.key) {
            case 'w': keys.w = true; break;
            case 'a': keys.a = true; break;
            case 's': keys.s = true; break;
            case 'd': keys.d = true; break;
            case ' ': keys.space = true; break;
        }
    });
    window.addEventListener('keyup', (event) => {
        switch (event.key) {
            case 'w': keys.w = false; break;
            case 'a': keys.a = false; break;
            case 's': keys.s = false; break;
            case 'd': keys.d = false; break;
            case ' ': keys.space = false; break;
        }
    });
}

function init() {
    scene = new Physijs.Scene({ reportsize: 350, fixedTimeStep: 1 / 240 });
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0xaaaaaa, 100, 200);
    scene.setGravity(new THREE.Vector3( 0, 0, 0 ))
    //const gridHelper = new THREE.GridHelper(10000, 1000);
    //scene.add(gridHelper);

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 150 );
    camera.position.set(0, 1.5, 4);
    camera.lookAt(0, 1, 0);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 200, 0);
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 250;
    directionalLight.shadow.camera.left = -500;  // Adjust to cover the scene
    directionalLight.shadow.camera.right = 500;
    directionalLight.shadow.camera.top = 500;
    directionalLight.shadow.camera.bottom = -500;
    directionalLight.shadow.mapSize.set(8192,8192);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    //var shadowHelper = new THREE.CameraHelper( directionalLight.shadow.camera );
    //scene.add( shadowHelper );

    woodpecker = new Woodpecker(camera, scene);
    chunkManager = new ChunkManager(scene, new THREE.Vector3(0, 50, 0));

    initKeys();
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            isSimulationPaused = true;
            isRunning = false;
        } else {
            isSimulationPaused = false;
            scene.onSimulationResume();
            isRunning = true;
        }
    });
    woodpecker.bird.addEventListener('collision', function(other) {
        console.log('Collision detected with', other.name);
        if (other.name == "target") {
            woodpecker.isFlying = false;
            woodpecker.isPecking = true;
            isSimulationPaused = true;
            woodpecker.enterPeckGame(other);
        }
        else {
            woodpecker.collisionRecoilStartTime = new Date().getTime();
            woodpecker.onCollision = true;
            woodpecker.bounceDirection = woodpecker.bird.getWorldDirection(new THREE.Vector3()).multiplyScalar(woodpecker.speed/4);
        }
        
    });
}

function animate() {
    requestAnimationFrame(animate);

    var currentTime = new Date().getTime();
    const deltaTime = (currentTime - lastTime) / 1000 || 0;
    lastTime = currentTime;

    if (isRunning) {

        if (woodpecker && woodpecker.bird) {
            let birdMessage = woodpecker.update(keys.a, keys.d, keys.w, keys.s, keys.space, deltaTime);
            if (birdMessage == 'resumeSimulation') {
                isSimulationPaused = false;
                scene.onSimulationResume();
            }
            
            //document.querySelector(".label1").innerText = "Coord: (" + woodpecker.bird.position.x.toFixed(1) + ", " + woodpecker.bird.position.y.toFixed(1) + ", " + woodpecker.bird.position.z.toFixed(1) + ")";

            directionalLight.position.copy(woodpecker.bird.position);
            directionalLight.position.y = 200;
            directionalLight.target = woodpecker.bird;

            chunkManager.update(woodpecker.bird.position);

        }
        if (!isSimulationPaused) {
            scene.simulate();
        }
        renderer.render(scene, camera);
    }
}

var lastTime = new Date().getTime();
init();
animate();