import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const Hawk = function(scene, bird, loadingManager) {
    
    this.scene = scene;
    this.bird = bird;

    this.soundInitialized = false;

    this.boss = new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 32), new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.0, transparent:true }));
    this.boss.position.set(100, 12, 0);
    const gltfLoader = new GLTFLoader(loadingManager); 
    gltfLoader.load('./assets/boss/scene.gltf', (gltf) => {
        this.bossModel = gltf.scene;
        this.mixer = new THREE.AnimationMixer(this.bossModel);
        this.bossModel.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        this.bossModel.scale.set(2.5, 2.5, 2.5);
        //this.bossModel.add(new THREE.AxesHelper(20));
        this.boss.add(this.bossModel);
        this.scene.add(this.boss);

        gltf.animations.forEach((clip) => {
            this.mixer.clipAction(clip).play();
        });
    });

    this.flightDirection = new THREE.Vector3(0,0,0);
    this.rotateSpeed = 20;
    this.speed = 10;
    this.yaw = 0;
    this.pitch = 0;
    
    this.raycasterCenter = new THREE.Raycaster();
    this.raycasterLeft = new THREE.Raycaster();
    this.raycasterRight = new THREE.Raycaster();
    this.centerDirection = new THREE.Vector3(0,0,0);
    this.leftDirection = new THREE.Vector3(0,0,0);
    this.rightDirection = new THREE.Vector3(0,0,0);

    //this.centerPoints = [];
    //this.centerPoints.push(this.boss.position.clone());
    //this.centerPoints.push(this.boss.position.clone().add(this.centerDirection.clone().multiplyScalar(200)));
    //this.centerGeo = new THREE.BufferGeometry().setFromPoints(this.centerPoints);
    //this.centerRayLine = new THREE.Line(this.centerGeo, new THREE.LineBasicMaterial({ color: 0xff0000 }));
    //this.scene.add(this.centerRayLine);

    //this.centerIntersect = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    //scene.add(this.centerIntersect);

}

Hawk.prototype.update = function(deltaTime, chunkManager, listener) {
    if (!this.soundInitialized) {
        this.sound = new THREE.PositionalAudio(listener);
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('./assets/wing-flap.mp3', (buffer) => {
            this.sound.setBuffer(buffer);
            this.sound.setRefDistance(20); 
            this.sound.setLoop(true);
            this.sound.autoplay = false; 
            this.sound.pause();
        });
        this.boss.add(this.sound);
        this.soundInitialized = true;
    }
    if (this.boss && this.bird.bird) {
        if (this.mixer) this.mixer.update(deltaTime);

        if (this.boss.position.distanceTo(this.bird.bird.position) < 2) {
            this.bird.takeDamage(this.bird.maxHealth);
        }

        this.centerDirection.copy(this.bird.bird.position.clone().sub(this.boss.position).normalize());
        this.raycasterCenter.set(this.boss.position, this.centerDirection);

        //this.centerPoints[0].copy(this.boss.position.clone());
        //this.centerPoints[1].copy(this.boss.position.clone().add(this.centerDirection.clone().multiplyScalar(20000)));
        //this.centerGeo.setFromPoints(this.centerPoints);

        let objList = [];
        for (let i=0; i<chunkManager.chunkList.length; i++) {
            objList = objList.concat(chunkManager.chunkList[i].treeList);
        }
        
        const intersects = this.raycasterCenter.intersectObjects(objList, true);
        
        let isDirect = false;
        // if there is intersection, and the intersection is in front of the bird, and the intersection is close to self so need avoidance (-1 for hiding in model)
        if (intersects.length > 0 && intersects[0].distance < this.boss.position.distanceTo(this.bird.bird.position)-2 && intersects[0].distance < 50) { // has obstacle
            //this.centerIntersect.position.copy(intersects[0].point);
            this.leftDirection.copy(this.centerDirection);
            this.rightDirection.copy(this.centerDirection);
            while (true) {
                this.leftDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 36);
                this.raycasterLeft.set(this.boss.position, this.leftDirection);
                const intersectsLeft = this.raycasterLeft.intersectObjects(objList, true);
                if (intersectsLeft.length == 0 || intersectsLeft[0].distance > this.boss.position.distanceTo(this.bird.bird.position) || intersectsLeft[0].distance > 50) {
                    this.flightDirection.copy(this.leftDirection);
                    break;
                }
                this.rightDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 36);
                this.raycasterRight.set(this.boss.position, this.rightDirection);
                const intersectsRight = this.raycasterRight.intersectObjects(objList, true);
                if (intersectsRight.length == 0 || intersectsRight[0].distance > this.boss.position.distanceTo(this.bird.bird.position) || intersectsRight[0].distance > 50) {
                    this.flightDirection.copy(this.rightDirection);
                    break;
                }
            }
        }
        else { // direct visibility
            //this.centerIntersect.position.copy(new THREE.Vector3(0,0,0));
            this.flightDirection.copy(this.centerDirection.normalize());
            isDirect = true;
        }

        this.updateRotation(deltaTime, isDirect);

        if (this.boss.position.distanceTo(this.bird.bird.position) > 200) {
            this.sound.pause();
            this.boss.position.add(this.boss.getWorldDirection(new THREE.Vector3()).multiplyScalar( this.speed * 1.25 * deltaTime));
        }
        else {
            if (!this.sound.isPlaying) this.sound.play();
            this.boss.position.add(this.boss.getWorldDirection(new THREE.Vector3()).multiplyScalar( this.speed * deltaTime));
        }
    } 

}

