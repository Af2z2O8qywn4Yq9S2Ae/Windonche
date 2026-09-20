import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const project = fileURLToPath(new URL('../', import.meta.url));

/**
 * Assembleur volontairement limité aux modules du projet, sans dépendance npm.
 * Accepte les imports relatifs nommés JS et les imports par défaut de texte CSS.
 * Les modules ont chacun leur portée ; les cycles et chemins externes sont refusés.
 * Ce n'est pas un transpileur JS général : voir docs/architecture.md.
 */
export async function bundle(entry, root = project) {
  const modules = new Map();
  const visiting = new Set();
  async function visit(filename) {
    const id = relative(root, filename).split('\\').join('/');
    if (id.startsWith('../') || id === '..') throw new Error(`Import hors projet : ${id}`);
    if (visiting.has(id)) throw new Error(`Import circulaire : ${id}`);
    if (modules.has(id)) return id;
    visiting.add(id);
    let source = await readFile(filename, 'utf8');
    if (extname(filename) === '.css') {
      modules.set(id, `{ default: ${JSON.stringify(source)} }`);
    } else if (extname(filename) === '.js') {
      const imports = [...source.matchAll(/^import (.+) from ['"](.+)['"];$/gm)];
      for (const [statement, bindings, specifier] of imports) {
        if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
          throw new Error(`Import non local : ${specifier}`);
        }
        const dependency = await visit(resolve(dirname(filename), specifier));
        let destructuring;
        if (/^\{\s*\w+(?:\s*,\s*\w+)*\s*\}$/.test(bindings)) destructuring = bindings;
        else if (/^\w+$/.test(bindings) && specifier.endsWith('.css')) destructuring = `{ default: ${bindings} }`;
        else throw new Error(`Import non pris en charge : ${statement}`);
        source = source.replace(statement, `const ${destructuring} = modules[${JSON.stringify(dependency)}];`);
      }
      const exports = [...source.matchAll(/^export (?:const|function|class) (\w+)/gm)].map(match => match[1]);
      source = source.replace(/^export (?=(?:const|function|class) )/gm, '');
      // Une syntaxe import/export non supportée échoue ici plutôt que produire un fichier invalide.
      const factory = `(() => {\n${source}\nreturn { ${exports.join(', ')} };\n})()`;
      new Script(factory, { filename: id });
      modules.set(id, factory);
    } else {
      throw new Error(`Type de fichier non pris en charge : ${id}`);
    }
    visiting.delete(id);
    return id;
  }
  await visit(resolve(root, entry));
  return `(() => {\n'use strict';\nconst modules = Object.create(null);\n${[...modules].map(([id, code]) => `\n// Source: ${id}\nmodules[${JSON.stringify(id)}] = ${code};`).join('\n')}\n})();\n`;
}

export async function build() {
  const metadata = await readFile(resolve(project, 'userscript.meta.txt'), 'utf8');
  const { version } = JSON.parse(await readFile(resolve(project, 'package.json'), 'utf8'));
  if (!metadata.includes(`// @version      ${version}\n`)) throw new Error('Versions package/userscript incohérentes');
  const output = `${metadata}\n// Généré par npm run build — modifier src/, pas ce fichier.\n${await bundle('src/main.js')}`;
  new Script(output);
  await mkdir(resolve(project, 'dist'), { recursive: true });
  await writeFile(resolve(project, 'dist/windonche.user.js'), output);
  return output;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build();
  console.log('Userscript généré : dist/windonche.user.js');
}
