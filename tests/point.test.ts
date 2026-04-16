import { describe, it, expect } from "vitest";
import {
    Point,
    INFINITE_POINT,
    isInfinite,
    mirrorAboutXZPlane,
    solveCircleCircleIntersection_xzPlane,
} from "../src/engine/geometry/point";

describe("Point", () => {
    it("should mirror about the xz plane correctly", () => {
        const point: Point = { x: 0, y: 1, z: 0 };
        expect(mirrorAboutXZPlane(point)).toEqual({ x: 0, y: -1, z: 0 });
    });
    it("should mirror a negative point about the xz plane correctly", () => {
        const point: Point = { x: 0, y: -1, z: 0 };
        expect(mirrorAboutXZPlane(point)).toEqual({ x: 0, y: 1, z: 0 });
    });
    it("should not mirror a 0 point about the xz plane", () => {
        const point: Point = { x: 0, y: 0, z: 0 };
        expect(mirrorAboutXZPlane(point)).toEqual({ x: 0, y: 0, z: 0 });
    });
});

describe("isInfinite", () => {
    it("should return true for INFINITE_POINT", () => {
        expect(isInfinite(INFINITE_POINT)).toBe(true);
    });
    it("should return false for a finite point", () => {
        const finitePoint: Point = { x: 1, y: 1, z: 1 };
        expect(isInfinite(finitePoint)).toBe(false);
    });
    it("should return false for a mixed point", () => {
        const mixedPoint: Point = { x: Number.POSITIVE_INFINITY, y: 1, z: 1 };
        expect(isInfinite(mixedPoint)).toBe(false);
    });
});

describe("Circle-Circle Intersection", () => {
    it("should find no intersection between two circles that are too far apart", () => {
        const center1: Point = { x: 0, y: 0, z: 0 };
        const radius1 = 5;
        const center2: Point = { x: 20, y: 0, z: 0 };
        const radius2 = 5;
        const result = solveCircleCircleIntersection_xzPlane(
            center1,
            radius1,
            center2,
            radius2,
            0
        );
        expect(result).toEqual([]);
    });

    it("should find no intersection between two circles that are nested", () => {
        const center1: Point = { x: 0, y: 0, z: 0 };
        const radius1 = 5;
        const center2: Point = { x: 0, y: 0, z: 0 };
        const radius2 = 3;
        const result = solveCircleCircleIntersection_xzPlane(
            center1,
            radius1,
            center2,
            radius2,
            0
        );
        expect(result).toEqual([]);
    });

    it("shoud find two intersection points", () => {
        const center1: Point = { x: 0, y: 0, z: 0 };
        const radius1 = 1;
        const center2: Point = { x: 1, y: 0, z: 0 };
        const radius2 = 1;
        const result = solveCircleCircleIntersection_xzPlane(
            center1,
            radius1,
            center2,
            radius2,
            0
        );
        expect(result).toHaveLength(2);
        const res1 = result[0];
        const res2 = result[1];
        expect(Math.abs(res1.x)).toEqual(Math.abs(res2.x));
        expect(Math.abs(res1.y)).toEqual(Math.abs(res2.y));
        expect(Math.abs(res1.z)).toEqual(Math.abs(res2.z));
    });

    it("should find one intersection point when circles are tangent outside", () => {
        const center1: Point = { x: 0, y: 0, z: 0 };
        const radius1 = 1;
        const center2: Point = { x: 2, y: 0, z: 0 };
        const radius2 = 1;
        const result = solveCircleCircleIntersection_xzPlane(
            center1,
            radius1,
            center2,
            radius2,
            0
        );
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(result[1]);
    });

    it("should find one intersection point when circles are tangent inside", () => {
        const center1: Point = { x: 0, y: 0, z: 0 };
        const radius1 = 1;
        const center2: Point = { x: 1, y: 0, z: 0 };
        const radius2 = 2;
        const result = solveCircleCircleIntersection_xzPlane(
            center1,
            radius1,
            center2,
            radius2,
            0
        );
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(result[1]);
    });
});
