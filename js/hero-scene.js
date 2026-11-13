/* ============================================================
   hero-scene.js — 原创重建的首屏场景（天空/云/树枝/山雀/Time-of-day）
   构图与色板依据像素取样证据（analysis/03-hero-scene.md + 像素网格）：
   - 天空近乎纯平 #7799cc（SOURCE: 像素网格 79c/79d）
   - 云为奶油(#eeddaa)/粉紫(#ccb9bb/#b9a9b4)软块，环绕四周边缘，
     中央文字区（shelters）保持净空（SOURCE: 像素网格）
   - 2026-11-13 重新查看参考页：Noon 右上存在清晰的亏凸月。
   引擎与着色器为原创；月面采用 NASA LRO 数据，树皮使用参考页材质。
   API: createFableHero(el, { seed, classes, shelters }) -> { setShelters, dispose }
   ============================================================ */
(function (global) {
  'use strict';
  const ASSET_BASE = new URL('../assets/', document.currentScript.src);

  // ---------- look presets（证据见 replay-manifest.json；标 GUESS 者为拟合） ----------
  const LOOKS = {
    day: {
      zenith: [0.449, 0.599, 0.815], horizon: [0.449, 0.601, 0.825],
      cloud: [0.962, 0.880, 0.735], cloudWarm: [0.990, 0.928, 0.780],
      cloudPink: [0.865, 0.740, 0.800], cloudShade: [0.730, 0.640, 0.755],
      star: 0.0, moon: 0.86, sun: 0.0, night: 0.0,
    },
    night: {
      zenith: [0.020, 0.050, 0.130], horizon: [0.075, 0.140, 0.260],  // GUESS（#030818/#182a4a 系）
      cloud: [0.16, 0.19, 0.27], cloudWarm: [0.24, 0.27, 0.36],
      cloudPink: [0.22, 0.22, 0.31], cloudShade: [0.10, 0.12, 0.19],
      star: 1.0, moon: 1.0, sun: 0.0, night: 1.0,
    },
    morning: {
      zenith: [0.470, 0.590, 0.735], horizon: [0.745, 0.655, 0.620],
      cloud: [1.00, 0.94, 0.86], cloudWarm: [1.00, 0.90, 0.78],
      cloudPink: [0.94, 0.80, 0.75], cloudShade: [0.72, 0.66, 0.68],
      star: 0.0, moon: 0.60, sun: 0.7, night: 0.0,
    },
  };

  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  // Fullscreen painterly sky — original GLSL
  const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uZenith, uHorizon, uCloudCol, uCloudWarm, uCloudPink, uCloudShade;
uniform float uStar, uMoon, uSun, uNight, uBranchDip, uBirdOn;
uniform vec3 uBird;
uniform vec2 uBirdAnim;
uniform sampler2D uMoonMap, uCloudVolume, uBarkMap, uBarkNormal;

float hash12(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x),
             mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 rot = mat2(0.80,-0.60,0.60,0.80);
  for(int i=0;i<5;i++) {
    v += a*noise(p); p = rot*p*2.07+vec2(12.1,8.3); a *= 0.5;
  }
  return v;
}
float ellipse(vec2 p, vec2 center, vec2 radius) {
  return 1.0-length((p-center)/radius);
}
// Banks are composed independently of noise, so clouds stay at the frame edges.
// Fine turbulence carves wisps instead of turning the entire bank into fog.

float volumeNoise(vec3 p) {
  vec3 q = fract(p)*63.0;
  float z = floor(q.z), z1 = min(z+1.0,63.0);
  vec2 a = vec2(mod(z,8.0),floor(z/8.0))*64.0+q.xy+0.5;
  vec2 b = vec2(mod(z1,8.0),floor(z1/8.0))*64.0+q.xy+0.5;
  return mix(texture2D(uCloudVolume,a/512.0).r,texture2D(uCloudVolume,b/512.0).r,fract(q.z));
}
float cloudNoise(vec3 p) {
  return volumeNoise(p)*0.62+volumeNoise(p*2.03+0.17)*0.26+volumeNoise(p*4.11+0.41)*0.12;
}
float cloudShape(vec2 p) {
  float shape = ellipse(p,vec2(-0.04,0.00),vec2(0.34,0.235));
  shape = max(shape,ellipse(p,vec2(0.055,0.12),vec2(0.235,0.145)));
  shape = max(shape,ellipse(p,vec2(0.005,0.47),vec2(0.17,0.14)));
  shape = max(shape,ellipse(p,vec2(-0.025,0.70),vec2(0.095,0.125)));
  shape = max(shape,ellipse(p,vec2(0.405,1.03),vec2(0.235,0.16)));
  shape = max(shape,ellipse(p,vec2(-0.035,1.015),vec2(0.13,0.09)));
  shape = max(shape,ellipse(p,vec2(1.06,0.14),vec2(0.295,0.33)));
  shape = max(shape,ellipse(p,vec2(0.88,0.29),vec2(0.11,0.105)));
  shape = max(shape,ellipse(p,vec2(0.49,-0.085),vec2(0.53,0.14)));
  return shape;
}
vec4 paintClouds(vec2 uv) {
  vec2 p = uv;
  float edgeNoise = fbm(p*vec2(12.0,24.0)+vec2(7.2,12.5));
  float fine = fbm(p*vec2(35.0,48.0)+vec2(13.7,2.9));
  float shape = cloudShape(p)+(edgeNoise-0.48)*1.65+(fine-0.48)*0.25;
  float brokenLayers = smoothstep(0.27,0.59,edgeNoise+fine*0.10);
  if(shape < -0.35) return vec4(0.0);
  vec3 color = vec3(0.0);
  float transmission = 1.0;
  vec3 shade = mix(uCloudShade,uCloudPink,0.38);
  vec3 cream = mix(uCloudCol,uCloudWarm,0.70);
  vec3 wind = vec3(sin(uTime*0.010)*0.028,uTime*0.00012,0.0);
  // Front-to-back integration: density, self-shadowing and soft optical edges.
  for(int i=0;i<8;i++) {
    float z = (float(i)+0.5)/8.0;
    vec3 samplePoint = vec3(p*vec2(3.8,2.9),z*0.28)+vec3(0.14,0.23,0.35)+wind;
    float n = cloudNoise(samplePoint);
    float field = shape-0.20+(n-0.50)*1.55-pow((z-0.48)*1.50,2.0);
    float density = max(0.0,field)*2.4*brokenLayers;
    float alpha = 1.0-exp(-density*0.70);
    float neighbor = volumeNoise(samplePoint+vec3(-0.012,0.024,-0.018));
    float light = clamp(0.58+(n-neighbor)*1.6-density*0.13+(0.5-z)*0.20,0.0,1.0);
    vec3 scattering = mix(shade,cream,light);
    color += transmission*alpha*scattering;
    transmission *= 1.0-alpha;
  }
  return vec4(color,1.0-transmission);
}
float segment(vec2 p,vec2 a,vec2 b,float ra,float rb) {
  vec2 v = b-a;
  float h = clamp(dot(p-a,v)/dot(v,v),0.0,1.0);
  return length(p-a-h*v)-mix(ra,rb,h);
}

vec4 curveStroke(vec2 p,vec2 a,vec2 control,vec2 b,float ra,float rb,float depth) {
  vec4 nearest = vec4(10.0,0.0,0.0,depth);
  vec2 previous = a;
  for(int i=1;i<=8;i++) {
    float t = float(i)/8.0;
    vec2 next = mix(mix(a,control,t),mix(control,b,t),t);
    vec2 tangent = next-previous;
    float h = clamp(dot(p-previous,tangent)/dot(tangent,tangent),0.0,1.0);
    float progress = (float(i)-1.0+h)/8.0;
    float radius = mix(ra,rb,pow(progress,0.78));
    vec2 delta = p-mix(previous,next,h);
    float distance = length(delta)-radius;
    if(distance<nearest.x) {
      vec2 normal = normalize(vec2(-tangent.y,tangent.x));
      nearest = vec4(distance,progress,dot(delta,normal)/max(radius,0.001),depth);
    }
    previous = next;
  }
  return nearest;
}
vec4 chooseStroke(vec4 a,vec4 b) { return a.x<b.x ? a:b; }
vec4 branchSurface(vec2 p) {
  p.x -= sin(uTime*0.44)*0.0015*(1.0-p.x);
  p.y += uBranchDip;
  vec4 hit = curveStroke(p,vec2(1.10,-0.09),vec2(0.98,0.15),vec2(0.78,0.34),0.048,0.0025,0.92);
  hit = chooseStroke(hit,curveStroke(p,vec2(0.98,0.09),vec2(0.82,0.16),vec2(0.68,0.205),0.018,0.0012,0.63));
  hit = chooseStroke(hit,curveStroke(p,vec2(0.94,0.18),vec2(0.97,0.27),vec2(0.96,0.37),0.009,0.0010,0.71));
  hit = chooseStroke(hit,curveStroke(p,vec2(0.86,0.26),vec2(0.835,0.34),vec2(0.73,0.38),0.006,0.0005,0.46));
  hit = chooseStroke(hit,curveStroke(p,vec2(1.01,0.04),vec2(0.88,0.055),vec2(0.79,0.045),0.013,0.0007,0.88));
  return hit;
}
vec3 paintBranch(vec3 sky,vec2 uv) {
  if(uv.x<0.62 || uv.y>0.43) return sky;
  vec4 hit = branchSurface(uv);
  float blur = mix(0.004,0.028,hit.w);
  float mask = 1.0-smoothstep(-blur,blur,hit.x);
  if(mask<0.002) return sky;
  // Cylindrical UVs follow each curved branch; normal map supplies bark relief.
  float across = clamp(hit.z,-1.0,1.0);
  vec2 texcoord = vec2(hit.y*2.7+hit.w*0.31,asin(across)/3.14159+0.5);
  vec3 bark = texture2D(uBarkMap,fract(texcoord),hit.w*3.5).rgb;
  vec3 relief = texture2D(uBarkNormal,fract(texcoord),hit.w*3.5).rgb*2.0-1.0;
  vec3 surfaceNormal = normalize(vec3(across,0.20,sqrt(max(0.0,1.0-across*across)))+relief*0.32);
  float light = 0.56+0.44*max(0.0,dot(surfaceNormal,normalize(vec3(-0.55,0.58,0.66))));
  float barkValue = dot(bark,vec3(0.299,0.587,0.114));
  vec3 wood = mix(bark,vec3(barkValue)*vec3(0.76,0.87,1.05),0.72)*light;
  wood = mix(wood,uZenith,0.22*(1.0-uNight));
  wood = mix(wood,vec3(0.055,0.065,0.085),uNight*0.89);
  wood = mix(wood,sky,0.10+hit.w*0.08);
  return mix(sky,wood,mask*0.94);
}
float disc(vec2 p,vec2 center,vec2 radii) {
  return 1.0-smoothstep(0.94,1.06,length((p-center)/radii));
}

vec3 paintMoon(vec3 sky,vec2 uv,float aspect) {
  float radius = mix(0.046,0.098,smoothstep(0.55,1.4,aspect));
  vec2 m = (uv-vec2(0.788,0.731))*vec2(aspect,1.0)/radius;
  float r = length(m);
  if(r>1.01 || uMoon<0.001) return sky;
  float z = sqrt(max(0.0,1.0-dot(m,m)));
  // Slight libration exposes the lunar near side with real mare geography.
  float angle = -0.15;
  vec3 normal = vec3(m,z);
  vec3 rotated = vec3(normal.x*cos(angle)+normal.z*sin(angle),normal.y,
                      -normal.x*sin(angle)+normal.z*cos(angle));
  vec2 mapUV = vec2(atan(rotated.x,rotated.z)/6.283185+0.5,0.5-asin(clamp(rotated.y,-1.0,1.0))/3.14159);
  vec3 albedo = texture2D(uMoonMap,mapUV).rgb;
  float luminance = dot(albedo,vec3(0.299,0.587,0.114));
  // Daytime atmosphere reduces contrast but preserves the actual crater structure.
  float reflectance = clamp(0.40+luminance*0.70,0.0,1.0);
  float light = dot(normal,normalize(vec3(-0.84,0.18,0.49)));
  float terminator = smoothstep(-0.14,0.23,light);
  float limb = 1.0-smoothstep(0.975,1.01,r);
  vec3 lunarColor = vec3(0.89,0.92,0.96)*reflectance*(0.94+0.06*max(light,0.0));
  vec3 atmospheric = mix(sky,lunarColor,0.63+uNight*0.33);
  return mix(sky,atmospheric,limb*terminator*uMoon);
}
void main() {
  vec2 uv = gl_FragCoord.xy/uRes;
  float aspect = uRes.x/uRes.y;
  vec3 col = mix(uHorizon,uZenith,smoothstep(0.0,1.0,uv.y));
  col += vec3(1.0,0.71,0.48)*uSun*0.10*exp(-length((uv-vec2(0.13,0.18))*vec2(aspect,1.0))*3.2);
  // Subpixel stars have round point profiles, rather than square noise cells.
  vec2 stars = uv*vec2(aspect,1.0)*240.0;
  vec2 cell = floor(stars), sf = fract(stars)-0.5;
  float star = step(0.988,hash12(cell))*exp(-dot(sf,sf)*110.0);
  col += vec3(0.85,0.90,1.0)*star*uStar*(0.65+0.35*sin(uTime*0.55+hash12(cell)*32.0));
  col = paintMoon(col,uv,aspect);
  vec4 cloud = paintClouds(uv);
  col = col*(1.0-cloud.a)+cloud.rgb;
  col = paintBranch(col,uv);
  if(uBirdOn>0.5) {
    vec2 q = (uv-uBird.xy)*vec2(aspect*uBird.z,1.0);
    float body = disc(q,vec2(0.002,0.003),vec2(0.017,0.012));
    float head = disc(q,vec2(-0.014,0.012),vec2(0.009,0.009));
    float cheek = disc(q,vec2(-0.016,0.010),vec2(0.0055,0.005));
    float tail = 1.0-smoothstep(0.0015,0.0032,segment(q,vec2(0.012,0.002),vec2(0.037,-0.014),0.0015,0.0002));
    float beak = 1.0-smoothstep(0.0004,0.0012,segment(q,vec2(-0.021,0.012),vec2(-0.029,0.011),0.001,0.0));
    float legs = 1.0-smoothstep(0.0003,0.0009,min(segment(q,vec2(0.001,-0.007),vec2(0.004,-0.015),0.0,0.0),segment(q,vec2(0.008,-0.006),vec2(0.010,-0.015),0.0,0.0)));
    float wing = disc(q,vec2(0.006,0.008+sin(uBirdAnim.x)*0.003),vec2(0.012,0.008));
    vec3 bird = mix(vec3(0.63,0.64,0.30),vec3(0.87,0.79,0.38),smoothstep(0.007,-0.007,q.y));
    bird = mix(bird,vec3(0.28,0.37,0.39),wing*0.93);
    float feathers = (0.5+0.5*sin(q.x*1800.0+q.y*500.0))*0.16*wing;
    bird += vec3(0.72,0.78,0.74)*feathers;
    bird = mix(bird,vec3(0.075,0.095,0.10),clamp(head+tail+beak+legs,0.0,1.0));
    bird = mix(bird,vec3(0.90,0.90,0.81),cheek*0.98);
    float eye = disc(q,vec2(-0.018,0.014),vec2(0.0015));
    bird = mix(bird,vec3(0.02),eye);
    bird += vec3(0.65)*disc(q,vec2(-0.0184,0.0145),vec2(0.0004));
    float mask = max(max(body,head),max(max(tail,wing),max(beak,legs)));
    bird *= 1.0-uNight*0.70;
    col = mix(col,bird,mask);
  }
  // Stable film grain: no temporal sparkle over the lettering.
  col += (hash12(gl_FragCoord.xy)-0.5)*0.005;
  gl_FragColor = vec4(col,1.0);
}
`;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerp3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

  function createFableHero(el, opts) {
    opts = opts || {};
    const classes = Object.assign({
      canvas: 'hero-canvas', drawn: 'drawn', overBird: 'over-bird',
      looks: 'looks', look: 'look', on: 'on', unsupported: 'unsupported',
    }, opts.classes || {});

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;

    const canvas = document.createElement('canvas');
    canvas.className = classes.canvas;
    canvas.setAttribute('aria-hidden', 'true');
    el.prepend(canvas);

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) {
      canvas.remove();
      el.classList.add(classes.unsupported);
      if (opts.onUnsupported) opts.onUnsupported(new Error('WebGL unavailable'));
      return null;
    }

    function shader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(s);
        gl.deleteShader(s);
        throw new Error('Hero shader compilation failed: ' + message);
      }
      return s;
    }
    const prog = gl.createProgram();
    try {
      gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (error) {
      console.error(error);
      canvas.remove();
      el.classList.add(classes.unsupported);
      gl.deleteProgram(prog);
      return null;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = {};
    ['uRes', 'uTime', 'uZenith', 'uHorizon', 'uCloudCol', 'uCloudWarm', 'uCloudPink', 'uCloudShade',
     'uStar', 'uMoon', 'uSun', 'uNight', 'uBranchDip', 'uBirdOn', 'uBird', 'uBirdAnim'].forEach((n) => {
      U[n] = gl.getUniformLocation(prog, n);
    });

    const textures = [];
    function loadTexture(uniform, file, unit, fallback) {
      const texture = gl.createTexture();
      textures.push(texture);
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(fallback));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.uniform1i(gl.getUniformLocation(prog, uniform), unit);
      return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => {
          if (disposed) return resolve(false);
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          if (uniform === 'uBarkMap' || uniform === 'uBarkNormal') {
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          }
          if (reduced) requestAnimationFrame(frame);
          resolve(true);
        };
        image.onerror = () => {
          console.warn('Hero material failed to load:', file);
          resolve(false);
        };
        image.src = new URL(file, ASSET_BASE).href;
      });
    }
    canvas.dataset.materials = 'loading';
    Promise.all([
      loadTexture('uMoonMap', 'moon-lroc.jpg', 0, [150,150,150,255]),
      loadTexture('uCloudVolume', 'cloud-volume.png', 1, [128,128,128,255]),
      loadTexture('uBarkMap', 'bark-diff.webp', 2, [100,78,60,255]),
      loadTexture('uBarkNormal', 'bark-normal.webp', 3, [128,128,255,255]),
    ]).then((loaded) => {
      if (!disposed) canvas.dataset.materials = loaded.every(Boolean) ? 'ready' : 'fallback';
    });

    // ---------- state ----------
    const perches = [ // 枝上栖点（uv 空间；GUESS）
      { x: 0.88, y: 0.14 }, { x: 0.82, y: 0.18 }, { x: 0.90, y: 0.185 }, { x: 0.77, y: 0.18 },
    ];
    let shelters = opts.shelters || [];
    let lookFrom = { ...LOOKS.day }, lookTo = { ...LOOKS.day }, lookT = 1, lookCur = { ...LOOKS.day };

    const bird = {
      on: 0, x: -0.3, y: 0.5, facing: 1,
      state: 'idle', t0: 0, perch: perches[0],
      from: { x: -0.3, y: 0.5 }, to: { x: 0.88, y: 0.13 },
      flap: 0, flyDur: 3.2, perchUntil: 0,
    };
    let branchDip = 0, dipT0 = -10;

    function shelterHit(sx, sy) {
      const nx = sx, ny = 1.0 - sy;
      return shelters.some((r) => nx > r[0] - 0.02 && nx < r[2] + 0.02 && ny > r[1] - 0.02 && ny < r[3] + 0.02);
    }
    function pickPerch() {
      const cands = perches.filter((p) => !shelterHit(p.x, p.y));
      return (cands.length ? cands : perches)[Math.floor(Math.random() * (cands.length || perches.length))];
    }
    function startFlyIn(t) {
      const perch = pickPerch();
      bird.state = 'fly-in';
      bird.t0 = t;
      bird.from = { x: -0.25 - Math.random() * 0.2, y: 0.3 + Math.random() * 0.3 };
      bird.to = { x: perch.x, y: perch.y };
      bird.perch = perch;
      bird.facing = -1;
      bird.flyDur = 3.0 + Math.random() * 1.2;
      bird.on = 1;
    }
    function startFlyOff(t) {
      if (bird.state === 'fly-off') return;
      bird.state = 'fly-off';
      bird.t0 = t;
      bird.from = { x: bird.x, y: bird.y };
      bird.to = { x: 1.35 + Math.random() * 0.2, y: 0.4 + Math.random() * 0.25 };
      bird.facing = -1;
      bird.flyDur = 1.6;
    }

    // ---------- time-of-day switcher ----------
    const looksEl = document.createElement('div');
    looksEl.className = classes.looks;
    looksEl.setAttribute('role', 'group');
    looksEl.setAttribute('aria-label', 'Time of day');
    const buttons = {};
    [['day', 'Noon', '#7ea9de'], ['night', 'Night', '#1a2237'], ['morning', 'Morning', '#dcc4b3']].forEach(([id, label, sw]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = classes.look;
      b.style.setProperty('--sw', sw);
      b.title = label;
      b.setAttribute('aria-label', label);
      b.setAttribute('aria-pressed', 'false');
      b.textContent = label;
      b.addEventListener('click', () => setLook(id));
      looksEl.appendChild(b);
      buttons[id] = b;
    });
    if (opts.looks !== false) el.appendChild(looksEl);

    function setLook(id) {
      if (!LOOKS[id]) id = 'day';
      lookFrom = { ...lookCur };
      lookTo = { ...LOOKS[id] };
      lookT = 0;
      for (const k in buttons) {
        buttons[k].classList.toggle(classes.on, k === id);
        buttons[k].setAttribute('aria-pressed', String(k === id));
      }
      if (reduced) requestAnimationFrame(frame);
    }
    setLook('day');

    // ---------- input ----------
    function onPointer(e) {
      if (bird.state === 'perch' || bird.state === 'fly-in') {
        const r = canvas.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = 1 - (e.clientY - r.top) / r.height;
        const near = Math.hypot(px - bird.x, py - bird.y) < 0.06;
        canvas.classList.toggle(classes.overBird, near);
        if (near && Math.random() < 0.03) startFlyOff(now());
        else if (!near && Math.random() < 0.0012) startFlyOff(now());
      }
    }
    function onClick(e) {
      const r = canvas.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = 1 - (e.clientY - r.top) / r.height;
      if (Math.hypot(px - bird.x, py - bird.y) < 0.06) startFlyOff(now());
    }
    el.addEventListener('pointermove', onPointer);
    el.addEventListener('click', onClick);

    // ---------- resize ----------
    function resize() {
      // Soft atmospheric artwork does not benefit from a 4K fragment buffer.
      const dpr = Math.min(global.devicePixelRatio || 1, 1.25, 1800 / el.clientWidth);
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (reduced) requestAnimationFrame(frame);
    }
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // ---------- frame ----------
    const t0 = performance.now();
    let raf = 0;
    let previousTime = 0;
    const now = () => (performance.now() - t0) / 1000;

    function frame() {
      if (disposed) return;
      const t = now();
      const frameDelta = Math.min(0.10, Math.max(0, t - previousTime));
      previousTime = t;

      if (lookT < 1) {
        lookT = reduced ? 1 : Math.min(1, lookT + frameDelta / 1.2);
        for (const k of ['star', 'moon', 'sun', 'night']) lookCur[k] = lerp(lookFrom[k], lookTo[k], lookT);
        for (const k of ['zenith', 'horizon', 'cloud', 'cloudWarm', 'cloudPink', 'cloudShade']) lookCur[k] = lerp3(lookFrom[k], lookTo[k], lookT);
      }

      // bird choreography（事件节奏 GUESS）
      if (bird.state === 'idle') {
        if (t - bird.t0 > 4) startFlyIn(t);
      } else if (bird.state === 'fly-in') {
        const u = Math.min(1, (t - bird.t0) / bird.flyDur);
        const e2 = u * u * (3 - 2 * u);
        bird.x = lerp(bird.from.x, bird.to.x, e2);
        bird.y = lerp(bird.from.y, bird.to.y, e2) + Math.sin(u * Math.PI) * 0.14;
        bird.flap = t * 22;
        if (u >= 1) {
          bird.state = 'perch';
          bird.facing = 1;
          bird.perchUntil = t + 6 + Math.random() * 7;
          dipT0 = t;
        }
      } else if (bird.state === 'perch') {
        bird.x = bird.perch.x;
        bird.y = bird.perch.y + Math.sin(t * 2.1) * 0.002;
        bird.flap = Math.sin(t * 3) * 0.1;
        if (t > bird.perchUntil) startFlyOff(t);
      } else if (bird.state === 'fly-off') {
        const u = Math.min(1, (t - bird.t0) / bird.flyDur);
        bird.x = lerp(bird.from.x, bird.to.x, u * u);
        bird.y = lerp(bird.from.y, bird.to.y, u) + Math.sin(u * Math.PI) * 0.08;
        bird.flap = t * 26;
        if (u >= 1) { bird.state = 'idle'; bird.on = 0; bird.t0 = t; }
      }

      if (reduced) {
        bird.on = 1;
        bird.x = perches[0].x;
        bird.y = perches[0].y;
        bird.facing = 1;
        bird.flap = 0;
      }

      // landing spring（damped oscillator; twig 慢深 bough 短快 —— GUESS）
      const dt = t - dipT0;
      branchDip = dt < 3 ? 0.010 * Math.exp(-2.6 * dt) * Math.cos(7.5 * dt) : 0;

      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, reduced ? 12.0 : t);
      gl.uniform3fv(U.uZenith, lookCur.zenith);
      gl.uniform3fv(U.uHorizon, lookCur.horizon);
      gl.uniform3fv(U.uCloudCol, lookCur.cloud);
      gl.uniform3fv(U.uCloudWarm, lookCur.cloudWarm);
      gl.uniform3fv(U.uCloudPink, lookCur.cloudPink);
      gl.uniform3fv(U.uCloudShade, lookCur.cloudShade);
      gl.uniform1f(U.uStar, lookCur.star);
      gl.uniform1f(U.uMoon, lookCur.moon);
      gl.uniform1f(U.uSun, lookCur.sun);
      gl.uniform1f(U.uNight, lookCur.night);
      gl.uniform1f(U.uBranchDip, branchDip);
      gl.uniform1f(U.uBirdOn, bird.on);
      gl.uniform3f(U.uBird, bird.x, bird.y, bird.facing);
      gl.uniform2f(U.uBirdAnim, bird.flap, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!reduced) raf = requestAnimationFrame(frame);
      else canvas.classList.add(classes.drawn);
    }

    frame();
    requestAnimationFrame(() => canvas.classList.add(classes.drawn));

    return {
      setShelters(...rects) { shelters = rects.filter(Boolean); },
      setLook,
      dispose() {
        disposed = true;
        cancelAnimationFrame(raf);
        ro.disconnect();
        el.removeEventListener('pointermove', onPointer);
        el.removeEventListener('click', onClick);
        looksEl.remove();
        canvas.remove();
        textures.forEach(texture => gl.deleteTexture(texture));
        gl.deleteBuffer(buf);
        gl.deleteProgram(prog);
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      },
    };
  }

  global.createFableHero = createFableHero;
})(window);
