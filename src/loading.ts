import * as THREE from "three";

// See: https://threejs.org/manual/?q=shader#en/shadertoy

const uniforms = {
  iTime: { value: 0 },
  iResolution: { value: new THREE.Vector3() },
};

export const showLoading = (loader: HTMLDivElement, loading: boolean) => {
  loader.classList.toggle("opacity-0", !loading);
  loader.classList.toggle("pointer-events-none", !loading);
};

export const renderLoading = (canvas: HTMLCanvasElement) => {
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.autoClearColor = false;

  const camera = new THREE.OrthographicCamera(
    -1, // left
    1, // right
    1, // top
    -1, // bottom
    -1, // near,
    1 // far
  );
  const scene = new THREE.Scene();
  const plane = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    fragmentShader,
    uniforms,
  });
  scene.add(new THREE.Mesh(plane, material));

  function resizeRendererToDisplaySize(renderer: THREE.Renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  function render(time: number) {
    time *= 0.001;
    resizeRendererToDisplaySize(renderer);

    const canvas = renderer.domElement;
    uniforms.iResolution.value.set(canvas.width, canvas.height, 1);
    uniforms.iTime.value = time;

    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
};

const fragmentShader = `
#include <common>
uniform vec3 iResolution;
uniform float iTime;

#define HUGE 1000000.0

vec3 ballPos;
float ballRadius = 2.0;
vec3 lightDir = normalize(vec3(1,2,-2));

// computes the ray direction of a screen pixel
vec3 perspectiveRay(vec2 pixel)
{
    float x = -1.0 + 2.0*(pixel.x / iResolution.x);
    float y = 1.0;
    float z = -1.0 + 2.0*(pixel.y / iResolution.y);
    x *= iResolution.x / iResolution.y;
    return normalize(vec3(x,y,z));
}

vec3 rotateYaw(vec3 v, float angle)
{
    return vec3(
        v.x*cos(angle) - v.y*sin(angle),
        v.y*cos(angle) + v.x*sin(angle),
        v.z);
}

vec3 rotatePitch(vec3 v, float angle)
{
    return vec3(
        v.x,
        v.y*cos(angle) - v.z*sin(angle),
        v.z*cos(angle) + v.y*sin(angle));
}

float calcLight(vec3 normal, vec3 rd, float shininess)
{
    float ambient  = 0.3;
    float diffuse  = max(dot(-lightDir,normal), 0.0);
    float specular = max(dot(-lightDir,reflect(rd, normal)), 0.0);
    specular *= specular*specular*specular*specular*specular*specular*specular*specular;
    return ambient + diffuse + specular * shininess;
}

float raycastSphere(vec3 ro, vec3 rd, out vec3 normal)
{
    vec3 sc = ballPos;  // sphere center
    float sr = ballRadius;  // sphere radius

    // Imagine a plane that is perpendicular to the ray and intersects the sphere's center.
    // ts is the distance along the ray to that plane.
    float ts = dot(sc-ro, rd);
    if (ts < 0.0)
        return HUGE;
    // distance squared between point at ts and the sphere center
    float r2 = (dot(sc-ro,sc-ro) - ts*ts);
    if (r2 > sr*sr)
        return HUGE;
    float t = ts - sqrt(sr*sr - r2);  // distance along ray to where it intersects the sphere
    vec3 hit = ro + rd * t;
    normal = normalize(hit-sc);
    return t;
}

float raycastFloor(vec3 ro, vec3 rd, out vec2 hit)
{
    if (rd.z >= 0.0)
        return HUGE;
    float t = -ro.z / rd.z;
    hit = vec2(ro.x+rd.x*t, ro.y+rd.y*t);
    return t;
}

// Returns true or false to select the pattern for the floor position
bool checker(vec2 floorPos)
{
    return mod(floor(floorPos.x) + floor(floorPos.y), 2.0) < 1.0;
}

// Returns true if the floor position is in the shadow of the ball
bool shadow(vec3 floorPos)
{
    vec3 dummy;
    return raycastSphere(floorPos, -lightDir, dummy) < HUGE;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    // ball physics
    float t = fract(iTime);
    float bounce = ceil(fract(iTime/4.0)*4.0);
    float z = -t*(t-1.0)*50.0/bounce;
    ballPos = vec3(0.0, 6.0*iTime, 2.0+z);

    float cameraAngle = 0.5*iTime;
    // ray origin
    vec3 ro = rotateYaw(vec3(0,-10,4),cameraAngle);
    ro.y += ballPos.y;
    // ray direction
    vec3 rd = perspectiveRay(fragCoord);
    rd = normalize(rotateYaw(rd,cameraAngle));

    // do the ray trace
    vec2 floorHit;
    vec3 nSphere;
    float rt;
    float tFloor;
    vec3 color;
    vec3 floorColor;
    for (int i = 0; i < 2; i++)
    {
        vec3 sky = mix(vec3(1,1,1),vec3(0,0,1),max(rd.z, 0.0));
        color = sky;
        if (raycastSphere(ro, rd, nSphere) < HUGE)
        {
            // compute rotated normal for ball pattern
            vec3 n = rotatePitch(nSphere, ballPos.y/ballRadius);
            if (abs(n.x) < 0.05 || abs(n.z) < 0.05
             || abs(n.x*n.x-n.z*n.z-0.2) < 0.05)
                color = vec3(0,0,0);  // black
            else
                color = vec3(1.0,0.5,0.0);  // orange
            color *= calcLight(nSphere, rd, 0.5);
        }
        else if ((rt = raycastFloor(ro, rd, floorHit)) < HUGE)
        {
            tFloor = rt;
            floorColor = checker(floorHit) ? vec3(0.9,0.8,0.4) : vec3(0.8,0.7,0.3);
            if (shadow(vec3(floorHit,0)))
                floorColor *= 0.3;
            else
                floorColor *= calcLight(vec3(0,0,1), rd, 0.3);
            // now trace the reflected ray
            ro = vec3(floorHit, 0.0);
            rd = reflect(rd,vec3(0,0,1));
            continue;
        }
        else
            color = sky;
        if (i == 0)
            break;
        else
        {
            // blend reflected color with floor color
            color = mix(floorColor, color, 0.35);
            // fade out with sky to avoid aliasing artifacts
            float fadeStart = 20.0;
            float fadeEnd = 40.0;
            color = mix(color, sky, clamp((tFloor-fadeStart)/(fadeEnd-fadeStart),0.0,1.0));
        }
    }

    fragColor = vec4(color, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;
