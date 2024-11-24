import * as THREE from 'three';
import { Woodpecker } from './woodpeckerController.js';
import { Hawk } from './hawkController.js';
import { ChunkManager } from './chunkManager.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';

Physijs.scripts.worker = 'physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

var scene, renderer, camera, ambientLight, directionalLight;
var keys, woodpecker, hawk, chunkManager, loadingManager, lastTime, totalDuration, isLoaded = false, isRunning = true, isSimulationPaused = false;
var timeStage, timeStageBoolean, levelStage;

function initKeys() {
    keys = {
        w: false,
        a: false,
        s: false,
        d: false,
        e: false,
        space: false
    };
    window.addEventListener('keydown', (event) => {
        switch (event.key) {
            case 'w': keys.w = true; break;
            case 'a': keys.a = true; break;
            case 's': keys.s = true; break;
            case 'd': keys.d = true; break;
            case 'e': keys.e = true; break;
            case ' ': keys.space = true; break;
        }
    });
    window.addEventListener('keyup', (event) => {
        switch (event.key) {
            case 'w': keys.w = false; break;
            case 'a': keys.a = false; break;
            case 's': keys.s = false; break;
            case 'd': keys.d = false; break;
            case 'e': keys.e = false; break;
            case ' ': keys.space = false; break;
        }
    });
}

function init() {
    scene = new Physijs.Scene({ reportsize: 350, fixedTimeStep: 1 / 240 });
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0xaaaaaa, 110, 150);
    scene.setGravity(new THREE.Vector3( 0, 0, 0 ))
    //const gridHelper = new THREE.GridHelper(10000, 1000);
    //scene.add(gridHelper);

    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 140 );
    camera.position.set(0, 1.5, 4);
    camera.lookAt(0, 1, 0);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 200, 0);
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 250;
    directionalLight.shadow.camera.left = -500;
    directionalLight.shadow.camera.right = 500;
    directionalLight.shadow.camera.top = 500;
    directionalLight.shadow.camera.bottom = -500;
    directionalLight.shadow.mapSize.set(8192,8192);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    loadingManager = new THREE.LoadingManager();
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    loadingManager.onLoad = function () {
        progressContainer.style.display = 'none';
        const healthBarContainer = document.getElementById('health-bar-container');
        healthBarContainer.style.display = 'block';
        totalDuration = 0;
        isLoaded = true;
    };
    loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
        const progress = (itemsLoaded / itemsTotal) * 100;
        //console.log( 'Loading file: ' + url + '.\nLoaded ' + itemsLoaded + ' of ' + itemsTotal + ' files.' );
        progressBar.style.width = progress + '%';
        progressContainer.style.display = 'block';
    };
    
    woodpecker = new Woodpecker(camera, scene, loadingManager);
    hawk = new Hawk(scene, woodpecker, loadingManager);
    chunkManager = new ChunkManager(scene, loadingManager);
    
    const rgbeLoader = new RGBELoader(loadingManager);
    rgbeLoader.load('./assets/sky.hdr', (texture) => {
        scene.background = texture;
        texture.mapping = THREE.EquirectangularRefractionMapping;
    });

    timeStage = [60, 180, 300, 420, 560];
    levelStage = 0;

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
            lastTime = new Date().getTime();
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
        else if (other.name == "nest") {
            levelStage += 1;
            other.parent.remove(other);
            other.geometry.dispose();
            other.material.dispose();
            ChunkManager.timeStageBoolean = false;
            woodpecker.bird.setLinearVelocity(new THREE.Vector3(0, 0, 0));
            console.log("level up! " + level);
            if (level >= 5) {
                console.log("win!");
                isRunning = false;
                const titleElement = document.getElementById('title');
                const scoreElement = document.getElementById('score');
                const replayButton = document.getElementById('replay-button');
                const gameOverOverlay = document.getElementById('game-over-overlay');
                titleElement.textContent = 'You Win!';
                scoreElement.textContent = 10;
                gameOverOverlay.style.display = 'flex';
                replayButton.addEventListener('click', () => {
                    location.reload();
                });
            }
            woodpecker.levelAdjust(levelStage);
            hawk.levelAdjust(levelStage);
        }
        else {
            woodpecker.collisionRecoilStartTime = new Date().getTime();
            woodpecker.onCollision = true;
            woodpecker.takeDamage(woodpecker.speed/2, true);
            woodpecker.bounceDirection = woodpecker.bird.getWorldDirection(new THREE.Vector3()).multiplyScalar(woodpecker.speed/4);
        }
    });
   
}

function animate() {
    requestAnimationFrame(animate);    

    if (isRunning && isLoaded) {
        
        if (woodpecker && woodpecker.bird) {
            var currentTime = new Date().getTime();
            const deltaTime = (currentTime - lastTime) / 1000 || 0;
            lastTime = currentTime;
            totalDuration += deltaTime;

            let birdMessage = woodpecker.update(keys.a, keys.d, keys.w, keys.s, keys.e, keys.space, deltaTime, renderer);
            if (birdMessage == 'resumeSimulation') {
                isSimulationPaused = false;
                scene.onSimulationResume();
            }
            
            document.querySelector(".label1").innerText = "Time: " + totalDuration.toFixed(1);

            directionalLight.position.copy(woodpecker.bird.position);
            directionalLight.position.y = 200;
            directionalLight.target = woodpecker.bird;

            chunkManager.update(woodpecker.bird.position, timeStage, levelStage, totalDuration);

            if (hawk && hawk.boss) {
                hawk.update(deltaTime, chunkManager);
            }

            if (woodpecker.health <= 0) {
                isRunning = false;
                const titleElement = document.getElementById('title');
                const scoreElement = document.getElementById('score');
                const replayButton = document.getElementById('replay-button');
                const gameOverOverlay = document.getElementById('game-over-overlay');
                titleElement.textContent = 'Game Over';
                scoreElement.textContent = 10;
                gameOverOverlay.style.display = 'flex';
                replayButton.addEventListener('click', () => {
                    location.reload();
                });
            }
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