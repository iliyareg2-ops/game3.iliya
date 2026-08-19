// crates.js - Parachute Supply Crates, Floating Physics, Smoke Beacons, and Pickup Effects
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export class SupplyCrateManager {
  constructor(scene, worldManager) {
    this.scene = scene;
    this.worldManager = worldManager;
    this.crates = [];
    this.burstParticles = [];
    this.collectedCount = 0;
    this.score = 0;

    this.crateGeom = null;
    this.parachuteGeom = null;
    this.initGeometriesAndMaterials();
    this.initBurstParticles();
    this.spawnInitialCrates(14);
  }

  initGeometriesAndMaterials() {
    // 1. Cargo Box
    this.boxGeom = new THREE.BoxGeometry(4.2, 4.2, 4.2);
    this.boxMat = new THREE.MeshStandardMaterial({
      color: 0xcc8800,
      metalness: 0.6,
      roughness: 0.35,
    });

    // Crate corner brackets & hazard stripes
    this.frameGeom = new THREE.BoxGeometry(4.4, 4.4, 4.4);
    this.frameMat = new THREE.MeshStandardMaterial({
      color: 0x22262c,
      metalness: 0.9,
      roughness: 0.4,
      wireframe: true,
    });

    // 2. Parachute Canopy (Hemisphere)
    this.chuteGeom = new THREE.SphereGeometry(7.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    this.chuteMat = new THREE.MeshStandardMaterial({
      color: 0xff3b30,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    // 3. Glowing Beacon & Smoke Flare
    this.beaconGeom = new THREE.SphereGeometry(0.8, 8, 8);
    this.beaconMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
  }

  initBurstParticles() {
    const pGeom = new THREE.SphereGeometry(0.4, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.9,
    });

    for (let i = 0; i < 70; i++) {
      const mesh = new THREE.Mesh(pGeom, pMat.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this.burstParticles.push({
        mesh,
        life: 0,
        maxLife: 0.6,
        velocity: new THREE.Vector3(),
      });
    }
  }

  createSingleCrate(x, y, z) {
    const group = new THREE.Group();

    // Box
    const box = new THREE.Mesh(this.boxGeom, this.boxMat);
    box.castShadow = true;
    box.receiveShadow = true;
    group.add(box);

    const frame = new THREE.Mesh(this.frameGeom, this.frameMat);
    group.add(frame);

    // Blinking LED Beacon on top
    const beacon = new THREE.Mesh(this.beaconGeom, this.beaconMat);
    beacon.position.y = 2.4;
    group.add(beacon);

    // Parachute Canopy
    const chute = new THREE.Mesh(this.chuteGeom, this.chuteMat);
    chute.position.y = 11;
    group.add(chute);

    // Parachute Suspension Lines (Ropes)
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    const corners = [
      new THREE.Vector3(-2, 2, -2),
      new THREE.Vector3(2, 2, -2),
      new THREE.Vector3(2, 2, 2),
      new THREE.Vector3(-2, 2, 2),
    ];

    corners.forEach((corner) => {
      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        corner,
        new THREE.Vector3(corner.x * 2.2, 11, corner.z * 2.2),
      ]);
      const line = new THREE.Line(lineGeom, lineMat);
      group.add(line);
    });

    // Light Pillar / Beam for easy visual spotting across mountains
    const beamGeom = new THREE.CylinderGeometry(0.3, 0.3, 160, 6);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.35,
    });
    const beam = new THREE.Mesh(beamGeom, beamMat);
    beam.position.y = 80;
    group.add(beam);

    group.position.set(x, y, z);
    this.scene.add(group);

    return {
      group,
      chute,
      beacon,
      active: true,
      swayOffset: Math.random() * Math.PI * 2,
      fallSpeed: 3.5 + Math.random() * 2.0,
      initialY: y,
    };
  }

  spawnInitialCrates(count) {
    // Clear old crates
    for (const c of this.crates) {
      this.scene.remove(c.group);
    }
    this.crates = [];

    // Strategic scenic placements (approaches, valley rings, peaks)
    const presetPositions = [
      // Approach over runway
      { x: 0, y: 120, z: 200 },
      { x: 30, y: 180, z: 700 },
      { x: -50, y: 220, z: 1100 },
      // Mountain passes
      { x: 280, y: 260, z: 400 },
      { x: -320, y: 280, z: -200 },
      { x: 450, y: 320, z: -600 },
      { x: -400, y: 340, z: 650 },
      // Highway curves
      { x: 180, y: 160, z: -400 },
      { x: 240, y: 190, z: -100 },
      // High alpine ridges
      { x: 600, y: 380, z: 200 },
      { x: -550, y: 390, z: -500 },
      { x: 0, y: 310, z: -900 },
      { x: 350, y: 270, z: 950 },
      { x: -280, y: 250, z: -750 },
    ];

    for (let i = 0; i < count; i++) {
      const pos = presetPositions[i % presetPositions.length];
      const crate = this.createSingleCrate(pos.x, pos.y, pos.z);
      this.crates.push(crate);
    }
  }

  triggerBurst(position) {
    let fired = 0;
    for (const p of this.burstParticles) {
      if (fired >= 24) break;
      if (!p.mesh.visible) {
        p.mesh.position.copy(position);
        p.velocity.set(
          (Math.random() - 0.5) * 35,
          (Math.random() - 0.2) * 35,
          (Math.random() - 0.5) * 35
        );
        p.life = 0;
        p.mesh.visible = true;
        fired++;
      }
    }
  }

  update(delta, airplane, onCollectCallback) {
    const time = Date.now() * 0.001;

    for (const crate of this.crates) {
      if (!crate.active) continue;

      // Gentle floating descent & sway
      const swayX = Math.sin(time * 1.5 + crate.swayOffset) * 0.12;
      const swayZ = Math.cos(time * 1.3 + crate.swayOffset) * 0.12;

      crate.group.rotation.x = swayX;
      crate.group.rotation.z = swayZ;

      // Slow descent with ground check
      const groundY = this.worldManager.getTerrainHeight(crate.group.position.x, crate.group.position.z);
      if (crate.group.position.y > groundY + 3.0) {
        crate.group.position.y -= crate.fallSpeed * delta;
      }

      // Beacon blink
      const blink = Math.sin(time * 8 + crate.swayOffset) > 0;
      crate.beacon.material.color.setHex(blink ? 0x00ffff : 0x005577);

      // Distance to Airplane
      const dist = crate.group.position.distanceTo(airplane.mesh.position);

      // Magnetic pull when close
      if (dist < 65) {
        const pullDir = new THREE.Vector3().subVectors(airplane.mesh.position, crate.group.position).normalize();
        crate.group.position.addScaledVector(pullDir, delta * 30);
      }

      // Collect Trigger
      if (dist < 14) {
        crate.active = false;
        crate.group.visible = false;
        this.collectedCount++;
        this.score += 500;
        this.triggerBurst(crate.group.position);

        if (onCollectCallback) {
          onCollectCallback(this.collectedCount, this.score);
        }
      }
    }

    // Update burst particles
    for (const p of this.burstParticles) {
      if (!p.mesh.visible) continue;
      p.life += delta;
      if (p.life >= p.maxLife) {
        p.mesh.visible = false;
      } else {
        p.mesh.position.addScaledVector(p.velocity, delta);
        p.mesh.scale.multiplyScalar(0.96);
        p.mesh.material.opacity = (1 - p.life / p.maxLife) * 0.9;
      }
    }
  }

  getNearestCratePosition(fromPos) {
    let nearest = null;
    let minDist = Infinity;
    for (const c of this.crates) {
      if (!c.active) continue;
      const d = c.group.position.distanceTo(fromPos);
      if (d < minDist) {
        minDist = d;
        nearest = c.group.position;
      }
    }
    return nearest;
  }

  reset() {
    this.collectedCount = 0;
    this.score = 0;
    this.spawnInitialCrates(14);
  }
}
