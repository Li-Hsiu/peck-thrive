import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const Woodpecker = function(camera, scene) {

    this.camera = camera;
    this.scene = scene;

    this.health = 100;
    this.maxHealth = 100;

    // load woodpecker model
    const birdGeometry = new THREE.SphereGeometry(0.25, 32, 32);
    let birdMaterial = Physijs.createMaterial(
        new THREE.MeshStandardMaterial({ color: 0x00FF00, opacity: 0.0, transparent: true }),
        0.4,
        0.2
    );
    this.bird = new Physijs.SphereMesh(birdGeometry, birdMaterial);
    this.bird.position.set(0, 15, 0);
    //this.bird.setCcdMotionThreshold(30);
    //this.bird.setCcdSweptSphereRadius(0.2);
    //this.bird.add(new THREE.AxesHelper(20));
    this.bird.add(camera);
    scene.add(this.bird);
    const gltfLoader = new GLTFLoader();
    gltfLoader.load('./assets/bird/scene.gltf', (gltf) => {
        let birdModel = gltf.scene;
        this.mixer = new THREE.AnimationMixer(birdModel);
        birdModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        birdModel.position.set(0, -0.6, 0);
        birdModel.scale.set(0.25, 0.25, 0.25);
        birdModel.rotation.set(0,Math.PI,0);
        this.bird.add(birdModel);

        gltf.animations.forEach((clip) => {
            this.mixer.clipAction(clip).play();
            this.mixer.timeScale = 3;
        });
    });

    // initialize parameters
    this.isFlying = true;
    this.maxSpeed = 30;
    this.speed = 0;
    this.yawSpeed = 1.25;
    this.pitchSpeed = 1.25;

    this.yaw = 0.0;
    this.pitch = 0.0;
    this.yawQuaternion = new THREE.Quaternion();
    this.pitchQuaternion = new THREE.Quaternion();
    this.quaternion = new THREE.Quaternion();
    this.collisionRecoilStartTime = 0;
    this.onCollision = false;
    this.bounceDirection = null;

    this.originalPos = null;
    this.originalRot = null;
    this.goalPos = null;
    this.goalRot = null;
    this.originalCamPos = null;
    this.originalCamRot = null;
    this.goalCamPos = null;
    this.goalCamPos = null;
    this.startTime = null;
    this.duration = 1000;
    this.isInterpolating = false;
    this.target = null;

    this.enterPecking = false;
    this.exitPecking = false;

    this.sequence = [];
    this.keys = [];

    this.reduceHealthCooldown = new Date().getTime();
}

Woodpecker.prototype.update = function(a, d, w, s, space, deltaTime) {

    if (this.bird && this.isFlying) {  

        if (this.mixer) this.mixer.update(deltaTime); // Update animations

        // Set rotation based on deltaTime
        if (a) this.yaw += this.yawSpeed * deltaTime;
        if (d) this.yaw -= this.yawSpeed * deltaTime;
        if (w) this.pitch += this.pitchSpeed * deltaTime;
        if (s) this.pitch -= this.pitchSpeed * deltaTime;
        //if (space) this.pitch = 0;

        //this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));

        this.yawQuaternion.setFromEuler(new THREE.Euler(0, this.yaw, 0));
        this.pitchQuaternion.setFromEuler(new THREE.Euler(this.pitch, 0, 0));
        this.bird.rotation.setFromQuaternion(this.quaternion.multiplyQuaternions(this.yawQuaternion, this.pitchQuaternion));

        if (new Date().getTime() - this.collisionRecoilStartTime > 500) {
            
            if (a||d) this.speed = Math.min(this.maxSpeed/1.5, this.speed);

            if (this.onCollision) {
                this.bird.setLinearVelocity(new THREE.Vector3(0, 0, 0));
                this.speed = 0;
                this.onCollision = false;
            } 

            if (this.speed < this.maxSpeed) this.speed += this.maxSpeed * deltaTime * 0.5;
            else this.speed = this.maxSpeed;

            this.bird.position.add(this.bird.getWorldDirection(new THREE.Vector3()).multiplyScalar(-1 * this.speed * deltaTime));
            this.bird.__dirtyPosition = true;
            this.bird.material.color.set('#00FF00');
        }
        else {
            this.bird.setLinearVelocity(this.bounceDirection);
            this.bird.material.color.set('#FF0000');
        }
    }
    else if (this.bird && this.isPecking) {
        if (this.isInterpolating) {
            this.interpolate();
        }
        else {
            this.playPeckGame(a, d, w, s);
        }
    }
    if (new Date().getTime() - this.reduceHealthCooldown > 10000) {
        this.takeDamage(10);
        this.reduceHealthCooldown = new Date().getTime();
    }

    if (this.returnMessage) {
        const message = this.returnMessage;
        this.returnMessage = null;
        return message;
    }
    else return null;
}

