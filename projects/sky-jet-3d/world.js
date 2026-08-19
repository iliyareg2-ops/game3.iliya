// world.js - Realistic Alpine Mountains, Runway, Mountain Highway, and Airport for Sky Jet 3D
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

export class WorldManager {
  constructor(scene) {
    this.scene = scene;
    this.terrainMesh = null;
    this.clouds = [];
    this.radarDish = null;
    this.windsock = null;
    this.runwayBounds = {
      minX: -40,
      maxX: 40,
      minZ: -600,
      maxZ: 600,
      height: 0.1,
    };

    this.initLighting();
    this.createTerrain();
    this.createRunway();
    this.createAirportBuildings();
    this.createHighway();
    this.createPineTrees();
    this.createClouds();
  }

  initLighting() {
    // Atmospheric Morning Fog
    this.scene.fog = new THREE.FogExp2(0xcfe2f3, 0.00038);

    // Ambient & Hemisphere Lights (Sky bounce + terrain warm bounce)
    const hemiLight = new THREE.HemisphereLight(0xbde0fe, 0x485635, 0.85);
    hemiLight.position.set(0, 500, 0);
    this.scene.add(hemiLight);

    // Warm Alpine Morning Sun
    this.sunLight = new THREE.DirectionalLight(0xfffaea, 1.7);
    this.sunLight.position.set(800, 900, 600);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 100;
    this.sunLight.shadow.camera.far = 3000;

    const d = 900;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Sun Visual Billboard
    const sunGeom = new THREE.SphereGeometry(60, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff3aa });
    const sunMesh = new THREE.Mesh(sunGeom, sunMat);
    sunMesh.position.copy(this.sunLight.position).multiplyScalar(2.5);
    this.scene.add(sunMesh);
  }

  // Multi-frequency noise approximation for mountain peaks & valleys
  getTerrainHeight(x, z) {
    // Runway and airport flat zone
    const distToRunwayX = Math.abs(x);
    const distToRunwayZ = Math.abs(z);
    
    // Flat airport plateau around (0,0)
    if (distToRunwayX < 140 && distToRunwayZ < 750) {
      return 0;
    }
    
    let blend = 1.0;
    if (distToRunwayX < 260 && distToRunwayZ < 850) {
      const fx = Math.max(0, (distToRunwayX - 140) / 120);
      const fz = Math.max(0, (distToRunwayZ - 750) / 100);
      blend = Math.max(fx, fz);
    }

    // Mountain ridges and dramatic peaks
    const nx1 = x * 0.0007;
    const nz1 = z * 0.0007;
    const nx2 = x * 0.002;
    const nz2 = z * 0.002;
    const nx3 = x * 0.006;
    const nz3 = z * 0.006;

    let h1 = Math.sin(nx1 * 2.1) * Math.cos(nz1 * 1.8) * 350;
    let h2 = (Math.sin(nx2 * 3.4 + 1.2) + Math.cos(nz2 * 2.9 + 0.8)) * 140;
    let h3 = (Math.sin(nx3 * 5.0) * Math.cos(nz3 * 4.2)) * 40;

    // Peak sharpening (ridge effect)
    let rawHeight = Math.abs(h1 + h2) * 1.25 + h3;
    
    // Valley smoothing
    if (rawHeight < 20) rawHeight = 20;

    return rawHeight * blend;
  }

  createTerrain() {
    const size = 6000;
    const segments = 160;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    const count = pos.count;

    // Color vertices based on height and slope
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();

    const snowColor = new THREE.Color(0xf5f8fc); // Alpine snow
    const rockColor = new THREE.Color(0x565c63); // Granite rock
    const grassColor = new THREE.Color(0x2f4c24); // Alpine valley grass
    const sandColor = new THREE.Color(0x736c57); // Foothills soil

    for (let i = 0; i < count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const vy = this.getTerrainHeight(vx, vz);
      pos.setY(i, vy);

      // Color mapping
      if (vy > 340) {
        // High snow peak
        color.copy(snowColor);
      } else if (vy > 210) {
        // Rock transitioning to snow
        const t = (vy - 210) / 130;
        color.lerpColors(rockColor, snowColor, t);
      } else if (vy > 70) {
        // Pine hills & rocky grass
        const t = (vy - 70) / 140;
        color.lerpColors(grassColor, rockColor, t);
      } else if (vy > 10) {
        // Lush green valley
        const t = (vy - 10) / 60;
        color.lerpColors(sandColor, grassColor, t);
      } else {
        // Airport flat grass
        color.copy(grassColor).multiplyScalar(0.9);
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: false,
    });

    this.terrainMesh = new THREE.Mesh(geometry, material);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);
  }

  createRunway() {
    const group = new THREE.Group();

    // Asphalt Main Strip
    const rwLength = 1200;
    const rwWidth = 52;
    const rwGeom = new THREE.PlaneGeometry(rwWidth, rwLength);
    rwGeom.rotateX(-Math.PI / 2);

    const rwMat = new THREE.MeshStandardMaterial({
      color: 0x1c1e22,
      roughness: 0.85,
      metalness: 0.1,
    });

    const runway = new THREE.Mesh(rwGeom, rwMat);
    runway.position.set(0, 0.2, 0);
    runway.receiveShadow = true;
    group.add(runway);

    // Runway Center Dashed Line
    const dashLength = 24;
    const dashWidth = 2.4;
    const dashGap = 16;
    const dashGeom = new THREE.PlaneGeometry(dashWidth, dashLength);
    dashGeom.rotateX(-Math.PI / 2);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    for (let z = -rwLength / 2 + 60; z < rwLength / 2 - 60; z += dashLength + dashGap) {
      const dash = new THREE.Mesh(dashGeom, dashMat);
      dash.position.set(0, 0.25, z);
      group.add(dash);
    }

    // Threshold Markings (Piano Keys at both ends)
    const keyWidth = 1.8;
    const keyLength = 36;
    const keyGeom = new THREE.PlaneGeometry(keyWidth, keyLength);
    keyGeom.rotateX(-Math.PI / 2);

    [-rwLength / 2 + 30, rwLength / 2 - 30].forEach((endZ) => {
      for (let x = -rwWidth / 2 + 6; x <= rwWidth / 2 - 6; x += 4.5) {
        const key = new THREE.Mesh(keyGeom, dashMat);
        key.position.set(x, 0.25, endZ);
        group.add(key);
      }
    });

    // Touchdown zone solid side stripes
    const sideStripeGeom = new THREE.PlaneGeometry(1.6, rwLength - 40);
    sideStripeGeom.rotateX(-Math.PI / 2);
    const leftStripe = new THREE.Mesh(sideStripeGeom, dashMat);
    leftStripe.position.set(-rwWidth / 2 + 3, 0.25, 0);
    const rightStripe = new THREE.Mesh(sideStripeGeom, dashMat);
    rightStripe.position.set(rwWidth / 2 - 3, 0.25, 0);
    group.add(leftStripe, rightStripe);

    // Glowing Runway Edge & Threshold Lights
    const lightGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.8, 8);
    const whiteGlowMat = new THREE.MeshBasicMaterial({ color: 0xeeffff });
    const greenGlowMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
    const redGlowMat = new THREE.MeshBasicMaterial({ color: 0xff2233 });

    for (let z = -rwLength / 2; z <= rwLength / 2; z += 40) {
      let mat = whiteGlowMat;
      if (z === -rwLength / 2) mat = greenGlowMat; // Takeoff threshold
      if (z === rwLength / 2) mat = redGlowMat; // End of runway

      const leftLight = new THREE.Mesh(lightGeom, mat);
      leftLight.position.set(-rwWidth / 2 - 2, 0.4, z);
      const rightLight = new THREE.Mesh(lightGeom, mat);
      rightLight.position.set(rwWidth / 2 + 2, 0.4, z);
      group.add(leftLight, rightLight);
    }

    this.scene.add(group);
  }

  createAirportBuildings() {
    const airportGroup = new THREE.Group();

    // Control Tower
    const towerBaseGeom = new THREE.CylinderGeometry(6, 9, 45, 12);
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.7 });
    const towerBase = new THREE.Mesh(towerBaseGeom, concreteMat);
    towerBase.position.set(80, 22.5, -200);
    towerBase.castShadow = true;
    towerBase.receiveShadow = true;
    airportGroup.add(towerBase);

    // Control Tower Observation Deck (Glass cab)
    const cabGeom = new THREE.CylinderGeometry(11, 7, 10, 12);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x113355,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    const cab = new THREE.Mesh(cabGeom, glassMat);
    cab.position.set(80, 50, -200);
    cab.castShadow = true;
    airportGroup.add(cab);

    // Rotating Radar Dish on top
    const dishGroup = new THREE.Group();
    const dishGeom = new THREE.SphereGeometry(4, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xff3300, roughness: 0.4 });
    const dish = new THREE.Mesh(dishGeom, dishMat);
    dish.rotation.x = Math.PI / 3;
    dishGroup.add(dish);
    dishGroup.position.set(80, 56, -200);
    airportGroup.add(dishGroup);
    this.radarDish = dishGroup;

    // Aircraft Hangars
    const hangarGeom = new THREE.CylinderGeometry(28, 28, 70, 16, 1, false, 0, Math.PI);
    hangarGeom.rotateZ(Math.PI / 2);
    const hangarMat = new THREE.MeshStandardMaterial({
      color: 0x485260,
      metalness: 0.7,
      roughness: 0.4,
    });

    const hangar1 = new THREE.Mesh(hangarGeom, hangarMat);
    hangar1.position.set(95, 0, -50);
    hangar1.castShadow = true;
    hangar1.receiveShadow = true;

    const hangar2 = new THREE.Mesh(hangarGeom, hangarMat);
    hangar2.position.set(95, 0, 80);
    hangar2.castShadow = true;
    hangar2.receiveShadow = true;

    airportGroup.add(hangar1, hangar2);

    // Windsock
    const poleGeom = new THREE.CylinderGeometry(0.3, 0.3, 14, 8);
    const pole = new THREE.Mesh(poleGeom, concreteMat);
    pole.position.set(-50, 7, -350);
    pole.castShadow = true;
    airportGroup.add(pole);

    const sockGeom = new THREE.ConeGeometry(1.8, 6, 8, 1, true);
    sockGeom.rotateZ(-Math.PI / 2);
    const sockMat = new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.6 });
    this.windsock = new THREE.Mesh(sockGeom, sockMat);
    this.windsock.position.set(-50, 14, -350);
    airportGroup.add(this.windsock);

    this.scene.add(airportGroup);
  }

  createHighway() {
    // Winding Alpine Road snaking around the valley and mountains
    const points = [];
    for (let t = -1200; t <= 1200; t += 40) {
      const x = 160 + Math.sin(t * 0.003) * 220 + Math.cos(t * 0.008) * 80;
      const z = t;
      const y = Math.max(0.3, this.getTerrainHeight(x, z) + 0.5);
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const roadWidth = 14;
    const roadGeom = new THREE.TubeGeometry(curve, 180, roadWidth / 2, 4, false);

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x24282e,
      roughness: 0.9,
      metalness: 0.1,
    });

    const road = new THREE.Mesh(roadGeom, roadMat);
    road.scale.set(1, 0.1, 1);
    road.receiveShadow = true;
    this.scene.add(road);
  }

  createPineTrees() {
    // InstancedMesh for optimized alpine forest (Trunks and Foliage)
    const treeCount = 650;
    
    // Pine Foliage geometry (Cone)
    const coneGeom = new THREE.ConeGeometry(5.5, 16, 6);
    coneGeom.translate(0, 10, 0);
    const pineMat = new THREE.MeshStandardMaterial({
      color: 0x1f3c1d,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true,
    });
    const pineInstanced = new THREE.InstancedMesh(coneGeom, pineMat, treeCount);
    pineInstanced.castShadow = true;
    pineInstanced.receiveShadow = true;

    // Pine Trunk geometry (Cylinder)
    const trunkGeom = new THREE.CylinderGeometry(0.8, 1.2, 4, 5);
    trunkGeom.translate(0, 2, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.95 });
    const trunkInstanced = new THREE.InstancedMesh(trunkGeom, trunkMat, treeCount);
    trunkInstanced.castShadow = true;

    const dummy = new THREE.Object3D();
    let placed = 0;

    for (let i = 0; i < treeCount * 3 && placed < treeCount; i++) {
      const radius = 250 + Math.random() * 1800;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Keep runway clear
      if (Math.abs(x) < 70 && Math.abs(z) < 680) continue;

      const y = this.getTerrainHeight(x, z);
      // Place only on green valleys/hills (not high snowy peaks)
      if (y > 240) continue;

      const scale = 0.7 + Math.random() * 0.8;
      dummy.position.set(x, y, z);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.updateMatrix();

      pineInstanced.setMatrixAt(placed, dummy.matrix);
      trunkInstanced.setMatrixAt(placed, dummy.matrix);
      placed++;
    }

    pineInstanced.instanceMatrix.needsUpdate = true;
    trunkInstanced.instanceMatrix.needsUpdate = true;

    this.scene.add(pineInstanced);
    this.scene.add(trunkInstanced);
  }

  createClouds() {
    // Volumetric fluffy cloud clusters
    const cloudGeom = new THREE.DodecahedronGeometry(1, 1);
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.05,
      transparent: true,
      opacity: 0.82,
      flatShading: true,
    });

    const cloudClusterCount = 45;
    for (let i = 0; i < cloudClusterCount; i++) {
      const cluster = new THREE.Group();
      const puffCount = 6 + Math.floor(Math.random() * 8);

      for (let j = 0; j < puffCount; j++) {
        const puff = new THREE.Mesh(cloudGeom, cloudMat);
        const scale = 25 + Math.random() * 45;
        puff.scale.set(scale, scale * 0.65, scale);
        puff.position.set(
          (Math.random() - 0.5) * 80,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 80
        );
        cluster.add(puff);
      }

      const x = (Math.random() - 0.5) * 4500;
      const y = 350 + Math.random() * 450; // Cloud altitude
      const z = (Math.random() - 0.5) * 4500;
      cluster.position.set(x, y, z);

      this.clouds.push({
        group: cluster,
        speedX: 1.5 + Math.random() * 2.0,
      });

      this.scene.add(cluster);
    }
  }

  update(delta) {
    // Rotate radar antenna
    if (this.radarDish) {
      this.radarDish.rotation.y += delta * 1.2;
    }

    // Sway windsock
    if (this.windsock) {
      this.windsock.rotation.y = Math.sin(Date.now() * 0.002) * 0.2 - Math.PI / 2;
    }

    // Drift clouds across sky
    for (const cloud of this.clouds) {
      cloud.group.position.x += cloud.speedX * delta * 5;
      if (cloud.group.position.x > 2500) {
        cloud.group.position.x = -2500;
      }
    }
  }
}
