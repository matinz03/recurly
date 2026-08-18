// Signed distance field helpers.
//
// Upscaling flat two-tone art by interpolating the mask itself doesn't work:
// bilinear thresholds into visible polygons, and Catmull-Rom overshoots at a
// step edge, notching the outline. A distance field has no step to ring on -
// it varies smoothly everywhere - so interpolating it and thresholding at zero
// reconstructs a smooth contour at any scale.
//
// Exact Euclidean distance via Felzenszwalb & Huttenlocher's O(n) transform,
// run once per axis, on both the inside and the outside.

const INF = 1e20;

// 1D squared-distance transform of a row of function values.
function dt1d(f, n) {
    const d = new Float64Array(n);
    const v = new Int32Array(n);
    const z = new Float64Array(n + 1);
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < n; q++) {
        let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        while (s <= z[k]) {
            k--;
            s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
        }
        k++;
        v[k] = q;
        z[k] = s;
        z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
        while (z[k + 1] < q) k++;
        d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
    }
    return d;
}

// Squared distance from every pixel to the nearest set pixel of `binary`.
function edt(binary, W, H) {
    const f = new Float64Array(W * H);
    for (let i = 0; i < W * H; i++) f[i] = binary[i] ? 0 : INF;

    const col = new Float64Array(H);
    for (let x = 0; x < W; x++) {
        for (let y = 0; y < H; y++) col[y] = f[y * W + x];
        const d = dt1d(col, H);
        for (let y = 0; y < H; y++) f[y * W + x] = d[y];
    }
    const row = new Float64Array(W);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) row[x] = f[y * W + x];
        const d = dt1d(row, W);
        for (let x = 0; x < W; x++) f[y * W + x] = d[x];
    }
    return f;
}

/**
 * Signed distance in source pixels: negative inside the shape, positive
 * outside, zero on the boundary. The half-pixel shift puts the boundary between
 * the last inside pixel and the first outside one, where it actually is.
 */
function buildSdf(binary, W, H) {
    const inv = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) inv[i] = binary[i] ? 0 : 1;

    const dOut = edt(binary, W, H); // distance to shape, for pixels outside
    const dIn = edt(inv, W, H);     // distance to background, for pixels inside

    const sdf = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) {
        sdf[i] = binary[i]
            ? -(Math.sqrt(dIn[i]) - 0.5)
            : Math.sqrt(dOut[i]) - 0.5;
    }
    return sdf;
}

// Bilinear is correct here: the field is smooth, so there is nothing to ring on
// and no kink to threshold into a facet.
function sampleSdf(sdf, W, H, x, y) {
    const cx = x < 0 ? 0 : x > W - 1 ? W - 1 : x;
    const cy = y < 0 ? 0 : y > H - 1 ? H - 1 : y;
    // Clamping is safe because the caller pads the masks before building the
    // field, so the border of the padded canvas really is outside the shape.
    return sampleSdfClamped(sdf, W, H, cx, cy);
}

function sampleSdfClamped(sdf, W, H, cx, cy) {
    const x0 = Math.floor(cx), y0 = Math.floor(cy);
    const x1 = x0 + 1 > W - 1 ? W - 1 : x0 + 1;
    const y1 = y0 + 1 > H - 1 ? H - 1 : y0 + 1;
    const fx = cx - x0, fy = cy - y0;
    const a = sdf[y0 * W + x0], b = sdf[y0 * W + x1];
    const c = sdf[y1 * W + x0], d = sdf[y1 * W + x1];
    return (
        a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy
    );
}

module.exports = { buildSdf, sampleSdf };
