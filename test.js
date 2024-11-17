import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

Physijs.scripts.worker = 'physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

var scene, renderer, camera, controls, points, points2, geo1, geo2, objList, ambientLight, directionalLight, ground, bird, boss, keys, mixer, mixer2, raycaster, raycaster2, intersectPoint;

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
    scene = new Physijs.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.setGravity(new THREE.Vector3(0, 0, 0));

    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.set(30, 20, 50);
    camera.lookAt(0, 0, 0);


    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls( camera, renderer.domElement );

    ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 10, 0);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    var material = Physijs.createMaterial(
        new THREE.MeshStandardMaterial({ color: 0x00FF00, opacity: 0.5, transparent: true }),
        0.4,
        0.2
    );
    const fbxLoader = new FBXLoader();  
    const gltfLoader = new GLTFLoader(); 
    const textureLoader = new THREE.TextureLoader();

    ground = new Physijs.BoxMesh(new THREE.BoxGeometry( 50, 1, 50 ), material, 0);
    ground.position.set(0, -1, 0);
    ground.castShadow = true;
    ground.receiveShadow = true;
    scene.add(ground)

    const sphereGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    bird = new Physijs.SphereMesh(sphereGeometry, material);
    bird.position.set(0, 15, 0);
    bird.add(new THREE.AxesHelper(20));
    scene.add(bird);
    gltfLoader.load('./assets/bird/scene.gltf', (gltf) => {
        let birdModel = gltf.scene;
        mixer2 = new THREE.AnimationMixer(birdModel);
        birdModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        birdModel.position.set(0, -1.5, 0);
        birdModel.rotateY(Math.PI);
        birdModel.scale.set(0.7, 0.7, 0.7);
        bird.add(birdModel);

        gltf.animations.forEach((clip) => {
            mixer2.clipAction(clip).play();
            mixer2.timeScale = 3;
        });
    });

    raycaster = new THREE.Raycaster();
    raycaster2 = new THREE.Raycaster();

    intersectPoint = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    scene.add(intersectPoint);

    const sphereGeometry2 = new THREE.SphereGeometry(1.0, 32, 32);
    boss = new Physijs.SphereMesh(sphereGeometry2, material);
    boss.position.set(5, 15, 0);
    boss.add(new THREE.AxesHelper(20));
    scene.add(boss);
    gltfLoader.load('./assets/boss/scene.gltf', (gltf) => {
        let bossModel = gltf.scene;
        mixer = new THREE.AnimationMixer(bossModel);
        bossModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        bossModel.rotateY(Math.PI);
        bossModel.scale.set(2.5, 2.5, 2.5);
        boss.add(bossModel);

        gltf.animations.forEach((clip) => {
            mixer.clipAction(clip).play();
            mixer.timeScale = 3;
        });
    });

    objList = [];
    let direction = bird.position.clone().sub(boss.position).normalize();
    raycaster.set(boss.position, direction);

    points = [];
    points.push(boss.position.clone());
    points.push(boss.position.clone().add(direction.clone().multiplyScalar(20)));
    geo1 = new THREE.BufferGeometry().setFromPoints(points);
    const rayLine = new THREE.Line(geo1, new THREE.LineBasicMaterial({ color: 0xff0000 }));
    scene.add(rayLine);

    let direction2 = direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 36);
    points2 = [];
    points2.push(boss.position.clone());
    points2.push(boss.position.clone().add(direction2.clone().multiplyScalar(20)));
    geo2 = new THREE.BufferGeometry().setFromPoints(points2);
    const rayLine2 = new THREE.Line(geo2, new THREE.LineBasicMaterial({ color: 0xff0000 }));
    scene.add(rayLine2);

    // create tree
    {
    var tree = new Physijs.BoxMesh(new THREE.BoxGeometry(2, 2, 2), material, 0);
    tree.position.set(0, -0.5, -15);

    const trunk1Geometry = new THREE.CylinderGeometry(3, 3, 16);
    let trunk1 = new Physijs.CylinderMesh(trunk1Geometry, material);
    trunk1.position.set(0, 8, 0);
    tree.add(trunk1); 

    const trunk2Geometry = new THREE.CylinderGeometry(1.5, 1.5, 16);
    let trunk2 = new Physijs.CylinderMesh(trunk2Geometry, material);
    trunk2.position.set(0, 16, 0);
    trunk1.add(trunk2);

    const trunk3Geometry = new THREE.CylinderGeometry(0.7, 0.7, 8);
    let trunk3 = new Physijs.CylinderMesh(trunk3Geometry, material);
    trunk3.rotation.set(-5*Math.PI/180, 0, 13*Math.PI/180);
    trunk3.position.set(-0.6, 12, -0.5);
    trunk2.add(trunk3);

    const branch1Geometry = new THREE.CylinderGeometry(0.75, 0.75, 5);
    let branch1 = new Physijs.CylinderMesh(branch1Geometry, material);
    branch1.rotation.set(0*Math.PI/180, -32*Math.PI/180, -65*Math.PI/180);
    branch1.position.set(3, -4, 1.5);
    trunk2.add(branch1);

    const branch2Geometry = new THREE.CylinderGeometry(0.75, 0.75, 7);
    let branch2 = new Physijs.CylinderMesh(branch2Geometry, material);
    branch2.rotation.set(0*Math.PI/180, 50*Math.PI/180, -60*Math.PI/180);
    branch2.position.set(2.7, 3.8, -3.6);
    trunk2.add(branch2);

    const branch21Geometry = new THREE.CylinderGeometry(0.65, 0.65, 7);
    let branch21 = new Physijs.CylinderMesh(branch21Geometry, material);
    branch21.rotation.set(0*Math.PI/180, 0*Math.PI/180, 52*Math.PI/180);
    branch21.position.set(-2, 5.5, 0);
    branch2.add(branch21);

    const branch22Geometry = new THREE.CylinderGeometry(0.35, 0.35, 8);
    let branch22 = new Physijs.CylinderMesh(branch22Geometry, material);
    branch22.rotation.set(0*Math.PI/180, -13*Math.PI/180, -23*Math.PI/180);
    branch22.position.set(1.5, 7, 0.1);
    branch21.add(branch22);

    const branch23Geometry = new THREE.CylinderGeometry(0.5, 0.5, 8);
    let branch23 = new Physijs.CylinderMesh(branch23Geometry, material);
    branch23.rotation.set(41*Math.PI/180, 0*Math.PI/180, 20*Math.PI/180);
    branch23.position.set(-1, 4.5, 3.5);
    branch2.add(branch23);

    const branch3Geometry = new THREE.CylinderGeometry(0.75, 0.75, 5);
    let branch3 = new Physijs.CylinderMesh(branch3Geometry, material);
    branch3.rotation.set(0*Math.PI/180, 0*Math.PI/180, 40*Math.PI/180);
    branch3.position.set(-3, 5, 0);
    trunk2.add(branch3);

    const branch31Geometry = new THREE.CylinderGeometry(0.6, 0.6, 6);
    let branch31 = new Physijs.CylinderMesh(branch31Geometry, material);
    branch31.rotation.set(0*Math.PI/180, 0*Math.PI/180, 40*Math.PI/180);
    branch31.position.set(-1.6, 4, 0);
    branch3.add(branch31);

    const branch32Geometry = new THREE.CylinderGeometry(0.3, 0.3, 7.5);
    let branch32 = new Physijs.CylinderMesh(branch32Geometry, material);
    branch32.rotation.set(0*Math.PI/180, 0*Math.PI/180, -29*Math.PI/180);
    branch32.position.set(1.5, 6, 0);
    branch31.add(branch32);

    const branch4Geometry = new THREE.CylinderGeometry(0.75, 0.75, 8.5);
    let branch4 = new Physijs.CylinderMesh(branch4Geometry, material);
    branch4.rotation.set(65*Math.PI/180, 0*Math.PI/180, -2*Math.PI/180);
    branch4.position.set(0.3, 7, 5);
    trunk2.add(branch4);

    const branch41Geometry = new THREE.CylinderGeometry(0.5, 0.5, 7.5);
    let branch41 = new Physijs.CylinderMesh(branch41Geometry, material);
    branch41.rotation.set(-37*Math.PI/180, 0*Math.PI/180, 0*Math.PI/180);
    branch41.position.set(0, 7, -2);
    branch4.add(branch41);
    
    const texture = textureLoader.load('./assets/tree/Textures/T_Trees_temp_climate.png');
    fbxLoader.load('./assets/tree/Fbx/tree01.FBX', (fbx) => {
        fbx.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.material.map = texture;
                child.material.needsUpdate = true;
            }
        });
        fbx.scale.copy(new THREE.Vector3(0.1,0.1,0.1));
        fbx.position.set(0, 0, 0);
        tree.add(fbx);
    });
    scene.add(tree);
    objList.push(tree);
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            console.log("hide")
            isRunning = false;
        } else {
            console.log("start")
            isRunning = true;
        }
    });
    

    initKeys();
    bird.addEventListener('collision', function(other) {
        collisionRecoilStartTime = new Date().getTime();
        console.log('Collision detected with', other);
    });
    
}

