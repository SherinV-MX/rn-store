# Race Navigator assets

Downloaded from the live site (race-navigator.de / .com) for the rebuild demo. They are the
client's own images and belong to RN Vision GmbH — nothing here is ours to license on.

    logo.png            the wordmark, 168 x 96
    hero/               five slide backgrounds, ~1900 px wide
    product/            RN ONE MKII cut-outs (3) and one mood shot
    partners/           eleven reference logos, mixed JPEG and PNG
    case-open.mp4       RN's own case animation, 550 x 534, silent, 2.02 s
    case.jpg            a still of the case (the Elementor thumbnail)
    menzel.jpg          Christian Menzel, behind the quote

Two things to fix before this is anything but a demo:

- **Get the originals from the client.** These came off a WordPress media library, so several
  are already downscaled and re-compressed. `case.jpg` in particular is a 400 px Elementor
  thumbnail and is soft at full width.
- **Check the partner logos.** They are third-party marks shown as references. The client
  presumably has permission; we should confirm it rather than assume it carries over.

`case-open.mp4` runs closed to open and back to closed — the original file is named "2-way"
for that reason. Played straight through it shuts the case in the visitor's face, so the
showcase stops it at the halfway frame and leaves the lid up. If the clip is ever replaced,
check whether that still holds.

The partner rail applies `mix-blend-mode: multiply` so the white-background JPEGs sit on the
light rail without boxes around them. If a logo is ever supplied with a transparent background
and a dark mark, that rule still works; a white mark on transparent would not.

## video/reel.webm — placeholder, not RN's

Public domain. "Fuji Speedway", U.S. Navy AFN-T, via Wikimedia Commons:
https://commons.wikimedia.org/wiki/File:Fuji_Speedway_(953856).webm

A stand-in for the demo only. RN's own Christian Menzel film
(youtube.com/watch?v=L0aLgDfwkO0) is on YouTube and is not ours to copy, so it is not
included here. Replace CLIP in src/components/rn/RnVideo.tsx when the client supplies the
real file.

Note: the clip opens on ~0.75s of black, which the player skips with its START constant. A
trimmed file would let that constant go back to 0.

## video/menzel-cover.png, video/brush-bg.jpg — RN's own

Taken from race-navigator.de. The client's artwork, used here to rebuild their page.
