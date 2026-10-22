/**
 * Photos and videos for the public site. Drop files with these names into client/public/media/
 * (see the README there). Any file that is missing falls back to a styled placeholder, so the
 * site always looks finished. To use different file names, change the paths here.
 */
export const MEDIA = {
  /** Background video of the home hero (MP4, H.264, muted, ~10-20 s loop, under ~8 MB). */
  heroVideo: '/media/hero.mp4',
  /** Shown while the hero video loads, and on phones with data saver. Also used if there is no video. */
  heroPoster: '/media/hero.jpg',
  /** Portrait photo next to the "About" text (the shop, the owner, or a barber at work). */
  about: '/media/about.jpg',
  /** Background of the "Book your chair" band near the bottom of the home page. */
  ctaBackground: '/media/cta.jpg',
  /** Lookbook gallery on the home page. Captions are optional. */
  gallery: [
    { src: '/media/gallery-1.jpg', caption: 'Skin fade' },
    { src: '/media/gallery-2.jpg', caption: 'Classic cut' },
    { src: '/media/gallery-3.jpg', caption: 'Beard sculpt' },
    { src: '/media/gallery-4.jpg', caption: 'Hot towel shave' },
    { src: '/media/gallery-5.jpg', caption: 'Textured crop' },
    { src: '/media/gallery-6.jpg', caption: 'The shop' },
  ],
} as const;
