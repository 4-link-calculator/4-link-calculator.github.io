import { describe, it, expect } from "vitest";
import {
    changeSuspensionHeight,
    SolidAxleSuspensionVectors,
} from "../src/engine/suspension/suspension";
import { instantCenter_xz } from "../src/engine/geometry/vector";
import { INFINITE_POINT } from "../src/engine/geometry/point";

const upperLink = {
    chassis: { x: 10, y: 20, z: -10 },
    wheel: { x: 0, y: 10, z: -10 },
};
const lowerLink = {
    chassis: { x: 10, y: 10, z: -20 },
    wheel: { x: 0, y: 20, z: -20 },
};

const triangleUpperLink = {
    chassis: { x: 42, y: 10, z: -22 },
    wheel: { x: 2, y: 10, z: -30 },
};
const triangleLowerLink = {
    chassis: { x: 42, y: 20, z: -22 },
    wheel: { x: 7, y: 20, z: -18 },
};

describe("Can solve for suspension movement", () => {
    it("should remain parallel", () => {
        const initialVectors = {
            upperLink,
            lowerLink,
        };
        expect(instantCenter_xz(upperLink, lowerLink)).toEqual(INFINITE_POINT);

        const intermediary = changeSuspensionHeight(initialVectors, 10);
        const updatedVectors = intermediary.ok
            ? intermediary.value
            : (null as unknown as SolidAxleSuspensionVectors);
        expect(intermediary.ok).toBe(true);

        expect(
            instantCenter_xz(updatedVectors.upperLink, updatedVectors.lowerLink)
        ).toEqual(INFINITE_POINT);
        expect(updatedVectors.upperLink.chassis.z).toBe(0);
        expect(updatedVectors.lowerLink.chassis.z).toBe(-10);
    });

    it("should return an error if geometry cannot be closed", () => {
        throw new Error("Not implemented yet");
    });

    it("should solve a 4 link with coincident chassis points", () => {
        const initialVectors = {
            upperLink: triangleUpperLink,
            lowerLink: triangleLowerLink,
        };
        const intermediary = changeSuspensionHeight(initialVectors, 7);
        expect(intermediary.ok).toBe(true);
        const updatedVectors = intermediary.ok
            ? intermediary.value
            : (null as unknown as SolidAxleSuspensionVectors);

        const expectedIC = {
            x: triangleLowerLink.chassis.x,
            y: 0,
            z: triangleLowerLink.chassis.z,
        };

        expect(
            instantCenter_xz(triangleUpperLink, triangleLowerLink)
        ).toStrictEqual(expectedIC);

        const expectedUpdatedIC = {
            x: updatedVectors.lowerLink.chassis.x,
            y: 0,
            z: updatedVectors.lowerLink.chassis.z,
        };
        const actualUpdatedIC = instantCenter_xz(
            updatedVectors.upperLink,
            updatedVectors.lowerLink
        );

        expect(actualUpdatedIC.x).toBeCloseTo(expectedUpdatedIC.x);
        expect(actualUpdatedIC.y).toEqual(expectedUpdatedIC.y);
        expect(actualUpdatedIC.z).toBeCloseTo(expectedUpdatedIC.z);

        expect(updatedVectors.lowerLink.wheel.x).toBe(
            triangleLowerLink.wheel.x
        );
        expect(updatedVectors.lowerLink.wheel.y).toBe(
            triangleLowerLink.wheel.y
        );
        expect(updatedVectors.lowerLink.wheel.z).toBe(
            triangleLowerLink.wheel.z
        );
        expect(updatedVectors.lowerLink.chassis.x).toBe(
            updatedVectors.upperLink.chassis.x
        );
        expect(updatedVectors.lowerLink.chassis.z).toBe(
            updatedVectors.upperLink.chassis.z
        );
    });
    it("it should solve Sanam's example", () => {
        const upperLink = {
            chassis: { x: -98, y: 0, z: -3.4641101615 },
            wheel: { x: 0, y: 0, z: -3.4641101615 },
        };
        const lowerLink = {
            chassis: { x: -100, y: 0, z: 0 },
            wheel: { x: 0, y: 0, z: 0 },
        };
        const start_state = { upperLink, lowerLink };
        const end_state = changeSuspensionHeight(start_state, 1);
    });
    it("it should solve Sanam's other example", () => {
        const upperLink = {
            chassis: { x: -7, y: 0, z: -4 },
            wheel: { x: 0, y: 0, z: -4 },
        };
        const lowerLink = {
            chassis: { x: -10, y: 0, z: 0 },
            wheel: { x: 0, y: 0, z: 0 },
        };
        const start_state = { upperLink, lowerLink };
        const end_state = changeSuspensionHeight(start_state, 1);
    });
});
