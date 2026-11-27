import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import type { VRM } from "@pixiv/three-vrm";
import { createIdlePerformance } from "./avatarBehavior";
import type { Acting, AvatarModel } from "./avatarBehavior";

export async function mountAvatar(
  host: HTMLElement,
  model: AvatarModel,
  acting: () => Acting,
  signal: AbortSignal,
  show: (view: "model" | "portrait") => void,
) {
  if (signal.aborted) return;
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(29, 1, 0.05, 20);
  const light = new THREE.DirectionalLight(0xfff3e5, 1.8);
  light.position.set(-2, 3, 2);
  scene.add(light, new THREE.HemisphereLight(0xffffff, 0x9898aa, 1.6));
  const gaze = new THREE.Object3D();
  scene.add(gaze);
  const canvas = renderer.domElement;
  host.append(canvas);
  let avatar: VRM | undefined;
  let headHeight = 1.5;
  let disposed = false;
  function resize() {
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.set(0, headHeight - 0.11, width < 660 ? 2.3 : 2.55);
    camera.lookAt(0, headHeight - (width < 660 ? 0.09 : 0.16), 0);
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const pointer = new THREE.Vector2();
  const move = (event: PointerEvent) =>
    pointer.set(
      event.clientX / innerWidth - 0.5,
      0.5 - event.clientY / innerHeight,
    );
  window.addEventListener("pointermove", move);
  function cleanup() {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    renderer.setAnimationLoop(null);
    window.removeEventListener("pointermove", move);
    canvas.removeEventListener("webglcontextlost", lost);
    if (avatar) VRMUtils.deepDispose(avatar.scene);
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    signal.removeEventListener("abort", cleanup);
  }
  function lost() {
    cleanup();
    if (!signal.aborted) show("portrait");
  }
  canvas.addEventListener("webglcontextlost", lost);
  signal.addEventListener("abort", cleanup, { once: true });
  try {
    const response = await fetch(`/Characters/${model}.vrm`, { signal });
    if (!response.ok) throw Error("Model unavailable");
    const loader = new GLTFLoader().register(
      (parser) => new VRMLoaderPlugin(parser),
    );
    const gltf = await loader.parseAsync(await response.arrayBuffer(), "");
    avatar = gltf.userData.vrm as VRM;
    if (disposed) {
      VRMUtils.deepDispose(avatar.scene);
      return;
    }
    VRMUtils.rotateVRM0(avatar);
    scene.add(avatar.scene);
    avatar.scene.updateMatrixWorld(true);
    const rig = avatar.humanoid;
    const bone = rig.getNormalizedBoneNode.bind(rig);
    const head = bone("head")!,
      chest = bone("chest")!,
      neck = bone("neck")!;
    const hips = bone("hips")!;
    const left = bone("leftUpperArm")!,
      right = bone("rightUpperArm")!;
    const leftElbow = bone("leftLowerArm")!,
      rightElbow = bone("rightLowerArm")!;
    const leftHand = bone("leftHand")!,
      rightHand = bone("rightHand")!;
    const armSign = Math.sign(bone("rightLowerArm")!.position.x);
    const fingers = (side: "left" | "right") => {
      const sign = side === "left" ? -armSign : armSign;
      return (["Index", "Middle", "Ring", "Little"] as const).flatMap(
        (digit, index) =>
          (["Proximal", "Intermediate", "Distal"] as const).map(
            (joint, jointIndex) => ({
              node: bone(`${side}${digit}${joint}`)!,
              curl: -sign * ([0.16, 0.24, 0.12][jointIndex]! + index * 0.045),
            }),
          ),
      );
    };
    const leftFingers = fingers("left"),
      rightFingers = fingers("right");
    const leftThumb = bone("leftThumbMetacarpal");
    const rightThumb = bone("rightThumbMetacarpal");
    const restHip = hips.position.y;
    left.rotation.z = armSign * 1.32;
    right.rotation.z = -armSign * 1.32;
    const point = new THREE.Vector3();
    headHeight = head.getWorldPosition(point).y;
    resize();
    gaze.position.set(0, headHeight, 2.3);
    if (avatar.lookAt) avatar.lookAt.target = gaze;
    const face = avatar.expressionManager!;
    const vrm = avatar;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const idlePerformance = createIdlePerformance(model);
    const rotation = vrm.scene.rotation.y;
    let elapsed = 0;
    let last = 0;
    let nextBlink = 2.5;
    let previous = "";
    let beat = 0;
    let nextEmphasis = 0;
    let emphasis = 0;

    function frame(now: number) {
      if (document.hidden || now - last < 32) return;
      const dt = Math.min((now - last) / 1000, 0.08);
      last = now;
      elapsed += dt;

      const { mode, state, cue, mood, level, letter } = acting();
      const ease = (current: number, target: number, rate = 6) =>
        THREE.MathUtils.damp(current, target, rate, dt);
      const motion = reduced.matches ? 0 : 1;
      const autonomous = mode === "default";
      const activity = idlePerformance(elapsed, autonomous && !!motion);
      const strength = activity?.weight ?? 0;
      const side = (activity?.side ?? 1) * strength;
      const age = activity?.age ?? 0;
      const answering = state === "speaking" || state === "responding";
      const thinking = state === "thinking";
      const listening = state === "listening";
      const signature = answering ? cue : state;
      if (signature !== previous) {
        beat = elapsed;
        previous = signature;
        nextEmphasis = elapsed + 2.2;
        emphasis = 0;
      }
      const amplitude = state === "speaking" ? level() : 0;
      if (amplitude > 0.24 && elapsed >= nextEmphasis) {
        emphasis = 0.38;
        nextEmphasis = elapsed + 2.4 + Math.random() * 2.2;
      }
      emphasis = ease(emphasis, 0, 2.8);
      const gesture =
        motion *
        (Math.sin(Math.PI * Math.min(1, (elapsed - beat) / 1.35)) ** 2 +
          emphasis);
      const breath = Math.sin(elapsed * 1.65) * motion;
      const wave = activity?.name === "wave" ? strength : 0;
      const waveReach = Math.min(1, camera.aspect / 1.25);
      const stretch = activity?.name === "stretch" ? strength : 0;
      const reflect = activity?.name === "reflect" ? strength : 0;
      const peek = activity?.name === "peek" ? strength : 0;
      const skyline = activity?.name === "skyline" ? side : 0;
      const sway = activity?.name === "sway" ? side * Math.sin(age * 2.5) : 0;

      const present =
        answering && ["greet", "explain", "invite", "imitate"].includes(cue)
          ? gesture * (model === "Maria" ? 1 : 0.72)
          : 0;
      const nod =
        (answering && cue === "affirm"
          ? 0.15
          : state === "attentive"
            ? 0.055
            : 0) * gesture;
      const warmth = answering && mood === "happy" ? 0.08 * gesture : 0;
      vrm.scene.position.x = ease(
        vrm.scene.position.x,
        skyline * 0.12 + sway * 0.08,
        3.8,
      );
      vrm.scene.position.z = ease(vrm.scene.position.z, peek * 0.15, 3.8);
      vrm.scene.rotation.y = ease(
        vrm.scene.rotation.y,
        rotation + skyline * 0.39 - sway * 0.13,
        4.1,
      );
      hips.position.y = ease(
        hips.position.y,
        restHip + sway * 0.015 - peek * 0.018,
      );
      hips.rotation.z = ease(hips.rotation.z, 0.04 * skyline - 0.1 * sway);
      chest.rotation.x = ease(
        chest.rotation.x,
        breath * 0.018 +
          motion * (listening ? 0.045 : 0) +
          peek * 0.12 -
          stretch * 0.13 -
          warmth,
      );
      chest.rotation.z = ease(
        chest.rotation.z,
        -skyline * 0.085 + sway * 0.12 + wave * 0.04,
      );
      neck.rotation.y = ease(
        neck.rotation.y,
        motion * (thinking ? 0.14 : 0) + skyline * 0.18 + reflect * 0.12,
      );
      head.rotation.z = ease(
        head.rotation.z,
        motion *
          (listening || (cue === "reassure" && answering)
            ? 0.09
            : breath * 0.024) +
          peek * 0.15 -
          skyline * 0.09,
      );
      head.rotation.x = ease(
        head.rotation.x,
        motion * (thinking ? -0.085 : 0) + nod + reflect * 0.1 - stretch * 0.1,
      );
      left.rotation.z = ease(
        left.rotation.z,
        armSign * (1.32 - stretch * 0.52 - sway * 0.15),
      );
      right.rotation.z = ease(
        right.rotation.z,
        armSign *
          (-1.32 +
            wave * (0.52 + 0.38 * waveReach) +
            stretch * 0.52 +
            reflect * 0.24 +
            present * 0.37 +
            sway * 0.12),
      );
      left.rotation.y = ease(left.rotation.y, -armSign * stretch * 0.38);
      right.rotation.y = ease(
        right.rotation.y,
        armSign *
          (wave * 0.25 + reflect * 0.83 + present * 0.44 + stretch * 0.38),
      );
      leftElbow.rotation.y = ease(
        leftElbow.rotation.y,
        -armSign * (0.12 + stretch * 0.23),
      );
      rightElbow.rotation.z = ease(
        rightElbow.rotation.z,
        armSign *
          (wave * (1.85 - 0.2 * waveReach) + reflect * 0.29 + present * 0.55),
      );
      rightElbow.rotation.y = ease(
        rightElbow.rotation.y,
        armSign * (0.16 + reflect * 0.66 + present * 0.4),
      );
      leftHand.rotation.x = ease(leftHand.rotation.x, -armSign * 0.23);
      rightHand.rotation.x = ease(
        rightHand.rotation.x,
        armSign * (0.23 + wave * 0.56),
      );
      leftHand.rotation.z = ease(leftHand.rotation.z, armSign * 0.08);
      rightHand.rotation.z = ease(
        rightHand.rotation.z,
        armSign * (-0.08 + wave * Math.sin(age * 10) * 0.32),
      );
      const openHand = Math.max(wave * 0.85, present * 0.52);
      for (const { node, curl } of leftFingers)
        node.rotation.z = ease(node.rotation.z, curl);
      for (const { node, curl } of rightFingers)
        node.rotation.z = ease(node.rotation.z, curl * (1 - openHand));
      if (leftThumb) leftThumb.rotation.y = armSign * 0.19;
      if (rightThumb)
        rightThumb.rotation.y = ease(
          rightThumb.rotation.y,
          -armSign * 0.19 * (1 - openHand),
        );
      gaze.position.set(
        ease(
          gaze.position.x,
          skyline * 1.45 +
            (autonomous ? pointer.x * 0.25 * motion : 0) +
            (thinking ? 0.35 * motion : 0),
        ),
        ease(
          gaze.position.y,
          headHeight +
            skyline * 0.12 +
            (thinking ? 0.22 * motion : 0) -
            reflect * 0.24,
        ),
        camera.position.z,
      );
      const blinkAge = elapsed - nextBlink;
      face.setValue(
        "blink",
        blinkAge >= 0 && blinkAge < 0.2
          ? Math.sin((Math.PI * blinkAge) / 0.2)
          : 0,
      );
      if (blinkAge >= 0.2) nextBlink = elapsed + 2.8 + Math.random() * 3.4;
      const expression = (name: string, target: number) =>
        face.setValue(name, ease(face.getValue(name) ?? 0, target));
      expression(
        "happy",
        answering && (mood === "happy" || cue === "greet")
          ? 0.4
          : wave * 0.32 + Math.abs(sway) * 0.16,
      );
      expression("Surprised", peek * 0.28);
      expression("sad", answering && mood === "sad" ? 0.32 : 0);
      expression(
        "relaxed",
        answering && (mood === "relaxed" || cue === "reassure") ? 0.35 : 0.065,
      );
      const phoneme = amplitude > 0 ? vowel(letter()) : "";
      for (const shape of ["aa", "ih", "ou", "ee", "oh"]) {
        const weight = shape === phoneme ? amplitude : 0;
        face.setValue(
          shape,
          THREE.MathUtils.damp(face.getValue(shape) ?? 0, weight, 22, dt),
        );
      }
      vrm.update(dt);
      renderer.render(scene, camera);
    }
    renderer.setAnimationLoop(frame);
    show("model");
  } catch (error) {
    cleanup();
    throw error;
  }
}

function vowel(character: string) {
  if (/[iíいきしちにひみりイキシチニヒミリ]/i.test(character)) return "ih";
  if (/[uúうくすつぬふむゆるウクスツヌフムユル]/i.test(character)) return "ou";
  if (/[eéえけせてねへめれエケセテネヘメレ]/i.test(character)) return "ee";
  if (/[oóおこそとのほもよろオコソトノホモヨロ]/i.test(character)) return "oh";
  return "aa";
}
