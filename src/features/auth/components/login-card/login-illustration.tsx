import { loginIllustrationStyles } from './login-card.styles';

const CENTER = 200;
const ORBIT_RADII = [70, 110, 150, 190];
const NODES = [
	{ radius: 110, angleDegrees: -40, tone: 'brand' },
	{ radius: 150, angleDegrees: 200, tone: 'accent' },
	{ radius: 190, angleDegrees: 115, tone: 'brand' },
	{ radius: 70, angleDegrees: 60, tone: 'accent' },
] as const;

export function LoginIllustration() {
	const {
		svg,
		gradientStart,
		gradientEnd,
		orbit,
		spoke,
		nodeBrand,
		nodeAccent,
		tile,
		tileLetter,
	} = loginIllustrationStyles;

	return (
		<svg viewBox="0 0 400 400" className={svg} aria-hidden focusable="false">
			<defs>
				<linearGradient id="login-orbit" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" className={gradientStart} />
					<stop offset="1" className={gradientEnd} />
				</linearGradient>
			</defs>
			{ORBIT_RADII.map((radius, index) => (
				<circle
					key={radius}
					cx={CENTER}
					cy={CENTER}
					r={radius}
					className={orbit}
					stroke="url(#login-orbit)"
					strokeOpacity={1 - index * 0.22}
				/>
			))}
			{NODES.map(({ radius, angleDegrees, tone }) => {
				const { x, y } = toPoint(radius, angleDegrees);
				return (
					<g key={`${radius}-${angleDegrees}`}>
						<line x1={CENTER} y1={CENTER} x2={x} y2={y} className={spoke} />
						<circle
							cx={x}
							cy={y}
							r={5}
							className={tone === 'brand' ? nodeBrand : nodeAccent}
						/>
					</g>
				);
			})}
			<rect x={172} y={172} width={56} height={56} rx={14} className={tile} />
			<text
				x={CENTER}
				y={CENTER}
				dy="0.35em"
				textAnchor="middle"
				className={tileLetter}
			>
				L
			</text>
		</svg>
	);
}

function toPoint(radius: number, angleDegrees: number) {
	const angleRadians = (angleDegrees * Math.PI) / 180;
	return {
		x: CENTER + radius * Math.cos(angleRadians),
		y: CENTER + radius * Math.sin(angleRadians),
	};
}
