import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './app.css';

const inter = Inter({
	variable: '--font-inter',
	subsets: ['latin', 'latin-ext'],
});

const jetbrains = JetBrains_Mono({
	variable: '--font-jetbrains',
	subsets: ['latin', 'latin-ext'],
});

export const metadata: Metadata = {
	title: 'Linker',
	description:
		'Narzędzie do obsługi braków towaru: zamówienia z BaseLinkera, dostępność w PVEX i listy zakupowe.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html
			lang='pl'
			className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}
		>
			<body className='flex min-h-full flex-col bg-app font-sans text-main'>
				{children}
			</body>
		</html>
	);
}