function animate() {
    requestAnimationFrame(animate);
    var currentTime = new Date().getTime();
    const deltaTime = (currentTime - lastTime) / 1000 || 0;
    lastTime = currentTime;

    if (isRunning) {
        if (mixer) mixer.update(deltaTime);
        if (mixer2) mixer2.update(deltaTime);
        // Set rotation based on deltaTime
        if (keys.a) yaw += rotationSpeed * deltaTime;
        if (keys.d) yaw -= rotationSpeed * deltaTime;
        if (keys.w) pitch += rotationSpeed * deltaTime;
        if (keys.s) pitch -= rotationSpeed * deltaTime;

        yawQuaternion.setFromEuler(new THREE.Euler(0, yaw, 0));
        pitchQuaternion.setFromEuler(new THREE.Euler(pitch, 0, 0));
        bird.rotation.setFromQuaternion(quaternion.multiplyQuaternions(yawQuaternion, pitchQuaternion));
        if (new Date().getTime()-collisionRecoilStartTime > 500) { 
            if (speed < maxSpeed) speed += maxSpeed * deltaTime;
            else speed = maxSpeed;
            if (keys.space) bird.position.add(bird.getWorldDirection(new THREE.Vector3()).multiplyScalar(-1*speed * deltaTime));
            bird.__dirtyPosition = true;
            bird.material.color.set('#00FF00');
        }
        else {
            bird.setLinearVelocity(bird.getWorldDirection(new THREE.Vector3()).multiplyScalar(-1*speed));
            speed = -10;
            bird.material.color.set('#FF0000');
        }
        


        let direction = bird.position.clone().sub(boss.position).normalize();
        raycaster.set(boss.position, direction);
        const intersects = raycaster.intersectObjects(objList, true);
        
        points[0].copy(boss.position.clone());
        points[1].copy(boss.position.clone().add(direction.clone().multiplyScalar(200)));
        geo1.setFromPoints(points);

        if (intersects.length > 0) {
            console.log(intersects[0].point)
            intersectPoint.position.copy(intersects[0].point);
        }
        else {
            intersectPoint.position.copy(new THREE.Vector3(0,0,0));
            console.log("No Obstacles")
        }

        let direction2 = direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 36);
        raycaster2.set(boss.position, direction2);
        
        points2[0].copy(boss.position.clone());
        points2[1].copy(boss.position.clone().add(direction2.clone().multiplyScalar(200)));
        geo2.setFromPoints(points2);


        scene.simulate(); 
        renderer.render(scene, camera);
    }
}

var maxSpeed = 50;
var speed = 0;
var rotationSpeed = 2;
var yaw = 0.0;
var pitch = 0.0;
var yawQuaternion = new THREE.Quaternion();
var pitchQuaternion = new THREE.Quaternion();
var quaternion = new THREE.Quaternion();
var lastTime = new Date().getTime();
var collisionRecoilStartTime = 0;
var isRunning = true;

init();
animate();