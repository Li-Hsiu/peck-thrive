import * as THREE from 'three';

var scene, renderer, camera, plane, space, prevSpace, imageBuffer, blurredImageBuffer, matImage, matBlurred, matFinal, sequence, ambientLight, directionalLight, material, lastTime, speed;

function initKeys() {
    space = false;
    window.addEventListener('keydown', (event) => {
        switch (event.key) {
            case ' ': space = true; break;
        }
    });
    window.addEventListener('keyup', (event) => {
        switch (event.key) {
            case ' ': space = false; break;
        }
    });
}

function init() {
    scene = new THREE.Scene();
    //scene.background = new THREE.Color('skyblue');

    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.set(30, 20, 50);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 10, 0);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const textureLoader = new THREE.TextureLoader();
    const textureA = textureLoader.load('./assets/keys/aWorm.png');
    const textureW = textureLoader.load('./assets/keys/wWorm.png');
    const textureS = textureLoader.load('./assets/keys/sWorm.png');
    const textureD = textureLoader.load('./assets/keys/dWorm.png');
    const textureAkey = textureLoader.load('./assets/keys/a.png');
    const textureWkey = textureLoader.load('./assets/keys/w.png');
    const textureSkey = textureLoader.load('./assets/keys/s.png');
    const textureDkey = textureLoader.load('./assets/keys/d.png');

    sequence = new Int32Array([0, 2, 1, 3, 2]);
    speed = 0.1;

    let shader = THREE.ShaderLib["pecking-game"];

    let shaderUniforms = THREE.UniformsUtils.clone(shader.imageUniforms);
    imageBuffer = new THREE.WebGLRenderTarget(8192, 8192, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType });
    matImage = new THREE.ShaderMaterial({
        uniforms: shaderUniforms,
        vertexShader: shader.computeVertexShader,
        fragmentShader: shader.imageFragmentShader,
        transparent: true,
        depthWrite: false
    });
    matImage.uniforms.u_time.value = 0;
    matImage.uniforms.u_keys.value = sequence;
    matImage.uniforms.u_interval.value = speed;
    matImage.uniforms.u_textures.value.push(textureA, textureW, textureS, textureD);
    matImage.uniforms.u_keyTextures.value.push(textureAkey, textureWkey, textureSkey, textureDkey);

    
    shaderUniforms = THREE.UniformsUtils.clone(shader.blurUniforms);
    matBlurred = new THREE.ShaderMaterial({
        uniforms: shaderUniforms,
        vertexShader: shader.computeVertexShader,
        fragmentShader: shader.blurFragmentShader,
        transparent: true,
        depthWrite: false
    });
    blurredImageBuffer = new THREE.WebGLRenderTarget(8192, 8192, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType });
    matBlurred.uniforms.u_blurSize.value = 0.001;

    shaderUniforms = THREE.UniformsUtils.clone(shader.finalUniforms);
    matFinal = new THREE.ShaderMaterial({
        uniforms: shaderUniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.finalFragmentShader,
        transparent: true,
        depthWrite: false
    });
    plane = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0, 32, 32), matFinal);
    scene.add(plane);

    lastTime = new Date().getTime();
    initKeys();
    prevSpace = false;
}

function animate() {
    requestAnimationFrame(animate);
    let currentTime = new Date().getTime();
    const deltaTime = (currentTime - lastTime) / 1000 || 0;
    lastTime = currentTime;

    plane.position.copy(camera.position); 
    plane.quaternion.copy(camera.quaternion);
    plane.position.add(plane.getWorldDirection(new THREE.Vector3()).multiplyScalar(-1));

    if (prevSpace == false && space == true) {
        for (let i=0; i< sequence.length - 1 ; i++) {
            sequence[i] = sequence[i+1];
        }
        sequence[sequence.length - 1] = Math.floor(Math.random() * 4);
        matImage.uniforms.u_keys.value = sequence;
        matImage.uniforms.u_time.value = 0;
    }
    prevSpace = space;

    matImage.uniforms.u_time.value = Math.min(speed, matImage.uniforms.u_time.value + deltaTime);
    scene.overrideMaterial = matImage;
    renderer.setRenderTarget(imageBuffer);
    renderer.clear();
    renderer.render(scene, camera);

    matBlurred.uniforms.u_image.value = imageBuffer.texture;
    scene.overrideMaterial = matBlurred;
    renderer.setRenderTarget(blurredImageBuffer);
    renderer.clear();
    renderer.render(scene, camera);

    matFinal.uniforms.u_image.value = imageBuffer.texture;
    matFinal.uniforms.u_blurImage.value = blurredImageBuffer.texture;
    scene.overrideMaterial = null
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(scene, camera);
}

init();
animate();