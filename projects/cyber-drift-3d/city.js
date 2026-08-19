// city.js - Cyberpunk Night Track, Wet Asphalt, Skyscraper Neon Skyline, Stunt Ramps, Police Interceptor & Traffic
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { cyberAudio } from "./audio.js";

export class CityTrackManager {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.ramps = [];
    this.trafficCars = [];
    this.policeCar = null;
    this.policeActive = false;
    this.policeSirens = [];

    this.initLighting();
    this.buildTrackAndGround();
    this.buildSkyscraperSkyline();
    this.buildRampsAndBarriers();
    this.buildTraffic();
    this.buildPoliceInterceptor();
  }

  initLighting() {
    this.scene.fog = new THREE.FogExp2(0x060914, 0.0012);

    // Night Sky Ambient & Hemisphere
    const hemiLight = new THREE.HemisphereLight(0x1a2c4e, 0x050811, 0.85);
    hemiLight.position.set(0, 500, 0);
    this.scene.add(hemiLight);

    // Cyberpunk Moon Light
    this.moonLight = new THREE.DirectionalLight(0x7da4d9, 1.4);
    this.moonLight.position.set(400, 700, 300);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.width = 2048;
    this.moonLight.shadow.mapSize.height = 2048;
    this.moonLight.shadow.camera.near = 50;
    this.moonLight.shadow.camera.far = 2500;
    const d = 500;
    this.moonLight.shadow.camera.left = -d;
    this.moonLight.shadow.camera.right = d;
    this.moonLight.shadow.camera.top = d;
    this.moonLight.shadow.camera.bottom = -d;
    this.scene.add(this.moonLight);
  }

  buildTrackAndGround() {
    const groundGroup = new THREE.Group();

    // 1. Wet Reflective Asphalt Ground Plane (2000m x 2000m)
    const groundGeom = new THREE.PlaneGeometry(2200, 2200);
    groundGeom.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0c0f16,
      roughness: 0.22,
      metalness: 0.85,
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.receiveShadow = true;
    groundGroup.add(ground);

    // 2. Race Track Circuit Ribbon (Grand 8-loop with Hairpins, Straights & Flyovers)
    const trackPoints = [
      new THREE.Vector3(0, 0.1, 0), // Start Line
      new THREE.Vector3(0, 0.1, 280), // Main Straight
      new THREE.Vector3(80, 0.1, 380), // Hairpin 1 Entrance
      new THREE.Vector3(220, 0.1, 360),
      new THREE.Vector3(260, 0.1, 200), // Straight 2
      new THREE.Vector3(220, 0.1, -80),
      new THREE.Vector3(120, 0.1, -220), // Drift Chicane
      new THREE.Vector3(180, 0.1, -380),
      new THREE.Vector3(0, 0.1, -450), // Hairpin 2
      new THREE.Vector3(-180, 0.1, -380),
      new THREE.Vector3(-240, 0.1, -180),
      new THREE.Vector3(-120, 0.1, 60), // High-speed S-Curve
      new THREE.Vector3(-220, 0.1, 240),
      new THREE.Vector3(-120, 0.1, 380),
      new THREE.Vector3(0, 0.1, 280), // Return to main straight
    ];

    const curve = new THREE.CatmullRomCurve3(trackPoints, true);
    const trackWidth = 32;
    const trackGeom = new THREE.TubeGeometry(curve, 240, trackWidth / 2, 4, true);

    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x161b24,
      roughness: 0.35,
      metalness: 0.75,
    });
    const trackMesh = new THREE.Mesh(trackGeom, trackMat);
    trackMesh.scale.set(1, 0.05, 1);
    trackMesh.receiveShadow = true;
    groundGroup.add(trackMesh);

    // Track Center Dashed Neon Line
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const points = curve.getPoints(120);
    for (let i = 0; i < points.length; i += 2) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      const dist = p1.distanceTo(p2);
      const dashGeom = new THREE.BoxGeometry(1.2, 0.06, dist * 0.7);
      const dash = new THREE.Mesh(dashGeom, lineMat);
      dash.position.set((p1.x + p2.x) / 2, 0.15, (p1.z + p2.z) / 2);
      dash.lookAt(p2.x, 0.15, p2.z);
      groundGroup.add(dash);
    }

    // Start / Finish Line Grid Gantry
    const gantryGeom = new THREE.BoxGeometry(trackWidth + 6, 2.5, 3.0);
    const gantryMat = new THREE.MeshStandardMaterial({ color: 0x222936, metalness: 0.9 });
    const gantry = new THREE.Mesh(gantryGeom, gantryMat);
    gantry.position.set(0, 11, 0);

    const pillar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 12, 8), gantryMat);
    pillar1.position.set(-trackWidth / 2 - 2, 6, 0);
    const pillar2 = pillar1.clone();
    pillar2.position.x = trackWidth / 2 + 2;

    const startSignGeom = new THREE.PlaneGeometry(24, 3.5);
    const startSignMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
    const startSign = new THREE.Mesh(startSignGeom, startSignMat);
    startSign.position.set(0, 11, 0.1);

    groundGroup.add(gantry, pillar1, pillar2, startSign);

    this.scene.add(groundGroup);
  }

  buildSkyscraperSkyline() {
    const cityGroup = new THREE.Group();

    // 1. Facade Textures
    const blueCanvas = document.createElement("canvas");
    blueCanvas.width = 512;
    blueCanvas.height = 1024;
    const bCtx = blueCanvas.getContext("2d");
    bCtx.fillStyle = "#0c131f";
    bCtx.fillRect(0, 0, 512, 1024);

    for (let y = 14; y < 1024; y += 28) {
      bCtx.fillStyle = "#1e2c3f";
      bCtx.fillRect(0, y, 512, 4);
      for (let x = 12; x < 512; x += 26) {
        const isLit = Math.random() > 0.35;
        bCtx.fillStyle = isLit ? (Math.random() > 0.6 ? "#ffd166" : "#00f0ff") : "#060a12";
        bCtx.fillRect(x, y + 5, 18, 18);
      }
    }
    const blueTex = new THREE.CanvasTexture(blueCanvas);
    blueTex.wrapS = THREE.RepeatWrapping;
    blueTex.wrapT = THREE.RepeatWrapping;

    const bldgMat = new THREE.MeshStandardMaterial({
      map: blueTex,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0x002b44,
      emissiveIntensity: 0.5,
    });

    const neonMat1 = new THREE.MeshBasicMaterial({ color: 0xff007f });
    const neonMat2 = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const neonMat3 = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    // Grid of skyscrapers surrounding the circuit
    for (let x = -600; x <= 600; x += 120) {
      for (let z = -600; z <= 600; z += 120) {
        // Keep track corridor clear
        if (Math.abs(x) < 50 && Math.abs(z) < 320) continue;
        if (Math.abs(x - 220) < 60 && Math.abs(z - 280) < 140) continue;
        if (Math.abs(x + 180) < 60 && Math.abs(z + 280) < 140) continue;

        const width = 45 + Math.random() * 35;
        const depth = 45 + Math.random() * 35;
        const height = 90 + Math.random() * 260; // 90m to 350m tall

        const bldgGeom = new THREE.BoxGeometry(width, height, depth);
        const bldg = new THREE.Mesh(bldgGeom, bldgMat);
        bldg.position.set(x, height / 2, z);
        bldg.castShadow = true;
        bldg.receiveShadow = true;
        cityGroup.add(bldg);

        // Store building collider
        this.colliders.push({
          minX: x - width / 2,
          maxX: x + width / 2,
          minZ: z - depth / 2,
          maxZ: z + depth / 2,
        });

        // Add Neon Billboard or Rooftop Spire
        if (height > 180 && Math.random() > 0.4) {
          const boardGeom = new THREE.PlaneGeometry(36, 18);
          const boardMat = Math.random() > 0.5 ? neonMat1 : neonMat2;
          const board = new THREE.Mesh(boardGeom, boardMat);
          board.position.set(x, height * 0.65, z + depth / 2 + 0.4);
          cityGroup.add(board);
        }
      }
    }

    this.scene.add(cityGroup);
  }

  buildRampsAndBarriers() {
    const rampGroup = new THREE.Group();

    // Stunt Jump Ramp 1 (Over the river canal)
    const rampGeom = new THREE.BoxGeometry(22, 5, 28);
    rampGeom.rotateX(0.22);
    const rampMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.8, roughness: 0.3 });
    const ramp1 = new THREE.Mesh(rampGeom, rampMat);
    ramp1.position.set(240, 1.8, 40);
    ramp1.castShadow = true;
    rampGroup.add(ramp1);

    this.ramps.push({
      x: 240,
      z: 40,
      radius: 18,
      boostSpeed: 45,
    });

    // Stunt Jump Ramp 2
    const ramp2 = new THREE.Mesh(rampGeom, rampMat);
    ramp2.position.set(-180, 1.8, -260);
    ramp2.rotation.y = Math.PI * 0.8;
    rampGroup.add(ramp2);

    this.ramps.push({
      x: -180,
      z: -260,
      radius: 18,
      boostSpeed: 45,
    });

    this.scene.add(rampGroup);
  }

  buildTraffic() {
    // 8 Civil Traffic Cars cruising along track sectors
    const carMat1 = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
    const carMat2 = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });
    const carMat3 = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 });
    const materials = [carMat1, carMat2, carMat3];

    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 1.2, 7.0),
        materials[i % materials.length]
      );
      body.position.y = 0.6;
      g.add(body);

      // Headlights & Taillights
      const hl = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl.position.set(0, 0.6, 3.51);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xff0022 }));
      tl.position.set(0, 0.6, -3.51);
      g.add(hl, tl);

      g.position.set(
        (Math.random() - 0.5) * 350,
        0.4,
        (Math.random() - 0.5) * 350
      );

      this.scene.add(g);
      this.trafficCars.push({
        mesh: g,
        speed: 55 + Math.random() * 40,
        dir: Math.random() > 0.5 ? 1 : -1,
      });
    }
  }

  buildPoliceInterceptor() {
    const policeGroup = new THREE.Group();

    // Black & White Pursuit Cruiser Body
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.2, metalness: 0.8 });
    const whiteDoorMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 9.2), bodyMat);
    chassis.position.y = 0.5;
    policeGroup.add(chassis);

    const doors = new THREE.Mesh(new THREE.BoxGeometry(4.45, 0.6, 3.5), whiteDoorMat);
    doors.position.set(0, 0.5, 0);
    policeGroup.add(doors);

    // Flashing Emergency Siren Lightbar
    const lightbarGeom = new THREE.BoxGeometry(2.4, 0.25, 0.6);
    this.sirenBlueMat = new THREE.MeshBasicMaterial({ color: 0x0066ff });
    this.sirenRedMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });

    const blueLight = new THREE.Mesh(lightbarGeom, this.sirenBlueMat);
    blueLight.position.set(0.7, 1.5, -0.4);
    const redLight = new THREE.Mesh(lightbarGeom, this.sirenRedMat);
    redLight.position.set(-0.7, 1.5, -0.4);

    policeGroup.add(blueLight, redLight);
    this.policeSirens.push(blueLight, redLight);

    policeGroup.position.set(0, 0.45, -280);
    policeGroup.visible = false;
    this.scene.add(policeGroup);
    this.policeCar = policeGroup;
  }

  handleCarTrackCollision(car) {
    const px = car.mesh.position.x;
    const pz = car.mesh.position.z;

    // 1. Skyscraper Building Collisions
    for (const b of this.colliders) {
      if (px > b.minX - 2.2 && px < b.maxX + 2.2 && pz > b.minZ - 2.2 && pz < b.maxZ + 2.2) {
        // Bounce off building
        car.speed *= -0.45;
        cyberAudio.playCrash();
        const pushDir = new THREE.Vector3(px - (b.minX + b.maxX) / 2, 0, pz - (b.minZ + b.maxZ) / 2).normalize();
        car.mesh.position.addScaledVector(pushDir, 2.5);
        return;
      }
    }

    // 2. Stunt Jump Ramps
    for (const ramp of this.ramps) {
      const d = Math.hypot(px - ramp.x, pz - ramp.z);
      if (d < ramp.radius && car.speed > 80) {
        car.mesh.position.y = Math.min(22, car.mesh.position.y + 4.5);
      }
    }
  }

  update(delta, playerCar) {
    // 1. Move Civilian Traffic
    for (const car of this.trafficCars) {
      car.mesh.position.z += car.speed * car.dir * delta * 0.3;
      if (car.mesh.position.z > 450) car.mesh.position.z = -450;
      if (car.mesh.position.z < -450) car.mesh.position.z = 450;

      // Near miss bonus check
      const d = car.mesh.position.distanceTo(playerCar.mesh.position);
      if (d < 5.5 && Math.abs(playerCar.speed) > 90) {
        playerCar.totalScore += 250;
        playerCar.addBoost?.(15);
      }
    }

    // 2. Police Pursuit AI Logic
    const playerSpeed = Math.abs(playerCar.speed);
    if (playerCar.totalScore > 1500 || playerSpeed > 170) {
      this.policeActive = true;
      this.policeCar.visible = true;
    }

    if (this.policeActive && this.policeCar) {
      // Police pursues player car
      const targetPos = playerCar.mesh.position;
      const policeDir = new THREE.Vector3().subVectors(targetPos, this.policeCar.position).normalize();

      const policeSpeed = Math.min(playerSpeed * 0.95 + 20, 240);
      this.policeCar.position.addScaledVector(policeDir, (policeSpeed * 1000 * delta) / 3600);
      this.policeCar.lookAt(targetPos.x, 0.45, targetPos.z);

      // Flash Police Siren Lightbars
      const isBlue = Math.sin(Date.now() * 0.015) > 0;
      this.sirenBlueMat.color.setHex(isBlue ? 0x00f0ff : 0x001144);
      this.sirenRedMat.color.setHex(!isBlue ? 0xff0033 : 0x330008);
    }
  }
}
