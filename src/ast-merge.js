/**
 *
 */
export function astMerge(source, dest) {
  if (source.type === 'BlockStatement') {
    //console.log(source.body);
    console.log(source[0]);
  } else {
    //console.log(source);
  }

  return dest;
}

/*
function identifier(ast)
{
  ast.body.label
}
*/
