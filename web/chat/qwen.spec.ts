import { describe, it, expect, spyOn } from "bun:test"
import { focus } from "./qwen"
import * as common from "./common"

describe("Qwen", () => {
  it("focus calls focusWindow with 'Qwen'", async () => {
    const spy = spyOn(common, "focusWindow")
    await focus()
    expect(spy).toHaveBeenCalledWith("Qwen")
    spy.mockRestore()
  })
})