Hawk.prototype.updateRotation = function(deltaTime, isDirect) {

    let rotateSpeed = this.rotateSpeed;
    if (this.boss.position.distanceTo(this.bird.bird.position) < 10 && isDirect) {
        rotateSpeed = 50;
    }
    
    const currentDirection = new THREE.Vector3();
    this.boss.getWorldDirection(currentDirection);

    const angleToTarget = Math.atan2(this.flightDirection.x, this.flightDirection.z) - Math.atan2(currentDirection.x, currentDirection.z);
    const yawDelta = THREE.MathUtils.clamp(angleToTarget, -rotateSpeed * deltaTime, rotateSpeed * deltaTime);

    const horizontalDirection = new THREE.Vector3(currentDirection.x, 0, currentDirection.z).normalize();
    const pitchCurrent = Math.atan2(currentDirection.y, horizontalDirection.length());
    const targetHorizontalDirection = new THREE.Vector3(this.flightDirection.x, 0, this.flightDirection.z).normalize();
    const pitchTarget = Math.atan2(this.flightDirection.y, targetHorizontalDirection.length()); 
    const pitchDelta = -THREE.MathUtils.clamp(pitchTarget - pitchCurrent, -rotateSpeed * deltaTime, rotateSpeed * deltaTime);

    this.yaw += yawDelta;
    this.pitch += pitchDelta;

    const yawQuaternion = new THREE.Quaternion();
    yawQuaternion.setFromEuler(new THREE.Euler(0, this.yaw, 0));
    const pitchQuaternion = new THREE.Quaternion();
    pitchQuaternion.setFromEuler(new THREE.Euler(this.pitch, 0, 0));
    this.boss.rotation.setFromQuaternion(this.boss.quaternion.multiplyQuaternions(yawQuaternion, pitchQuaternion));
    
}

Hawk.prototype.levelAdjust = function(levelStage) {
    switch(levelStage) {
        case 0:
            this.speed = 10;
            break;
        case 1:
            this.speed = 12;
            break;
        case 2:
            this.speed = 14;
            break;
        case 3:
            this.speed = 16;
            break;
        case 4:
            this.speed = 18;
            break;
    }
}
export {Hawk}