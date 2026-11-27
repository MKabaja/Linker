import { LoginForm } from '@/features/auth/components/login-form';
import { GlowFrame } from '@/shared/components/glow-frame';
import { loginCardStyles } from './login-card.styles';
import { LoginIllustration } from './login-illustration';

export function LoginCard() {
	const { frame, card, intro, logo, logoMark, formPanel, formTitle } =
		loginCardStyles;

	return (
		<GlowFrame className={frame}>
			<div className={card}>
				<div className={intro}>
					<p className={logo}>
						<span className={logoMark}>L</span>
						Linker
					</p>
					<LoginIllustration />
				</div>
				<section className={formPanel}>
					<h1 className={formTitle}>Zaloguj się</h1>
					<LoginForm />
				</section>
			</div>
		</GlowFrame>
	);
}
