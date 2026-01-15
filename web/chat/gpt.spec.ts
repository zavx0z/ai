import { describe, it, expect, spyOn } from "bun:test"
import { focus } from "./gpt"
import * as common from "./common"

describe("GPT", () => {
  it("focus calls focusWindow with 'ChatGPT'", async () => {
    const spy = spyOn(common, "focusWindow")
    await focus()
    expect(spy).toHaveBeenCalledWith("ChatGPT")
    spy.mockRestore()
  })
})