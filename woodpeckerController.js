import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const Woodpecker = function(camera, scene, loadingManager) {
    
    this.camera = camera;
    this.scene = scene;

    this.health = 100;
    this.maxHealth = 100;

    this.soundInitialized = false;
    this.notStartFlying = true;

    // load woodpecker model
    const birdGeometry = new THREE.SphereGeometry(0.25, 32, 32);
    let birdMaterial = Physijs.createMaterial(
        new THREE.MeshStandardMaterial({ color: 0x00FF00, opacity: 0.0, transparent: true }),
        0.4,
        0.2
    );
    this.bird = new Physijs.SphereMesh(birdGeometry, birdMaterial);
    this.bird.position.set(0, 15, 0);
    this.bird.setCcdMotionThreshold(30);
    this.bird.setCcdSweptSphereRadius(0.2);
    //this.bird.add(new THREE.AxesHelper(20));
    this.bird.add(camera);
    scene.add(this.bird);
    const gltfLoader = new GLTFLoader(loadingManager);
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

        const light = new THREE.PointLight( 0xffffff, 0.5, 100 );
        light.position.set( 0, 0, 0 );
        this.bird.add( light );

        gltf.animations.forEach((clip) => {
            this.mixer.clipAction(clip).play();
            this.mixer.timeScale = this.speed/10;
        });
    });

    this.textureLoader = new THREE.TextureLoader(loadingManager);
    this.textureA = this.textureLoader.load('./assets/keys/aWorm.png');
    this.textureW = this.textureLoader.load('./assets/keys/wWorm.png');
    this.textureS = this.textureLoader.load('./assets/keys/sWorm.png');
    this.textureD = this.textureLoader.load('./assets/keys/dWorm.png');
    this.textureAkey = this.textureLoader.load('./assets/keys/a.png');
    this.textureWkey = this.textureLoader.load('./assets/keys/w.png');
    this.textureSkey = this.textureLoader.load('./assets/keys/s.png');
    this.textureDkey = this.textureLoader.load('./assets/keys/d.png');

    this.shader = THREE.ShaderLib["pecking-game"];

    this.shaderUniforms = THREE.UniformsUtils.clone(this.shader.imageUniforms);
    this.imageBuffer = new THREE.WebGLRenderTarget(2048, 2048, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType });
    this.matImage = new THREE.ShaderMaterial({
        uniforms: this.shaderUniforms,
        vertexShader: this.shader.computeVertexShader,
        fragmentShader: this.shader.imageFragmentShader,
        transparent: true,
        depthWrite: false
    });
    this.matImage.uniforms.u_time.value = 0.1;
    this.matImage.uniforms.u_interval.value = 0.1;
    this.matImage.uniforms.u_textures.value.push(this.textureA, this.textureW, this.textureS, this.textureD);
    this.matImage.uniforms.u_keyTextures.value.push(this.textureAkey, this.textureWkey, this.textureSkey, this.textureDkey);
    
    this.shaderUniforms = THREE.UniformsUtils.clone(this.shader.blurUniforms);
    this.matBlurred = new THREE.ShaderMaterial({
        uniforms: this.shaderUniforms,
        vertexShader: this.shader.computeVertexShader,
        fragmentShader: this.shader.blurFragmentShader,
        transparent: true,
        depthWrite: false
    });
    this.blurredImageBuffer = new THREE.WebGLRenderTarget(1024, 1024, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType });
    this.matBlurred.uniforms.u_blurSize.value = 0.0005;

    this.shaderUniforms = THREE.UniformsUtils.clone(this.shader.finalUniforms);
    this.matFinal = new THREE.ShaderMaterial({
        uniforms: this.shaderUniforms,
        vertexShader: this.shader.vertexShader,
        fragmentShader: this.shader.finalFragmentShader,
        transparent: true,
        depthWrite: false
    });
    this.gamePlane = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0, 64, 64), this.matFinal);

    this.shaderUniforms = THREE.UniformsUtils.clone(this.shader.screenUniforms);
    this.matScreenPlane = new THREE.ShaderMaterial({
        uniforms: this.shaderUniforms,
        vertexShader: this.shader.vertexShader,
        fragmentShader: this.shader.screenFragmentShader,
        transparent: true,
        depthWrite: false
    });
    this.matScreenPlane.uniforms.u_effectDuration.value = 0.5;
    this.matScreenPlane.uniforms.u_time.value = this.matScreenPlane.uniforms.u_effectDuration.value;
    this.screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0, 64, 64), this.matScreenPlane);
    this.scene.add(this.screenPlane);

    // initialize parameters
    this.isFlying = true;
    this.maxSpeed = 30;
    this.speed = -10;
    this.yawSpeedLeft = 0.1;
    this.yawSpeedRight = 0.1;
    this.maxYawSpeed = 1.2;

    this.pitchSpeedUp = 0.4;
    this.pitchSpeedDown = 0.6;
    this.maxPitchSpeedUp = 0.8;
    this.maxPitchSpeedDown = 1.2;

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
    this.modelOriginalPos = null;
    this.modelOriginalRot = null;
    this.modelGoalPos = null;
    this.modelGoalRot = null;
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

    this.levelStage = 0;

    this.sequence = [];
    this.keys = [];
    this.prevKeyState = [false, false, false, false];

    this.reduceHealthCooldown = new Date().getTime();
    this.takeDamageInterval = 3000;
    this.peckGameCooldown = new Date().getTime();
}

