# Race Navigator assets

Downloaded from the live site (race-navigator.de / .com) for the rebuild demo. They are the
client's own images and belong to RN Vision GmbH — nothing here is ours to license on.

    logo.png            the wordmark, 168 x 96
    hero/               five slide backgrounds, ~1900 px wide
    product/            RN ONE MKII cut-outs (3) and one mood shot
    partners/           eleven reference logos, mixed JPEG and PNG
    case.jpg            the fitted case, used in the closing band
    menzel.jpg          Christian Menzel, behind the quote

Two things to fix before this is anything but a demo:

- **Get the originals from the client.** These came off a WordPress media library, so several
  are already downscaled and re-compressed. `case.jpg` in particular is a 400 px Elementor
  thumbnail and is soft at full width.
- **Check the partner logos.** They are third-party marks shown as references. The client
  presumably has permission; we should confirm it rather than assume it carries over.

The partner rail applies `mix-blend-mode: multiply` so the white-background JPEGs sit on the
light rail without boxes around them. If a logo is ever supplied with a transparent background
and a dark mark, that rule still works; a white mark on transparent would not.
