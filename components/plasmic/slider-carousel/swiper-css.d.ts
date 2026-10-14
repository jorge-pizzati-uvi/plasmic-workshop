// Ambient module declarations for Swiper's CSS side-effect imports.
// Swiper 9 ships CSS files without .d.ts entries; TS reports TS2882
// "Cannot find module or type declarations" otherwise. Bundler resolves
// them at runtime.

declare module 'swiper/css';
declare module 'swiper/css/*';
