// Builds the icon set from the real brand mark at assets/icons/logo.png.
//
// The source is only 256x256 and the app icon needs 1024, so this does not
// blur-upscale it. Each of the mark's two flat regions becomes a signed
// distance field, which is interpolated and thresholded at zero - see sdf.js
// for why a distance field and not the mask itself. 4x supersampling does the
// antialiasing. The result is crisp at any scale rather than inheriting 256px
// softness.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
// Written straight into the project; the proofs go to a scratch dir if asked.
const OUT = process.argv[2] || ROOT;
const { PNG } = require('pngjs');

const CREAM = [0xff, 0xf9, 0xe3];
const INK = [0x08, 0x11, 0x26];
const SS = 4;

const src = PNG.sync.read(fs.readFileSync(path.join(ROOT, 'assets/icons/logo.png')));
const W = src.width;
const H = src.height;

// Two masks and the mark's own colour, read straight off the source so nothing
// here hardcodes a palette the logo might not actually use.
const solidBin = new Uint8Array(W * H);   // inside the stub at all
const letterBin = new Uint8Array(W * H);  // the lighter of the two fills
let markColor = null;

for (let i = 0; i < W * H; i++) {
    const a = src.data[(i << 2) + 3] / 255;
    const r = src.data[i << 2];
    const g = src.data[(i << 2) + 1];
    const b = src.data[(i << 2) + 2];
    solidBin[i] = a > 0.5 ? 1 : 0;
    // The letter is the light fill; the ground is the saturated one.
    const lum = (r + g + b) / 3;
    letterBin[i] = a > 0.5 && lum > 200 ? 1 : 0;
    if (a > 0.9 && lum <= 200 && !markColor) markColor = [r, g, b];
}
console.log('source mark colour:', markColor.map((c) => c.toString(16)).join(''));

const { buildSdf, sampleSdf } = require('./sdf.js');

// The mark fills its own canvas, so its outer edges are where the artwork was
// cropped, not where the shape ends - the field had no "outside" to measure and
// reported the whole canvas as inside. Padding gives every edge a real
// boundary. PW/PH are the padded dimensions everything samples against.
const PAD = 8;
const PW = W + PAD * 2;
const PH = H + PAD * 2;

const pad = (mask) => {
    const out = new Uint8Array(PW * PH);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            out[(y + PAD) * PW + (x + PAD)] = mask[y * W + x];
        }
    }
    return out;
};

const solidSdf = buildSdf(pad(solidBin), PW, PH);
const letterSdf = buildSdf(pad(letterBin), PW, PH);

/**
 * @param size      output edge in px
 * @param ground    background colour, or null for transparent
 * @param markFrac  the mark's edge as a fraction of `size`
 * @param mono      draw the stub in one flat colour and knock the letter out,
 *                  for Android's themed-icon layer
 */
function render({ size, ground, markFrac, mono = false }) {
    const png = new PNG({ width: size, height: size });
    const S = size * SS;
    const m = S * markFrac;
    const off = (S - m) / 2;

    for (let py = 0; py < size; py++) {
        for (let px = 0; px < size; px++) {
            let acc = [0, 0, 0, 0];
            for (let sy = 0; sy < SS; sy++) {
                for (let sx = 0; sx < SS; sx++) {
                    const x = px * SS + sx + 0.5;
                    const y = py * SS + sy + 0.5;
                    // Into source pixel space.
                    const u = ((x - off) / m) * W + PAD;
                    const v = ((y - off) / m) * H + PAD;

                    let c = ground ? [...ground, 255] : [0, 0, 0, 0];
                    if (sampleSdf(solidSdf, PW, PH, u, v) < 0) {
                        const isLetter = sampleSdf(letterSdf, PW, PH, u, v) < 0;
                        if (mono) {
                            // Letter knocked out so the glyph still reads once
                            // the system tints the opaque area.
                            c = isLetter ? [0, 0, 0, 0] : [...INK, 255];
                        } else {
                            c = isLetter ? [...CREAM, 255] : [...markColor, 255];
                        }
                    }
                    acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]; acc[3] += c[3];
                }
            }
            const n = SS * SS;
            const i = (py * size + px) << 2;
            png.data[i] = Math.round(acc[0] / n);
            png.data[i + 1] = Math.round(acc[1] / n);
            png.data[i + 2] = Math.round(acc[2] / n);
            png.data[i + 3] = Math.round(acc[3] / n);
        }
    }
    return png;
}

function write(rel, png) {
    const file = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, PNG.sync.write(png));
    console.log(`${rel}  ${png.width}x${png.height}  ${(fs.statSync(file).size / 1024).toFixed(1)} KB`);
}

const A = 'assets/images';

// iOS/web: cream ground, mark at 64% so it survives a circular mask too.
write(`${A}/icon.png`, render({ size: 1024, ground: CREAM, markFrac: 0.64 }));

// Android adaptive: the foreground's guaranteed-visible area is the centre
// 66/108 of the layer, so the mark stays well inside it.
write(`${A}/android-icon-foreground.png`, render({ size: 1024, ground: null, markFrac: 0.52 }));
write(`${A}/android-icon-background.png`, render({ size: 1024, ground: CREAM, markFrac: 0.0001 }));
write(`${A}/android-icon-monochrome.png`, render({ size: 1024, ground: null, markFrac: 0.52, mono: true }));

// Splash: transparent; the plugin scales it to 200px wide over backgroundColor.
write(`${A}/splash-icon.png`, render({ size: 1024, ground: null, markFrac: 0.86 }));

write(`${A}/favicon.png`, render({ size: 48, ground: CREAM, markFrac: 0.72 }));

// Proofs at real launcher sizes, only when an output dir is passed explicitly -
// they are for eyeballing a change, not part of the app.
if (process.argv[2]) {
    write('proof-48.png', render({ size: 48, ground: CREAM, markFrac: 0.64 }));
    write('proof-96.png', render({ size: 96, ground: CREAM, markFrac: 0.64 }));
    write('proof-192.png', render({ size: 192, ground: CREAM, markFrac: 0.64 }));
}
