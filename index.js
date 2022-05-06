// import * as THREE from 'https://cdn.skypack.dev/three';
import { Scene, Color,  Mesh, Vector2, FloatType, MeshStandardMaterial, 
CylinderGeometry, SphereGeometry, BoxGeometry, PerspectiveCamera, 
WebGLRenderer, ACESFilmicToneMapping, sRGBEncoding, PMREMGenerator, 
TextureLoader, MeshPhysicalMaterial, PCFSoftShadowMap, PointLight, 
DoubleSide, AmbientLight, SpotLight } from 'https://cdn.skypack.dev/three@0.137';
import { RGBELoader }  from 'https://cdn.skypack.dev/three-stdlib@2.8.5/loaders/RGBELoader';
import { OrbitControls }  from 'https://cdn.skypack.dev/three-stdlib@2.8.5/controls/OrbitControls';
import { mergeBufferGeometries } from 'https://cdn.skypack.dev/three-stdlib@2.8.5/utils/BufferGeometryUtils';
import { SimplexNoise } from 'https://cdn.skypack.dev/simplex-noise';
import { GLTFLoader }  from 'https://cdn.skypack.dev/three-stdlib@2.8.5/loaders/GLTFLoader';


const scene = new Scene();
scene.background = new Color("#E5C7BB");

//--------------------------------------------------------------
const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(-15, 30, 30);
camera.layers.enable(1)
camera.layers.set(1) 

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.outputEncoding = sRGBEncoding;
renderer.physicallyCorrectLights = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);


const light = new PointLight(new Color("#FFCCBB").convertSRGBToLinear().convertSRGBToLinear(), 80, 200);
light.position.set(10, 20, 10);
// ----convertSRGBToLinear needed for threejs calc of the color-------------------
light.castShadow = true;
light.shadow.mapSize.width = 512;
light.shadow.mapSize.height = 512;
light.shadow.camera.near = 0.5;
light.shadow.camera.far = 500;
light.layers.set(1)
scene.add(light);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0,0,0); //looks at the origin of the scene
controls.dampingFactor = 0.05;
controls.enableDamping = true;
//--------------------------------------------------------------------

let envmap;
//--------------------------------------------------------------------
const MAX_HEIGHT = 10;
const STONE_HEIGHT = MAX_HEIGHT * 0.8;
const DIRT_HEIGHT = MAX_HEIGHT * 0.6;
const GRASS1_HEIGHT = MAX_HEIGHT * 0.3;
const GRASS2_HEIGHT = MAX_HEIGHT * 0;
const SAND_HEIGHT = MAX_HEIGHT * 0.7;


