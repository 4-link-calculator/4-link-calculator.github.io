import { INFINITE_POINT, isInfinite, type Point } from "../geometry/point";
import { radiansToDegrees } from "../geometry/theta";
import { translateBy, calculateSlope_xz, mirrorAboutXZPlane, instantCenter_xy, instantCenter_xz, type Vector } from "../geometry/vector";
import { type RollCenter } from "./rollcenter";
import type {
    FrontSuspension,
    RearSuspension,
    SolidAxleSuspensionVectors,
} from "./suspension";

export class Triangulated4LinkFront implements FrontSuspension {
    RightUpperLink: Vector;
    RightLowerLink: Vector;

    constructor(leftUpperLink: Vector, leftLowerLink: Vector) {
        this.RightUpperLink = leftUpperLink;
        this.RightLowerLink = leftLowerLink;
    }

    CalculateAntiDive(
        cgHeight: number,
        wheelbase: number,
        _: number,
        brakeBias: number
    ): number {
        const svsa = instantCenter_xz(this.RightUpperLink, this.RightLowerLink);
        const frontLeverArm = wheelbase - svsa.x;
        return isInfinite(svsa)
            ? 0
            : Math.abs(frontLeverArm) < 1e-6
              ? 0
              : brakeBias * (wheelbase / cgHeight) * (svsa.z / frontLeverArm);
    }

    CalculateAntiLift(
        cgHeight: number,
        wheelbase: number,
        _: number,
        driveBias: number
    ): number {
        const svsa = instantCenter_xz(this.RightUpperLink, this.RightLowerLink);
        const frontLeverArm = wheelbase - svsa.x;
        return isInfinite(svsa)
            ? 0
            : Math.abs(frontLeverArm) < 1e-6
              ? 0
              : driveBias * (wheelbase / cgHeight) * (svsa.z / frontLeverArm);
    }

    solidAxleSuspensionVectors(): SolidAxleSuspensionVectors {
        return {
            upperLink: this.RightUpperLink,
            lowerLink: this.RightLowerLink,
        };
    }
    
    CalculateRollCenter(wheelbase: number): RollCenter {
        const lowerInstantCenter_xy = instantCenter_xy(this.RightLowerLink, mirrorAboutXZPlane(this.RightLowerLink));
        const upperInstantCenter_xy = instantCenter_xy(this.RightUpperLink, mirrorAboutXZPlane(this.RightUpperLink));
        // TODO: I need to get the z value of the intersection. currently getting set to 0 by the above instantCenter methods
        const isLowerInfinite = isInfinite(lowerInstantCenter_xy);
        const isUpperInfinite = isInfinite(upperInstantCenter_xy);
        
        const lowerInstantCenter = isLowerInfinite ? INFINITE_POINT : instantCenter_xz(this.RightLowerLink, { chassis: { x: lowerInstantCenter_xy.x, y: 0, z: -50 } , wheel: { x: lowerInstantCenter_xy.x, y: 0, z: 0 } });
        const upperInstantCenter = isUpperInfinite ? INFINITE_POINT : instantCenter_xz(this.RightUpperLink, { chassis: { x: upperInstantCenter_xy.x, y: 0, z: -50 } , wheel: { x: upperInstantCenter_xy.x, y: 0, z: 0 } });

        const wheelbaseVector: Vector = {
            chassis: { x: wheelbase, y: 0, z: -100 },
            wheel: { x: wheelbase, y: 0, z: 0 },
        };
        let rollCenterAxis: Vector;
        if (isLowerInfinite && isUpperInfinite) {
            return { rollCenterHeight: 0, rollCenterInclination: 0 };
        }
        else if (isLowerInfinite) {
            rollCenterAxis = CalculateRollCenterAxis_LowerParallel(upperInstantCenter, this.RightLowerLink);
           }
        else if (isUpperInfinite) {
            rollCenterAxis = CalculateRollCenterAxis_UpperParallel(this.RightUpperLink, lowerInstantCenter);
        }
        else {
            rollCenterAxis = CalculateRollCenterAxis_DoubleTriangulated(upperInstantCenter, lowerInstantCenter);
        }

        const rollCenterPoint = instantCenter_xz(rollCenterAxis, wheelbaseVector);
        const slope = calculateSlope_xz(rollCenterAxis);
        const finiteHeight = isInfinite(rollCenterPoint) || Number.isNaN(rollCenterPoint.z)
            ? 0
            : rollCenterPoint.z;
        const finiteInclination = Number.isFinite(slope)
            ? radiansToDegrees(Math.atan(slope))
            : 0;

        return {
            rollCenterHeight: finiteHeight,
            rollCenterInclination: finiteInclination,
        };

    }

    withNewVectors(vectors: SolidAxleSuspensionVectors): FrontSuspension {
        return new Triangulated4LinkFront(vectors.upperLink, vectors.lowerLink);
    }
}

