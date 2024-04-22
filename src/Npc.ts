import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Octree } from 'three/examples/jsm/math/Octree';

/**
 * Interfaccia per le opzioni dell'NPC.
 */
export interface NpcOptions {
    model?: string;
    scene: THREE.Scene;
    octree?: Octree;
    position: THREE.Vector3;
    rotation?: THREE.Euler;
    scale?: number;
    sphereCollider?: boolean; // Nuova opzione per il collider sferico
    showFlagStand?: boolean; // Nuova opzione per mostrare il flag stand
}

/**
 * Classe per rappresentare un NPC.
 */
export class Npc {
    model = './models/gltf/additional_models/bicolor_cat.glb';
    npcModel: THREE.Object3D | null = null;
    mixer: THREE.AnimationMixer | null = null;
    octree: Octree | null = null;
    sphereCollider: boolean = false; // Impostazione predefinita a false
    showFlagStand: boolean = false; // Impostazione predefinita a false

    /**
     * Costruttore per l'NPC.
     * @param props Le opzioni per l'NPC.
     */
    constructor(props: NpcOptions) {
        const { scene } = props;
        this.model = props.model || this.model;
        this.octree = props.octree as Octree;
        this.sphereCollider = !!props.sphereCollider;
        this.showFlagStand = !!props.showFlagStand; // Impostazione dell'opzione per mostrare il flag stand

        const loader = new GLTFLoader();
        loader.load(this.model, (gltf) => {
            const npcModel = gltf.scene;
            npcModel.scale.set(props.scale || 1, props.scale || 1, props.scale || 1);
            npcModel.position.copy(props.position);
            if (props.rotation) {
                npcModel.rotation.copy(props.rotation);
            }
            
            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(npcModel);
                gltf.animations.forEach((clip) => {
                    const action = this.mixer?.clipAction(clip);
                    action?.play();
                });
            }
            this.npcModel = npcModel;

            if (this.showFlagStand) {
                const flagStand = this.createFlagStand();
                this.npcModel.add(flagStand);
            }

            if (this.sphereCollider) {
                const bbox = new THREE.Box3().setFromObject(this.npcModel);
                const sphere = new THREE.Sphere();
                bbox.getBoundingSphere(sphere);
                const radius = sphere.radius;
                const collider = new THREE.Mesh(
                    new THREE.SphereGeometry(radius),
                    new THREE.MeshBasicMaterial({ visible: false })
                );
                collider.position.copy(this.npcModel.position);
                if (this.octree) this.octree.fromGraphNode(collider);
            } else {
                if (this.octree) this.octree.fromGraphNode(this.npcModel);
            }

            scene.add(this.npcModel);
        });
    }

    /**
     * Metodo chiamato nell'update del loop di rendering per aggiornare le animazioni.
     * @param deltaTime Il tempo trascorso dall'ultimo frame.
     */
    update(deltaTime: number) {
        if (this.mixer) {
            this.mixer.update(deltaTime);
        }
    }

    /**
     * Metodo privato per creare il flag stand.
     * @returns Il mesh del flag stand.
     */
    private createFlagStand(): THREE.Mesh {
        if (!this.npcModel) {
            throw new Error('NPC model not loaded yet');
        }
        // Calcola la bounding box del modello
        const bbox = new THREE.Box3().setFromObject(this.npcModel);
        // Calcola la larghezza della base minore della bounding box
        const width = Math.min(bbox.max.x - bbox.min.x, bbox.max.z - bbox.min.z);
    
        // Creazione del flag stand come un rettangolo piatto
        const flagStandGeometry = new THREE.PlaneGeometry(width, width * 0.1); // Altezza arbitraria, puoi modificarla secondo le tue esigenze
        const flagStandMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide }); // Assicurati di impostare side su DoubleSide per renderizzare entrambi i lati del piano
        const flagStand = new THREE.Mesh(flagStandGeometry, flagStandMaterial);
    
        // Posizionamento del flag stand sotto il modello
        flagStand.rotation.x = -Math.PI / 2; // Ruota il piano per renderlo orizzontale
        flagStand.position.y = bbox.min.y; // La posizione Y coincide con il minimo della bounding box del modello
    
        return flagStand;
    }
}
