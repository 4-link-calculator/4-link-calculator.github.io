export type Radians = number;
export type Degrees = number;

export function degreesToRadians(degrees: Degrees): Radians {
    return degrees * ( Math.PI / 180 );
}

export function radiansToDegrees(radians: Radians): Degrees {
    return radians * ( 180 / Math.PI );
}
