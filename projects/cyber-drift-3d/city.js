// city.js - Brightened Cyber City, Normal-Offset Roadside Lights & Detailed Traffic Cars
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
    this.buildRoadsideStreetlights();
    this.buildSkyscrapersWithClearance();
    this.buildPoliceFleet();
    this.buildPoliceHelicopter();
    this.buildDetailedTraffic();
  }

  initTextures() {
    const roadCanvas = document.createElement("canvas");
    roadCanvas.width = 1024;
    roadCanvas.height = 1024;
    const rCtx = roadCanvas.getContext("2d");

    // Bright Natural Slate Asphalt Base
    rCtx.fillStyle = "#4c5466";
    rCtx.fillRect(0, 0, 1024, 1024);

    // Micro-gravel & stone speckles
    for (let i = 0; i < 45000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const shade = Math.random();
      if (shade > 0.6) rCtx.fillStyle = "#636e84";
      else if (shade > 0.3) rCtx.fillStyle = "#383e4c";
      else rCtx.fillStyle = "#79869e";
      rCtx.fillRect(x, y, 2 + Math.random() * 2, 2 + Math.random() * 2);
    }

    // Tire grooves
    rCtx.fillStyle = "rgba(30, 35, 45, 0.35)";
    rCtx.fillRect(160, 0, 180, 1024);
    rCtx.fillRect(684, 0, 180, 1024);

    // Outer Solid White Shoulder Lines
    rCtx.fillStyle = "#ffffff";
    rCtx.fillRect(35, 0, 18, 1024);
    rCtx.fillRect(971, 0, 18, 1024);

    // Center Double Yellow Dashed Lines
    rCtx.fillStyle = "#ffd000";
    for (let y = 30; y < 1024; y += 140) {
      rCtx.fillRect(504, y, 7, 85);
      rCtx.fillRect(515, y, 7, 85);
    }

    // White Lane Boundary Dashes
    rCtx.fillStyle = "rgba(255, 255, 255, 0.9)";
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
      roughness: 0.4,
      metalness: 0.15,
    });
  }

  // 💡 Bright, Vibrant City Lighting
  initLighting() {
    this.scene.fog = new THREE.FogExp2(0x182438, 0.00038);

    const ambLight = new THREE.AmbientLight(0x7598c8, 2.2);
    this.scene.add(ambLight);

    const hemiLight = new THREE.HemisphereLight(0x90b8f0, 0x30425c, 2.5);
    hemiLight.position.set(0, 500, 0);
    this.scene.add(hemiLight);

    this.moonLight = new THREE.DirectionalLight(0xd0e4ff, 3.2);
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

  buildGrandPrixTrackAndCurbs() {
    const groundGroup = new THREE.Group();

    const groundGeom = new THREE.PlaneGeometry(3200, 3200);
    groundGeom.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x222a38,
      roughness: 0.55,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.position.y = 0.0;
    ground.receiveShadow = true;
    groundGroup.add(ground);

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
    this.trackWidth = 38;
    const halfWidth = this.trackWidth / 2;

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

  // 🏮 Streetlights placed strictly 6 meters OUTSIDE the outer road curbs on the sidewalk!
  buildRoadsideStreetlights() {
    const railGroup = new THREE.Group();
    const halfWidth = this.trackWidth / 2;

    const lightPoleGeom = new THREE.CylinderGeometry(0.3, 0.45, 16, 8);
    const lightPoleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfff3cc });

    const count = 28;
    for (let i = 0; i < count; i++) {
      const u = i / count;
      const pt = this.trackCurve.getPointAt(u);
      const tangent = this.trackCurve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      // Right roadside position (halfWidth + 6.0 meters outside track)
      const polePos = pt.clone().addScaledVector(normal, halfWidth + 6.0);

      const pole = new THREE.Mesh(lightPoleGeom, lightPoleMat);
      pole.position.set(polePos.x, 8, polePos.z);

      const lampHead = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 3.5), lampGlowMat);
      lampHead.position.set(polePos.x - normal.x * 2.0, 15.8, polePos.z - normal.z * 2.0);

      const lampLight = new THREE.PointLight(0xfff3cc, 3.5, 60);
      lampLight.position.set(polePos.x - normal.x * 2.0, 15, polePos.z - normal.z * 2.0);

      railGroup.add(pole, lampHead, lampLight);
    }

    this.scene.add(railGroup);
  }

  buildSkyscrapersWithClearance() {
    const cityGroup = new THREE.Group();

    const blueCanvas = document.createElement("canvas");
    blueCanvas.width = 512;
    blueCanvas.height = 1024;
    const bCtx = blueCanvas.getContext("2d");
    bCtx.fillStyle = "#16243a";
    bCtx.fillRect(0, 0, 512, 1024);

    for (let y = 14; y < 1024; y += 28) {
      bCtx.fillStyle = "#2a3d58";
      bCtx.fillRect(0, y, 512, 4);
      for (let x = 12; x < 512; x += 26) {
        const isLit = Math.random() > 0.3;
        bCtx.fillStyle = isLit ? (Math.random() > 0.5 ? "#ffe066" : "#00f0ff") : "#0c1726";
        bCtx.fillRect(x, y + 5, 18, 18);
      }
    }
    const blueTex = new THREE.CanvasTexture(blueCanvas);
    blueTex.wrapS = THREE.RepeatWrapping;
    blueTex.wrapT = THREE.RepeatWrapping;

    const bldgMat = new THREE.MeshStandardMaterial({
      map: blueTex,
      metalness: 0.8,
      roughness: 0.15,
      emissive: 0x003d66,
      emissiveIntensity: 0.8,
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
        if (distToTrack < 54) continue;

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
          const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2.0, 40, 8), new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 }));
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

  // 🚗 HIGH-POLY DETAILED TRAFFIC CARS (Sedans, SUVs, Sports Cabs with wheels, glass & lights)
  buildDetailedTraffic() {
    const carColors = [0x0284c7, 0xf59e0b, 0xdc2626, 0x10b981, 0x7c3aed, 0xf8fafc];
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1c1d22, roughness: 0.8 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 });
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });

    const wheelGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 14);
    wheelGeom.rotateZ(Math.PI / 2);
    const rimGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.37, 10);
    rimGeom.rotateZ(Math.PI / 2);

    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      const paintMat = new THREE.MeshStandardMaterial({
        color: carColors[i % carColors.length],
        metalness: 0.6,
        roughness: 0.25,
      });

      // 1. Lower Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.7, 8.4), paintMat);
      body.position.y = 0.55;
      g.add(body);

      // 2. Cabin Glass Greenhouse
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.65, 4.4), glassMat);
      cabin.position.set(0, 1.15, -0.3);
      g.add(cabin);

      // 3. Roof
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 3.5), paintMat);
      roof.position.set(0, 1.48, -0.3);
      g.add(roof);

      // 4. Mirrors
      const mirrorL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.3), paintMat);
      mirrorL.position.set(2.0, 1.05, 0.8);
      const mirrorR = mirrorL.clone();
      mirrorR.position.x = -2.0;
      g.add(mirrorL, mirrorR);

      // 5. 4 Wheels with Rims
      const makeWheel = (x, z) => {
        const wg = new THREE.Group();
        const tire = new THREE.Mesh(wheelGeom, tireMat);
        const rim = new THREE.Mesh(rimGeom, rimMat);
        wg.add(tire, rim);
        wg.position.set(x, 0.5, z);
        return wg;
      };

      const wFL = makeWheel(1.85, 2.6);
      const wFR = makeWheel(-1.85, 2.6);
      const wRL = makeWheel(1.85, -2.6);
      const wRR = makeWheel(-1.85, -2.6);
      g.add(wFL, wFR, wRL, wRR);

      // 6. Lights
      const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.1), hlMat);
      hlL.position.set(1.4, 0.6, 4.21);
      const hlR = hlL.clone();
      hlR.position.x = -1.4;

      const tl = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.2, 0.1), tlMat);
      tl.position.set(0, 0.6, -4.21);
      g.add(hlL, hlR, tl);

      const u = (i / 9);
      const pt = this.trackCurve.getPointAt(u);
      g.position.set(pt.x + (i % 2 === 0 ? 6 : -6), 0.12, pt.z);
      this.scene.add(g);

      this.trafficCars.push({
        mesh: g,
        u: u,
        speed: 0.015 + (i % 3) * 0.005,
        laneOffset: (i % 2 === 0 ? 6.5 : -6.5),
        wheels: [wFL, wFR, wRL, wRR],
      });
    }
  }

  handleCarTrackCollision(car) {
    const px = car.position.x;
    const pz = car.position.z;
    const carRadius = 2.6;

    for (const b of this.colliders) {
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

        car.position.x += nx * (overlap + 0.4);
        car.position.z += nz * (overlap + 0.4);
        car.mesh.position.copy(car.position);

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

    // 🚗 Move Traffic Cars smoothly along curve lanes with spinning wheels
    for (const car of this.trafficCars) {
      car.u = (car.u + car.speed * delta) % 1.0;
      const pt = this.trackCurve.getPointAt(car.u);
      const tangent = this.trackCurve.getTangentAt(car.u).normalize();
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      car.mesh.position.copy(pt).addScaledVector(normal, car.laneOffset);
      car.mesh.position.y = 0.12;

      const lookPt = pt.clone().addScaledVector(tangent, 5).addScaledVector(normal, car.laneOffset);
      car.mesh.lookAt(lookPt.x, 0.12, lookPt.z);

      for (const w of car.wheels) {
        w.children[0].rotation.x += delta * 12;
      }

      const d = car.mesh.position.distanceTo(playerPos);
      if (d < 5.2 && playerSpeed > 90) {
        playerCar.totalScore += 250;
      }
    }
  }
}
