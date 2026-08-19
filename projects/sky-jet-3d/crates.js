// crates.js - Infinite Dynamic Parachute Drops (Gold, Plasma Shield, and Turbo Boost Crates)
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export class SupplyCrateManager {
  constructor(scene, worldManager) {
    this.scene = scene;
    this.worldManager = worldManager;
    this.crates = [];
    this.burstParticles = [];
    this.collectedCount = 0;
    this.score = 0;
    this.maxCrates = 18; // Keep 18 crates active around player at all times

    this.initGeometriesAndMaterials();
    this.initBurstParticles();
  }

  initGeometriesAndMaterials() {
    this.boxGeom = new THREE.BoxGeometry(4.4, 4.4, 4.4);
    this.chuteGeom = new THREE.SphereGeometry(7.8, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    this.beaconGeom = new THREE.SphereGeometry(0.9, 8, 8);

    // 1. Gold Crate Material (Rare +1000 pts)
    this.goldBoxMat = new THREE.MeshStandardMaterial({
      color: 0xffbb00,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xaa6600,
      emissiveIntensity: 0.3,
    });
    this.goldChuteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.6 });

    // 2. Plasma Shield Crate Material (Energy Shield + 600 pts)
    this.plasmaBoxMat = new THREE.MeshStandardMaterial({
      color: 0x00d4ff,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0x0099cc,
      emissiveIntensity: 0.4,
    });
    this.plasmaChuteMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, roughness: 0.6 });

    // 3. Turbo Boost Crate Material (Super Nitro + 500 pts)
    this.turboBoxMat = new THREE.MeshStandardMaterial({
      color: 0xff3b30,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0xcc2200,
      emissiveIntensity: 0.3,
    });
    this.turboChuteMat = new THREE.MeshStandardMaterial({ color: 0xff9500, side: THREE.DoubleSide, roughness: 0.6 });

    this.frameGeom = new THREE.BoxGeometry(4.6, 4.6, 4.6);
    this.frameMat = new THREE.MeshStandardMaterial({ color: 0x22262c, wireframe: true });
  }

  initBurstParticles() {
    const pGeom = new THREE.SphereGeometry(0.45, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.9 });

    for (let i = 0; i < 90; i++) {
      const mesh = new THREE.Mesh(pGeom, pMat.clone());
      mesh.visible = false;
      this.scene.add(mesh);
      this.burstParticles.push({
        mesh,
        life: 0,
        maxLife: 0.65,
        velocity: new THREE.Vector3(),
      });
    }
  }

  createCrate(x, y, z, type = "turbo") {
    const group = new THREE.Group();

    let boxMat = this.turboBoxMat;
    let chuteMat = this.turboChuteMat;
    let beaconColor = 0xff5500;
    let beamColor = 0xff5500;

    if (type === "gold") {
      boxMat = this.goldBoxMat;
      chuteMat = this.goldChuteMat;
      beaconColor = 0xffd700;
      beamColor = 0xffd700;
    } else if (type === "plasma") {
      boxMat = this.plasmaBoxMat;
      chuteMat = this.plasmaChuteMat;
      beaconColor = 0x00ffff;
      beamColor = 0x00f0ff;
    }

    const box = new THREE.Mesh(this.boxGeom, boxMat);
    box.castShadow = true;
    group.add(box);

    const frame = new THREE.Mesh(this.frameGeom, this.frameMat);
    group.add(frame);

    const beaconMat = new THREE.MeshBasicMaterial({ color: beaconColor });
    const beacon = new THREE.Mesh(this.beaconGeom, beaconMat);
    beacon.position.y = 2.4;
    group.add(beacon);

    const chute = new THREE.Mesh(this.chuteGeom, chuteMat);
    chute.position.y = 11.5;
    group.add(chute);

    // Parachute lines
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });
    const corners = [
      new THREE.Vector3(-2, 2, -2),
      new THREE.Vector3(2, 2, -2),
      new THREE.Vector3(2, 2, 2),
      new THREE.Vector3(-2, 2, 2),
    ];
    corners.forEach((corner) => {
      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        corner,
        new THREE.Vector3(corner.x * 2.2, 11.5, corner.z * 2.2),
      ]);
      group.add(new THREE.Line(lineGeom, lineMat));
    });

    // Light beacon column for spotting across landscape
    const beamGeom = new THREE.CylinderGeometry(0.35, 0.35, 220, 6);
    const beamMat = new THREE.MeshBasicMaterial({
      color: beamColor,
      transparent: true,
      opacity: 0.35,
    });
    const beam = new THREE.Mesh(beamGeom, beamMat);
    beam.position.y = 110;
    group.add(beam);

    group.position.set(x, y, z);
    this.scene.add(group);

    return {
      group,
      chute,
      beacon,
      type,
      active: true,
      swayOffset: Math.random() * Math.PI * 2,
      fallSpeed: 2.8 + Math.random() * 2.2,
    };
  }

  // Dynamic Infinite Spawner: ensures crates are always floating around player in new sectors
  maintainCratesAroundPlayer(playerPos, playerForward) {
    // Remove distant crates behind player (> 2200m)
    for (let i = this.crates.length - 1; i >= 0; i--) {
      const crate = this.crates[i];
      const dist = crate.group.position.distanceTo(playerPos);
      if (!crate.active || dist > 2400) {
        this.scene.remove(crate.group);
        this.crates.splice(i, 1);
      }
    }

    // Spawn new crates ahead of player flight vector
    while (this.crates.length < this.maxCrates) {
      const angle = (Math.random() - 0.5) * Math.PI * 1.2; // 120-degree cone ahead
      const dist = 350 + Math.random() * 1100;
      
      const spawnDir = playerForward.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle).normalize();
      const spawnX = playerPos.x + spawnDir.x * dist + (Math.random() - 0.5) * 200;
      const spawnZ = playerPos.z + spawnDir.z * dist + (Math.random() - 0.5) * 200;
      
      const groundY = this.worldManager.getTerrainHeight(spawnX, spawnZ);
      const spawnY = Math.max(groundY + 40, groundY + 90 + Math.random() * 280);

      // Random crate type
      const rand = Math.random();
      let type = "turbo";
      if (rand < 0.22) type = "gold"; // 22% rare gold
      else if (rand < 0.48) type = "plasma"; // 26% plasma shield

      const crate = this.createCrate(spawnX, spawnY, spawnZ, type);
      this.crates.push(crate);
    }
  }

  triggerBurst(position, type) {
    let color = 0xff7700;
    if (type === "gold") color = 0xffd700;
    if (type === "plasma") color = 0x00f0ff;

    let fired = 0;
    for (const p of this.burstParticles) {
      if (fired >= 28) break;
      if (!p.mesh.visible) {
        p.mesh.position.copy(position);
        p.mesh.material.color.setHex(color);
        p.velocity.set(
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.2) * 40,
          (Math.random() - 0.5) * 40
        );
        p.life = 0;
        p.mesh.visible = true;
        fired++;
      }
    }
  }

  update(delta, airplane, onCollectCallback) {
    const time = Date.now() * 0.001;
    const playerPos = airplane.mesh.position;
    const playerForward = new THREE.Vector3(0, 0, 1).applyQuaternion(airplane.mesh.quaternion);

    this.maintainCratesAroundPlayer(playerPos, playerForward);

    for (const crate of this.crates) {
      if (!crate.active) continue;

      // Parachute sway
      const swayX = Math.sin(time * 1.6 + crate.swayOffset) * 0.14;
      const swayZ = Math.cos(time * 1.4 + crate.swayOffset) * 0.14;
      crate.group.rotation.x = swayX;
      crate.group.rotation.z = swayZ;

      // Descent with terrain ground check
      const groundY = this.worldManager.getTerrainHeight(crate.group.position.x, crate.group.position.z);
      if (crate.group.position.y > groundY + 3.2) {
        crate.group.position.y -= crate.fallSpeed * delta;
      }

      // Distance to airplane
      const dist = crate.group.position.distanceTo(playerPos);

      // Magnetic attraction within 75m
      if (dist < 75) {
        const pullDir = new THREE.Vector3().subVectors(playerPos, crate.group.position).normalize();
        crate.group.position.addScaledVector(pullDir, delta * 38);
      }

      // Collect crate
      if (dist < 15) {
        crate.active = false;
        crate.group.visible = false;
        this.collectedCount++;

        let addedScore = 500;
        if (crate.type === "gold") addedScore = 1000;
        if (crate.type === "plasma") addedScore = 600;

        this.score += addedScore;
        this.triggerBurst(crate.group.position, crate.type);

        if (onCollectCallback) {
          onCollectCallback(crate.type, addedScore, this.collectedCount, this.score);
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

  reset() {
    for (const c of this.crates) {
      this.scene.remove(c.group);
    }
    this.crates = [];
    this.collectedCount = 0;
    this.score = 0;
  }
}