Woodpecker.prototype.update = function(a, d, w, s, e, space, deltaTime, renderer, listener) {
   
    if (!this.soundInitialized) {
        const audioLoader = new THREE.AudioLoader();
        this.aSoundEffect = new THREE.Audio(listener);
        audioLoader.load('./assets/keys/a.mp3', (buffer) => {
            this.aSoundEffect.setBuffer(buffer);
            this.aSoundEffect.setVolume(1.0);
        });
        this.wSoundEffect = new THREE.Audio(listener);
        audioLoader.load('./assets/keys/w.mp3', (buffer) => {
            this.wSoundEffect.setBuffer(buffer);
            this.wSoundEffect.setVolume(1.0);
        });
        this.sSoundEffect = new THREE.Audio(listener);
        audioLoader.load('./assets/keys/s.mp3', (buffer) => {
            this.sSoundEffect.setBuffer(buffer);
            this.sSoundEffect.setVolume(1.0);
        });
        this.dSoundEffect = new THREE.Audio(listener);
        audioLoader.load('./assets/keys/d.mp3', (buffer) => {
            this.dSoundEffect.setBuffer(buffer);
            this.dSoundEffect.setVolume(1.0);
        });
        this.eatSoundEffect = new THREE.Audio(listener);
        audioLoader.load('./assets/keys/eat.mp3', (buffer) => {
            this.eatSoundEffect.setBuffer(buffer);
            this.eatSoundEffect.setVolume(1.0);
        });
        this.soundInitialized = true;
    }

    if (this.bird && this.isFlying) {  

        if (this.mixer) {
            this.mixer.update(deltaTime); // Update animations
            this.mixer.timeScale = this.speed/7.5;
        }

        if (space && this.notStartFlying) {
            this.notStartFlying = false;
        }    

        this.maxSpeed = 30 - (100-this.health)*0.3;

        // Set rotation based on deltaTime
        if (a) {
            this.yawSpeedLeft = Math.min(this.maxYawSpeed, this.yawSpeedLeft + this.yawSpeedLeft * deltaTime * 3);
            this.yaw += this.yawSpeedLeft * deltaTime;
        }
        else {
            this.yawSpeedLeft = Math.max(0.1, this.yawSpeedLeft - this.yawSpeedLeft * deltaTime * 3);
        }
        if (d) {
            this.yawSpeedRight = Math.min(this.maxYawSpeed, this.yawSpeedRight + this.yawSpeedRight * deltaTime * 3);
            this.yaw -= this.yawSpeedRight * deltaTime;
        }
        else {
            this.yawSpeedRight = Math.max(0.1, this.yawSpeedRight - this.yawSpeedRight * deltaTime * 3);
        }
        if (s) {
            this.pitchSpeedUp = Math.min(this.maxPitchSpeedUp, this.pitchSpeedUp + this.pitchSpeedUp * deltaTime * 2.0);
            this.pitch = Math.max(-0.8, this.pitch - this.pitchSpeedUp * deltaTime);
        }
        else {
            this.pitchSpeedUp = 0.1;
        }
        if (w) {
            this.pitchSpeedDown = Math.min(this.maxPitchSpeedDown, this.pitchSpeedDown + this.pitchSpeedDown * deltaTime * 1.5);
            this.pitch = Math.min(0.8, this.pitch + this.pitchSpeedDown * deltaTime);
        }
        else {
            this.pitchSpeedDown = 0.1;
        }

        this.yawQuaternion.setFromEuler(new THREE.Euler(0, this.yaw, 0));
        this.pitchQuaternion.setFromEuler(new THREE.Euler(this.pitch, 0, 0));
        this.bird.rotation.setFromQuaternion(this.quaternion.multiplyQuaternions(this.yawQuaternion, this.pitchQuaternion));

        if (new Date().getTime() - this.collisionRecoilStartTime > 500) {
            this.maxSpeed = 30 - (100-this.health)*0.2 - 15*(this.pitch-0.3);
            if (a||d) this.speed = Math.min(this.maxSpeed/1.5, this.speed);

            if (this.onCollision) {
                this.bird.setLinearVelocity(new THREE.Vector3(0, 0, 0));
                this.speed = 0;
                this.onCollision = false;
            } 

            if (this.speed < this.maxSpeed) this.speed += this.maxSpeed * deltaTime * 0.5;
            else this.speed = this.maxSpeed;

            if (!this.notStartFlying) this.bird.position.add(this.bird.getWorldDirection(new THREE.Vector3()).multiplyScalar(-1 * this.speed * deltaTime));
            this.bird.__dirtyPosition = true;
            this.bird.material.color.set('#00FF00');
        }
        else {
            this.bird.setLinearVelocity(this.bounceDirection);
            this.bird.material.color.set('#FF0000');
        }
        if (this.bird.position.y > 35) {
            this.bird.position.y = 35;
            if (this.pitch > 0) {
                this.pitch = Math.max(0, this.pitch-= deltaTime);
            }
        }
        const planeWorldPosition = new THREE.Vector3();
        const planeWorldQuaternion = new THREE.Quaternion();
        this.camera.getWorldPosition(planeWorldPosition);
        this.camera.getWorldQuaternion(planeWorldQuaternion);
        this.screenPlane.position.copy(planeWorldPosition); 
        this.screenPlane.quaternion.copy(planeWorldQuaternion);
        this.screenPlane.position.add(this.screenPlane.getWorldDirection(new THREE.Vector3()).multiplyScalar(-0.6));
        this.matScreenPlane.uniforms.u_time.value += deltaTime;
    }
    else if (this.bird && this.isPecking) {
        if (this.isInterpolating) {
            this.interpolate(a, d, w, s);
        }
        else {
            if (new Date().getTime() - this.peckGameCooldown > 50) {
                this.playPeckGame(a, d, w, s, e);
                this.peckGameCooldown = new Date().getTime();
            }
            this.renderGamePlane(deltaTime, renderer);
        }
        const planeWorldPosition = new THREE.Vector3();
        const planeWorldQuaternion = new THREE.Quaternion();
        this.camera.getWorldPosition(planeWorldPosition);
        this.camera.getWorldQuaternion(planeWorldQuaternion);
        this.screenPlane.position.copy(planeWorldPosition); 
        this.screenPlane.quaternion.copy(planeWorldQuaternion);
        this.screenPlane.position.add(this.screenPlane.getWorldDirection(new THREE.Vector3()).multiplyScalar(-0.6));
        this.matScreenPlane.uniforms.u_time.value += deltaTime;        
    }
    if (new Date().getTime() - this.reduceHealthCooldown > this.takeDamageInterval) {
        this.takeDamage(1, false);
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
    this.target = other;
    this.originalPos = this.bird.position.clone();
    this.originalRot = this.bird.rotation.clone();
    this.modelOriginalPos = this.bird.children[1].position.clone();
    this.modelOriginalRot = this.bird.children[1].rotation.clone();
    this.bird.position.copy(other.position);
    this.bird.__dirtyPosition = true;
    this.bird.rotation.copy(other.rotation);
    this.bird.rotateX(-Math.PI/2);
    this.bird.position.add(this.bird.getWorldDirection(new THREE.Vector3()).multiplyScalar(2));
    this.bird.children[1].position.z -= 1;
    this.bird.children[1].position.y -= 0.2;
    this.bird.children[1].rotateX(-Math.PI/4);
    this.bird.__dirtyRotation = true;
    this.goalPos = this.bird.position.clone();
    this.goalRot = this.bird.rotation.clone();
    this.modelGoalPos = this.bird.children[1].position.clone();
    this.modelGoalRot = this.bird.children[1].rotation.clone();
    other.material.opacity = 0;
    other.remove(other.children[0]);
    this.startTime = new Date().getTime();
    this.enterPecking = true;
    this.isInterpolating = true;
}

Woodpecker.prototype.interpolate = function(a, d, w, s) {
    const currentTime = new Date().getTime();
    const elapsedTime = currentTime - this.startTime;
    const progress = Math.min(elapsedTime / this.duration, 1);

    this.bird.position.lerpVectors(this.originalPos, this.goalPos, progress);
    this.bird.children[1].position.lerpVectors(this.modelOriginalPos, this.modelGoalPos, progress);
    
    const startQuaternion = new THREE.Quaternion().setFromEuler(this.originalRot);
    const endQuaternion = new THREE.Quaternion().setFromEuler(this.goalRot);
    const quaternion = new THREE.Quaternion();
    quaternion.slerpQuaternions(startQuaternion, endQuaternion, progress);
    this.bird.quaternion.copy(quaternion);

    const startQuaternionModel = new THREE.Quaternion().setFromEuler(this.modelOriginalRot);
    const endQuaternionModel = new THREE.Quaternion().setFromEuler(this.modelGoalRot);
    const quaternionModel = new THREE.Quaternion();
    quaternionModel.slerpQuaternions(startQuaternionModel, endQuaternionModel, progress);
    this.bird.children[1].quaternion.copy(quaternionModel);

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
            this.generateKeySequence();
            this.prevKeyState = [a, w, s, d];
            this.gamePlane.position.copy(this.camera.position); 
            this.gamePlane.quaternion.copy(this.camera.quaternion);
            this.gamePlane.position.add(this.gamePlane.getWorldDirection(new THREE.Vector3()).multiplyScalar(-0.6));
            this.bird.add(this.gamePlane);
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
            this.speed = -10;
            this.yawSpeedLeft = 1.0;
            this.yawSpeedRight = 1.0;
            this.bird.setLinearVelocity(new THREE.Vector3(0, 0, 0));
            this.returnMessage = 'resumeSimulation';
        }
    }
}