(async function() {
    //load and process envmap
    let pmrem = new PMREMGenerator(renderer);
    let envmapTexture = await new RGBELoader().setDataType(FloatType).loadAsync("./assets/envmap.hdr");
    envmap = pmrem.fromEquirectangular(envmapTexture).texture;

    //load noise
    const simplex = new SimplexNoise();

    let textures = {
        dirt: await new TextureLoader().loadAsync("assets/textures/dirt.png"),
        grass1: await new TextureLoader().loadAsync("assets/textures/grass1.png"),
        grass2: await new TextureLoader().loadAsync("assets/textures/grass2.png"),
        sand: await new TextureLoader().loadAsync("assets/textures/sand.png"),
        stone: await new TextureLoader().loadAsync("assets/textures/stone.png"),
        water: await new TextureLoader().loadAsync("assets/textures/water.png"),
        wood: await new TextureLoader().loadAsync("assets/textures/wood.png"),
        };
//----------------------adding mesh / materials-----------------------
    for(let i = -17; i < 17; i++){
        for(let j = -17; j < 17; j++){
            let position = tileToPosition(i, j);
            // radius
            if(position.length() > 16) continue;

            // adding simplex noise (gives output -1 to 1) + 1) * 0.5;
            let noise = (simplex.noise2D(i * 0.1, j * 0.1) + 1) * 0.5; 
            noise = Math.pow(noise, 1.5);
           
             // func
            makeHex(noise * MAX_HEIGHT, position);
        }
    };
    
//-------------------------------------------
    // let hexagonMesh = new Mesh(
    //     hexagonGeometries,
    //     new MeshStandardMaterial({
    //         envMap: envmap,
    //         flatShading: true,
    //     })
    // );
    // scene.add(hexagonMesh);
//--------------------------------------------
    // let sphereMesh = new Mesh(
    //     new SphereGeometry(5, 10, 10),
    //     new MeshStandardMaterial({ 
    //         envMap: envmap,
    //         roughness: 0,
    //         metalness: 1,
    //     })
    // );
    // scene.add(sphereMesh);


//--------------------textures-----------------------
    let stoneMesh = hexMesh(stoneGeo, textures.stone);
    let grass1Mesh = hexMesh(grass2Geo, textures.grass1);
    let grass2Mesh = hexMesh(grass1Geo, textures.grass2);
    let dirtMesh = hexMesh(dirtGeo, textures.dirt);
    let sandMesh = hexMesh(sandGeo, textures.sand);
    scene.add(stoneMesh,grass1Mesh, grass2Mesh, dirtMesh, sandMesh)

//-----------------------water------------------------------
    let seaMesh = new Mesh(
        new CylinderGeometry(17, 17, MAX_HEIGHT * 0.1, 50),
        new MeshPhysicalMaterial({
            envMap: envmap,
            color: new Color("#55aaff").convertSRGBToLinear().multiplyScalar(3),
            ior: 1.4,
            transmission: 1,
            transparent: true,
            thickness: 1.5,
            envMapIntensity: 0.2,
            roughness: 1,
            metalness: 0.025,
            roughnessMap: textures.water,
            metalnessMap: textures.water,
            })
        )
        seaMesh.receiveShadow = true;
        seaMesh.position.set(0, MAX_HEIGHT * 0.1, 0);
        seaMesh.layers.set(1)
        scene.add(seaMesh);

//---------------------------border--------------------------- 
    let mapContainer = new Mesh(
        new CylinderGeometry(17.1, 17.1, MAX_HEIGHT * 0.16, 50, 1, true),
        new MeshPhysicalMaterial({
            envMap: envmap,
            map: textures.wood,
            envMapIntensity: 0.2,
            side: DoubleSide,
        })
    );
    mapContainer.receiveShadow = true;
    mapContainer.position.set(0, MAX_HEIGHT * 0.125, 0);
    mapContainer.layers.set(1)
    scene.add(mapContainer);


//--------------------------floor--------------------------------- 
    let mapFloor = new Mesh(
        new CylinderGeometry(17.5, 17.5, MAX_HEIGHT * 0.2, 50),
        new MeshPhysicalMaterial({ 
            envMap: envmap,
            map: textures.wood,
            envMapIntensity: 0.1,
            side: DoubleSide,
        })
    );
    mapFloor.receiveShadow = true;
    mapFloor.position.set(0, -MAX_HEIGHT * 0.05, 0);
    mapFloor.layers.set(1)
    scene.add(mapFloor);

    clouds();

//---------------------------------------------------------------
    renderer.setAnimationLoop(() => {
        controls.update(); 
        renderer.render(scene, camera);
    });
})();

 

// render tiles 
function tileToPosition (tileX, tileY) {
        return new Vector2((tileX + (tileY % 2) * 0.5) * 1.77, tileY * 1.535);
    };

let stoneGeo = new BoxGeometry(0, 0, 0);
let dirtGeo = new BoxGeometry(0, 0, 0);
let grass1Geo = new BoxGeometry(0, 0, 0);
let grass2Geo = new BoxGeometry(0, 0, 0);
let sandGeo = new BoxGeometry(0, 0, 0);
//merge all created hexagons with a single boxGeometry
// let hexagonGeometries = new BoxGeometry(0, 0, 0);

function hexGeometry(height, position) {
    let geo = new CylinderGeometry(1, 1, height, 6, 1, false);
    geo.translate(position.x, height * 0.5, position.y);

    return geo;
}


