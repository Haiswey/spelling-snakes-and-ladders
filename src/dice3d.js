/* ==========================================================================
   Real 3-D dice (three.js, MIT licence, embedded). Rounded cube, glossy material, lit from above,
   soft shadow that follows the bounce. Falls back to a flat 2-D dice if WebGL is not available.
   ========================================================================== */
const Dice3D = (() => {
  const SIZE = 1.5, R = 0.24;
  // opposite faces add up to 7;  BoxGeometry face order is +x, -x, +y, -y, +z, -z
  const FACE_VALUE = [3, 4, 1, 6, 2, 5];
  const NORMAL = {1:[0,1,0], 6:[0,-1,0], 3:[1,0,0], 4:[-1,0,0], 2:[0,0,1], 5:[0,0,-1]};
  const PIPS = {1:[[.5,.5]], 2:[[.28,.28],[.72,.72]], 3:[[.28,.28],[.5,.5],[.72,.72]], 4:[[.28,.28],[.72,.28],[.28,.72],[.72,.72]],
                5:[[.28,.28],[.72,.28],[.5,.5],[.28,.72],[.72,.72]], 6:[[.28,.26],[.72,.26],[.28,.5],[.72,.5],[.28,.74],[.72,.74]]};
  let renderer = null, scene, camera, die, shadow, ok = false, canvas2d = null, shown = 1;

  function faceTexture(n){
    const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 256, 256); g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#e9eefb");
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    for(const [px, py] of PIPS[n]){
      const cx = px*256, cy = py*256, r = n === 1 ? 34 : 24;
      const p = x.createRadialGradient(cx-r*.3, cy-r*.35, r*.1, cx, cy, r);
      if(n === 1){ p.addColorStop(0, "#ff7b8a"); p.addColorStop(1, "#d92f45"); } else { p.addColorStop(0, "#4b5bb0"); p.addColorStop(1, "#1b2455"); }
      x.fillStyle = p; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
    }
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
    if("colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function roundedBox(size, r, seg){
    const g = new THREE.BoxGeometry(size, size, size, seg, seg, seg);
    const p = g.attributes.position, n = g.attributes.normal, h = size/2 - r;
    const v = new THREE.Vector3(), inner = new THREE.Vector3(), d = new THREE.Vector3(), cl = a => Math.max(-h, Math.min(h, a));
    for(let i = 0; i < p.count; i++){
      v.fromBufferAttribute(p, i); inner.set(cl(v.x), cl(v.y), cl(v.z));
      d.copy(v).sub(inner).normalize(); v.copy(inner).addScaledVector(d, r);
      p.setXYZ(i, v.x, v.y, v.z); n.setXYZ(i, d.x, d.y, d.z);
    }
    return g;
  }

  function shadowTexture(){
    const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d");
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, "rgba(31,42,92,.55)"); g.addColorStop(1, "rgba(31,42,92,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  }

  function init(canvas){
    try{
      renderer = new THREE.WebGLRenderer({canvas, alpha:true, antialias:true, preserveDrawingBuffer:true});
    }catch(e){ renderer = null; }
    if(!renderer){ canvas2d = canvas; draw2d(1); return false; }
    renderer.setPixelRatio(1); renderer.setSize(320, 320, false);
    if("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(27, 1, .1, 60); camera.position.set(0, 7.0, 4.6); camera.lookAt(0, .95, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc4d6ff, 1.05));
    const key = new THREE.DirectionalLight(0xffffff, 1.25); key.position.set(3.5, 7, 4.5); scene.add(key);
    const fill = new THREE.DirectionalLight(0xbcd2ff, .45); fill.position.set(-4, 2.5, -2); scene.add(fill);
    const mats = FACE_VALUE.map(v => new THREE.MeshPhysicalMaterial({map:faceTexture(v), roughness:.32, clearcoat:.8, clearcoatRoughness:.18}));
    die = new THREE.Mesh(roundedBox(SIZE, R, 12), mats); scene.add(die);
    shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({map:shadowTexture(), transparent:true, depthWrite:false}));
    shadow.rotation.x = -Math.PI/2; shadow.position.y = .01; scene.add(shadow);
    pose(1, .5, 0);
    ok = true; return true;
  }

  // put value `v` on top, turned by `yaw`, lifted by `h`
  function pose(v, yaw, h, spinAxis, spinAngle){
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...NORMAL[v]), new THREE.Vector3(0, 1, 0));
    q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
    if(spinAxis) q.premultiply(new THREE.Quaternion().setFromAxisAngle(spinAxis, spinAngle));
    die.quaternion.copy(q);
    die.position.set(0, SIZE/2 + h, 0);
    const k = 1/(1 + h*.55); shadow.scale.set(k, k, 1); shadow.material.opacity = .6*k;
    renderer.render(scene, camera);
  }

  function draw2d(v){                         // fallback when WebGL is missing
    const c = canvas2d, x = c.getContext("2d"); c.width = c.height = 320; x.clearRect(0, 0, 320, 320);
    x.fillStyle = "#fff"; x.strokeStyle = "#c6d0e8"; x.lineWidth = 6; x.beginPath(); x.roundRect(60, 60, 200, 200, 34); x.fill(); x.stroke();
    for(const [px, py] of PIPS[v]){ x.fillStyle = v === 1 ? "#d92f45" : "#1b2455"; x.beginPath(); x.arc(60 + px*200, 60 + py*200, v === 1 ? 24 : 17, 0, 7); x.fill(); }
  }

  const ease = t => 1 - Math.pow(1 - t, 3);
  function roll(v, ms = 1700){
    shown = v;
    if(!ok) return new Promise(res => { draw2d(1 + Math.floor(Math.random()*6)); setTimeout(() => { draw2d(v); res(); }, ms); });
    const axis = new THREE.Vector3(Math.random()-.5, Math.random()*.4+.3, Math.random()-.5).normalize();
    const yaw = (Math.random()-.5) * 1.4, turns = 2.5 + Math.random()*1.5;
    return new Promise(res => {
      const t0 = performance.now();
      const step = now => {
        const t = Math.min(1, (now - t0)/ms), e = ease(t);
        const h = Math.pow(1 - t, 2) * 1.5 * Math.abs(Math.sin(t*Math.PI*3.2));          // three bounces that fade out
        pose(v, yaw, t === 1 ? 0 : h, axis, (1 - e) * turns * Math.PI*2);
        if(t < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }

  // still picture of the dice (used for the logo and buttons), top face 3, front 2, side 1
  function icon(){
    if(!ok) return null;
    renderer.setSize(192, 192, false); renderer.render(scene, camera);
    die.quaternion.setFromEuler(new THREE.Euler(0, .62, 0)); die.position.set(0, SIZE/2, 0);
    camera.position.set(0, 3.5, 4.8); camera.lookAt(0, .68, 0); shadow.visible = false;
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL("image/png");
    camera.position.set(0, 7.0, 4.6); camera.lookAt(0, .95, 0); shadow.visible = true; renderer.setSize(320, 320, false);
    pose(shown, .5, 0);
    return url;
  }
  return { init, roll, icon };
})();
