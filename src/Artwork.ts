import * as THREE from 'three';
import { Octree } from 'three/examples/jsm/math/Octree.js';

export const ARTWORK_BASE_PATH = './textures/artworks/'; // must end with a slash

export interface ArtworkFrameOptions {
    picture: string;
    quality?: "SD" | "LD" | "MD" | "HD";
    x: number;
    y: number;
    z: number;
    rotationX?: number;
    rotationY?: number;
    rotationZ?: number;
    size?: number;
    thickness?: number;
    scene?: THREE.Scene;
    worldOctree?: Octree;
    title?: string;
    author?: string;
    year?: number;
    description?: string;
    redirectUrl?: string;
}

class ArtworkFrame {
    mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
    geometry: THREE.BoxGeometry;

    // Proprietà per tenere traccia dello stato di highlight
    private isHighlighted: boolean = false;
    picture: string;
    quality: string;
    title?: string;
    author?: string;
    year?: number;
    description?: string;
    redirectUrl?: string;

    constructor(props: ArtworkFrameOptions) {
        const { picture, quality, x, y, z, rotationX, rotationY, rotationZ, size, thickness, scene, worldOctree, title, author, year, description, redirectUrl } = props;
        if (!picture) {
            throw new Error('Picture is required');
        }
        if (x === undefined || y === undefined || z === undefined) {
            throw new Error('x, y, and z coordinates are required');
        }

        this.picture = picture;
        this.title = title;
        this.quality = quality || "SD";
        this.author = author;
        this.year = year;
        this.description = description;
        this.redirectUrl = redirectUrl;

        this.mesh = new THREE.Mesh();
        this.geometry = new THREE.BoxGeometry();
        // Create a new texture from the picture
        new THREE.TextureLoader().loadAsync(`${ARTWORK_BASE_PATH}${quality}/${picture}`).then((texture) => {
            // Create a material using the texture
            texture.anisotropy = 16;
            texture.colorSpace = THREE.SRGBColorSpace;
            const material = new THREE.MeshBasicMaterial({ map: texture, });

            // Calculate the aspect ratio of the texture
            const aspectRatio = texture.image.width / texture.image.height;

            const realSize = size || 200;
            const realWidth = realSize;
            const realHeight = realSize / aspectRatio;
            const realThickness = thickness || 0.1;

            // Create a box geometry for the artwork frame
            this.geometry = new THREE.BoxGeometry(realWidth, realHeight, realThickness);

            // Scale the geometry down slightly on the x and y axes
            this.geometry.scale(0.9, 0.9, 1);

            // Create a mesh from the geometry and material
            this.mesh = new THREE.Mesh(this.geometry, material);

            // Set the rotation of the mesh using the given coordinates
            this.mesh.rotation.set(rotationX || 0, rotationY || 0, rotationZ || 0);

            // Set the position of the mesh using the given coordinates
            this.mesh.position.set(x, y, z);

            // Add the mesh to the octree
            if (worldOctree) {
                worldOctree.fromGraphNode(this.mesh);
            }
            // Add the mesh to the scene
            if (scene) {
                scene.add(this.mesh);
            }
        });
        return this;
    }

    setPosition(x: number, y: number, z: number) {
        this.mesh.position.set(x, y, z);
    }

    setRotation(x: number, y: number, z: number) {
        this.mesh.rotation.set(x, y, z);
    }

    setSize(size: number) {
        const aspectRatio = this.geometry.parameters.width / this.geometry.parameters.height;
        const realWidth = size;
        const realHeight = size / aspectRatio;
        this.geometry = new THREE.BoxGeometry(realWidth, realHeight, this.geometry.parameters.depth);
        this.geometry.scale(0.9, 0.9, 1);
        this.mesh.geometry = this.geometry;
    }

    getSize() {
        return this.geometry.parameters.width;
    }

    getPosition() {
        return this.mesh.position;
    }

    getRotation() {
        return this.mesh.rotation;
    }

    increasePosition(x: number, y: number, z: number) {
        this.mesh.position.x += x;
        this.mesh.position.y += y;
        this.mesh.position.z += z;
        return this.getPosition();
    }

    increaseRotation(x: number, y: number, z: number) {
        this.mesh.rotation.x += x;
        this.mesh.rotation.y += y;
        this.mesh.rotation.z += z;
        return this.getRotation();
    }

    increaseSize(size: number) {
        this.setSize(this.getSize() + size);
        return this.getSize();
    }

    // Metodo per attivare l'effetto di highlight
    highlight() {
        if (!this.isHighlighted) {
            // Crea una nuova geometria per la cornice 3D
            const frameGeometry = new THREE.BoxGeometry(
                this.geometry.parameters.width + 0.002, // Larghezza leggermente più ampia
                this.geometry.parameters.height + 0.002, // Altezza leggermente più alta
                0.00001 // Spessore minimo
            );

            // Crea un materiale per la cornice (puoi personalizzarlo come preferisci)
            const frameMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true, lightMapIntensity: 0.5 });

            // Crea un mesh per la cornice ed il testo generico txt
            const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);

            // Applica la stessa rotazione della mesh originale
            frameMesh.rotation.copy(this.mesh.rotation);

            // Posiziona la cornice esattamente sopra l'artwork
            frameMesh.position.copy(this.mesh.position);

            // Aggiungi la cornice alla stessa posizione nella gerarchia
            this.mesh.parent?.add(frameMesh);
            // Segna la mesh come highlight attivo
            this.isHighlighted = true;

            // Ritorna il materiale originale dopo 1 secondo
            setTimeout(() => {
                // rimuovi click event listener
                this.unhighlight([frameMesh]);
            }, 1000);
        }
        return this;
    }

    // Metodo per disattivare l'effetto di highlight
    unhighlight(frameMeshes?: THREE.Mesh[]) {
        if (this.isHighlighted) {
            // Rimuovi la linea di highlight
            if (frameMeshes && frameMeshes.length > 0) {
                frameMeshes.forEach((frameMesh) => {
                    this.mesh.parent?.remove(frameMesh);
                });
            }

            // Segna la mesh come non highlight
            this.isHighlighted = false;
        }
    }
}

export default ArtworkFrame;