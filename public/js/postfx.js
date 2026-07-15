// Shared post-processing helper for the studio's 3D games.
// Bloom + SMAA anti-aliasing + soft vignette, wired to a quality level.
// Falls back to plain rendering if the modules can't load.
export async function makeComposer(THREE, renderer, scene, camera, stage, opts = {}) {
  const quality = opts.quality || "high"; // "off" | "low" | "med" | "high"
  if (quality === "off") return null;
  try {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { ShaderPass }, { VignetteShader }, smaaMod] = await Promise.all([
      import("/vendor/pp/EffectComposer.js"),
      import("/vendor/pp/RenderPass.js"),
      import("/vendor/pp/UnrealBloomPass.js"),
      import("/vendor/pp/OutputPass.js"),
      import("/vendor/pp/ShaderPass.js"),
      import("/vendor/pp/VignetteShader.js"),
      import("/vendor/pp/SMAAPass.js"),
    ]);
    const w = stage.clientWidth, h = stage.clientHeight;
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(devicePixelRatio, quality === "high" ? 2 : 1.3));
    composer.setSize(w, h);
    composer.addPass(new RenderPass(scene, camera));

    // bloom: gentle on faces, punchy on lights/sparkles
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(w, h),
      opts.bloomStrength ?? 0.55,   // strength
      opts.bloomRadius ?? 0.7,      // radius
      opts.bloomThreshold ?? 0.82   // only bright things bloom
    );
    composer.addPass(bloom);

    // vignette for a "shot" framing
    const vig = new ShaderPass(VignetteShader);
    vig.uniforms.offset.value = opts.vignette ?? 1.05;
    vig.uniforms.darkness.value = opts.vignetteDark ?? 1.1;
    composer.addPass(vig);

    // anti-aliasing (skip on low to save GPU)
    if (quality !== "low") {
      const smaa = new smaaMod.SMAAPass(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
      composer.addPass(smaa);
    }

    // tone-map + sRGB out
    composer.addPass(new OutputPass());

    composer.__bloom = bloom;
    composer.resize = () => composer.setSize(stage.clientWidth, stage.clientHeight);
    return composer;
  } catch (e) {
    return null; // graceful fallback to renderer.render
  }
}
