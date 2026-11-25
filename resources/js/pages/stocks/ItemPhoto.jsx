import { Package } from '@phosphor-icons/react';
import { storageUrl } from '../../lib/api';

/** Square product photo. Items without one get a plain placeholder, so cards line up. */
export default function ItemPhoto({ item, size, className = '', lazy = false }) {
    const box = `aspect-square w-full overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200 ${className}`;

    if (!item.image_path) {
        return (
            <div className={`${box} flex flex-col items-center justify-center gap-1 text-slate-400`}>
                <Package size={size > 200 ? 64 : 40} aria-hidden="true" />
                <span className="text-xs">No photo yet</span>
            </div>
        );
    }

    return (
        <div className={box}>
            <img
                src={storageUrl(item.image_path)}
                alt={`Photo of ${item.name}`}
                width={size}
                height={size}
                loading={lazy ? 'lazy' : undefined}
                className="size-full object-cover"
            />
        </div>
    );
}
