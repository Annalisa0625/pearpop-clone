// `NextRequest` is imported as a value by the route at runtime, even though
// this test shim only needs its type surface.
export class NextRequest extends Request {}

export class NextResponse extends Response {
  static json(body: unknown, init: ResponseInit = {}) {
    const headers = new Headers(init.headers);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    return new NextResponse(JSON.stringify(body), {
      ...init,
      headers,
    });
  }
}
