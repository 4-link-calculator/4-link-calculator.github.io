import {
    chooseClosestPoint,
    INFINITE_POINT,
    solveCircleCircleIntersection_xzPlane,
} from "../geometry/point";
import type { Degrees } from "../geometry/theta";
import { rotateAboutY_fixedWheel, type Vector } from "../geometry/vector";
import type { Result } from "../types";
import type { RollCenter } from "./rollcenter";

export type SuspensionCharacteristics = {
    antiLiftFront: number;
    antiDive: number;
    antiSquat: number;
    antiLiftRear: number;
    rollCenterHeightFront: number;
    rollCenterInclinationFront: Degrees;
    rollCenterHeightRear: number;
    rollCenterInclinationRear: Degrees;
    pinionAngleChangeFront: Degrees;
    pinionAngleChangeRear: Degrees;
};

export interface FrontSuspension {
    // Anti-dive in front suspension reduces bump travel in forward breaking
    CalculateAntiDive(
        cgHeight: number,
        wheelbase: number,
        tireRollingRadius: number,
        brakeBias: number
    ): number;
   
    // Anti-lift in front suspensions reduces drrop travel in forward acceleration. (Only applicable to front wheel drive vehicles)
    CalculateAntiLift(
        cgHeight: number,
        wheelbase: number,
        tireRollingRadius: number,
        driveBias: number
    ): number;
    
    // Roll center
    CalculateRollCenter(wheelbase: number): RollCenter;

    solidAxleSuspensionVectors(): SolidAxleSuspensionVectors;

    withNewVectors(vectors: SolidAxleSuspensionVectors): FrontSuspension;
}

export interface RearSuspension {
    // Anti-lift in rear suspsension reduces droop travel in forward breaking
    CalculateAntiLift(
        cgHeight: number,
        wheelbase: number,
        tireRollingRadius: number,
        brakeBias: number
    ): number;
    
    // Anti-squat in rear suspension reduces bump travel in forward acceleration. (Only applicable to rear wheel drive vehicles)
    CalculateAntiSquat(
        cgHeight: number,
        wheelbase: number,
        tireRollingRadius: number,
        driveBias: number
    ): number;
    
    // Roll center
    CalculateRollCenter(wheelbase: number): RollCenter;

    solidAxleSuspensionVectors(): SolidAxleSuspensionVectors;

    withNewVectors(vectors: SolidAxleSuspensionVectors): RearSuspension;
}

export interface SolidAxleSuspensionVectors {
    upperLink: Vector;
    lowerLink: Vector;
}

export function changeSuspensionHeight(
    fourLink: SolidAxleSuspensionVectors,
    heightDelta: number
): Result<SolidAxleSuspensionVectors> {
    const lowerLink = fourLink.lowerLink;
    const upperLink = fourLink.upperLink;

    const newLowerLink = rotateAboutY_fixedWheel(
        lowerLink,
        lowerLink.chassis.z + heightDelta
    );

    const dx_chassis = newLowerLink.chassis.x - lowerLink.chassis.x;

    const newUpperLinkChassisEnd = {
        x: upperLink.chassis.x + dx_chassis,
        y: upperLink.chassis.y,
        z: upperLink.chassis.z + heightDelta,
    };

    const upperLength = Math.hypot(
        upperLink.wheel.x - upperLink.chassis.x,
        upperLink.wheel.z - upperLink.chassis.z
    );
    const axleSeparation = Math.hypot(
        upperLink.wheel.x - lowerLink.wheel.x,
        upperLink.wheel.z - lowerLink.wheel.z
    );

    const newUpperLinkEnd = chooseClosestPoint(
        solveCircleCircleIntersection_xzPlane(
            newUpperLinkChassisEnd,
            upperLength,
            newLowerLink.wheel,
            axleSeparation,
            upperLink.wheel.y
        ),
        upperLink.wheel
    );

    if (newUpperLinkEnd === INFINITE_POINT) {
        return {
            ok: false,
            error: `Cannot close geometry. Check suspension geometry.`,
        };
    }

    const newUpperLink = {
        chassis: newUpperLinkChassisEnd,
        wheel: newUpperLinkEnd,
    };
    return {
        ok: true,
        value: {
            upperLink: newUpperLink,
            lowerLink: newLowerLink,
        },
    };
}

// up travel = bump travel
export function* upTravelIterator(
    upTravel: number,
    steps: number
): Iterable<number> {
    const stepDelta = upTravel / steps;
    for (let i = 0; i <= steps; i++) {
        yield upTravel - stepDelta * i;
    }
}

// down travel = droop travel
export function* downTravelIterator(
    downTravel: number,
    steps: number
): Iterable<number> {
    const stepDelta = downTravel / steps;
    for (let i = 1; i <= steps; i++) {
        yield stepDelta * i;
    }
}