Woodpecker.prototype.generateKeySequence = function() {
    this.sequence = [];
    const n = Math.floor(Math.random() * (20 - 10 + 1)) + 10;
    const randomNum = Math.floor(Math.random() * 4);
    this.sequence.push(randomNum);
    for (let i = 1; i < n; i++) {
        let randomNum = Math.floor(Math.random() * 4);
        while (randomNum == this.sequence[i-1]) {
            randomNum = Math.floor(Math.random() * 4);
        }
        this.sequence.push(randomNum);
    }
    this.matImage.uniforms.u_keys.value = new Int32Array(this.sequence.slice(-5)).reverse();
    this.matImage.uniforms.u_length.value = new Int32Array(this.sequence.slice(-5)).reverse().length;
    
}

Woodpecker.prototype.playPeckGame = function(a,d,w,s,e) {
    
    let currentKey = this.sequence[this.sequence.length-1];
    this.bird.children[1].rotation.x = -3*Math.PI/4;
    switch(currentKey) {
        case 0:
            if (this.prevKeyState[0] == false && a) {
                this.aSoundEffect.play();
                this.bird.children[1].rotation.x = -Math.PI;
                this.sequence.pop();
                this.takeDamage(-1.5 * (this.levelStage+1)/2, true);
                this.matImage.uniforms.u_length.value = new Int32Array(this.sequence.slice(-5)).reverse().length;
                this.matImage.uniforms.u_keys.value = new Int32Array(this.sequence.slice(-5)).reverse();    
                this.matImage.uniforms.u_time.value = 0;
            }
            else if (this.prevKeyState[1] == false && w) {
                this.wSoundEffect.play();
                this.bird.children[1].rotation.x = -Math.PI;
                this.takeDamage(3, true);
            }
            else if (this.prevKeyState[2] == false && s) {
                this.sSoundEffect.play();
                this.bird.children[1].rotation.x = -Math.PI;
                this.takeDamage(3, true);
            }
            else if (this.prevKeyState[3] == false && d) {
                this.dSoundEffect.play();
                this.bird.children[1].rotation.x = -Math.PI;
                this.takeDamage(3, true);
            }
            break;
        case 1:
            if (this.prevKeyState[1] == false && w) {
                this.wSoundEffect.play();
                this.bird.children[1].rotation.x = -Math.PI;
                this.sequence.pop();
                this.takeDamage(-1.5 * (this.levelStage+1)/2, true);
                this.matImage.uniforms.u_length.value = new Int32Array(this.sequence.slice(-5)).reverse().length;
                this.matImage.uniforms.u_keys.value = new Int32Array(this.sequence.slice(-5)).reverse();
                this.matImage.uniforms.u_time.value = 0;
            } 
            else if (this.prevKeyState[0] == false && a) {
                this.aSoundEffect.play();
                this.bird.children[1].rotation.x = -Math.PI;
                this.takeDamage(3, true);
            }
            else if (this.prevKeyState[2] == false && s) {
                this.sSoundEffect.play();
                this.bird.children[1].rotation.x = -Math.PI;
                this.takeDamage(3, true);
            }
            else if (this.prevKeyState[3] == false && d) {
                this.dSoundEffect.play();
                this.bird.children[1].rotation.x = -Math.PI;
                this.takeDamage(3, true);
            }
            break;
        case 2:
            if (this.prevKeyState[2] == false && s) {
                this.sSoundEffect.play();
                this.bird.children[1].rotation.x = -Math.PI;
                this.sequence.pop();
                this.takeDamage(-1.5 * (this.levelStage+1)/2, true);
                this.matImage.uniforms.u_length.value = new Int32Array(this.sequence.slice(-5)).reverse().length;
                this.matImage.uniforms.u_keys.value = new Int32Array(this.sequence.slice(-5)).reverse();
                this.matImage.uniforms.u_time.value = 0;
            }
            else if (this.prevKeyState[0] == false && a) {
                this.aSoundEffect.play();
                this.bird.children[1].rotation.x = -Math.PI;
                this.takeDamage(3, true);
            }
            else if (this.prevKeyState[1] == false && w) {
                this.wSoundEffect.play();
                this.bird.children[1].rotation.x = -Math.PI;
                this.takeDamage(3, true);
            }
            else if (this.prevKeyState[3] == false && d) {
                this.dSoundEffect.play();
                this.bird.children[1].rotation.x = -Math.PI;
                this.takeDamage(3, true);
            }
            break;
        case 3:
            if (this.prevKeyState[3] == false && d) {
                this.dSoundEffect.play();
                this.bird.children[1].rotation.x = -Math.PI;
                this.sequence.pop();
                this.takeDamage(-1.5 * (this.levelStage+1)/2, true);
                this.matImage.uniforms.u_length.value = new Int32Array(this.sequence.slice(-5)).reverse().length;
                this.matImage.uniforms.u_keys.value = new Int32Array(this.sequence.slice(-5)).reverse();
                this.matImage.uniforms.u_time.value = 0;
            } 
            else if (this.prevKeyState[0] == false && a) {
                this.aSoundEffect.play();
                this.bird.children[1].rotation.x = -Math.PI;
                this.takeDamage(3, true);
            }
            else if (this.prevKeyState[1] == false && w) {
                this.wSoundEffect.play();
                this.bird.children[1].rotation.x = -Math.PI;
                this.takeDamage(3, true);
            }
            else if (this.prevKeyState[2] == false && s) {
                this.sSoundEffect.play();
                this.bird.children[1].rotation.x = -Math.PI;
                this.takeDamage(3, true);
            }
            break;
    }
    this.prevKeyState = [a,w,s,d];
    if (this.sequence.length == 0) {
        this.eatSoundEffect.play();
        this.takeDamage(-5, true);
        this.bird.children[1].rotation.x = -3*Math.PI/4;
        this.exitPeckGame();
    }
    if (e) {
        this.bird.children[1].rotation.x = -3*Math.PI/4;
        this.sequence = [];
        this.exitPeckGame();
    }
}

