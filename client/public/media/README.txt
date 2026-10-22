Put the salon's photos and videos in this folder using these exact file names.
Missing files are fine: the site shows a styled placeholder instead.

  hero.mp4        Home page background video (MP4/H.264, muted loop, 10-20 s, under ~8 MB, landscape 1920x1080)
  hero.jpg        Still frame for the hero (shown while the video loads, or instead of it). Landscape, ~1920 px wide
  about.jpg       Portrait photo for the "About" section (e.g. 1200x1500)
  cta.jpg         Wide background photo for the "Book your chair" band (~1920 px wide)
  gallery-1.jpg   Lookbook photos (square or portrait, ~1200 px). Use as many as you have, up to 6.
  ...
  gallery-6.jpg

Tips
- Compress photos before uploading (e.g. squoosh.app, quality ~75). Aim for under 400 KB each.
- To change captions or file names, edit client/src/config/media.ts.
- After adding files, rebuild the frontend (npm run build) and upload the new dist/ folder.
