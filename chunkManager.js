import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

var chunkSize = 50;
var totalChunkLength = 9; 
var colors = [0x0A0A0A, 0xCB2821, 0xC6A664, 0x47402E, 0xE5BE01, 0x909090, 0xFDF4E3, 0x282828, 0x6C4675, 0x592321]

class Chunk {
    constructor(xIdx, zIdx, mat, hasNest) {
        this.xIdx = xIdx;
        this.zIdx = zIdx;
        this.chunkSize = chunkSize;
        this.xCoord = xIdx * chunkSize;
        this.zCoord = zIdx * chunkSize;
        this.ground = null;
        this.treeList = [];
        this.targetList = [];
        this.material = Physijs.createMaterial(new THREE.MeshStandardMaterial({ color: 0x00FF00, opacity: 0.0, transparent: true }), 0.4, 0.2);
        this.targetImgMat = mat;
        this.targetMaterial = Physijs.createMaterial(new THREE.MeshStandardMaterial({ color: 0x00FF00, opacity: 0.0, transparent: true }), 0.4, 0.2);
        this.nestMaterial = Physijs.createMaterial(new THREE.MeshStandardMaterial({ color: 0x00FF00, opacity: 0.0, transparent: true }), 0.4, 0.2);
        this.hasNest = hasNest;
    }

    // load the chunk
    load(scene, treeObjectPool, hasTree) {
        // create ground
        this.ground = new Physijs.BoxMesh(new THREE.BoxGeometry( this.chunkSize, 10, this.chunkSize ), new THREE.MeshStandardMaterial({color: 0x2E6F40 }), 0); // color: colors[Math.floor(Math.random() * 10)]
        this.ground.castShadow = true;
        this.ground.receiveShadow = true;
        this.ground.position.set(this.xCoord, -1, this.zCoord);
        scene.add(this.ground);

        if (this.hasNest) {
            this.nest = new Physijs.BoxMesh(new THREE.BoxGeometry(20, 12, 20), this.nestMaterial, 0);
            this.nest.__dirtyPosition = true;
            this.nest.position.set(this.xCoord, 5.0, this.zCoord);
            const mtlLoader = new MTLLoader();
            mtlLoader.load('./assets/nest/nest.mtl', (materials) => {
                materials.preload();
                const objLoader = new OBJLoader();
                objLoader.setMaterials(materials);
                objLoader.load('./assets/nest/nest.obj', (object) => {
                    object.scale.set(10,10,10);
                    this.nest.add(object);
                });
            });
            this.nest.name = "nest";
            scene.add(this.nest);
        }
        // add trees from object pool
        else if (hasTree) {
            const randomNumber = Math.floor(Math.random() * 2 + 2);
            for (let i=0; i<randomNumber; i++) {
                if (treeObjectPool.length > 0) {
                    const randIdx = Math.floor(Math.random() * treeObjectPool.length);
                    var treeModel = treeObjectPool[randIdx];
                    let tree = this.createTreeSkeleton(treeModel);
                    tree.position.set(this.xCoord+Math.random()*this.chunkSize-this.chunkSize/2, -0.5, this.zCoord+Math.random()*this.chunkSize-this.chunkSize/2);
                    tree.__dirtyPosition = true;
                    tree.rotation.y = Math.random() * 2 * Math.PI;
                    tree.__dirtyRotation = true;
                    //tree.scale.set(Math.random() * 0.4 + 0.8, Math.random() * 0.4 + 0.8, Math.random() * 0.4 + 0.8);
                    this.treeList.push(tree);
                    treeObjectPool.splice(randIdx, 1);
                    scene.add(tree);

                    if (Math.random() < 0.05) {
                        let targetBox = new Physijs.CylinderMesh(new THREE.CylinderGeometry(3, 3, 1), this.targetMaterial, 0);
                        targetBox.position.copy(tree.position);
                        targetBox.position.y = Math.random() * 7 + 7;
                        targetBox.rotateY(Math.random() * 2 * Math.PI);
                        targetBox.position.add(targetBox.getWorldDirection(new THREE.Vector3()).multiplyScalar(4-targetBox.position.y*0.08));
                        targetBox.rotateX(Math.PI/2);
                        targetBox.__dirtyPosition = true;
                        targetBox.__dirtyRotation = true;
                        targetBox.name = "target";
                        let image = new THREE.Mesh(new THREE.BoxGeometry(5, 1.5, 5), [null,null,this.targetImgMat,null,null,null], 0);
                        targetBox.add(image);
                        const light = new THREE.PointLight( 0xffffff, 0.5, 100 );
                        light.position.set( 0, 0, 0 );
                        targetBox.add( light );
                        this.targetList.push(targetBox);
                        scene.add(targetBox);
                    }
                }
            }
        }
    }
    
