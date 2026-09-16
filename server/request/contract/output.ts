/** Stateless HTTP transport over one filesystem context and one explicit set of executable functions. */
export interface RequestOutput {
  handle(request: Request): Promise<Response>
}
