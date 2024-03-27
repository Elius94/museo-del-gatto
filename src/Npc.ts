import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface NpcOptions {
    scene: THREE.Scene;
}

export class Npc {
    model = '/models/gltf/additional_models/truffle_man/scene.gltf';
    mixer: THREE.AnimationMixer | null = null;

    constructor(props: NpcOptions) {
        const { scene } = props;

        const loader = new GLTFLoader();
        loader.load(this.model, (gltf) => {
            const npcModel = gltf.scene;
            scene.add(npcModel);

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
