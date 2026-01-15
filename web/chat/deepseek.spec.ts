import { describe, it, expect, spyOn } from "bun:test"
import { focus } from "./deepseek"
import * as common from "./common"

describe("DeepSeek", () => {
  it("focus calls focusWindow with 'DeepSeek'", async () => {
    const spy = spyOn(common, "focusWindow")
    await focus()
    expect(spy).toHaveBeenCalledWith("DeepSeek")
    spy.mockRestore()
  })
})