import * as THREE from 'three';
import { Capsule } from 'three/examples/jsm/math/Capsule.js';

const NUM_SPHERES = 100;
const SPHERE_RADIUS = 0.2;

export interface BulletsOptions {
    scene: THREE.Scene;
    camera: THREE.Camera;
    playerCollider: Capsule;
    playerDirection: THREE.Vector3;
    playerVelocity: THREE.Vector3;
    mouseTime: number;
    gravity?: number;
}

export class Bullets {
    camera: THREE.Camera;
    playerCollider: Capsule;
    playerDirection: THREE.Vector3;
    playerVelocity: THREE.Vector3;
    mouseTime: number;
    sphereGeometry: THREE.IcosahedronGeometry;
    sphereMaterial: THREE.MeshLambertMaterial;
    spheres = [] as any[];
    sphereIdx = 0;
    vector1: THREE.Vector3;
    vector2: THREE.Vector3;
    vector3: THREE.Vector3;
    gravity: number;


    constructor(props: BulletsOptions) {
        const { scene, camera, playerCollider, playerDirection, playerVelocity, mouseTime, gravity } = props;
        this.camera = camera;
        this.playerCollider = playerCollider;
        this.playerDirection = playerDirection;
        this.playerVelocity = playerVelocity;
        this.mouseTime = mouseTime;
        this.gravity = gravity || 9.8;

        this.sphereGeometry = new THREE.IcosahedronGeometry(SPHERE_RADIUS, 5);
        this.sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xdede8d });

        this.vector1 = new THREE.Vector3();
        this.vector2 = new THREE.Vector3();
        this.vector3 = new THREE.Vector3();

        for (let i = 0; i < NUM_SPHERES; i++) {

            const sphere = new THREE.Mesh(this.sphereGeometry, this.sphereMaterial);
            sphere.castShadow = true;
            sphere.receiveShadow = true;

            scene.add(sphere);

            this.spheres.push({
                mesh: sphere,
                collider: new THREE.Sphere(new THREE.Vector3(0, - 100, 0), SPHERE_RADIUS),
                velocity: new THREE.Vector3()
            });

        }
    }

    setMouseTime(mouseTime: number) {
        this.mouseTime = mouseTime;
    }

    getMouseTime() {
        return this.mouseTime;
    }

    throwBall() {
        const sphere = this.spheres[this.sphereIdx];

        this.camera.getWorldDirection(this.playerDirection);
        sphere.collider.center.copy(this.playerCollider.end).addScaledVector(this.playerDirection, this.playerCollider.radius * 1.5);

        // throw the ball with more force if we hold the button longer, and if we move forward
        const impulse = 15 + 30 * (1 - Math.exp((this.mouseTime - performance.now()) * 0.001));

        sphere.velocity.copy(this.playerDirection).multiplyScalar(impulse);
        sphere.velocity.addScaledVector(this.playerVelocity, 2);

        this.sphereIdx = (this.sphereIdx + 1) % this.spheres.length;
    }

    playerSphereCollision(sphere: any) {
        const center = this.vector1.addVectors(this.playerCollider.start, this.playerCollider.end).multiplyScalar(0.5);

        const sphere_center = sphere.collider.center;

        const r = this.playerCollider.radius + sphere.collider.radius;
        const r2 = r * r;

        // approximation: player = 3 spheres

        for (const point of [this.playerCollider.start, this.playerCollider.end, center]) {
            const d2 = point.distanceToSquared(sphere_center);

            if (d2 < r2) {

                const normal = this.vector1.subVectors(point, sphere_center).normalize();
                const v1 = this.vector2.copy(normal).multiplyScalar(normal.dot(this.playerVelocity));
                const v2 = this.vector3.copy(normal).multiplyScalar(normal.dot(sphere.velocity));

                this.playerVelocity.add(v2).sub(v1);
                sphere.velocity.add(v1).sub(v2);

                const d = (r - Math.sqrt(d2)) / 2;
                sphere_center.addScaledVector(normal, - d);

            }
        }
    }

    spheresCollisions() {
        for (let i = 0, length = this.spheres.length; i < length; i++) {
            const s1 = this.spheres[i];

            for (let j = i + 1; j < length; j++) {
                const s2 = this.spheres[j];

                const d2 = s1.collider.center.distanceToSquared(s2.collider.center);
                const r = s1.collider.radius + s2.collider.radius;
                const r2 = r * r;

                if (d2 < r2) {
                    const normal = this.vector1.subVectors(s1.collider.center, s2.collider.center).normalize();
                    const v1 = this.vector2.copy(normal).multiplyScalar(normal.dot(s1.velocity));
                    const v2 = this.vector3.copy(normal).multiplyScalar(normal.dot(s2.velocity));

                    s1.velocity.add(v2).sub(v1);
                    s2.velocity.add(v1).sub(v2);

                    const d = (r - Math.sqrt(d2)) / 2;

                    s1.collider.center.addScaledVector(normal, d);
                    s2.collider.center.addScaledVector(normal, - d);
                }
            }
        }
    }

    updateSpheres(deltaTime: number, worldOctree: any) {
        this.spheres.forEach(sphere => {
            sphere.collider.center.addScaledVector(sphere.velocity, deltaTime);

            const result = worldOctree.sphereIntersect(sphere.collider);

            if (result) {

                sphere.velocity.addScaledVector(result.normal, - result.normal.dot(sphere.velocity) * 1.5);
                sphere.collider.center.add(result.normal.multiplyScalar(result.depth));

            } else {

                sphere.velocity.y -= this.gravity * deltaTime;

            }

            const damping = Math.exp(- 1.5 * deltaTime) - 1;
            sphere.velocity.addScaledVector(sphere.velocity, damping);

            this.playerSphereCollision(sphere);

        });

        this.spheresCollisions();

        for (const sphere of this.spheres) {
            sphere.mesh.position.copy(sphere.collider.center);
        }
    }
}