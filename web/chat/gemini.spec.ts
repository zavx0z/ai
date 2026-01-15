import { describe, it, expect, spyOn } from "bun:test"
import { focus } from "./gemini"
import * as common from "./common"

describe("Gemini", () => {
  it("focus calls focusWindow with 'Gemini'", async () => {
    const spy = spyOn(common, "focusWindow")
    await focus()
    expect(spy).toHaveBeenCalledWith("Gemini")
    spy.mockRestore()
  })
})