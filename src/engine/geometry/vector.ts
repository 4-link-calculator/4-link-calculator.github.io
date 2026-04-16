import { INFINITE_POINT, type Point } from "./point";
import { radiansToDegrees , type Degrees, type Radians } from "./theta";


export type Vector = {
    chassis: Point;
    wheel: Point;
};

/*
    Will use standard right hand rule for coordinate system:
    - X axis will be inline with the length of the vehicle, positive is in the direction of the front of the vehicle
        - Roll is defined as the rotation about the x-axis
        - Positive roll is defined as the right side of the vehicle rising and the left side of the vehicle falling
    - Y axis will be inline with the width of the vehicle, positive is in the direction of the right side of the vehicle
        - Pitch is defined as the rotation about the y-axis
        - Positive pitch is defined as the front of the vehicle rising and the rear of the vehicle falling
    - Z axis will be inline with the height of the vehicle, positive is in the direction of the top of the vehicle
        - Yaw is defined as the rotation about the z-axis
        - Positive yaw is defined as the front of the vehicle rotating right and the rear of the vehicle rotating left
        
    The X origin will be inline with the center of the rear tire's contact patch
    The Y origin will be inline with the centerline of the vehicle
    The Z origin will be inline with the ground plane
*/

//used as a simple validation to check travel limits of a link for the IO layer. If passes, then link is assumed to be able to reach all point between the jounce and rebound travel.
export function canReachZ_in_xzPlane(
    vector: Vector,
    rotationCenter: Point,
    z: number
): boolean {
    const dx = vector.wheel.x - vector.chassis.x;
    const dz = vector.wheel.z - vector.chassis.z;
    const radius = Math.hypot(dx, dz);
    return Math.abs(z - rotationCenter.z) <= radius;
}

export function translateBy(vector: Vector, dx: number, dy: number, dz: number): Vector {
    return {
        chassis: {
            x: vector.chassis.x + dx,
            y: vector.chassis.y + dy,
            z: vector.chassis.z + dz,
        },
        wheel: {
            x: vector.wheel.x + dx,
            y: vector.wheel.y + dy,
            z: vector.wheel.z + dz,
        },
    };
}

export function calculateSlope_xz(vector: Vector): number {
    return ((vector.wheel.z - vector.chassis.z) / (vector.wheel.x - vector.chassis.x));
}


function solveCircle(
    cx: number,
    cz: number,
    radius: number,
    z: number,
    sign: number
): number {
    const dz = z - cz;
    const dx = Math.sqrt(Math.max(0, radius * radius - dz * dz));
    return cx + sign * dx;
}

export function mirrorAboutXZPlane(vector: Vector): Vector {
    const mirroredChassisY = -vector.chassis.y;
    const mirroredWheelY = -vector.wheel.y;

    return {
        chassis: {
            ...vector.chassis,
            y: Object.is(mirroredChassisY, -0) ? 0 : mirroredChassisY,
        },
        wheel: {
            ...vector.wheel,
            y: Object.is(mirroredWheelY, -0) ? 0 : mirroredWheelY,
        },
    };
}

export function rotateAboutY_fixedChassis(vector: Vector, z: number): Vector {
    const { chassis: c, wheel: w } = vector;

    const dx = w.x - c.x;
    const dz = w.z - c.z;

    const radius = Math.hypot(dx, dz);

    const sign = dx < 0 ? -1 : 1;
    const newX = solveCircle(c.x, c.z, radius, z, sign);

    return {
        chassis: { ...c },
        wheel: { x: newX, y: w.y, z },
    };
}

export function rotateAboutY_fixedWheel(vector: Vector, z: number): Vector {
    const { chassis: chassisPoint, wheel: wheelPoint } = vector;

    const linkLenX = chassisPoint.x - wheelPoint.x;
    const linkLenZ = chassisPoint.z - wheelPoint.z;

    const radius = Math.hypot(linkLenX, linkLenZ);

    const sign = linkLenX < 0 ? -1 : 1;
    const newX = solveCircle(wheelPoint.x, wheelPoint.z, radius, z, sign);

    return {
        chassis: { x: newX, y: chassisPoint.y, z },
        wheel: { ...wheelPoint },
    };
}

function rotatePointAboutY(point: Point, center: Point, theta: Radians): Point {
    const dx = point.x - center.x;
    const dz = point.z - center.z;

    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    return {
        x: center.x + dx * cosTheta - dz * sinTheta,
        y: point.y,
        z: center.z + dx * sinTheta + dz * cosTheta,
    };
}

export function rotateAboutYradians_fixedChassis(
    vector: Vector,
    theta: Radians
): Vector {
    return {
        chassis: { ...vector.chassis },
        wheel: rotatePointAboutY(vector.wheel, vector.chassis, theta),
    };
}

