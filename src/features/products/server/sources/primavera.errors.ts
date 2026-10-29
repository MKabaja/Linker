import 'server-only';
import type { PrimaveraErrorCode } from '@/features/products/model/products.types';

/**
 * Błąd pobrania lub odczytu cennika Primavery z kodem przyczyny.
 *
 * Oryginalny wyjątek przekaż jako `cause`, żeby został w logach.
 */
export class PrimaveraError extends Error {
	readonly code: PrimaveraErrorCode;

	constructor(code: PrimaveraErrorCode, options?: ErrorOptions) {
		super(code, options);
		this.name = 'PrimaveraError';
		this.code = code;
	}
}
