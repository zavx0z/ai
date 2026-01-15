import { describe, it, expect, spyOn } from "bun:test"
import * as Alice from "./alice"
import * as common from "./common"

describe("Alice", () => {
  it("focus calls focusWindow with 'Alice'", async () => {
    const spy = spyOn(common, "focusWindow")
    await Alice.focus()
    expect(spy).toHaveBeenCalledWith(Alice.name)
    spy.mockRestore()
  })
})
