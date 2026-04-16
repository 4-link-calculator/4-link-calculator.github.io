import {
    changeSuspensionHeight,
    type SuspensionCharacteristics,
    type FrontSuspension,
    type RearSuspension,
    upTravelIterator,
    downTravelIterator,
    type SolidAxleSuspensionVectors,
} from "./suspension";
import { type RollCenter } from "./rollcenter";
import { angleBetweenVectors_xz, type Vector } from "../geometry/vector";

export type AnalysisResult = {
    zDelta: number;
    characteristics: SuspensionCharacteristics;
};

export class Vehicle {
    frontSuspension: FrontSuspension;
    rearSuspension: RearSuspension;
    cgHeight: number;
    wheelbase: number;
    frontBrakeBias: number;
    frontDriveBias: number;
    tireRollingRadius: number;

    constructor(
        frontSuspension: FrontSuspension,
        rearSuspension: RearSuspension,
        cgHeight: number,
        wheelbase: number,
        frontBrakeBias: number,
        frontDriveBias: number,
        tireRollingRadius: number
    ) {
        this.frontSuspension = frontSuspension;
        this.rearSuspension = rearSuspension;
        this.cgHeight = cgHeight;
        this.wheelbase = wheelbase;
        this.frontBrakeBias = frontBrakeBias;
        this.frontDriveBias = frontDriveBias;
        this.tireRollingRadius = tireRollingRadius;
    }

    CalculateAntiSquat(): number {
        return this.rearSuspension.CalculateAntiSquat(
            this.cgHeight,
            this.wheelbase,
            this.tireRollingRadius,
            1 - this.frontDriveBias
        );
    }

    CalculateAntiLiftRear(): number {
        return this.rearSuspension.CalculateAntiLift(
            this.cgHeight,
            this.wheelbase,
            this.tireRollingRadius,
            1 - this.frontBrakeBias
        );
    }

    CalculateAntiDive(): number {
        return this.frontSuspension.CalculateAntiDive(
            this.cgHeight,
            this.wheelbase,
            this.tireRollingRadius,
            this.frontBrakeBias
        );
    }

    CalculateAntiLiftFront(): number {
        return this.frontSuspension.CalculateAntiLift(
            this.cgHeight,
            this.wheelbase,
            this.tireRollingRadius,
            this.frontDriveBias
        );
    }
    
    CalculateFrontRollCenter(): RollCenter {
        return this.frontSuspension.CalculateRollCenter(this.wheelbase);
    }
    
    CalculateRearRollCenter(): RollCenter {
        return this.rearSuspension.CalculateRollCenter(this.wheelbase);
    }
}

export function changeHeight(vehicle: Vehicle, heightDelta: number): Vehicle {
    const frontSuspension =
        vehicle.frontSuspension.solidAxleSuspensionVectors();
    const rearSuspension = vehicle.rearSuspension.solidAxleSuspensionVectors();

    const newFrontSuspensionResult = changeSuspensionHeight(
        frontSuspension,
        heightDelta
    );
    const newRearSuspensionResult = changeSuspensionHeight(
        rearSuspension,
        heightDelta
    );

    const newFrontSuspension = newFrontSuspensionResult.ok
        ? newFrontSuspensionResult.value
        : frontSuspension;
    const newRearSuspension = newRearSuspensionResult.ok
        ? newRearSuspensionResult.value
        : rearSuspension;

    const validGeometry =
        newFrontSuspensionResult.ok || newRearSuspensionResult.ok;

    const newCgHeight = validGeometry
        ? vehicle.cgHeight + heightDelta
        : vehicle.cgHeight;

    const deltaXFront =
        newFrontSuspension.lowerLink.wheel.x -
        frontSuspension.lowerLink.wheel.x;
    const deltaXRear =
        newRearSuspension.lowerLink.wheel.x - rearSuspension.lowerLink.wheel.x;

    const newWheelbase = vehicle.wheelbase + deltaXRear - deltaXFront;

    return new Vehicle(
        vehicle.frontSuspension.withNewVectors(newFrontSuspension),
        vehicle.rearSuspension.withNewVectors(newRearSuspension),
        newCgHeight,
        newWheelbase,
        vehicle.frontBrakeBias,
        vehicle.frontDriveBias,
        vehicle.tireRollingRadius
    );
}

