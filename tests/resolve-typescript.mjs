export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/server") {
    return {
      url: new URL("./stubs/next-server.ts", import.meta.url).href,
      shortCircuit: true,
    };
  }

  if (specifier.startsWith("@/")) {
    return {
      url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
      shortCircuit: true,
    };
  }

  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (
      error?.code === "ERR_MODULE_NOT_FOUND" &&
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !/\.[cm]?[jt]sx?$/.test(specifier)
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    throw error;
  }
}