    // remove the chunk
    disload(scene, treeObjectPool) {
        const disposeChildren = (object) => {
            object.children.forEach(child => {
                disposeChildren(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                if (child.dispose) child.dispose();
            });
        };
        for (let i = 0; i < this.treeList.length; i++) {
            treeObjectPool.push(this.treeList[i].children[1]);
            this.treeList[i].children[1].removeFromParent();
            scene.remove(this.treeList[i]);
            disposeChildren(this.treeList[i]);
            if (this.treeList[i].geometry) this.treeList[i].geometry.dispose();
            if (this.treeList[i].material) this.treeList[i].material.dispose();
        }
        for (let i = 0; i < this.targetList.length; i++) {
            scene.remove(this.targetList[i]);
            this.targetList[i].geometry.dispose();
            this.targetList[i].material.dispose();
        }
        if (this.hasNest && this.nest) {
            scene.remove(this.nest);
            this.nest.geometry.dispose();
            this.nest.material.dispose();
        }
        scene.remove(this.ground);
        this.ground.geometry.dispose();
        this.ground.material.dispose();
        if (this.hasNest && this.nest) {
            return true;
        }
        else {
            return false;
        }
    }

    createTreeSkeleton(treeModel) {
        var tree = null
        switch(parseInt(treeModel.name)) {
            case 1:
                tree = new Physijs.BoxMesh(new THREE.BoxGeometry(2, 2, 2), this.material, 0);
                tree.__dirtyPosition = true;

                const trunk1Geometry = new THREE.CylinderGeometry(3, 3, 16);
                let trunk1 = new Physijs.CylinderMesh(trunk1Geometry, this.material, 0);
                trunk1.position.set(0, 8, 0);
                trunk1.__dirtyPosition = true;
                tree.add(trunk1); 
    
                const trunk2Geometry = new THREE.CylinderGeometry(2, 2, 16);
                let trunk2 = new Physijs.CylinderMesh(trunk2Geometry, this.material, 0);
                trunk2.position.set(0, 16, 0);
                trunk2.__dirtyPosition = true;
                trunk1.add(trunk2);
    
                const trunk3Geometry = new THREE.CylinderGeometry(0.7, 0.7, 8);
                let trunk3 = new Physijs.CylinderMesh(trunk3Geometry, this.material, 0);
                trunk3.rotation.set(-5*Math.PI/180, 0, 13*Math.PI/180);
                trunk3.position.set(-0.6, 12, -0.5);
                trunk3.__dirtyPosition = true;
                trunk3.__dirtyRotation = true;
                trunk2.add(trunk3);
    
                const branch1Geometry = new THREE.CylinderGeometry(0.75, 0.75, 5);
                let branch1 = new Physijs.CylinderMesh(branch1Geometry, this.material, 0);
                branch1.rotation.set(0*Math.PI/180, -32*Math.PI/180, -65*Math.PI/180);
                branch1.position.set(3, -4, 1.5);
                branch1.__dirtyPosition = true;
                branch1.__dirtyRotation = true;
                trunk2.add(branch1);
    
                const branch2Geometry = new THREE.CylinderGeometry(0.75, 0.75, 7);
                let branch2 = new Physijs.CylinderMesh(branch2Geometry, this.material, 0);
                branch2.rotation.set(0*Math.PI/180, 50*Math.PI/180, -60*Math.PI/180);
                branch2.position.set(2.7, 3.8, -3.6);
                branch2.__dirtyPosition = true;
                branch2.__dirtyRotation = true;
                trunk2.add(branch2);
    
                const branch21Geometry = new THREE.CylinderGeometry(0.65, 0.65, 7);
                let branch21 = new Physijs.CylinderMesh(branch21Geometry, this.material, 0);
                branch21.rotation.set(0*Math.PI/180, 0*Math.PI/180, 52*Math.PI/180);
                branch21.position.set(-2, 5.5, 0);
                branch21.__dirtyPosition = true;
                branch21.__dirtyRotation = true;
                branch2.add(branch21);
    
                const branch22Geometry = new THREE.CylinderGeometry(0.35, 0.35, 8);
                let branch22 = new Physijs.CylinderMesh(branch22Geometry, this.material, 0);
                branch22.rotation.set(0*Math.PI/180, -13*Math.PI/180, -23*Math.PI/180);
                branch22.position.set(1.5, 7, 0.1);
                branch21.add(branch22);
    
                const branch23Geometry = new THREE.CylinderGeometry(0.5, 0.5, 8);
                let branch23 = new Physijs.CylinderMesh(branch23Geometry, this.material, 0);
                branch23.rotation.set(41*Math.PI/180, 0*Math.PI/180, 20*Math.PI/180);
                branch23.position.set(-1, 4.5, 3.5);
                branch2.add(branch23);
    
                const branch3Geometry = new THREE.CylinderGeometry(0.75, 0.75, 5);
                let branch3 = new Physijs.CylinderMesh(branch3Geometry, this.material, 0);
                branch3.rotation.set(0*Math.PI/180, 0*Math.PI/180, 40*Math.PI/180);
                branch3.position.set(-3, 5, 0);
                trunk2.add(branch3);
    
                const branch31Geometry = new THREE.CylinderGeometry(0.6, 0.6, 6);
                let branch31 = new Physijs.CylinderMesh(branch31Geometry, this.material, 0);
                branch31.rotation.set(0*Math.PI/180, 0*Math.PI/180, 40*Math.PI/180);
                branch31.position.set(-1.6, 4, 0);
                branch3.add(branch31);
    
                const branch32Geometry = new THREE.CylinderGeometry(0.3, 0.3, 7.5);
                let branch32 = new Physijs.CylinderMesh(branch32Geometry, this.material, 0);
                branch32.rotation.set(0*Math.PI/180, 0*Math.PI/180, -29*Math.PI/180);
                branch32.position.set(1.5, 6, 0);
                branch31.add(branch32);
    
                const branch4Geometry = new THREE.CylinderGeometry(0.75, 0.75, 8.5);
                let branch4 = new Physijs.CylinderMesh(branch4Geometry, this.material, 0);
                branch4.rotation.set(65*Math.PI/180, 0*Math.PI/180, -2*Math.PI/180);
                branch4.position.set(0.3, 7, 5);
                trunk2.add(branch4);
    
                const branch41Geometry = new THREE.CylinderGeometry(0.5, 0.5, 7.5);
                let branch41 = new Physijs.CylinderMesh(branch41Geometry, this.material, 0);
                branch41.rotation.set(-37*Math.PI/180, 0*Math.PI/180, 0*Math.PI/180);
                branch41.position.set(0, 7, -2);
                branch4.add(branch41);

                tree.add(treeModel);

                break;
        }
        return tree;
    }
}

const ChunkManager = function(scene, loadingManager) {

    this.isInitialized = false;
    this.isReadyToInitialize = false;

    // initialize chunkList
    this.scene = scene;
    this.chunkList = [];
    this.timeStageBoolean = false;

    // target texture
    this.targetMaterial = null; 
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('./assets/sound.png', (texture) => {
        this.targetMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            color: 0xFFFFFF,
            side: THREE.FrontSide
        });
    });

    // create trees and save in a objectPool
    this.treeObjectPool = [];
    this.totalNumTree = 320; // 320
    this.material = Physijs.createMaterial(
        new THREE.MeshStandardMaterial({ color: 0x00FF00, opacity: 0.5, transparent: true }),
        0.4,
        0.2
    );
    this.loadTreeModels(loadingManager);
}

