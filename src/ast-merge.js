/**
 *
 */
export function astMerge(source, dest) {
  if (source.type === 'BlockStatement') {
    console.log(source.body);
  } else {
    console.log(source);
  }

  return dest;
}