Woodpecker.prototype.exitPeckGame = function() {
    this.scene.remove(this.target);
    this.target = null;
    this.originalPos = this.goalPos;
    this.originalRot = this.goalRot;
    this.modelOriginalPos = this.bird.children[1].position.clone();
    this.modelOriginalRot = this.bird.children[1].rotation.clone();
    this.modelGoalPos = new THREE.Vector3(0, -0.6, 0);
    this.modelGoalRot = new THREE.Euler(0, Math.PI, 0);
    this.isInterpolating = true;
    this.startTime = new Date().getTime();
    this.bird.remove(this.gamePlane);
    this.exitPecking = true;
}

Woodpecker.prototype.updateHealthBar = function() {
    const healthBar = document.getElementById('health-bar');
    const healthPercentage = this.health / this.maxHealth * 100;
    healthBar.style.width = healthPercentage + '%';
}

Woodpecker.prototype.takeDamage = function(amount, isShowEffect) {
    this.health = Math.min(100, Math.max(0, this.health - amount));
    this.updateHealthBar();
    if (amount >= 0 && isShowEffect) {
        this.matScreenPlane.uniforms.u_time.value = 0.0;
    }
}

Woodpecker.prototype.renderGamePlane = function(deltaTime, renderer) {
    this.scene.background = new THREE.Color(0x000000); 

    this.matImage.uniforms.u_time.value = Math.min(0.1, this.matImage.uniforms.u_time.value + deltaTime);
    this.scene.overrideMaterial = this.matImage;
    renderer.setRenderTarget(this.imageBuffer);
    renderer.clear();
    renderer.render(this.scene, this.camera);

    this.matBlurred.uniforms.u_image.value = this.imageBuffer.texture;
    this.scene.overrideMaterial = this.matBlurred;
    renderer.setRenderTarget(this.blurredImageBuffer);
    renderer.clear();
    renderer.render(this.scene, this.camera);

    this.matFinal.uniforms.u_image.value = this.imageBuffer.texture;
    this.matFinal.uniforms.u_blurImage.value = this.blurredImageBuffer.texture;
    this.scene.overrideMaterial = null
    renderer.setRenderTarget(null);
    renderer.clear();

    this.scene.background = new THREE.Color(0x87CEEB);
}

Woodpecker.prototype.levelAdjust = function(levelStage) {
    this.levelStage = levelStage;
    switch(levelStage) {
        case 0:
            this.takeDamageInterval = 3000;
            break;
        case 1:
            this.takeDamageInterval = 1500;
            break;
        case 2:
            this.takeDamageInterval = 1000;
            break;
        case 3:
            this.takeDamageInterval = 750;
            break;
        case 4:
            this.takeDamageInterval = 600;
            break;
    }
}
export{Woodpecker};