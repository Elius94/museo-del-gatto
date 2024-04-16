import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Octree } from 'three/examples/jsm/math/Octree';

export interface NpcOptions {
    model?: string;
    scene: THREE.Scene;
    octree?: Octree;
    position: THREE.Vector3;
    rotation?: THREE.Euler;
    scale?: number;
}

export class Npc {
    model = './models/gltf/additional_models/bicolor_cat.glb';
    npcModel: THREE.Object3D | null = null;
    mixer: THREE.AnimationMixer | null = null;
    octree: Octree | null = null;

    constructor(props: NpcOptions) {
        const { scene } = props;
        this.model = props.model || this.model;
        this.octree = props.octree as Octree;

        const loader = new GLTFLoader();
        loader.load(this.model, (gltf) => {
            const npcModel = gltf.scene;
            // Scale the NPC model
            npcModel.scale.set(props.scale || 1, props.scale || 1, props.scale || 1);
            // Position the NPC model
            npcModel.position.copy(props.position);
            // Rotate the NPC model
            if (props.rotation) {
                npcModel.rotation.copy(props.rotation);
            }
            
            // Verifica se ci sono animazioni nel modello
            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(npcModel);
                gltf.animations.forEach((clip) => {
                    const action = this.mixer?.clipAction(clip);
                    action?.play();
                });
            }
            this.npcModel = npcModel;
            if (this.octree) this.octree.fromGraphNode(this.npcModel);
            scene.add(this.npcModel);
        });
    }

    // Chiamato nell'update del tuo loop di rendering per aggiornare le animazioni
    update(deltaTime: number) {
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
    }
}