Woodpecker.prototype.enterPeckGame = function(other) {
    console.log(other.position)
    this.target = other;
    this.originalPos = this.bird.position.clone();
    this.originalRot = this.bird.rotation.clone();
    this.bird.position.copy(other.position);
    this.bird.__dirtyPosition = true;
    this.bird.rotation.copy(other.rotation);
    this.bird.rotateX(-Math.PI/2);
    this.bird.position.add(this.bird.getWorldDirection(new THREE.Vector3()).multiplyScalar(2));
    this.bird.__dirtyRotation = true;
    this.goalPos = this.bird.position.clone();
    this.goalRot = this.bird.rotation.clone();
    other.material.opacity = 0;
    this.startTime = new Date().getTime();
    this.enterPecking = true;
    this.isInterpolating = true;
}

Woodpecker.prototype.interpolate = function() {
    const currentTime = new Date().getTime();
    const elapsedTime = currentTime - this.startTime;
    const progress = Math.min(elapsedTime / this.duration, 1);

    this.bird.position.lerpVectors(this.originalPos, this.goalPos, progress);
    
    const startQuaternion = new THREE.Quaternion().setFromEuler(this.originalRot);
    const endQuaternion = new THREE.Quaternion().setFromEuler(this.goalRot);
    const quaternion = new THREE.Quaternion();
    quaternion.slerpQuaternions(startQuaternion, endQuaternion, progress);
    this.bird.quaternion.copy(quaternion);

    if (this.enterPecking) {
        this.originalCamPos = new THREE.Vector3(0, 1.5, 4);
        this.goalCamPos = new THREE.Vector3(4, 0.5, 1.5);
        this.originalCamRot = this.bird.position.clone().add(new THREE.Vector3(0,1,0));
        this.goalCamRot = this.bird.position.clone().add(this.bird.getWorldDirection(new THREE.Vector3()).multiplyScalar(-1));
    }
    else {
        this.originalCamPos = new THREE.Vector3(4, 0.5, 1.5);
        this.goalCamPos = new THREE.Vector3(0, 1.5, 4);
        this.originalCamRot = this.bird.position.clone().add(this.bird.getWorldDirection(new THREE.Vector3()).multiplyScalar(-1));
        this.goalCamRot = this.bird.position.clone().add(new THREE.Vector3(0,1,0));
    }
    this.camera.position.lerpVectors(this.originalCamPos, this.goalCamPos, progress);
    const interpolatedLookAt = new THREE.Vector3().lerpVectors(this.originalCamRot, this.goalCamRot, progress);
    this.camera.lookAt(interpolatedLookAt);

    this.bird.__dirtyPosition = true;
    this.bird.__dirtyRotation = true;

    if (progress >= 1) {
        if (this.enterPecking) {
            this.isInterpolating = false;
            this.summonKeys();
            this.enterPecking = false;
        }
        else if (this.exitPecking) {
            this.isInterpolating = false;
            this.exitPecking = false;
            this.isFlying = true;
            this.isPecking = false;
            const currentEuler = new THREE.Euler().setFromQuaternion(this.bird.quaternion, 'YXZ');
            this.yaw = currentEuler.y;
            this.pitch = 0;
            this.speed = 0;
            this.bird.setLinearVelocity(new THREE.Vector3(0, 0, 0));
            this.returnMessage = 'resumeSimulation';
        }
    }
}

