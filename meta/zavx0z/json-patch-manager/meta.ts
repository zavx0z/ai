const meta = MetaFor("json-patch-manager")
  .context((t) => ({
    src: t.string.required("./tmp/edit.json", { label: "JSON-patch путь" }),
  }))
  .states({
    "патчи разделены": {
      завершено: { src: "" },
    },
    завершено: null,
  })
  .core()
  .processes((process, destroy) => ({
    "патчи разделены": process()
      .action(({ context }) => {
        // console.log("src: ", context.src)
        return {} // FIXME: если не возвращать объект, то нее вызывается success
      })
      .success(({ update }) => {
        // console.log("success")
        update({ src: "" })
      }),
    завершено: destroy(),
  }))
  .reactions()
  .view()

export default meta