export function* analyzeTravel(
    vehicle: Vehicle,
    upTravel: number,
    downTravel: number,
    steps: number
): Iterable<AnalysisResult> {
    // first starting from the max bump and working towards reference
    for (const height of upTravelIterator(
        upTravel,
        steps * (upTravel / (upTravel + Math.abs(downTravel)))
    )) {
        const currentVehicle: Vehicle = changeHeight(vehicle, height);
        const rollCenterFront = currentVehicle.CalculateFrontRollCenter();
        const rollCenterRear = currentVehicle.CalculateRearRollCenter();
        const characteristics: SuspensionCharacteristics = {
            antiSquat: currentVehicle.CalculateAntiSquat(),
            antiLiftRear: currentVehicle.CalculateAntiLiftRear(),
            antiDive: currentVehicle.CalculateAntiDive(),
            antiLiftFront: currentVehicle.CalculateAntiLiftFront(),
            rollCenterHeightFront: rollCenterFront.rollCenterHeight,
            rollCenterInclinationFront: rollCenterFront.rollCenterInclination,
            rollCenterHeightRear: rollCenterRear.rollCenterHeight,
            rollCenterInclinationRear: rollCenterRear.rollCenterInclination,
            pinionAngleChangeFront: angleBetweenVectors_xz(GetWheelSideVector_xz(currentVehicle.frontSuspension.solidAxleSuspensionVectors()), GetWheelSideVector_xz(vehicle.frontSuspension.solidAxleSuspensionVectors())),
            pinionAngleChangeRear: angleBetweenVectors_xz(GetWheelSideVector_xz(currentVehicle.rearSuspension.solidAxleSuspensionVectors()), GetWheelSideVector_xz(vehicle.rearSuspension.solidAxleSuspensionVectors())),

        };
        yield { zDelta: height, characteristics };
    }

    // finish by starting from reference and working towards max droop
    for (const height of downTravelIterator(
        downTravel,
        steps * (Math.abs(downTravel) / (upTravel + Math.abs(downTravel)))
    )) {
        const currentVehicle: Vehicle = changeHeight(vehicle, height);
        const rollCenterFront = currentVehicle.CalculateFrontRollCenter();
        const rollCenterRear = currentVehicle.CalculateRearRollCenter();
        const currentCharacteristics: SuspensionCharacteristics = {
            antiSquat: currentVehicle.CalculateAntiSquat(),
            antiLiftRear: currentVehicle.CalculateAntiLiftRear(),
            antiDive: currentVehicle.CalculateAntiDive(),
            antiLiftFront: currentVehicle.CalculateAntiLiftFront(),
            rollCenterHeightFront: rollCenterFront.rollCenterHeight,
            rollCenterInclinationFront: rollCenterFront.rollCenterInclination,
            rollCenterHeightRear: rollCenterRear.rollCenterHeight,
            rollCenterInclinationRear: rollCenterRear.rollCenterInclination,
            pinionAngleChangeFront: angleBetweenVectors_xz(GetWheelSideVector_xz(currentVehicle.frontSuspension.solidAxleSuspensionVectors()), GetWheelSideVector_xz(vehicle.frontSuspension.solidAxleSuspensionVectors())),
            pinionAngleChangeRear: angleBetweenVectors_xz(GetWheelSideVector_xz(currentVehicle.rearSuspension.solidAxleSuspensionVectors()), GetWheelSideVector_xz(vehicle.rearSuspension.solidAxleSuspensionVectors())),
        };
        yield { zDelta: height, characteristics: currentCharacteristics };
    }
}

function GetWheelSideVector_xz(vectors: SolidAxleSuspensionVectors): Vector{
    return {
        chassis: {
           x: vectors.lowerLink.wheel.x,
           y: 0,
           z: vectors.lowerLink.wheel.z,
        },
        wheel: {
            x: vectors.upperLink.wheel.x,
            y: 0,
            z: vectors.upperLink.wheel.z,
        }
   } 
}