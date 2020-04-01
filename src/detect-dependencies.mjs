/**
 * all used dev modules
 * @return {Set<string>}
 */
export async function usedDevDependencies(mergers,branch) {
  const all = [];

  for (const [merger, pattern] of mergers) {
    for await (const entry of branch.entries(pattern)) {
      all.push(await merger.usedDevDependencies(entry));
    }
  }

  return all.reduce((sum, current) => new Set([...sum, ...current]), new Set());
}

export async function optionalDevDependencies(mergers, dependencies) {
  const all = [];

  for (const [merger] of mergers) {
    all.push(await merger.optionalDevDependencies(dependencies));
  }

  return all.reduce((sum, current) => new Set([...sum, ...current]), new Set());
}
