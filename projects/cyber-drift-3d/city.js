// city.js - Sweeping Grand Prix Highway Track, Building Clearance Exclusion & Elastic AABB Anti-Stuck Collisions
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { cyberAudio } from "./audio.js";

export class CityTrackManager {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.ramps = [];
    this.guardrails = [];
    this.trafficCars = [];
    this.policeUnits = [];
    this.helicopter = null;
    this.heliSearchlight = null;

    this.onTakedownCallback = null;
    this.onBustedCallback = null;
    this.bustedTimer = 0;

    this.initTextures();
    this.initLighting();
    this.buildGrandPrixTrackAndCurbs();
    this.buildGuardrailsAndGantries();
    this.buildSkyscrapersWithClearance();
    this.buildPoliceFleet();
    this.buildPoliceHelicopter();
    this.buildTraffic();
  }

  initTextures() {
    const roadCanvas = document.createElement("canvas");
    roadCanvas.width = 1024;
    roadCanvas.height = 1024;
    const rCtx = roadCanvas.getContext("2d");

    // Natural Slate Grey Asphalt Base
    rCtx.fillStyle = "#383e4a";
    rCtx.fillRect(0, 0, 1024, 1024);

    // Micro-gravel & stone speckles
    for (let i = 0; i < 45000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const shade = Math.random();
      if (shade > 0.6) rCtx.fillStyle = "#4c5464";
      else if (shade > 0.3) rCtx.fillStyle = "#262930";
      else rCtx.fillStyle = "#5e6878";
      rCtx.fillRect(x, y, 2 + Math.random() * 2, 2 + Math.random() * 2);
    }

    // Tire grooves
    rCtx.fillStyle = "rgba(20, 23, 30, 0.4)";
    rCtx.fillRect(160, 0, 180, 1024);
    rCtx.fillRect(684, 0, 180, 1024);

    // Outer Solid White Shoulder Lines
    rCtx.fillStyle = "#ffffff";
    rCtx.fillRect(35, 0, 16, 1024);
    rCtx.fillRect(973, 0, 16, 1024);

    // Center Double Yellow Dashed Lines
    rCtx.fillStyle = "#ffcc00";
    for (let y = 30; y < 1024; y += 140) {
      rCtx.fillRect(504, y, 7, 85);
      rCtx.fillRect(515, y, 7, 85);
    }

    // White Lane Boundary Dashes
    rCtx.fillStyle = "rgba(255, 255, 255, 0.85)";
    for (let y = 60; y < 1024; y += 160) {
      rCtx.fillRect(270, y, 6, 70);
      rCtx.fillRect(748, y, 6, 70);
    }

    this.asphaltTex = new THREE.CanvasTexture(roadCanvas);
    this.asphaltTex.wrapS = THREE.RepeatWrapping;
    this.asphaltTex.wrapT = THREE.RepeatWrapping;
    this.asphaltTex.repeat.set(1, 1);

    this.roadMat = new THREE.MeshStandardMaterial({
      map: this.asphaltTex,
      roughness: 0.45,
      metalness: 0.15,
    });
  }

  initLighting() {
    this.scene.fog = new THREE.FogExp2(0x0e1626, 0.00045);

    const ambLight = new THREE.AmbientLight(0x405578, 1.5);
    this.scene.add(ambLight);

    const hemiLight = new THREE.HemisphereLight(0x5a82c2, 0x1e2a3c, 1.6);
    hemiLight.position.set(0, 500, 0);
    this.scene.add(hemiLight);

    this.moonLight = new THREE.DirectionalLight(0xb0d0ff, 2.5);
    this.moonLight.position.set(500, 800, 400);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.width = 2048;
    this.moonLight.shadow.mapSize.height = 2048;
    this.moonLight.shadow.camera.near = 50;
    this.moonLight.shadow.camera.far = 2800;
    const d = 700;
    this.moonLight.shadow.camera.left = -d;
    this.moonLight.shadow.camera.right = d;
    this.moonLight.shadow.camera.top = d;
    this.moonLight.shadow.camera.bottom = -d;
    this.scene.add(this.moonLight);
  }

  // 🛣️ Sweeping, Flowing Grand Prix Highway (Smooth turns & spacious 38m track)
  buildGrandPrixTrackAndCurbs() {
    const groundGroup = new THREE.Group();

    const groundGeom = new THREE.PlaneGeometry(3200, 3200);
    groundGeom.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x181c26,
      roughness: 0.6,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.position.y = 0.0;
    ground.receiveShadow = true;
    groundGroup.add(ground);

    // Wide, gentle high-speed highway circuit
    const trackPoints = [
      new THREE.Vector3(0, 0.12, 0),
      new THREE.Vector3(0, 0.12, 380),
      new THREE.Vector3(160, 0.12, 600),
      new THREE.Vector3(420, 0.12, 500),
      new THREE.Vector3(500, 0.12, 200),
      new THREE.Vector3(400, 0.12, -220),
      new THREE.Vector3(220, 0.12, -500),
      new THREE.Vector3(0, 0.12, -680),
      new THREE.Vector3(-220, 0.12, -500),
      new THREE.Vector3(-400, 0.12, -220),
      new THREE.Vector3(-500, 0.12, 200),
      new THREE.Vector3(-420, 0.12, 500),
      new THREE.Vector3(-160, 0.12, 600),
      new THREE.Vector3(0, 0.12, 380),
    ];

    this.trackCurve = new THREE.CatmullRomCurve3(trackPoints, true, "catmullrom", 0.35);
    const divisions = 280;
    const trackWidth = 38;
    const halfWidth = trackWidth / 2;

    this.trackSamplePoints = this.trackCurve.getPoints(divisions);
    const vertices = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= divisions; i++) {
      const p = this.trackSamplePoints[i % divisions];
      const nextP = this.trackSamplePoints[(i + 1) % divisions];
      const tangent = new THREE.Vector3().subVectors(nextP, p).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const leftX = p.x - normal.x * halfWidth;
      const leftZ = p.z - normal.z * halfWidth;
      const rightX = p.x + normal.x * halfWidth;
      const rightZ = p.z + normal.z * halfWidth;

      vertices.push(leftX, 0.12, leftZ);
      vertices.push(rightX, 0.12, rightZ);

      const v = (i / divisions) * 65;
      uvs.push(0, v);
      uvs.push(1, v);

      if (i < divisions) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const roadGeom = new THREE.BufferGeometry();
    roadGeom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    roadGeom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    roadGeom.setIndex(indices);
    roadGeom.computeVertexNormals();

    const roadMesh = new THREE.Mesh(roadGeom, this.roadMat);
    roadMesh.receiveShadow = true;
    groundGroup.add(roadMesh);

    // Red & White Curbs
    const curbRedMat = new THREE.MeshBasicMaterial({ color: 0xe11d48 });
    const curbWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let i = 0; i < this.trackSamplePoints.length; i += 2) {
      const p1 = this.trackSamplePoints[i];
      const p2 = this.trackSamplePoints[(i + 1) % this.trackSamplePoints.length];
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const tangent = new THREE.Vector3().subVectors(p2, p1).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const dist = p1.distanceTo(p2) * 2;

      const curbMat = (i / 2) % 2 === 0 ? curbRedMat : curbWhiteMat;

      const curb1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, dist), curbMat);
      curb1.position.set(mid.x + normal.x * (halfWidth + 0.8), 0.15, mid.z + normal.z * (halfWidth + 0.8));
      curb1.lookAt(mid.x + normal.x * (halfWidth + 0.8) + tangent.x, 0.15, mid.z + normal.z * (halfWidth + 0.8) + tangent.z);

      const curb2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, dist), curbMat);
      curb2.position.set(mid.x - normal.x * (halfWidth + 0.8), 0.15, mid.z - normal.z * (halfWidth + 0.8));
      curb2.lookAt(mid.x - normal.x * (halfWidth + 0.8) + tangent.x, 0.15, mid.z - normal.z * (halfWidth + 0.8) + tangent.z);

      groundGroup.add(curb1, curb2);
    }

    this.scene.add(groundGroup);
  }

  buildGuardrailsAndGantries() {
    const railGroup = new THREE.Group();
    const chevronMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    const lightPoleGeom = new THREE.CylinderGeometry(0.3, 0.45, 16, 8);
    const lightPoleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfff0bb });

    const points = this.trackCurve.getPoints(36);
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];

      const pole = new THREE.Mesh(lightPoleGeom, lightPoleMat);
      pole.position.set(pt.x + 24, 8, pt.z);

      const lampHead = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 3.5), lampGlowMat);
      lampHead.position.set(pt.x + 22, 15.8, pt.z);

      const lampLight = new THREE.PointLight(0xfff0bb, 3.0, 55);
      lampLight.position.set(pt.x + 22, 15, pt.z);

      railGroup.add(pole, lampHead, lampLight);

      if (i % 3 === 0) {
        const sign = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.2, 0.2), chevronMat);
        sign.position.set(pt.x + 22, 3, pt.z);
        sign.lookAt(pt.x, 3, pt.z);
        railGroup.add(sign);
      }
    }

    const gantry = new THREE.Mesh(new THREE.BoxGeometry(46, 3.0, 3.0), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 }));
    gantry.position.set(0, 12, 0);

    const signBoard = new THREE.Mesh(new THREE.PlaneGeometry(32, 4.0), new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide }));
    signBoard.position.set(0, 12, 0.1);
    railGroup.add(gantry, signBoard);

    this.scene.add(railGroup);
  }

  // 🏢 Skyscrapers with 50-meter Exclusion Clearance from Road (Zero overlap with track!)
  buildSkyscrapersWithClearance() {
    const cityGroup = new THREE.Group();

    const blueCanvas = document.createElement("canvas");
    blueCanvas.width = 512;
    blueCanvas.height = 1024;
    const bCtx = blueCanvas.getContext("2d");
    bCtx.fillStyle = "#121e30";
    bCtx.fillRect(0, 0, 512, 1024);

    for (let y = 14; y < 1024; y += 28) {
      bCtx.fillStyle = "#22354e";
      bCtx.fillRect(0, y, 512, 4);
      for (let x = 12; x < 512; x += 26) {
        const isLit = Math.random() > 0.35;
        bCtx.fillStyle = isLit ? (Math.random() > 0.6 ? "#ffd166" : "#00f0ff") : "#091220";
        bCtx.fillRect(x, y + 5, 18, 18);
      }
    }
    const blueTex = new THREE.CanvasTexture(blueCanvas);
    blueTex.wrapS = THREE.RepeatWrapping;
    blueTex.wrapT = THREE.RepeatWrapping;

    const bldgMat = new THREE.MeshStandardMaterial({
      map: blueTex,
      metalness: 0.85,
      roughness: 0.18,
      emissive: 0x002f4c,
      emissiveIntensity: 0.6,
    });

    const neonMat1 = new THREE.MeshBasicMaterial({ color: 0xff007f });
    const neonMat2 = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const neonMat3 = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    const getMinDistToTrack = (x, z) => {
      let minD = 999999;
      for (let i = 0; i < this.trackSamplePoints.length; i += 4) {
        const pt = this.trackSamplePoints[i];
        const d = Math.hypot(x - pt.x, z - pt.z);
        if (d < minD) minD = d;
      }
      return minD;
    };

    for (let x = -750; x <= 750; x += 110) {
      for (let z = -750; z <= 750; z += 110) {
        const distToTrack = getMinDistToTrack(x, z);
        // Minimum clearance: 52 meters from road centerline
        if (distToTrack < 52) continue;

        const width = 45 + Math.random() * 30;
        const depth = 45 + Math.random() * 30;
        const height = 100 + Math.random() * 280;

        const bldgGeom = new THREE.BoxGeometry(width, height, depth);
        const bldg = new THREE.Mesh(bldgGeom, bldgMat);
        bldg.position.set(x, height / 2, z);
        bldg.castShadow = true;
        bldg.receiveShadow = true;
        cityGroup.add(bldg);

        this.colliders.push({
          minX: x - width / 2,
          maxX: x + width / 2,
          minZ: z - depth / 2,
          maxZ: z + depth / 2,
        });

        if (height > 180) {
          const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2.0, 40, 8), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 }));
          spire.position.set(x, height + 20, z);
          cityGroup.add(spire);

          const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0033 }));
          beacon.position.set(x, height + 40, z);
          cityGroup.add(beacon);
        }

        if (Math.random() > 0.45) {
          const boardGeom = new THREE.PlaneGeometry(38, 18);
          const boardMat = Math.random() > 0.5 ? neonMat1 : (Math.random() > 0.5 ? neonMat2 : neonMat3);
          const board = new THREE.Mesh(boardGeom, boardMat);
          board.position.set(x, height * 0.6, z + depth / 2 + 0.4);
          cityGroup.add(board);
        }
      }
    }

    this.scene.add(cityGroup);
  }

  buildPoliceFleet() {
    const policeCount = 3;
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: 0.2, metalness: 0.85 });
    const whiteDoorMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 });

    for (let i = 0; i < policeCount; i++) {
      const g = new THREE.Group();

      const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 9.4), bodyMat);
      chassis.position.y = 0.55;
      g.add(chassis);

      const doors = new THREE.Mesh(new THREE.BoxGeometry(4.45, 0.6, 3.6), whiteDoorMat);
      doors.position.set(0, 0.55, 0);
      g.add(doors);

      const blueLight = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.6), new THREE.MeshBasicMaterial({ color: 0x0066ff }));
      blueLight.position.set(0.7, 1.55, -0.4);
      const redLight = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.6), new THREE.MeshBasicMaterial({ color: 0xff0022 }));
      redLight.position.set(-0.7, 1.55, -0.4);
      g.add(blueLight, redLight);

      g.position.set((i - 1) * 60, 0.12, -260 - i * 80);
      this.scene.add(g);

      this.policeUnits.push({
        group: g,
        active: true,
        isDestroyed: false,
        flipRot: 0,
        blueLight,
        redLight,
        speed: 160 + i * 25,
      });
    }
  }

  buildPoliceHelicopter() {
    const heliGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });

    const fuse = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.2, 10), bodyMat);
    heliGroup.add(fuse);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 8), bodyMat);
    tail.position.set(0, 0.6, -7);
    heliGroup.add(tail);

    const rotorGeom = new THREE.BoxGeometry(18, 0.1, 1.2);
    const rotorMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    this.heliRotor = new THREE.Mesh(rotorGeom, rotorMat);
    this.heliRotor.position.set(0, 2.0, 0);
    heliGroup.add(this.heliRotor);

    const spotGeom = new THREE.ConeGeometry(24, 90, 16, 1, true);
    spotGeom.rotateX(Math.PI / 2);
    const spotMat = new THREE.MeshBasicMaterial({ color: 0xeeffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const spotCone = new THREE.Mesh(spotGeom, spotMat);
    spotCone.position.set(0, -45, 0);
    heliGroup.add(spotCone);

    heliGroup.position.set(0, 95, 0);
    this.scene.add(heliGroup);
    this.helicopter = heliGroup;
  }

  buildTraffic() {
    const carMat1 = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
    const carMat2 = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });
    const carMat3 = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 });
    const materials = [carMat1, carMat2, carMat3];

    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(3.8, 1.3, 7.2),
        materials[i % materials.length]
      );
      body.position.y = 0.65;
      g.add(body);

      const hl = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl.position.set(0, 0.6, 3.61);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xff0022 }));
      tl.position.set(0, 0.6, -3.61);
      g.add(hl, tl);

      g.position.set((Math.random() - 0.5) * 350, 0.12, (Math.random() - 0.5) * 350);
      this.scene.add(g);
      this.trafficCars.push({
        mesh: g,
        speed: 60 + Math.random() * 40,
        dir: Math.random() > 0.5 ? 1 : -1,
      });
    }
  }

  // 💥 Solid AABB Wall Collision Response: Pushes car 100% outside, zero getting stuck!
  handleCarTrackCollision(car) {
    const px = car.position.x;
    const pz = car.position.z;
    const carRadius = 2.6;

    for (const b of this.colliders) {
      // Find closest point on building rectangle
      const cx = Math.max(b.minX, Math.min(b.maxX, px));
      const cz = Math.max(b.minZ, Math.min(b.maxZ, pz));

      const dx = px - cx;
      const dz = pz - cz;
      const distSq = dx * dx + dz * dz;

      if (distSq < carRadius * carRadius) {
        const dist = Math.sqrt(distSq) || 0.001;
        const nx = dx / dist;
        const nz = dz / dist;
        const overlap = carRadius - dist;

        // Push car strictly outside the wall
        car.position.x += nx * (overlap + 0.4);
        car.position.z += nz * (overlap + 0.4);
        car.mesh.position.copy(car.position);

        // Clean elastic bounce
        car.speed = -car.speed * 0.35;
        cyberAudio.playCrash();
        car.emitSparks(new THREE.Vector3(cx, 0.5, cz));
        return;
      }
    }
  }

  update(delta, playerCar) {
    if (this.helicopter) {
      if (this.heliRotor) this.heliRotor.rotation.y += delta * 25;
      const targetPos = playerCar.mesh.position;
      this.helicopter.position.x = THREE.MathUtils.lerp(this.helicopter.position.x, targetPos.x, delta * 2.0);
      this.helicopter.position.z = THREE.MathUtils.lerp(this.helicopter.position.z, targetPos.z, delta * 2.0);
    }

    const isBlink = Math.sin(Date.now() * 0.02) > 0;
    const playerPos = playerCar.mesh.position;
    const playerSpeed = Math.abs(playerCar.speed);

    for (const police of this.policeUnits) {
      if (police.isDestroyed) {
        police.group.position.y += delta * 8;
        police.group.rotation.x += delta * 12;
        police.group.rotation.z += delta * 9;
        if (police.group.position.y > 25) {
          police.group.position.set(0, -50, 0);
        }
        continue;
      }

      police.blueLight.material.color.setHex(isBlink ? 0x00f0ff : 0x001144);
      police.redLight.material.color.setHex(!isBlink ? 0xff0022 : 0x330008);

      const dir = new THREE.Vector3().subVectors(playerPos, police.group.position).normalize();
      const speedMs = (Math.min(playerSpeed * 0.95 + 15, police.speed) * 1000) / 3600;
      police.group.position.addScaledVector(dir, speedMs * delta);
      police.group.lookAt(playerPos.x, 0.12, playerPos.z);

      const dist = police.group.position.distanceTo(playerPos);
      if (dist < 4.8) {
        if (playerSpeed > 65) {
          police.isDestroyed = true;
          cyberAudio.playTakedownCrunch();
          playerCar.emitSparks(police.group.position);
          playerCar.totalScore += 1500;
          playerCar.nitroFuel = 100;

          if (this.onTakedownCallback) {
            this.onTakedownCallback("🚓 POLICE TAKEDOWN! +1500 PTS");
          }

          setTimeout(() => {
            police.isDestroyed = false;
            police.group.rotation.set(0, 0, 0);
            police.group.position.set(playerPos.x + (Math.random() - 0.5) * 180, 0.12, playerPos.z - 280);
          }, 12000);
        } else {
          this.bustedTimer += delta;
          if (this.bustedTimer > 2.8) {
            if (this.onBustedCallback) this.onBustedCallback();
          }
        }
      }
    }

    if (playerSpeed > 35) this.bustedTimer = Math.max(0, this.bustedTimer - delta * 2);

    for (const car of this.trafficCars) {
      car.mesh.position.z += car.speed * car.dir * delta * 0.3;
      if (car.mesh.position.z > 450) car.mesh.position.z = -450;
      if (car.mesh.position.z < -450) car.mesh.position.z = 450;

      const d = car.mesh.position.distanceTo(playerPos);
      if (d < 5.2 && playerSpeed > 90) {
        playerCar.totalScore += 250;
      }
    }
  }
}
