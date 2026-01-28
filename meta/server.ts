import { serve, file } from "bun"
import index from "./index.html"

const server = serve({
  port: 9999,
  routes: {
    "/": index,
    "/virtual/dist/worker.js": file("/Users/zavx0z/zavx0z/metafor/infra/virtual/dist/worker.js")
  },
})

console.log(`Listening at http://${server.hostname}:${server.port}`)
