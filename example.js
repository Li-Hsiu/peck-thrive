import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
	
Physijs.scripts.worker = 'physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

var initScene, render, applyForce, setMousePosition, mouse_position,
    ground_material, box_material,
    renderer, scene, ground, light, camera, box, boxes = [];

initScene = function() {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMapSoft = true;
    document.body.appendChild( renderer.domElement );
    
    scene = new Physijs.Scene;
    scene.setGravity(new THREE.Vector3( 0, -30, 0 ));
    scene.addEventListener(
        'update',
        function() {
            scene.simulate( undefined, 1 );
        }
    );
    
    camera = new THREE.PerspectiveCamera(
        35,
        window.innerWidth / window.innerHeight,
        1,
        1000
    );
    camera.position.set( 60, 50, 60 );
    camera.lookAt( scene.position );
    scene.add( camera );
    
    // Light
    light = new THREE.DirectionalLight( 0xFFFFFF, 0.6 );
    light.position.set( 20, 40, -15 );
    light.target.position.copy( scene.position );
    light.castShadow = true;
    light.shadow.camera.left = -60;
    light.shadow.camera.top = -60;
    light.shadow.camera.right = 60;
    light.shadow.camera.bottom = 60;
    light.shadow.camera.near = 20;
    light.shadow.camera.far = 200;
    light.shadow.bias = -.0001;
    light.shadow.mapSize.width = light.shadow.mapSize.height = 2048;
    scene.add( light );

    scene.add( new THREE.AmbientLight( 'white', 0.3 ) );

    // Materials
    ground_material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial(),
        .8, // high friction
        .4 // low restitution
    );
    
    box_material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial(),
        .4, // low friction
        .6 // high restitution
    );
    
    // Ground
    ground = new Physijs.BoxMesh(
        new THREE.BoxGeometry(100, 1, 100),
        ground_material,
        0 // mass
    );
    ground.receiveShadow = true;
    scene.add( ground );
    
    for ( var i = 0; i < 10; i++ ) {
        box = new Physijs.BoxMesh(
            new THREE.BoxGeometry( 4, 4, 4 ),
            box_material
        );
        box.position.set(
            Math.random() * 50 - 25,
            10 + Math.random() * 5,
            Math.random() * 50 - 25
        );
        box.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        box.scale.set(
            Math.random() * 1 + .5,
            Math.random() * 1 + .5,
            Math.random() * 1 + .5
        );
        box.castShadow = true;
        scene.add( box );
        boxes.push( box );
    }
    
    renderer.domElement.addEventListener( 'mousemove', setMousePosition );

    requestAnimationFrame( render );
    scene.simulate();
};

render = function() {
    requestAnimationFrame( render );
    renderer.render( scene, camera );
};

setMousePosition = function( evt ) {
    // Find where mouse cursor intersects the ground plane
    var vector = new THREE.Vector3(
        ( evt.clientX / renderer.domElement.clientWidth ) * 2 - 1,
        -( ( evt.clientY / renderer.domElement.clientHeight ) * 2 - 1 ),
        .5
    );
    vector.unproject( camera );
    vector.sub( camera.position ).normalize();
    
    var coefficient = (box.position.y - camera.position.y) / vector.y
    mouse_position = camera.position.clone().add( vector.multiplyScalar( coefficient ) );
};

applyForce = function() {
    if (!mouse_position) return;
    var strength = 35, distance, effect, offset, box;
    
    for ( var i = 0; i < boxes.length; i++ ) {
        box = boxes[i];
        distance = mouse_position.distanceTo( box.position ),
        effect = mouse_position.clone().sub( box.position ).normalize().multiplyScalar( strength / distance ).negate(),
        offset = mouse_position.clone().sub( box.position );
        box.applyImpulse( effect, offset );
    }
};

window.onload = initScene;