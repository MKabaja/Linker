import type { TraceQuery } from '@/features/returns/model/traces.types';
import { patternToString } from '@/features/returns/utils/pattern-parser';
import { formatPhoneMask } from '@/features/returns/utils/trace-format';

/**
 * Zapisuje wzorzec tropu do dziennika, np. `7320___83` (dziura to `_`, alternatywy w `[]`), `ko* dr*` dla imienia.
 */
function toTracePatternLabel(query: TraceQuery): string {
	if (query.kind === 'name') {
		return query.prefixes.map((prefix) => `${prefix}*`).join(' ');
	}
	if (query.kind === 'phone') {
		return formatPhoneMask(query);
	}
	return patternToString(query.pattern);
}

export { toTracePatternLabel };
