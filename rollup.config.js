import svelte from 'rollup-plugin-svelte'
import resolve from 'rollup-plugin-node-resolve'
import pkg from './package.json'

export default [
	{
		input: 'src/FreeTransform.svelte',
		output: [
			{ file: pkg.module, 'format': 'es' },
			{ file: pkg.main, 'format': 'umd', name: 'FreeTransform' }
		],
		plugins: [
			svelte(),
      resolve()
		]
	}
]
