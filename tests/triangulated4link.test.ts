import { changeSuspensionHeight } from "../src/engine/suspension/suspension";
import {
    Triangulated4LinkFront,
    Triangulated4LinkRear,
} from "../src/engine/suspension/triangulated4link";
import { instantCenter_xz } from "../src/engine/geometry/vector";
import { describe, expect, it } from "vitest";

const upperLink = {
    chassis: { x: 25.5, y: 20, z: -29 },
    wheel: { x: 0, y: 10, z: -30 },
};
const lowerLink = {
    chassis: { x: 40, y: 13, z: -22 },
    wheel: { x: 4, y: 19, z: -19.5 },
};

describe("Triangulated4LinkRear", () => {
    it("should calculate a known anti squat", () => {
        const rearSuspension = new Triangulated4LinkRear(upperLink, lowerLink);
        const antiSquat = rearSuspension.CalculateAntiSquat(
            -34.71,
            110,
            NaN,
            0.5
        );
        expect(antiSquat).toBeCloseTo(0.417, 3);
    });
    it("should return 0 for infinite instant center", () => {
        const rearSuspension = new Triangulated4LinkRear(
            {
                chassis: { x: 14, y: NaN, z: 25 },
                wheel: { x: 1, y: NaN, z: 25 },
            },
            {
                chassis: { x: 30, y: NaN, z: 15.6 },
                wheel: { x: 5, y: NaN, z: 15.6 },
            }
        );
        const antiSquat = rearSuspension.CalculateAntiSquat(30, 110, NaN, 1);
        expect(antiSquat).toBe(0);
    });
});

describe("Roll Center", () => {
    it("front should return zero roll-center metrics when both links are laterally parallel", () => {
        const frontSuspension = new Triangulated4LinkFront(
            {
                chassis: { x: 20, y: 8, z: -10 },
                wheel: { x: 0, y: 8, z: -12 },
            },
            {
                chassis: { x: 18, y: 16, z: -18 },
                wheel: { x: 0, y: 16, z: -20 },
            }
        );

        expect(frontSuspension.CalculateRollCenter(110)).toEqual({
            rollCenterHeight: 0,
            rollCenterInclination: 0,
        });
    });

    it("rear should return zero roll-center metrics when both links are laterally parallel", () => {
        const rearSuspension = new Triangulated4LinkRear(
            {
                chassis: { x: 20, y: 8, z: -10 },
                wheel: { x: 0, y: 8, z: -12 },
            },
            {
                chassis: { x: 18, y: 16, z: -18 },
                wheel: { x: 0, y: 16, z: -20 },
            }
        );

        expect(rearSuspension.CalculateRollCenter(0)).toEqual({
            rollCenterHeight: 0,
            rollCenterInclination: 0,
        });
    });

    it("front and rear should return finite roll-center outputs for non-parallel geometry", () => {
        const frontSuspension = new Triangulated4LinkFront(
            {
                chassis: { x: 82, y: 20, z: -29 },
                wheel: { x: 110, y: 10, z: -30 },
            },
            {
                chassis: { x: 65, y: 9, z: -22 },
                wheel: { x: 106, y: 19, z: -20 },
            }
        );
        const rearSuspension = new Triangulated4LinkRear(upperLink, lowerLink);

        const frontRollCenter = frontSuspension.CalculateRollCenter(110);
        const rearRollCenter = rearSuspension.CalculateRollCenter(0);

        expect(Number.isFinite(frontRollCenter.rollCenterHeight)).toBe(true);
        expect(Number.isFinite(frontRollCenter.rollCenterInclination)).toBe(true);
        expect(Number.isFinite(rearRollCenter.rollCenterHeight)).toBe(true);
        expect(Number.isFinite(rearRollCenter.rollCenterInclination)).toBe(true);

        expect(frontRollCenter.rollCenterHeight).not.toBe(0);
        expect(frontRollCenter.rollCenterInclination).not.toBe(0);
        expect(rearRollCenter.rollCenterHeight).not.toBe(0);
        expect(rearRollCenter.rollCenterInclination).not.toBe(0);
    });
});

describe("Triangulated4LinkFront", () => {
    it("uses the front contact patch reference for anti-dive", () => {
        const frontUpperLink = {
            chassis: { x: 82, y: 20, z: -29 },
            wheel: { x: 110, y: 10, z: -30 },
        };
        const frontLowerLink = {
            chassis: { x: 65, y: 9, z: -22 },
            wheel: { x: 106, y: 19, z: -20 },
        };

        const wheelbase = 110;
        const cgHeight = -34.71;
        const brakeBias = 0.7;
        const frontSuspension = new Triangulated4LinkFront(
            frontUpperLink,
            frontLowerLink
        );

        const svsa = instantCenter_xz(frontUpperLink, frontLowerLink);
        const expected =
            brakeBias *
            (wheelbase / cgHeight) *
            (svsa.z / (wheelbase - svsa.x));

        expect(
            frontSuspension.CalculateAntiDive(
                cgHeight,
                wheelbase,
                NaN,
                brakeBias
            )
        ).toBeCloseTo(expected, 12);
    });
});

describe("Triangulated4LinkRear", () => {
    it("should match existing points", () => {
        const rearSuspension = new Triangulated4LinkRear(upperLink, lowerLink);
        const updatedVectors = changeSuspensionHeight(
            rearSuspension.solidAxleSuspensionVectors(),
            +8
        );
        const updatedSuspension = updatedVectors.ok
            ? rearSuspension.withNewVectors(updatedVectors.value)
            : rearSuspension;

        console.debug(
            "Upper Link\r\n\t Frame wheel: ",
            updatedSuspension.solidAxleSuspensionVectors().upperLink.chassis
        );

        console.debug(
            "\t Axle wheel: ",
            updatedSuspension.solidAxleSuspensionVectors().upperLink.wheel
        );

        console.debug(
            "\r\nLower Link\r\n\t Frame wheel: ",
            updatedSuspension.solidAxleSuspensionVectors().lowerLink.chassis
        );

        console.debug(
            "\t Axle wheel: ",
            updatedSuspension.solidAxleSuspensionVectors().lowerLink.wheel
        );

        const antiSquat = updatedSuspension.CalculateAntiSquat(
            -34.71 + 8,
            110,
            NaN,
            0.5
        );
        expect(antiSquat).toBeCloseTo(0.595, 1);
    });
});
