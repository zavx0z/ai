import { serve, file } from "bun"
import index from "./index.html"
import json from "./meta/zavx0z/json-patch-manager/json-patch-manager.json"
import { Atom, EM } from "@metafor/atom"
import { logMsg } from "@metafor/inspect/server/logger"

const server = serve({
  port: 9999,
  routes: {
    "/": index,
    "/zavx0z/json-patch-manager/json-patch-manager.json": file(
      "./meta/zavx0z/json-patch-manager/json-patch-manager.json",
    ),
    "/metafor.js": file("/Users/zavx0z/zavx0z/metafor/dist/metafor.js"),
    "/metafor.js.map": file("/Users/zavx0z/zavx0z/metafor/dist/metafor.js.map"),
  },
})

console.log(`Listening at http://${server.hostname}:${server.port}`)

new BroadcastChannel(EM.CHANNEL)

declare global {
  var channel: BroadcastChannel
}
if (!globalThis.channel) {
  console.log("BroadcastChannel is not defined")
  globalThis.channel = new BroadcastChannel(EM.CHANNEL)
  globalThis.channel.onmessage = ({ data }) => logMsg(data)
  Atom.fromSchema({ meta: json as any })
}