export class Triangulated4LinkRear implements RearSuspension {
    RightUpperLink: Vector;
    RightLowerLink: Vector;

    constructor(UpperLink: Vector, rightLowerLink: Vector) {
        this.RightUpperLink = UpperLink;
        this.RightLowerLink = rightLowerLink;
    }

    CalculateAntiLift(
        cgHeight: number,
        wheelbase: number,
        _: number,
        brakeBias: number
    ): number {
        const svsa = instantCenter_xz(this.RightUpperLink, this.RightLowerLink);
        return isInfinite(svsa)
            ? 0
            : brakeBias * (wheelbase / cgHeight) * (svsa.z / svsa.x);
    }

    CalculateAntiSquat(
        cgHeight: number,
        wheelbase: number,
        _: number,
        driveBias: number
    ): number {
        const svsa = instantCenter_xz(this.RightUpperLink, this.RightLowerLink);
        return isInfinite(svsa)
            ? 0
            : driveBias * (wheelbase / cgHeight) * (svsa.z / svsa.x);
    }
    
    CalculateRollCenter(_: number): RollCenter {
        const lowerInstantCenter_xy = instantCenter_xy(this.RightLowerLink, mirrorAboutXZPlane(this.RightLowerLink));
        const upperInstantCenter_xy = instantCenter_xy(this.RightUpperLink, mirrorAboutXZPlane(this.RightUpperLink));
        const isLowerInfinite = isInfinite(lowerInstantCenter_xy);
        const isUpperInfinite = isInfinite(upperInstantCenter_xy);
        
        const lowerInstantCenter = isLowerInfinite ? INFINITE_POINT : instantCenter_xz(this.RightLowerLink, { chassis: { x: lowerInstantCenter_xy.x, y: 0, z: -50 } , wheel: { x: lowerInstantCenter_xy.x, y: 0, z: 0 } });
        const upperInstantCenter = isUpperInfinite ? INFINITE_POINT : instantCenter_xz(this.RightUpperLink, { chassis: { x: upperInstantCenter_xy.x, y: 0, z: -50 } , wheel: { x: upperInstantCenter_xy.x, y: 0, z: 0 } });
        
        const wheelbaseVector: Vector = {
            chassis: { x: 0, y: 0, z: -100 },
            wheel: { x: 0, y: 0, z: 0 },
        };
        let rollCenterAxis: Vector;
        if (isLowerInfinite && isUpperInfinite) {
            return { rollCenterHeight: 0, rollCenterInclination: 0 };
        }
        else if (isLowerInfinite) {
            rollCenterAxis = CalculateRollCenterAxis_LowerParallel(upperInstantCenter, this.RightLowerLink);
           }
        else if (isUpperInfinite) {
            rollCenterAxis = CalculateRollCenterAxis_UpperParallel(this.RightUpperLink, lowerInstantCenter);
        }
        else {
            rollCenterAxis = CalculateRollCenterAxis_DoubleTriangulated(upperInstantCenter, lowerInstantCenter);
        }

        const rollCenterPoint = instantCenter_xz(rollCenterAxis, wheelbaseVector);
        const slope = calculateSlope_xz(rollCenterAxis);
        const finiteHeight = isInfinite(rollCenterPoint) || Number.isNaN(rollCenterPoint.z)
            ? 0
            : rollCenterPoint.z;
        const finiteInclination = Number.isFinite(slope)
            ? radiansToDegrees(Math.atan(slope))
            : 0;

        return {
            rollCenterHeight: finiteHeight,
            rollCenterInclination: -finiteInclination,
        };
    }

    solidAxleSuspensionVectors(): SolidAxleSuspensionVectors {
        return {
            upperLink: this.RightUpperLink,
            lowerLink: this.RightLowerLink,
        };
    }

    withNewVectors(vectors: SolidAxleSuspensionVectors): RearSuspension {
        return new Triangulated4LinkRear(vectors.upperLink, vectors.lowerLink);
    }
}

function CalculateRollCenterAxis_DoubleTriangulated(upperIC: Point, lowerIC: Point): Vector{
    return {
        chassis: { x: lowerIC.x, y: 0, z: lowerIC.z },
        wheel: { x: upperIC.x, y: 0, z: upperIC.z },
    };
 }
function CalculateRollCenterAxis_LowerParallel(upperIC: Point, lowerVector: Vector): Vector{
    return translateBy(lowerVector, upperIC.x - lowerVector.chassis.x, 0, upperIC.z - lowerVector.chassis.z);
 }
function CalculateRollCenterAxis_UpperParallel(upperVector: Vector, lowerIC: Point): Vector{
    return translateBy(upperVector, lowerIC.x - upperVector.chassis.x, 0, lowerIC.z - upperVector.chassis.z);
 }

