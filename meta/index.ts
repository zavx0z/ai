import "@metafor/meta"
import { Atom } from "@metafor/atom"
import { threadLog } from "@metafor/inspect/web/logger"
import { load } from "@metafor/virtual"
await import("@metafor/inspect/web/debugger")

const destroyVirtual = await load({ src: "../virtual/dist/worker.js", debug: true })

const meta = MetaFor("json-patch-manager")
  .context((t) => ({
    src: t.string.required("", { label: "JSON-patch путь" }),
  }))
  .states({
    "патчи разделены": {},
  })
  .core()
  .processes((process, destroy) => ({
    "патчи разделены": process().action(({ context }) => {
      console.log("src: ", context.src)
    }),
  }))
  .reactions()
  .view()

class WebComponent extends HTMLElement {
  builder: Atom | null = null

  constructor() {
    super()
  }

  initializeAtom() {
    const src = this.getAttribute("src")
    this.builder = Atom.fromSchema({ meta })
  }

  async connectedCallback() {
    const log = this.hasAttribute("log")
    log && (await threadLog())

    this.initializeAtom()
  }
  disconnectedCallback() {
    destroyVirtual()
  }
}

if (!customElements.get("meta-for")) customElements.define("meta-for", WebComponent)
