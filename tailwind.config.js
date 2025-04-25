/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				dark: {
					background: '#000',
					foreground: '#fff',
					border: '#333',
					gray: {
						100: '#1a1a1a',
						200: '#333',
						300: '#666',
						400: '#888',
						600: '#b3b3b3',
						700: '#999',
						800: '#ccc',
					},
				},
			},
		},
	},
	plugins: [],
};
