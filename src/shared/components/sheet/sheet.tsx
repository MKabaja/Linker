'use client';

import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import { cn } from 'cn';
import { XIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Button } from '@/shared/components/button';
import { sheetStyles } from './sheet.styles';

type SheetProps = SheetPrimitive.Root.Props;
type SheetTriggerProps = SheetPrimitive.Trigger.Props;
type SheetCloseProps = SheetPrimitive.Close.Props;
type SheetPortalProps = SheetPrimitive.Portal.Props;
type SheetOverlayProps = SheetPrimitive.Backdrop.Props;
type SheetContentProps = SheetPrimitive.Popup.Props & {
	side?: 'top' | 'right' | 'bottom' | 'left';
	showCloseButton?: boolean;
};
type SheetHeaderProps = ComponentProps<'div'>;
type SheetFooterProps = ComponentProps<'div'>;
type SheetTitleProps = SheetPrimitive.Title.Props;
type SheetDescriptionProps = SheetPrimitive.Description.Props;

function Sheet({ ...props }: SheetProps) {
	return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: SheetTriggerProps) {
	return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetCloseProps) {
	return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: SheetPortalProps) {
	return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: SheetOverlayProps) {
	return (
		<SheetPrimitive.Backdrop
			data-slot="sheet-overlay"
			className={cn(sheetStyles.overlay, className)}
			{...props}
		/>
	);
}

function SheetContent({
	className,
	children,
	side = 'right',
	showCloseButton = true,
	...props
}: SheetContentProps) {
	return (
		<SheetPortal>
			<SheetOverlay />
			<SheetPrimitive.Popup
				data-slot="sheet-content"
				data-side={side}
				className={cn(sheetStyles.content, className)}
				{...props}
			>
				{children}
				{showCloseButton && (
					<SheetPrimitive.Close
						data-slot="sheet-close"
						render={
							<Button
								variant="ghost"
								className={sheetStyles.closeButton}
								size="icon-sm"
							/>
						}
					>
						<XIcon />
						<span className="sr-only">Close</span>
					</SheetPrimitive.Close>
				)}
			</SheetPrimitive.Popup>
		</SheetPortal>
	);
}

function SheetHeader({ className, ...props }: SheetHeaderProps) {
	return (
		<div
			data-slot="sheet-header"
			className={cn(sheetStyles.header, className)}
			{...props}
		/>
	);
}

function SheetFooter({ className, ...props }: SheetFooterProps) {
	return (
		<div
			data-slot="sheet-footer"
			className={cn(sheetStyles.footer, className)}
			{...props}
		/>
	);
}

function SheetTitle({ className, ...props }: SheetTitleProps) {
	return (
		<SheetPrimitive.Title
			data-slot="sheet-title"
			className={cn(sheetStyles.title, className)}
			{...props}
		/>
	);
}

function SheetDescription({ className, ...props }: SheetDescriptionProps) {
	return (
		<SheetPrimitive.Description
			data-slot="sheet-description"
			className={cn(sheetStyles.description, className)}
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetTrigger,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetFooter,
	SheetTitle,
	SheetDescription,
};
