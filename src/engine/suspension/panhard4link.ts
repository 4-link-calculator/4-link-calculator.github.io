import { isInfinite } from "../geometry/point";
import { instantCenter_xz, type Vector } from "../geometry/vector";
import type { RollCenter } from "./rollcenter";
import type {
    FrontSuspension,
    RearSuspension,
    SolidAxleSuspensionVectors,
} from "./suspension";

export class Panhard4LinkFront implements FrontSuspension {
    UpperLink: Vector;
    RightLowerLink: Vector;
    PanhardBar: Vector;

    constructor(UpperLink: Vector, rightLowerLink: Vector, panhardBar: Vector) {
        this.UpperLink = UpperLink;
        this.RightLowerLink = rightLowerLink;
        this.PanhardBar = panhardBar;
    }
    CalculateRollCenter(_: number): RollCenter {
        return { rollCenterHeight: 0, rollCenterInclination: 0 };
    }

    CalculateAntiDive(
        cgHeight: number,
        wheelbase: number,
        _: number,
        brakeBias: number
    ): number {
        const svsa = instantCenter_xz(this.UpperLink, this.RightLowerLink);
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
        const svsa = instantCenter_xz(this.UpperLink, this.RightLowerLink);
        const frontLeverArm = wheelbase - svsa.x;
        return isInfinite(svsa)
            ? 0
            : Math.abs(frontLeverArm) < 1e-6
              ? 0
              : driveBias * (wheelbase / cgHeight) * (svsa.z / frontLeverArm);
    }

    solidAxleSuspensionVectors(): SolidAxleSuspensionVectors {
        return {
            upperLink: this.UpperLink,
            lowerLink: this.RightLowerLink,
        };
    }

    withNewVectors(vectors: SolidAxleSuspensionVectors): FrontSuspension {
        return new Panhard4LinkFront(
            vectors.upperLink,
            vectors.lowerLink,
            this.PanhardBar
        );
    }
}

export class Panhard4LinkRear implements RearSuspension {
    UpperLink: Vector;
    RightLowerLink: Vector;

    constructor(UpperLink: Vector, rightLowerLink: Vector) {
        this.UpperLink = UpperLink;
        this.RightLowerLink = rightLowerLink;
    }
    CalculateRollCenter(_: number): RollCenter {
        return { rollCenterHeight: 0, rollCenterInclination: 0 };
    }

    CalculateAntiLift(
        cgHeight: number,
        wheelbase: number,
        _: number,
        brakeBias: number
    ): number {
        const svsa = instantCenter_xz(this.UpperLink, this.RightLowerLink);
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
        const svsa = instantCenter_xz(this.UpperLink, this.RightLowerLink);
        return isInfinite(svsa)
            ? 0
            : driveBias * (wheelbase / cgHeight) * (svsa.z / svsa.x);
    }

    solidAxleSuspensionVectors(): SolidAxleSuspensionVectors {
        return {
            upperLink: this.UpperLink,
            lowerLink: this.RightLowerLink,
        };
    }

    withNewVectors(vectors: SolidAxleSuspensionVectors): RearSuspension {
        return new Panhard4LinkRear(vectors.upperLink, vectors.lowerLink);
    }
}