export function rotateAboutYradians_fixedWheel(
    vector: Vector,
    theta: Radians
): Vector {
    return {
        chassis: rotatePointAboutY(vector.chassis, vector.wheel, theta),
        wheel: { ...vector.wheel },
    };
}

const TOLERANCE = 1e-4;

/**
 * @returns the intersection of two links projected in the xy plane.
 * @remarks xy plane would be top down view, so z is ignored
 **/
export function instantCenter_xy(link1: Vector, link2: Vector): Point {
    const dx1 = link1.wheel.x - link1.chassis.x;
    const dy1 = link1.wheel.y - link1.chassis.y;
    const dx2 = link2.wheel.x - link2.chassis.x;
    const dy2 = link2.wheel.y - link2.chassis.y;

    const denominator = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(denominator) < TOLERANCE) {
        // vectors are parallel in the xy plane
        return INFINITE_POINT;
    }

    const det1 =
        link1.chassis.x * link1.wheel.y - link1.chassis.y * link1.wheel.x;
    const det2 =
        link2.chassis.x * link2.wheel.y - link2.chassis.y * link2.wheel.x;

    return {
        x: (dx1 * det2 - det1 * dx2) / denominator,
        y: (dy1 * det2 - det1 * dy2) / denominator,
        z: 0,
    };
} // xy plane would be top down view, so z is ignored

/**
 * @returns the intersection of two links projected in the xz plane.
 * @remarks Will use standard right hand rule for coordinate system:
    - X axis will be inline with the lenght of the vehicle, roll is defined as the rotation about the x-axis
    - Y axis will be inline with the width of the vehicle, pitch is defined as the rotation about the y-axis
    - Z axis will be inline with the height of the vehicle, yaw is defined as the rotation about the z-axis
*
**/
export function instantCenter_xz(link1: Vector, link2: Vector): Point {
    const dx1 = link1.wheel.x - link1.chassis.x;
    const dz1 = link1.wheel.z - link1.chassis.z;
    const dx2 = link2.wheel.x - link2.chassis.x;
    const dz2 = link2.wheel.z - link2.chassis.z;

    const denominator = dx1 * dz2 - dz1 * dx2;
    if (Math.abs(denominator) < TOLERANCE) {
        // Vectors are parallel in the xz plane
        return INFINITE_POINT;
    }

    const det1 =
        link1.chassis.x * link1.wheel.z - link1.chassis.z * link1.wheel.x;
    const det2 =
        link2.chassis.x * link2.wheel.z - link2.chassis.z * link2.wheel.x;

    return {
        x: (dx1 * det2 - det1 * dx2) / denominator,
        y: 0,
        z: (dz1 * det2 - det1 * dz2) / denominator,
    };
} // xz plane would be side view, so y is ignored

/**
 * @returns the intersection of two links projected in the yz plane.
 * @remarks Will use standard right hand rule for coordinate system:
    - X axis will be inline with the lenght of the vehicle, roll is defined as the rotation about the x-axis
    - Y axis will be inline with the width of the vehicle, pitch is defined as the rotation about the y-axis
    - Z axis will be inline with the height of the vehicle, yaw is defined as the rotation about the z-axis
*
**/
export function instantCenter_yz(link1: Vector, link2: Vector): Point {
    const dy1 = link1.wheel.y - link1.chassis.y;
    const dz1 = link1.wheel.z - link1.chassis.z;
    const dy2 = link2.wheel.y - link2.chassis.y;
    const dz2 = link2.wheel.z - link2.chassis.z;

    const denominator = dy1 * dz2 - dz1 * dy2;
    if (Math.abs(denominator) < TOLERANCE) {
        // Vectors are parallel in the yz plane
        return INFINITE_POINT;
    }

    const det1 =
        link1.chassis.y * link1.wheel.z - link1.chassis.z * link1.wheel.y;
    const det2 =
        link2.chassis.y * link2.wheel.z - link2.chassis.z * link2.wheel.y;

    return {
        x: 0,
        y: (dy1 * det2 - det1 * dy2) / denominator,
        z: (dz1 * det2 - det1 * dz2) / denominator,
    };
} // yz plane would be front view, so x is ignored

export function angleBetweenVectors_xz(v1: Vector, v2: Vector): Degrees {
    const v1dx = v1.wheel.x - v1.chassis.x;
    const v1dz = v1.wheel.z - v1.chassis.z;
    const v2dx = v2.wheel.x - v2.chassis.x;
    const v2dz = v2.wheel.z - v2.chassis.z;
    
    const dotProduct = v1dx * v2dx + v1dz * v2dz;
    const cross = v1dx * v2dz - v1dz * v2dx;   

    // If either vector has zero length in the xz plane, define angle change as 0
  if ((v1dx === 0 && v1dz === 0) || (v2dx === 0 && v2dz === 0)) {
    return 0;
  }

  const signedRadians = Math.atan2(cross, dotProduct);
  return radiansToDegrees(signedRadians);
}
