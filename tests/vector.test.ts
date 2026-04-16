import { describe, it, expect } from "vitest";
import {
    calculateSlope_xz,
    canReachZ_in_xzPlane,
    instantCenter_xy,
    instantCenter_xz,
    instantCenter_yz,
    mirrorAboutXZPlane,
    rotateAboutY_fixedChassis,
    rotateAboutY_fixedWheel,
    translateBy,
} from "../src/engine/geometry/vector";
import { INFINITE_POINT } from "../src/engine/geometry/point";

describe("translateBy", () => {
    it("should offset both chassis and wheel points by the same delta", () => {
        const vector = {
            chassis: { x: 1, y: -2, z: 3 },
            wheel: { x: 4, y: 5, z: -6 },
        };

        expect(translateBy(vector, 2, -3, 4)).toEqual({
            chassis: { x: 3, y: -5, z: 7 },
            wheel: { x: 6, y: 2, z: -2 },
        });
    });

    it("should return an equal vector when translation deltas are zero", () => {
        const vector = {
            chassis: { x: -7, y: 8, z: -9 },
            wheel: { x: 10, y: -11, z: 12 },
        };

        expect(translateBy(vector, 0, 0, 0)).toEqual(vector);
    });
});

describe("calculateSlope_xz", () => {
    it("should return positive slope for rising xz vectors", () => {
        const vector = {
            chassis: { x: 1, y: 0, z: 2 },
            wheel: { x: 5, y: 0, z: 10 },
        };

        expect(calculateSlope_xz(vector)).toBeCloseTo(2);
    });

    it("should return negative slope for falling xz vectors", () => {
        const vector = {
            chassis: { x: -2, y: 0, z: 4 },
            wheel: { x: 2, y: 0, z: -4 },
        };

        expect(calculateSlope_xz(vector)).toBeCloseTo(-2);
    });
});

describe("mirrorAboutXZPlane", () => {
    it("should negate y for both endpoints and preserve x/z", () => {
        const vector = {
            chassis: { x: 3, y: 7, z: -2 },
            wheel: { x: -5, y: -11, z: 13 },
        };

        expect(mirrorAboutXZPlane(vector)).toEqual({
            chassis: { x: 3, y: -7, z: -2 },
            wheel: { x: -5, y: 11, z: 13 },
        });
    });

    it("should keep y as zero when mirroring points on the XZ plane", () => {
        const vector = {
            chassis: { x: 0, y: 0, z: 1 },
            wheel: { x: 10, y: 0, z: -3 },
        };

        expect(mirrorAboutXZPlane(vector)).toEqual(vector);
    });
});

describe("canReachZ_in_xzPlane", () => {
    it("should return true if the vector can reach the specified z", () => {
        const vector = {
            chassis: { x: 0, y: 0, z: 0 },
            wheel: { x: 10, y: 0, z: 0 },
        };
        expect(canReachZ_in_xzPlane(vector, vector.chassis, -5)).toBe(true);
    });

    it("should return false if the vector cannot reach the specified z", () => {
        const vector = {
            chassis: { x: 0, y: 0, z: 0 },
            wheel: { x: 10, y: 0, z: 0 },
        };
        expect(canReachZ_in_xzPlane(vector, vector.chassis, -20)).toBe(false);
    });

    it("should return true if the specified z is exactly at the chassis point", () => {
        const vector = {
            chassis: { x: 0, y: 0, z: 0 },
            wheel: { x: 10, y: 0, z: 0 },
        };
        expect(canReachZ_in_xzPlane(vector, vector.chassis, 0)).toBe(true);
    });

    it("should return true if the specified z is exactly at the wheel point", () => {
        const vector = {
            chassis: { x: 0, y: 0, z: 0 },
            wheel: { x: 10, y: 0, z: 0 },
        };
        expect(canReachZ_in_xzPlane(vector, vector.wheel, -10)).toBe(true);
    });
});