Woodpecker.prototype.summonKeys = function() {

    const offset = 0.5;

    let keyW = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0x0000ff }));
    keyW.position.copy(this.target.position);
    keyW.rotation.copy(this.target.rotation);
    keyW.rotateX(-Math.PI/2);
    keyW.position.add(this.bird.getWorldDirection(new THREE.Vector3()).multiplyScalar(offset));
    keyW.position.add(new THREE.Vector3(0, 1, 0).applyQuaternion(this.bird.quaternion).normalize().multiplyScalar(0.5));
    this.scene.add(keyW);

    let keyA = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0x0000ff }));
    keyA.position.copy(this.target.position);
    keyA.rotation.copy(this.target.rotation);
    keyA.rotateX(-Math.PI/2);
    keyA.position.add(this.bird.getWorldDirection(new THREE.Vector3()).multiplyScalar(offset));
    keyA.position.add(new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), this.bird.getWorldDirection(new THREE.Vector3())).normalize().multiplyScalar(-0.5));
    this.scene.add(keyA);

    let keyS = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0x0000ff }));
    keyS.position.copy(this.target.position);
    keyS.rotation.copy(this.target.rotation);
    keyS.rotateX(-Math.PI/2);
    keyS.position.add(this.bird.getWorldDirection(new THREE.Vector3()).multiplyScalar(offset));
    this.scene.add(keyS);

    let keyD = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0x0000ff }));
    keyD.position.copy(this.target.position);
    keyD.rotation.copy(this.target.rotation);
    keyD.rotateX(-Math.PI/2);
    keyD.position.add(this.bird.getWorldDirection(new THREE.Vector3()).multiplyScalar(offset));
    keyD.position.add(new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), this.bird.getWorldDirection(new THREE.Vector3())).normalize().multiplyScalar(0.5));
    this.scene.add(keyD);

    this.keys.push(keyW, keyA, keyS, keyD);
    this.generateKeySequence();
}

Woodpecker.prototype.generateKeySequence = function() {
    const keys = ['W', 'A', 'S', 'D'];
    this.sequence = [];
    const n = Math.floor(Math.random() * (20 - 10 + 1)) + 10;

    for (let i = 0; i < n; i++) {
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        this.sequence.push(randomKey);
    }
}

Woodpecker.prototype.playPeckGame = function(a,d,w,s) {
    let currentKey = this.sequence[this.sequence.length-1];
    console.log(currentKey);
    switch(currentKey) {
        case 'W':
            this.keys[0].material.color.set('#00ff00');
            this.keys[1].material.color.set('#0000ff');
            this.keys[2].material.color.set('#0000ff');
            this.keys[3].material.color.set('#0000ff');
            if (w && !a && !s && !d) {
                this.sequence.pop();
            }
            break;
        case 'A':
            this.keys[0].material.color.set('#0000ff');
            this.keys[1].material.color.set('#00ff00');
            this.keys[2].material.color.set('#0000ff');
            this.keys[3].material.color.set('#0000ff');
            if (!w && a && !s && !d) {
                this.sequence.pop();
            } 
            break;
        case 'S':
            this.keys[0].material.color.set('#0000ff');
            this.keys[1].material.color.set('#0000ff');
            this.keys[2].material.color.set('#00ff00');
            this.keys[3].material.color.set('#0000ff');
            if (!w && !a && s && !d) {
                this.sequence.pop();
            } 
            break;
        case 'D':
            this.keys[0].material.color.set('#0000ff');
            this.keys[1].material.color.set('#0000ff');
            this.keys[2].material.color.set('#0000ff');
            this.keys[3].material.color.set('#00ff00');
            if (!w && !a && !s && d) {
                this.sequence.pop();
            } 
            break;
    }
    if (this.sequence.length == 0) {
        this.takeDamage(-20);
        this.exitPeckGame();
    }
}

Woodpecker.prototype.exitPeckGame = function() {
    this.scene.remove(this.target);
    this.target = null;
    this.scene.remove(this.keys[0]);
    this.scene.remove(this.keys[1]);
    this.scene.remove(this.keys[2]);
    this.scene.remove(this.keys[3]);
    this.keys = [];
    this.originalPos = this.goalPos;
    this.originalRot = this.goalRot;
    this.isInterpolating = true;
    this.startTime = new Date().getTime();
    this.exitPecking = true;
}

Woodpecker.prototype.updateHealthBar = function() {
    const healthBar = document.getElementById('health-bar');
    const healthPercentage = this.health / this.maxHealth * 100;
    healthBar.style.width = healthPercentage + '%';
}

Woodpecker.prototype.takeDamage = function(amount) {
    this.health = Math.max(0, this.health - amount);
    this.updateHealthBar();
}

export{Woodpecker};