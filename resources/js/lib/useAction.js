import { useState } from 'react';
import { useErrorFocus } from '../components/ui';
import { api, formErrors } from './api';

/** Shared submit handling for the dialogs: field errors next to fields, anything else in an alert. */
export function useAction(fields) {
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const formRef = useErrorFocus(errors);

    async function run(url, body, onDone, method = 'post') {
        setBusy(true);
        setErrors({});
        setMessage('');
        try {
            // axios delete() takes config, not a body, as its second argument.
            await (method === 'delete' ? api.delete(url) : api[method](url, body));
            onDone();
        } catch (error) {
            const result = formErrors(error, fields);
            setErrors(result.errors);
            setMessage(result.message);
        } finally {
            setBusy(false);
        }
    }

    return { errors, message, busy, formRef, run };
}
