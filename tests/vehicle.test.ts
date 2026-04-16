import { describe, it, expect } from "vitest";
import { analyzeTravel, Vehicle } from "../src/engine/suspension/vehicle";
import {
    Triangulated4LinkFront,
    Triangulated4LinkRear,
} from "../src/engine/suspension/triangulated4link";

const upperLinkRear = {
    chassis: { x: 25.5, y: 20, z: -29 },
    wheel: { x: 0, y: 10, z: -30 },
};
const lowerLinkRear = {
    chassis: { x: 40, y: 13, z: -22 },
    wheel: { x: 4, y: 19, z: -19.5 },
};
const upperLinkFront = {
    chassis: { x: 82, y: 20, z: -29 },
    wheel: { x: 110, y: 10, z: -30 },
};
const lowerLinkFront = {
    chassis: { x: 65, y: 9, z: -22 },
    wheel: { x: 106, y: 19, z: -20 },
};

describe("analyzeTravel", () => {
    it("should output the correct number of steps", () => {
        const rearSuspension = new Triangulated4LinkRear(
            upperLinkRear,
            lowerLinkRear
        );
        const frontSuspension = new Triangulated4LinkFront(
            upperLinkFront,
            lowerLinkFront
        );
        const vehicle = new Vehicle(
            frontSuspension,
            rearSuspension,
            -34.71,
            110,
            0.7,
            0.5,
            19
        );
        const expectedSteps = 4;
        let steps = 0;
        for (const instance of analyzeTravel(vehicle, 8, -8, expectedSteps)) {
            steps++;
            console.log(JSON.stringify(instance));
        }
        expect(steps).toBe(expectedSteps + 1);
    });
});
