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
  /**
   * "Meet the team" on the home page. Also the photos the owner can assign to barber accounts.
   * `face` is a square head-and-shoulders crop used for small round avatars.
   */
  team: [
    { name: 'Ali Hamza Sheikh', photo: '/media/team/ali-hamza-sheikh.jpg', face: '/media/team/ali-hamza-sheikh-face.jpg' },
    { name: 'Rasheed', photo: '/media/team/rasheed.jpg', face: '/media/team/rasheed-face.jpg' },
    { name: 'Ricky Sothra', photo: '/media/team/ricky-sothra.jpg', face: '/media/team/ricky-sothra-face.jpg' },
    { name: 'Stephen John', photo: '/media/team/stephen-john.jpg', face: '/media/team/stephen-john-face.jpg' },
    { name: 'Titas Khan', photo: '/media/team/titas-khan.jpg', face: '/media/team/titas-khan-face.jpg' },
  ],
  /** Drag-to-compare pairs (same size, portrait, about 4:7). */
  beforeAfter: [
    { before: '/media/before-after/ba-1-before.jpg', after: '/media/before-after/ba-1-after.jpg', title: 'Long length to textured crop' },
    { before: '/media/before-after/ba-2-before.jpg', after: '/media/before-after/ba-2-after.jpg', title: 'Quiff with a skin fade' },
    { before: '/media/before-after/ba-3-before.jpg', after: '/media/before-after/ba-3-after.jpg', title: 'Clean textured taper' },
    { before: '/media/before-after/ba-4-before.jpg', after: '/media/before-after/ba-4-after.jpg', title: 'Curly taper' },
  ],
  /** Finished cuts shown under the before & after pairs. */
  cuts: [
    { src: '/media/cuts/cut-1.jpg', caption: 'Low taper' },
    { src: '/media/cuts/cut-2.jpg', caption: 'Quiff & skin fade' },
    { src: '/media/cuts/cut-3.jpg', caption: 'Modern mullet' },
    { src: '/media/cuts/cut-4.jpg', caption: 'Full beard, slick back' },
    { src: '/media/cuts/cut-5.jpg', caption: 'Wavy flow' },
    { src: '/media/cuts/cut-6.jpg', caption: 'Classic side part' },
  ],
  /** The storefront, in the "Visit us" section. */
  shop: {
    night: '/media/shop/shop-night.jpg',
    day: '/media/shop/shop-day.jpg',
  },
} as const;

const normalize = (s: string) => s.toLowerCase().replace(/\[[^\]]*\]/g, '').replace(/[^a-z]+/g, ' ').trim();

/**
 * The photo for a barber account: the one the owner assigned, otherwise the team photo whose
 * name matches the account name (full name, or a unique first name), otherwise none.
 */
export function barberPhoto(name: string, photoUrl?: string | null): string | null {
  if (photoUrl) return photoUrl;
  const n = normalize(name);
  if (!n) return null;
  const exact = MEDIA.team.find((m) => normalize(m.name) === n);
  if (exact) return exact.photo;
  const first = n.split(' ')[0];
  const byFirst = MEDIA.team.filter((m) => normalize(m.name).split(' ')[0] === first);
  return byFirst.length === 1 ? byFirst[0].photo : null;
}

/** Image for a small round avatar: the face crop of a team photo, else the photo itself. */
export function barberAvatarSrc(name: string, photoUrl?: string | null): string | null {
  const photo = barberPhoto(name, photoUrl);
  return MEDIA.team.find((m) => m.photo === photo)?.face ?? photo;
}
