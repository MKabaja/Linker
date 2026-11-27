import { CopyValueButton } from '@/shared/components/copy-value-button';
import type { OrderDetailsResult } from '@/features/returns/model/returns.types';
import { returnPackagesStyles } from './return-packages.styles';

type ReturnPackagesProps = { orderDetails: OrderDetailsResult };

export function ReturnPackages({ orderDetails }: ReturnPackagesProps) {
	const { section, heading } = returnPackagesStyles;

	return (
		<section aria-labelledby="return-packages-heading" className={section}>
			<h2 id="return-packages-heading" className={heading}>
				Przesyłki
			</h2>
			<PackagesContent orderDetails={orderDetails} />
		</section>
	);
}

function PackagesContent({ orderDetails }: ReturnPackagesProps) {
	const {
		list,
		package: packageStyle,
		courier,
		number,
		inner,
	} = returnPackagesStyles;

	if (orderDetails.status === 'error') {
		return (
			<p role="alert" className={returnPackagesStyles.error}>
				Nie udało się pobrać przesyłek: {orderDetails.message}
			</p>
		);
	}

	if (
		orderDetails.status === 'notFound' ||
		orderDetails.order.packages.length === 0
	) {
		return (
			<p className={returnPackagesStyles.empty}>
				Brak przesyłek tego zamówienia w indeksie.
			</p>
		);
	}

	return (
		<ul className={list}>
			{orderDetails.order.packages.map((orderPackage) => (
				<li key={orderPackage.packageNumber} className={packageStyle}>
					<span className={courier}>{orderPackage.courierCode}</span>
					<span className={number}>
						<CopyValueButton
							label="numer przesyłki"
							value={orderPackage.packageNumber}
						>
							{orderPackage.packageNumber}
						</CopyValueButton>
					</span>
					{orderPackage.innerNumber !== orderPackage.packageNumber && (
						<span className={inner}>
							Numer wewnętrzny: {orderPackage.innerNumber}
						</span>
					)}
				</li>
			))}
		</ul>
	);
}