describe("rotateAboutY_fixedChassis", () => {
    it("should rotate about the chassis point's y-axis component", () => {
        const vector = {
            chassis: { x: 0, y: 10, z: 0 },
            wheel: { x: 10, y: 10, z: 0 },
        };
        expect(rotateAboutY_fixedChassis(vector, -10)).toEqual({
            chassis: { x: 0, y: 10, z: 0 },
            wheel: { x: 0, y: 10, z: -10 },
        });
        expect(rotateAboutY_fixedChassis(vector, -5)).toEqual({
            chassis: { x: 0, y: 10, z: 0 },
            wheel: { x: Math.sqrt(75), y: 10, z: -5 },
        });
    });

    it("should return the same vector if z is unchanged", () => {
        const vector = {
            chassis: { x: 0, y: 10, z: 0 },
            wheel: { x: 10, y: 10, z: 0 },
        };
        expect(rotateAboutY_fixedChassis(vector, 0)).toEqual(vector);
    });

    it("should handle vertical vectors", () => {
        const vector = {
            chassis: { x: 0, y: 0, z: 0 },
            wheel: { x: 0, y: 0, z: -10 },
        };
        expect(canReachZ_in_xzPlane(vector, vector.chassis, 10)).toBe(true);
        expect(rotateAboutY_fixedChassis(vector, 10)).toEqual({
            chassis: { x: 0, y: 0, z: 0 },
            wheel: { x: 0, y: 0, z: 10 },
        });
    });
});

describe("rotateAboutY_fixedWheel", () => {
    it("should rotate about the chassis point's y-axis component", () => {
        const vector = {
            chassis: { x: 10, y: 10, z: 0 },
            wheel: { x: 0, y: 10, z: 0 },
        };
        expect(rotateAboutY_fixedWheel(vector, -10)).toEqual({
            chassis: { x: 0, y: 10, z: -10 },
            wheel: { x: 0, y: 10, z: 0 },
        });
        expect(rotateAboutY_fixedWheel(vector, -5)).toEqual({
            chassis: { x: Math.sqrt(75), y: 10, z: -5 },
            wheel: { x: 0, y: 10, z: 0 },
        });
    });

    it("should return the same vector if z is unchanged", () => {
        const vector = {
            chassis: { x: 0, y: 10, z: 0 },
            wheel: { x: 10, y: 10, z: 0 },
        };
        expect(rotateAboutY_fixedWheel(vector, 0)).toEqual(vector);
    });

    it("should handle vertical vectors", () => {
        const vector = {
            chassis: { x: 0, y: 0, z: -10 },
            wheel: { x: 0, y: 0, z: 0 },
        };
        expect(canReachZ_in_xzPlane(vector, vector.wheel, 10)).toBe(true);
        expect(rotateAboutY_fixedWheel(vector, 10)).toEqual({
            chassis: { x: 0, y: 0, z: 10 },
            wheel: { x: 0, y: 0, z: 0 },
        });
    });
});

// parallel vectors

const PARALLEL_VEC1 = {
    chassis: { x: -5, y: 10, z: -5 },
    wheel: { x: 10, y: -10, z: -10 },
};

const PARALLEL_VEC2 = {
    chassis: { x: 15, y: 30, z: 15 },
    wheel: { x: 30, y: 10, z: 10 },
};

describe("instantCenter_xy", () => {
    it("should return infinite point for parallel vectors", () => {
        expect(instantCenter_xy(PARALLEL_VEC1, PARALLEL_VEC2)).toEqual(
            INFINITE_POINT
        );
    });
});

describe("instantCenter_yz", () => {
    it("should return infinite point for parallel vectors", () => {
        expect(instantCenter_yz(PARALLEL_VEC1, PARALLEL_VEC2)).toEqual(
            INFINITE_POINT
        );
    });
});

describe("instantCenter_xz", () => {
    it("should return infinite point for parallel vectors", () => {
        expect(instantCenter_xz(PARALLEL_VEC1, PARALLEL_VEC2)).toEqual(
            INFINITE_POINT
        );
    });
});

// non-parallel vectors

describe("instantCenter_xy", () => {
    it("should return known point for non-parallel vectors", () => {
        const vec1 = {
            chassis: { x: 0, y: 0, z: NaN },
            wheel: { x: 10, y: 0, z: NaN },
        };
        const vec2 = {
            chassis: { x: 20, y: 20, z: NaN },
            wheel: { x: 20, y: 10, z: NaN },
        };
        const expected1 = instantCenter_xy(vec1, vec2);
        const expected2 = instantCenter_xy(vec2, vec1);

        expect(expected1.x).toBe(20);
        expect(expected1.y).toBeCloseTo(0);
        expect(expected1.z).toBeCloseTo(0);

        expect(expected2.x).toBe(20);
        expect(expected2.y).toBeCloseTo(0);
        expect(expected2.z).toBeCloseTo(0);
    });
});