function makeHex(height, position) {
    let geo = hexGeometry(height, position);
    // hexagonGeometries = mergeBufferGeometries([hexagonGeometries, geo]);
    if(height > STONE_HEIGHT) {
        stoneGeo = mergeBufferGeometries([geo, stoneGeo]);
        if(Math.random() > 0.8){
            stoneGeo = mergeBufferGeometries([stoneGeo, stone(height, position)]);
        }
    }

    else if(height > SAND_HEIGHT) {
        sandGeo = mergeBufferGeometries([geo, sandGeo]);
        if(Math.random() > 0.7){
            stoneGeo = mergeBufferGeometries([stoneGeo, stone(height, position)]);
        }
    }

    else if(height > DIRT_HEIGHT) {
        dirtGeo = mergeBufferGeometries([geo, dirtGeo]);

        if(Math.random() > 0.8){
            grass2Geo = mergeBufferGeometries([grass2Geo, tree(height, position)]);  
        } 
    }
    else if(height > GRASS1_HEIGHT) {
        grass1Geo = mergeBufferGeometries([geo, grass1Geo]);
        if(Math.random() > 0.95){
            let modelType = Number(Math.round(Math.random() * 2));
            createModel(height, position, modelType);
        }    
    }
    else if(height > GRASS2_HEIGHT) {
        grass2Geo = mergeBufferGeometries([geo, grass2Geo]);
    }
}

//---------------------------creating new mesh----------------------------------
    function hexMesh(geo, map){ 
        let mat = new MeshPhysicalMaterial({
            envMap: envmap,
            envMapIntensity: 0.135,
            flatShading: true,
            map
        });

        let mesh = new Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.layers.set(1)
        return mesh;
    }
 
    
//----------------------loading models----------------------
let figure;
function createModel(height, position, n){
    const loader = new GLTFLoader();
    loader.load(`./assets/figures/figure_${n}.glb`, (glb)=>{
        
        figure = glb.scene.children[0];
        figure.scale.set(0.5, 0.5, 0.5);
        figure.position.set(position.x, height+0.3, position.y);
        figure.rotateZ(Math.random() * Math.PI * 2);
        figure.flatShading = true;
        figure.layers.set(1)
        // figure.rotation.x = Math.PI / -0.3;
        
        scene.add(figure);
    });
     
}
//---------------------------stones-----------------------------
function stone(height, position) {
    const px = Math.random() * 0.4;
    const pz = Math.random() * 0.4;

    const geo = new SphereGeometry(Math.random() * 0.3 + 0.1, 7, 7);
    geo.translate(position.x + px, height, position.y + pz);

    return geo;
}


//---------------------------trees-----------------------------
function tree(height, position){
    const treeHeight = Math.random() * 1 + 1.25;

    const geo = new CylinderGeometry(0, 1.5, treeHeight, 3);
    geo.translate(position.x, height + treeHeight * 0 + 1, position.y);

    const geo2 = new CylinderGeometry(0, 1.15, treeHeight, 3);
    geo2.translate(position.x, height + treeHeight * 0.6 + 1, position.y);

    const geo3 = new CylinderGeometry(0, 0.8, treeHeight, 3);
    geo3.translate(position.x, height + treeHeight * 1.25 + 1, position.y);

    return mergeBufferGeometries([geo, geo2, geo3])
}




//-----------------------------clouds-----------------------------------
function clouds(){
    let geo = new SphereGeometry(0,0,0);
    let count = Math.floor(Math.pow(Math.random(), 0.45) * 5);

    for(let i=0; i < count; i++){
        const puff1 = new SphereGeometry(1.2, 7, 7);
        const puff2 = new SphereGeometry(1.5, 7, 7);
        const puff3 = new SphereGeometry(0.9, 7, 7);

        puff1.translate(-1.85, Math.random() * 0.3, 0);
        puff2.translate(0, Math.random() * 0.3, 0);
        puff3.translate(1.85, Math.random() * 0.3, 0);     

        const cloudGeo = mergeBufferGeometries([puff1, puff2, puff3]);
        cloudGeo.translate(
            Math.random() * 20 - 10,
            Math.random() * 10 + 10,
            Math.random() * 20 - 10,
        );
        cloudGeo.rotateY(Math.random() * Math.PI * 2);

        geo = mergeBufferGeometries([geo, cloudGeo]);
    }


    const mesh = new Mesh(
        geo,
        new MeshStandardMaterial({
            envMap: envmap,
            envMapIntensity: 0.75,
            flatShading: true,
        })
    );
    mesh.layers.set(1)
    scene.add(mesh)
}