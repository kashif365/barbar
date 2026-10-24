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
    { src: '/media/gallery-1.jpg', caption: 'Scissor finish' },
    { src: '/media/gallery-2.jpg', caption: 'Skin fade' },
    { src: '/media/gallery-3.jpg', caption: 'Facial & head massage' },
    { src: '/media/gallery-4.jpg', caption: 'Every chair, every day' },
    { src: '/media/gallery-5.jpg', caption: 'Clipper detailing' },
    { src: '/media/gallery-6.jpg', caption: 'The house tee' },
  ],
  /** Short portrait clips (9:16) shown under the lookbook. They play muted only while on screen. */
  reels: [
    { src: '/media/reel-1.mp4', poster: '/media/reel-1.jpg', caption: 'Fade, start to finish' },
    { src: '/media/reel-2.mp4', poster: '/media/reel-2.jpg', caption: 'In the chair' },
    { src: '/media/reel-3.mp4', poster: '/media/reel-3.jpg', caption: 'Scissor over comb' },
  ],
} as const;