describe("instantCenter_xz", () => {
    it("should return known point for non-parallel vectors", () => {
        const vec1 = {
            chassis: { x: 0, y: NaN, z: 0 },
            wheel: { x: 10, y: NaN, z: 0 },
        };
        const vec2 = {
            chassis: { x: 20, y: NaN, z: -20 },
            wheel: { x: 20, y: NaN, z: -10 },
        };
        const expected1 = instantCenter_xz(vec1, vec2);
        const expected2 = instantCenter_xz(vec2, vec1);

        expect(expected1.x).toBe(20);
        expect(expected1.y).toBeCloseTo(0);
        expect(expected1.z).toBeCloseTo(0);

        expect(expected2.x).toBe(20);
        expect(expected2.y).toBeCloseTo(0);
        expect(expected2.z).toBeCloseTo(0);
    });
});

describe("instantCenter_yz", () => {
    it("should return known point for non-parallel vectors", () => {
        const vec1 = {
            chassis: { x: NaN, y: 0, z: 0 },
            wheel: { x: NaN, y: 10, z: 0 },
        };
        const vec2 = {
            chassis: { x: NaN, y: 20, z: 10 },
            wheel: { x: NaN, y: 20, z: 20 },
        };
        const expected1 = instantCenter_yz(vec1, vec2);
        const expected2 = instantCenter_yz(vec2, vec1);

        expect(expected1.x).toBeCloseTo(0);
        expect(expected1.y).toBe(20);
        expect(expected1.z).toBeCloseTo(0);

        expect(expected2.x).toBeCloseTo(0);
        expect(expected2.y).toBe(20);
        expect(expected2.z).toBeCloseTo(0);
    });
});

// non - trival
const NON_TRIVIAL_VEC1 = {
    chassis: { x: 7, y: 7, z: 7 },
    wheel: { x: 6, y: 6, z: 6 },
};
const NON_TRIVIAL_VEC2 = {
    chassis: { x: 14, y: 12, z: 6 },
    wheel: { x: 7, y: 6, z: 3 },
};
const INTERSECTION = { x: 0, y: 0, z: 0 };

describe("instantCenter_xy", () => {
    it("should return known point for non-parallel vectors", () => {
        const expected1 = instantCenter_xy(NON_TRIVIAL_VEC1, NON_TRIVIAL_VEC2);
        const expected2 = instantCenter_xy(NON_TRIVIAL_VEC2, NON_TRIVIAL_VEC1);

        expect(expected1.x).toBeCloseTo(INTERSECTION.x);
        expect(expected1.y).toBeCloseTo(INTERSECTION.y);
        expect(expected1.z).toBeCloseTo(INTERSECTION.z);

        expect(expected2.x).toBeCloseTo(INTERSECTION.x);
        expect(expected2.y).toBeCloseTo(INTERSECTION.y);
        expect(expected2.z).toBeCloseTo(INTERSECTION.z);
    });
});

describe("instantCenter_xz", () => {
    it("should return known point for non-parallel vectors", () => {
        const expected1 = instantCenter_xz(NON_TRIVIAL_VEC1, NON_TRIVIAL_VEC2);
        const expected2 = instantCenter_xz(NON_TRIVIAL_VEC2, NON_TRIVIAL_VEC1);

        expect(expected1.x).toBeCloseTo(INTERSECTION.x);
        expect(expected1.y).toBeCloseTo(INTERSECTION.y);
        expect(expected1.z).toBeCloseTo(INTERSECTION.z);

        expect(expected2.x).toBeCloseTo(INTERSECTION.x);
        expect(expected2.y).toBeCloseTo(INTERSECTION.y);
        expect(expected2.z).toBeCloseTo(INTERSECTION.z);
    });
});

describe("instantCenter_yz", () => {
    it("should return known point for non-parallel vectors", () => {
        const expected1 = instantCenter_yz(NON_TRIVIAL_VEC1, NON_TRIVIAL_VEC2);
        const expected2 = instantCenter_yz(NON_TRIVIAL_VEC2, NON_TRIVIAL_VEC1);

        expect(expected1.x).toBeCloseTo(INTERSECTION.x);
        expect(expected1.y).toBeCloseTo(INTERSECTION.y);
        expect(expected1.z).toBeCloseTo(INTERSECTION.z);

        expect(expected2.x).toBeCloseTo(INTERSECTION.x);
        expect(expected2.y).toBeCloseTo(INTERSECTION.y);
        expect(expected2.z).toBeCloseTo(INTERSECTION.z);
    });
});
