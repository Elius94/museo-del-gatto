import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface NpcOptions {
    scene: THREE.Scene;
    position: THREE.Vector3;
    rotation?: THREE.Euler;
    scale?: number;
}

export class Npc {
    model = './models/gltf/additional_models/bicolor_cat.glb';
    mixer: THREE.AnimationMixer | null = null;

    constructor(props: NpcOptions) {
        const { scene } = props;

        const loader = new GLTFLoader();
        loader.load(this.model, (gltf) => {
            const npcModel = gltf.scene;
            scene.add(npcModel);
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
        });
    }

    // Chiamato nell'update del tuo loop di rendering per aggiornare le animazioni
    update(deltaTime: number) {
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
    }
}
