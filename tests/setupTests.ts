import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.mock("@asamuzakjp/css-color", () => {
    return {
        default: {},
    };
});
