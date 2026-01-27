'use client';

import React, { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { getCssText } from '@/design-system/stitches.config';

export default function StitchesRegistry({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isMounted, setIsMounted] = useState(false);

    useServerInsertedHTML(() => {
        if (!isMounted) {
            setIsMounted(true);
            return (
                <style
                    id="stitches"
                    dangerouslySetInnerHTML={{ __html: getCssText() }}
                />
            );
        }
        return null;
    });

    return <>{children}</>;
}