ChunkManager.prototype.loadTreeModels = function(loadingManager) {

    // load all tree models for the scene
    this.numLoaded = 0;

    this.loader = new FBXLoader(loadingManager);   
    this.textureLoader = new THREE.TextureLoader();
    this.texture = this.textureLoader.load('./assets/tree/Textures/T_Trees_temp_climate.png');   
    for (let i=0; i<this.totalNumTree; i++) {
        //const randomChoiceTree = Math.floor(Math.random() * 15 + 1);
        const randomChoiceTree = 1;
        this.loader.load('./assets/tree/Fbx/tree01.FBX', (fbx) => {
            fbx.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material.map = this.texture;
                    child.material.needsUpdate = true;
                }
            });
            fbx.scale.copy(new THREE.Vector3(0.1,0.1,0.1));
            fbx.position.set(0, 0, 0);

            this.numLoaded++;
            if (this.numLoaded >= this.totalNumTree) {
                this.isReadyToInitialize = true;
            }
            fbx.name = randomChoiceTree;
            this.treeObjectPool.push(fbx)
        });
    }
}

ChunkManager.prototype.update = function(playerCoord, timeStage, levelStage, totalDuration) {
    var centerXIdx = Math.round(playerCoord.x / chunkSize);
    var centerZIdx = Math.round(playerCoord.z / chunkSize);
   
    // if basic chunks not initialized, initialize
    if (!this.isInitialized && this.isReadyToInitialize) { 
        for (var i = centerXIdx-(totalChunkLength-1)/2; i <= centerXIdx+(totalChunkLength-1)/2; i++) {
            for (var j = centerZIdx-(totalChunkLength-1)/2; j <= centerZIdx+(totalChunkLength-1)/2; j++) {
                var newChunk = new Chunk(i,j,this.targetMaterial, false);
                if (i>=-1 && i<=1 && j>=-1 && j<=1) {
                    newChunk.load(this.scene, this.treeObjectPool, false);
                }
                else {
                    newChunk.load(this.scene, this.treeObjectPool, true);
                }
                this.chunkList.push(newChunk);
            }
        }
        this.isInitialized = true;
    }
    
    if (this.isInitialized) {
   
        // disload distant chunks
        this.chunkList = this.chunkList.filter(chunk => {
            if (Math.abs(chunk.xIdx - centerXIdx) > (totalChunkLength - 1) / 2 || Math.abs(chunk.zIdx - centerZIdx) > (totalChunkLength - 1) / 2) {
                let isNest = chunk.disload(this.scene, this.treeObjectPool);
                if (isNest) {
                    this.timeStageBoolean = false;
                }
                return false;
            }
            return true;
        });

        // load new chunks
        for (var i = centerXIdx-(totalChunkLength-1)/2; i <= centerXIdx+(totalChunkLength-1)/2; i++) {
            for (var j = centerZIdx-(totalChunkLength-1)/2; j <= centerZIdx+(totalChunkLength-1)/2; j++) {
                if (!this.chunkList.some(chunk => chunk.xIdx === i && chunk.zIdx === j)) {
                    if (timeStage[levelStage] < totalDuration && !this.timeStageBoolean && Math.random() < 0.01) { // summon nest
                        var newChunk = new Chunk(i,j,this.targetMaterial, true);
                        newChunk.load(this.scene, this.treeObjectPool, true);
                        this.chunkList.push(newChunk);
                        this.timeStageBoolean = true;
                    }
                    else {
                        var newChunk = new Chunk(i,j,this.targetMaterial, false);
                        newChunk.load(this.scene, this.treeObjectPool, true);
                        this.chunkList.push(newChunk);
                    }   
                }
            }
        }
    }
    console.log(this.treeObjectPool.length)
}

export { ChunkManager };

