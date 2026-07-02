import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

type ModalProps = {
    show: boolean;
    title: React.ReactNode;
    onClose: () => void;
    onConfirm?: () => void;
    children?: React.ReactNode;            // body content
    footer?: React.ReactNode;              // optional footer; default renders a Close button
    size?: 'sm' | 'lg' | 'xl';             // Bootstrap sizes
    centered?: boolean;                    // center vertically
    backdrop?: 'static' | true | false;    // 'static' disables outside click to close
    zIndexBase?: number;                   // base z-index for backdrop; modal = base+5
    className?: string;                    // extra classes for the .modal container
    dialogClassName?: string;              // extra classes for the .modal-dialog
    contentClassName?: string;             // extra classes for the .modal-content
    confirmButtonClassName?: string;       // extra classes for the confirm button
    confirmButtonLabel?: string;
    confirmButtonDisabled?: boolean;
};

/** CSS selector for elements that can receive keyboard focus. */
const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** Unique id for the modal title so aria-labelledby can reference it. */
let modalTitleIdCounter = 0;

export default function Modal({
    show,
    title,
    onClose,
    onConfirm,
    children,
    footer,
    size,
    centered = true,
    backdrop = 'static',
    zIndexBase = 1500,
    className = '',
    dialogClassName = '',
    contentClassName = '',
    confirmButtonClassName = '',
    confirmButtonLabel = 'Close',
    confirmButtonDisabled = false,
}: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const titleIdRef = useRef(`cv-modal-title-${++modalTitleIdCounter}`);

    /** Return the first and last focusable elements inside the modal. */
    const getFocusableEdges = useCallback((): [HTMLElement, HTMLElement] | [null, null] => {
        if (!modalRef.current) return [null, null];
        const els = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (els.length === 0) return [null, null];
        return [els[0], els[els.length - 1]];
    }, []);

    // ── Focus trap + Escape ──────────────────────────────────────────────
    useEffect(() => {
        if (!show) return;

        // Save the currently focused element so we can restore it on unmount
        previousFocusRef.current = document.activeElement as HTMLElement;

        // Move focus into the modal on open
        const timer = setTimeout(() => {
            const [first] = getFocusableEdges();
            first?.focus();
        }, 0);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' || e.key === 'Esc') {
                onClose?.();
                return;
            }
            if (e.key !== 'Tab') return;

            const [first, last] = getFocusableEdges();
            if (!first || !last) return;

            if (e.shiftKey) {
                // Shift+Tab: if focus is on first element, wrap to last
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                // Tab: if focus is on last element, wrap to first
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('keydown', handleKeyDown);
            // Restore focus to the element that was focused before the modal opened
            previousFocusRef.current?.focus();
            previousFocusRef.current = null;
        };
    }, [show, onClose, getFocusableEdges]);

    if (!show) return null;

    const dialogClasses = [
        'modal-dialog',
        centered ? 'modal-dialog-centered' : '',
        size ? `modal-${size}` : '',
        dialogClassName,
    ].filter(Boolean).join(' ');

    const modalClasses = ['modal', 'show', 'd-block', className].filter(Boolean).join(' ');

    const handleBackdropClick = backdrop === true ? onClose : undefined;

    return createPortal(
        <>
            {backdrop !== false && (
                <div
                    className="modal-backdrop fade show"
                    style={{ zIndex: zIndexBase }}
                    onClick={handleBackdropClick}
                />
            )}
            <div
                ref={modalRef}
                className={modalClasses}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleIdRef.current}
                style={{ zIndex: zIndexBase + 5 }}
            >
                <div className={dialogClasses} onClick={(e) => e.stopPropagation()}>
                    <div className={['modal-content', contentClassName].filter(Boolean).join(' ')}>
                        <div className="modal-header">
                            <h5 className="modal-title" id={titleIdRef.current}>{title}</h5>
                            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
                        </div>
                        <div className="modal-body">{children}</div>
                        <div className="modal-footer">
                            {footer ?? (
                                <button
                                    className={`btn btn-secondary ${confirmButtonClassName}`}
                                    disabled={confirmButtonDisabled}
                                    onClick={() => (onConfirm ? onConfirm() : onClose())}
                                >
                                    {confirmButtonLabel}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>,
        document.body,
    );
}