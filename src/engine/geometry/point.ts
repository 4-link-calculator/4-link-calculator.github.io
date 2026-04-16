export type Point = {
    x: number;
    y: number;
    z: number;
};

export function mirrorAboutXZPlane(point: Point): Point {
    return { x: point.x, y: point.y === 0 ? 0 : -point.y, z: point.z };
}

export function isInfinite(point: Point): boolean {
    return (
        point.x === Number.POSITIVE_INFINITY &&
        point.y === Number.POSITIVE_INFINITY &&
        point.z === Number.POSITIVE_INFINITY
    );
}

export const INFINITE_POINT: Point = {
    x: Number.POSITIVE_INFINITY,
    y: Number.POSITIVE_INFINITY,
    z: Number.POSITIVE_INFINITY,
};

export function solveCircleCircleIntersection_xzPlane(
    center1: Point,
    radius1: number,
    center2: Point,
    radius2: number,
    yValue: number
): Point[] {
    const dx = center2.x - center1.x;
    const dz = center2.z - center1.z;
    const d = Math.hypot(dx, dz);

    if (d > radius1 + radius2 || d < Math.abs(radius1 - radius2)) {
        return [];
    }
    const a = (radius1 * radius1 - radius2 * radius2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, radius1 * radius1 - a * a));

    const xm = center1.x + (a * dx) / d;
    const zm = center1.z + (a * dz) / d;

    const rx = -dz * (h / d);
    const rz = dx * (h / d);

    return [
        { x: xm + rx, y: yValue, z: zm + rz },
        { x: xm - rx, y: yValue, z: zm - rz },
    ];
}

export function chooseClosestPoint(points: Point[], reference: Point): Point {
    if (points.length === 0) {
        return INFINITE_POINT;
    }
    const sqDist0 =
        (points[0].x - reference.x) ** 2 + (points[0].z - reference.z) ** 2;
    const sqDist1 =
        (points[1].x - reference.x) ** 2 + (points[1].z - reference.z) ** 2;
    return sqDist0 < sqDist1 ? points[0] : points[1];
}
