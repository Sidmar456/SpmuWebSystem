import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from './api';

/**
 * GET a URL and keep { data, error, loading }. Refetches when url or params change.
 * Pass url = null to skip (e.g. a screen only admins may load).
 */
export function useApi(url, params) {
    const [state, setState] = useState({ data: null, error: '', loading: !!url });
    const [tick, setTick] = useState(0);
    const key = JSON.stringify(params ?? {});

    useEffect(() => {
        if (!url) return;
        let cancelled = false;
        setState((s) => ({ ...s, loading: true, error: '' }));
        api.get(url, { params: JSON.parse(key) })
            .then((res) => !cancelled && setState({ data: res.data, error: '', loading: false }))
            .catch((err) => !cancelled && setState({ data: null, error: errorMessage(err), loading: false }));
        return () => {
            cancelled = true;
        };
    }, [url, key, tick]);

    const reload = useCallback(() => setTick((t) => t + 1), []);
    return { ...state, reload };
}
