'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import { cn } from 'cn';
import { tooltipStyles } from './tooltip.styles';

type TooltipProviderProps = TooltipPrimitive.Provider.Props;
type TooltipProps = TooltipPrimitive.Root.Props;
type TooltipTriggerProps = TooltipPrimitive.Trigger.Props;
type TooltipContentProps = TooltipPrimitive.Popup.Props &
	Pick<
		TooltipPrimitive.Positioner.Props,
		'align' | 'alignOffset' | 'side' | 'sideOffset'
	>;

function TooltipProvider({ delay = 0, ...props }: TooltipProviderProps) {
	return (
		<TooltipPrimitive.Provider
			data-slot="tooltip-provider"
			delay={delay}
			{...props}
		/>
	);
}

function Tooltip({ ...props }: TooltipProps) {
	return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({ ...props }: TooltipTriggerProps) {
	return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
	className,
	side = 'top',
	sideOffset = 4,
	align = 'center',
	alignOffset = 0,
	children,
	...props
}: TooltipContentProps) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Positioner
				align={align}
				alignOffset={alignOffset}
				side={side}
				sideOffset={sideOffset}
				className={tooltipStyles.positioner}
			>
				<TooltipPrimitive.Popup
					data-slot="tooltip-content"
					className={cn(tooltipStyles.content, className)}
					{...props}
				>
					{children}
					<TooltipPrimitive.Arrow className={tooltipStyles.arrow} />
				</TooltipPrimitive.Popup>
			</TooltipPrimitive.Positioner>
		</TooltipPrimitive.Portal>
	);
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
